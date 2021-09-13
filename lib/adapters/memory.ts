import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base'
import type { InternalMapper } from '../abstraction/adapter/base'
import { BaseAdapter } from '../abstraction/adapter/base'

export class MemoryAdapter extends BaseAdapter {
  private readonly state = new Map<string, InternalMapper>()

  public async close (): Promise<void> { /* Noop */ }
  public async configure (): Promise<void> { /* Noop */ }

  /**
   * Remove all entries from the database.
   */
  public async clear (): Promise<void> {
    this.state.clear()
  }

  /**
   * Remove the specified sigular or list of entries from the database.
   *
   * @param key The key or keys to remove.
   */
  public async delete (key: string | string[]): Promise<void> {
    super._validate(key)

    Array.from(Array.isArray(key) ? key : [key]).forEach((k) => {
      this.state.delete(k)
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
  public async get (key: string | string[], options?: GetOptions): Promise<unknown | Array<{ key: string; value: unknown; }>> {
    super._validate(key)

    const where = Array.from(Array.isArray(key) ? key : [key])
    const result: Array<{key: string; value: unknown; }> = []

    for (const k of where) {
      const context = this.state.get(k)
      if (context === undefined || context.ctx === undefined || await super._lifetime(k, context)) {
        result.push({ key: k, value: options?.default ?? undefined })
        continue
      }
      result.push({ key: k, value: context.ctx })
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
    const result: Array<{ key: string; has: boolean; }> = []

    where.forEach((k) => {
      result.push({ key: k, has: this.state.has(k) })
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
    const keyList = Array.from(this.state.keys())
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

    for (const k of where) {
      value = await this._merge(options?.merge, k, value)
      this.state.set(k, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }))
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
    let kValueEntries = await this.keys(limits)
    kValueEntries = this._apply_limit(kValueEntries, limits)

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
