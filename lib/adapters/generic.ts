import { fromJSON, toJSON } from 'javascript-serializer'
import { DateTime } from 'luxon'

import { MapAPI } from '../builder/map'
import { IValueTable } from '../builder/sql'
import { InternalMapper } from '../types/generics.types'

import { escape } from 'sqlstring'

export abstract class GenericAdapter extends MapAPI {
  /** Abstract State Configuration - Optional */
  abstract configure (): Promise<void>
  /** Abstract Close State - Optional */
  abstract close (): Promise<void>

  /**
   *
   * @param state - InternalMapper Instance to Serialize
   *
   * @returns - The JSON.stringify of the Deserialized Instance.
   *
   * @readonly
   * @sealed
   */
  _serialize (state: InternalMapper): string {
    return escape(JSON.stringify(toJSON(state)))
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
  _deserialize (state: IValueTable): InternalMapper | undefined {
    if (state === undefined || state.value === undefined) return undefined
    return fromJSON(JSON.parse(state.value))
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
  _isMapperExpired (state: InternalMapper | undefined): boolean {
    if (state === undefined) return true
    if (state.lifetime === undefined || state.lifetime === null) return false

    // Date on InternalMapper Instance
    const expiry = DateTime.fromISO(state?.lifetime).toUTC()
    const local = DateTime.local().toUTC()
    const diff = expiry.diff(local, ['milliseconds'])

    // Check for Expires Internal Cache
    if (diff?.milliseconds !== undefined && diff.milliseconds < 0) {
      return true
    }
    return false
  }

  /**
   * Validate the user input key.
   *
   * @param key - The key to be validated.
   */
  _isKeyAcceptable (key: string): void {
    if (typeof key !== 'string') throw new Error('InvalidState: key must be a valid string')
    if (key.length === 0 || key.trim() === '') throw new Error('InvalidState: key must be greater than 0 and less than 192 characters')
  }
}
