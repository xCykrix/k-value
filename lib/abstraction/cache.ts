import type { KValueEntry } from './adapter/base';

/**
 * The abstraction used for the memory based storage adapter, build around the official Map API.
 *
 * @category Abstraction
 * @internal
 */
export class MemcacheTimeout {
  private readonly cache: Map<string, { kValueEntry: KValueEntry; timeout: number; }> = new Map();

  /** Get the respective indice. */
  public get(indice: string): KValueEntry | undefined {
    const item = this.cache.get(indice) as { kValueEntry: KValueEntry; timeout: number; };
    if (Date.now() >= item.timeout) {
      this.cache.delete(indice);
      return undefined;
    } else return item.kValueEntry;
  }

  /** Set the respective indice. */
  public set(indice: string, kValueEntry: KValueEntry, timeout: number | undefined): void {
    this.cache.set(indice, { kValueEntry, timeout: Date.now() + (timeout ?? 30000) });
  }

  /** Has the respective indice. */
  public has(indice: string): boolean {
    return this.cache.has(indice);
  }

  /** Delete the respective indice. */
  public delete(indice: string): void {
    this.cache.delete(indice);
  }

  /** Clear all indices from the cache. */
  public clear(): void {
    this.cache.clear();
  }
}

/** The representation of the CacheOptions structure. */
export interface CacheOptions {
  cache?: boolean
  cacheExpire?: number
}
