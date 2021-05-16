import { DateTime, Duration } from 'luxon'
import type { GetOptions, InternalMapper, MapperOptions } from '../types/generics.t'
import { GenericAdapter } from './generic'

export class MemoryAdapter extends GenericAdapter {
  /** Internal Storage Map */
  private readonly map = new Map<string, InternalMapper>()

  /** Method not Implemented */
  public async close (): Promise<void> { /** */ }
  /** Method not Implemented */
  public async configure (): Promise<void> { /** */ }

  /**
   * Permanently removes all entries from the referenced storage driver.
   */
  public async clear (): Promise<void> {
    this.map.clear()
  }

  /**
   * Permanently removes the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to remove from the storage adapter.
   *
   * @returns - If the value assigned to the key was deleted.
   */
  public async delete (key: string): Promise<boolean> {
    super._isKeyAcceptable(key)

    return this.map.delete(key)
  }

  /**
   * Retrieves the value assigned to the supplied key from the referenced storage driver.
   *
   * @param key - The referenced key to obtain from the storage driver.
   * @param options - [optional] Specify the default value for the response, at this time.
   *
   * @returns - The value assigned to the key.
   */
  public async get (key: string | string[], options?: GetOptions): Promise<unknown | unknown[]> {
    super._isKeyAcceptable(key)

    if (!Array.isArray(key)) {
      const value = await this.map.get(key as unknown as string)
      if (value === undefined || value.ctx === undefined) return options?.default

      if (super._isMapperExpired(value)) {
        await this.delete(key as unknown as string)
        return options?.default
      }

      return value.ctx
    } else {
      const response = []

      for (const k of key) {
        const value = await this.map.get(k)
        if (value === undefined || value.ctx === undefined) {
          response.push({
            key: k,
            value: options?.default
          })
          continue
        }

        if (super._isMapperExpired(value)) {
          await this.delete(k)
          response.push({
            key: k,
            value: options?.default
          })
          continue
        }

        response.push({
          key: k,
          value: value.ctx
        })
      }

      return response
    }
  }

  /**
   * Assert if the referenced storage driver contains the supplied key.
   *
   * @param key - The referenced key to check existence in the storage driver.
   *
   * @returns - If the key exists.
   */
  public async has (key: string): Promise<boolean> {
    super._isKeyAcceptable(key)
    if (await this.get(key) === undefined) return false
    return true
  }

  /**
   * Retrieves all known keys from the storage driver.
   *
   * @returns - An array of all known keys in no particular order.
   */
  public async keys (): Promise<string[]> {
    return Array.from(this.map.keys())
  }

  /**
   * Insert the provided value at the referenced key.
   *
   * @param key - The referenced key to insert the value in the storage driver.
   * @param value - The provided value to insert at the referenced key.
   * @param options - The MapperOptions to control the aspects of the stored key.
   */
  public async set (key: string, value: unknown, options?: MapperOptions): Promise<void> {
    super._isKeyAcceptable(key)

    await this.map.set(key, {
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      key,
      createdAt: DateTime.local().toUTC().toISO(),
      encoder: {
        use: false,
        store: 'utf-8',
        parse: 'utf-8'
      }
    })
  }
}
