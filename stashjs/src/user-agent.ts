import { arch, type } from "os";
import { doesProjectUseTypeScript } from "./typescript";

const stashVersion = require(__dirname + "/../package.json").version;

export function getUserAgent(): string {
  return `stashjs/${stashVersion} (${type()} ${arch()}; ${
    doesProjectUseTypeScript() ? "typescript" : "javascript"
  })`;
}
