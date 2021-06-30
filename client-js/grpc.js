
const gRPC = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const path = require('path')
const fs = require('fs')

const PROTO_BASE_PATH = path.join(module.path, 'dist', 'grpc')
const API_PROTO_FILE = path.join(PROTO_BASE_PATH, 'v1', 'api.proto')

const grpcDefinition = protoLoader.loadSync(
  API_PROTO_FILE, {
    includeDirs: [path.join(PROTO_BASE_PATH, 'v1')],
    keepCase: true,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true
  }
)

const APIProto = gRPC.loadPackageDefinition(grpcDefinition).stash
const gRPCCreds = gRPC.credentials.createSsl() // TODO: Verify the cert

const V1 = {
  API: function(host) {
    return new APIProto.GRPC.V1.API(host, gRPCCreds)
  }
}

module.exports = { V1: V1 }
