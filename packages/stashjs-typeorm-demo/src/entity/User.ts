import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"
import { EncryptedColumn, Queryable } from "@cipherstash/stashjs-typeorm"

import { key } from "../config"

@Entity({ name: "node_users" })
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Queryable()
  @EncryptedColumn({ key })
  firstName: string

  @Queryable()
  @EncryptedColumn({ key })
  lastName: string

  // Dates must be treated as timestamps in TypeORM 
  // See this issue: https://github.com/typeorm/typeorm/issues/2176
  @Queryable()
  @Column({type: "timestamp"})
  dob: Date

  // Could this be added with a class decorator
  @Column({ nullable: true })
  stashId: string
}