import { dw } from "./dw.util"



// ==============================>
// ## DW / OLAP : Migration
// ==============================>
export abstract class Migration {
  raw(query: string) {
    return this.exec(query)
  }

  protected async exec(query: string) {
    return dw.raw(query).execute()
  }

  createTable(
    name: string,
    callback: (table: TableBuilder) => void,
    options?: Partial<TableOptions>
  ) {
    const builder = new TableBuilder(name)
    callback(builder)
    const sql = builder.build(options)
    return this.exec(sql)
  }

  dropTable(name: string) {
    return this.exec(`DROP TABLE IF EXISTS ${name}`)
  }

  alterTable(
    name: string,
    callback: (alter: AlterBuilder) => void
  ) {
    const builder = new AlterBuilder(name)
    callback(builder)
    const sql = builder.build()
    return this.exec(sql)
  }
}



// ====================================>
// ## Table Builder (CREATE TABLE)
// ====================================>
export interface TableOptions {
  engine: string
  orderBy: string[]
  partitionBy?: string
  ttl?: string
}

export class TableBuilder {
  private table: string
  private columns: string[] = []

  constructor(table: string) {
    this.table = table
  }

  string(name: string) {
    this.columns.push(`${name} String`)
  }

  uint64(name: string) {
    this.columns.push(`${name} UInt64`)
  }

  int32(name: string) {
    this.columns.push(`${name} Int32`)
  }

  dateTime(name: string) {
    this.columns.push(`${name} DateTime`)
  }

  build(options?: Partial<TableOptions>) {
    const engine = options?.engine || "MergeTree"
    const orderBy = options?.orderBy?.join(", ") || "id"
    const partition = options?.partitionBy ? `PARTITION BY ${options.partitionBy}` : ""
    const ttl = options?.ttl ? `TTL ${options.ttl}` : ""

    return `
      CREATE TABLE IF NOT EXISTS ${this.table} (
        ${this.columns.join(",\n        ")}
      )
      ENGINE = ${engine}
      ${partition}
      ORDER BY (${orderBy})
      ${ttl}
    `.trim()
  }
}




// ====================================>
// ## Alter Builder (ALTER TABLE)
// ====================================>
export class AlterBuilder {
  private table: string
  private actions: string[] = []

  constructor(table: string) {
    this.table = table
  }

  addColumn(name: string, type: string, defaultValue?: any) {
    const def = defaultValue !== undefined ? ` DEFAULT ${this.format(defaultValue)}` : ""
    this.actions.push(`ADD COLUMN IF NOT EXISTS ${name} ${type}${def}`)
  }

  dropColumn(name: string) {
    this.actions.push(`DROP COLUMN IF EXISTS ${name}`)
  }

  modifyColumn(name: string, newType: string) {
    this.actions.push(`MODIFY COLUMN ${name} ${newType}`)
  }

  commentColumn(name: string, comment: string) {
    this.actions.push(`COMMENT COLUMN ${name} '${comment.replace(/'/g, "''")}'`)
  }

  private format(value: any) {
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`
    if (value === null) return "NULL"
    if (typeof value === "boolean") return value ? "1" : "0"
    return value
  }

  build() {
    return `ALTER TABLE ${this.table} \n${this.actions.join("\n")} `
  }
}