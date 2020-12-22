export interface InternalMapper {
  key: string
  ctx: any
  lifetime: string | null
  createdAt: string
}

export interface MapperOptions {
  lifetime: number
}

export interface DBGeneric {
  table: string | 'global'
}
