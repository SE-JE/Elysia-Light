import { createClient } from '@clickhouse/client'



// ==============================>
// ## DA / OLAP : ClickHouse Init
// ==============================>
export const daClient = createClient({
  url        : "http://" + (process.env.DA_HOST      || '127.0.0.1') + ':' + (process.env.DA_PORT || '8123'),
  username   : process.env.DA_USERNAME   || 'default',
  password   : process.env.DA_PASSWORD   || '',
  database   : process.env.DA_DATABASE   || 'default',
})


// ==============================>
// ## DA / OLAP : Query Builder
// ==============================>
type WhereValue = string | number | boolean | null

class QueryBuilder {
  private selectCols: string[] = ["*"]
  private fromTable = ""
  private whereClauses: string[] = []
  private orderClauses: string[] = []
  private limitValue?: number
  private offsetValue?: number

  select(...cols: string[]) {
    if (cols.length) this.selectCols = cols
    return this
  }

  from(table: string) {
    this.fromTable = table
    return this
  }

  where(col: string, op: string, value: WhereValue) {
    const v = value === null ? "NULL" : typeof value === "string" ? `'${value.replace(/'/g, "''")}'` : value

    this.whereClauses.push(`${col} ${op} ${v}`)
    return this
  }

  orderBy(col: string, dir: "asc" | "desc" = "asc") {
    this.orderClauses.push(`${col} ${dir.toUpperCase()}`)
    return this
  }

  limit(n: number) {
    this.limitValue = n
    return this
  }

  offset(n: number) {
    this.offsetValue = n
    return this
  }

  toSQL() {
    if (!this.fromTable) throw new Error("FROM table is required")

    let sql = `SELECT ${this.selectCols.join(", ")} FROM ${this.fromTable}`

    if (this.whereClauses.length) sql += ` WHERE ${this.whereClauses.join(" AND ")}`
    if (this.orderClauses.length) sql += ` ORDER BY ${this.orderClauses.join(", ")}`
    if (this.limitValue !== undefined) sql += ` LIMIT ${this.limitValue}`
    if (this.offsetValue !== undefined) sql += ` OFFSET ${this.offsetValue}`

    return sql
  }

  async get<T = any>() {
    const rs = await daClient.query({
      query: this.toSQL(),
      format: "JSONEachRow",
    })

    const text = await rs.text()
    if (!text.trim()) return []

    return text.trim().split("\n").map(line => JSON.parse(line)) as T[]
  }

  async first<T = any>() {
    const rows = await this.limit(1).get<T>()
    return rows[0] ?? null
  }
}

export const da = {
  // =========================
  // ## Select
  // =========================
  select(...cols: string[]) {
    return new QueryBuilder().select(...cols)
  },

  from(table: string) {
    return new QueryBuilder().from(table)
  },


  // =========================
  // ## Insert
  // =========================
  insert<T extends Record<string, any>>(table: string, rows: T | T[]) {
    const data = Array.isArray(rows) ? rows : [rows]

    return daClient.insert({
      table,
      values: data,
      format: "JSONEachRow",
    })
  },


  // =========================
  // ## Exec query raw
  // =========================
  exec(sql: string) {
    return daClient.command({ query: sql })
  },
}