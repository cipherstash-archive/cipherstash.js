# ☕ JavaScript & TypeScript clients for [CipherStash](https://cipherstash.com)

![Discourse status](https://img.shields.io/discourse/status?server=https%3A%2F%2Fdiscuss.cipherstash.com%2F&style=flat-square&color=%232dd9ff)
![Twitter Follow](https://img.shields.io/twitter/follow/cipherstash?color=%23ad3eff&style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cipherstash/cipherstash.js/Test%20PR%20%E2%80%94%20pnpm%20packages?style=flat-square)

This project contains the JavaScript/TypeScript clients for [CipherStash](https://cipherstash.com).
The clients are used for adding CipherStash’s Queryable Application Level Encryption (QuALE) into your backend node applications.

## Documentation

* [All Usage Documentation](https://docs.cipherstash.com)
* [API Docs](https://docs.cipherstash.com/tsdoc)

## Package list

### Clients

| Name | Docs | NPM | Description |
|----------------------------------------------------------|--------------------------------|---------|------------|
| [Stash&nbsp;CLI](./packages/stash-cli)                   | [Usage](https://docs.cipherstash.com/reference/stash-cli/index.html) | [![npm](https://img.shields.io/npm/v/@cipherstash/stash-cli?style=flat-square)](https://www.npmjs.com/package/@cipherstash/stash-cli) | A CLI for working with CipherStash |
| [Stash.js](./packages/stashjs)                           | [Usage](https://docs.cipherstash.com/reference/stashjs/index.html),&nbsp;[TS&nbsp;Doc](https://docs.cipherstash.com/tsdoc/modules/_cipherstash_stashjs.html),&nbsp;[Examples](https://github.com/cipherstash/stashjs-examples)         | [![npm](https://img.shields.io/npm/v/@cipherstash/stash-cli?style=flat-square)](https://www.npmjs.com/package/@cipherstash/stashjs) | Low level TypeScript/JavaScript client for working with CipherStash |
| [Stash.js&nbsp;TypeORM](./packages/stashjs-typeorm)      | [TS Doc](https://docs.cipherstash.com/tsdoc/modules/_cipherstash_stashjs_typeorm.html)    | [![npm](https://img.shields.io/npm/v/@cipherstash/stashjs-typeorm?style=flat-square)](https://www.npmjs.com/package/@cipherstash/stashjs-typeorm) |  Integrate [TypeORM](https://typeorm.io/) with CipherStash |
| [Stash.js&nbsp;Adapter](./packages/stashjs-adapter)      |                                                                                | [![npm](https://img.shields.io/npm/v/@cipherstash/stashjs-adapter?style=flat-square)](https://www.npmjs.com/package/@cipherstash/stashjs-adapter) | Migrate types from existing databases (such as Prisma) to a CipherStash collection |


### Low-level libraries

You probably won't need to use these directly but we'll list them here just in case.

* [Stash.js gRPC](./packages/stashjs-grpc): Node bindings to the CipherStash gRPC endpoint
* [StashRS](./packages/stash-rs): Node bindings to the CipherStash [ore.rs](https://github.com/cipherstash/ore.rs) and [cipherstash-client](https://github.com/cipherstash/cipherstash-rs) Rust libraries

### Utilities:

* [Stash&nbsp;TypeDoc](./packages/stash-typedoc): Typedoc generation

## Need help?

Head over to our [support forum](https://discuss.cipherstash.com/), and we'll get back to you super quick! 

## Developing

From the root of this repo, run:

```bash
# Install system level dependencies
./build.sh setup

# Build all the components
./build.sh build
```

This will get you to a state that you can start developing individual components.

## How these packages interrelate

This is the dependency graph

```
                ----------------------------
                |  @cipherstash/stash-cli  |
                ----------------------------
                            |
                        depends on
                            |
                 --------------------------
                 |  @cipherstash/stashjs  |
                 --------------------------
                            |
                        depends on
                            |
                -------------------------
                |                       |
-----------------------------   -------------------------
| @cipherstash/stashjs-grpc |   |  @cipherstash/stash-rs  |
-----------------------------   -------------------------
```
