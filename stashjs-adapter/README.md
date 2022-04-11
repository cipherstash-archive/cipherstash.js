# Stash.js Adapter

This package provides an adapter class to simplify migrating types from existing databases (such as Prisma) to a
[CipherStash](https://cipherstash.com) collection.

For new applications we recommend using [Stash.js](https://www.npmjs.com/package/@cipherstash/stashjs) which this
library uses under the hood anyway.

The main component of this package is the `CollectionAPI<T>` class which takes a type with a numeric id (`{id: number}`)
and maps it to a CipherStash (which uses UUID) for IDs. `CollectionAPI<T>` exposes a simple API as described below. It
does not attempt to mirror existing ORM interfaces like Prisma (though it may offer than in the future).

The primary goals of this module are:

* To abstract the mapping of numeric to "secure" IDs
* To provide an API to CipherStash that uses an existing type

## Usage

First create a module to represent a model (say User) in CipherStash.

```ts title="user-vault.ts"
// -- user-vault.ts ==
// Existing User type
import { User } from '@prisma/client'
import CollectionAPI from '@cipherstash/stashjs-adapter'

const ID_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341'

export const UserVault = new CollectionAPI<User>("users", ID_NAMESPACE)
```

Then use in other parts of your application. For example, in an API:

```ts
import type { NextApiRequest, NextApiResponse } from "next"
import UserVault from "user-vault"

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<any>
) {
  
  const users = await UserVault.list()
  res.status(200).json(users)
}
```
