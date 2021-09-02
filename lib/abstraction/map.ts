import type { GetOptions, MapperOptions } from '../types/generic'

export abstract class MapAPI {
  /**
   * Permanently removes all ids from the storage driver.
   */
  public abstract clear (): Promise<void>

  /**
   * Permanently removes the specified id from the storage driver.
   *
   * @param id - The id to remove from the storage adapter.
   * @returns - If the value assigned to the id was deleted.
   */
  public abstract delete (id: string): Promise<boolean>

  /**
   * Retrieves the value assigned to the requested id or Array<id1, id2, ...> from the storage driver.
   *
   * @param id - The id to obtain from the storage driver.
   * @param options - [optional] Additional options to control defaulting and caching, if applicable.
   * @returns - The value assigned to the id.
   */
  public abstract get (id: string | string[], options?: GetOptions): Promise<unknown | unknown[] | undefined>

  /**
   * Asserts if the storage driver contains the supplied id.
   *
   * @param id - The id to validate existence for in the storage driver.
   * @returns - If the id exists.
   */
  public abstract has (id: string): Promise<boolean>

  /**
   * Retrieves all known ids from the storage driver.
   *
   * @returns - An array of all known ids, order is not guaranteed.
   */
  public abstract keys (): Promise<string[]>

  /**
   * Insert the provided value at the id.
   *
   * @param id - The id to insert the value in the storage driver.
   * @param value - The provided value to insert for the id.
   * @param options - The MapperOptions to control the storage aspects of the id and value.
   */
  public abstract set (id: string, value: unknown, options?: MapperOptions): Promise<void>

  /**
   * This feature of the Map API has been disabled for performance reasons.
   *
   * If you seriously need to iterate your entire database, use Adapter#keys() and iterate with Adapter#get()
   * Massive amounts of queries can have performance implications and is generally discouraged.
   *
   * LARGE_VOLUME_QUERIES
   * CONSECUTIVE_QUERIES
   *
   * @param callbackfn - null
   * @param thisArg - null
   *
   * @private
   * @sealed
   */
  private forEach (callbackfn: (value: unknown, id: string, map: Map<string, unknown>) => void, thisArg?: unknown): void {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#keys() -> Adapter#get())')
  }

  /**
   * This feature of the Map API has been disabled for performance reasons.
   *
   * If you seriously need to iterate your entire database, use Adapter#keys() and iterate with Adapter#get()
   * Massive amounts of queries can have performance implications and is generally discouraged.
   *
   * LARGE_VOLUME_QUERIES
   * CONSECUTIVE_QUERIES
   *
   * @private
   * @sealed
   */
  private entries (): IterableIterator<[string, unknown]> {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#keys() -> Adapter#get())')
  }

  /**
   * This feature of the Map API has been disabled for performance reasons.
   *
   * If you seriously need to iterate your entire database, use Adapter#keys() and iterate with Adapter#get()
   * Massive amounts of queries can have performance implications and is generally discouraged.
   *
   * LARGE_VOLUME_QUERIES
   * CONSECUTIVE_QUERIES
   *
   * @private
   * @sealed
   */
  private values (): IterableIterator<unknown> {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#keys() -> Adapter#get())')
  }

  /**
   * This feature of the Map API has been disabled for performance reasons.
   *
   * If you seriously need to iterate your entire database, use Adapter#keys() and iterate with Adapter#get()
   * Massive amounts of queries can have performance implications and is generally discouraged.
   *
   * LARGE_VOLUME_QUERIES
   * CONSECUTIVE_QUERIES
   *
   * @private
   * @sealed
   */
  private [Symbol.iterator] (): IterableIterator<[string, unknown]> {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#keys() -> Adapter#get())')
  }
}
