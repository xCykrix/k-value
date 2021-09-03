import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime } from 'luxon'
import { MapAPI } from './map'
import type { GetOptions, InternalMapper, MapperOptions } from '../types/generic'
import type { KValueTable } from '../types/sql'
import { MemoryAdapter } from '../adapters/memory'

export abstract class GenericAdapter extends MapAPI {
  private _cache_map: MemoryAdapter | null = null

  /**
   *
   * @param state - InternalMapper Instance to Serialize
   *
   * @returns - The JSON.stringify of the Deserialized Instance.
   *
   * @readonly
   * @sealed
   */
  public _serialize (state: InternalMapper): string {
    if (state.encoder?.use === true) {
      // Convert JS to Serialized, Stringify JSON
      state.ctx = { save: Buffer.from(JSON.stringify(toJSON(state.ctx))).toString(state.encoder.store) }
    }

    return JSON.stringify(toJSON(state))
  }

  /**
   *
   * @param state - IValueTable Instance to Deserialize
   *
   * @returns - The JSON.parse of the Serialized Instance.
   *
   * @readonly
   * @sealed
   */
  public _deserialize (state: KValueTable | undefined): InternalMapper | undefined {
    if (state === undefined || state.value === undefined) return undefined
    const response = fromJSON(JSON.parse(state.value)) as InternalMapper

    if (response.encoder?.use === true) {
      // Parse JSON, Convert Serialized to JS
      const ctx = response.ctx as { save: string; }
      response.ctx = fromJSON(JSON.parse(Buffer.from(ctx.save, response.encoder.store).toString(response.encoder.parse)))
    }

    return response
  }

  /**
   * Validate the user input id.
   *
   * @param id - The id to be validated.
   */
  public _isIDAcceptable (id: string | string[]): void {
    if (Array.isArray(id)) {
      // The input was an array of ids. Validate each entry.
      if (id.length === 0) throw new Error('InvalidState: id array must contain at least 1 entry')
      for (let i = 0; i < id.length; i++) {
        const k = id[i]
        if (typeof k !== 'string') throw new Error(`InvalidState[index:${i}]: id must be a valid string`)
        if (k.length === 0 || k.trim() === '') throw new Error('InvalidState: id must be greater than 0 and less than 192 characters')
      }
    } else {
      // The input was singular. Verify the input.
      if (typeof id !== 'string') throw new Error('InvalidState: id must be a valid string')
      if (id.length === 0 || id.trim() === '') throw new Error('InvalidState: id must be greater than 0 and less than 192 characters')
    }
  }

  /**
   * Checks the specified entry for its lifetime in which it is considered valid.
   *
   * This will be used for expiring memory, and caching in the Backend Storage Adapters.
   *
   * @param state - Row to validate if the lifetime has expired.
   *
   * @returns - If the InternalMapper state provided is expired or not.
   *
   * @readonly
   * @sealed
   */
  public _isMapperExpired (state: InternalMapper | undefined): boolean {
    if (state === undefined) return true
    if (state.lifetime === undefined || state.lifetime === null) return false

    // Date on InternalMapper Instance
    const expiry = DateTime.fromISO(state.lifetime).toUTC()
    const local = DateTime.local().toUTC()
    const diff = expiry.diff(local, ['milliseconds'])

    // Check for Expires Internal Cache
    if (diff.milliseconds < 0) {
      return true
    }
    return false
  }

  public _enable_cache (): void {
    if (this._cache_map === null) this._cache_map = new MemoryAdapter()
  }

  public _enabled_cache (): boolean {
    return this._cache_map !== null
  }

  public async _cache (id: string, value: unknown, options?: MapperOptions): Promise<void> {
    if (options === undefined) options = { lifetime: 60000 }
    await this._cache_map?.set(id, value, options)
  }

  public async _get_cache (id: string, options?: GetOptions): Promise<unknown> {
    return await this._cache_map?.get(id, options)
  }

  public async _check_cache (id: string): Promise<boolean | undefined> {
    return await this._cache_map?.has(id)
  }

  public async _invalidate (id: string): Promise<void> {
    await this._cache_map?.delete(id)
  }

  /** Abstract Close State - Optional */
  abstract close (): Promise<void>
  /** Abstract State Configuration - Optional */
  abstract configure (): Promise<void>
}
