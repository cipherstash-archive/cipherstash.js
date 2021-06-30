const https = require('https')
const querystring = require('querystring')
const AWS = require("aws-sdk")

const OPTS = {
  port: 443,
  path: '/oauth/token',
  method: 'POST',
  rejectUnauthorized: true,
  minVersion: "TLSv1.3",
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

const DATA = {
  grant_type: "client_credentials"
}

/* Refresh tokens before the expiry to avoid API errors due
 * to race conditions. Expiry buffer is in seconds */
const EXPIRY_BUFFER = 20

class AuthToken {
  /*
   * Instantiates a new AuthToken.
   * Tokens are cached up to just before they expire along with the data service for which
   * they have been issued. This prevents a cached token being eroneously used for a new data server.
   * Consequently, the AuthToken can manage tokens for multiple data services at once.
   *
   * @param {string} idpHost is the hostname of the issuing Identity Provider
   * @param {object} creds is an object containing the `clientId` and `clientSecret`
   */
  constructor({idpHost, creds, federation}) {
    this.idpHost = idpHost
    this.request = {...OPTS}
    this.request.host = idpHost
    this.data = {...DATA}
    this.data.client_id = creds.clientId
    this.data.client_secret = creds.clientSecret
    this.tokens = {}
    this.federation = federation
  }

  /*
   * Gets an Auth token for the given server. This will fail if access is denied.
   *
   * @param {string} dataServiceId the ID of the data service
   * @returns {Promise} a promise for the token
   */
  async getToken(dataServiceId) {
    // Check if token is set and not expired
    // authenticate and return the token or just return the token
    if (!this.tokenValid(dataServiceId)) {
      const {access_token, expires_in} = await this.authenticate(dataServiceId)
      this.tokens[dataServiceId] = {
        accessToken: access_token,
        expiresAt: Math.trunc((new Date()).getTime() / 1000) + expires_in - EXPIRY_BUFFER
      }
      /* Federate the token if configured */
      this.federateToken(access_token)
    }
    return this.tokens[dataServiceId].accessToken
  }

  /*
   * Federates the accessToken to any configfured identity pools.
   * Only supports AWS (Cognito) right now.
   *
   * See https://docs.aws.amazon.com/cognito/latest/developerguide/open-id.html
   */
  federateToken(accessToken) {
    if (this.federation) {
      const { IdentityPoolId, region } = this.federation

      AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId,
        Logins: {
          [this.idpHost]: accessToken
        }
      }, {region: region})

      AWS.config.credentials.get((err) => {
        // TODO: Use a custom exception to make it easier to identify
        if (err) {
          throw(err)
        }
      })
    }
  }

  /*
   * Determines if we already have a valid auth token for the data
   * server
  * */
  tokenValid(dataServiceId) {
    return !!this.tokens[dataServiceId]
  }

  /*
   * Performs an OAuth2 exchange using a client credentials grant to the IdP
   *
   * @param {string} dataServiceId - the ID for the data service
   */
  authenticate(dataServiceId) {
    return new Promise((resolve, reject) => {
      let chunks = []

      const req = https.request(this.request, (res) => {
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
        ...this.data
      }));

      req.end();
    })
  }
}

module.exports = AuthToken;
