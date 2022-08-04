import { vol } from "memfs";

Error.stackTraceLimit = 1024;

jest.mock("fs", () => require("memfs").fs);

afterEach(() => {
  vol.reset();
});
