import * as gRPC from '@grpc/grpc-js'
import * as  protoLoader from '@grpc/proto-loader'

import * as ProtoGrpcType from './generated/api'
import * as API from './generated/stash/GRPC/V1/API'

import { CreateRequest  as CollectionCreateRequest } from './generated/stash/GRPC/V1/Collections/CreateRequest'
import { DeleteRequest as CollectionDeleteRequest } from './generated/stash/GRPC/V1/Collections/DeleteRequest'
import { InfoReply__Output as CollectionInfoReply } from './generated/stash/GRPC/V1/Collections/InfoReply'
import { InfoRequest as CollectionInfoRequest } from './generated/stash/GRPC/V1/Collections/InfoRequest'
import { ListRequest as CollectionListRequest } from './generated/stash/GRPC/V1/Collections/ListRequest'
import { ListReply__Output as CollectionListReply } from './generated/stash/GRPC/V1/Collections/ListReply'

import { Document as DocumentType } from './generated/stash/GRPC/V1/Documents/Document'
import { GetReply__Output as DocumentGetReply } from './generated/stash/GRPC/V1/Documents/GetReply'
import { GetRequest as DocumentGetRequest } from './generated/stash/GRPC/V1/Documents/GetRequest'
import { GetAllReply__Output as DocumentGetAllReply } from './generated/stash/GRPC/V1/Documents/GetAllReply'
import { GetAllRequest as DocumentGetAllRequest } from './generated/stash/GRPC/V1/Documents/GetAllRequest'
import { DeleteReply__Output as DocumentDeleteReply } from './generated/stash/GRPC/V1/Documents/DeleteReply'
import { DeleteRequest as DocumentDeleteRequest } from './generated/stash/GRPC/V1/Documents/DeleteRequest'
import { PutReply__Output as DocumentPutReply } from './generated/stash/GRPC/V1/Documents/PutReply'
import { PutRequest as DocumentPutRequest } from './generated/stash/GRPC/V1/Documents/PutRequest'
import { StreamingPutRequest as DocumentStreamingPutRequest } from './generated/stash/GRPC/V1/Documents/StreamingPutRequest'
import { StreamingPutBegin as DocumentStreamingPutBegin } from './generated/stash/GRPC/V1/Documents/StreamingPutBegin'
import { StreamingPutReply__Output as DocumentStreamingPutReply } from './generated/stash/GRPC/V1/Documents/StreamingPutReply'
import { Term as DocumentTerm } from './generated/stash/GRPC/V1/Documents/Term'
import { Vector as DocumentVector} from './generated/stash/GRPC/V1/Documents/Vector'

import { Aggregate as QueryAggregate } from './generated/stash/GRPC/V1/Queries/Aggregate'
import { Constraint as QueryConstraint } from './generated/stash/GRPC/V1/Queries/Constraint'
import { Exact as QueryExact } from './generated/stash/GRPC/V1/Queries/Exact'
import { Query as QueryQuery } from './generated/stash/GRPC/V1/Queries/Query'
import { QueryReply__Output as QueryQueryReply } from './generated/stash/GRPC/V1/Queries/QueryReply'
import { QueryRequest as QueryQueryRequest } from './generated/stash/GRPC/V1/Queries/QueryRequest'
import { Range as QueryRange } from './generated/stash/GRPC/V1/Queries/Range'
import { AggregateResult as QueryAggregateResult } from './generated/stash/GRPC/V1/Queries/AggregateResult'

import { Index__Output as IndexIndex } from './generated/stash/GRPC/V1/Indexes/Index'
import { Index as IndexNew } from './generated/stash/GRPC/V1/Indexes/Index'

import { protoDefsBuffer  } from './generated/stashjs-api-v1'

const grpcDefinition = protoLoader.loadFileDescriptorSetFromBuffer(
  protoDefsBuffer, {
    keepCase: true,
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
  }
)

const APIProto = (gRPC.loadPackageDefinition(grpcDefinition) as unknown as ProtoGrpcType.ProtoGrpcType).stash

export namespace V1  {
  export type ConnectOptions = {
    userAgent?: string
  }

  export const connect = function(host: string, port: number = 443, options: ConnectOptions) {
    // TODO: ensure that the SSL cert is verified
    return new APIProto.GRPC.V1.API(`${host}:${port}`, gRPC.credentials.createSsl(), {
      "grpc.secondary_user_agent": options?.userAgent
    })
  }

  export type APIClient = API.APIClient
  export type APIDefinition = API.APIDefinition

  export namespace Collection {
    export type CreateRequest = CollectionCreateRequest
    export type CreateReply = CollectionInfoReply
    export type DeleteRequest = CollectionDeleteRequest
    export type InfoReply = CollectionInfoReply
    export type InfoRequest = CollectionInfoRequest
    export type ListRequest = CollectionListRequest
    export type ListReply = CollectionListReply
  }

  export namespace Document {
    export type Document = DocumentType
    export type GetReply = DocumentGetReply
    export type GetRequest = DocumentGetRequest
    export type GetAllReply = DocumentGetAllReply
    export type GetAllRequest = DocumentGetAllRequest
    export type DeleteReply = DocumentDeleteReply
    export type DeleteRequest = DocumentDeleteRequest
    export type PutReply = DocumentPutReply
    export type PutRequest = DocumentPutRequest
    export type StreamingPutRequest = DocumentStreamingPutRequest
    export type StreamingPutBegin = DocumentStreamingPutBegin
    export type StreamingPutReply = DocumentStreamingPutReply
    export type Term = DocumentTerm
    export type Vector = DocumentVector
  }

  export namespace Query {
    export type Aggregate = QueryAggregate
    export type AggregateResult = QueryAggregateResult
    export type Constraint = QueryConstraint
    export type Exact = QueryExact
    export type Query = QueryQuery
    export type QueryReply = QueryQueryReply
    export type QueryRequest = QueryQueryRequest
    export type Range = QueryRange
  }

  export namespace Index {
    export type IndexOutput = IndexIndex
    export type Index = IndexNew
  }
}


