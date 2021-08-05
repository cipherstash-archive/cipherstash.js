import { Stash } from "@cipherstash/stashjs"
import { movieSchema } from "./example-schema"
import parse from 'csv-parse'
import fs from 'fs'

async function insertRecords() {
  try {
    const stash = await Stash.connect(Stash.loadConfigFromEnv())
    const movies = await stash.loadCollection(movieSchema)
    console.log(`Collection "${movies.name}" loaded`)

    const data = fs.readFileSync('titles.tsv', 'utf8')
    console.log(data)

    parse(data, {
      delimiter: "\t"
    }, function(_err, records) {
      records.forEach((movie: Array<string>) => {
        console.log(movie[2])
        movies.put({
          title: movie[2]!,
          year: parseInt(movie[5]!),
          runningTime: parseInt(movie[7]!)
        }).catch((err: any) => console.log('ERROR', err))
      })
    })

      /*    await employees.put({
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

    console.log("Inserted 3 records")*/
  } catch (err) {
    console.error(`Could not insert records into collection! Reason: ${JSON.stringify(err)}`)
  }
}

insertRecords()
