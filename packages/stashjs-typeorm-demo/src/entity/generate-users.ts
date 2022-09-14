
import { faker } from '@faker-js/faker';
import UserRepository from '../repository/UserRepository';

export async function generateUsers(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    let newUser = UserRepository.create({
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      dob: faker.date.birthdate()
    })
    console.log(`Creating ${newUser.firstName}`)
       
    await UserRepository.save(newUser)
  }

  console.log("Creating Dan")
  // And some hard coded users for our demo queries
  await UserRepository.save(UserRepository.create({
    firstName: "Dan",
    lastName: "Draper",
    dob: new Date(1985, 1, 1)
  }))
}