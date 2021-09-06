/* eslint-disable @typescript-eslint/require-await */

import { recursive } from 'merge'
import { Adapter } from '../abstraction/adapter'
import type { GetOptions, InternalMapper, LimiterOptions, SetOptions } from '../abstraction/base'
import { shuffle } from '../util/shuffle'

export class MemoryAdapter extends Adapter {
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

    // Delete List of IDs
    if (Array.isArray(key)) key.forEach((k) => { this.state.delete(k) })
    // Delete Single ID
    else this.state.delete(key)
  }

  /**
   * Get the specified sigular or list of entries from the database.
   *
   * @param key The key or keys to get.
   * @param options [Optional] The (GetOptions & CacheOptions) to use for the request.
   *
   * @returns The value or values from the database.
   */
  public async get (key: string | string[], options?: GetOptions): Promise<unknown | unknown[]> {
    super._validate(key)

    if (Array.isArray(key)) {
      // Fetch List of IDs with Specified Options
      const result: unknown[] = []
      for (const k of key) {
        const context = this.state.get(k)
        // Default Invalid or Undefined Contexts
        if (context === undefined || context.ctx === undefined) {
          result.push({ key: k, value: options?.default ?? undefined })
          continue
        }
        // Check Expiration
        if (await super._lifetime(k, context)) {
          result.push({ key: k, value: options?.default ?? undefined })
          continue
        }
        result.push({ key: k, value: context.ctx })
      }
      return result
    } else {
      // Fetch Single ID with Specific Options
      const context = this.state.get(key)
      // Default Invalid or Undefined Contexts
      if (context === undefined || context.ctx === undefined) return options?.default ?? undefined
      // Check Expiration
      if (await super._lifetime(key, context)) return options?.default ?? undefined
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
      // Check List of IDS Existence
      const result: Array<{ key: string; has: boolean; }> = []
      // Propogate Results
      key.forEach((k) => {
        result.push({ key: k, has: this.state.has(k) })
      })
      return result
      // Check Single ID Existence
    } else return this.state.has(key)
  }

  /**
   * The list of keys from the database.
   *
   * @param limits [Optional] The limits to apply to the list.
   */
  public async keys (limits?: LimiterOptions): Promise<string[]> {
    let kValueTables = Array.from(this.state.keys())

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
        if (options?.merge === true) {
          // Merge if Applicable
          const current = await this.get(k)
          if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
            value = recursive(true, current, value) as unknown
          }
        }
        // Inset to Internal Memory
        this.state.set(k, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }))
      }
    } else {
      // Set Single Key
      if (options?.merge === true) {
        // Merge if Applicable
        const current = await this.get(key)
        if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
          value = recursive(true, current, value) as unknown
        }
      }
      // Inset to Internal Memory
      this.state.set(key, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }))
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
