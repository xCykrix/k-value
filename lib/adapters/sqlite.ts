import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import { Sql, TableWithColumns } from 'sql-ts'

import { GenericAdapter } from '../generic'
import { InternalMapper, MapperOptions } from '../types/generics.type'

export class SQLiteAdapter extends GenericAdapter {
  private readonly map = new Map<string, InternalMapper>()
  private sql: Sql
  private _keys: TableWithColumns<KeyTable>

  async configure (): Promise<void> {
    this.sql = new Sql('sqlite')
    this._keys = this.sql.define<KeyTable>({
      name: 'key_map',
      columns: ['keys']
    })
    // this._storage = this.sql.define<ValueTable>({
    //   name: 'value_map',
    //   columns: ['k']
    // })
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
      modifiedAt: DateTime.local().toUTC().toISO()
    })
  }
}

interface KeyTable {
  key: string
}
