const AWS = require("aws-sdk")

class Secrets {
  static getSecret(SecretId) {
    return new Promise((resolve, reject) => {
      // TODO: Config for region
      var secretsmanager = new AWS.SecretsManager({region: "ap-southeast-2"})
      secretsmanager.getSecretValue({ SecretId }, function(err, data) {
        if (err) {
          reject(err)
        } else {
          const { SecretString } = data
          const { CLUSTER_KEY } = JSON.parse(SecretString)
          resolve(CLUSTER_KEY)
        }
      })
    })
  }
}

module.exports = Secrets
