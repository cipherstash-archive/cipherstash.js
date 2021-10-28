import * as https from 'https'
import axios, { AxiosInstance } from 'axios'
import { GluegunCommand } from 'gluegun'
import * as open from 'open'
import { configStore, defaults, stashOauth, describeError, StashConfig } from '@cipherstash/stashjs'
import { Toolbox } from 'gluegun/build/types/domain/toolbox'

const command: GluegunCommand = {
  name: 'init',

  run: async (toolbox: Toolbox) => {
    const { print, parameters } = toolbox

    const serviceFqdn: string = parameters.options.serviceFqdn || defaults.serviceFqdn

    const identityProviderHost: string = parameters.options.identityProviderHost || defaults.identityProvider.host
    const identityProviderClientId: string = parameters.options.identityProviderClientId || defaults.identityProvider.clientId

    const keyManagementAwsCredentialsRoleArn: string = parameters.options.keyManagementAwsCredentialsRoleArn || defaults.keyManagement.awsCredentials.roleArn
    const keyManagementAwsCredentialsRegion: string = parameters.options.keyManagementAwsCredentialsRegion || defaults.keyManagement.awsCredentials.region

    const consoleApiHost: string = parameters.options.consoleApiHost || defaults.console.host
    const consoleApiPort: number = parameters.options.consoleApiPort || defaults.console.port

    const workspace: string | undefined = parameters.options.workspace

    if (!workspace) {
      print.error('Error: a workspace must be provided')
      process.exit(1)
    }

    try {
      const pollingInfo = await stashOauth.loginViaDeviceCodeAuthentication(
        identityProviderHost,
        identityProviderClientId,
        serviceFqdn,
        workspace
      )

      print.info(`Visit ${pollingInfo.verificationUri} to complete authentication`)
      print.info("Waiting for authentication...")

      // Only open the browser when running this command locally.  If we are
      // running under SSH then the browser will open on the remote host - which
      // is not what we want.  Instead the user can simply click the
      // verification link that gets printed.
      if (!isRunningUnderSsh()) {
        await open(pollingInfo.verificationUri)
      }

      const authInfo = await stashOauth.pollForDeviceCodeAcceptance(
        identityProviderHost,
        identityProviderClientId,
        pollingInfo.deviceCode,
        pollingInfo.interval
      )

      await configStore.ensureConfigDirExists()
      await configStore.saveWorkspaceAuthInfo(workspace, authInfo)
      print.info("Login Successful")

      const response = await makeHttpsClient(
        consoleApiHost,
        consoleApiPort
      ).get(`/api/meta/workspaces/${workspace}`, {
        headers: {
          Authorization: `Bearer ${authInfo.accessToken}`
        }
      })

      const workspaceConfig: StashConfig = {
        serviceFqdn,
        console: {
          host: consoleApiHost,
          port: consoleApiPort,
        },
        identityProvider: {
          kind: "Auth0-DeviceCode",
          host: identityProviderHost,
          clientId: identityProviderClientId
        },
        keyManagement: {
          kind: "AWS-KMS",
          awsCredentials: {
            kind: "Federated",
            roleArn: keyManagementAwsCredentialsRoleArn,
            region: keyManagementAwsCredentialsRegion
          },
          key: {
            cmk: response.data.keyId,
            namingKey: response.data.namingKey
          }
        }
      }

      await configStore.saveWorkspaceConfig(workspace, workspaceConfig)

      print.info(`Workspace configuration and authentication details have been saved in dir ${configStore.configDir(workspace)}`)
    } catch (error) {
      print.error(`Could not login. Message from server: "${describeError(error)}"`)
    }
  },
}

export default command


function isRunningUnderSsh(): boolean {
  return process.env['SSH_CLIENT'] !== undefined || process.env['SSH_TTY'] !== undefined
}

function makeHttpsClient(host: string, port: number): AxiosInstance {
  if (port === 443) {
    return axios.create({
      baseURL: `https://${host}`,
      timeout: 5000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      httpsAgent: new https.Agent({
        port,
        rejectUnauthorized: true,
        minVersion: "TLSv1.3"
      })
    })
  } else {
    // FIXME: this is horrible but it allows us to test during development
    // without having to set up TLS on localhost.
    return axios.create({
      baseURL: `http://${host}:${port}`,
      timeout: 5000,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      }
    })
  }
}