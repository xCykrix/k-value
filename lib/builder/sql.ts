import { Sql, TableWithColumns } from 'sql-ts'

export class SQLBuilder {
  /** The sql-ts LIbrary Instance */
  private readonly sql: Sql

  /**
   * Initialize the selected SQL engine builder.
   *
   * @param engine - The sql adapting engine to instantiate.
   */
  constructor (engine: 'mysql' | 'sqlite') {
    this.sql = new Sql(engine)
  }

  /**
   * Returns the pre-initialized instance of the SQL definition for the KeyTable.
   *
   * @param table - The table to target for initialization.
   *
   * @returns - The TableWithColumns representation of KeyTable.
   */
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

  /**
   * Returns the pre-initialized instance of the SQL definition for the ValueTable.
   *
   * @param table - The table to target for initialization.
   *
   * @returns - The TableWithColumns representation of ValueTable.
   */
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

/** Representation of the KeyTable */
export interface IKeyTable {
  key: string
}

/** Representation of the ValueTable */
export interface IValueTable {
  key: string
  value: string | undefined
}
