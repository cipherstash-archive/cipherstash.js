import https from 'https'
import querystring from 'querystring'
import axios, { AxiosInstance } from 'axios'
import jws from 'jws'
import { describeError } from '../utils'

const SCOPES = "collection.create collection.delete collection.info document.put document.delete document.get document.query"

export type OauthAuthenticationInfo = {
  accessToken: string,
  refreshToken: string,
  expiry: number
}

export type DeviceCodePollingInfo = {
  deviceCode: string
  userCode: string
  verificationUri: string
  interval: number
}

class StashOauth {

  public async authenticateViaClientCredentials(
    idpHost: string,
    audience: string,
    clientId: string,
    clientSecret: string
  ): Promise<OauthAuthenticationInfo> {
    try {
      const response = await makeOauthClient(idpHost).post('/oauth/token', querystring.stringify({
        audience,
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      }))
      if (response.status >= 200 && response.status < 400) {
        return camelcaseKeys(response.data) as OauthAuthenticationInfo
      } else {
        return Promise.reject(`Authentication failed - returned status ${response.status}`)
      }
    } catch (err) {
      return Promise.reject(`Authentication failed: ${JSON.stringify(err)}`)
    }
  }

  public async performTokenRefresh(
    idpHost: string,
    refreshToken: string,
    clientId: string
  ): Promise<OauthAuthenticationInfo> {
    try {
      let params = {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId
      }
      const response = await makeOauthClient(idpHost).post('/oauth/token', querystring.stringify(params))
      if (response.status > 200 && response.status < 400) {
        return this.unpackResponse(camelcaseKeys(JSON.parse(response.data)))
      } else {
        return Promise.reject(`Token refresh failed - returned status ${response.status} data: ${JSON.stringify(response.data)}`)
      }
    } catch (err) {
      return Promise.reject(`Token refresh failed: ${describeError(err)}`)
    }
  }

  public unpackResponse(json: any): OauthAuthenticationInfo {
    json = camelcaseKeys(json)
    if (!json['accessToken'] || !json['refreshToken']) {
      throw new Error(`Unexpected reponse payload: ${JSON.stringify(json)}`)
    }

    const decoded = jws.decode(json['accessToken'])
    return {
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
      expiry: decoded.payload.exp
    }
  }

  public async loginViaDeviceCodeAuthentication(
    idpHost: string,
    clientId: string,
    audience: string,
    workspace: string | undefined
  ): Promise<DeviceCodePollingInfo> {
    const scope = !!workspace ?
      `offline_access ${SCOPES} ${workspace}` :
      `offline_access ${SCOPES}`

    const response: any = await makeOauthClient(idpHost).post("/oauth/device/code", {
      client_id: clientId,
      scope,
      audience
    })

    if (response) {
      if (response.status === 200) {
        const {
          device_code: deviceCode,
          user_code: userCode,
          verification_uri_complete: verificationUri,
          interval
        } = response.data

        return {
          deviceCode,
          userCode,
          verificationUri,
          interval
        }
      } else {
        return Promise.reject(`Could not initiate login: ${describeError(response.data)}`)
      }
    } else {
      return Promise.reject(`Could not initiate login (empty respone from IDP)`)
    }
  }

  public async pollForDeviceCodeAcceptance(
    idpHost: string,
    clientId: string,
    deviceCode: string,
    interval: number
  ): Promise<OauthAuthenticationInfo> {
    while (true) {
      const response: any = await makeOauthClient(idpHost).post("/oauth/token", {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: clientId
      }).catch((err: any) => {
        if (err.response) {
          return Promise.resolve(err.response)
        } else {
          return Promise.reject(err)
        }
      })

      // See https://auth0.com/docs/flows/call-your-api-using-the-device-authorization-flow#token-responses
      if (response.data?.access_token) {
        return this.unpackResponse(response.data)
      } else if (response.data?.error === "authorization_pending") {
        await new Promise((resolve) => {
          setTimeout(() => resolve(null), interval * 1000)
        })
      } else if (response.error) {
        return Promise.reject(response.data.error_description)
      }
    }
  }
}

function camelcaseKeys(json: any): any {
  return Object.fromEntries(Object.entries(json).map(
    ([key, val]) => [key.replace(/(\_\w)/g, (k) => k[1]!.toUpperCase() ), val]
  ))
}

function makeOauthClient(idpHost: string): AxiosInstance {
  return axios.create({
    baseURL: `https://${idpHost}`,
    timeout: 5000,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    httpsAgent: new https.Agent({
      port: 443,
      rejectUnauthorized: true,
      minVersion: "TLSv1.3"
    })
  })
}

export const stashOauth = new StashOauth()