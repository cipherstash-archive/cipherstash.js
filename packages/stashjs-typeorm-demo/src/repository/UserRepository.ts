import { wrapRepo } from "@cipherstash/stashjs-typeorm"
import { AppDataSource } from "../data-source"
import { User } from "../entity/User"

const UserRepository = wrapRepo(AppDataSource.getRepository(User))
export default UserRepository