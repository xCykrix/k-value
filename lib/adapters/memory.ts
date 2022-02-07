import type { InternalMapper } from '../abstraction/adapter/base';
import { BaseAdapter } from '../abstraction/adapter/base';
import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base';

/**
 * Memory Storage Adapter.
 *
 * @remarks
 *
 * This adapter does not depend on any third party dependencies. It is used to provide a simple in-memory storage adapter.
 *
 * @category Adapter
 */
export class MemoryAdapter extends BaseAdapter {
  private readonly state = new Map<string, InternalMapper>();

  /** No-operation function. */
  public async close(): Promise<void> { /* No-operation. */ }

  /** No-operation function. */
  public async configure(): Promise<void> { /* No-operation. */ }

  /**
   * Delete all indices from the storage adapter.
   */
  // trunk-ignore(eslint/@typescript-eslint/require-await)
  public async clear(): Promise<void> {
    this.state.clear();
  }

  /**
   * Delete the specified index or indices from the storage adapter.
   *
   * @param indices The index or indices to delete.
   */
  // trunk-ignore(eslint/@typescript-eslint/require-await)
  public async delete(indices: string | string[]): Promise<void> {
    super._validate(indices);

    Array.from(Array.isArray(indices) ? indices : [indices]).forEach((k) => {
      this.state.delete(k);
    });
  }

  /**
   * Get the specified index or indices value(s) from the storage adapter.
   *
   * @param indices The index or indices to get.
   * @param options The get or cache options to apply. Optional.
   *
   * @returns The value or list of values.
   */
  public async get(indices: string | string[], options?: GetOptions): Promise<unknown | Array<{ key: string; value: unknown; }>> {
    super._validate(indices);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);
    const result: Array<{ key: string; value: unknown; }> = [];

    for (const k of where) {
      const context = this.state.get(k);
      if (context === undefined || context.ctx === undefined || await super._lifetime(k, context)) {
        result.push({ key: k, value: options?.default ?? undefined });
        continue;
      }
      result.push({ key: k, value: context.ctx });
    }

    if (result.length === 1) {
      return (result[0] ?? { value: undefined }).value;
    } else {
      return result;
    }
  }

  /**
   * Check if the specified index or indices exist on the storage adapter.
   *
   * @param indices The index or indices to check for existence.
   *
   * @returns The existence of the specified index or indices.
   */
  // trunk-ignore(eslint/@typescript-eslint/require-await)
  public async has(indices: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>> {
    super._validate(indices);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);
    const result: Array<{ key: string; has: boolean; }> = [];

    where.forEach((k) => {
      result.push({ key: k, has: this.state.has(k) });
    });

    if (result.length === 1) {
      return (result[0] ?? { has: false }).has;
    } else {
      return result;
    }
  }

  /**
   * Get the list of indices from the storage adapter.
   *
   * @param limits The limiter options to apply. Optional.
   *
   * @returns The list of indices.
   */
  // trunk-ignore(eslint/@typescript-eslint/require-await)
  public async keys(limits?: LimiterOptions): Promise<string[]> {
    const keyList = Array.from(this.state.keys());
    return this._apply_limit(keyList, limits);
  }

  /**
   * Set or update an index or indices on the storage adapter to the specified value.
   *
   * @param indices The index or indices to set or update.
   * @param value The value to be set to the indices.
   * @param options The options to apply. Optional.
   */
  public async set(indices: string | string[], value: unknown, options?: SetOptions): Promise<void> {
    super._validate(indices);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);

    for (const k of where) {
      value = await this._merge(options?.merge, k, value);
      this.state.set(k, super._make(value, options, { use: false, parse: 'utf-8', store: 'utf-8' }));
    }
  }

  /**
   * Get the index/value pairs from the storage adapter.
   *
   * @param limits The limiter options to apply. Optional.
   *
   * @returns Entries-style list of index/value pairs.
   */
  public async entries(limits?: LimiterOptions): Promise<Array<[string, unknown]>> {
    const result: Array<[string, unknown]> = [];
    let kValueEntries = await this.keys(limits);
    kValueEntries = this._apply_limit(kValueEntries, limits);

    // Index Entries
    const kValuePairs = await this.get(kValueEntries) as Array<{ key: string; value: unknown; }>;
    kValuePairs.forEach((kValuePair) => {
      result.push([kValuePair.key, kValuePair.value]);
    });

    return result;
  }

  /**
   * Get the values from all indices of the storage adapter.
   *
   * @param limits The limiter options to apply. Optional.
   *
   * @returns List of values.
   */
  public async values(limits?: LimiterOptions): Promise<unknown[]> {
    // Return just the values of #entries()
    return (await this.entries(limits)).map((v) => v[1]);
  }
}
