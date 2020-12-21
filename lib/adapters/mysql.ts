import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import * as MySQL2 from 'mysql2/promise'
import { Sql, TableWithColumns } from 'sql-ts'
import { GenericAdapter } from '../generic'
import { InternalMapper, MapperOptions } from '../types/generics.type'
import { MySQL2Options } from '../types/mysql.type'

export class MySQLAdapter extends GenericAdapter {
  // Internal Map
  private readonly map = new Map<string, InternalMapper>()

  // Builders
  private sql: Sql
  private _keys: TableWithColumns<KeyTable>
  private _storage: TableWithColumns<ValueTable>

  // Instancing
  private readonly _options: MySQL2Options
  private readonly _engine: typeof MySQL2
  private _database: MySQL2.Pool

  /**
   * Initialize the MySQL2 Adapter
   *
   * @remarks
   *
   * Make sure to call MySQLAdapter#configure() before attempting to use the database.
   *
   * This will asynchronously configure the database and tables before usage.
   *
   * @param options - The MySQL2Options used to configure the state of the database.
   */
  constructor (options: MySQL2Options) {
    super()
    this._options = options

    try {
      this._engine = require('mysql2/promise')
    } catch (err) {
      const error = err as Error
      throw new Error(`[init] NAMESPACE(${this._options.table}): Failed to detect installation of MySQL2. Please install 'mysql2' with your preferred package manager to enable this adapter.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }

    if (options?.authentication === undefined || options?.table === undefined) {
      throw new Error(`[init] NAMESPACE(${this._options?.table}): Failed to detect MySQL2Options. Please specify both the 'file' and the 'table' you wish to use.`)
    }
  }

  /**
   * Asynchronously configure the MySQL2Adapter to enable usage.
   */
  async configure (): Promise<void> {
    this.sql = new Sql('mysql')

    // Initialize Keys
    this._keys = this.sql.define<KeyTable>({
      name: (this._options.table === undefined || this._options.table === '' ? 'global_map' : this._options.table + '_map'),
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(192)'
      }]
    })

    // Initialize Storage
    this._storage = this.sql.define<ValueTable>({
      name: (this._options.table === undefined || this._options.table === '' ? 'global' : this._options.table),
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(192)'
      }, {
        name: 'value',
        dataType: 'TEXT'
      }]
    })

    // Lock Database Connection
    await this._lock_database()

    // Create Keys Table
    try {
      await this._run(this._keys.create().ifNotExists().toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:configure NAMESPACE(${this._options.table}): Failed to configure key-storage table.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }

    // Create Storage Table
    try {
      await this._run(this._storage.create().ifNotExists().toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:configure NAMESPACE(${this._options.table}): Failed to configure value-storage table.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  /**
   * Terminate the MySQL Database Connection and end active service.
   */
  async close (): Promise<void> {
    await this._database.end()
  }

  /**
   * Permanently removes all entries from the referenced storage driver.
   */
  async clear (): Promise<void> {
    await this._run(this._keys.delete().from().toString())
    await this._run(this._storage.delete().from().toString())
  }

  /**
   * Permanently removes the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to remove from the storage adapter.
   *
   * @returns - If the value assigned to the key was deleted.
   */
  async delete (key: string): Promise<boolean> {
    this.validate(key)
    await this._run(this._keys.delete().where({ key }).toString())
    await this._run(this._storage.delete().where({ key }).toString())
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
    this.validate(key)
    const snapshot = await this._get(this._storage.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.value === undefined) return undefined
    const parser = fromJSON(JSON.parse(snapshot.value))

    if (await this.expired(parser)) {
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
    this.validate(key)
    const snapshot = await this._get(this._keys.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.key === '') return false
    else return true
  }

  /**
   * Retrieves all known keys from the storage driver.
   *
   * @returns - An array of all known keys in no particular order.
   */
  async keys (): Promise<string[]> {
    const keys = await this._all(this._keys.select(this._keys.star()).from().toString())
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
    this.validate(key)
    let lifetime = null
    if (options?.lifetime !== undefined) {
      lifetime = DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO()
    }
    const serialized = JSON.stringify(toJSON({
      key,
      ctx: value,
      lifetime,
      createdAt: DateTime.local().toUTC().toISO()
    }))
    await this._run(this._storage.replace({
      key,
      value: serialized
    }).toString())
    await this._run(this._keys.replace({
      key
    }).toString())
  }

  // Lock Database Connection
  private async _lock_database (): Promise<void> {
    try {
      this._database = await this._engine.createPool({
        host: this._options?.authentication?.host,
        port: this._options?.authentication?.port,
        user: this._options?.authentication?.username,
        password: this._options?.authentication?.password,
        database: this._options?.authentication?.database,
        connectionLimit: 5
      })
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:lock NAMESPACE(${this._options.table}): Failed to initialize MySQL2 adapter due to an unexpected error.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  // Execute no-response Query
  private async _run (sql: string): Promise<void> {
    await this._database.execute(sql)
  }

  // Execute response Query
  private async _get (sql: string): Promise<ValueTable> {
    const rows = await this._database.query(sql)
    const result = rows[0] as MySQL2.RowDataPacket[]
    const table = result[0] as unknown as ValueTable

    if (table === undefined) {
      return {
        key: '',
        value: undefined
      }
    }
    return {
      key: table.key,
      value: table.value
    }
  }

  private async _all (sql: string): Promise<ValueTable[]> {
    const rows = await this._database.query(sql)
    const result = rows[0] as MySQL2.RowDataPacket[]
    const table = result as unknown as ValueTable[]
    return table
  }
}

// Keys Table Definition
interface KeyTable {
  key: string
}

// Value Table Definition
interface ValueTable {
  key: string
  value: string | undefined
}
