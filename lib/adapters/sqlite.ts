import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import { TableWithColumns } from 'sql-ts'

import { IKeyTable, IValueTable, SQLBuilder } from '../builder/sql'
import { MapperOptions } from '../ref/generics.type'
import { SQLite3Options } from '../ref/sqlite.type'
import { GenericAdapter } from './generic'

import type BetterSqlite3 from 'better-sqlite3'

export class SQLiteAdapter extends GenericAdapter {
  // Builders
  /** SQLBuilder Instance */
  private readonly _sqlBuilder = new SQLBuilder('sqlite')
  /** SQLBuilder IKeyTable Instantiated Instance */
  private _keys: TableWithColumns<IKeyTable>
  /** SQLBuilder IValueTable Instantiated Instance */
  private _storage: TableWithColumns<IValueTable>

  // Instancing
  /** SQLite3Options Instance */
  private readonly _options: SQLite3Options
  /** SQL Engine */
  private readonly _engine: typeof BetterSqlite3
  /** SQL Engine Instance */
  private _database: BetterSqlite3.Database

  /**
   * Initialize the SQLite3 Adapter
   *
   * @remarks
   *
   * Make sure to call SQLiteAdapter#configure() before attempting to use the database.
   *
   * This will asynchronously configure the database and tables before usage.
   *
   * @param options - The SQLite3Options used to configure the state of the database.
   */
  constructor (options: SQLite3Options) {
    super()
    this._options = options

    try {
      this._engine = require('better-sqlite3')
    } catch (err) {
      const error = err as Error
      throw new Error(`[init] NAMESPACE(${this._options.table}): Failed to detect installation of SQLite3. Please install 'better-sqlite3' with your preferred package manager to enable this adapter.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }

    if (options?.file === undefined || options?.table === undefined) {
      throw new Error(`[init] NAMESPACE(${this._options?.table}): Failed to detect SQlite3Options. Please specify both the 'file' and the 'table' you wish to use.`)
    }
  }

  /**
   * Asynchronously configure the SQLite3Adapter to enable usage.
   */
  async configure (): Promise<void> {
    // Initialize Keys and Storage
    this._keys = this._sqlBuilder.getKTable(this._options?.table)
    this._storage = this._sqlBuilder.getVTable(this._options?.table)

    // Lock Database Connection
    await this._ldb()

    // Create Keys Table
    try {
      await this._r(this._keys.create().ifNotExists().toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:configure NAMESPACE(${this._options.table}): Failed to configure key-storage table.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }

    // Create Storage Table
    try {
      await this._r(this._storage.create().ifNotExists().toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:configure NAMESPACE(${this._options.table}): Failed to configure value-storage table.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  /**
   * Terminate the SQLite Database Connection and end active service.
   */
  async close (): Promise<void> {
    this._database.close()
  }

  /**
   * Permanently removes all entries from the referenced storage driver.
   */
  async clear (): Promise<void> {
    await this._r(this._keys.delete().from().toString())
    await this._r(this._storage.delete().from().toString())
  }

  /**
   * Permanently removes the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to remove from the storage adapter.
   *
   * @returns - If the value assigned to the key was deleted.
   */
  async delete (key: string): Promise<boolean> {
    this.validateKey(key)

    await this._r(this._keys.delete().where({ key }).toString())
    await this._r(this._storage.delete().where({ key }).toString())

    return true
  }

  /**
   * Retrieves the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to obtain from the storage driver.
   *
   * @returns - The value assigned to the key.
   */
  async get (key: string): Promise<any> {
    this.validateKey(key)

    const snapshot = await this._g(this._storage.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.value === undefined) return undefined
    const parser = fromJSON(JSON.parse(snapshot.value))

    if (this.validateLifetime(parser)) {
      await this.delete(key)
      return undefined
    }

    return parser?.ctx
  }

  /**
   * Assert if the referenced storage driver contains the supplied key.
   *
   * @param key - The referenced key to check existence in the storage driver.
   *
   * @returns - If the key exists.
   */
  async has (key: string): Promise<boolean> {
    this.validateKey(key)

    const snapshot = await this._g(this._keys.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.key === '') return false
    else return true
  }

  /**
   * Retrieves all known keys from the storage driver.
   *
   * @returns - An array of all known keys in no particular order.
   */
  async keys (): Promise<string[]> {
    const keys = await this._a(this._keys.select(this._keys.star()).from().toString())

    const r: string[] = []
    keys.map((k) => r.push(k.key))

    return r
  }

  /**
   * Insert the provided value at the referenced key.
   *
   * @param key - The referenced key to insert the value in the storage driver.
   * @param value - The provided value to insert at the referenced key.
   * @param options - The MapperOptions to control the aspects of the stored key.
   */
  async set (key: string, value: any, options?: MapperOptions): Promise<void> {
    this.validateKey(key)

    const serialized = toJSON({
      key,
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      createdAt: DateTime.local().toUTC().toISO()
    })

    await this._r(this._storage.replace({
      key,
      value: serialized
    }).toString())
    await this._r(this._keys.replace({
      key
    }).toString())
  }

  // Lock Database Connection
  private async _ldb (): Promise<void> {
    try {
      this._database = new this._engine(this._options.file.toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:lock NAMESPACE(${this._options.table}): Failed to initialize SQLite3 adapter due to an unexpected error.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  // Execute no-response Query
  private async _r (sql: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      try {
        this._database.prepare(sql).run()
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }

  // Execute response Query
  private async _g (sql: string): Promise<IValueTable> {
    return await new Promise((resolve, reject) => {
      try {
        return resolve(this._database.prepare(sql).get())
      } catch (err) {
        return reject(err)
      }
    })
  }

  // Execute all-response Query
  private async _a (sql: string): Promise<IValueTable[]> {
    return await new Promise((resolve, reject) => {
      try {
        return resolve(this._database.prepare(sql).all())
      } catch (err) {
        return reject(err)
      }
    })
  }
}
