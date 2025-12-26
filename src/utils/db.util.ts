import knex, { Knex } from 'knex'

// ==============================
// ## Driver resolver
// ==============================
function resolveDriver(conn?: string): 'pg' | 'mysql2' {
  if (!conn) return 'pg'

  const v = conn.toLowerCase()
  if (['pg', 'pgsql', 'postgres'].includes(v)) return 'pg'
  if (['mysql', 'mysql2'].includes(v)) return 'mysql2'

  throw new Error(`Unsupported DB_CONNECTION: ${conn}`)
}

// ==============================
// ## Knex factory
// ==============================
function createKnex(config: {
  client    ?:  string
  host      ?:  string
  port      ?:  number
  user      ?:  string
  password  ?:  string
  database  ?:  string
}) :  Knex {
  const client = resolveDriver(config.client)

  return knex({
    client,
    connection: {
      host      :  config.host       ??  '127.0.0.1',
      port      :  config.port       ??  (client === 'mysql2' ? 3306 : 5432),
      user      :  config.user       ??  'postgres',
      password  :  config.password   ??  'password',
      database  :  config.database   ??  'db_elysia_light',
    },
    pool: { min: 2, max: 10 },
  })
}

// ==============================
// ## Connection registry
// ==============================
const connections: Record<string, Knex> = {}

// ==============================
// ## Default connection
// ==============================
const DEFAULT_NAME = 'default'

connections[DEFAULT_NAME] = createKnex({
  client   : process.env.DB_CONNECTION,
  host     : process.env.DB_HOST,
  port     : Number(process.env.DB_PORT),
  user     : process.env.DB_USERNAME,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE,
})

// ==============================
// ## Export default db
// ==============================
export const db: Knex = connections[DEFAULT_NAME]

// ==============================
// ## Named connection (multiple DB)
// ==============================
export function useDB(
  name         :  string,
  config      ?:  {
    client    ?:  string
    host      ?:  string
    port      ?:  number
    user      ?:  string
    password  ?:  string
    database  ?:  string
  }
): Knex {
  if (!connections[name]) {
    if (!config) {
      throw new Error(`DB connection "${name}" not found`)
    }
    connections[name] = createKnex(config)
  }

  return connections[name]
}

// ==============================
// ## Close all connections (CLI safe)
// ==============================
export async function closeAllDB() {
  await Promise.all( Object.values(connections).map(db => db.destroy()))
}





declare module "knex" {
  namespace Knex {
    interface QueryBuilder<TRecord = any, TResult = any> {
      joinWith(
        type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
        table: string,
        relation:
          | {
              localKey: string
              foreignKey: string
            }
          | {
              pivotTable: string
              localKey: string
              pivotLocalKey: string
              pivotForeignKey: string
              foreignKey: string
            },
        as: string,
        callback?: (qb: Knex.QueryBuilder) => void
      ): QueryBuilder<TRecord, TResult>

      whereJoinHas(
        type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
        table: string,
        relation:
          | string
          | {
              pivotTable: string
              localKey: string
              pivotLocalKey: string
              pivotForeignKey: string
              foreignKey: string
            },
        foreignKey?: string,
        callback?: (qb: Knex.QueryBuilder) => void
      ): QueryBuilder<TRecord, TResult>

      orWhereJoinHas(
        type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
        table: string,
        relation:
          | string
          | {
              pivotTable: string
              localKey: string
              pivotLocalKey: string
              pivotForeignKey: string
              foreignKey: string
            },
        foreignKey?: string,
        callback?: (qb: Knex.QueryBuilder) => void
      ): QueryBuilder<TRecord, TResult>

      whereJoinDoesntHave(
        type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
        table: string,
        relation:
          | string
          | {
              pivotTable: string
              localKey: string
              pivotLocalKey: string
              pivotForeignKey: string
              foreignKey: string
            },
        foreignKey?: string,
        callback?: (qb: Knex.QueryBuilder) => void
      ): QueryBuilder<TRecord, TResult>

      orWhereJoinDoesntHave(
        type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
        table: string,
        relation:
          | string
          | {
              pivotTable: string
              localKey: string
              pivotLocalKey: string
              pivotForeignKey: string
              foreignKey: string
            },
        foreignKey?: string,
        callback?: (qb: Knex.QueryBuilder) => void
      ): QueryBuilder<TRecord, TResult>
    }
  }
}



