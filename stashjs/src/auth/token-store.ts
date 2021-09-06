import * as fs from 'fs'
import { describeError } from '../utils'
import { AuthenticationInfo } from './oauth-utils'

export type TokenStore = {
  readonly load: () => Promise<AuthenticationInfo>
  readonly save: (authInfo: AuthenticationInfo) => Promise<void>
  readonly configDir: () => string
}

const dir = `${process.env['HOME']}/.cipherstash/dev-local`

export const tokenStore: TokenStore = {
  load: async () => {
    try {
      const fileContentBuffer = await fs.promises.readFile(`${dir}/auth-token`)
      return JSON.parse(fileContentBuffer.toString('utf-8'))
    } catch (error) {
      return Promise.reject(`Failed to load config file: ${describeError(error)}`)
    }
  },

  save: async (authInfo: AuthenticationInfo) => {
    try {
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(`${dir}/auth-token`, JSON.stringify(authInfo))
    } catch (error) {
      return Promise.reject(`Failed to save config file: ${describeError(error)}`)
    }
  },

  configDir: () => dir
}