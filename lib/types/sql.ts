import type { Encoding } from 'crypto'

/** The representation of the KValue Table */
export interface KValueTable {
  key: string
  value: string | undefined
}

/** The representation of the PostgreSQL Adapter Options */
export interface PostgreSQLOptions {
  client: 'pg'
  connection: string
  table: string | undefined | 'kv_global'
  searchPath?: string[]
  pool: {
    min: number
    max: number
  }
  encoder?: {
    parse: Encoding
    store: Encoding
    use: boolean
  }
}

/** The representation of the MySQL Adapter Options */
export interface MySQL2Options {
  client: 'mysql' | 'mysql2'
  table: string | undefined | 'kv_global'
  connection: {
    host: string
    user: string
    password: string
    database: string
  }
  pool: {
    min: number
    max: number
  }
  encoder?: {
    parse: Encoding
    store: Encoding
    use: boolean
  }
}

/** The representation of the SQLite Adapter Options */
export interface SQLite3Options {
  client: 'sqlite3'
  connection: {
    filename: string
    table: string | undefined | 'kv_global'
  }
  encoder?: {
    parse?: Encoding
    store?: Encoding
    use?: boolean
  }
}
