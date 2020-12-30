import { Encoding } from 'crypto'
import { DBGeneric as SQLOptions } from './generics.t'

/** The representation of the MySQL Adapter Options */
export interface MySQL2Options extends SQLOptions {
  authentication: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  encoder: {
    use: boolean
    store: Encoding
    parse: Encoding
  }
}
