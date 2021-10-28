export type IdentityProvider =
  | {
      kind: "Auth0-DeviceCode"
      host: string
      clientId: string
    }
  | {
      kind: "Auth0-Machine2Machine"
      host: string
      clientId: string
      clientSecret: string
    }

export type KmsKeySource =
  | {
    kind: "FromConsoleAPI"
    cmk: string
    namingSalt: string
  }
  | {
    kind: "Custom"
    cmk: string
    namingSalt: string
  }

export type AwsCredentialsSource =
  | {
    kind: "Federated"
    roleArn: string
    region: string
  }
  | {
    kind: "Custom"
    accessKeyId: string
    secretAccessKey: string
    region: string
  }

export type KeyManagement = {
  kind: "AWS-KMS",
  key: KmsKeySource
  awsCredentials: AwsCredentialsSource
}

export type StashConfig = {
  serviceFqdn: string
  console?: {
    host: string
    port?: number
  }
  identityProvider: IdentityProvider
  keyManagement: KeyManagement
}

export function loadConfigFromEnv(): StashConfig {
  return {
    serviceFqdn: getVar('CS_SERVICE_FQDN'),
    identityProvider: {
      kind: "Auth0-Machine2Machine",
      host: getVar('CS_IDP_HOST'),
      clientId: getVar('CS_CLIENT_ID'),
      clientSecret: getVar('CS_SECRET')
    },
    keyManagement: {
      kind: "AWS-KMS",
      key: {
        kind: "Custom",
        cmk: getVar('CS_DEV_CMK'),
        namingSalt: getVar('CS_NAMING_SALT')
      },
      awsCredentials: getVar("CS_AWS_FEDERATE", "on") === "on" ? {
        kind: "Federated",
        roleArn: `arn:aws:iam::${getVar("CS_FEDERATION_AWS_ACCOUNT_ID", "616923951253")}:role/cs-federated-cmk-access`,
        region: 'ap-southeast-2'
      } : {
        kind: "Custom",
        accessKeyId: getVar("AWS_ACCESS_KEY_ID"),
        secretAccessKey: getVar("AWS_SECRET_ACCESS_KEY"),
        region: getVar("AWS_DEFAULT_REGION")
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