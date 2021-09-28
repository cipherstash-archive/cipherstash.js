export type AuthStrategyName =
    | "client-credentials"
    | "stored-access-token"

export type AuthenticationConfig =
 | {
    readonly kind: "client-credentials",
    readonly clientSecret: string,
    readonly clientId: string,
 }
 | {
    readonly kind: "stored-access-token",
    readonly clientId: string
 }

export type FederationConfig = {
  readonly RoleArn: string,
  readonly region: string,
}

export type StashConfig = {
  readonly idpHost: string,
  readonly authenticationConfig: AuthenticationConfig,
  readonly federationConfig: FederationConfig,
  readonly serviceFqdn: string,
  readonly cmk: string,
  readonly clusterId: string
}

export function loadConfigFromEnv(): StashConfig {
  const authStrategy: AuthStrategyName = getVar("CS_AUTH_STRATEGY", "client-credentials") as AuthStrategyName
  switch (authStrategy) {
    case "client-credentials": return {
      idpHost: getVar('CS_IDP_HOST'),
      authenticationConfig: {
        kind: "client-credentials",
        clientId: getVar('CS_CLIENT_ID'),
        clientSecret: getVar('CS_SECRET'),
      },
      federationConfig: {
        // TODO: Make this able to be overridden via an env var
        RoleArn: "arn:aws:iam::377140853070:role/DanSTSAssumeRoleTesting",
        region: 'ap-southeast-2'
      },
      serviceFqdn: getVar('CS_SERVICE_FQDN'),
      cmk: getVar('CS_DEV_CMK'),
      clusterId: getClusterId()
    }
    case "stored-access-token": return {
      idpHost: getVar('CS_IDP_HOST'),
      authenticationConfig: {
        kind: "stored-access-token",
        clientId: getVar('CS_CLIENT_ID')
      },
      federationConfig: {
        // TODO: Make this able to be overridden via an env var
        RoleArn: "arn:aws:iam::377140853070:role/DanSTSAssumeRoleTesting",
        region: 'ap-southeast-2'
      },
      serviceFqdn: getVar('CS_SERVICE_FQDN'),
      cmk: getVar('CS_DEV_CMK'),
      clusterId: getClusterId()
    }
    default: throw new Error(`Unknown authentication strategy "${authStrategy}"`)
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
      throw Error(`"missing configuration: ${envVar}`)
    }
  }
}

function getClusterId(): string {
  let fqdn = getVar('CS_SERVICE_FQDN')

  // Remove port
  if (fqdn.indexOf(':') > -1) {
    fqdn = fqdn.split(':')[0]!
  }

  // Grab left-most subdomain
  if (fqdn.indexOf('.') > -1) {
    fqdn = fqdn.split('.')[0]!
  }

  return fqdn
}
