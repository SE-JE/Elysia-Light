import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:controller
// =====================================>
export const makeControllerCommand  =  new Command("make:controller")
  .argument("<name>", "Name of controller")
  .description("Create new controller")
  .action((controllerName) => {
    const basePath = path.join(process.cwd(), "src", "controllers");
    
    if (!controllerName || controllerName.trim() === "") {
      logger.error("Controller name invalid!");
      process.exit(1);
    }
  
    const names = controllerName.split("/");
    const realName = names[names.length - 1];
    const name = conversion.strPascal(realName) + "Controller"
    const filename = conversion.strSlug(realName) + ".controller.ts"
  
    names.pop();
    const folder = names.join("/");
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Controller already exists!");
      process.exit(1);
    }
  
    const targetDir = folder ? path.join(basePath, folder) : basePath;
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
      logger.info(`Create folder ${targetDir}...`);
    }
    
    let content = fs.readFileSync('./utils/commands/make/stubs/basic-controller.stub', 'utf-8');;

    content = content.replace(/{{\s*name\s*}}/g, name || "")

    writeFileSync(filePath + "/" + controllerName, content);
  
    logger.info(`Controller ${controllerName} created!`);
    process.exit(0);
  });