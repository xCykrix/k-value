import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'

import { GenericAdapter } from '../generic'
import { InternalMapper, MapperOptions } from '../types/generics.type'

export class MemoryAdapter extends GenericAdapter {
  // Internal Map
  private readonly map = new Map<string, InternalMapper>()

  async configure (): Promise<void> {
    throw new Error('[err] This function has been disabled in this specific adapter. [NOT_USED]')
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
      await this.delete(key)
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
}
