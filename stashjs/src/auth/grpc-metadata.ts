import { Metadata } from "@grpc/grpc-js"

export function grpcMetadata(authToken: string): Metadata {
  const metaData = new Metadata()
  metaData.set('authorization', `Bearer ${authToken}`)
  return metaData
}