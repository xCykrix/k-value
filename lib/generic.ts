import { DateTime } from 'luxon'

import { InternalMapper } from './types/generics.type'
import { AdapterUtils } from './utils'

export abstract class GenericAdapter extends AdapterUtils {
  abstract configure (): Promise<void>

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
  async expired (state: InternalMapper | undefined): Promise<boolean> {
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
}
