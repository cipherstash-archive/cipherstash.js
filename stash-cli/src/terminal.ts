export function isInteractive(): boolean {
  return process.env["SSH_CLIENT"] !== undefined || process.env["SSH_TTY"] !== undefined
}
