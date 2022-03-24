import { vol } from "memfs";

jest.mock("fs", () => require("memfs").fs);

afterEach(() => {
  vol.reset();
});
