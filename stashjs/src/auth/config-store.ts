import * as fs from 'fs'
import { StashConfig } from '../stash-config'
import { describeError } from '../utils'
import { OauthAuthenticationInfo } from './oauth-utils'
import * as lockfile from 'lockfile'
import { merge } from 'merge-anything'

export type GlobalConfig = {
  defaultWorkspace?: string
}

export type WorkspaceConfigAndAuthInfo = {
  workspaceId: string
  workspaceConfig: StashConfig
  authInfo: OauthAuthenticationInfo
}

export function isWorkspaceConfigAndAuthInfo(obj: any): obj is WorkspaceConfigAndAuthInfo {
  return obj.workspaceConfig && obj.authInfo
}

export type DefaultWorkspaceConfig = Omit<StashConfig, 'keyManagement'> & {
  console: {
    host: string
    port: number
  },
  identityProvider: { kind: "Auth0-DeviceCode" }
  keyManagement: {
    kind: "AWS-KMS"
    awsCredentials: { kind: "Federated", roleArn: string, region: string }
    key: { kind: "FromConsoleAPI" }
  }
}

export const defaults: DefaultWorkspaceConfig = {
  serviceFqdn: "ap-southeast-2.aws.stashdata.net",
  console: {
    host: "console.cipherstash.com",
    port: 443,
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
      roleArn: `arn:aws:iam::616923951253:role/cs-federated-cmk-access`,
      region: 'ap-southeast-2'
    },
    key: {
      kind: "FromConsoleAPI",
    }
  },
}

/**
 * Service interface for reading and editing the CipherStash configuration
 * directory ($HOME/.cipherstash).
 *
 * - Supports storing configuration for multiple workspaces.
 * - Supports the notion of a default workspace.
 * - Sets default configuration for the Free Tier.
 */
export interface ConfigStore {

  /**
   * Creates the top-level config directory ($HOME/.cipherstash)
   */
  readonly ensureConfigDirExists: () => Promise<void>

  /**
   * Lists the IDs of configured workspaces.
   */
  readonly listWorkspaceIds: () => Promise<Array<string>>

  /**
   * Gets the ID of the configured default workspace.
   * Resolves with `undefined` if there is no configured default workspace.
   */
  readonly getDefaultWorkspaceId: () => Promise<string | undefined>

  /**
   * Sets the ID of the default workspace.
   * Rejects if the supplied `workspaceId` has no configuration.
   */
  readonly setDefaultWorkspaceId: (workspaceId: string) => Promise<void>

  /**
   * Loads both the default workspace config and its authentication info.
   */
  readonly loadDefaultWorkspaceConfigAndAuthInfo: () => Promise<WorkspaceConfigAndAuthInfo>

  /**
   * Loads both the workspace config and its authentication info.
   */
  readonly loadWorkspaceConfigAndAuthInfo: (workspaceId: string) => Promise<WorkspaceConfigAndAuthInfo>

  /**
   * Saves the workspace config.
   */
  readonly saveWorkspaceConfig: (workspaceId: string, config: StashConfig) => Promise<void>

  /**
   * Loads the workspace config.
   */
  readonly loadWorkspaceConfig: (workspaceId: string) => Promise<StashConfig>

  /**
   * Loads the authentication info for the workspace.
   */
  readonly loadWorkspaceAuthInfo: (workspaceId: string) => Promise<OauthAuthenticationInfo>

  /**
   * Saves the authentication info for the workspace.
   */
  readonly saveWorkspaceAuthInfo: (workspaceId: string, authInfo: OauthAuthenticationInfo) => Promise<void>

  /**
   * Returns the configuration directory for a given workspace.
   */
  configDir(workspaceId: string): string
}

const dir = `${process.env['HOME']}/.cipherstash`

class Store implements ConfigStore {

  public async ensureConfigDirExists(): Promise<void> {
    return fs.promises.mkdir(dir, { recursive: true }).then(() => Promise.resolve(void 0))
  }

  public async listWorkspaceIds() {
    try {
      const entries = await fs.promises.readdir(dir)
      return entries
        .filter(e => fs.lstatSync(e).isDirectory() && e.match(/^ws-.*$/))
        .map(w => w.replace(/^ws\-/, ''))
    } catch (error) {
      return []
    }
  }

