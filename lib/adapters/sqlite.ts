import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import { Sql, TableWithColumns } from 'sql-ts'

import { GenericAdapter } from '../generic'
import { InternalMapper, MapperOptions } from '../types/generics.type'
import { SQLite3Options } from '../types/sqlite.type'

import type BetterSqlite3 from 'better-sqlite3'
export class SQLiteAdapter extends GenericAdapter {
  // Internal Map
  private readonly map = new Map<string, InternalMapper>()

  // Builders
  private sql: Sql
  private _keys: TableWithColumns<KeyTable>
  private _storage: TableWithColumns<ValueTable>

  // Instancing
  private readonly _options: SQLite3Options
  private readonly _engine: typeof BetterSqlite3
  private _database: BetterSqlite3.Database

  constructor (options: SQLite3Options) {
    super()
    this._options = options

    try {
      this._engine = require('better-sqlite3')
    } catch (err) {
      const error = err as Error
      throw new Error(`[init] NAMESPACE(${this._options.namespace}): Failed to detect installation of SQLite3. Please install 'better-sqlite3' with your preferred package manager to enable this adapter.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  async configure (): Promise<void> {
    this.sql = new Sql('sqlite')
    this._keys = this.sql.define<KeyTable>({
      name: 'key_map',
      columns: [{
        name: 'keys',
        primaryKey: true,
        dataType: 'VARCHAR(128)'
      }]
    })
    this._storage = this.sql.define<ValueTable>({
      name: 'value_map',
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(128)'
      }, {
        name: 'value',
        dataType: 'TEXT'
      }]
    })

    await this.lock()

    this._database.exec(this._keys.create().ifNotExists().toString())
  }

  async clear (): Promise<void> {
    await this.map.clear()
  }

  async delete (key: string): Promise<boolean> {
    return this.map.delete(key)
  }

  async get (key: string): Promise<any> {
    const value = await this.map.get(key)
    if (await this.expired(value)) {
      return undefined
    }
    return fromJSON(value?.ctx)
  }

  async has (key: string): Promise<boolean> {
    return this.map.has(key)
  }

  async keys (): Promise<string[]> {
    return Array.from(this.map.keys())
  }

  async set (key: string, value: any, options?: MapperOptions): Promise<void> {
    let lifetime = null
    if (options?.lifetime !== undefined) {
      lifetime = DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO()
    }
    await this.map.set(key, {
      ctx: toJSON(value),
      lifetime,
      key,
      createdAt: DateTime.local().toUTC().toISO(),
      modifiedAt: DateTime.local().toUTC().toISO()
    })
  }

  async lock (): Promise<void> {
    try {
      this._database = new this._engine(this._options.file.toString())
    } catch (err) {
      const error = err as Error
      throw new Error(`[runtime:lock NAMESPACE(${this._options.namespace}): Failed to initialize SQLite3 adapter due to an unexpected error.\n${(error.stack !== undefined ? error.stack : error.message)}`)
    }
  }

  async execute (sql: string): Promise<void> {
    return await new Promise((resolve, reject) => {
      try {
        this._database.exec(sql)
        return resolve()
      } catch (err) {
        return reject(err)
      }
    })
  }
}

interface KeyTable {
  key: string
}

interface ValueTable {
  key: string
  value: InternalMapper
}
