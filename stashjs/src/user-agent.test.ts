import * as typeScriptUtils from "./typescript";
import { getUserAgent } from "./user-agent";
import * as os from "os";

jest.mock("../package.json", () => ({
  name: "@cipherstash/stashjs",
  version: "1.0.0",
}));

describe("getUserAgent", () => {
  it("should return version, type and arch when typescript is enabled", () => {
    jest
      .spyOn(typeScriptUtils, "doesProjectUseTypeScript")
      .mockReturnValue(true);
    jest.spyOn(os, "arch").mockReturnValue("x64");
    jest.spyOn(os, "type").mockReturnValue("Linux");

    expect(getUserAgent()).toEqual("stashjs/1.0.0 (Linux x64; typescript)");
  });

  it("should return version, type and arch when typescript is disabled", () => {
    jest
      .spyOn(typeScriptUtils, "doesProjectUseTypeScript")
      .mockReturnValue(false);
    jest.spyOn(os, "arch").mockReturnValue("x64");
    jest.spyOn(os, "type").mockReturnValue("Linux");

    expect(getUserAgent()).toEqual("stashjs/1.0.0 (Linux x64; javascript)");
  });
});
