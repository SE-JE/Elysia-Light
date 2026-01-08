import { Command } from "commander";

import { makeModelCommand } from "./make/basic-model";
import { makeSeederCommand } from "./make/basic-seeder";
import { makeMigrationCommand } from "./make/basic-migration";
import { makeControllerCommand } from "./make/basic-controller";
import { makeLightModelCommand } from "./make/light-model";
import { makeLightControllerCommand } from "./make/light-controller";
import { makeDaMigrationCommand } from "./make/da-migration";
import { makeQueueCommand } from "./make/queue";
import { makeMailCommand } from "./make/mail";
import { makeBlueprintCommand } from "./make/blueprint";
import { makeNotificationCommand } from "./make/notification";

import { migrateCommand, migrateFreshCommand } from "./runner/migration";
import { seederCommand } from "./runner/seeder";
import { daMigrateCommand, daMigrateFreshCommand } from "./runner/da-migration";
import { blueprintCommand } from "./runner/blueprint/runner";





const program = new Command();

program.name("elysia-light-cli").description("Elysia Light CLI").version("1.0.0");

program.addCommand(makeControllerCommand);
program.addCommand(makeModelCommand);
program.addCommand(makeMigrationCommand);
program.addCommand(makeSeederCommand);
program.addCommand(makeDaMigrationCommand);
program.addCommand(makeLightControllerCommand);
program.addCommand(makeLightModelCommand);
program.addCommand(makeQueueCommand);
program.addCommand(makeMailCommand);
program.addCommand(makeNotificationCommand);
program.addCommand(makeBlueprintCommand);

program.addCommand(migrateCommand);
program.addCommand(migrateFreshCommand);
program.addCommand(seederCommand);
program.addCommand(blueprintCommand);
program.addCommand(daMigrateCommand);
program.addCommand(daMigrateFreshCommand);

program.parse(process.argv);
