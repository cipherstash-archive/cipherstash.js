import * as https from 'https'
import axios, { AxiosInstance } from 'axios'
import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import {
  profileStore,
  defaults,
  stashOauth,
  StashProfile,
  errors
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

    const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
      identityProviderHost,
      identityProviderClientId,
      serviceHost,
      workspace
    )

    if (!pollingInfo.ok) {
      print.error('An error occurred and "stash init" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(pollingInfo.error)}`)
      process.exit(1)
      return
    }

    print.info(
      `Visit ${pollingInfo.value.verificationUri} to complete authentication`
    )
    print.info('Waiting for authentication...')

    // Only open the browser when running this command locally.  If we are
    // running under SSH then the browser will open on the remote host - which
    // is not what we want.  Instead the user can simply click the
    // verification link that gets printed.
    if (!isInteractive()) {
      await open(pollingInfo.value.verificationUri)
    }

    const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
      identityProviderHost,
      identityProviderClientId,
      pollingInfo.value.deviceCode,
      pollingInfo.value.interval
    )

    if (!authInfo.ok) {
      print.error('An error occurred and "stash init" could not complete successfully')
      print.error(`Reason: ${errors.toErrorMessage(authInfo.error)}`)
      process.exit(1)
      return
    }

    const response = await makeHttpsClient(
      consoleApiHost,
      consoleApiPort
    ).get(`/api/meta/workspaces/${encodeURIComponent(workspace)}`, {
      headers: {
        Authorization: `Bearer ${authInfo.value.accessToken}`
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
            arn: response.data.keyId,
            namingKey: response.data.namingKey,
            region: response.data.keyRegion
          }
        }
      },
      oauthCreds: authInfo.value
    }

    await profileStore.saveProfile(profile)

    print.info(`Workspace configuration and authentication details have been saved in dir ~/.cipherstash`)
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
