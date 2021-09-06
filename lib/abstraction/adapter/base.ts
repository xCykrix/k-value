import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime, Duration } from 'luxon'
import { recursive } from 'merge'
import { shuffle } from '../../util/shuffle'
import type { EncoderOptions, LimiterOptions, SetOptions } from '../base'
import { MapLikeAPI } from '../base'
import { MemcacheTimeout } from '../cache'

export abstract class BaseAdapter extends MapLikeAPI {
  protected readonly memcache = new MemcacheTimeout()

  public _make (value: unknown, options?: SetOptions, encoding?: EncoderOptions): InternalMapper {
    encoding = encoding ?? {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
    encoding.use = encoding.use ?? true
    encoding.store = encoding.store ?? 'base64'
    encoding.parse = encoding.parse ?? 'utf-8'

    return {
      ctx: value,
      lifetime: (options?.lifetime !== undefined ? DateTime.local().toUTC().plus(Duration.fromObject({ milliseconds: options.lifetime })).toUTC().toISO() : null),
      createdAt: DateTime.local().toUTC().toISO(),
      encoder: encoding
    }
  }

  public async _merge (use: boolean | undefined, key: string, next: unknown): Promise<unknown> {
    if (use === undefined || !use) return next
    if (next === null || typeof next !== 'object') return next
    const current = await this.get(key, { cache: false })
    if (current === null || typeof current !== 'object') return next
    return recursive(true, current, next) as unknown
  }

  public _apply_limit<T> (value: T[], options: LimiterOptions | undefined): T[] {
    if (options?.randomize === true) {
      value = shuffle(value)
    }
    if (options?.limit !== undefined && options.limit > 0) {
      value = value.slice(0, options.limit as number | undefined ?? value.length)
    }
    return value
  }

  public async _import (key: string, state: KValueEntry | undefined): Promise<InternalMapper | undefined> {
    if (state === undefined || state.value === undefined || state.value === null) return undefined
    const context: InternalMapper = fromJSON(JSON.parse(state.value)) as InternalMapper

    if (context.encoder?.use === true) {
      const ctx = context.ctx as { save: string; }
      context.ctx = fromJSON(JSON.parse(Buffer.from(ctx.save, context.encoder.store ?? 'base64').toString(context.encoder.parse ?? 'utf-8')))
    }

    if (await this._lifetime(key, context)) context.ctx = undefined

    return context
  }

  public _export (state: InternalMapper): string {
    if (state.encoder?.use === true) {
      state.ctx = { save: Buffer.from(JSON.stringify(toJSON(state.ctx))).toString(state.encoder.store ?? 'base64') }
    }

    return JSON.stringify(toJSON(state))
  }

  public _validate (id: string | string[], zeroFill?: boolean): void {
    if (Array.isArray(id)) {
      if (id.length === 0 && zeroFill !== true) throw new Error('ValidationError - id must contain at least one entry as an Array.')
      for (const i of id) {
        if (typeof i !== 'string') throw new Error('ValidationError - id must be a valid string.')
        if (i.length === 0 || i.length > 192 || i.trim() === '') throw new Error('ValidationError - id must be 1 through 192 characters in length.')
      }
    } else {
      if (typeof id !== 'string') throw new Error('ValidationError - id must be a valid string.')
      if (id.length === 0 || id.length > 192 || id.trim() === '') throw new Error('ValidationError - id must be 1 through 192 characters in length.')
    }
  }

  public async _lifetime (id: string, state: InternalMapper | undefined): Promise<boolean> {
    if (state === undefined) return true
    if (state.lifetime === undefined || state.lifetime === null) return false

    const future = DateTime.fromISO(state.lifetime).toUTC()
    const current = DateTime.local().toUTC()
    const difference = future.diff(current, ['milliseconds'])

    if (difference.milliseconds < 0) {
      await this.delete(id)
      return true
    } else return false
  }

  public abstract close (): Promise<void>
  public abstract configure (): Promise<void>
}

/** The representation of the KValue Table */
export interface KValueEntry {
  key: string
  value: string | undefined | null
}

/** The representation of the Internal Mapping Instance */
export interface InternalMapper {
  createdAt: string
  ctx: unknown
  encoder?: EncoderOptions
  lifetime?: string | null
}
