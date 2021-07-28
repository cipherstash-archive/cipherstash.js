export type StashConfig = {
  readonly idpHost: string,
  readonly clientCredentials: {
    readonly clientSecret: string
    readonly clientId: string,
  },
  readonly federationConfig: {
    readonly IdentityPoolId?: string,
    readonly region: string,
  }
  readonly serviceFqdn: string,
  readonly cmk: string,
  readonly clusterId: string
}

export function loadConfigFromEnv(): StashConfig {
  return {
    idpHost: getVar('CS_IDP_HOST'),
    clientCredentials: {
      clientId: getVar('CS_CLIENT_ID'),
      clientSecret: getVar('CS_SECRET'),
    },
    federationConfig: {
      IdentityPoolId: getOptionalVar('CS_FEDERATED_IDENTITY_ID'),
      region: 'ap-southeast-2'
    },
    serviceFqdn: getVar('CS_SERVICE_FQDN'),
    cmk: getVar('CS_DEV_CMK'),
    clusterId: getVar('CS_SERVICE_FQDN').split('.')[0]!,
  }
}

function getVar(envVar: string): string {
  const value = process.env[envVar]
  if (typeof value != 'undefined') {
    return value
  } else {
    throw Error(`"missing configuration: ${envVar}`)
  }
}

function getOptionalVar(envVar: string): string | undefined {
  return process.env[envVar]
}