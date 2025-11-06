import { Command } from "commander";

import makeModelCommand from "./make/basic-model";
import makeSeederCommand from "./make/basic-seeder";
import makeMigrationCommand from "./make/basic-migration";
import makeControllerCommand from "./make/basic-controller";
import makeLightModelCommand from "./make/light-model";
import makeLightControllerCommand from "./make/light-controller";

import { migrateCommand, migrateFreshCommand } from "./runner/migration";
import { blueprintCommand } from "./runner/blueprint";
import seederCommand from "./runner/seeder";



const program = new Command();

program.name("elysia-light-cli").description("Elysia Light CLI").version("1.0.0");

program.addCommand(makeControllerCommand);
program.addCommand(makeModelCommand);
program.addCommand(makeMigrationCommand);
program.addCommand(makeSeederCommand);
program.addCommand(makeLightControllerCommand);
program.addCommand(makeLightModelCommand);

program.addCommand(migrateCommand);
program.addCommand(migrateFreshCommand);
program.addCommand(seederCommand);
program.addCommand(blueprintCommand);

program.parse(process.argv);
