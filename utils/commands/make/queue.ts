import path from "path";
import fs, { writeFileSync, existsSync } from "fs";
import { Command } from "commander";
import { conversion, logger } from "@utils";



// =====================================>
// ## Command: make:controller
// =====================================>
export const makeQueueCommand  =  new Command("make:queue")
  .argument("<name>", "Name of queue")
  .description("Create new queue")
  .action((name) => {
    const basePath = path.join(process.cwd(), "src", "jobs", "queues");
    
    if (!name || name.trim() === "") {
      logger.error("Queue name invalid!");
      process.exit(1);
    }
  
    const filename = conversion.strSlug(name) + ".queue.worker.ts"
  
    const filePath = path.join(basePath, filename);
  
    if (existsSync(filePath)) {
      logger.error("Queue already exists!");
      process.exit(1);
    }
    
    let content = fs.readFileSync('./utils/commands/make/stubs/queue.stub', 'utf-8');;

    content = content
      .replace(/{{\s*name\s*}}/g, conversion.strCamel(name) || "")
      .replace(/{{\s*worker_name\s*}}/g, conversion.strSlug(name, " ") || "")

    writeFileSync(filePath, content);
  
    logger.info(`Queue ${filename} created!`);

    process.exit(0);
  });