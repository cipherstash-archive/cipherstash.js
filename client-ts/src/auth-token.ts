import https from 'https'
import querystring from 'querystring'
import AWS from "aws-sdk"

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER = 20

export type ClientCredentials = {
  clientId: string,
  clientSecret: string
}

export type FederationConfig = {
  IdentityPoolId: string,
  region: string
}

type AuthenticationResponse = {
  access_token: string,
  expires_in: number
}

export class AuthToken {
  private tokens: {[key: string]: any} = {}

  /*
   * Instantiates a new AuthToken.
   * 
   * Tokens are cached up to just before they expire along with the data service
   * for which they have been issued. This prevents a cached token being
   * eroneously used for a new data server.  Consequently, the AuthToken can
   * manage tokens for multiple data services at once.
   *
   * @param {string} idpHost is the hostname of the issuing Identity Provider
   * @param {ClientCredentials} clientCredentials
   * @param {FederationConfig} federationConfig
   */
  constructor(
    private idpHost: string,
    private clientCredentials: ClientCredentials,
    private federation: FederationConfig
  ) {}

  /*
   * Gets an Auth token for the given server. This will fail if access is denied.
   *
   * @param {string} dataServiceId the ID of the data service
   * @returns {Promise} a promise for the token
   */
  async getToken(dataServiceId: string): Promise<string> {
    // Check if token is set and not expired
    // authenticate and return the token or just return the token
    if (!this.tokenValid(dataServiceId)) {
      try {
        const {access_token, expires_in} = await this.authenticate(dataServiceId)
        this.tokens[dataServiceId] = {
          accessToken: access_token,
          expiresAt: Math.trunc((new Date()).getTime() / 1000) + expires_in - EXPIRY_BUFFER
        }
        /* Federate the token if configured */
        await this.federateToken(access_token)
      } catch (err) {
        return Promise.reject(err)
      }
    }
    return this.tokens[dataServiceId].accessToken
  }

  /*
   * Federates the accessToken to any configfured identity pools.
   * Only supports AWS (Cognito) right now.
   *
   * See https://docs.aws.amazon.com/cognito/latest/developerguide/open-id.html
   */
  federateToken(accessToken: string): Promise<void> {
    if (this.federation) {
      return new Promise((resolve, reject) => {
        const { IdentityPoolId, region } = this.federation

        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
          IdentityPoolId,
          Logins: {
            [this.idpHost]: accessToken
          }
        }, {region})

        AWS.config.getCredentials((err) => {
          if (err) reject(err)
          resolve(undefined)
        })
      })
    } else {
      return Promise.resolve(undefined)
    }
  }

  /*
   * Determines if we already have a valid auth token for the data
   * server
  * */
  tokenValid(dataServiceId: string) {
    return !!this.tokens[dataServiceId]
  }

  /*
   * Performs an OAuth2 exchange using a client credentials grant to the IdP
   *
   * @param {string} dataServiceId - the ID for the data service
   */
  async authenticate(dataServiceId: string): Promise<AuthenticationResponse> {
    return new Promise((resolve, reject) => {
      let chunks: Array<string> = []

      const req = https.request(this.httpsRequestOptions(), (res) => {
        res.on('data', (chunk) => {
          chunks.push(chunk)
        });

        res.on('end', () => {
          const response = JSON.parse(chunks.join(''))

          if (response.error) {
            reject(response)
          } else {
            resolve(response)
          }
        });
      });

      req.on('error', (e) => {
        reject(e)
      })


      req.write(querystring.stringify({
        audience: dataServiceId,
        grant_type: "client_credentials",
        client_id: this.clientCredentials.clientId,
        client_secret: this.clientCredentials.clientSecret
      }));

      req.end();
    })
  }

  private httpsRequestOptions(): https.RequestOptions {
    return {
      host: this.idpHost,
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      rejectUnauthorized: true,
      minVersion: "TLSv1.3",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }  
  }
}

