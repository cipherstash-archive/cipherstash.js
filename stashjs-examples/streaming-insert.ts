import { Stash } from "@cipherstash/stashjs"
import { Movie, movieSchema } from "./example-schema"
import * as uuid from "uuid"
import * as faker from 'faker'

async function *fakeMovieGenerator(count: number): AsyncIterator<Movie> {
  for (let n = 0; n < count; n++) {
    yield {
      id: uuid.v4(),
      title: faker.lorem.words(4),
      year: faker.date.past(100).getFullYear(),
      runningTime: faker.datatype.number({min: 60, max: 180})
    }
  }
}

async function insertRecords() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const movies = await stash.loadCollection(movieSchema)
    console.log(`Collection "${movies.name}" loaded`)

    const count = 1000
    const result = await movies.putStream(fakeMovieGenerator(count))

    console.log(`Finished! ${JSON.stringify(result)}`)
    process.exit(0)
  } catch (err) {
    console.error(`Could not insert records into collection! Reason: ${JSON.stringify(err)}`)
    console.error(err)
    process.exit(1)
  }
}

insertRecords()