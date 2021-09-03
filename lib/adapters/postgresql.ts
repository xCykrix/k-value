import { DateTime, Duration } from 'luxon'
import type { KValueTable, PostgreSQLOptions } from '../types/sql'
import { KnexHandler } from '../builder/knex'
import type { GetOptions, MapperOptions } from '../types/generic'
import { GenericAdapter } from '../abstraction/api'
import merge from 'merge'

export class PostgreSQLAdapter extends GenericAdapter {
  /** KnexHandler Instance */
  private readonly _handler: KnexHandler

  /** PostgreSQLOptions Instance */
  private readonly options: PostgreSQLOptions

  /**
   * Initialize the PostgreSQL Adapter
   *
   * @remarks
   *
   * Make sure to call PostgreSQLAdapter#configure() before attempting to use the database.
   *
   * This will asynchronously configure the database and tables before usage.
   *
   * @param options - The PostgreSQLOptions used to configure the state of the database.
   */
  public constructor (options: PostgreSQLOptions & { useNullAsDefault: boolean; }) {
    super()
    super._enable_cache()
    options.client = options.client as 'pg' | null ?? 'pg'
    options.useNullAsDefault = true
    this.options = options
    this._handler = new KnexHandler(this.options)
  }

  /**
   * Asynchronously configure the PostgreSQLAdapter for use.
   */
  public async configure (): Promise<void> {
    // Initialize Table
    if (!(await this._handler.knex.schema.hasTable(this.options.table ?? 'kv_global'))) {
      await this._handler.knex.schema.createTable(this.options.table ?? 'kv_global', (table) => {
        table.string('key', 192)
        table.text('value')
        table.primary(['key'])
        table.unique(['key'])
      })
    }
  }

  /**
   * Terminate the Handler Database Connection and stop service.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async close (): Promise<void> {
    await this._handler.knex.destroy()
  }

  /**
   * Permanently removes all ids from the storage driver.
   */
  public async clear (): Promise<void> {
    await this._handler.knex(this.options.table ?? 'kv_global').delete()
  }

  /**
   * Retrieves the value assigned to the requested id or Array<id1, id2, ...> from the storage driver.
   *
   * @param id - The id to obtain from the storage driver.
   * @param options - [optional] Additional options to control defaulting and caching, if applicable.
   * @returns - The value assigned to the id.
   */
  public async delete (id: string): Promise<boolean> {
    super._isIDAcceptable(id)
    await this._handler.knex.table(this.options.table ?? 'kv_global').where({ key: id }).delete()
    return true
  }

  /**
   * Retrieves the value assigned to the id from the storage driver.
   *
   * @param id - The id to obtain from the storage driver.
   * @param options - [optional] Specify the default value for the response, at this time.
   *
   * @returns - The value assigned to the id.
   */
  public async get (id: string | string[], options?: GetOptions): Promise<unknown | unknown[]> {
    super._isIDAcceptable(id)

    if (!Array.isArray(id)) {
      if (options?.cache === true && await this._check_cache(id) === true) return await this._get_cache(id, options)

      const state = await this._handler.knex(this.options.table ?? 'kv_global').select('*').where({ key: id }).first() as KValueTable
      const deserialized = super._deserialize(state)
      if (deserialized === undefined) return options?.default

      if (super._isMapperExpired(deserialized)) {
        await this.delete(id)
        return options?.default
      }

      if (options?.cache === true) await super._cache(id, deserialized.ctx, { lifetime: options.cacheExpire })
      return deserialized.ctx
    } else {
      const response = []

      for (const k of id) {
        const state = await this._handler.knex(this.options.table ?? 'kv_global').select('*').where({ key: k }).first() as KValueTable
        const deserialized = super._deserialize(state)
        if (deserialized === undefined) {
          response.push({
            key: k,
            value: options?.default
          })
          continue
        }
        if (super._isMapperExpired(deserialized)) {
          await this.delete(k)
          response.push({
            key: k,
            value: options?.default
          })
          continue
        }

        if (options?.cache === true) await super._cache(k, deserialized.ctx, { lifetime: options.cacheExpire })
        response.push({
          key: k,
          value: deserialized.ctx
        })
      }

      return response
    }
  }

  /**
   * Asserts if the storage driver contains the supplied id.
   *
   * @param id - The id to validate existence for in the storage driver.
   * @returns - If the id exists.
   */
  public async has (id: string): Promise<boolean> {
    super._isIDAcceptable(id)
    if (await this.get(id) === undefined) return false
    return true
  }

  /**
   * Retrieves all known ids from the storage driver.
   *
   * @returns - An array of all known ids, order is not guaranteed.
   */
  public async keys (): Promise<string[]> {
    return (await this._handler.knex(this.options.table ?? 'kv_global').select('key') as KValueTable[]).map((k) => { return k.key })
  }

  /**
   * Insert the provided value at the id.
   *
   * @param id - The id to insert the value in the storage driver.
   * @param value - The provided value to insert for the id.
   * @param options - The MapperOptions to control the storage aspects of the id and value.
   */
  public async set (id: string, value: unknown, options?: MapperOptions): Promise<void> {
    super._isIDAcceptable(id)
    if (super._enabled_cache() && await super._check_cache(id) === true) await super._invalidate(id)

    if (options?.merge === true && typeof value === 'object') {
      const current = await this.get(id)
      value = merge.recursive(current, value)
    }

    await this._handler.knex.insert({
      key: id,
      value: super._serialize({
        key: id,
        ctx: value,
        lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
        createdAt: DateTime.local().toUTC().toISO(),
        encoder: {
          use: (this.options.encoder?.use === undefined ? false : this.options.encoder.use),
          store: this.options.encoder?.store === undefined ? 'base64' : this.options.encoder.store,
          parse: this.options.encoder?.parse === undefined ? 'utf-8' : this.options.encoder.parse
        }
      })
    }).into(this.options.table ?? 'kv_global').onConflict('key').merge()
  }
}
