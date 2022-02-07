import type { KnexHandler } from '../../builder/knex';
import type { EncoderOptions } from '../base';
import type { CacheOptions } from '../cache';
import type { KValueEntry } from './base';
import { BaseAdapter } from './base';

/**
 * The representative SQL layer for the storage adapter that contains shared components of the underlying API.
 *
 * @category Abstraction
 * @internal
 */
export abstract class SQLAdapter extends BaseAdapter {
  protected driver!: KnexHandler;

  protected readonly options!: PostgreSQLOptions | MySQL2Options | SQLite3Options;

  /** Upsert to the storage adapter. Insert or update. */
  protected async _upsert(kValueEntries: KValueEntry | KValueEntry[]): Promise<void> {
    const idTable = this.options as unknown as {
      table: string | undefined
      connection: {
        table: string
      } | undefined
    };

    await this.driver.knex
      .insert(kValueEntries)
      .into(idTable.table ?? idTable.connection?.table ?? 'kv_global')
      .onConflict('key').merge(['value']);
  }
}

/** The representation of the MySQL2Options structure. */
export interface MySQL2Options extends CacheOptions {
  client: 'mysql' | 'mysql2' | string
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

/** The representation of the PostgreSQLOptions structure. */
export interface PostgreSQLOptions extends CacheOptions {
  client: 'pg' | string
  connection: string
  table: string | 'kv_global'
  searchPath?: string[]
  pool: {
    min: number
    max: number
  }
  encoder?: EncoderOptions
}

/** The representation of the SQLite3Options structure. */
export interface SQLite3Options extends CacheOptions {
  client: 'better-sqlite3' | string
  connection: {
    filename: string
    table: string | 'kv_global'
  }
  encoder?: EncoderOptions
}
