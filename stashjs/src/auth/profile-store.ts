import * as fs from 'fs'
import { StashConfiguration } from '../stash-config'
import * as lockfile from 'lockfile'
import { StashProfile } from '../stash-profile'
import { Result, AsyncResult, Err, Ok } from '../result'
import { OauthAuthenticationInfo } from './oauth-utils'
import { LoadProfileNamesFailure, SetDefaultProfileFailure, SaveProfileFailure, LoadProfileFailure, DeleteProfileFailure, MissingConfigDir, IOError, NoDefaultProfileSet, MissingProfile, MalformedConfigFile } from '../errors'

export type ConfigurationTemplate = Omit<StashConfiguration, 'keyManagement' | 'service' | 'key' > & {
  service: { host: string }
  identityProvider: { kind: "Auth0-DeviceCode" }
  keyManagement: {
    kind: "AWS-KMS"
    awsCredentials: { kind: "Federated", roleArn: string, region: string }
  }
}

export const defaults: ConfigurationTemplate = {
  service: {
    host: "ap-southeast-2.aws.stashdata.net",
  },
  identityProvider: {
    kind: 'Auth0-DeviceCode',
    host: 'auth.cipherstash.com',
    clientId: 'CtY9DNGongoSvZaAwbb6sw0Hr7Gl7pg7'
  },
  keyManagement: {
    kind: "AWS-KMS",
    awsCredentials: {
      kind: "Federated",
      roleArn: "arn:aws:iam::356036487853:role/cs-federated-cmk-access",
      region: 'ap-southeast-2'
    }
  },
}


/**
 * Service interface for reading and editing the CipherStash configuration
 * directory ($HOME/.cipherstash).
 *
 * - Supports storing configuration for multiple profiles.
 * - Supports the notion of a default profile.
 * - Sets default configuration for the Free Tier.
 */
export interface ProfileStore {

  /**
   * Lists the IDs of configured profiles.
   */
  readonly loadProfileNames: () => AsyncResult<Array<string>, LoadProfileNamesFailure>

  /**
   * Sets the StashProfile to use as the default.
   */
  readonly setDefaultProfile: (profile: StashProfile) => AsyncResult<void, SetDefaultProfileFailure>

  /**
   * Saves the profile.
   */
  readonly saveProfile: (profile: StashProfile) => AsyncResult<void, SaveProfileFailure>

  /**
   * Loads the profile.
   */
  readonly loadProfile: (profileName: string) => AsyncResult<StashProfile, LoadProfileFailure>

  /**
   * Gets the ID of the configured default profile.
   */
  readonly loadDefaultProfile: () => AsyncResult<StashProfile, LoadProfileFailure>

}

const dir = `${process.env['HOME']}/.cipherstash`

class Store implements ProfileStore {

  public constructor() {
    fs.mkdirSync(dir, { recursive: true })
  }

  public async loadProfileNames(): AsyncResult<Array<string>, LoadProfileNamesFailure> {
    if (!fs.existsSync(dir)) {
      return Err(LoadProfileNamesFailure(MissingConfigDir))
    }

    try {
      const entries = await fs.promises.readdir(dir)
      const profileNames = entries
        .filter(e => fs.existsSync([dir, e].join('/')))
        .filter(e => fs.lstatSync([dir, e].join('/')).isDirectory())

      return Ok(profileNames)
    } catch (error) {
      return Err(LoadProfileNamesFailure(IOError(error)))
    }
  }

  public async setDefaultProfile(profile: StashProfile): AsyncResult<void, SetDefaultProfileFailure> {
    if (!fs.existsSync(dir)) {
      return Err(SetDefaultProfileFailure(MissingConfigDir))
    }

    try {
      // NOTE: if configuration becomes any more elaborate than a single field then we should read, then merge.
      await fs.promises.writeFile(this.configFilePath(), stringify({ defaultProfile: sanitiseProfileName(profile.name) }))
      return Ok(void 0)
    } catch (error) {
      return Err(SetDefaultProfileFailure(IOError(error)))
    }
  }

