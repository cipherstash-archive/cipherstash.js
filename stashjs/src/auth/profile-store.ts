import * as fs from 'fs'
import { StashConfiguration } from '../stash-config'
import { describeError } from '../utils'
import * as lockfile from 'lockfile'
import { StashProfile } from '../stash-profile'

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
    host: 'cipherstash.au.auth0.com',
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
  readonly loadProfileNames: () => Promise<Array<string>>

  /**
   * Gets the ID of the configured default profile.
   */
  readonly loadDefaultProfile: () => Promise<StashProfile>

  /**
   * Sets the StashProfile to use as the default.
   */
  readonly setDefaultProfile: (profile: StashProfile) => Promise<void>

  /**
   * Saves the profile.
   */
  readonly saveProfile: (profile: StashProfile) => Promise<void>

  /**
   * Loads the profile.
   */
  readonly loadProfile: (profileName: string) => Promise<StashProfile>
}

const dir = `${process.env['HOME']}/.cipherstash`

class Store implements ProfileStore {

  public constructor() {
    fs.mkdirSync(dir, { recursive: true })
  }

  public async loadProfileNames() {
    try {
      const entries = await fs.promises.readdir(dir)
      const profileNames = entries
        .filter(e => fs.existsSync([dir, e].join('/')))
        .filter(e => fs.lstatSync([dir, e].join('/')).isDirectory())

      return profileNames
    } catch (error) {
      return Promise.reject(`Error loading available profile names: ${error}`)
    }
  }

  public async setDefaultProfile(profile: StashProfile): Promise<void> {
    try {
      // NOTE: if configuration becomes any more elaborate than a single field then we should read, then merge.
      await fs.promises.writeFile(this.configFilePath(), stringify({ defaultProfile: sanitiseProfileName(profile.name) }))
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadDefaultProfile(): Promise<StashProfile> {
    try {
      const defaultProfileName = JSON.parse(await fs.promises.readFile(this.configFilePath(), 'utf-8'))['defaultProfile']
      if (!defaultProfileName) {
        return Promise.reject("No default profile has been configured")
      }
      return this.loadProfile(defaultProfileName)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadProfile(profileName: string): Promise<StashProfile> {
    try {
      const configBuffer = await fs.promises.readFile(this.profileConfigFilePath(profileName))
      const credsBuffer = await fs.promises.readFile(this.profileAuthTokenFilePath(profileName))
      return {
        name: sanitiseProfileName(profileName),
        config: JSON.parse(configBuffer.toString('utf-8')),
        oauthCreds: JSON.parse(credsBuffer.toString('utf-8'))
      }
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  }

  public async saveProfile(profile: StashProfile): Promise<void> {
    try {
      await fs.promises.mkdir(this.configDir(profile.name), { recursive: true })
      await fs.promises.writeFile(this.profileConfigFilePath(profile.name), stringify(profile.config))
      await fs.promises.writeFile(this.profileAuthTokenFilePath(profile.name), stringify(profile.oauthCreds))
      if ((await this.loadProfileNames()).length === 1) {
        await this.setDefaultProfile(profile)
      }
      return Promise.resolve(void 0)
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  }

  public configDir(profileName: string) {
    return [dir, sanitiseProfileName(profileName)].join('/')
  }

  private configFilePath(): string {
    return `${dir}/config.json`
  }

  private profileAuthTokenFilePath(profileName: string): string {
    return `${this.configDir(profileName)}/auth-token.json`
  }

  private profileConfigFilePath(profileName: string): string {
    return `${this.configDir(profileName)}/profile-config.json`
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

  public loadProfileNames(): Promise<string[]> {
    return this.lock(() => this.store.loadProfileNames())
  }

  public loadDefaultProfile(): Promise<StashProfile> {
    return this.lock(() => this.store.loadDefaultProfile())
  }

  public setDefaultProfile(profile: StashProfile): Promise<void> {
    return this.lock(() => this.store.setDefaultProfile(profile))
  }

  public loadProfile(profileName: string): Promise<StashProfile> {
    return this.lock(() => this.store.loadProfile(profileName))
  }

  public saveProfile(profile: StashProfile): Promise<void> {
    return this.lock(() => this.store.saveProfile(profile))
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

export const profileStore = new StoreWithReadWriteLock(new Store())
