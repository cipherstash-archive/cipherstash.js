import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { CipherStashIndexingSubscriber } from "./entity/CipherStashIndexingSubscriber"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "dan",
    database: "node_playground",
    synchronize: true,
    logging: false,
    entities: [User],
    migrations: [],
    subscribers: [CipherStashIndexingSubscriber],
})
