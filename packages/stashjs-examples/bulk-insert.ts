import { Stash } from "@cipherstash/stashjs"
import { Movie } from "./movie"
import { parse } from "csv-parse"
import fs from "fs"

async function bulkInsert() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.loadCollection<Movie>("movies")
    console.log(`Collection "${movies.name}" loaded`)

    const data = fs.readFileSync("titles.tsv", "utf8")

    parse(
      data,
      {
        delimiter: "\t",
      },
      async function (_err, records) {
        for (let i = 0; i < records.length; i++) {
          let movie = records[i]
          let [title, year, runningTime] = [
            movie[2]!,
            parseInt(movie[5]!),
            parseInt(movie[7]!),
          ]
          if (!isNaN(year) && !isNaN(runningTime)) {
            console.log(title)
            await movies.put({
              title: movie[2]!,
              year: parseInt(movie[5]!),
              runningTime: parseInt(movie[7]!),
            })
          }
        }
      }
    )
  } catch (err) {
    console.error(
      `Could not insert records into collection! Reason: ${JSON.stringify(err)}`
    )
  }
}

bulkInsert()
