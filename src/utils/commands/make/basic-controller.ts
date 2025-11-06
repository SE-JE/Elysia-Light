import path from "path";
import fs, { writeFileSync, mkdirSync, existsSync } from "fs";
import { Command } from "commander";



// =====================================>
// ## Command: make:controller
// =====================================>
const makeControllerCommand  =  new Command("make:controller")
  .argument("<name>", "Controller Name")
  .description("Create new controller")
  .action((name) => {
    const fileName  =  `${name}.ts`;
    const filePath  =  path.join(process.cwd(), "src", "controllers");

    if (!existsSync(path.dirname(filePath))) {
      mkdirSync(path.dirname(filePath), { recursive: true });
    }

    const exists  =  fs.readdirSync(filePath).some((f: any) => f.includes(`${name}.ts`));
    if (exists) {
      console.error(`❌ Controller "${name}" already exists!`);
      process.exit(1);
    }
    
    let content = fs.readFileSync('./src/utils/commands/make/stubs/basic-controller.stub', 'utf-8');;

    content = content.replace(/{{\s*name\s*}}/g, name || "")

    writeFileSync(filePath + "/" + fileName, content);
    console.log(`✅ Controller ${fileName} created!`);
  });

export default makeControllerCommand;