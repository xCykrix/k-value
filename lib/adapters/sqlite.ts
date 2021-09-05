/* eslint-disable @typescript-eslint/require-await */

import { recursive } from 'merge'
import type { KValueTable, SQLite3Options } from '../abstraction/adapter'
import { Adapter } from '../abstraction/adapter'
import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base'
import type { CacheOptions } from '../abstraction/cache'
import { KnexHandler } from '../builder/knex'
import { shuffle } from '../util/shuffle'

export class SQLiteAdapter extends Adapter {
  private readonly options: SQLite3Options & CacheOptions
  private readonly driver: KnexHandler

  public constructor (options: SQLite3Options & CacheOptions & { useNullAsDefault: boolean; }) {
    super()
    options.client = options.client as 'sqlite3' | null ?? 'sqlite3'
    options.useNullAsDefault = true
    this.options = options
    this.driver = new KnexHandler(options)
  }

  public async configure (): Promise<void> {
    // Initialize Table
    if (!(await this.driver.knex.schema.hasTable(this.options.connection.table ?? 'kv_global'))) {
      await this.driver.knex.schema.createTable(this.options.connection.table ?? 'kv_global', (table) => {
        table.string('key', 192)
        table.text('value')
        table.primary(['key'])
        table.unique(['key'])
      })
    }
  }

  public async close (): Promise<void> {
    await this.driver.knex.destroy()
  }

  public async clear (): Promise<void> {
    await this.driver.knex(this.options.connection.table ?? 'kv_global').delete()
    this.memcache.clear()
  }

  public async delete (id: string | string[]): Promise<void> {
    super._validate(id)

    if (Array.isArray(id)) {
      // Delete ID List
      for (const i of id) {
        await this.driver.knex.table(this.options.connection.table ?? 'kv_global').where({ key: i }).delete()
        this.memcache.delete(i)
      }
      // Delete Single ID
    } else {
      await this.driver.knex.table(this.options.connection.table ?? 'kv_global').where({ key: id }).delete()
      this.memcache.delete(id)
    }
  }

  public async get (id: string | string[], options?: GetOptions & CacheOptions): Promise<unknown | unknown[]> {
    super._validate(id)

    if (Array.isArray(id)) {
      const result: unknown[] = []
      for (const k of id) {
        if ((this.options.cache === true || options?.cache === true) && this.memcache.has(k)) {
          result.push({ key: k, value: this.memcache.get(k) })
          continue
        }
        const state = await this.driver.knex(this.options.connection.table ?? 'kv_global').select('*').where({ key: k }).first() as KValueTable
        const context = super._import(state)
        if (context === undefined) {
          result.push({ key: k, value: options?.default ?? undefined })
          continue
        }
        if (await super._lifetime(k, context)) {
          result.push({ key: k, value: options?.default ?? undefined })
          continue
        }
        if (this.options.cache === true || options?.cache === true) this.memcache.set(k, context.ctx, this.options.cacheExpire ?? options?.cacheExpire ?? 30000)
        result.push({ key: k, value: context.ctx })
      }
      return result
    } else {
      if ((this.options.cache === true || options?.cache === true) && this.memcache.has(id)) {
        return this.memcache.get(id)
      }
      const state = await this.driver.knex(this.options.connection.table ?? 'kv_global').select('*').where({ key: id }).first() as KValueTable
      const context = super._import(state)
      if (context === undefined || context.ctx === undefined) return options?.default ?? undefined
      if (await super._lifetime(id, context)) return options?.default ?? undefined
      if (this.options.cache === true || options?.cache === true) this.memcache.set(id, context.ctx, this.options.cacheExpire ?? options?.cacheExpire ?? 30000)
      return context.ctx
    }
  }

  public async has (id: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>> {
    super._validate(id)

    if (Array.isArray(id)) {
      const result: Array<{ key: string; has: boolean; }> = []
      for (const k of id) {
        result.push({
          key: k,
          has: await this.driver.knex(this.options.connection.table ?? 'kv_global').select('key').where({ key: k }).first() !== undefined
        })
      }
      return result
    } else return await this.driver.knex(this.options.connection.table ?? 'kv_global').select('key').where({ key: id }).first() !== undefined
  }

  public async keys (limits?: LimiterOptions): Promise<string[]> {
    let keys = (await this.driver.knex(this.options.connection.table ?? 'kv_global').select('key') as KValueTable[]).map((v) => v.key)

    // Randomize and Limiter
    if (limits?.randomize === true) {
      keys = shuffle(keys)
    }
    if (limits?.limit !== undefined) {
      if (!isNaN(parseInt(limits.limit as unknown as string | undefined ?? 'NaN'))) {
        keys = keys.slice(0, limits.limit)
      }
    }

    return Array.from(keys)
  }

  public async set (id: string | string[], value: unknown, options?: SetOptions): Promise<void> {
    super._validate(id)

    if (Array.isArray(id)) {
      for (const i of id) {
        if (this.memcache.has(i)) this.memcache.delete(i)
        if (options?.merge === true) {
          const current = await this.get(i)
          if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
            value = recursive(true, current, value) as unknown
          }
        }
        await this.driver.knex.insert({
          key: i,
          value: super._export(super._make(value, options, this.options.encoder))
        }).into(this.options.connection.table ?? 'kv_global').onConflict('key').merge()
      }
    } else {
      if (this.memcache.has(id)) this.memcache.delete(id)
      if (options?.merge === true) {
        const current = await this.get(id)
        if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
          value = recursive(true, current, value) as unknown
        }
      }
      await this.driver.knex.insert({
        key: id,
        value: super._export(super._make(value, options, this.options.encoder))
      }).into(this.options.connection.table ?? 'kv_global').onConflict('key').merge()
    }
  }

  public async entries (limits?: LimiterOptions): Promise<Array<[string, unknown]>> {
    const ids = await this.keys(limits)

    // TODO: Optimize with SQL - SELECT * FROM kv_global;
    const result: Array<[string, unknown]> = []
    for (const id of ids) {
      result.push([id, await this.get(id)])
    }

    return result
  }

  public async values (limits?: LimiterOptions): Promise<unknown[]> {
    const ids = await this.keys(limits)

    // TODO: Optimize with SQL - SELECT value FROM kv_global;
    const result: unknown[] = []
    for (const id of ids) {
      result.push(await this.get(id))
    }

    return result
  }
}
