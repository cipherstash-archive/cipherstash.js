import * as gRPC from '@grpc/grpc-js'
import * as  protoLoader from '@grpc/proto-loader'
import * as path from 'path'

import * as ProtoGrpcType from './generated/api'
import * as API from './generated/stash/GRPC/V1/API'

import * as GrpcRequestContext from './generated/stash/GRPC/V1/RequestContext'

import * as GrpcCreateRequest from './generated/stash/GRPC/V1/Collections/CreateRequest'
import * as GrpcDeleteRequest from './generated/stash/GRPC/V1/Collections/DeleteRequest'
import * as GrpcInfoReply from './generated/stash/GRPC/V1/Collections/InfoReply'
import * as GrpcInfoRequest from './generated/stash/GRPC/V1/Collections/InfoRequest'

import * as GrpcDocument from './generated/stash/GRPC/V1/Documents/Document'
import * as GrpcGetReply from './generated/stash/GRPC/V1/Documents/GetReply'
import * as GrpcGetRequest from './generated/stash/GRPC/V1/Documents/GetRequest'
import * as GrpcGetAllReply from './generated/stash/GRPC/V1/Documents/GetAllReply'
import * as GrpcGetAllRequest from './generated/stash/GRPC/V1/Documents/GetAllRequest'
import * as GrpcDocumentDeleteReply from './generated/stash/GRPC/V1/Documents/DeleteReply'
import * as GrpcDocumentDeleteRequest from './generated/stash/GRPC/V1/Documents/DeleteRequest'
import * as GrpcPutReply from './generated/stash/GRPC/V1/Documents/PutReply'
import * as GrpcPutRequest from './generated/stash/GRPC/V1/Documents/PutRequest'
import * as GrpcStreamingPutRequest from './generated/stash/GRPC/V1/Documents/StreamingPutRequest'
import * as GrpcStreamingPutBegin from './generated/stash/GRPC/V1/Documents/StreamingPutBegin'
import * as GrpcStreamingPutReply from './generated/stash/GRPC/V1/Documents/StreamingPutReply'
import * as GrpcTerm from './generated/stash/GRPC/V1/Documents/Term'
import * as GrpcVector from './generated/stash/GRPC/V1/Documents/Vector'

import * as GrpcAddReply from './generated/stash/GRPC/V1/Indexes/AddReply'
import * as GrpcAddRequest from './generated/stash/GRPC/V1/Indexes/AddRequest'
import * as GrpcIndex from './generated/stash/GRPC/V1/Indexes/Index'

import * as GrpcAggregate from './generated/stash/GRPC/V1/Queries/Aggregate'
import * as GrpcAggregateResult from './generated/stash/GRPC/V1/Queries/AggregateResult'
import * as GrpcConstraint from './generated/stash/GRPC/V1/Queries/Constraint'
import * as GrpcExact from './generated/stash/GRPC/V1/Queries/Exact'
import * as GrpcQuery from './generated/stash/GRPC/V1/Queries/Query'
import * as GrpcQueryReply from './generated/stash/GRPC/V1/Queries/QueryReply'
import * as GrpcQueryRequest from './generated/stash/GRPC/V1/Queries/QueryRequest'
import * as GrpcRange from './generated/stash/GRPC/V1/Queries/Range'

const PROTO_BASE_PATH = path.join(module.path, 'grpc')
const API_PROTO_FILE = path.join(PROTO_BASE_PATH, 'v1', 'api.proto')

const grpcDefinition = protoLoader.loadSync(
  API_PROTO_FILE, {
    includeDirs: [path.join(PROTO_BASE_PATH, 'v1')],
    keepCase: true,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
  }
)

const APIProto = (gRPC.loadPackageDefinition(grpcDefinition) as unknown as ProtoGrpcType.ProtoGrpcType).stash

export namespace V1  {
  export const connect = function(host: string) {
    // TODO: ensure that the SSL cert is verified
    return new APIProto.GRPC.V1.API(host, gRPC.credentials.createSsl())
  }

  export type APIClient = API.APIClient
  export type APIDefinition = API.APIDefinition

