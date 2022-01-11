import { V1 } from "@cipherstash/stashjs-grpc"
import { CipherSuite } from "../crypto/cipher"
import { StashRecord } from "../dsl/mappings-dsl"
import { DecryptionFailure } from "../errors"
import { AsyncResult, gather } from "../result"

export const convertGetReplyToUserRecord =
  (cipher: CipherSuite) =>
    <R extends StashRecord>(reply: V1.Document.GetReply): AsyncResult<R, DecryptionFailure> =>
      cipher.decrypt(reply.source!.source!)


export const convertGetAllReplyToUserRecords =
  (cipher: CipherSuite) =>
    async <R extends StashRecord>(reply: V1.Document.GetAllReply) =>
      gather(
        await Promise.all(
          reply.documents!.map(doc => cipher.decrypt<R>(doc.source!))
        )
      )