import type { KValueEntry } from './adapter/base'

export class MemcacheTimeout {
  private readonly cache: Map<string, { kValueEntry: KValueEntry; timeout: number; }> = new Map()

  public get (key: string): KValueEntry | undefined {
    const item = this.cache.get(key) as { kValueEntry: KValueEntry; timeout: number; }
    if (Date.now() >= item.timeout) {
      this.cache.delete(key)
      return undefined
    } else return item.kValueEntry
  }

  public set (key: string, kValueEntry: KValueEntry, timeout: number | undefined): void {
    this.cache.set(key, { kValueEntry, timeout: Date.now() + (timeout ?? 30000) })
  }

  public has (key: string): boolean {
    return this.cache.has(key)
  }

  public delete (key: string): void {
    this.cache.delete(key)
  }

  public clear (): void {
    this.cache.clear()
  }
}

/** The representation of the Cache Options */
export interface CacheOptions {
  cache?: boolean
  cacheExpire?: number
}
