import { GenericOptions } from './generics.type'

export interface MySQL2Options extends GenericOptions {
  authentication: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  options?: {
    backupInterval?: number
  }
}
