
import { GluegunCommand } from 'gluegun'
import * as open from 'open'

// The client ID could be retrieved by selecting the region
// from a meta-data service
const CLIENT_ID = 'tz5daCHFQLJRshlk9xr2Tl1G2nVJP5nv'

const IDP_API = {
  baseURL: 'https://cipherstash-dev.au.auth0.com/',
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ContentType: 'application/x-www-form-urlencoded'
  },
}

type DeviceCodeAuthorizationResponse = {
  verification_uri_complete: string,
  user_code: string,
  device_code: string,
  interval: number
}

function makeTokenPoll(interval: number): TokenPoll {
  return new TokenPoll(interval)
}

class TokenPoll {
  private interval
  private successCallback
  private failCallback
  private pollFunc

  constructor(interval: number) {
    this.interval = interval
  }

  // TODO: Define the type
  poll(func: any) {
    this.pollFunc = func
    this.pending()
    return this
  }

  // TODO: Define the type
  success(func: any) {
    this.successCallback = func
    return this
  }

  // TODO: Define the type
  failure(func: any) {
    this.failCallback = func
    return this
  }

  pending() {
    setTimeout(() => {
      this.pollFunc(this)
    }, this.interval * 1000)
  }

  done(response: any) {
    this.successCallback(response)
  }

  failed(message: string) {
    this.failCallback(message)
  }
}

const command: GluegunCommand = {
  name: 'login',
  run: async toolbox => {
    const { print, http } = toolbox

    const api = http.create(IDP_API)
    const ret = await api.post("/oauth/device/code", {
      client_id: CLIENT_ID,
      scope: 'collection.create collection.delete document.put document.delete document.get document.query',
      audience: 'dev-local'
    })

    if (ret.ok) {
      const data = ret.data as DeviceCodeAuthorizationResponse
      print.info(`Visit ${data.verification_uri_complete} to complete authentication`)
      print.info("Waiting for authentication...")
      await open(data.verification_uri_complete)

      makeTokenPoll(5)
        .poll((next) => {
          api
            .post("/oauth/token", {
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              device_code: data.device_code,
              client_id: CLIENT_ID
            })
            .then((ret: any) => {
              const { data } = ret
              // See https://auth0.com/docs/flows/call-your-api-using-the-device-authorization-flow#token-responses
              if (data.error === "authorization_pending") {
                return next.pending()
              }
              if (data.error) {
                return next.failed(data.error_description)
              }
              if (data.access_token) {
                return next.done(data)
              }
            })
            .catch(() => {
              next.error()
            })
        })
        .success((ret) => {
          console.log("SUCCESS", ret)
          print.info("Login Successful")
        })
        .failure((message) => {
          print.error(`Could not login. Message from server: "${message}"`)
        })
    } else {
      print.error("Could not login")
    }
  },
}

module.exports = command
