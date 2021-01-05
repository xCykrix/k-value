import { Encoding } from 'crypto'

/** The representation of the Get Options */
export interface GetOptions {
  default: any
}

/** The representation of the Internal Mapping Instance */
export interface InternalMapper {
  key: string
  ctx: any
  lifetime: string | null
  createdAt: string
  encoder: {
    use: boolean
    store: Encoding
    parse: Encoding
  }
}

/** The representation of the Generic Setter Options */
export interface MapperOptions {
  lifetime: number
}

/** The representation of the Generic Adapter Options */
export interface DBGeneric {
  table: string | 'global'
}
