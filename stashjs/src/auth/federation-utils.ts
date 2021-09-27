import AWS from "aws-sdk"
import { FederationConfig } from '../stash-config'
import { AWSCredentials } from "./aws-credentials"
import { STS } from "@aws-sdk/client-sts"

/*
  * Federates the accessToken to any configfured identity pools.
  * Only supports AWS (Cognito) right now.
  *
  * See https://docs.aws.amazon.com/cognito/latest/developerguide/open-id.html
  *
  * NOTE: we will not be federating these tokens in production but we need to
  * for local dev and the development plan that we will sell.
  */
export async function federateToken(
  accessToken: string,
  config: FederationConfig
): Promise<AWSCredentials> {
  const { region } = config

  try {
    const client = new STS({region: region})
    const { Credentials } = await client.assumeRoleWithWebIdentity({
      WebIdentityToken: accessToken,
      RoleArn: "arn:aws:iam::377140853070:role/DanSTSAssumeRoleTesting",
      RoleSessionName: "stash-client" // TODO: This should possibly be the user ID (sub from the access token)
    })

    if (Credentials) {
      const { AccessKeyId, SecretAccessKey, SessionToken } = Credentials
      // TODO: Track expiry - federated STS tokens should be re-fetched before they expire

      const AWScreds = new AWS.Credentials(AccessKeyId!, SecretAccessKey!, SessionToken!)
      AWS.config.credentials = AWScreds
      return AWScreds
    } else {
      return Promise.reject(new Error("STS Token Exchange failed"))
    }
  } catch (err) {
    return Promise.reject(err)
  }
}