  public async loadDefaultProfile(): AsyncResult<StashProfile, LoadProfileFailure> {
    if (!fs.existsSync(dir)) {
      return Err(LoadProfileFailure(MissingConfigDir))
    }

    if (!fs.existsSync(this.configFilePath())) {
      return Err(LoadProfileFailure(NoDefaultProfileSet))
    }

    try {
      const config = parseConfig(this.configFilePath(), await fs.promises.readFile(this.configFilePath()))
      if (config.ok) {
        const defaultProfileName = config.value['defaultProfile']
        if (defaultProfileName) {
          return this.loadProfile(defaultProfileName)
        } else {
          return Err(LoadProfileFailure(NoDefaultProfileSet))
        }
      } else {
        return Err(LoadProfileFailure(config.error))
      }
    } catch (error) {
      return Err(LoadProfileFailure(IOError(error)))
    }
  }

  public async loadProfile(profileName: string): AsyncResult<StashProfile, LoadProfileFailure> {
    if (!fs.existsSync(dir)) {
      return Err(LoadProfileFailure(MissingConfigDir))
    }

    if (!fs.existsSync(this.profileConfigFilePath(profileName))) {
      return Err(LoadProfileFailure(MissingProfile(profileName)))
    }

    try {
      const configBuffer = await fs.promises.readFile(this.profileConfigFilePath(profileName))
      const config = parseConfig(this.profileConfigFilePath(profileName), configBuffer)
      if (!config.ok) {
        return Err(LoadProfileFailure(config.error))
      }

      return Ok(new StashProfile(sanitiseProfileName(profileName), config.value))
    } catch (error) {
      return Err(LoadProfileFailure(IOError(error)))
    }
  }

  public async saveProfile(profile: StashProfile): AsyncResult<void, SaveProfileFailure> {
    try {
      await fs.promises.mkdir(this.configDir(profile.name), { recursive: true })
      await fs.promises.writeFile(this.profileConfigFilePath(profile.name), stringify(profile.config))

      const profileNames = await this.loadProfileNames()
      if (profileNames.ok && profileNames.value.length === 1) {
        const setDefaultProfile = await this.setDefaultProfile(profile)
        if (!setDefaultProfile.ok) {
          return Err(SaveProfileFailure(setDefaultProfile.error))
        }
      }

      return Ok(void 0)
    } catch (error) {
      return Err(SaveProfileFailure(IOError(error)))
    }
  }

  /**
   * Give a shot at reading a cached access token.
   *
   * Because this is purely a cache for performance optimisation purposes, it
   * is never an error if the token cannot be read for any reason, and so we'll
   * always "succeed" (in the sense of returning an AuthInfo object).
   */
  public async readAccessToken(profileName: string): AsyncResult<OauthAuthenticationInfo, never> {
    try {
      const tokenInfo = parseConfig(this.accessTokenFilePath(profileName), fs.readFileSync(this.accessTokenFilePath(profileName)))
      if (!tokenInfo.ok) {
        return Ok(nullAccessToken)
      }

      return Ok(tokenInfo.value)
    } catch (error) {
      return Ok(nullAccessToken)
    }
  }

  public async writeAccessToken(profileName: string, tokenInfo: OauthAuthenticationInfo): AsyncResult<void, SaveProfileFailure> {
    try {
      await fs.promises.mkdir(this.configDir(profileName), { recursive: true })
      await fs.promises.writeFile(this.accessTokenFilePath(profileName), stringify(tokenInfo))

      return Ok(void 0)
    } catch (error) {
      return Err(SaveProfileFailure(IOError(error)))
    }
  }

