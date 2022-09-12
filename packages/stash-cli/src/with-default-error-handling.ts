import { Toolbox } from "@cipherstash/gluegun/build/types/domain/toolbox"
import { describeError } from "@cipherstash/stashjs"

export function withDefaultErrorHandling(callback: (toolbox: Toolbox) => Promise<void>) {
  return async (toolbox: Toolbox) => {
    try {
      await callback(toolbox)
    } catch (error) {
      toolbox.print.error(describeError(error))
    }
  }
}