function getBaseTable(qb: any): string {
  return qb._single?.table
}

function buildWhereHas(
  qb: Knex.QueryBuilder,
  type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
  table: string,
  localKeyOrRelation: any,
  foreignKey?: string,
  callback?: (qb: Knex.QueryBuilder) => void
) {
  const baseTable = getBaseTable(qb)
  if (!baseTable) {
    throw new Error("whereHas harus dipanggil setelah table()")
  }

  qb.select(1).from(table)

  if (type != "BELONGSTOMANY") {
    qb.whereRaw(`${foreignKey} = ${baseTable}.${localKeyOrRelation}`)
  } else {
    const r = localKeyOrRelation
    qb.join(r.pivotTable, `${r.pivotTable}.${r.pivotForeignKey}`, `${table}.${r.foreignKey}`).whereRaw(`${r.pivotTable}.${r.pivotLocalKey} = ${baseTable}.${r.localKey}`)
  }

  if (callback) callback(qb)
}



knex.QueryBuilder.extend("joinWith", function (
  this: Knex.QueryBuilder,
  type: "BELONGSTO" | "HASONE" | "HASMANY" | "BELONGSTOMANY",
  table: string,
  relation:
    | {
        localKey: string
        foreignKey: string
      }
    | {
        pivotTable: string
        localKey: string
        pivotLocalKey: string
        pivotForeignKey: string
        foreignKey: string
      },
  as: string,
  callback?: (qb: Knex.QueryBuilder) => void
) {
  const baseTable = getBaseTable(this)
  if (!baseTable) throw new Error("joinWith() must be after table()")

  let subquery: string | null = null

  if (type === "BELONGSTO") {
    const r = relation as any

    subquery = `
      (
        select row_to_json(${table})
        from ${table}
        where ${table}.${r.foreignKey} = ${baseTable}.${r.localKey}
        limit 1
      )
    `
  }

  if (type === "HASONE") {
    const r = relation as any

    subquery = `
      (
        select row_to_json(${table})
        from ${table}
        where ${table}.${r.foreignKey} = ${baseTable}.${r.localKey}
        limit 1
      )
    `
  }

  if (type === "HASMANY") {
    const r = relation as any

    subquery = `
      (
        select coalesce(json_agg(${table}), '[]'::json)
        from ${table}
        where ${table}.${r.foreignKey} = ${baseTable}.${r.localKey}
      )
    `
  }

  if (type === "BELONGSTOMANY") {
    const r = relation as any

    subquery = `
      (
        select coalesce(json_agg(${table}), '[]'::json)
        from ${table}
        inner join ${r.pivotTable}
          on ${r.pivotTable}.${r.pivotForeignKey} = ${table}.${r.foreignKey}
        where ${r.pivotTable}.${r.pivotLocalKey} = ${baseTable}.${r.localKey}
      )
    `
  }

  if (!subquery) {
    throw new Error(`Unsupported relation type: ${type}`)
  }

  if (callback) {
    callback(this)
  }

  return this.select(this.client.raw(`${subquery} as "${as}"`))
})


knex.QueryBuilder.extend("whereJoinHas", function (type, table, localKeyOrRelation, foreignKey?, callback? ) {
  return this.whereExists(function () {
    buildWhereHas(
      this,
      type,
      table,
      localKeyOrRelation,
      foreignKey,
      callback
    )
  })
})


knex.QueryBuilder.extend("orJoinWhereHas", function (type, table, localKeyOrRelation, foreignKey?, callback? ) {
  return this.orWhereExists(function () {
    buildWhereHas(
      this,
      type,
      table,
      localKeyOrRelation,
      foreignKey,
      callback
    )
  })
})


knex.QueryBuilder.extend("whereJoinDoesntHave", function (type, table, localKeyOrRelation, foreignKey?, callback? ) {
  return this.whereNotExists(function () {
    buildWhereHas(
      this,
      type,
      table,
      localKeyOrRelation,
      foreignKey,
      callback
    )
  })
})


knex.QueryBuilder.extend("orWhereJoinDoesntHave", function (type, table, localKeyOrRelation, foreignKey?, callback? ) {
  return this.orWhereNotExists(function () {
    buildWhereHas(
      this,
      type,
      table,
      localKeyOrRelation,
      foreignKey,
      callback
    )
  })
})
