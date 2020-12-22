import { Sql, TableWithColumns } from 'sql-ts'

export class SQLBuilder {
  private readonly sql: Sql

  constructor (engine: 'mysql' | 'sqlite') {
    this.sql = new Sql(engine)
  }

  getKTable (table: string): TableWithColumns<IKeyTable> {
    return this.sql.define<IKeyTable>({
      name: (table === undefined || table === '' ? 'global_map' : table + '_map'),
      columns: [{
        name: 'key',
        primaryKey: true,
        dataType: 'VARCHAR(192)'
      }]
    })
  }

  getVTable (table: string): TableWithColumns<IValueTable> {
    return this.sql.define<IValueTable>({
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
export interface IKeyTable {
  key: string
}

// Value Table Definition
export interface IValueTable {
  key: string
  value: string | undefined
}
