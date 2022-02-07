import type { Knex } from 'knex';
import { knex } from 'knex';
import type { KValueEntry } from '../abstraction/adapter/base';
import type { MySQL2Options, PostgreSQLOptions, SQLite3Options } from '../abstraction/adapter/sql';

/**
 * Knex.js Connection Handler.
 *
 * @category Class Utility
 * @internal
 */
export class KnexHandler {
  private readonly driver: Knex<KValueEntry>;

  public constructor(options: PostgreSQLOptions | MySQL2Options | SQLite3Options) {
    this.driver = knex(options);
  }

  public get knex(): Knex {
    return this.driver;
  }
}
