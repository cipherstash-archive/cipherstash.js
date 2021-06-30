
const Query = require('./query')
const path = require('path')
const GRPC = require('./grpc').V1

const CipherSuite = require('./cipher')
const Collection = require('./collection')

class Stash {
  /*
   * @param {string} host - dataService host to connect to
   * @param {AuthToken} auth - instance of an AuthToken
   * @param {string} version - for forward compatibility (only v1 is valid right now)
   */
  static async connect(host, clusterId, auth, version = "v1") {
    const stash = new Stash(host, clusterId, auth, version)

    /* Get a token at startup so that any federated identities
     * (required for encryption) are ready */
    await auth.getToken(clusterId)

    return stash
  }

  /*
   * @param {string} host - the data service we are connecting to
   * @param {AuthToken} auth
   * @param {string} version - for forward compatibility (only v1 is valid right now)
   */
  constructor(host, clusterId, auth, cmk, _version) {
    this.stub = GRPC.API(host)
    this.host = host
    this.clusterId = clusterId
    this.auth = auth
    this.cipherSuite = new CipherSuite(cmk)
  }

  close() {
    this.stub.close()
  }

  async createCollection(name, indexes) {
    return Collection.create(name, indexes, this.stub, this.clusterId, this.auth, this.cipherSuite)
  }

  async deleteCollection(id) {
    return Collection.delete(id, this.stub, this.clusterId, this.auth)
  }

  async collection(name) {
    /* Ensure a token is available and federated */
    await this.auth.getToken(this.clusterId)

    return await Collection.load(name, this.stub, this.clusterId, this.auth, this.cipherSuite)
  }

}

module.exports = Stash
