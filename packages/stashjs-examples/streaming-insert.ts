import { Stash } from "@cipherstash/stashjs"
import { Movie } from "./movie"
import * as uuid from "uuid"
import * as faker from "faker"
import { Timer } from "timer-node"

async function* fakeMovieGenerator(count: number): AsyncIterator<Movie> {
  for (let n = 0; n < count; n++) {
    yield {
      id: uuid.v4(),
      title: faker.lorem.words(4),
      year: faker.date.past(100).getFullYear(),
      runningTime: faker.datatype.number({ min: 60, max: 180 }),
    }
  }
}

async function insertRecords() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.loadCollection<Movie>("movies")
    console.log(`Collection "${movies.name}" loaded`)

    const count = 10000
    const timer = new Timer({ label: "test-timer" })
    timer.start()
    const result = await movies.putStream(fakeMovieGenerator(count))
    timer.stop()

    console.log(`Finished! ${JSON.stringify(result)}`)
    console.log(`Time taken: ${JSON.stringify(timer.time())}`)
    process.exit(0)
  } catch (err) {
    console.error(
      `Could not insert records into collection! Reason: ${JSON.stringify(err)}`
    )
    console.error(err)
    process.exit(1)
  }
}

insertRecords()
