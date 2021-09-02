import { DateTime, Duration } from 'luxon'
import type { GetOptions, InternalMapper, MapperOptions } from '../types/generic'
import { GenericAdapter } from '../abstraction/api'

export class MemoryAdapter extends GenericAdapter {
  /** Internal Storage Map */
  private readonly map = new Map<string, InternalMapper>()

  /** Method not Implemented */
  public async close (): Promise<void> { /** */ }
  /** Method not Implemented */
  public async configure (): Promise<void> { /** */ }

  /**
   * Permanently removes all ids from the storage driver.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async clear (): Promise<void> {
    this.map.clear()
  }

  /**
   * Permanently removes the specified id from the storage driver.
   *
   * @param id - The id to remove from the storage adapter.
   * @returns - If the value assigned to the id was deleted.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async delete (id: string): Promise<boolean> {
    super._isIDAcceptable(id)
    return this.map.delete(id)
  }

  /**
   * Retrieves the value assigned to the requested id or Array<id1, id2, ...> from the storage driver.
   *
   * @param id - The id to obtain from the storage driver.
   * @param options - [optional] Additional options to control defaulting and caching, if applicable.
   * @returns - The value assigned to the id.
   */
  public async get (id: string | string[], options?: GetOptions): Promise<unknown | unknown[]> {
    super._isIDAcceptable(id)

    if (!Array.isArray(id)) {
      const value = this.map.get(id as unknown as string)
      if (value === undefined || value.ctx === undefined) return options?.default

      if (super._isMapperExpired(value)) {
        await this.delete(id as unknown as string)
        return options?.default
      }

      return value.ctx
    } else {
      const response = []

      for (const subId of id) {
        const value = this.map.get(subId)
        if (value === undefined || value.ctx === undefined) {
          response.push({
            key: subId,
            value: options?.default
          })
          continue
        }

        if (super._isMapperExpired(value)) {
          await this.delete(subId)
          response.push({
            key: subId,
            value: options?.default
          })
          continue
        }

        response.push({
          key: subId,
          value: value.ctx
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
  // eslint-disable-next-line @typescript-eslint/require-await
  public async keys (): Promise<string[]> {
    return Array.from(this.map.keys())
  }

  /**
   * Insert the provided value at the id.
   *
   * @param id - The id to insert the value in the storage driver.
   * @param value - The provided value to insert for the id.
   * @param options - The MapperOptions to control the storage aspects of the id and value.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  public async set (id: string, value: unknown, options?: MapperOptions): Promise<void> {
    super._isIDAcceptable(id)

    this.map.set(id, {
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      key: id,
      createdAt: DateTime.local().toUTC().toISO(),
      encoder: {
        use: false,
        store: 'utf-8',
        parse: 'utf-8'
      }
    })
  }
}
