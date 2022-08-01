import { Column, ColumnOptions } from "typeorm"

export interface IndexOptions {
  kind?: string
}

export interface ProtectedColumnOptions extends ColumnOptions {
  index?: IndexOptions
}

export const ProtectedColumn = (options?: ProtectedColumnOptions) => {
  return Column({ index: {}, ...options })
}

// TODO: ProtectedColumn or EncryptedColumn probably has to wrap the Type ORM Column decorator
// But we could probably add a @Queryable decorator that sets the CipherStash meta data
// The encrypted column can wrap typeorm-encrypted with specific settings applied to the transformer
// such as the use of aes-gcm

export const Queryable = (): PropertyDecorator => {
  return (target: Object, propertyKey: string): void => {
    ConfigurationMetadata.addSearchableColumn(target.constructor, propertyKey)
  }
}

class ConfigurationMetadataSingleton {
  private data: Array<any>

  constructor() {
    this.data = []
  }

  addSearchableColumn(target: Function, propertyKey: string) {
    this.data.push({
      target,
      propertyKey,
    })
  }

  searchableColumnsFor(candidate: Function): Array<string> {
    return this.data.flatMap(({ target, propertyKey }) => (target == candidate ? [propertyKey] : []))
  }
}

export const ConfigurationMetadata = new ConfigurationMetadataSingleton()
