import { conversion } from './../../conversion.util';
import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { logger } from "@utils";



// =====================================>
// ## Command: make:seeder
// =====================================>
export const makeSeederCommand = new Command("make:seeder")
  .argument("<name>", "Name of seeder")
  .option("-m, --model <model>", "Attach model to controller")
  .description("Buat seeder baru")
  .action((name, options) => {
    makeSeeder(name, options.model)

    process.exit(0);
  });


export const makeSeeder = (seederName: string, model?: string) => {
  const name = conversion.strPascal(seederName) + "Seeder"
  const filename = conversion.strSlug(seederName) + ".seeder.ts"
  const modelName = model || conversion.strPascal(seederName)

  const dir = path.resolve("seeders");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filePath = path.join(process.cwd(), "src", "database", "seeders", filename );;
  
  let content  =  fs.readFileSync('./utils/commands/make/stubs/basic-seeder.stub', 'utf-8');;
      
  content  =  content
    .replace(/{{\s*name\s*}}/g, name || "")
    .replace(/{{\s*model\s*}}/g, modelName || "")

  writeFileSync(filePath, content, { flag: "wx" });

  logger.info(`Seeder ${name} created`);
}