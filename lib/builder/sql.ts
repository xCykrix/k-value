import { Sql, TableWithColumns } from 'sql-ts'

export class SQLBuilder {
  private readonly sql: Sql

  constructor (engine: 'mysql' | 'sqlite') {
    this.sql = new Sql(engine)
  }

  getKTable (table: string): TableWithColumns<KeyTable> {
    return this.sql.define<KeyTable>({
      name: (table === undefined || table === '' ? 'global_map' : table + '_map'),
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(192)'
      }]
    })
  }

  getVTable (table: string): TableWithColumns<ValueTable> {
    return this.sql.define<ValueTable>({
      name: (table === undefined || table === '' ? 'global' : table),
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(192)'
      }, {
        name: 'value',
        dataType: 'TEXT'
      }]
    })
  }
}

// Keys Table Definition
export interface KeyTable {
  key: string
}

// Value Table Definition
export interface ValueTable {
  key: string
  value: string | undefined
}
