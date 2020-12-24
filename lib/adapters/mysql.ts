import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import * as MySQL2 from 'mysql2/promise'
import { TableWithColumns } from 'sql-ts'

import { IValueTable, SQLBuilder } from '../builder/sql'
import { MapperOptions } from '../ref/generics.type'
import { MySQL2Options } from '../ref/mysql.type'
import { GenericAdapter } from './generic'

export class MySQLAdapter extends GenericAdapter {
  // Builders
  /** SQLBuilder Instance */
  private readonly builder = new SQLBuilder('mysql')
  /** SQLBuilder IValueTable Instantiated Instance */
  private table: TableWithColumns<IValueTable>

  // Instancing
  /** MySQL2Options Instance */
  private readonly options: MySQL2Options
  /** SQL Engine */
  private readonly SQLEngine: typeof MySQL2
  /** SQL Engine Instance */
  private database: MySQL2.Pool

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
    this.options = options

    try {
      this.SQLEngine = require('mysql2/promise')
    } catch (err) {
      const error = err as Error
      throw new Error(`[init] NAMESPACE(${this.options.table}): Failed to detect installation of MySQL2. Please install 'mysql2' with your preferred package manager to enable this adapter.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }

    if (options?.authentication === undefined || options?.table === undefined) {
      throw new Error(`[init] NAMESPACE(${this.options?.table}): Failed to detect MySQL2Options. Please specify both the 'file' and the 'table' you wish to use.`)
    }
  }

  /**
   * Asynchronously configure the MySQL2Adapter to enable usage.
   */
  async configure (): Promise<void> {
    // Initialize Keys and Storage
    this.table = this.builder.getVTable(this.options?.table)

    // Lock Database Connection
    await this.lockDB()

    // Create Storage Table
    try {
      await this.run(this.table.create().ifNotExists().toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:configure NAMESPACE(${this.options.table}): Failed to configure value-storage table.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  /**
   * Terminate the MySQL Database Connection and end active service.
   */
  async close (): Promise<void> {
    await this.database.end()
  }

  /**
   * Permanently removes all entries from the referenced storage driver.
   */
  async clear (): Promise<void> {
    await this.run(this.table.delete().from().toString())
  }

  /**
   * Permanently removes the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to remove from the storage adapter.
   *
   * @returns - If the value assigned to the key was deleted.
   */
  async delete (key: string): Promise<boolean> {
    this.isKeyValid(key)
    await this.run(this.table.delete().where({ key }).toString())
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
    this.isKeyValid(key)

    const snapshot = await this.getOne(this.table.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.value === undefined) return undefined
    const parser = fromJSON(JSON.parse(snapshot.value))

    if (this.isExpired(parser)) {
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
    this.isKeyValid(key)

    const snapshot = await this.getOne(this.table.select().where({ key }).toString())
    if (snapshot === undefined || snapshot.key === '') return false
    else return true
  }

  /**
   * Retrieves all known keys from the storage driver.
   *
   * @returns - An array of all known keys in no particular order.
   */
  async keys (): Promise<string[]> {
    const keys = await this.getAll(this.table.select(this.table.key).from().toString())

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
    this.isKeyValid(key)

    const serialized = JSON.stringify(toJSON({
      key,
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      createdAt: DateTime.local().toUTC().toISO()
    }))

    await this.run(this.table.replace({
      key,
      value: serialized
    }).toString())
  }

  // Lock Database Connection
  private async lockDB (): Promise<void> {
    try {
      this.database = await this.SQLEngine.createPool({
        host: this.options?.authentication?.host,
        port: this.options?.authentication?.port,
        user: this.options?.authentication?.username,
        password: this.options?.authentication?.password,
        database: this.options?.authentication?.database,
        connectionLimit: 5
      })
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:lock NAMESPACE(${this.options.table}): Failed to initialize MySQL2 adapter due to an unexpected error.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  /** No-Result Query */
  private async run (sql: string): Promise<void> {
    await this.database.execute(sql)
  }

  /** Single-Result Query */
  private async getOne (sql: string): Promise<IValueTable> {
    const rows = await this.database.query(sql)
    const result = rows[0] as MySQL2.RowDataPacket[]
    const table = result[0] as unknown as IValueTable

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

  /** All-Result Query */
  private async getAll (sql: string): Promise<IValueTable[]> {
    const rows = await this.database.query(sql)
    const result = rows[0] as MySQL2.RowDataPacket[]
    const table = result as unknown as IValueTable[]
    return table
  }
}
