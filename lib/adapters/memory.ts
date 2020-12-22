import { DateTime, Duration } from 'luxon'

import { GenericAdapter } from '../generic'
import { InternalMapper, MapperOptions } from '../types/generics.type'

export class MemoryAdapter extends GenericAdapter {
  private readonly map = new Map<string, InternalMapper>()

  async configure (): Promise<void> {}
  async close (): Promise<void> {}

  /**
   * Permanently removes all entries from the referenced storage driver.
   */
  async clear (): Promise<void> {
    await this.map.clear()
  }

  /**
   * Permanently removes the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to remove from the storage adapter.
   *
   * @returns - If the value assigned to the key was deleted.
   */
  async delete (key: string): Promise<boolean> {
    this.validate(key)

    return this.map.delete(key)
  }

  /**
   * Retrieves the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to obtain from the storage driver.
   *
   * @returns - The value assigned to the key.
   */
  async get (key: string): Promise<any> {
    this.validate(key)

    const value = await this.map.get(key)
    if (value === undefined || value.ctx === undefined) return undefined

    if (await this.expired(value)) {
      await this.delete(key)
      return undefined
    }

    return value?.ctx
  }

  /**
   * Assert if the referenced storage driver contains the supplied key.
   *
   * @param key - The referenced key to check existence in the storage driver.
   *
   * @returns - If the key exists.
   */
  async has (key: string): Promise<boolean> {
    this.validate(key)

    return this.map.has(key)
  }

  /**
   * Retrieves all known keys from the storage driver.
   *
   * @returns - An array of all known keys in no particular order.
   */
  async keys (): Promise<string[]> {
    return Array.from(this.map.keys())
  }

  /**
   * Insert the provided value at the referenced key.
   *
   * @param key - The referenced key to insert the value in the storage driver.
   * @param value - The provided value to insert at the referenced key.
   * @param options - The MapperOptions to control the aspects of the stored key.
   */
  async set (key: string, value: any, options?: MapperOptions): Promise<void> {
    this.validate(key)

    await this.map.set(key, {
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      key,
      createdAt: DateTime.local().toUTC().toISO()
    })
  }
}
