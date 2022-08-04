# Stash.js TypeORM

This package is a [TypeORM](https://typeorm.io/)-specific package for using CipherStash in your app.

It allows you to add Queryable and Application-level Encryption (QuALE) to your TypeORM entities,
adds extensions to perform encrypted queries and manages indexing and collecion creation.

## Getting Started

To get started, add the package to your app:

```
npm install @cipherstash/stashjs-typeorm --save
```

You can use Decorators to protect the fields in an Entity with encryption.

The `EncryptedColumn` decorator will encrypt the target field
before saving and decrypt when loading.

For example, to encrypt the `firstName` and `lastName` fields:

```typescript
import { EncryptedColumn } from "@cipherstash/stashjs-typeorm"

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @EncryptedColumn({ key })
  firstName: string

  @EncryptedColumn({ key })
  lastName: string
}
```

The `@EncryptedColumn` decorator wraps `@Column` so you can pass the same options there.

For example:

```typescript
@EncryptedColumn({ nullable: false })
email: string
```

## Adding Query Capabilities to Encrypted Fields

Standard encryption is not searchable.
`@EncryptedColumn` uses AES-256-GCM with a random IV to protect the data which is
excellent for security but makes normal queries impossible.

To address that, we are going to use the `@Queryable()` decorator:

```typescript
import { EncryptedColumn, Queryable } from "@cipherstash/stashjs-typeorm"

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Queryable()
  @EncryptedColumn({ key })
  firstName: string

  @Queryable()
  @EncryptedColumn({ key })
  lastName: string
}
```

`@Queryable` annotates the entity to tell CipherStash which indexes to create.
When a field is saved it is broken down into a _term vector_ based on the indexes.
These terms are encrypted using queryable encryption and indexed into a CipherStash collection.

Before we can query anything, we need to create a CipherStash collection and index our data.
We can do that via a TypeORM `Repository` that has been extended for use with CipherStash.

You will need a [CipherStash Workspace](https://docs.cipherstash.com/tutorials/getting-started/index.html)
for this to work.

```typescript
import { wrapRepo } from "@cipherstash/stashjs-typeorm"

// Create a CipherStash collection for the User entity
const userRepo = wrapRepo(AppDataSource.getRepository(User))
await userRepo.createCollection()
```

To index all of your data you can use the `reindex` function on the `userRepo`
(assuming you called `wrapRepo`).

```typescript
await userRepo.reindex()
```

Now we can query our data! We'll use the wrapped Repo again.

```typescript
# Get a CipherStash enabled query builder
const builder = userRepo.createCSQueryBuilder("user")

// Query by last name (exact)
await builder
  .query(q => q.lastName.eq("Draper"))
  .getMany()

// Partial match
await builder
  .query(q => q.lastName_match.match("Drap"))
  .getMany()

// Range Query
await builder
  .query(q => q.dob.gte(new Date(1999, 1, 1)))
  .getMany()
```

`createCSQueryBuilder` returns an object that extends on TypeORM's standard query builder
so you can use it in the same way (and for basic things this will just work).

```
// Order by firstName
await builder
  .order("user.firstName") // Uses an encrypted index for ordering
  .getMany()
```

More complex queries can be achieved by combining calls to the query function
and by chaining methods on the builder.

For example, to find all users with last name matching the partial query "smi",
ordered by firstName, selecting only firstName and lastName, with limit and offset applied:

```typescript
await builder
  .query(q => q.lastName_match.match("smi"))
  .order("user.firstName")
  .select(["user.firstName", "user.lastName"])
  .limit(10)
  .offset(20)
  .getMany()
```

## Keeping Indexes in Sync

TypeORM can (and probably should!) be configured to keep indexes
in sync with your database.
That's achieved using a Subscriber called `IndexingSubscriber`,

Add `IndexingSubcriber` to the subscribers list in your data-source
and every time a record is created, updated, deleted or recovered it will
be indexed (or deindexed) into CipherStash.

```typescript
import { IndexingSubscriber } from "@cipherstash/stashjs-typeorm"

export const AppDataSource = new DataSource({
  type: "postgres",
  entities: [User],
  ...
  subscribers: [IndexingSubscriber],
})
```

## Key Management

Encryption is only as secure as the key used.
While there are many ways to keep keys secure, one good way is to store your
encryption key in an environment variable.

```typescript
// Entity

import { key } from "./config"

@Entity()
export class User {
  @Queryable()
  @ProtectedColumn({ key })
  firstName: string

  //...
}
```

And the config:

```typescript
export const key = process.env["ENCRYPTION_KEY"]
```

## TODO

- Migrating data
- Non string types
- JS version of getting started in the docs
