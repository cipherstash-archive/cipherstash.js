import https from 'https'
import axios, { AxiosInstance } from 'axios'
import querystring from 'querystring'
import jws from 'jws'
import { AuthenticationFailure, OAuthFailure, PlainError, wrap } from '../errors'
import { AsyncResult, Ok, Err, Result, fromPromise } from '../result'

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
  ): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    const promise = makeOauthClient(idpHost).post('/oauth/token', querystring.stringify({
      audience,
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    }))
    const response = await fromPromise(promise, OAuthFailure)
    if (response.ok) {
      if (response.value.status >= 200 && response.value.status < 400) {
        return Ok(camelcaseKeys(response.value.data) as OauthAuthenticationInfo)
      } else {
        return Err(AuthenticationFailure(OAuthFailure(PlainError(`An error status was returned: ${response.value.status}`))))
      }
    } else {
      return Err(AuthenticationFailure(response.error))
    }
  }

  public async performTokenRefresh(
    idpHost: string,
    refreshToken: string,
    clientId: string
  ): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    let params = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId
    }
    const promise = makeOauthClient(idpHost).post<string>('/oauth/token', querystring.stringify(params))
    const response = await fromPromise(promise, OAuthFailure)
    if (response.ok) {
      if (response.value.status >= 200 && response.value.status < 400) {
        try {
          const unpacked = this.unpackResponse(camelcaseKeys(JSON.parse(response.value.data)))
          if (unpacked.ok) {
            return Ok(unpacked.value)
          } else {
            return Err(AuthenticationFailure(unpacked.error, 'Failed to unpack response from Auth0'))
          }
        } catch(error) {
          return Err(AuthenticationFailure(OAuthFailure(PlainError(`Failed to parse response from Auth0 (response body: ${response.value.data})`))))
        }
      } else {
        return Err(AuthenticationFailure(OAuthFailure(PlainError(`Authentication failed - returned status ${response.value.status}`))))
      }
    } else {
      return Err(AuthenticationFailure(response.error, 'Token refresh failed'))
    }
  }

  public unpackResponse(json: any): Result<OauthAuthenticationInfo, OAuthFailure> {
    json = camelcaseKeys(json)
    if (!json['accessToken'] || !json['refreshToken']) {
      return Err(OAuthFailure(PlainError(`Unexpected reponse payload: ${JSON.stringify(json)}`)))
    }

    try {
      const decoded = jws.decode(json['accessToken'])
      return Ok({
        accessToken: json['accessToken'],
        refreshToken: json['refreshToken'],
        expiry: decoded.payload.exp
      })
    } catch (err: unknown) {
      return Err(OAuthFailure(wrap(err)))
    }
  }

  public async loginViaDeviceCodeAuthentication(
    idpHost: string,
    clientId: string,
    audience: string,
    scope: string
  ): AsyncResult<DeviceCodePollingInfo, AuthenticationFailure> {
    const promise = makeOauthClient(idpHost).post("/oauth/device/code", {
      client_id: clientId,
      scope,
      audience
    })
    const response = await fromPromise(promise, OAuthFailure)

    if (response.ok) {
      if (response.value.status === 200) {
        const {
          device_code: deviceCode,
          user_code: userCode,
          verification_uri_complete: verificationUri,
          interval
        } = response.value.data

        return Ok({ deviceCode, userCode, verificationUri, interval })
      } else {
        return Err(AuthenticationFailure(OAuthFailure(wrap(response.value.data))))
      }
    } else {
      return Err(AuthenticationFailure(response.error))
    }
  }

  public async pollForDeviceCodeAcceptance(
    idpHost: string,
    clientId: string,
    deviceCode: string,
    interval: number
  ): AsyncResult<OauthAuthenticationInfo, AuthenticationFailure> {
    while (true) {
      const client = makeOauthClient(idpHost)
      const response = await fromPromise(client.post("/oauth/token", {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: clientId,
      }, {
        validateStatus: (status: number) => client.defaults.validateStatus!(status) || status === 403
      }), OAuthFailure)

      if (response.ok) {
        // See https://auth0.com/docs/flows/call-your-api-using-the-device-authorization-flow#token-responses
        if (response.value.data?.access_token) {
          const unpackedResponse = this.unpackResponse(response.value.data)
          if (unpackedResponse.ok) {
            return Ok(unpackedResponse.value)
          }
        } else if (response.value.data?.error === "authorization_pending") {
          await pause(interval)
        } else if (response.value.data?.error === "slow_down") {
          // increase polling interval by 5 seconds
          // see: https://datatracker.ietf.org/doc/html/rfc8628#section-3.5
          interval += 5
          await pause(interval)
        } else if (response.value.data?.error ===  "invalid_grant") {
          return Err(AuthenticationFailure(OAuthFailure(response.value.data?.error_description)))
        }
      } else {
        return Err(AuthenticationFailure(response.error))
      }
    }
  }
}

async function pause(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), seconds * 1000)
  })
}

function camelcaseKeys(json: object): object {
  return Object.fromEntries(Object.entries(json).map(
    ([key, val]) => [key.replace(/(\_\w)/g, (k) => k[1]!.toUpperCase() ), val]
  ))
}

function makeOauthClient(idpHost: string): AxiosInstance {
  return axios.create({
    baseURL: `https://${idpHost}`,
    timeout: 5000,
    httpsAgent: new https.Agent({
      port: 443,
      rejectUnauthorized: true,
      minVersion: "TLSv1.3"
    })
  })
}

export const stashOauth = new StashOauth()
