import { createClient } from '@clickhouse/client'



// ==============================>
// ## DA / OLAP : ClickHouse Init
// ==============================>
export const daClient = createClient({
  url        : "http://" + (process.env.DA_HOST      || '127.0.0.1') + ':' + (process.env.DW_PORT || '8123'),
  username   : process.env.DA_USERNAME   || 'default',
  password   : process.env.DA_PASSWORD   || '',
  database   : process.env.DA_DATABASE   || 'default',
})


// ==============================>
// ## DA / OLAP : Query Builder
// ==============================>
type WhereValue = string | number | boolean | null

export class DABuilder {
  private _insertData: any[] | null = null
  private _updateData: Record<string, any> | null = null
  private _delete = false
  private _select: string[] = []
  private _from = ""
  private _where: string[] = []
  private _order: string[] = []
  private _limit?: number
  private _offset?: number
  private _raw?: string

  select(...cols: string[]) {
    this._select = cols.length ? cols : ["*"]
    return this
  }

  from(table: string) {
    this._from = table
    return this
  }

  where(col: string, op: string, value: WhereValue) {
    const val = typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : value === null ? "NULL" : value

    this._where.push(`${col} ${op} ${val}`)
    return this
  }

  orderBy(col: string, direction: "asc" | "desc" = "asc") {
    this._order.push(`${col} ${direction.toUpperCase()}`)
    return this
  }

  limit(n: number) {
    this._limit = n
    return this
  }

  offset(n: number) {
    this._offset = n
    return this
  }

  raw(query: string) {
    this._raw = query
    return this
  }

  private formatValue(value: any) {
    if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`
    if (value === null) return "NULL"
    if (typeof value === "boolean") return value ? "1" : "0"
    return value
  }

  insert(data: Record<string, any> | Record<string, any>[]) {
    this._insertData = Array.isArray(data) ? data : [data]
    return this
  }

  update(data: Record<string, any>) {
    this._updateData = data
    return this
  }

  delete() {
    this._delete = true
    return this
  }

  toSQL() {
    if (this._raw) return this._raw

    if (!this._from) throw new Error("Missing FROM clause.")

    if (this._insertData) {
      const cols = Object.keys(this._insertData[0])
      const values = this._insertData.map(row => `(${cols.map(c => this.formatValue(row[c])).join(", ")})`).join(", ")

      return `INSERT INTO ${this._from} (${cols.join(", ")}) VALUES ${values}`
    }

    if (this._updateData) {
      const sets = Object.entries(this._updateData).map(([k, v]) => `${k} = ${this.formatValue(v)}`).join(", ")

      let sql = `ALTER TABLE ${this._from} UPDATE ${sets}`
      if (this._where.length) sql += ` WHERE ${this._where.join(" AND ")}`
      return sql
    }

    if (this._delete) {
      let sql = `ALTER TABLE ${this._from} DELETE`
      if (this._where.length) sql += ` WHERE ${this._where.join(" AND ")}`

      return sql
    }

    const selectClause = this._select.length ? this._select.join(", ") : "*"
    let sql = `SELECT ${selectClause} FROM ${this._from}`

    if (this._where.length) sql += ` WHERE ${this._where.join(" AND ")}`
    if (this._order.length) sql += ` ORDER BY ${this._order.join(", ")}`
    if (this._limit !== undefined) sql += ` LIMIT ${this._limit}`
    if (this._offset !== undefined) sql += ` OFFSET ${this._offset}`

    return sql
  }

  async execute() {
    const query = this.toSQL()
    return daClient.query({ query })
  }

  async get<T = any>() {
    const res = await this.execute()
    const json: any = await res.json()

    return json as T[]
  }

  async first<T = any>() {
    const rows = await this.limit(1).get<T>()
    return (rows as any)[0] ?? null
  }
}

export const da = {
  query() {
    return new DABuilder()
  },

  from(table: string) {
    return new DABuilder().from(table)
  },

  raw(query: string) {
    return new DABuilder().raw(query)
  }
}