# 🪄 stash-cli, the CipherStash CLI

stash-cli is a CLI for working with CipherStash.

It's the easiest way to start inserting and querying records in CipherStash.

It also can be used to do CRUD on collections.

## 🏃 Quickstart

Once you have the necessary system-level dependencies installed, you can get going with:

```bash
# Install stash-cli
npm install -g @cipherstash/stash-cli

# Get an access token for your workspace
# Set up a workspace by following https://docs.cipherstash.com/tutorials/getting-started/index.html
stash login --workspace $WORKSPACE_ID

# Show all collections
stash list-collections

# Query data
stash query --collection movies --where 'year >= :year' --var year=1995
```

## Using

If this is your first time working with stash-cli, check out [the getting started guide](https://docs.cipherstash.com/tutorials/getting-started/index.html).

If you have used stash-cli before, check out [the reference documentation](https://docs.cipherstash.com/reference/stash-cli/index.html) for details on each subcommand.

## Developing

Ensure you have these dependencies installed:

- Node.js >= 16.x.x
- pnpm >= 6.26.0
- Rust >= 1.56.1

One of the easiest ways to do this [is with asdf](http://asdf-vm.com/guide/getting-started.html), and a `.tool-versions` that looks like this:

```
nodejs 16.14.0
pnpm 6.26.0
rust 1.56.1
```

Then run:

```bash
# Install (dev) dependencies
pnpm install

# Build the package
pnpm build
```
