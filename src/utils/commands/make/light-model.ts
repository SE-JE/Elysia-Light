import path from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { Command } from "commander";



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
      console.error(`❌ Model ${name} sudah ada!`);
      return;
    }

    let stub = readFileSync(path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-model.stub"), "utf-8");

    stub = stub.replace(/{{\s*name\s*}}/g, name)
      .replace(/{{\s*fillable\s*}}/g, "")
      .replace(/{{\s*searchable\s*}}/g, "")
      .replace(/{{\s*selectable\s*}}/g, "")
      .replace(/{{\s*relations\s*}}/g, "");

    writeFileSync(filePath, stub);

    console.log(`✅ Successfully Create Light Model ${name}...`);
  });

export default makeLightModelCommand;
