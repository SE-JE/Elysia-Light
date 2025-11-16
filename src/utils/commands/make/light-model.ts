import path from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { Command } from "commander";
import { logger } from "@utils";



// =====================================>
// ## Command: make:light-model
// =====================================>
const makeLightModelCommand  =  new Command("make:light-model")
  .argument("<name>", "Nama model")
  .description("Make the Light Model")
  .action((name) => {
    const basePath  =  path.join(process.cwd(), "src", "models");

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }

    const filePath  =  path.join(basePath, `${name}.ts`);

    if (existsSync(filePath)) {
      logger.error(`Model ${name} already exists!`);
      return;
    }

    let stub = readFileSync(path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-model.stub"), "utf-8");

    stub = stub.replace(/{{\s*name\s*}}/g, name)
      .replace(/{{\s*fillable\s*}}/g, "")
      .replace(/{{\s*searchable\s*}}/g, "")
      .replace(/{{\s*selectable\s*}}/g, "")
      .replace(/{{\s*relations\s*}}/g, "");

    writeFileSync(filePath, stub);

    logger.info(`Successfully create light model ${name}!`);
  });

export default makeLightModelCommand;
