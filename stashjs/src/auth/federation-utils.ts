import AWS from "aws-sdk"
import { FederationConfig } from '../stash-config'
import { AWSCredentials } from "./aws-credentials"

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
  idpHost: string,
  config: FederationConfig
): Promise<AWSCredentials> {
  const { IdentityPoolId, region } = config

  try {
    return await new Promise((resolve, reject) => {
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId,
        Logins: {
          [idpHost]: accessToken
        }
      }, { region })

      AWS.config.getCredentials((err, creds) => {
        if (err) {
          reject(err)
        } else if (creds) {
          resolve({
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken: creds.sessionToken!
          })
        } else {
          reject("Could not federate token in exchange for AWS credentials")
        }
      })
    })
  } catch (err) {
    return Promise.reject(err)
  }
}