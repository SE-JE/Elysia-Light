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