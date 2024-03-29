# @cipherstash/stash-rs

This project includes Node bindings for [ore.rs](https://github.com/cipherstash/ore.rs) and [cipherstash-client](https://github.com/cipherstash/cipherstash-rs).

This project was bootstrapped by [create-neon](https://www.npmjs.com/package/create-neon).

## Installing stash-rs

Installing stash-rs requires a [supported version of Node and Rust](https://github.com/neon-bindings/neon#platform-support).

You can install the project with npm. In the project directory, run:

```sh
$ npm install
```

This fully installs the project, including installing any dependencies and running the build.

## Building stash-rs

If you have already installed the project and only want to run the build, run:

```sh
$ npm run build
```

This command performs 2 steps:

1. It uses the [cargo-cp-artifact](https://github.com/neon-bindings/cargo-cp-artifact) utility to run the Rust build and copy the built library into `./index.node`.
2. It compiles the TypeScript code (in `src/index.ts`) with the output being stored in `dist`

## Exploring stash-rs

After building stash-rs, you can explore its exports at the TS Node REPL.

```sh
$ npm install
$ npx ts-node
> import { ORE } from '@cipherstash/stash-rs'
> let k1 = Buffer.from("1216a6700004fe46c5c07166025e681e", "hex")
> let k2 = Buffer.from("3f13a569d5d2c6ce8d2a85cb9e347804", "hex")
> let cipher = new ORE(k1, k2)
> let cipher = ORE.init(k1, k2)
> cipher.encrypt(ORE.encodeNumber(100))
```

## ORE

### Comparison

To compare two encrypted ciphertext values, you can use the `ORE.compare` function which returns -1, 0 or 1 if the first
operand is less-than, equal-to or greater than the second operand respectively.

Internally, this uses [cmp](https://doc.rust-lang.org/nightly/core/cmp/trait.Ord.html#tymethod.cmp).

```typescript
let a = ore.encrypt(ORE.encodeNumber(100))
let b = ore.encrypt(ORE.encodeNumber(1560))
ORE.compare(a, b) // => -1
```

### Data Types

`ORE` can encrypt the following types:

#### Number

JavaScript numbers are 64-bit floats which the underlying ORE library converts into an order-preserving integer. The
underlying value no longer represents the source number (unlike `f64::from(i)`) but guarantees ordering is preserved.

```typescript
// All valid
cipher.encrypt(ORE.encodeNumber(456))
cipher.encrypt(ORE.encodeNumber(3.14159))
cipher.encrypt(ORE.encodeNumber(-100))
```

#### String

`ORE.encodeString` performs unicode normalisation (NFC) on the input string, then hashes the result using siphash.
The resulting number can be encrypted. However, because strings are hashed only equality comparisons make sense.

```typescript
let s1 = cipher.encrypt(ORE.encodeString("Hello from CipherStash!")) // OK
let s2 = cipher.encrypt(ORE.encodeString("Hello from CipherStash!")) // OK
ORE.compare(s1, s2) // => 0
```

## RecordIndexer

The record indexer can perform a variety of ORE operations on JavaScript objects based on a [specified schema](https://docs.cipherstash.com/reference/schema-definition.html).
The "terms" returned by the indexer can be used to create a searchable encrypted database index like [CipherStash](https://cipherstash.com).

### Encrypt

```typescript
const indexer = RecordIndexer.init({
  type: {
    title: "string",
    runningTime: "uint64"
  },
  indexes: {
    exactTitle: {
      mapping: { kind: "exact", field: "title" },
      index_id: makeId(),
      prf_key: <Buffer ..>
      prp_key: <Buffer ..>
    },
    title: {
      mapping: {
        kind: "match",
        fields: ["title"],
        tokenFilters: [{ kind: "downcase" }],
        tokenizer: { kind: "ngram", tokenLength: 3 }
      },
      index_id: makeId(),
      prf_key: <Buffer ..>
      prp_key: <Buffer ..>
    }
  }
})

// The returned terms contain the ORE ciphertext for the "match" and "exact" indexes defined
// in the schema.
const terms = indexer.encrypt({
  id: makeId(),
  title: "Great movie!",
  runningTime: 120
})
```

## Available Scripts

In the project directory, you can run:

### `npm install`

Installs the project, including running `npm run build`.

### `npm build`

Builds the Node addon (`index.node`) from source and compiles the TypeScript wrapper files.

Additional [`cargo build`](https://doc.rust-lang.org/cargo/commands/cargo-build.html) arguments may be passed to `npm build` and `npm build-*` commands. For example, to enable a [cargo feature](https://doc.rust-lang.org/cargo/reference/features.html):

```
npm run build -- --feature=beetle
```

#### `npm build-debug`

Alias for `npm build`.

#### `npm build-release`

Same as [`npm build`](#npm-build) but, builds the module with the [`release`](https://doc.rust-lang.org/cargo/reference/profiles.html#release) profile. Release builds will compile slower, but run faster.

### `npm test`

Runs the unit tests in Rust by calling `cargo test` and in TypeScript (Jest) by calling `npx jest`.

## Project Layout

The directory structure of this project is:

```
node-stash-rs/
├── Cargo.toml
├── README.md
├── index.node
├── package.json
├── native/
|   └── lib.rs
├── src/
|   └── index.ts
|   └── index.test.ts
└── target/
```

### Cargo.toml

The Cargo [manifest file](https://doc.rust-lang.org/cargo/reference/manifest.html), which informs the `cargo` command.

### README.md

This file.

### index.node

The Node addon—i.e., a binary Node module—generated by building the project. This is the main module for this package, as dictated by the `"main"` key in `package.json`.

Under the hood, a [Node addon](https://nodejs.org/api/addons.html) is a [dynamically-linked shared object](<https://en.wikipedia.org/wiki/Library_(computing)#Shared_libraries>). The `"build"` script produces this file by copying it from within the `target/` directory, which is where the Rust build produces the shared object.

### package.json

The npm [manifest file](https://docs.npmjs.com/cli/v7/configuring-npm/package-json), which informs the `npm` command.

### native/

The directory tree containing the Rust source code for the project.

### native/lib.rs

The Rust library's main module.

### src/

TypeScript wrapper files - clients call this code rather than calling the functions in `index.node` directly.

### target/

Binary artifacts generated by the Rust build.

## Learn More

To learn more about Neon, see the [Neon documentation](https://neon-bindings.com).

To learn more about Rust, see the [Rust documentation](https://www.rust-lang.org).

To learn more about Node, see the [Node documentation](https://nodejs.org).
