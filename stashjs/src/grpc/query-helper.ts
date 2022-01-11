import { V1 } from "@cipherstash/stashjs-grpc";
import { CipherSuite } from "../crypto/cipher";
import { StashRecord } from "../dsl/mappings-dsl"

export const convertQueryReplyToUserRecords =
  (cipher: CipherSuite) =>
    <R extends StashRecord>(reply: V1.Query.QueryReply) =>
      Promise.all(reply.result!.map(encryptedSource =>
        cipher.decrypt(encryptedSource)
      )) as unknown as Array<R>