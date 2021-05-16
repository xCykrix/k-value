import type { Encoding } from 'crypto'
import type { DBGeneric as SQLOptions } from './generics.t'

/** The representation of the MySQL Adapter Options */
export interface MySQL2Options extends SQLOptions {
  authentication: {
    database: string | undefined
    host: string | undefined
    password: string | undefined
    port: number | undefined
    username: string | undefined
  } | undefined
  encoder?: {
    parse: Encoding | undefined
    store: Encoding | undefined
    use: boolean | undefined
  } | undefined
}
