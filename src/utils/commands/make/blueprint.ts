import path from "path";
import fs, { writeFileSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:controller
// =====================================>
export const makeBlueprintCommand  =  new Command("make:blueprint")
  .argument("<name>", "Name of blueprint")
  .description("Create new blueprint")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "blueprints");
    
    if (!name || name.trim() === "") {
      logger.error("Blueprint name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".blueprint.json"
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Blueprint already exists!");
      process.exit(1);
    }
    
    const content = fs.readFileSync('./src/utils/commands/make/stubs/blueprint.stub', 'utf-8');;

    writeFileSync(filePath, content);
  
    logger.info(`Blueprint ${filename} created!`);
    process.exit(0);
  });