import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { IndexingSubscriber } from "@cipherstash/stashjs-typeorm"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    database: "stashjs_typeorm_demo",
    synchronize: true,
    logging: [], //["info", "query"],
    entities: [User],
    migrations: [],
    subscribers: [IndexingSubscriber],
})


