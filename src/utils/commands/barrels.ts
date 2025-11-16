import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { logger } from "./logger";

const rootDir = path.resolve();
const configText = await Bun.file("barrels.json").text();
const config = JSON.parse(configText);
const directories: string[] = Array.isArray(config.directory) ? config.directory : [config.directory];


directories.forEach((dir) => {
  const absoluteDir = path.join(rootDir, dir);

  if (!fs.existsSync(absoluteDir)) {
    logger.error(`Barrels error: ${absoluteDir} directory not found`)
    return;
  }

  fs.watch(absoluteDir, { recursive: true }, (_, filename) => {
    if (filename && filename.endsWith(".ts") && filename !== "index.ts") {
      exec("bunx barrelsby -c barrels.json", { cwd: rootDir })
      logger.start("Barrels updated " + absoluteDir + "/index.ts")
    }
  });
});

logger.start("Barrels watched " + directories.join(", "))