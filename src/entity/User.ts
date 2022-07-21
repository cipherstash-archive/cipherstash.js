import { Entity, PrimaryGeneratedColumn, Column, ColumnOptions, BeforeUpdate, AfterUpdate } from "typeorm"

interface IndexOptions {
  kind?: string
}

interface CipherStashColumnOptions extends ColumnOptions {
  index?: IndexOptions
}

const CipherStashColumn = (options?: CipherStashColumnOptions) => {
  return Column({ index: {}, ...options })
}

@Entity()
export class User {

  @PrimaryGeneratedColumn()
  id: number

  @CipherStashColumn()
  firstName: string

  @Column()
  lastName: string

  @CipherStashColumn({type: "date" })
  dob: Date
}