  public async deleteAccessToken(profileName: string): AsyncResult<void, DeleteProfileFailure> {
    if (!fs.existsSync(dir)) {
      return Err(DeleteProfileFailure(MissingConfigDir))
    }

    if (!fs.existsSync(this.configDir(profileName))) {
      return Err(DeleteProfileFailure(MissingProfile(profileName)))
    }

    try {
      fs.unlinkSync(this.accessTokenFilePath(profileName))
      return Ok(void 1)
    } catch (error) {
      return Err(DeleteProfileFailure(IOError(error)))
    }
  }

  public configDir(profileName: string): string {
    return [dir, sanitiseProfileName(profileName)].join('/')
  }

  private configFilePath(): string {
    return `${dir}/config.json`
  }

  private profileConfigFilePath(profileName: string): string {
    return `${this.configDir(profileName)}/profile-config.json`
  }

  private accessTokenFilePath(profileName: string): string {
    return [this.configDir(profileName), "auth-token.json"].join('/')
  }
}

function sanitiseProfileName(profileName: string): string {
  // Remove leading and trailing whitespace, replace internal whitespace,
  // periods and path separators with dashes.
  return profileName
    .trim()
    .replace(/\s/, '-')
    .replace("/", "-")
    .replace("\\", "-")
    .replace(".", "-")
    .toLowerCase()
}

/**
 * An implementation of ConfigStore that wraps all operations in an exclusive
 * lock (POSIX file lock).
 *
 * This is necessary to ensure that concurrent reads and writes to the config
 * store do not cause corruption.
 */
class StoreWithReadWriteLock implements ProfileStore {

  private configLockFile: string = [dir, 'config.lock'].join('/')

  constructor(private store: Store) {}

  public loadProfileNames() {
    return this.lock(() => this.store.loadProfileNames())
  }

  public loadDefaultProfile() {
    return this.lock(() => this.store.loadDefaultProfile())
  }

  public setDefaultProfile(profile: StashProfile) {
    return this.lock(() => this.store.setDefaultProfile(profile))
  }

  public loadProfile(profileName: string) {
    return this.lock(() => this.store.loadProfile(profileName))
  }

  public saveProfile(profile: StashProfile) {
    return this.lock(() => this.store.saveProfile(profile))
  }

  public readAccessToken(profileName: string) {
    return this.lock(() => this.store.readAccessToken(profileName))
  }

  public writeAccessToken(profileName: string, tokenInfo: OauthAuthenticationInfo) {
    return this.lock(() => this.store.writeAccessToken(profileName, tokenInfo))
  }

  public async deleteAccessToken(profileName: string): AsyncResult<void, DeleteProfileFailure> {
    return this.lock(() => this.store.deleteAccessToken(profileName))
  }

  private async lock<T>(callback: () => Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      lockfile.lock(this.configLockFile, { retries: 1000, retryWait: 5 }, async (err) => {
        try {
          if (err) {
            reject(err)
          } else {
            resolve(await callback())
          }
        } catch (err) {
          reject(err)
        } finally {
          if (!err) {
            await new Promise<void>((resolve, reject) => {
              lockfile.unlock(this.configLockFile, (err) => {
                if (err) {
                  reject(err)
                  console.error(`An error occurred when trying to unlock the config store at ${dir}`)
                  console.error(`To remedy the problem, you might need to delete the lockfile at ${this.configLockFile}`)
                  console.error(err)
                  process.exit(1)
                } else {
                  resolve()
                }
              })
            })
          }
        }
      })
    })
  }
}

function stringify(obj: any): string {
  return JSON.stringify(obj, null, 2)
}

function parseConfig(fileName: string, buffer: Buffer): Result<any, MalformedConfigFile> {
  try {
    return Ok(JSON.parse(buffer.toString('utf-8')))
  } catch (err: any) {
    return Err(MalformedConfigFile(fileName))
  }
}

const nullAccessToken: OauthAuthenticationInfo = { accessToken: "", refreshToken: "", expiry: 0 }

export const profileStore = new StoreWithReadWriteLock(new Store())
