# ☕ {Java,Type}Script clients

## Developing

Change into `clients/@cipherstash` and run:

``` bash
# Install system level dependencies
./build.sh setup

# Build all the components
./build.sh build
```

This will get you to a state that you can start developing individual components.

## How these projects interrelate

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
| @cipherstash/stashjs-grpc |   |  @cipherstash/ore-rs  |
-----------------------------   -------------------------
```
