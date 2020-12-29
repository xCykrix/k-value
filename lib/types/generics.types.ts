/** The representation of the Internal Mapping Instance */
export interface InternalMapper {
  key: string
  ctx: any
  lifetime: string | null
  createdAt: string
}

/** The representation of the Generic Setter Options */
export interface MapperOptions {
  lifetime: number
}

/** The representation of the Generic Adapter Options */
export interface DBGeneric {
  table: string | 'global'
}
