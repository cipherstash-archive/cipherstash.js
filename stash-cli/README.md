# 🧺 stash-cli, the CipherStash CLI

stash-cli is a CLI for working with CipherStash.

It's the easiest way to start inserting and querying records in CipherStash.

It also can be used to do CRUD on collections.

## 🏃 Quickstart

Once you have the necessary system-level dependencies installed, you can get going with:

``` bash
# Install stash-cli
npm install -g @cipherstash/stash-cli

# Log stash-cli in
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

Ensure you have Node.js (>= 16.x.x) and pnpm (>= 6.26.0) installed, and run:

``` bash
# Install (dev) dependencies
pnpm install

# Build the package
pnpm build
```
