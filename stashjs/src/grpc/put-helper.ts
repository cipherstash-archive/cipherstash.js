import { V1 } from "@cipherstash/stashjs-grpc";
import { AnalyzedRecord } from "../analyzer";
import { StashRecord, Mappings, MappingsMeta } from "../dsl/mappings-dsl";
import { normalizeId } from "../utils"

export function convertAnalyzedRecordToVectors<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  analyzedRecord: AnalyzedRecord<R, M, MM>,
): V1.Document.Vector[] {
  return Object.entries(analyzedRecord.indexEntries).map(
    ([indexId, terms]) => {
      return {
        indexId: normalizeId(indexId),
        terms: terms.map((term) => {
          return {
            term,
            link: normalizeId(analyzedRecord.recordId!),
          }
        })
      }
    }
  )
}