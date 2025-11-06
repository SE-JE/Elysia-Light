import path from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { Command } from "commander";



// =====================================>
// ## Command: make:light-controller
// =====================================>
const makeLightControllerCommand = new Command("make:light-controller")
  .argument("<name>", "Controller Name")
  .option("-m, --model <model>", "Attach model to controller")
  .description("Make the Light Controller")
  .action((initialName, options) => {
    const model = options.model ? options.model : "Model";
    const basePath = path.join(process.cwd(), "src", "controllers");

    if (!initialName || initialName.trim() === "") {
      console.error("❌ Controller Name Invalid..!");
      process.exit(1);
    }

    const names = initialName.split("/");
    const name = names[names.length - 1];
    names.pop();
    const folder = names.join("/");

    const filePath = path.join(basePath, `${initialName}.ts`);

    if (existsSync(filePath)) {
      console.error("❌ Controller already exists..!");
      process.exit(1);
    }

    const targetDir = folder ? path.join(basePath, folder) : basePath;
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
      console.log(`📂 Create folder ${targetDir}...`);
    }

    const stubPath = path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-controller.stub");
    let stub = readFileSync(stubPath, "utf-8");

    stub = stub.replace(
      /{{\s*namespace\s*}}|{{\s*name\s*}}|{{\s*model\s*}}|{{\s*with\s*}}|{{\s*validations\s*}}/g,
      (match) => {
        switch (match) {
          case "{{ namespace }}":
            return folder ? `.${path.sep}${folder.replace(/\//g, path.sep)}` : "";
          case "{{ name }}":
            return name;
          case "{{ model }}":
            return model;
          case "{{ with }}":
            return "";
          case "{{ validations }}":
            return "";
          default:
            return "";
        }
      }
    );

    writeFileSync(filePath, stub);
    console.log(`✅ Successfully Create Light Controller: ${filePath}`);
  });

export default makeLightControllerCommand;
