import { PathLike } from 'fs'

import { DBGeneric } from './generics.type'

export interface SQLite3Options extends DBGeneric {
  file: PathLike
  options?: {
    backupInterval?: number
  }
}
