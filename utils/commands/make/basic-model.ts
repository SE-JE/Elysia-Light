import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:model
// =====================================>
export const makeModelCommand = new Command("make:model")
  .argument("<name>", "Name of model")
  .description("Membuat file model baru")
  .action((modelName, options) => {
    const name = conversion.strPascal(modelName)
    const filename = conversion.strSlug(modelName) + "model.ts"

    const filePath = path.join(process.cwd(), "src", "models", filename);

    if (!existsSync(path.dirname(filePath))) {
      mkdirSync(path.dirname(filePath), { recursive: true });
    }

    let content  =  fs.readFileSync('./utils/commands/make/stubs/basic-model.stub', 'utf-8');;
    
    content  =  content.replace(/{{\s*name\s*}}/g, name || "")

    writeFileSync(filePath, content);

    logger.info(`Model ${modelName} created!`);

    process.exit(0);
  });
