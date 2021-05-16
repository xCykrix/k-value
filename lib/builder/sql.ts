import type { TableWithColumns } from 'sql-ts'
import { Sql } from 'sql-ts'

export class SQLBuilder {
  /** The sql-ts LIbrary Instance */
  private readonly sql: Sql

  /**
   * Initialize the selected SQL engine builder.
   *
   * @param engine - The sql adapting engine to instantiate.
   */
  public constructor (engine: 'mysql' | 'sqlite') {
    this.sql = new Sql(engine)
  }

  /**
   * Returns the pre-initialized instance of the SQL definition for the ValueTable.
   *
   * @param table - The table to target for initialization.
   *
   * @returns - The TableWithColumns representation of ValueTable.
   */
  public getVTable (table: string | undefined): TableWithColumns<IValueTable> {
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

/** Representation of the ValueTable */
export interface IValueTable {
  key: string
  value: string | undefined
}
