
const { v4: uuidv4, parse: parseUUID } = require('uuid')
const Indexer = require('./indexer')
const { SourceEncryptor, SourceDecryptor } = require('./source_encryptor')
const QueryBuilder = require('./query_builder')
const Mapping = require('./mapping')
const Secrets = require('./secrets')
const crypto = require('crypto')
const Query = require('./query')

// Put this in a Util module
function asBuffer(id) {
  // TODO: Check that id is a num, bigint smaller than 64bits or a Buffer
  if (id instanceof Buffer) {
    return id;
  } else {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(id));
    return buf;
  }
}

class Collection {
  /*
   * Makes a collection ref (anonymised string)
   * from the given collection name.
   * */
  static async makeRef(name, dataServiceId) {
    const clusterKey = await Secrets.getSecret(`cs-cluster-secret-${dataServiceId}`)
    const clusterKeyBin = Buffer.from(clusterKey, "base64")

    const hmac = crypto.createHmac('sha256', clusterKeyBin)
    hmac.update(name)
    return hmac.digest()
  }

  static async create(name, indexSettings, grpcStub, dataServiceId, auth, cipherSuite) {

    const indexes = indexSettings.reduce((acc, settings) => {
      const fieldKey = crypto.randomBytes(32)
      const id = uuidv4({}, Buffer.alloc(16)).toString('hex')
      acc[id] = {...settings, key: fieldKey}
      return acc
    }, {})

    const encryptedIndexes = await Promise.all(Object.entries(indexes).map(async (entry) => {
      const [id, index] = entry
      const { result } = await cipherSuite.encrypt(index)
      return { id: Buffer.from(id, 'hex'), settings: result }
    }))

    const request = {
      ref: await Collection.makeRef(name, dataServiceId),
      indexes: encryptedIndexes
    }
    const reply = await Collection.callGRPC('createCollection', grpcStub, dataServiceId, auth, request)

    return new Collection(reply.id, indexes, grpcStub, dataServiceId, auth, cipherSuite)
  }

  static async load(name, grpcStub, dataServiceId, auth, cipherSuite) {
    this.grpcStub = grpcStub
    this.cipherSuite = cipherSuite

    const request = { ref: await Collection.makeRef(name, dataServiceId) }
    // TODO: Consolidate grpcStub, auth and hostname into one class
    const {id, indexes} = await Collection.callGRPC('collectionInfo', grpcStub, dataServiceId, auth, request)

    const decryptedIndexes  = await indexes.reduce(async (acc, index) => {
      const {settings, id} = index
      const plaintextSettings = await cipherSuite.decrypt(settings)

      return Object.assign(await acc, { [id.toString('hex')]: plaintextSettings })
    }, Promise.resolve({}))

    return new Collection(id, decryptedIndexes, grpcStub, dataServiceId, auth, cipherSuite)
  }

  static async delete(name, grpcStub, dataServiceId, auth) {
    const request = { ref: await Collection.makeRef(name, dataServiceId) }

    const _response = await Collection.callGRPC('deleteCollection', grpcStub, dataServiceId, auth, request)
    return request.id
  }

  constructor(id, indexes, grpcStub, dataServiceId, auth, cipherSuite) {
    this.id = id
    this.grpcStub = grpcStub
    this.dataServiceId = dataServiceId
    this.auth = auth
    this.mapping = new Mapping(indexes)
    this.cipherSuite = cipherSuite
  }

  async get(id) {
    const request = this.buildGetRequest(id)
    const { source } = await Collection.callGRPC('get', this.grpcStub, this.dataServiceId, this.auth, request)
    return this.handleResponse(source)
  }

  async put(doc) {
    const request = await this.buildPutRequest(doc)
    // TODO: Read the ID from the response
    const _response = await Collection.callGRPC('put', this.grpcStub, this.dataServiceId, this.auth, request)
    return request.id
  }

  /* Can be used in several ways:
   *
   * @example With a simple object constraint:
   *
   *     stash.all(User, {email: "name@example.com"})
   *
   * @example With a `Query` object:
   *
   *     const query = new Query({name: "Foo Bar"})
   *     stash.all(User, query)
   *
   * @example With a function:
   *
   *     stash.all(User, (q) => {
   *       return { age: q.gte(20) }
   *     })
   *
   * Note that the default limit for the all function is 20.
   * Use a `Query` to change the limit.
   *
   */
  async all(queryable) {
    const query = Query.from(queryable)
    const request = await this.buildQueryRequest(query)

    const { result, aggregates } = await Collection.callGRPC(
      'query',
      this.grpcStub,
      this.dataServiceId,
      this.auth,
      request
    )

    const records = await SourceDecryptor(result, this.cipherSuite)

    return {
      records,
      aggregates: aggregates.reduce((acc, {name, value}) => {
        return {[name]: value,...acc}
      }, {})
    }
  }

  buildGetRequest(id) {
    return {
      collectionId: this.id,
      id: asBuffer(id)
    }
  }

  async buildPutRequest(doc) {
    let docId = doc.id ? asBuffer(doc.id) : uuidv4({}, Buffer.alloc(16))

    const data = await Promise.all([
      Indexer(doc, this.mapping),
      SourceEncryptor(doc, this.cipherSuite)
    ])

    const [vectors, source] = data

    const putRequest = {
      collectionId: this.id,
      source: {
        id: docId,
        source
      },
      vectors: vectors.map(({indexId, ore}) => {
        return {
          indexId: indexId,
          terms: [{
            term: ore,
            link: docId
          }]
        }
      })
    }

    return putRequest
  }

  async buildQueryRequest({constraints, recordLimit, aggregates, skipResultsFlag}) {
    const queryRequest = {
      collectionId: this.id,
      query: {
        limit: recordLimit,
        constraints: constraints.flatMap(([field, condition]) =>
          this.mapping.query(field, condition)
        ),
        aggregates: aggregates,
        skipResults: skipResultsFlag
      }
    }

    return queryRequest
  }

  async handleResponse(response) {
    return SourceDecryptor(response.source, this.cipherSuite)
  }

  static callGRPC(fun, stub, dataServiceId, auth, requestBody) {
    return new Promise((resolve, reject) => {
      /* Start by making sure we have a token */
      auth.getToken(dataServiceId).then((authToken) => {
        const request = {
          context: { authToken },
          ...requestBody
        }

        stub[fun](request, (err, res) => {
          if (err) {
            reject(err)
          } else {
            resolve(res)
          }
        })
      }).catch((err) => {
        reject(err)
      })
    })
  }
}

module.exports = Collection
