import { DateTime, Duration } from 'luxon'

import { GenericAdapter } from '../generic'
import { InternalMapper, Setter } from '../types/generics.type'

export class MemoryAdapter extends GenericAdapter {
  private readonly map = new Map<string, InternalMapper>()

  async configure (): Promise<void> {
    throw new Error('[err] This function has been disabled in this adapter.')
  }

  async clear (): Promise<void> {
    this.map.clear()
  }

  async delete (key: string): Promise<boolean> {
    return this.map.delete(key)
  }

  async get (key: string): Promise<any> {
    const value = await this.map.get(key)
    if (await this.expired(value)) {
      return {
        deleted: await this.delete(key),
        state: 'lifetime.exceed'
      }
    }
    return value?.ctx
  }

  async has (key: string): Promise<boolean> {
    return this.map.has(key)
  }

  async keys (): Promise<string[]> {
    return Array.from(this.map.keys())
  }

  async set (key: string, value: any, options?: Setter): Promise<void> {
    this.map.set(key, {
      ctx: value,
      expiresAt: (options?.expiresIn !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.expiresIn })).toUTC().toISO() : null),
      key,
      modifiedAt: DateTime.local().toUTC().toISO()
    })
  }
}
