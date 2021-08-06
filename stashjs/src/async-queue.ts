import { EventEmitter } from "events"

/**
 * An asynchronous queue.
 *
 * The consuming end uses this as an AsyncIterator from which items can be read.
 *
 * The producing end puts new items onto the end of the queue via `push`. If the
 * pushed value is `undefined` then that will mark the iteration as done and
 * iteration will provide no more items once the internal buffer has been
 * entirely consumed.
 *
 * The reason for the existence of this class is because of a limitation with
 * generator functions: it is not possible to `yield` from a closure contained
 * in a generator function which makes it really hard to express a
 * producer-consumer scenario where the production and consumption can happen at
 * their own pace.
 */
export class AsyncQueue<T> implements AsyncIterator<T, T | undefined> {

  private items: Array<Item<T>> = []
  private events: EventEmitter = new EventEmitter()

  /**
   * Required AsyncIterator method. See NodeJS docs.
   *
   * @inheritdoc
   */
  public async next(): Promise<IteratorResult<T>> {
    while (true) {
      if (this.items.length > 0) {
        const frontItem = this.items[0]!
        this.items = this.items.slice(1)
        const done = (frontItem as any).done && true
        if (done) {
          this.events.emit('drained')
        }
        return {
          done,
          value: (frontItem as any).item
        }
      } else {
        await this.waitForMore()
      }
    }
  }

  /**
   * Push an item onto the end of the queue.
   *
   * @param item the item to add to the end of the queue, or `undefined` to
   * signal that there are no more items.
   */
  public push(item: T): void {
    if (this.items.length > 0 && (this.items[this.items.length - 1] as any).done) {
      throw new Error("Illegal attempt to push item onto AsyncQueue that has been marked as finished")
    }

    this.items.push({ item })
    this.events.emit('push')
  }

  public end(): void {
    if (this.items.length > 0 && (this.items[this.items.length - 1] as any).done) {
      return
    }

    this.items.push({ done: true })
    this.events.emit('push')
  }

  private waitForMore(): Promise<void> {
    return new Promise((resolve) => {
      this.events.once('push', resolve)
    })
  }

  public once(event: 'drained', callback: () => void): void {
    this.events.once(event, callback)
  }
}

type Item<T> =
  | { item: T }
  | { done: true }