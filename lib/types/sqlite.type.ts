import { PathLike } from 'fs'

import { GenericOptions } from './generics.type'

export interface SQLite3Options extends GenericOptions {
  file: PathLike
  options?: {
    backupInterval?: number
  }
}
