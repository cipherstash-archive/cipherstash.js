import { createLogger, format, transports } from "winston";

export function isDebugLoggingEnabled() {
  return process.env["CS_DEBUG"] === "yes";
}

export const logger = createLogger({
  level: isDebugLoggingEnabled() ? "debug" : "error",
  format: format.simple(),
  transports: [new transports.Console()],
});
