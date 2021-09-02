import { MemoryAdapter } from './lib/adapters/memory'
import { MySQLAdapter } from './lib/adapters/mysql'
import { PostgreSQLAdapter } from './lib/adapters/postgresql'
import { SQLiteAdapter } from './lib/adapters/sqlite'
import { hook as BufferSerialize } from './lib/serialize/buffer'
import { hook as MapSerialize } from './lib/serialize/map'
import { hook as SetSerialize } from './lib/serialize/set'

BufferSerialize()
MapSerialize()
SetSerialize()

export {
  MemoryAdapter,
  MySQLAdapter,
  PostgreSQLAdapter,
  SQLiteAdapter
}
