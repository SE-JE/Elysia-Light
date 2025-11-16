import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { logger } from "@utils";



// =====================================>
// ## Command: make:seeder
// =====================================>
const makeSeederCommand = new Command("make:seeder")
  .argument("<name>", "Nama seeder")
  .description("Buat seeder baru")
  .action((name) => {
    const dir = path.resolve("seeders");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filePath = path.join(process.cwd(), "src", "database", "seeders", name + ".ts");;
    
    let content  =  fs.readFileSync('./src/utils/commands/make/stubs/basic-seeder.stub', 'utf-8');;
        
    content  =  content.replace(/{{\s*name\s*}}/g, name || "")

    writeFileSync(filePath, content, { flag: "wx" });
    logger.info(`Seeder ${name} created`);
  });

export default makeSeederCommand;
