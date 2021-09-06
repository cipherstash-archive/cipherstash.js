import AWS from "aws-sdk"
import { FederationConfig } from '../stash-config'

/*
  * Federates the accessToken to any configfured identity pools.
  * Only supports AWS (Cognito) right now.
  *
  * See https://docs.aws.amazon.com/cognito/latest/developerguide/open-id.html
  *
  * NOTE: we will not be federating these tokens in production but we need to
  * for local dev and the development plan that we will sell.
  */
export async function federateToken(idpHost: string, config: FederationConfig, accessToken: string): Promise<void> {
  const { IdentityPoolId, region } = config

  try {
    return await new Promise((resolve, reject) => {
      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId,
        Logins: {
          [idpHost]: accessToken
        }
      }, { region })

      AWS.config.getCredentials((err) => {
        if (err) reject(err)
        resolve(void 0)
      })
    })
  } catch (err) {
    return Promise.reject(err)
  }
}