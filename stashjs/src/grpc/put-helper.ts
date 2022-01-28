import { V1 } from "@cipherstash/stashjs-grpc";
import { AnalyzedRecord } from "../analyzer";
import { oreEncryptTermToBuffer } from "../crypto/ore";
import { StashRecord, Mappings, MappingsMeta } from "../dsl/mappings-dsl";
import { idToBuffer } from "../utils"

export function convertAnalyzedRecordToVectors<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  analyzedRecord: AnalyzedRecord<R, M, MM>,
  meta: MM
): V1.Document.Vector[] {
  return Object.entries(analyzedRecord.indexEntries).map(
    ([indexId, terms]) => {
      const idxMeta = findByIndexId(meta, indexId)!
      return {
        indexId: idToBuffer(indexId),
        terms: terms.map((term) => {
          return {
            term: oreEncryptTermToBuffer(term, idxMeta.$prfKey, idxMeta.$prpKey),
            link: idToBuffer(analyzedRecord.recordId!),
          }
        })
      }
    }
  )
}

function findByIndexId<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(meta: MM, indexId: string) {
  const [_, entry] = Object.entries(meta).find(([_indexName, { $indexId }]) => indexId == $indexId)!
  return entry
}

