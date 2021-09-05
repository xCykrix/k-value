
export class MemcacheTimeout {
  private readonly cache: Map<string, unknown> = new Map()

  public get (key: string): unknown {
    const item = this.cache.get(key) as { value: unknown; timeout: number; }
    if (Date.now() >= item.timeout) {
      this.cache.delete(key)
      return undefined
    } else return item.value
  }

  public set (key: string, value: unknown, timeout: number | undefined): void {
    this.cache.set(key, { value, timeout: Date.now() + (timeout ?? 30000) })
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
