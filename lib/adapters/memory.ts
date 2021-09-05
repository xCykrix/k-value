/* eslint-disable @typescript-eslint/require-await */

import { Adapter } from '../abstraction/adapter'
import type { GetOptions, InternalMapper, LimiterOptions, SetOptions } from '../abstraction/base'
import { shuffle } from '../util/shuffle'
import { recursive } from 'merge'

export class MemoryAdapter extends Adapter {
  private readonly state = new Map<string, InternalMapper>()

  public async close (): Promise<void> { /* Noop */ }
  public async configure (): Promise<void> { /* Noop */ }

  public async clear (): Promise<void> {
    this.state.clear()
  }

  public async delete (id: string | string[]): Promise<void> {
    super._validate(id)

    if (Array.isArray(id)) {
      // Delete ID List
      for (const i of id) this.state.delete(i)
      // Delete Single ID
    } else this.state.delete(id)
  }

  public async get (id: string | string[], options?: GetOptions): Promise<unknown | unknown[]> {
    super._validate(id)

    if (Array.isArray(id)) {
      const result: unknown[] = []
      for (const i of id) {
        const context = this.state.get(i)
        if (context === undefined || context.ctx === undefined) {
          result.push({ key: i, value: options?.default ?? undefined })
          continue
        }
        if (await super._lifetime(i, context)) {
          result.push({ key: i, value: options?.default ?? undefined })
          continue
        }
        result.push({ key: i, value: context.ctx })
      }
      return result
    } else {
      const context = this.state.get(id)
      if (context === undefined || context.ctx === undefined) return options?.default ?? undefined
      if (await super._lifetime(id, context)) return options?.default ?? undefined
      return context.ctx
    }
  }

  public async has (id: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>> {
    super._validate(id)

    if (Array.isArray(id)) {
      const result: Array<{ key: string; has: boolean; }> = []
      for (const i of id) {
        result.push({ key: i, has: this.state.has(i) })
      }
      return result
    } else return this.state.has(id)
  }

  public async keys (limits?: LimiterOptions): Promise<string[]> {
    let keys = Array.from(this.state.keys())

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
        if (options?.merge === true) {
          const current = await this.get(i)
          if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
            value = recursive(true, current, value) as unknown
          }
        }
        this.state.set(i, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }))
      }
    } else {
      if (options?.merge === true) {
        const current = await this.get(id)
        if (current !== null && typeof current === 'object' && value !== null && typeof value === 'object') {
          value = recursive(true, current, value) as unknown
        }
      }
      this.state.set(id, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }))
    }
  }

  public async entries (limits?: LimiterOptions): Promise<Array<[string, unknown]>> {
    const ids = await this.keys(limits)

    const result: Array<[string, unknown]> = []
    for (const id of ids) {
      result.push([id, await this.get(id)])
    }

    return result
  }

  public async values (limits?: LimiterOptions): Promise<unknown[]> {
    const ids = await this.keys(limits)

    const result: unknown[] = []
    for (const id of ids) {
      result.push(await this.get(id))
    }

    return result
  }
}
