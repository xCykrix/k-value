import { Encoding } from 'crypto'
import { PathLike } from 'fs'

import { DBGeneric } from './generics.t'

/** The representation of the SQLite Adapter Options */
export interface SQLite3Options extends DBGeneric {
  file: PathLike
  encoder: {
    use: boolean
    store: Encoding
    parse: Encoding
  }
}
