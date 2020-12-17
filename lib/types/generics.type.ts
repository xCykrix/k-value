export interface InternalMapper {
  ctx: any
  expiresAt: string | null
  key: string
  modifiedAt: string
}

export interface Setter {
  expiresIn: number
}