  public async getDefaultWorkspaceId() {
    try {
      if (fs.existsSync(this.configFilePath())) {
        const fileContentBuffer = await fs.promises.readFile(this.configFilePath())
        const content: any = JSON.parse(fileContentBuffer.toString('utf-8'))
        const defaultWorkspace: string | undefined = content['defaultWorkspace']
        if (defaultWorkspace) {
          if (fs.existsSync([dir, `ws-${defaultWorkspace}`].join('/'))) {
            return defaultWorkspace
          } else {
            return Promise.reject(`The default workspace ${defaultWorkspace} configured in ${this.configFilePath()} does not exist in ${dir}`)
          }
        }
      }
      return undefined
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async setDefaultWorkspaceId(workspaceId: string): Promise<void> {
    try {
      const workspaces = await this.listWorkspaceIds()
      if (workspaces.includes(workspaceId)) {
        // NOTE: if configuration becomes any more elaborate than a single field then we should read, then merge.
        await fs.promises.writeFile(this.configFilePath(), stringify({ defaultWorkspace: workspaceId }))
      } else {
        return Promise.reject(`${workspaceId} is an unknown workspace. Maybe try 'stash login ${workspaceId}' first?`)
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadWorkspaceConfigAndAuthInfo(workspaceId: string): Promise<WorkspaceConfigAndAuthInfo> {
    try {
      return {
        workspaceId,
        workspaceConfig: await this.loadWorkspaceConfig(workspaceId),
        authInfo: await this.loadWorkspaceAuthInfo(workspaceId)
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadDefaultWorkspaceConfigAndAuthInfo(): Promise<WorkspaceConfigAndAuthInfo> {
    try {
      const defaultWorkspace = await this.getDefaultWorkspaceId()
      if (defaultWorkspace) {
        return this.loadWorkspaceConfigAndAuthInfo(defaultWorkspace)
      } else {
        return Promise.reject("No default workspace has been configured")
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async loadWorkspaceAuthInfo(workspaceId: string): Promise<OauthAuthenticationInfo> {
    try {
      const fileContentBuffer = await fs.promises.readFile(this.authTokenFilePath(workspaceId))
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  }

  public async saveWorkspaceAuthInfo(workspaceId: string, authInfo: OauthAuthenticationInfo): Promise<void> {
    try {
      await fs.promises.mkdir(this.configDir(workspaceId), { recursive: true })
      await fs.promises.writeFile(this.authTokenFilePath(workspaceId), stringify(authInfo))
      return Promise.resolve(void 0)
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  }

  public async loadWorkspaceConfig(workspaceId: string): Promise<StashConfig> {
    try {
      const fileContentBuffer = await fs.promises.readFile(this.supplementaryConfigFilePath(workspaceId))
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  }

  public async saveWorkspaceConfig(workspaceId: string, config: StashConfig): Promise<void> {
    try {
      const configWithDefaults: StashConfig = merge(defaults, config)
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(this.supplementaryConfigFilePath(workspaceId), stringify(configWithDefaults))
      return Promise.resolve(void 0)
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  }

  public configDir(workspaceId: string) {
    return [dir, workspaceId].join('/')
  }

  private configFilePath(): string {
    return `${dir}/config.json`
  }
  private authTokenFilePath(workspaceId: string): string {
    return `${this.configDir(workspaceId)}/auth-token.json`
  }

  private supplementaryConfigFilePath(workspaceId: string): string {
    return `${this.configDir(workspaceId)}/workspace-config.json`
  }
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

  public listWorkspaceIds(): Promise<string[]> {
    return this.lock(() => this.store.listWorkspaceIds())
  }

  public getDefaultWorkspaceId(): Promise<string | undefined> {
    return this.lock(() => this.store.getDefaultWorkspaceId())
  }

  public setDefaultWorkspaceId(workspaceId: string): Promise<void> {
    return this.lock(() => this.store.setDefaultWorkspaceId(workspaceId))
  }

  public loadWorkspaceConfigAndAuthInfo(workspaceId: string): Promise<WorkspaceConfigAndAuthInfo> {
    return this.lock(() => this.store.loadWorkspaceConfigAndAuthInfo(workspaceId))
  }

  public loadDefaultWorkspaceConfigAndAuthInfo(): Promise<WorkspaceConfigAndAuthInfo> {
    return this.lock(() => this.store.loadDefaultWorkspaceConfigAndAuthInfo())
  }

  public loadWorkspaceAuthInfo(workspaceId: string): Promise<OauthAuthenticationInfo> {
    return this.lock(() => this.store.loadWorkspaceAuthInfo(workspaceId))
  }

  public saveWorkspaceAuthInfo(workspaceId: string, authInfo: OauthAuthenticationInfo): Promise<void> {
    return this.lock(() => this.store.saveWorkspaceAuthInfo(workspaceId, authInfo))
  }

  public loadWorkspaceConfig(workspaceId: string): Promise<StashConfig> {
    return this.lock(() => this.store.loadWorkspaceConfig(workspaceId))
  }

  public saveWorkspaceConfig(workspaceId: string, config: StashConfig): Promise<void> {
    return this.lock(() => this.store.saveWorkspaceConfig(workspaceId, config))
  }

  public configDir(workspaceId: string): string {
    // No lock is required for this operation.
    return this.store.configDir(workspaceId)
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