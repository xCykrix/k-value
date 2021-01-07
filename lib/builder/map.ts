import { GetOptions, MapperOptions } from '../types/generics.t'
export abstract class MapAPI {
  /**
   * Permanently removes all entries from the Storage Backend Adapter.
   */
  abstract clear (): Promise<void>

  /**
   * Permanently removes a specific key value pair from the Storage Backend Adapter for the provided key index.
   *
   * @param key - The key index for the respective value.
   *
   * @returns - Boolean stating if any changes were made to the database.
   */
  abstract delete (key: string): Promise<boolean>

  /**
   * Obtains a specific value from the Storage Backend Adapter for the provided key index.
   *
   * @param key - The key index for the respective value.
   *
   * @returns - The value associated with the key index. If no value exists, this will return null.
   */
  abstract get (key: string | string[], options?: GetOptions): Promise<any | any[] | undefined>

  /**
   * Checks the provided key for if its respective value exists on the configured Storage Backend Adapter.
   *
   * @param key - The key index for the respective value.
   *
   * @returns - Boolean stating if the Storage Backend Adapter has knowledge of the key and has data is attached to it.
   */
  abstract has (key: string): Promise<boolean>

  /**
   * Obtains the entire known list of keys from the master table. This table is automatically rebuilt and checks for missing entries every 5 minutes.
   *
   * @returns - String[] of known keys provided by the Storage Backend Adapter.
   */
  abstract keys (): Promise<string[]>

  /**
   * Inserts the value attached to its respective key in configured Storage Backend Adapter.
   *
   * @param key - The key index for the respective value.
   * @param value - The value to be stored with the key index.
   */
  abstract set (key: string, value: any, options?: MapperOptions): Promise<void>

  /**
   * This feature of the Map API has been disabled for performance reasons.
   *
   * If you seriously need to iterate your entire database, use Adapter#keys() and iterate with Adapter#get()
   * Massive amounts of queries can have performance implications and is generally discouraged.
   *
   * LARGE_VOLUME_QUERIES
   * CONSECUTIVE_QUERIES
   *
   * @param callbackfn - VOID / NO USAGE
   * @param thisArg - VOID / NO USAGE
   */
  forEach (callbackfn: (value: any, key: string, map: Map<string, any>) => void, thisArg?: any): void {
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
   */
  entries (): IterableIterator<[string, any]> {
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
   */
  values (): IterableIterator<any> {
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
   */
  [Symbol.iterator] (): IterableIterator<[string, any]> {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#keys() -> Adapter#get())')
  }
}
