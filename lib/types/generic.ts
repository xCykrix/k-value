import type { Encoding } from 'crypto'

/** The representation of the Internal Mapping Instance */
export interface InternalMapper {
  createdAt: string
  ctx: unknown
  encoder?: {
    parse: Encoding
    store: Encoding
    use: boolean
  }
  key: string
  lifetime: string | undefined | null
}

/** The representation of the Generic Setter Options */
export interface MapperOptions {
  lifetime?: number
  merge?: boolean
}

/** The representation of the Get Options */
export interface GetOptions {
  default?: unknown
  cache?: boolean
}
