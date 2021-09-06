import type { KnexHandler } from '../../builder/knex'
import type { EncoderOptions } from '../base'
import type { KValueEntry } from './base'
import { BaseAdapter } from './base'
import type { CacheOptions } from '../cache'

export abstract class SQLAdapter extends BaseAdapter {
  protected driver: KnexHandler
  protected readonly options: PostgreSQLOptions | MySQL2Options | SQLite3Options

  public async _upsert (kValueEntries: KValueEntry | KValueEntry[]): Promise<void> {
    const idTable = this.options as unknown as {
      table: string | undefined
      connection: {
        table: string
      } | undefined
    }

    await this.driver.knex
      .insert(kValueEntries)
      .into(idTable.table ?? idTable.connection?.table ?? 'kv_global')
      .onConflict('key').merge(['value'])
  }
}

/** The representation of the PostgreSQL Adapter Options */
export interface PostgreSQLOptions extends CacheOptions {
  client: 'pg'
  connection: string
  table: string | 'kv_global'
  searchPath?: string[]
  pool: {
    min: number
    max: number
  }
  encoder?: EncoderOptions
}

/** The representation of the MySQL Adapter Options */
export interface MySQL2Options extends CacheOptions {
  client: 'mysql' | 'mysql2'
  table: string | 'kv_global'
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
  encoder?: EncoderOptions
}

/** The representation of the SQLite Adapter Options */
export interface SQLite3Options extends CacheOptions {
  client: 'sqlite3'
  connection: {
    filename: string
    table: string | 'kv_global'
  }
  encoder?: EncoderOptions
}
