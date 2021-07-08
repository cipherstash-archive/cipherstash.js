import { V1 } from "@cipherstash/stashjs-grpc";
import { CipherSuite } from "../crypto/cipher";
import { StashRecord } from "../dsl/mappings-dsl"

export async function convertQueryReplyToUserRecords<
  R extends StashRecord
>(
  output: V1.QueryReplyOutput,
  cipherSuite: CipherSuite
): Promise<Array<R>> {
  return await Promise.all(output.result!.map(async encryptedSource =>
    await cipherSuite.decrypt(encryptedSource)
  )) as unknown as Array<R>
}