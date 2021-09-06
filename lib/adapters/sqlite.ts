/* eslint-disable @typescript-eslint/require-await */

import { recursive } from 'merge'
import type { KValueEntry, SQLite3Options } from '../abstraction/adapter'
import { Adapter } from '../abstraction/adapter'
import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base'
import type { CacheOptions } from '../abstraction/cache'
import { KnexHandler } from '../builder/knex'
import { shuffle } from '../util/shuffle'

export class SQLiteAdapter extends Adapter {
  private readonly options: SQLite3Options
  private readonly driver: KnexHandler

  public constructor (options: SQLite3Options & { useNullAsDefault: boolean; }) {
    super()
    options.client = options.client as 'sqlite3' | null ?? 'sqlite3'
    options.useNullAsDefault = true
    options.connection.table = options.connection.table as string | null ?? 'kv_global'
    this.options = options
    this.driver = new KnexHandler(options)
  }

  /**
   * Asynchronously configure the Adapter connection.
   */
  public async configure (): Promise<void> {
    // Initialize Table
    if (!(await this.driver.knex.schema.hasTable(this.options.connection.table))) {
      await this.driver.knex.schema.createTable(this.options.connection.table, (table) => {
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
    // Delete All Entries and Purge Cache
    const keys = await this.keys()
    if (keys.length > 0) await this.delete(keys)
    this.memcache.clear()
  }

  /**
   * Remove the specified sigular or list of entries from the database.
   *
   * @param key The key or keys to remove.
   */
  public async delete (key: string | string[]): Promise<void> {
    super._validate(key)

    if (Array.isArray(key)) {
      // Delete List of IDs and Purge Cache
      await this.driver.knex.table(this.options.connection.table).whereIn('key', key).delete()
      key.forEach((k) => { this.memcache.delete(k) })
    } else {
      // Delete Single ID and Purge Cache
      await this.driver.knex.table(this.options.connection.table).where({ key: key }).delete()
      this.memcache.delete(key)
    }
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

    if (Array.isArray(key)) {
      // Fetch List of IDs with Specified Options
      const result: unknown[] = []
      const kValueTables = await this.driver.knex(this.options.connection.table).select('*').whereIn('key', key) as KValueEntry[]
      // Index Missing Values to be Defaulted
      for (const k of key) {
        if (kValueTables.filter((kValueTable) => kValueTable.key === k).length === 0) {
          kValueTables.push({ key: k, value: undefined })
        }
      }
      for (const kValueTable of kValueTables) {
        // Replicate from Cache if Applicable
        if ((this.options.cache === true || options?.cache === true) && this.memcache.has(kValueTable.key)) {
          result.push({ key: kValueTable.key, value: this.memcache.get(kValueTable.key) })
          continue
        }
        const state = kValueTable
        const context = super._import(state)
        // Default Invalid or Undefined Contexts
        if (context === undefined) {
          result.push({ key: kValueTable.key, value: options?.default ?? undefined })
          continue
        }
        // Check Expiration
        if (await super._lifetime(kValueTable.key, context)) {
          result.push({ key: kValueTable.key, value: options?.default ?? undefined })
          continue
        }
        // Inset to Cache if Applicable
        if (this.options.cache === true || options?.cache === true) this.memcache.set(kValueTable.key, context.ctx, this.options.cacheExpire ?? options?.cacheExpire ?? 30000)
        result.push({ key: kValueTable.key, value: context.ctx })
      }
      return result
    } else {
      // Fetch Single ID with Specified Options
      // Replicate from Cache if Applicable
      if ((this.options.cache === true || options?.cache === true) && this.memcache.has(key)) {
        return this.memcache.get(key)
      }
      const state = await this.driver.knex(this.options.connection.table).select('*').where({ key: key }).first() as KValueEntry
      const context = super._import(state)
      // Default Invalid or Undefined Contexts
      if (context === undefined || context.ctx === undefined) return options?.default ?? undefined
      // Check Expiration
      if (await super._lifetime(key, context)) return options?.default ?? undefined
      // Inset to Cache if Applicable
      if (this.options.cache === true || options?.cache === true) this.memcache.set(key, context.ctx, this.options.cacheExpire ?? options?.cacheExpire ?? 30000)
      return context.ctx
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

    if (Array.isArray(key)) {
      // Check List of IDs Existence
      const result: Array<{ key: string; has: boolean; }> = []
      const kValueEntries = await this.driver.knex(this.options.connection.table).select('key').whereIn('key', key) as KValueEntry[]
      // Replicate Missing Keys in kValueTables
      const kValueReplicate: string[] = []
      // Propogate Results as True
      kValueEntries.forEach((kValueEntry) => {
        kValueReplicate.push(kValueEntry.key)
        result.push({ key: kValueEntry.key, has: true })
      })
      // Propogate Missing Results as False
      key.forEach((k) => {
        if (!kValueReplicate.includes(k)) {
          result.push({ key: k, has: false })
        }
      })
      return result
    } else {
      // Check Single ID Existence
      return await this.driver.knex(this.options.connection.table).select('key').where({ key: key }).first() !== undefined
    }
  }

  /**
   * The list of keys from the database.
   *
   * @param limits [Optional] The limits to apply to the list.
   */
  public async keys (limits?: LimiterOptions): Promise<string[]> {
    let kValueTables = (await this.driver.knex(this.options.connection.table).select('key') as KValueEntry[]).map((v) => v.key)

    // Apply Limiter
    if (limits?.randomize === true) {
      kValueTables = shuffle(kValueTables)
    }
    if (limits?.limit !== undefined) {
      if (!isNaN(parseInt(limits.limit as unknown as string | undefined ?? 'NaN'))) {
        kValueTables = kValueTables.slice(0, limits.limit)
      }
    }

    return kValueTables
  }

  /**
   * Updates a key or list of keys in the database to the specified value.
   *
   * @param key The key(s) to set the value of.
   * @param value The value of the specified key(s).
   */
  public async set (key: string | string[], value: unknown, options?: SetOptions): Promise<void> {
    super._validate(key)

    if (Array.isArray(key)) {
      // Set List of Keys
      for (const k of key) {
        // Cache if Applicable
        if (this.memcache.has(k)) this.memcache.delete(k)
        if (options?.merge === true) {
          // Merge if Applicable
          const current = await this.get(k)
          if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
            value = recursive(true, current, value) as unknown
          }
        }
        // Inset to Database
        await this.driver.knex.insert({
          key: k,
          value: super._export(super._make(value, options, this.options.encoder))
        }).into(this.options.connection.table).onConflict('key').merge()
      }
    } else {
      // Set Single Key
      // Cache if Applicable
      if (this.memcache.has(key)) this.memcache.delete(key)
      if (options?.merge === true) {
        // Merge if Applicable
        const current = await this.get(key)
        if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
          value = recursive(true, current, value) as unknown
        }
      }
      // Inset to Database
      await this.driver.knex.insert({
        key: key,
        value: super._export(super._make(value, options, this.options.encoder))
      }).into(this.options.connection.table).onConflict('key').merge()
    }
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
    let kValueEntries = (await this.driver.knex(this.options.connection.table).select('key') as KValueEntry[]).map((v) => { return v.key })

    // Apply Limiter
    if (limits?.randomize === true) {
      kValueEntries = shuffle(kValueEntries)
    }
    if (limits?.limit !== undefined) {
      if (!isNaN(parseInt(limits.limit as unknown as string | undefined ?? 'NaN'))) {
        kValueEntries = kValueEntries.slice(0, limits.limit)
      }
    }

    // Index Entries
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