  export type RequestContextOutput = GrpcRequestContext.RequestContext__Output
  export type RequestContextInput = GrpcRequestContext.RequestContext
  export type CreateRequestOutput = GrpcCreateRequest.CreateRequest__Output
  export type CreateRequestInput = GrpcCreateRequest.CreateRequest
  export type DeleteRequestOutput = GrpcDeleteRequest.DeleteRequest__Output
  export type DeleteRequestInput = GrpcDeleteRequest.DeleteRequest
  export type InfoReplyOutput = GrpcInfoReply.InfoReply__Output
  export type InfoReplyInput = GrpcInfoReply.InfoReply
  export type InfoRequestOutput = GrpcInfoRequest.InfoRequest__Output
  export type InfoRequestInput = GrpcInfoRequest.InfoRequest
  export type DocumentOutput = GrpcDocument.Document__Output
  export type DocumentInput = GrpcDocument.Document
  export type GetReplyOutput = GrpcGetReply.GetReply__Output
  export type GetReplyInput = GrpcGetReply.GetReply
  export type GetAllReplyOutput = GrpcGetAllReply.GetAllReply__Output
  export type GetAllReplyInput = GrpcGetAllReply.GetAllReply
  export type GetRequestOutput = GrpcGetRequest.GetRequest__Output
  export type GetRequestInput = GrpcGetRequest.GetRequest
  export type DocumentDeleteRequestOutput = GrpcDocumentDeleteRequest.DeleteRequest__Output
  export type DocumentDeleteRequest = GrpcDocumentDeleteRequest.DeleteRequest
  export type DocumentDeleteReplyOutput = GrpcDocumentDeleteReply.DeleteReply__Output
  export type DocumentDeleteReply = GrpcDocumentDeleteReply.DeleteReply
  export type PutReplyOutput = GrpcPutReply.PutReply__Output
  export type PutReplyInput = GrpcPutReply.PutReply
  export type PutRequestOutput = GrpcPutRequest.PutRequest__Output
  export type PutRequestInput = GrpcPutRequest.PutRequest
  export type StreamingPutRequest = GrpcStreamingPutRequest.StreamingPutRequest
  export type StreamingPutRequestOutput = GrpcStreamingPutRequest.StreamingPutRequest__Output
  export type StreamingPutReply = GrpcStreamingPutReply.StreamingPutReply
  export type StreamingPutReplyOutput = GrpcStreamingPutReply.StreamingPutReply__Output
  export type StreamingPutBegin = GrpcStreamingPutBegin.StreamingPutBegin
  export type StreamingPutBeginOutput = GrpcStreamingPutBegin.StreamingPutBegin__Output
  export type TermOutput = GrpcTerm.Term__Output
  export type TermInput = GrpcTerm.Term
  export type VectorOutput = GrpcVector.Vector__Output
  export type VectorInput = GrpcVector.Vector
  export type AddReplyOutput = GrpcAddReply.AddReply__Output
  export type AddReplyInput = GrpcAddReply.AddReply
  export type AddRequestOutput = GrpcAddRequest.AddRequest__Output
  export type AddRequestInput = GrpcAddRequest.AddRequest
  export type IndexOutput = GrpcIndex.Index__Output
  export type IndexInput = GrpcIndex.Index
  export type AggregateOutput = GrpcAggregate.Aggregate__Output
  export type AggregateInput = GrpcAggregate.Aggregate
  export type AggregateResultOutput = GrpcAggregateResult.AggregateResult__Output
  export type AggregateResultInput = GrpcAggregateResult.AggregateResult
  export type ConstraintOutput = GrpcConstraint.Constraint__Output
  export type ConstraintInput = GrpcConstraint.Constraint
  export type ExactOutput = GrpcExact.Exact__Output
  export type ExactInput = GrpcExact.Exact
  export type QueryOutput = GrpcQuery.Query__Output
  export type QueryInput = GrpcQuery.Query
  export type QueryReplyOutput = GrpcQueryReply.QueryReply__Output
  export type QueryReplyInput = GrpcQueryReply.QueryReply
  export type QueryRequestOutput = GrpcQueryRequest.QueryRequest__Output
  export type QueryRequestInput = GrpcQueryRequest.QueryRequest
  export type RangeOutput = GrpcRange.Range__Output
  export type RangeInput = GrpcRange.Range
}

