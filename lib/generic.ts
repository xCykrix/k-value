import { DateTime } from 'luxon'

import { InternalMapper } from './types/generics.type'
import { AdapterUtils } from './utils'

export abstract class GenericAdapter extends AdapterUtils {
  abstract configure (): Promise<void>

  /**
   * Gives each specified entry a lifetime in which it is considered valid.
   *
   * This will be used for expiring memory, and caching in the Backend Storage Adapters.
   *
   * @param row - Row to validate if the lifetime has expired.
   */
  async expired (row: InternalMapper | undefined): Promise<boolean> {
    if (row === undefined) return true
    if (row.expiresAt === undefined || row.expiresAt === null) return false

    // Date on InternalMapper Instance
    const expiry = DateTime.fromISO(row?.expiresAt).toUTC()
    const local = DateTime.local().toUTC()
    const diff = expiry.diff(local, ['milliseconds'])

    // Check for Expires Internal Cache
    if (diff?.milliseconds !== undefined && diff.milliseconds < 0) {
      return true
    }
    return false
  }
}
