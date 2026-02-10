import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:migration
// =====================================>
export const makeMigrationCommand = new Command("make:migration")
  .argument("<name>", "Nama migration")
  .option("--init", "Buat migration init (0000_00)")
  .description("Membuat file migration baru")
  .action((name, options) => {
    makeMigration(name, options)
  });



// =====================================>
// ## Command: migration helpers
// =====================================>
export const makeMigration = (
  migrationName: string,
  options: { init?: boolean }
) => {
  const name = conversion.strSnake(conversion.strPlural(migrationName))

  const now = new Date()

  const baseDir = path.join(
    process.cwd(),
    "src",
    "database",
    "migrations"
  )

  let targetDir: string
  let fileName: string

  if (options.init) {
    targetDir = path.join(baseDir, "0000_00")
    fileName = `${name}.ts`
  } else {
    const yearMonth = `${now.getFullYear()}_${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`

    targetDir = path.join(baseDir, yearMonth)

    const time = migrationPrefixFile(now)
    fileName = `${time}_${name}_table.ts`
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  const { className, tableName } = parseName(name)

  let content = fs.readFileSync(
    "./utils/commands/make/stubs/basic-migration.stub",
    "utf-8"
  )

  content = content.replace(/{{\s*className\s*}}/g, className)
  content = content.replace(/{{\s*tableName\s*}}/g, tableName)

  const filePath = path.join(targetDir, fileName)

  writeFileSync(filePath, content)

  logger.info(`Migration created: ${path.relative(baseDir, filePath)}`)

  process.exit(0)
}


const migrationPrefixFile = (date: Date) => {
  const d  =  String(date.getDate()).padStart(2, '0');
  const h  =  String(date.getHours()).padStart(2, "0")
  const m  =  String(date.getMinutes()).padStart(2, "0")
  const s  =  String(date.getSeconds()).padStart(2, "0")

  return `${d}_${h}${m}${s}`
}

const parseName = (str: string) => {
  const parts = str.split('_');

  const className = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const tableName = parts.slice(1).join('_');

  return { className, tableName };
}