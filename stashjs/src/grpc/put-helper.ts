import { V1 } from "@cipherstash/stashjs-grpc";
import { AnalyzedRecord } from "../analyzer";
import { oreEncryptTermToBuffer } from "../crypto/ore";
import { StashRecord, Mappings, MappingsMeta } from "../dsl/mappings-dsl";

export function convertAnalyzedRecordToVectors<
  R extends StashRecord,
  M extends Mappings<R>,
  MM extends MappingsMeta<M>
>(
  analyzedRecord: AnalyzedRecord<R, M, MM>,
  meta: MM
): V1.VectorInput[] {
  return Object.entries(analyzedRecord.indexEntries).map(
    ([indexId, terms]) => {
      const idxMeta = findByIndexId(meta, indexId)!
      return {
        indexId: Buffer.from(indexId, 'hex'),
        terms: terms.map((term) => {
          return {
            term: oreEncryptTermToBuffer(term, idxMeta.$prf, idxMeta.$prp),
            link: analyzedRecord.recordId
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

