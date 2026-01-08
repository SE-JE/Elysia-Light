import fs from "fs";
import path from "path";
import knex from "knex";
import { Command } from "commander";
import { logger } from "@utils";
import { runSeeder } from "./seeder";



// =====================================>
// ## Command: migrate
// =====================================>
export const migrateCommand = new Command("migrate")
  .description("Run all migration")
  .option("--seed", "Run seeder after migrate")
  .action(async (options) => {
    await ensureDatabaseExists(process.env.DB_DATABASE || "db_elysia_light");

    const { db } = await import("@utils/db.util");

    const hasTable = await db.schema.hasTable("migrations");
    if (!hasTable) {
      await db.schema.createTable("migrations", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.timestamp("batch").defaultTo(db.raw("CURRENT_TIMESTAMP"));
      });
    }

    await runMigrationFile()

    if (options.seed) {
      await runSeeder()
    }

    process.exit(0);
  });



// =====================================>
// ## Command: migrate:fresh
// =====================================>
export const migrateFreshCommand = new Command("migrate:fresh")
  .description("Fresh and run all migration")
  .option("--seed", "Run seeder after migrate")
  .action(async (options) => {
    await ensureDatabaseExists(process.env.DB_DATABASE || "db_elysia_light");

    const { db } = await import("@utils/db.util");

    await db.raw(`DROP SCHEMA public CASCADE;`);
    await db.raw(`CREATE SCHEMA public;`);

    console.log("Database schema has been freshed...");

    await db.schema.createTable("migrations", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.timestamp("batch").defaultTo(db.raw("CURRENT_TIMESTAMP"));
    });

    await runMigrationFile()

    if (options.seed) {
      await runSeeder()
    }

    process.exit(0);
  });



// =====================================>
// ## Command: migration helpers
// =====================================>
async function runMigrationFile() {
  const { db } = await import("@utils/db.util");

  const migrations = await db.table("migrations").select("name");
  const migrated = migrations.map((row: any) => row.name);

  const migrationsDir = path.resolve("./src/database/migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  let countMigrated = 0;

  logger.info("Running migrations...")

  for (const file of files) {
    if (migrated.includes(file)) continue
    
    const tableName = extractTableName(file)

    if (tableName) {
      const exists = await db.schema.hasTable(tableName)
      if (exists) {
        logger.error(`Table "${tableName}" already exists`)
        process.exit(1);
      }
    }

    const mod = await import(path.join(migrationsDir, file));
    if (mod.up) {
      await mod.up(db)
      await db.table("migrations").insert({ name: file });
      logger.info(`Migrated: ${file}`)
    }

    countMigrated++
  }

  if(countMigrated > 0) {
    logger.info(`Success run all migration!`);
  } else {
    logger.info(`Nothing to migrate!`)
  }
}


function extractTableName(file: string): string | null {
  const filename = path.basename(file, path.extname(file))
  const filenameParts = filename.split("_")

  const filtered = filenameParts.filter(
    (p, k) => k != 0 && !["add", "update", "table"].includes(p.toLowerCase())
  )

  if (filtered.length === 0) return null

  return filtered.join("_")
}


async function ensureDatabaseExists(databaseName: string) {
  const driver = (process.env.DB_CONNECTION || "pg").toLowerCase()

  switch (driver) {

    case "pg":
    case "pgsql": {
      const tempDb = knex({
        client: "pg",
        connection: {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT) || 5432,
          user: process.env.DB_USERNAME || "postgres",
          password: process.env.DB_PASSWORD || "password",
          database: "postgres",
        },
      })

      try {
        const result = await tempDb
          .select("datname")
          .from("pg_database")
          .where("datname", databaseName)
          .first()

        if (!result) {
          logger.info(`Database ${databaseName} not found. Create new database...`)
          await tempDb.raw(`CREATE DATABASE "${databaseName}"`)
          logger.info(`Database ${databaseName} successfully created.`)
        }
      } catch (err) {
        logger.error(`Check or create database error: ${err}`)
      } finally {
        await tempDb.destroy()
      }

      break
    }


        case "mysql":
    case "mysql2": {
      const tempDb = knex({
        client: "mysql2",
        connection: {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT) || 3306,
          user: process.env.DB_USERNAME || "root",
          password: process.env.DB_PASSWORD || "",
        },
      })

      try {
        const [rows]: any = await tempDb.raw(
          `SHOW DATABASES LIKE ?`,
          [databaseName]
        )

        if (!rows || rows.length === 0) {
          logger.info(`Database ${databaseName} not found. Create new database...`)
          await tempDb.raw(`CREATE DATABASE \`${databaseName}\``)
          logger.info(`Database ${databaseName} successfully created.`)
        }
      } catch (err) {
        logger.error(`Check or create database error: ${err}`)
      } finally {
        await tempDb.destroy()
      }

      break
    }

    default:
      throw new Error(`Driver ${driver} belum didukung oleh ensureDatabaseExists().`)
  }
}
