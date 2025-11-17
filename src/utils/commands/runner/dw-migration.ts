import fs from "fs"
import path from "path"
import { Command } from "commander"
import { logger } from "@utils"
import { dw } from "@utils"

const DW_MIGRATIONS_DIR = path.resolve("./src/database/dw-migration")

const MIGRATION_TABLE = "dw_migrations"

// ================================
// ## Create Migration Table
// ================================
async function ensureMigrationTable() {
  await dw.raw(`
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
    const rows = await dw.raw(`SELECT name FROM ${MIGRATION_TABLE}`).get<{ name: string }>()
    return rows.map(r => r.name)
  } catch {
    return []
  }
}

// ================================
// ## SAVE MIGRATION RECORD
// ================================
async function recordMigration(name: string) {
  await dw.raw(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES ('${name}')`).execute()
}

// ================================
// ## RUN ALL MIGRATIONS
// ================================
export const dwMigrateCommand = new Command("dw:migrate")
  .description("Run all OLAP (ClickHouse) migrations")
  .action(async () => {
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
export const dwMigrateFreshCommand = new Command("dw:migrate:fresh")
  .description("DROP ALL OLAP TABLES and rerun migrations")
  .action(async () => {
    logger.info("Dropping all OLAP tables from ClickHouse...")

    const tables = await dw.raw("SHOW TABLES").get<{ name: string }>()

    for (const t of tables) {
      logger.info(`Dropping: ${t.name}`)
      await dw.raw(`DROP TABLE IF EXISTS ${t.name}`).execute()
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