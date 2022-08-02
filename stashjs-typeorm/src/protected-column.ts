import { Column, ColumnOptions } from "typeorm"
import { EncryptionTransformer } from "typeorm-encrypted"

export interface IndexOptions {
  kind?: string
}

export interface ProtectedColumnOptions extends ColumnOptions {
  index?: IndexOptions
  key: string
}

export const ProtectedColumn = (options: ProtectedColumnOptions) => {
  return Column({
    index: {},
    transformer: new EncryptionTransformer({
      key: options.key,
      algorithm: "aes-256-gcm",
      ivLength: 16,
    }),
    ...options,
  })
}

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
