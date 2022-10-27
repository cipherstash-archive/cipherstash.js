import { vol } from "memfs"
import "@cipherstash/stash-rs"

// Since stash-rs needs to use the filesytem to load the wasm module it needs to be loaded before this mock is set.
// To prevent this mock from getting hoisted use eval
eval('jest.mock("fs", () => require("memfs").fs)')

Error.stackTraceLimit = 1024

afterEach(() => {
  vol.reset()
})
