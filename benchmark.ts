import { Stash } from "@cipherstash/stashjs"
import { User } from "./user"
import * as uuid from "uuid"
import * as faker from "faker"
import { Timer } from "timer-node"

async function* fakeUserGenerator(count: number): AsyncIterator<User> {
  for (let n = 0; n < count; n++) {
    yield {
      id: uuid.v4(),
      title: faker.lorem.words(4),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      gender: faker.name.gender(),
      dob: faker.date.between('1970-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z'),
      createdAt: faker.date.between('2000-01-01T00:00:00.000Z', '2022-01-01T00:00:00.000Z')
    }
  }
}

async function insertRecords() {
  try {
    const stash = await Stash.connect()
    const users = await stash.loadCollection<User>("users")
    console.log(`Collection "${users.name}" loaded`)

    const count = 10000
    const timer = new Timer({ label: "test-timer" })
    timer.start()
    const result = await users.putStream(fakeUserGenerator(count))
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
