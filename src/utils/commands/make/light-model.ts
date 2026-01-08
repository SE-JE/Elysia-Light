import path from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { makeLightController } from "./light-controller";
import { makeMigration } from "./basic-migration";
import { makeSeeder } from "./basic-seeder";



// =====================================>
// ## Command: make:light-model
// =====================================>
export const makeLightModelCommand  =  new Command("make:light-model")
  .argument("<name>", "Name of model")
  .option("-r", "Generate all resource (controller, migration, seeder)")
  .description("Make the Light Model")
  .action((name, options) => {
    makeLightModel(name)

    if(options.r) {
      makeLightController(name)
      makeMigration("create_" + name)
      makeSeeder(name)
    }
    
    process.exit(0);
  });



export const makeLightModel = (modelName: string) => {
  const name = conversion.strPascal(modelName)
  const filename = conversion.strSlug(modelName) + ".model.ts"

  const basePath  =  path.join(process.cwd(), "src", "models");

  if (!existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }

  const filePath  =  path.join(basePath, filename);

  if (existsSync(filePath)) {
    logger.error(`Model ${name} already exists!`);
    return;
  }

  let stub = readFileSync(path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-model.stub"), "utf-8");

  stub = stub
    .replace(/{{\s*name\s*}}/g, name)
    .replace(/{{\s*fields\s*}}/g, "")
    .replace(/{{\s*attributes\s*}}/g, "")
    .replace(/{{\s*relations\s*}}/g, "")
    .replace(/{{\s*hooks\s*}}/g, "")
    .replace(/{{\s*import\s*}}/g, "")
    .replace(/{{\s*import_utils\s*}}/g, "")
    .replace(/{{\s*marker\s*}}/g, "")

  writeFileSync(filePath, stub);

  logger.info(`Successfully create light model ${name}!`);
}