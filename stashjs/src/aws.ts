import { AssumeRoleWithWebIdentityCommandOutput, STS } from "@aws-sdk/client-sts"
import { Credentials } from '@aws-sdk/types'
import { AwsCredentialsSource } from './stash-profile'

// You'd think there'd be one of these ready-to-go in @aws-sdk/types, but
// nooooooo, they're all client-specific, so we've got to build our own.
// LIKE ANIMALS.
export type AWSClientConfig = {
  // FIXME: these fields should not be optional
  credentials?: Credentials,
  region?: string
}


export async function awsConfig(creds: AwsCredentialsSource, token: string): Promise<AWSClientConfig> {
  return new Promise((resolve, reject) => {
    switch(creds.kind) {
      case "Federated":
        federateAwsToken(token, creds.roleArn, creds.region)
          .then(cfg => resolve(cfg))
          .catch(err => reject(err))
        break
      case "Explicit":
        resolve({
          credentials: {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
          },
          region: creds.region
        })
        break
    }
  })
}

// Remember the last credentials that were acquired by federation. We'll keep these
// until 5 minutes before they are due to expire and then we'll refresh them.
let cachedAwsClientConfig: AWSClientConfig | undefined = undefined
let cachedAwsClientConfigExpiry: Date | undefined = undefined

const EXPIRY_BUFFER_MILLIS = 5 * 60 * 1000

function requiresRefresh(expiration: Date): boolean {
  return (expiration.getTime() - EXPIRY_BUFFER_MILLIS) < (new Date().getTime())
}

function toAwsClientConfig(region: string, credentials: AssumeRoleWithWebIdentityCommandOutput['Credentials']): AWSClientConfig {
  const {
    AccessKeyId: accessKeyId,
    SecretAccessKey: secretAccessKey,
    SessionToken: sessionToken,
    Expiration: expiration
  } = credentials!

  return {
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      sessionToken,
      expiration
    },
    region: region
  }
}

/*
  * Federates the accessToken to a role ARN, using the specified region as the
  * STS endpoint (the closer the better, for latency reasons).
  *
  * NOTE: we will not be federating these tokens in production but we need to
  * for local dev and the development plan that we will sell.
  *
  * NOTE: federation is expensive so the returned temporary credentials are
  * cached until they are due for a refresh. Expired credentials will be
  * automatically refreshed.
  */
async function federateAwsToken(
  accessToken: string,
  roleArn: string,
  region: string
): Promise<AWSClientConfig> {
  if (cachedAwsClientConfig && cachedAwsClientConfigExpiry && !requiresRefresh(cachedAwsClientConfigExpiry)) {
    return cachedAwsClientConfig
  } else {
    const client = new STS({ region })
    return client.assumeRoleWithWebIdentity({
      RoleArn: roleArn,
      WebIdentityToken: accessToken,
      // TODO: This should possibly be the user ID (sub from the access token)
      RoleSessionName: "stash-client"
    }).then((result) => {
      const { Credentials: credentials } = result
      if (credentials) {
         cachedAwsClientConfig = toAwsClientConfig(region, credentials)
         cachedAwsClientConfigExpiry = credentials!.Expiration
         return cachedAwsClientConfig
      } else {
        return Promise.reject(new Error("STS Token Exchange failed"))
      }
    }).catch(err => {
      return Promise.reject(err)
    })
  }
}
