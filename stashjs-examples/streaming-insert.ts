import { Stash } from "@cipherstash/stashjs"
import { Employee, employeeSchema } from "./example-schema"
import * as faker from 'faker'

function *recordGenerator(count: number): Iterator<Employee> {
  for (let n = 0; n < count; n++) {
    yield {
      name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      jobTitle: `Head of ${faker.commerce.department()}`,
      dateOfBirth: faker.date.past(),
      email: faker.internet.email(),
      grossSalary: BigInt(parseInt(faker.finance.amount(100000, 500000)))
    }
  }
}

async function insertRecords() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.loadCollection(employeeSchema)
    console.log(`Collection "${employees.name}" loaded`)

    const count = 1
    await employees.putStream(recordGenerator(count))

    console.log(`Inserted ${count} records`)
    process.exit(0)
  } catch (err) {
    console.error(`Could not insert records into collection! Reason: ${JSON.stringify(err)}`)
    console.error(err)
    process.exit(1)
  }
}

insertRecords()