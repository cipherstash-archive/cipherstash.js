import { V1 } from "@cipherstash/stashjs-grpc";
import { Aggregate, QueryResult } from "../collection-internal";
import { CipherSuite } from "../crypto/cipher";
import { HasID, StashRecord } from "../dsl/mappings-dsl"
import { DecryptionFailure } from "../errors";
import { AsyncResult, Err, gatherAsync, Ok } from "../result"
import { durationSeconds } from "../utils"

export async function convertQueryReplyToQueryResult<R extends StashRecord & HasID>(
  cipher: CipherSuite,
  timerStart: bigint,
  reply: V1.Query.QueryReply
): AsyncResult<QueryResult<R & HasID>, DecryptionFailure> {
  const records = await gatherAsync(reply.result!.map(encryptedSource => cipher.decrypt<R>(encryptedSource)))
  if (records.ok) {
    return Ok({
      took: durationSeconds(timerStart, process.hrtime.bigint()),
      documents: records.value,
      aggregates: reply!.aggregates ? reply!.aggregates.map(agg => ({
        name: agg.name! as Aggregate,
        value: BigInt(agg.value!.toString())
      })) : []
    })
  } else {
    return Err(records.error)
  }
}
