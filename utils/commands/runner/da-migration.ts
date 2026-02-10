import fs from "fs"
import path from "path"
import { Command } from "commander"
import { logger, da, daClient } from "@utils"
import { createClient } from "@clickhouse/client"

const DW_MIGRATIONS_DIR = path.resolve("./database/da.migrations")

const MIGRATION_TABLE = `${process.env.DA_DATABASE}.migrations`

// ================================
// ## Create Migration Table
// ================================
async function ensureMigrationTable() {
  await da.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      name String,
      executed_at DateTime DEFAULT now()
    )
    ENGINE = MergeTree()
    ORDER BY (name)
  `)
}


// ================================
// ## Ensure OLAP Database Exists
// ================================
async function ensureDatabaseExists() {
  let dac = createClient({
    url        : "http://" + (process.env.DA_HOST      || '127.0.0.1') + ':' + (process.env.DA_PORT || '8123'),
    username   : process.env.DA_USERNAME   || 'default',
    password   : process.env.DA_PASSWORD   || '',
  })

  logger.info(`Database ${process.env.DA_DATABASE} not found. Create new database...`)
  await dac.query({query: `CREATE DATABASE IF NOT EXISTS ${process.env.DA_DATABASE}`})
  logger.info(`Database ${process.env.DA_DATABASE} successfully created.`)
}


// ================================
// ## GET LIST OF APPLIED MIGRATIONS
// ================================
async function getMigratedNames(): Promise<string[]> {
  try {
    const rows = await da.from("migrations").select("name").get<{ name: string }>()
    return rows.map(r => r.name)
  } catch {
    return []
  }
}

// ================================
// ## SAVE MIGRATION RECORD
// ================================
async function recordMigration(name: string) {
  await daClient.insert({ table: "migrations", values: [{ name }], format: "JSONEachRow" })
}

// ================================
// ## RUN ALL MIGRATIONS
// ================================
export const daMigrateCommand = new Command("da:migrate").description("Run all OLAP (ClickHouse) migrations").action(async () => {
  logger.info("Preparing run migration...")

  await ensureDatabaseExists()

  await ensureMigrationTable()

  const applied = await getMigratedNames()

  const files = getMigrationFiles(DW_MIGRATIONS_DIR).sort((a, b) => a.localeCompare(b))

  let count = 0

  for (const file of files) {
    if (applied.includes(file)) continue
    const relative = path.relative(DW_MIGRATIONS_DIR, file)

    if (applied.includes(relative)) continue

    const filePath = file
    const migrationPath = path.relative(DW_MIGRATIONS_DIR, filePath)

    if (applied.includes(migrationPath)) continue

    const mod = await import(filePath)

    if (!mod.default) continue

    const migration = new mod.default()

    if (typeof migration.up !== "function") {
      logger.error(`Migration file ${file} missing up()`)    
      continue
    }

    await migration.up()
    await recordMigration(migrationPath)

    logger.info(`Migrated: ${migrationPath}`)
    count++
  }

  if (count === 0) logger.info("Nothing to migrate.")
  else logger.info(`Success run all migration!`);

  process.exit(0)
})

// ================================
// ## FRESH MIGRATE (DROP ALL)
// ================================
export const daMigrateFreshCommand = new Command("da:migrate:fresh").description("DROP ALL OLAP TABLES and rerun migrations").action(async () => {
  logger.info("Preparing run migrations...")

  const tables = await da.select("name").from("system.tables").where("database", "=", process.env.DA_DATABASE || "elysia_light").get<{ name: string }>()

  for (const t of tables) {
    await da.exec(`DROP TABLE IF EXISTS ${t.name}`)
  }

  await ensureMigrationTable()

  
  logger.info("Database has been freshed......")

  const files = getMigrationFiles(DW_MIGRATIONS_DIR).sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    const filePath = file
    const migrationPath = path.relative(DW_MIGRATIONS_DIR, filePath)

    const mod = await import(filePath)

    if (!mod.default) continue

    const migration = new mod.default()

    await migration.up()
    await recordMigration(migrationPath)
    logger.info(`Migrated: ${migrationPath}`)
  }

  logger.info(`Success run all migration!`);
  process.exit(0)
})


function getMigrationFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  let files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files = files.concat(getMigrationFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath)
    }
  }

  return files
}






// ==============================>
// ## DA / OLAP : Migration 
// ==============================>
export abstract class DAMigration {
  raw(query: string) {
    return this.exec(query)
  }

  protected async exec(query: string) {
    await daClient.query({query})
    return;
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
// ## DA / OLAP : Table Builder (CREATE TABLE)
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

  uuid(name: string = "id") {
    this.columns.push(`${name} UUID DEFAULT generateUUIDv7()`)
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

  json(name: string) {
    this.columns.push(`${name} JSON`)
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
// ## DA / OLAP : Alter Builder (ALTER TABLE)
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