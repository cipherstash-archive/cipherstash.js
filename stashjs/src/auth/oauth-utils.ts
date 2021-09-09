import https from 'https'
import querystring from 'querystring'
import axios, { AxiosInstance } from 'axios'
import jws from 'jws'
import { describeError } from '../utils'


export type OauthAuthenticationInfo = {
  accessToken: string,
  refreshToken: string,
  expiry: number
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