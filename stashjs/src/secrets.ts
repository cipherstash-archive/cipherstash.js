import { SecretsManager } from "aws-sdk"

export type ClusterKey = { clusterKey: string }

export const getSecret = (secretId: string): Promise<ClusterKey> => {
  return new Promise((resolve, reject) => {
    // FIXME do not hard code this
    const region = "ap-southeast-2"
    const secretsManager = new SecretsManager({ region })
    secretsManager.getSecretValue({ SecretId: secretId }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        const { SecretString } = data
        if (SecretString) {
          const { CLUSTER_KEY: clusterKey } = JSON.parse(SecretString)
          resolve({clusterKey})
        } else {
          reject("Could not find CLUSTER_KEY in response")
        }
      }
    })
  })
}