import type { Encoding } from 'crypto'
import type { CacheOptions } from './cache'

export abstract class MapLikeAPI {
  /**

   */
  public abstract clear (): Promise<void>

  /**

   */
  public abstract delete (id: string | string[]): Promise<void>

  /**

   */
  public abstract get (id: string | string[], options?: GetOptions): Promise<unknown | unknown[] | undefined>

  /**

   */
  public abstract has (id: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>>

  /**

   */
  public abstract keys (limits?: LimiterOptions): Promise<string[]>

  /**

   */
  public abstract set (id: string, value: unknown, options?: SetOptions): Promise<void>

  /**

   */
  public abstract entries (limits?: LimiterOptions): Promise<Array<[string, unknown]>>

  /**

   */
  public abstract values (limits?: LimiterOptions): Promise<unknown[]>

  private forEach (callbackfn: (value: unknown, id: string, map: Map<string, unknown>) => void, thisArg?: unknown): void {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#entries())')
  }

  private [Symbol.iterator] (): IterableIterator<[string, unknown]> {
    throw new Error('[err] This is not a complete implementation of the Map API. For performance reasons, this function has been disabled. (Alternatives: Adapter#entries())')
  }
}

/** The representation of the Generic Setter Options */
export interface SetOptions {
  lifetime?: number
  merge?: boolean
}

/** The representation of the Get Options */
export interface GetOptions extends CacheOptions {
  default?: unknown
}

/** The representation of the Limiter Options */
export interface LimiterOptions {
  limit?: number
  randomize?: boolean
}

/** The representation of the Encoder Options */
export interface EncoderOptions {
  parse: Encoding | undefined
  store: Encoding | undefined
  use: boolean | undefined
}

/** The representation of the Internal Mapping Instance */
export interface InternalMapper {
  createdAt: string
  ctx: unknown
  encoder?: EncoderOptions
  lifetime?: string | null
}
