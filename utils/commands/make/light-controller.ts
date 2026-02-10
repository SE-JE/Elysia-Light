import path from "path";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:light-controller
// =====================================>
export const makeLightControllerCommand = new Command("make:light-controller")
  .argument("<name>", "Name of controller")
  .option("-m, --model <model>", "Attach model to controller")
  .description("Make the Light Controller")
  .action((name, options) => {
      makeLightController(name, options.model)

      process.exit(0);
  });


export const makeLightController = (controllerName: string, modelName?:string) => {
  const basePath = path.join(process.cwd(), "src", "controllers");

  if (!controllerName || controllerName.trim() === "") {
    logger.error("Controller name invalid!");
    process.exit(1);
  }

  const names = controllerName.split("/");
  const realName = names[names.length - 1];
  const name = conversion.strPascal(realName) + "Controller"
  const filename = conversion.strSlug(realName) + ".controller.ts"
  const model = modelName || conversion.strPascal(realName)

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

  const stubPath = path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-controller.stub");
  let stub = readFileSync(stubPath, "utf-8");

  stub = stub.replace(
    /{{\s*name\s*}}|{{\s*model\s*}}|{{\s*validations\s*}}|{{\s*marker\s*}}/g,
    (match) => {
      switch (match) {
        case "{{ name }}":
          return name;
        case "{{ model }}":
          return model;
        default:
          return "";
      }
    }
  );

  writeFileSync(filePath, stub);
  logger.info(`Successfully create light controller: ${filePath}!`);
}