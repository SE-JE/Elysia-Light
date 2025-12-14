import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { logger } from "@utils";



// =====================================>
// ## Command: make:migration
// =====================================>
const makeDaMigrationCommand = new Command("make:da:migration")
  .argument("<name>", "Nama migration")
  .description("Membuat file migration baru")
  .action((name) => {
    const timestamp  =  new Date(Date.now());
    const fileName   =  `${migrationTimestampFormat(timestamp)}_${name}_table.ts`;
    const filePath   =  path.join(process.cwd(), "src", "database", "da.migrations", fileName);

    const { className, tableName } = parseName(name);

    if (!existsSync(path.dirname(filePath))) {
      mkdirSync(path.dirname(filePath), { recursive: true });
    }

    let content = fs.readFileSync('./src/utils/commands/make/stubs/da-migration.stub', 'utf-8');;
    
    content  =  content.replace(/{{\s*className\s*}}/g, className || "")
    content  =  content.replace(/{{\s*tableName\s*}}/g, tableName || "")

    writeFileSync(filePath, content);
    logger.info(`Migration ${fileName} created!`);
  });

export default makeDaMigrationCommand;




// =====================================>
// ## Command: migration helpers
// =====================================>
export const migrationTimestampFormat = (date: any) => {
  const year   =  date.getFullYear();
  const month  =  String(date.getMonth() + 1).padStart(2, '0');
  const day    =  String(date.getDate()).padStart(2, '0');

  const hours    =  String(date.getHours()).padStart(2, '0');
  const minutes  =  String(date.getMinutes()).padStart(2, '0');
  const seconds  =  String(date.getSeconds()).padStart(2, '0');

  return  `${year}_${month}_${day}_${hours}${minutes}${seconds}`;
}

const parseName = (str: string) => {
  const parts = str.split('_');

  const className = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const tableName = parts.slice(1).join('_');

  return { className, tableName };
}