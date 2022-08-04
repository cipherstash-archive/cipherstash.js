
import { AppDataSource } from "./data-source"
import { User } from "./entity/User"
import { generateUsers } from "./entity/generate-users"
import UserRepository from "./repository/UserRepository"
import { all } from "@cipherstash/stashjs"

async function demoSetup(count: number): Promise<void> {
  console.log("✅ Creating CipherStash collection for UserRepo")
  await UserRepository.createCollection()
  console.log(`😎 Generating ${count} random users`)
  await generateUsers(count)
}

async function demoTeardown(): Promise<void> {
  console.log("🗑 Deleting records...")
  try {
  const records = await UserRepository
    .createQueryBuilder()
    .getMany()

    for (let record of records) {
      await UserRepository.remove(record)
    }
  } catch(e) {
    console.error("ERRR", e)
  }

  console.log("🧨 Dropping collection")
  await UserRepository.dropCollection()
}

function displayResults(users: Array<User>) {
  users.forEach(({firstName, lastName}) => {
    console.log(`😀 ${firstName} ${lastName}`)  
  })
  console.log("\n")
}

async function demoQueries(): Promise<void> {
  console.log("\n🔎 Order users by firstName:\n")

  displayResults(
    await UserRepository
    .createCSQueryBuilder("user")
    .orderBy("user.firstName")
    .getMany()
  )

  console.log("\n🔎 Find by partial match on lastName:\n")

  displayResults(
    await UserRepository
    .createCSQueryBuilder("user")
    .query(q => q.lastName_match.match("drap"))
    .getMany()
  )

  console.log("\n🔎 Find by partial match on lastName, dob after 1980/1/1 and order by dob:\n")

  displayResults(
    await UserRepository
    .createCSQueryBuilder("user")
    .query(q => 
      all(
        q.lastName_match.match("drap"),
        q.dob_range.gte(new Date(1980, 0, 1))
      )
    )
    .orderBy("user.dob")
    .getMany()
  )

}

AppDataSource.initialize().then(async () => {
  await demoSetup(100)
  await demoQueries()
  await demoTeardown()

}).catch(error => console.log("MAIN ERROR", error))
