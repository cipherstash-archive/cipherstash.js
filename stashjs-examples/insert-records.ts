import { Stash } from "@cipherstash/stashjs"
import { employeeSchema } from "./example-schema"

async function insertRecords() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const employees = await stash.loadCollection(employeeSchema)
    console.log(`Collection "${employees.name}" loaded`)

    await employees.put({
      name: "Ada Lovelace",
      jobTitle: "Chief Executive Officer (CEO)",
      dateOfBirth: new Date(1852, 11, 27), 
      email: "ada@security4u.example",
      grossSalary: 250000n
    })

    await employees.put({
      name: "Grace Hopper",
      jobTitle: "Chief Science Officer (CSO)",
      dateOfBirth: new Date(1906, 12, 9),
      email: "grace@security4u.example",
      grossSalary: 250000n
    })

    await employees.put({
      name: "Joan Clark",
      jobTitle: "Chief Information Security Officer (CISO)",
      dateOfBirth: new Date(1917, 6, 24),
      email: "joan@security4u.example",
      grossSalary: 250000n
    })

    console.log("Inserted 3 records")
  } catch (err) {
    console.error(`Could not insert records into collection! Reason: ${JSON.stringify(err)}`)
  }
}

insertRecords()