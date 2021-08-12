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

export async function convertGetAllReplyToUserRecords<
  R extends StashRecord
>(
  output: V1.GetAllReplyOutput,
  cipherSuite: CipherSuite
): Promise<Array<R>> {
  // TODO: Can we decrypt all in one hit with the SDK?
  return await Promise.all(output.documents!.map((doc) =>
    cipherSuite.decrypt(doc.source)
  )) as unknown as Array<R>
}
