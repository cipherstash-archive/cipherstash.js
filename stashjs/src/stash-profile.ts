export type Auth0AccessToken = {
  kind: "Auth0-AccessToken"
  accessToken: string
}

export type Auth0DeviceCode = {
  kind: "Auth0-DeviceCode"
  host: string
  clientId: string
}

export type Auth0Machine2Machine = {
  kind: "Auth0-Machine2Machine"
  host: string
  clientId: string
  clientSecret: string
}

export type IdentityProvider = Auth0AccessToken | Auth0DeviceCode | Auth0Machine2Machine

export type KmsKeySource = {
  cmk: string
  namingKey: string
  region: string
}

export type FederatedAwsCredentialsSource = {
  kind: "Federated"
  roleArn: string
  region: string
}

export type ExplicitAwsCredentialsSource = {
  kind: "Explicit"
  accessKeyId: string
  secretAccessKey: string
  region: string
}

export type AwsCredentialsSource = FederatedAwsCredentialsSource | ExplicitAwsCredentialsSource

export type KMSKey = {
  kind: "AWS-KMS",
  key: KmsKeySource
  awsCredentials: AwsCredentialsSource
}

export type StashProfile = {
  service: {
    host: string
    port?: number
    workspace: string
  },
  identityProvider: IdentityProvider
  keyManagement: KMSKey
}

export function loadConfigFromEnv(): StashProfile {
  return {
    service: {
      workspace: getVar('CS_WORKSPACE'),
      host: getVar('CS_SERVICE_FQDN')
    },
    identityProvider: getVar("CS_AUTH0_ACCESS_TOKEN", "") === "" ? {
      kind: "Auth0-Machine2Machine",
      host: getVar('CS_IDP_HOST'),
      clientId: getVar('CS_IDP_CLIENT_ID'),
      clientSecret: getVar('CS_IDP_CLIENT_SECRET')
    } : {
      kind: "Auth0-AccessToken",
      accessToken: getVar('CS_AUTH0_ACCESS_TOKEN')
    },
    keyManagement: {
      kind: "AWS-KMS",
      key: {
        cmk: getVar('CS_DEV_CMK'),
        namingKey: getVar('CS_NAMING_KEY'),
        region: getVar('AWS_REGION')
      },
      awsCredentials: /^(y|yes|t|true|on|1)$/.test(getVar("CS_AWS_FEDERATION", "on")) ? {
        kind: "Federated",
        roleArn: getVar("CS_AWS_FEDERATION_ROLE_ARN"),
        region: getVar('AWS_REGION')
      } : {
        kind: "Explicit",
        accessKeyId: getVar("AWS_ACCESS_KEY_ID"),
        secretAccessKey: getVar("AWS_SECRET_ACCESS_KEY"),
        region: getVar('AWS_REGION')
      }
    },
  }
}

function getVar(envVar: string, fallback?: string): string {
  const value = process.env[envVar]
  if (typeof value != 'undefined') {
    return value
  } else {
    if (fallback) {
      return fallback
    } else {
      throw new Error(`"missing configuration: ${envVar}`)
    }
  }
}
