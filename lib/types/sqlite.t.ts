import type { Encoding } from 'crypto'
import type { PathLike } from 'fs'
import type { DBGeneric } from './generics.t'

/** The representation of the SQLite Adapter Options */
export interface SQLite3Options extends DBGeneric {
  encoder?: {
    parse: Encoding
    store: Encoding
    use: boolean
  }
  file: PathLike | undefined
}
