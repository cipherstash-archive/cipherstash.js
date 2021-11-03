import * as fs from 'fs'
import { StashProfile } from '../stash-profile'
import { describeError } from '../utils'
import { OauthAuthenticationInfo } from './oauth-utils'
import * as lockfile from 'lockfile'
import { merge } from 'merge-anything'

export type GlobalConfig = {
  defaultWorkspace?: string
}

export type TemplateString = { tag: "Template", template: string }

export type DefaultProfileTemplate = Omit<StashProfile, 'keyManagement' | 'service' | 'key' > & {
  service: { host: string }
  identityProvider: { kind: "Auth0-DeviceCode" }
  keyManagement: {
    kind: "AWS-KMS"
    // awsCredentials: { kind: "Federated", roleArn: string, region: string }
    awsCredentials: { kind: "Federated", roleArn: TemplateString, region: string }
  }
}

export const defaults: DefaultProfileTemplate = {
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
export interface ConfigStore {

  /**
   * Creates the top-level config directory ($HOME/.cipherstash)
   */
  readonly ensureConfigDirExists: () => Promise<void>

  /**
   * Lists the IDs of configured profiles.
   */
  readonly loadProfileNames: () => Promise<Array<string>>

  /**
   * Gets the ID of the configured default profile.
   */
  readonly loadDefaultProfileName: () => Promise<string>

  /**
   * Gets the ID of the configured default profile.
   */
  readonly loadDefaultProfile: () => Promise<StashProfile>

  /**
   * Sets the ID of the default profile.
   * Rejects if the supplied `profileName` has no configuration.
   */
  readonly saveDefaultProfile: (profileName: string) => Promise<void>

  /**
   * Saves the profile config.
   */
  readonly saveProfile: (profileName: string, config: StashProfile) => Promise<void>

  /**
   * Loads the profile config.
   */
  readonly loadProfile: (profileName: string) => Promise<StashProfile>

  /**
   * Loads the authentication info for the profile.
   */
  readonly loadProfileAuthInfo: (profileName: string) => Promise<OauthAuthenticationInfo>

  /**
   * Saves the authentication info for the profile.
   */
  readonly saveProfileAuthInfo: (profileName: string, authInfo: OauthAuthenticationInfo) => Promise<void>

  /**
   * Returns the configuration directory for a given profile.
   */
  configDir(profileName: string): string
}

const dir = `${process.env['HOME']}/.cipherstash`

class Store implements ConfigStore {

  public async ensureConfigDirExists(): Promise<void> {
    return fs.promises.mkdir(dir, { recursive: true }).then(() => Promise.resolve(void 0))
  }

  public async loadProfileNames() {
    try {
      const entries = await fs.promises.readdir(dir)
      return entries.filter(e => fs.lstatSync(e).isDirectory())
    } catch (error) {
      return []
    }
  }

  public async loadDefaultProfileName() {
    try {
      if (fs.existsSync(this.configFilePath())) {
        const fileContentBuffer = await fs.promises.readFile(this.configFilePath())
        const content: any = JSON.parse(fileContentBuffer.toString('utf-8'))
        const defaultProfile: string | undefined = content['defaultProfile']
        if (defaultProfile) {
          if (fs.existsSync([dir, defaultProfile].join('/'))) {
            return defaultProfile
          } else {
            return Promise.reject(`The default profile ${defaultProfile} configured in ${this.configFilePath()} does not exist in ${dir}`)
          }
        }
      }
      return Promise.reject("No default profile has been configured")
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async saveDefaultProfile(profileName: string): Promise<void> {
    try {
      const profiles = await this.loadProfileNames()
      if (profiles.includes(profileName)) {
        // NOTE: if configuration becomes any more elaborate than a single field then we should read, then merge.
        await fs.promises.writeFile(this.configFilePath(), stringify({ defaultWorkspace: profileName }))
      } else {
        return Promise.reject(`${profileName} is an unknown profile. Maybe try 'stash login ${profileName}' first?`)
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadDefaultProfile(): Promise<StashProfile> {
    try {
      const defaultProfileName = await this.loadDefaultProfileName()
      if (!defaultProfileName) {
        return Promise.reject("No default profile has been configured")
      }
      return this.loadProfile(defaultProfileName)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadProfileAuthInfo(profileName: string): Promise<OauthAuthenticationInfo> {
    try {
      const fileContentBuffer = await fs.promises.readFile(this.authTokenFilePath(profileName))
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  }

  public async saveProfileAuthInfo(profileName: string, authInfo: OauthAuthenticationInfo): Promise<void> {
    try {
      await fs.promises.mkdir(this.configDir(profileName), { recursive: true })
      await fs.promises.writeFile(this.authTokenFilePath(profileName), stringify(authInfo))
      return Promise.resolve(void 0)
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  }

  public async loadProfile(profileName: string): Promise<StashProfile> {
    try {
      const fileContentBuffer = await fs.promises.readFile(this.supplementaryConfigFilePath(profileName))
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  }

  public async saveProfile(profileName: string, config: StashProfile): Promise<void> {
    try {
      const configWithDefaults: StashProfile = merge(defaults, config)
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(this.supplementaryConfigFilePath(profileName), stringify(configWithDefaults))
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
  private authTokenFilePath(profileName: string): string {
    return `${this.configDir(profileName)}/auth-token.json`
  }

  private supplementaryConfigFilePath(profileName: string): string {
    return `${this.configDir(profileName)}/profile-config.json`
  }
}

function sanitiseProfileName(profileName: string): string {
  // Remove leading and trailing whitespace, replace internal whitespace,
  // periods and path separators with dashes.
  return profileName
    .trim()
    .replace(/s+/, '-')
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
class StoreWithWriteLock implements ConfigStore {

  private configLockFile: string = [dir, 'config.lock'].join('/')

  constructor(private store: ConfigStore) {}

  public ensureConfigDirExists(): Promise<void> {
    // Does not require taking a lock
    return this.store.ensureConfigDirExists()
  }

  public loadProfileNames(): Promise<string[]> {
    return this.lock(() => this.store.loadProfileNames())
  }

  public loadDefaultProfileName(): Promise<string> {
    return this.lock(() => this.store.loadDefaultProfileName())
  }

  public loadDefaultProfile(): Promise<StashProfile> {
    return this.lock(() => this.store.loadDefaultProfile())
  }

  public saveDefaultProfile(profileName: string): Promise<void> {
    return this.lock(() => this.store.saveDefaultProfile(profileName))
  }

  public loadProfileAuthInfo(profileName: string): Promise<OauthAuthenticationInfo> {
    return this.lock(() => this.store.loadProfileAuthInfo(profileName))
  }

  public saveProfileAuthInfo(profileName: string, authInfo: OauthAuthenticationInfo): Promise<void> {
    return this.lock(() => this.store.saveProfileAuthInfo(profileName, authInfo))
  }

  public loadProfile(profileName: string): Promise<StashProfile> {
    return this.lock(() => this.store.loadProfile(profileName))
  }

  public saveProfile(profileName: string, config: StashProfile): Promise<void> {
    return this.lock(() => this.store.saveProfile(profileName, config))
  }

  public configDir(profileName: string): string {
    // No lock is required for this operation.
    return this.store.configDir(profileName)
  }

  private async lock<T>(callback: () => Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      lockfile.lock(this.configLockFile, async (err) => {
        if (err) {
          reject(err)
          return
        }

        try {
          resolve(await callback())
        } catch (err) {
          reject(err)
        } finally {
          lockfile.unlock(this.configLockFile, (err) => {
            if (err) {
              console.error(`An error occurred when trying to unlock the config store at ${dir}`)
              console.error(`To remedy the problem, you might need to delete the lockfile at ${this.configLockFile}`)
              console.error(err)
              process.exit(1)
            }
          })
        }
      })
    })
  }
}

function stringify(obj: any): string {
  return JSON.stringify(obj, null, 2)
}

export const configStore = new StoreWithWriteLock(new Store())