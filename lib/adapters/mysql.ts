/* eslint-disable @typescript-eslint/require-await */

import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base'
import type { KValueEntry } from '../abstraction/adapter/base'
import type { CacheOptions } from '../abstraction/cache'
import type { MySQL2Options } from '../abstraction/adapter/sql'
import { SQLAdapter } from '../abstraction/adapter/sql'
import { KnexHandler } from '../builder/knex'

export class MySQLAdapter extends SQLAdapter {
  protected readonly options: MySQL2Options

  public constructor (options: MySQL2Options & { useNullAsDefault?: boolean; }) {
    super()
    options.client = options.client as 'mysql2' | null ?? 'mysql2'
    options.useNullAsDefault = true
    options.table = options.table as string | null ?? 'kv_global'
    this.options = options
    this.driver = new KnexHandler(options)
  }

  /**
   * Asynchronously configure the Adapter connection.
   */
  public async configure (): Promise<void> {
    // Initialize Table
    if (!(await this.driver.knex.schema.hasTable(this.options.table))) {
      await this.driver.knex.schema.createTable(this.options.table, (table) => {
        table.string('key', 192)
        table.text('value')
        table.primary(['key'])
        table.unique(['key'])
      })
    }
  }

  /**
   * Close the remote connection.
   */
  public async close (): Promise<void> {
    await this.driver.knex.destroy()
  }

  /**
   * Remove all entries from the database.
   */
  public async clear (): Promise<void> {
    await this.delete(await this.keys())
  }

  /**
   * Remove the specified sigular or list of entries from the database.
   *
   * @param key The key or keys to remove.
   */
  public async delete (key: string | string[]): Promise<void> {
    super._validate(key, true)

    const where = Array.from(Array.isArray(key) ? key : [key])
    await this.driver.knex(this.options.table).whereIn('key', where).delete()
    where.forEach((k) => {
      this.memcache.delete(k)
    })
  }

  /**
   * Get the specified sigular or list of entries from the database.
   *
   * @param key The key or keys to get.
   * @param options [Optional] The (GetOptions & CacheOptions) to use for the request.
   *
   * @returns The value or values from the database.
   */
  public async get (key: string | string[], options?: GetOptions & CacheOptions): Promise<unknown | Array<{ key: string; value: unknown; }>> {
    super._validate(key)

    const where = Array.from(Array.isArray(key) ? key : [key])
    const result: Array<{key: string; value: unknown; }> = []
    const partials: Map<string, KValueEntry> = new Map()

    where.forEach((k) => {
      if ((this.options.cache === true || options?.cache === true) && this.memcache.has(k)) {
        return partials.set(k, this.memcache.get(k)!)
      }
      return partials.set(k, { key: k, value: undefined })
    })

    const index = Array.from(partials).filter(p => p[1].value === undefined).map(p => p[0])
    const pair = await this.driver.knex(this.options.table).select('key', 'value').whereIn('key', index) as KValueEntry[]

    pair.forEach((kValueEntry) => {
      partials.set(kValueEntry.key, kValueEntry)
    })

    for (const partial of partials.entries()) {
      const context = await super._import(partial[0], partial[1])
      if (context === undefined || context.ctx === undefined) {
        result.push({ key: partial[0], value: options?.default ?? undefined })
        continue
      }
      if (((this.options.cache === true || options?.cache === true) && (options?.cache !== false))) {
        this.memcache.set(partial[0], partial[1], this.options.cacheExpire ?? options?.cacheExpire ?? 30000)
      }
      result.push({ key: partial[0], value: context.ctx })
    }

    if (result.length === 1) {
      return result[0].value
    } else {
      return result
    }
  }

  /**
   * Check if the specified sigular or list of entries exist in the database.
   *
   * @param key The key or keys to check.
   *
   * @returns The existence of the specified key or keys.
   */
  public async has (key: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>> {
    super._validate(key)

    const where = Array.from(Array.isArray(key) ? key : [key])
    const keys = await this.driver.knex(this.options.table).whereIn('key', where).select('key') as KValueEntry[]
    const result: Array<{ key: string; has: boolean; }> = []

    const replica: string[] = []
    keys.forEach((k) => {
      replica.push(k.key)
      result.push({ key: k.key, has: true })
    })
    where.forEach((k) => {
      if (!replica.includes(k)) {
        result.push({ key: k, has: false })
      }
    })

    if (result.length === 1) {
      return result[0].has
    } else {
      return result
    }
  }

  /**
   * The list of keys from the database.
   *
   * @param limits [Optional] The limits to apply to the list.
   */
  public async keys (limits?: LimiterOptions): Promise<string[]> {
    const keyList = (await this.driver.knex(this.options.table).select('key') as KValueEntry[]).map((v) => v.key)
    return this._apply_limit(keyList, limits)
  }

  /**
   * Updates a key or list of keys in the database to the specified value.
   *
   * @param key The key(s) to set the value of.
   * @param value The value of the specified key(s).
   */
  public async set (key: string | string[], value: unknown, options?: SetOptions): Promise<void> {
    super._validate(key)

    const where = Array.from(Array.isArray(key) ? key : [key])
    const upsert: KValueEntry[] = []

    for (const k of where) {
      if (this.memcache.has(k)) this.memcache.delete(k)
      value = await this._merge(options?.merge, k, value)

      upsert.push({
        key: k,
        value: super._export(super._make(value, options, this.options.encoder))
      })
    }

    await this._upsert(upsert)
  }

  /**
   * The list of [key, value] pairs in the database.
   *
   * @param limits [Optional] The limits to apply to the list.
   *
   * @returns List of [key, value] pairs from the database.
   */
  public async entries (limits?: LimiterOptions): Promise<Array<[string, unknown]>> {
    const result: Array<[string, unknown]> = []
    let kValueEntries = (await this.driver.knex(this.options.table).select('key') as KValueEntry[]).map((v) => { return v.key })
    kValueEntries = this._apply_limit(kValueEntries, limits)

    // Index Entries to Result
    const kValuePairs = await this.get(kValueEntries) as Array<{ key: string; value: unknown; }>
    kValuePairs.forEach((kValuePair) => {
      result.push([kValuePair.key, kValuePair.value])
    })

    return result
  }

  /**
   * The list of value(s) in the database.
   *
   * @param limits [Optional] The limits to apply to the list.
   *
   * @returns The list of values from the database.
   */
  public async values (limits?: LimiterOptions): Promise<unknown[]> {
    // Return just the values of #entries()
    return (await this.entries(limits)).map((v) => v[1])
  }
}
