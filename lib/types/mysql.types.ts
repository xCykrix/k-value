import { DBGeneric as SQLOptions } from './generics.types'

/** The representation of the MySQL Adapter Options */
export interface MySQL2Options extends SQLOptions {
  authentication: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
}
