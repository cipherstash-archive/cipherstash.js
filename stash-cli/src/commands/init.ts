import * as https from 'https'
import axios, { AxiosInstance } from 'axios'
import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import {
  profileStore,
  defaults,
  stashOauth,
  describeError,
  StashProfile
} from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'init',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const serviceHost: string =
      parameters.options.serviceHost || defaults.service.host
    const servicePort: number = parameters.options.servicePort || 443

    const identityProviderHost: string =
      parameters.options.identityProviderHost || defaults.identityProvider.host
    const identityProviderClientId: string =
      parameters.options.identityProviderClientId ||
      defaults.identityProvider.clientId

    const consoleApiHost: string =
      parameters.options.consoleApiHost || 'console.cipherstash.com'
    const consoleApiPort: number = parameters.options.consoleApiPort || 443

    const workspace: string | undefined = parameters.options.workspace

    if (!workspace) {
      print.error('Error: a workspace must be provided')
      process.exit(1)
    }

    try {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        identityProviderHost,
        identityProviderClientId,
        serviceHost,
        workspace
      )

      print.info(
        `Visit ${pollingInfo.verificationUri} to complete authentication`
      )
      print.info('Waiting for authentication...')

      // Only open the browser when running this command locally.  If we are
      // running under SSH then the browser will open on the remote host - which
      // is not what we want.  Instead the user can simply click the
      // verification link that gets printed.
      if (!isInteractive()) {
        await open(pollingInfo.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        identityProviderHost,
        identityProviderClientId,
        pollingInfo.deviceCode,
        pollingInfo.interval
      )

      const response = await makeHttpsClient(
        consoleApiHost,
        consoleApiPort
      ).get(`/api/meta/workspaces/${encodeURIComponent(workspace)}`, {
        headers: {
          Authorization: `Bearer ${authInfo.accessToken}`
        }
      })

      const profile: StashProfile = {
        name: workspace,
        config: {
          service: {
            workspace,
            host: serviceHost,
            port: servicePort
          },
          identityProvider: {
            kind: 'Auth0-DeviceCode',
            host: identityProviderHost,
            clientId: identityProviderClientId
          },
          keyManagement: {
            kind: 'AWS-KMS',
            awsCredentials: {
              kind: 'Federated',
              region: response.data.keyRegion,
              roleArn: response.data.keyRoleArn
            },
            key: {
              cmk: response.data.keyId,
              namingKey: response.data.namingKey,
              region: response.data.keyRegion
            }
          }
        },
        oauthCreds: authInfo
      }

      await profileStore.saveProfile(profile)

      print.info(`Workspace configuration and authentication details have been saved in dir ~/.cipherstash`)
    } catch (error) {
      print.error(`Could not init: ${describeError(error)}`)
    }
  }
}

export default command

function isInteractive(): boolean {
  return (
    process.env['SSH_CLIENT'] !== undefined ||
    process.env['SSH_TTY'] !== undefined
  )
}

function makeHttpsClient(host: string, port: number): AxiosInstance {
  if (port === 443) {
    return axios.create({
      baseURL: `https://${host}`,
      timeout: 5000,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      },
      httpsAgent: new https.Agent({
        port,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.3'
      })
    })
  } else {
    // FIXME: this is horrible but it allows us to test during development
    // without having to set up TLS on localhost.
    return axios.create({
      baseURL: `http://${host}:${port}`,
      timeout: 5000,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    })
  }
}
