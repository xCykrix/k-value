export interface InternalMapper {
  key: string
  ctx: any
  lifetime: string | null
  createdAt: string
  modifiedAt: string
}

export interface MapperOptions {
  lifetime: number
}

export interface GenericOptions {
  namespace: string | 'global'
}
