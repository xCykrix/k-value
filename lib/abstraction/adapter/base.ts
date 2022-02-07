import { fromJSON, toJSON } from 'javascript-serializer';
import { DateTime, Duration } from 'luxon';
import { recursive } from 'merge';
import { shuffle } from '../../util/shuffle';
import type { EncoderOptions, LimiterOptions, SetOptions } from '../base';
import { MapLikeAPI } from '../base';
import { MemcacheTimeout } from '../cache';

/**
 * The representative base layer for the storage adapter that contains shared components of the underlying API.
 *
 * @category Abstraction
 * @internal
 */
export abstract class BaseAdapter extends MapLikeAPI {
  protected readonly memcache = new MemcacheTimeout();

  /** Make the object to store based on options. */
  protected _make(value: unknown, options?: SetOptions, encoding?: EncoderOptions): InternalMapper {
    encoding = encoding ?? {
      use: true,
      store: 'base64',
      parse: 'utf-8',
    };
    encoding.use = encoding.use ?? true;
    encoding.store = encoding.store ?? 'base64';
    encoding.parse = encoding.parse ?? 'utf-8';

    return {
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      createdAt: DateTime.local().toUTC().toISO(),
      encoder: encoding,
    };
  }

  /** Merge two objects together based on logical detections and caching. */
  protected async _merge(use: boolean | undefined, indice: string, next: unknown): Promise<unknown> {
    if (use === undefined || !use) return next;
    if (next === null || typeof next !== 'object') return next;
    const current = await this.get(indice, { cache: false });
    if (current === null || typeof current !== 'object') return next;
    return recursive(true, current, next) as unknown;
  }

  /** Check if the limiter should be applied. If so, void out the value associated to it. */
  protected _apply_limit<T>(value: T[], options: LimiterOptions | undefined): T[] {
    if (options?.randomize === true) {
      value = shuffle(value);
    }
    if (options?.limit !== undefined && options.limit > 0) {
      value = value.slice(0, options.limit as number | undefined ?? value.length);
    }
    return value;
  }

  /** Decode the incoming InternalMapper. */
  protected async _import(indices: string, state: KValueEntry | undefined): Promise<InternalMapper | undefined> {
    if (state === undefined || state.value === undefined || state.value === null) return undefined;
    const context: InternalMapper = fromJSON(JSON.parse(state.value)) as InternalMapper;

    if (context.encoder?.use === true) {
      const ctx = context.ctx as { save: string; };
      context.ctx = fromJSON(JSON.parse(Buffer.from(ctx.save, context.encoder.store ?? 'base64').toString(context.encoder.parse ?? 'utf-8')));
    }

    if (await this._lifetime(indices, context)) context.ctx = undefined;

    return context;
  }

  /** Encode the incoming InternalMapper. */
  protected _export(state: InternalMapper): string {
    if (state.encoder?.use === true) {
      state.ctx = { save: Buffer.from(JSON.stringify(toJSON(state.ctx))).toString(state.encoder.store ?? 'base64') };
    }

    return JSON.stringify(toJSON(state));
  }


  /** Validate the incoming indices. */
  protected _validate(indices: string | string[], zeroFill?: boolean): void {
    if (Array.isArray(indices)) {
      if (indices.length === 0 && zeroFill !== true) throw new Error('ValidationError - id must contain at least one entry as an Array.');
      for (const i of indices) {
        if (typeof i !== 'string') throw new Error('ValidationError - id must be a valid string.');
        if (i.length === 0 || i.length > 192 || i.trim() === '') throw new Error('ValidationError - id must be 1 through 192 characters in length.');
      }
    } else {
      if (typeof indices !== 'string') throw new Error('ValidationError - id must be a valid string.');
      if (indices.length === 0 || indices.length > 192 || indices.trim() === '') throw new Error('ValidationError - id must be 1 through 192 characters in length.');
    }
  }

  /** Validate the lifetime of the incoming indices. */
  protected async _lifetime(indices: string, state: InternalMapper | undefined): Promise<boolean> {
    if (state === undefined) return true;
    if (state.lifetime === undefined || state.lifetime === null) return false;

    const future = DateTime.fromISO(state.lifetime).toUTC();
    const current = DateTime.local().toUTC();
    const difference = future.diff(current, ['milliseconds']);

    if (difference.milliseconds < 0) {
      await this.delete(indices);
      return true;
    } else return false;
  }

  /** No-operation requirements of the MapLikeAPI */
  public abstract close(): Promise<void>;
  public abstract configure(): Promise<void>;
}

/** The representation of the KValueEntry structure. */
export interface KValueEntry {
  key: string
  value: string | undefined | null
}

/** The representation of the InternalMapper structure. */
export interface InternalMapper {
  createdAt: string
  ctx: unknown
  encoder?: EncoderOptions
  lifetime?: string | null
}
