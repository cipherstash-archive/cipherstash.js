import { STS } from "@aws-sdk/client-sts"
import { Credentials } from '@aws-sdk/types'
import { AwsCredentialsSource } from './stash-profile'

// You'd think there'd be one of these ready-to-go in @aws-sdk/types, but
// nooooooo, they're all client-specific, so we've got to build our own.
// LIKE ANIMALS.
export type AWSClientConfig = { credentials?: Credentials, region?: string }

export async function awsConfig(creds: AwsCredentialsSource, token: string): Promise<AWSClientConfig> {
  return new Promise(async (resolve, reject) => {
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

/*
  * Federates the accessToken to a role ARN, using the specified region as the
  * STS endpoint (the closer the better, for latency reasons).
  *
  * NOTE: we will not be federating these tokens in production but we need to
  * for local dev and the development plan that we will sell.
  */
async function federateAwsToken(
  accessToken: string,
  roleArn: string,
  region: string
): Promise<AWSClientConfig> {
  const client = new STS({region: region})
  return client.assumeRoleWithWebIdentity({
    RoleArn: roleArn,
    WebIdentityToken: accessToken,
    // TODO: This should possibly be the user ID (sub from the access token)
    RoleSessionName: "stash-client"
  }).then(({ Credentials: credentials }) => {
    if (credentials) {
      const {
        AccessKeyId: accessKeyId,
        SecretAccessKey: secretAccessKey,
        SessionToken: sessionToken
      } = credentials

      return {
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
          sessionToken: sessionToken!,
        },
        region: region
      }
    } else {
      return Promise.reject(new Error("STS Token Exchange failed"))
    }
  }).catch(err => {
    return Promise.reject(err)
  })
}
