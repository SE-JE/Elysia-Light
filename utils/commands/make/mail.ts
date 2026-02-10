import path from "path";
import fs, { writeFileSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:controller
// =====================================>
export const makeMailCommand  =  new Command("make:mail")
  .argument("<name>", "Name of mail")
  .description("Create new mail")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "outputs", "mails");
    const templatePath = path.join(process.cwd(), "src", "outputs", "mails", "templates");
    
    if (!name || name.trim() === "") {
      logger.error("Mail name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".mail.ts"
    const templateName = conversion.strSlug(name) + ".mail.stub"
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Mail already exists!");
      process.exit(1);
    }
    
    let content = fs.readFileSync('./utils/commands/make/stubs/mail.stub', 'utf-8');;

    content = content
      .replace(/{{\s*name\s*}}/g, conversion.strCamel(name) || "")
      .replace(/{{\s*title\s*}}/g, conversion.strPascal(name, " ") || "")

    writeFileSync(filePath, content);
    writeFileSync(templatePath + "/" + templateName, "");
  
    logger.info(`Mail ${filename} created!`);

    process.exit(0);
  });