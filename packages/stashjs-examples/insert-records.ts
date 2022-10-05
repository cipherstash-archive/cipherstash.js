import { Stash } from "@cipherstash/stashjs"
import { Movie } from "./movie"

async function insertRecords() {
  try {
    const stash = await Stash.connect()
    const movies = await stash.loadCollection<Movie>("movies")
    console.log(`Collection "${movies.name}" loaded`)

    let id1 = await movies.put({
      title: "The Matrix",
      year: 1999,
      runningTime: 136,
    })

    /*let id2 = await movies.put({
      title: "Star Wars",
      year: 1977,
      runningTime: 121
    })

    // With ID specified
    let id3 = await movies.put({
      id: "c3c8555c-d1e8-4275-9226-2d805077d5d8",
      title: "Terminator 2: Judgement Day",
      year: 1991,
      runningTime: 137
    })*/

    console.log("GET", await movies.get(id1))
    //console.log('GET ALL', await movies.getAll([id1, id2, id3]))
  } catch (err) {
    console.log(err)
    console.error(
      `Could not insert record into collection! Reason: ${JSON.stringify(err)}`
    )
  }
}

insertRecords()
