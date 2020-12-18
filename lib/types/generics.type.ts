export interface InternalMapper {
  key: string
  ctx: any
  lifetime: string | null
  modifiedAt: string
}

export interface MapperOptions {
  lifetime: number
}
