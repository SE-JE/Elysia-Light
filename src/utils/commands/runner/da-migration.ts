import fs from "fs"
import path from "path"
import { Command } from "commander"
import { logger, da } from "@utils"

const DW_MIGRATIONS_DIR = path.resolve("./src/database/da.migrations")

const MIGRATION_TABLE = "migrations"

// ================================
// ## Create Migration Table
// ================================
async function ensureMigrationTable() {
  await da.raw(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      name String,
      executed_at DateTime DEFAULT now()
    )
    ENGINE = MergeTree()
    ORDER BY (name)
  `).execute()
}

// ================================
// ## GET LIST OF APPLIED MIGRATIONS
// ================================
async function getMigratedNames(): Promise<string[]> {
  try {
    const rows = await da.raw(`SELECT name FROM ${MIGRATION_TABLE}`).get<{ name: string }>()
    return rows.map(r => r.name)
  } catch {
    return []
  }
}

// ================================
// ## SAVE MIGRATION RECORD
// ================================
async function recordMigration(name: string) {
  await da.raw(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES ('${name}')`).execute()
}

// ================================
// ## RUN ALL MIGRATIONS
// ================================
export const dwMigrateCommand = new Command("dw:migrate").description("Run all OLAP (ClickHouse) migrations").action(async () => {
  logger.info("Preparing ClickHouse migration...")

  await ensureMigrationTable()

  const applied = await getMigratedNames()

  const files = fs.existsSync(DW_MIGRATIONS_DIR)
    ? fs.readdirSync(DW_MIGRATIONS_DIR).sort()
    : []

  let count = 0

  for (const file of files) {
    if (applied.includes(file)) continue

    const filePath = path.join(DW_MIGRATIONS_DIR, file)
    const mod = await import(filePath)

    if (!mod.default) continue

    const migration = new mod.default()

    if (typeof migration.up !== "function") {
      logger.error(`Migration file ${file} missing up()`)    
      continue
    }

    logger.info(`Running: ${file}`)
    await migration.up()
    await recordMigration(file)

    logger.info(`Migrated: ${file}`)
    count++
  }

  if (count === 0) logger.info("Nothing to migrate.")
  else logger.info(`Successfully ran ${count} ClickHouse migrations.`)

  process.exit(0)
})

// ================================
// ## FRESH MIGRATE (DROP ALL)
// ================================
export const dwMigrateFreshCommand = new Command("dw:migrate:fresh").description("DROP ALL OLAP TABLES and rerun migrations").action(async () => {
  logger.info("Dropping all OLAP tables from ClickHouse...")

  const tables = await da.raw("SHOW TABLES").get<{ name: string }>()

  for (const t of tables) {
    logger.info(`Dropping: ${t.name}`)
    await da.raw(`DROP TABLE IF EXISTS ${t.name}`).execute()
  }

  logger.info("Recreating migration table...")
  await ensureMigrationTable()

  logger.info("Rerunning all migrations...")

  const files = fs.existsSync(DW_MIGRATIONS_DIR)
    ? fs.readdirSync(DW_MIGRATIONS_DIR).sort()
    : []

  for (const file of files) {
    const filePath = path.join(DW_MIGRATIONS_DIR, file)
    const mod = await import(filePath)

    if (!mod.default) continue

    const migration = new mod.default()

    logger.info(`Running: ${file}`)
    await migration.up()
    await recordMigration(file)
    logger.info(`Migrated: ${file}`)
  }

  logger.info("All ClickHouse migrations freshly applied.")
  process.exit(0)
})





// ==============================>
// ## DA / OLAP : Migration 
// ==============================>
export abstract class Migration {
  raw(query: string) {
    return this.exec(query)
  }

  protected async exec(query: string) {
    return da.raw(query).execute()
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