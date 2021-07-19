import { V1 } from "@cipherstash/stashjs-grpc";
import { CipherSuite } from "../crypto/cipher";
import { StashRecord } from "../dsl/mappings-dsl"

export async function convertGetReplyToUserRecord<
  R extends StashRecord
>(
  output: V1.GetReplyOutput,
  cipherSuite: CipherSuite
): Promise<R | null> {
  if (output.source!.source!) {
    return await cipherSuite.decrypt(output.source!.source!)
  } else {
    return null
  }
}
