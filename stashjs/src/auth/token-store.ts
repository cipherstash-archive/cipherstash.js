import * as fs from 'fs'
import { describeError } from '../utils'
import { OauthAuthenticationInfo } from './oauth-utils'

export type TokenStore = {
  readonly load: () => Promise<OauthAuthenticationInfo>
  readonly save: (authInfo: OauthAuthenticationInfo) => Promise<void>
  readonly configDir: () => string
}

const dir = `${process.env['HOME']}/.cipherstash/dev-local`

export const tokenStore: TokenStore = {
  /**
   * Loads the TokenStore from disk.
   */
  load: async () => {
    try {
      const fileContentBuffer = await fs.promises.readFile(`${dir}/auth-token`)
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  },

  /**
   * Saves the authentication info to the token store.
   *
   * NOTE: this may not work reliably from a multi-threaded environment and we
   * may need to do something special to ensure an atomic file replacement in
   * the presence of concurrent writes to the file.
   *
   * It could also behave just fine - the semantics of concurrent writes is not
   * well-covered in the NodeJS docs.
   */
  save: async (authInfo: OauthAuthenticationInfo) => {
    try {
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(`${dir}/auth-token`, JSON.stringify(authInfo))
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  },

  configDir: () => dir
}