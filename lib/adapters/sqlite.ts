import type { KValueEntry } from '../abstraction/adapter/base';
import type { SQLite3Options } from '../abstraction/adapter/sql';
import { SQLAdapter } from '../abstraction/adapter/sql';
import type { GetOptions, LimiterOptions, SetOptions } from '../abstraction/base';
import type { CacheOptions } from '../abstraction/cache';
import { KnexHandler } from '../builder/knex';

/**
 * SQLite3 Storage Adapter.
 *
 * @remarks
 *
 * This adapter uses 'better-sqlite3' to provide a SQLite3 database. You must install this package manually.
 *
 * @category Adapter
 */
export class SQLiteAdapter extends SQLAdapter {
  protected override readonly options: SQLite3Options;

  /**
   * Initialize SQLite3 storage adapter.
   *
   * @remarks
   *
   * This adapter uses 'better-sqlite3' to provide a SQLite3 database. You must install this package manually.
   *
   * useNullAsDefault is not available for modification. It will always be set to true due to SQLite3 driver limitations.
   *
   * @param options The options used to configure the adapter.
   */
  public constructor(options: SQLite3Options & { useNullAsDefault?: boolean; }) {
    super();
    options.client = 'better-sqlite3';
    options.useNullAsDefault = true;
    options.connection.table = options.connection.table as string | null ?? 'kv_global';
    this.options = options;
    this.driver = new KnexHandler(options);
  }

  /**
   * Configure the SQLite3 storage adapter connection.
   *
   * @remarks
   *
   * This must be called before the storage adapter is available for use.
   *
   * This will configure the connection to the storage driver with the KnexHandler provider.
   */
  public async configure(): Promise<void> {
    // Initialize Table
    if (!(await this.driver.knex.schema.hasTable(this.options.connection.table))) {
      await this.driver.knex.schema.createTable(this.options.connection.table, (table) => {
        table.string('key', 192);
        table.text('value');
        table.primary(['key']);
        table.unique(['key']);
      });
    }
  }

  /**
   * Close the storage adapter connection.
   */
  public async close(): Promise<void> {
    await this.driver.knex.destroy();
  }

  /**
   * Delete all indices from the storage adapter.
   */
  public async clear(): Promise<void> {
    await this.delete(await this.keys());
  }

  /**
   * Delete the specified index or indices from the storage adapter.
   *
   * @param indices The index or indices to delete.
   */
  public async delete(indices: string | string[]): Promise<void> {
    super._validate(indices, true);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);
    await this.driver.knex(this.options.connection.table).whereIn('key', where).delete();
    where.forEach((k) => {
      this.memcache.delete(k);
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
  public async get(indices: string | string[], options?: GetOptions & CacheOptions): Promise<unknown | Array<{ key: string; value: unknown; }>> {
    super._validate(indices);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);
    const result: Array<{ key: string; value: unknown; }> = [];
    const partials: Map<string, KValueEntry> = new Map();

    where.forEach((k) => {
      const has = this.memcache.has(k);
      if ((this.options.cache === true || options?.cache === true) && has) {
        return partials.set(k, this.memcache.get(k) ?? { key: k, value: undefined });
      }
      return partials.set(k, { key: k, value: undefined });
    });

    const index = Array.from(partials).filter(p => {
      return p[1].value === undefined;
    }).map(p => p[0]);
    const pair = await this.driver.knex(this.options.connection.table).select('key', 'value').whereIn('key', index) as KValueEntry[];

    pair.forEach((kValueEntry) => {
      partials.set(kValueEntry.key, kValueEntry);
    });

    for (const partial of partials.entries()) {
      const context = await super._import(partial[0], partial[1]);
      if (context === undefined || context.ctx === undefined) {
        result.push({ key: partial[0], value: options?.default ?? undefined });
        continue;
      }
      if (((this.options.cache === true || options?.cache === true) && (options?.cache !== false))) {
        this.memcache.set(partial[0], partial[1], this.options.cacheExpire ?? options?.cacheExpire ?? 30000);
      }
      result.push({ key: partial[0], value: context.ctx });
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
  public async has(indices: string | string[]): Promise<boolean | Array<{ key: string; has: boolean; }>> {
    super._validate(indices);

    const where = Array.from(Array.isArray(indices) ? indices : [indices]);
    const keys = await this.driver.knex(this.options.connection.table).whereIn('key', where).select('key') as KValueEntry[];
    const result: Array<{ key: string; has: boolean; }> = [];

    const replica: string[] = [];
    keys.forEach((k) => {
      replica.push(k.key);
      result.push({ key: k.key, has: true });
    });
    where.forEach((k) => {
      if (!replica.includes(k)) {
        result.push({ key: k, has: false });
      }
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
  public async keys(limits?: LimiterOptions): Promise<string[]> {
    const keyList = (await this.driver.knex(this.options.connection.table).select('key') as KValueEntry[]).map((v) => v.key);
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
    const upsert: KValueEntry[] = [];

    for (const k of where) {
      if (this.memcache.has(k)) this.memcache.delete(k);
      value = await this._merge(options?.merge, k, value);

      upsert.push({
        key: k,
        value: super._export(super._make(value, options, this.options.encoder)),
      });
    }

    await this._upsert(upsert);
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
    let kValueEntries = (await this.driver.knex(this.options.connection.table).select('key') as KValueEntry[]).map((v) => { return v.key; });
    kValueEntries = this._apply_limit(kValueEntries, limits);

    // Index Entries to Result
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
