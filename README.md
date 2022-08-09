# ☕ {Java,Type}Script clients for CipherStash

This project contains the JavaScript/TypeScript clients for [CipherStash](https://cipherstash.com). The clients are used for adding CipherStash’s queryable encryption into your backend node applications. Documentation is available at [docs.cipherstash.com](https://docs.cipherstash.com).

## Package list

Clients

- `stash-cli` - a CLI for working with CipherStash. [readme](./packages/stash-cli/README.md) | [source](./packages/stash-cli)
- `stashjs` - a low level client for working with CipherStash. [readme](./packages/stashjs/README.md) | [source](./packages/stashjs)
- `stashjs-typeorm` - a package for integrating [TypeORM](https://typeorm.io/) models with CipherStash. [readme](./packages/stashjs-typeorm/README.md) | [source](./packages/stashjs-typeorm)
- `stashjs-adapter` - an adapter class to simplify migrating types from existing databases (such as Prisma) to a CipherStash collection. [readme](./packages/stashjs-adapter/README.md) | [source](./packages/stashjs-adapter)

Core libraries

- `stashjs-grpc` - node bindings to the CipherStash grpc endpoint
- `stash-rs` - node bindings to the CipherStash [ore.rs](https://github.com/cipherstash/ore.rs) and [cipherstash-client](https://github.com/cipherstash/cipherstash-rs) rust libraries.

Utilities

- `stash-typedoc` - typedoc generation

## Developing

From the root directory of this repo, run:

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
