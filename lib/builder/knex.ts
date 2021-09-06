import type { Knex } from 'knex'
import { knex } from 'knex'
import type { KValueEntry } from '../abstraction/adapter/base'
import type { MySQL2Options, PostgreSQLOptions, SQLite3Options } from '../abstraction/adapter/sql'

/**
 * Knex SQL Connection Controller
 */
export class KnexHandler {
  private readonly _knex: Knex<KValueEntry>

  public constructor (connection: PostgreSQLOptions | MySQL2Options | SQLite3Options) {
    this._knex = knex(connection)
  }

  /** Fetch the current instance of the Knex Handler */
  public get knex (): Knex {
    return this._knex
  }
}
