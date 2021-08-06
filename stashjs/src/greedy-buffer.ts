
  export async function *greedyBuffer<T>(buffSize: number, source: AsyncIterator<T>): AsyncIterator<T> {
    let buff: Array<T> = []
    let done = false
    while (!done) {
      done = await fillBuffer(buff, buffSize, source)
      yield* buff
      buff = []
    }
  }

  async function fillBuffer<T>(buff: Array<T>, items: number, from: AsyncIterator<T>): Promise<boolean> {
    while (buff.length < items) {
      const item = await from.next()
      if (!item.done) {
        buff.push(item.value)
      } else {
        return true
      }
    }
    return false
  }