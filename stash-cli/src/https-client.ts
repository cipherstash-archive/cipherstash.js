import * as https from 'https'
import axios, { AxiosInstance } from 'axios'

export function makeHttpsClient(host: string, port: number): AxiosInstance {
  if (port === 443) {
    return axios.create({
      baseURL: `https://${host}`,
      timeout: 5000,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      },
      httpsAgent: new https.Agent({
        port,
        rejectUnauthorized: true,
        minVersion: 'TLSv1.3'
      })
    })
  } else {
    // FIXME: this is horrible but it allows us to test during development
    // without having to set up TLS on localhost.
    return axios.create({
      baseURL: `http://${host}:${port}`,
      timeout: 5000,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
    })
  }
}
