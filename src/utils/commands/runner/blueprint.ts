import fs from "fs";
import path from "path";
import readline from "readline";
import { Command } from "commander";
import { conversion, logger } from "@utils";
import { migrationTimestampFormat } from "../make/basic-migration";



export interface BlueprintSchemaTypes {
  model         :  string;
  schema       ?:  Record<string, string>;
  relations    ?:  Record<string, string>;
  controllers  ?:  Record<string, string> | false;
  seeders      ?:  any[][];
}



function renderArray(arr: string[]): string {
  return `${arr.map((a) => `"${a}"`).join(", ")}`;
}

function extractSchema(schema: Record<string, string>) {
  const obj: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    obj[key] = "";
  }
  return obj;
}



// ============================>
// ## Command: blueprint model generation
// ============================>
export async function modelGeneration(
  model: string,
  schema: Record<string, string> = {},
  relations: Record<string, string> = {}
): Promise<boolean> {

  const basePath = path.join(process.cwd(), "src", "models")
  const filePath = path.join(basePath, `${model}.ts`)

  // sementara: skip jika ada
  if (fs.existsSync(filePath)) {
    logger.warning(`Skip model: ${model}`)
    return true
  }

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true })
  }

  // =========================
  // Fields
  // =========================
  const fields: string[] = []

  for (const [name, def] of Object.entries(schema)) {
    const flags: string[] = []

    if (def.includes("fillable")) flags.push("fillable")
    if (def.includes("searchable")) flags.push("searchable")
    if (def.includes("selectable")) flags.push("selectable")
    if (def.includes("hidden")) flags.push("hidden")

    const decorator = flags.length
      ? `@Field(${JSON.stringify(flags)})`
      : ""

    fields.push(`
    ${decorator}
    ${name}!: any
    `.trim())
  }

  // =========================
  // Relations
  // =========================
  const relationFields: string[] = []
  let importRelations = ""
  let importDecorators = new Set<string>()

  for (const [name, def] of Object.entries(relations)) {
    let type = "BelongsTo"
    let target = def
      .replace(/\[\]|\[1\]|:/g, "")
      .split(" ")[0]

    if (def.startsWith("[]:")) type = "BelongsToMany"
    else if (def.startsWith("[]")) type = "HasMany"
    else if (def.startsWith("[1]")) type = "HasOne"

    importDecorators.add(type)
    importRelations += `import ${target} from '@/models/${target}'\n`

    // default key assumption (sementara)
    const localKey = `${conversion.strSnake(name)}_id`
    const foreignKey = "id"

    const isMany = type === "HasMany" || type === "BelongsToMany"

    relationFields.push(`
      @${type}(() => ${target}, "${localKey}", "${foreignKey}")
      ${name}!: ${isMany ? `${target}[]` : target}
    `.trim())
  }


  let stub = fs.readFileSync(
    path.join(process.cwd(), "src/utils/commands/make/stubs/light-model.stub"),
    "utf-8"
  )

  stub = stub
    .replace(/{{\s*name\s*}}/g, model)
    .replace(/{{\s*fields\s*}}/g, fields.join("\n\n"))
    .replace(/{{\s*relations\s*}}/g, relationFields.join("\n\n"))
    .replace(/{{\s*attributes\s*}}/g, "")
    .replace(/{{\s*hooks\s*}}/g, "")
    .replace(/{{\s*import\s*}}/g, importRelations)

  fs.writeFileSync(filePath, stub, "utf-8")
  return true
}

// export async function modelGeneration(
//   model      :  string,
//   schema     :  Record<string, string> = {},
//   relations  :  Record<string, string> = {}
// ) : Promise<boolean> {
//   const name = model;
//   const basePath = path.join(process.cwd(), "src", "models");
//   const filePath = path.join(basePath, `${name}.ts`);

//   if (fs.existsSync(filePath)) {
//     fs.unlinkSync(filePath);
//   }

//   const fillable: string[]    =  [];
//   const searchable: string[]  =  [];
//   const selectable: string[]  =  ["id"];

//   for (const [column, definition] of Object.entries(schema)) {
//     if (definition.includes("fillable")) fillable.push(column);
//     if (definition.includes("searchable")) searchable.push(column);
//     if (definition.includes("selectable")) selectable.push(column);
//   }

//   const modelRelations: string[]  =  [];
//   let importRelations: string = "";

//   for (const [relationName, relationType] of Object.entries(relations)) {
//     const relation  =  relationType.split(",");
//     const fk        =  relation[1] ? `, "${relation[1]}"` : "";
//     const ok        =  relation[2] ? `, "${relation[2]}"` : "";

//     if (relationType.startsWith("[]")) {
//       const relatedModel = relation[0].substring(2);
//       const method = `
//   relation${conversion.strPascal(conversion.strPlural(relationName))}() {
//     return this.hasMany(${relatedModel}${fk}${ok});
//   }`;
//       modelRelations.push(method);
//     } else {
//       const relatedModel = relation[0];
//       const method = `
//   relation${conversion.strPascal(relationName)}() {
//     return this.belongsTo(${relatedModel}${fk}${ok});
//   }`;
//       modelRelations.push(method);

//       importRelations += `import ${relatedModel} from '@/models/${relatedModel}';\n`
//     }
//   }

//   if (!fs.existsSync(basePath)) {
//     fs.mkdirSync(basePath, { recursive: true });
//   }

//   let content  =  fs.readFileSync('./src/utils/commands/make/stubs/light-model.stub', 'utf-8');;

//   content  =  content.replace(/{{\s*name\s*}}/g, name || "")
//   content  =  content.replace(/{{\s*fillable\s*}}/g, renderArray(fillable) || "")
//   content  =  content.replace(/{{\s*searchable\s*}}/g, renderArray(searchable) || "")
//   content  =  content.replace(/{{\s*selectable\s*}}/g, renderArray(selectable) || "")
//   content  =  content.replace(/{{\s*relations\s*}}/g, modelRelations.join("\n") || "")
//   content  =  content.replace(/{{\s*import\s*}}/g, importRelations || "")

//   fs.writeFileSync(filePath, content, "utf-8");

//   return true;
// }



// ==================================>
// ## Command: Blueprint migration generation
// ==================================>
export async function migrationGeneration(
  model   :  string,
  schema  :  Record<string, string> = {}
) : Promise<boolean> {
  const name       =  conversion.strSnake(conversion.strPlural(model));
  const basePath   =  path.join(process.cwd(), "src","database", "migrations");
  const timestamp  =  new Date(Date.now());
  const filename   =  `${migrationTimestampFormat(timestamp)}_create_${name}_table.ts`;
  const filePath   =  path.join(basePath, filename);
  const className  =  `create${conversion.strPascal(name)}Table`

  const existingMigrations = fs
    .readdirSync(basePath)
    .filter((f) => f.includes(`_create_${name}_table`));
  for (const file of existingMigrations) {
    fs.unlinkSync(path.join(basePath, file));
  }

  const migrationFields: string[] = [];
  for (const [column, definition] of Object.entries(schema)) {
    const typeMatch = /type:(\w+),?(\d+)?/.exec(definition);
    const type = typeMatch?.[1] ?? "string";
    const length = typeMatch?.[2];

    let columnDef = "";
    switch (type) {
      case "bigInteger":
        columnDef = `table.bigInteger("${column}").unsigned()`;
        break;
      case "integer":
        columnDef = `table.integer("${column}")`;
        break;
      case "string":
        columnDef = length
          ? `table.string("${column}", ${length})`
          : `table.string("${column}")`;
        break;
      case "text":
        columnDef = `table.text("${column}")`;
        break;
      default:
        columnDef = `table.${type}("${column}")`;
        break;
    }

    // if (definition.includes("foreignIdFor")) {
    //   const foreign = /foreignIdFor:(\w+),?(\d+)?/.exec(definition);
    //   if (foreign) {
    //     columnDef += `.foreignIdFor(${conversion.strPascal(foreign[1])}, ${
    //       foreign[2] ?? ""
    //     })`;
    //   }
    // }

    if (definition.includes("unique")) {
      columnDef += `.unique()`;
    }
    if (!definition.includes("required")) {
      columnDef += `.nullable()`;
    }
    if (definition.includes("index")) {
      columnDef += `.index()`;
    }

    migrationFields.push(columnDef);
  }

  const migrationSchema = migrationFields.map((f) => `      ${f}`).join("\n");

  const stubPath = path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-migration.stub");
  let stub = fs.readFileSync(stubPath, "utf-8");

  stub  =  stub
    .replace(/{{\s*className\s*}}/g, className)
    .replace(/{{\s*tableName\s*}}/g, name)
    .replace(/{{\s*schemas\s*}}/g, migrationSchema);

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  fs.writeFileSync(filePath, stub, "utf-8");

  return true;
}



// ================================>
// ## Command: Blueprint controller generation
// ================================>
function generateFieldValidations(
  model: string,
  schema: Record<string, string>
) {
  const rules: Record<string, string[]> = {}
  const table = conversion.strSnake(conversion.strPlural(model))

  for (const [field, def] of Object.entries(schema)) {
    const r: string[] = []

    r.push(def.includes("required") ? "required" : "nullable")

    if (def.includes("type:string")) {
      r.push("string")

      const len = def.match(/type:string,(\d+)/)
      if (len) r.push(`max:${len[1]}`)
    }

    if (def.includes("type:integer") || def.includes("type:bigInteger")) {
      r.push("number")
    }

    const min = def.match(/min:(\d+)/)
    if (min) r.push(`min:${min[1]}`)

    const max = def.match(/max:(\d+)/)
    if (max) r.push(`max:${max[1]}`)

    if (def.includes("unique")) {
      r.push(`unique:${table},${field}`)
    }

    rules[field] = r
  }

  return rules
}

function generateRelationValidations(
  relations: Record<string, string>
) {
  const rules: Record<string, string[]> = {}

  for (const [name, def] of Object.entries(relations)) {
    if (!def.includes("fillable")) continue

    const isMany = def.startsWith("[]") || def.startsWith("[]:")
    const target = def.replace(/[\[\]:]/g, "").split(" ")[0]
    const table  = conversion.strSnake(conversion.strPlural(target))

    if (isMany) {
      rules[name] = ["array"]
      rules[`${name}.*`] = ["number", `exists:${table},id`]
    } else {
      rules[name] = ["nullable", "number", `exists:${table},id`]
    }
  }

  return rules
}


function renderValidationObject(rules: Record<string, string[]>) {
  return `{
${Object.entries(rules)
  .map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`)
  .join(",\n")}
}`
}

export async function controllerGeneration(
  model        :  string,
  schema       :  Record<string, string>  =  {},
  relations    :  Record<string, string>  =  {},
  initialName  :  string                  =  "",
  route        :  string                  =  ""
) {
  const basePath = path.join(process.cwd(), "src", "controllers");

  if (!initialName) {
    initialName = `${model}Controller`;
  }

  const names = initialName.split("/");
  const name = names[names.length - 1];
  names.pop();
  const folder = names.join("/");

  const controllerPath = path.join(basePath, `${initialName}.ts`);

  // sementara: skip jika ada
  if (fs.existsSync(controllerPath)) {
    logger.warning(`Skip controller: ${controllerPath}`)
    return true
  }

  // if (fs.existsSync(controllerPath)) {
  //   fs.unlinkSync(controllerPath);
  // }

  if (!fs.existsSync(path.join(basePath, folder))) {
    fs.mkdirSync(path.join(basePath, folder), { recursive: true });
  }
  const tableName = conversion.strSnake(conversion.strPlural(conversion.strPascal(model)));

  // for (const [column, rules] of Object.entries(schema)) {
  //   const typeMatch = rules.match(/type:(\w+)/);
  //   const type = typeMatch?.[1] ?? "string";

  //   const validationRules: string[] = [];

  //   if (rules.includes("required")) {
  //     validationRules.push("required");
  //   } else {
  //     validationRules.push("nullable");
  //   }

  //   switch (type) {
  //     case "bigInteger":
  //     case "integer":
  //       validationRules.push("number");
  //       break;
  //     case "string":
  //       validationRules.push("string");
  //       const lengthMatch = rules.match(/type:string,(\d+)/);
  //       if (lengthMatch?.[1]) {
  //         validationRules.push(`max:${lengthMatch[1]}`);
  //       }
  //       break;
  //   }

  //   if (rules.includes("unique")) {
  //     validationRules.push(`unique:${tableName},${column}`);
  //   }

  //   validations[column] = validationRules.join("|");
  // }


  const withRelations = Object.keys(relations).map((r) => `'${r}'`);
  const renderWith = `.with([${withRelations.join(", ")}])`;

  const validations = {
    ...generateFieldValidations(model, schema),
    ...generateRelationValidations(relations)
  }

  let stub = fs.readFileSync(path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-controller.stub"), "utf-8");

  stub = stub
    .replace(/{{\s*name\s*}}/g, name)
    .replace(/{{\s*model\s*}}/g, model)
    .replace(/{{\s*validations\s*}}/g, renderValidationObject(validations))
    .replace(/{{\s*with\s*}}/g, renderWith);

  fs.writeFileSync(controllerPath, stub, "utf-8");

  // apiRouteGeneration(model, initialName);

  return true;
}



// =============================>
// ## Command: Blueprint route generation
// =============================>
function apiRouteGeneration(
  model            :  string,
  controllerPath   :  string,
  route           ?:  string
) {
  const routesPath = path.join(process.cwd(), "src", "routes", "index.ts");

  const slug = route || model
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

  const controllerName = controllerPath.split("/").pop()!;

  const importPath = `@/controllers/${controllerPath}`;

  let fileContent = fs.readFileSync(routesPath, "utf-8");

  const importStatement = `import { ${controllerName} } from '${importPath}'`;
  if (!fileContent.includes(importStatement)) {
    const exportIndex = fileContent.indexOf("export const routes");
    if (exportIndex !== -1) {
      const beforeExport = fileContent.slice(0, exportIndex).trimEnd();
      const afterExport = fileContent.slice(exportIndex);
      fileContent = beforeExport + "\n" + importStatement + "\n\n" + afterExport;
    } else {
      fileContent = importStatement + "\n\n" + fileContent;
    }
  }

  const apiLine = `    api(route, "${slug}", ${controllerName});`;

  const regexReturn = /^( *)(return route;)/m;
  const match = fileContent.match(regexReturn);

  if (match) {
    const indent = "    ";
    let beforeReturn = fileContent.slice(0, match.index);

    if (!beforeReturn.includes(apiLine)) {
      beforeReturn += apiLine + "\n";
    }
    
    const afterReturn = fileContent.slice(match.index);
    const returnLine = indent + "return route;";
    fileContent = beforeReturn + "\n" + returnLine + afterReturn.slice(afterReturn.indexOf("return route;") + "return route;".length);
    
    fs.writeFileSync(routesPath, fileContent, "utf-8")
  } else {
    logger.error("Baris 'return route;' tidak ditemukan, tidak bisa menambahkan route.")
  }
}


// =================================>
// ## Command: Blueprint seeder generation
// =================================>
export async function seederGeneration(
  model   :  string,
  schema  :  Record<string, string> = {},
  data    :  any[][] = []
) : Promise<boolean> {
  const basePath = path.join(process.cwd(), "src", "database", "seeders");
  const filePath = path.join(basePath, `${model}Seeder.ts`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const schemaKeys = Object.keys(schema);

  const seeders = data.map((row) =>
    `  {${row
      .map((val, idx) => {
        const col = schemaKeys[idx];
        return `"${col}": ${isNaN(val) ? `"${val}"` : val}`;
      })
    .join(", ")}}`).join(",\n    ");

  const stubPath = path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-seeder.stub");
  let stub = fs.readFileSync(stubPath, "utf-8");

  stub = stub
    .replace(/{{\s*name\s*}}/g, model)
    .replace(/{{\s*model\s*}}/g, model)
    .replace(/{{\s*seeders\s*}}/g, seeders);

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  fs.writeFileSync(filePath, stub, "utf-8");

  return true;
}



// =========================================>
// ## Command: Blueprint documentation generation
// =========================================>
export async function documentationGeneration(
  documentations: Array<Record<string, any>>
): Promise<boolean> {
  const basePath = path.join(process.cwd(), "storage", "documentation");
  const collectionName = process.env.APP_NAME || "API Collection";
  const filePath = path.join(basePath, `${collectionName}(postman).json`);

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const folders: any[] = [];

  for (const documentation of documentations) {
    const controllers = documentation["controllers"] || {};

    for (const [route] of Object.entries(controllers)) {
      const folderName = route
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      const schema = documentation["schema"] ?? {};

      const crudOperations = [
        {
          name: `Get All ${folderName}`,
          method: "GET",
          path: `${route}`,
          body: {},
        },
        {
          name: `Create ${folderName}`,
          method: "POST",
          path: `${route}`,
          body: extractSchema(schema),
        },
        {
          name: `Update ${folderName}`,
          method: "PUT",
          path: `${route}/{id}`,
          body: extractSchema(schema),
        },
        {
          name: `Delete ${folderName}`,
          method: "DELETE",
          path: `${route}/{id}`,
          body: {},
        },
      ];

      const items = crudOperations.map((endpoint) => ({
        name: endpoint.name,
        request: {
          method: endpoint.method,
          header: [],
          body: {
            mode: "raw",
            raw: JSON.stringify(endpoint.body, null, 2),
          },
          url: {
            raw: `{{base_url}}/${endpoint.path}`,
            host: ["{{base_url}}"],
            path: endpoint.path.split("/"),
          },
        },
      }));

      folders.push({
        name: folderName,
        items,
      });
    }
  }

  const collection = {
    info: {
      name: collectionName,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: folders,
  };

  fs.writeFileSync(filePath, JSON.stringify(collection, null, 2), "utf-8");

  return true;
}



// =======================>
// ## Command: Blueprint engine
// =======================>
export async function runBlueprints(options?: { only?: string[] }) {
  const loaded = loadBlueprintFiles()
  const documentations: any[] = []

  for (const file of loaded) {
    const name = file.file.replace(".blueprint.json", "")

    if (options?.only && !options.only.includes(name)) continue

    for (const struct of file.blueprints) {
      const schema      = struct.schema ?? {}
      const relations   = struct.relations ?? {}
      const seeders     = struct.seeders ?? []
      const controllers = struct.controllers ?? {}

      await modelGeneration(struct.model, schema, relations)
      // await migrationGeneration(struct.model, schema)

      if (controllers !== false) {
        if (typeof controllers === "object" && Object.keys(controllers).length > 0) {
          for (const [route, controller] of Object.entries(controllers as Record<string, any>)) {
            await controllerGeneration(struct.model, schema, relations, controller, route)
          }
          documentations.push({ controllers, schema })
        } else {
          await controllerGeneration(struct.model, schema, relations)
          documentations.push({ controllers: {}, schema })
        }
      }

      if (seeders.length) {
        // await seederGeneration(struct.model, schema, seeders)
      }
    }
  }

  // await documentationGeneration(documentations)
}

// export async function blueprint(structs: BlueprintSchemaTypes[]) {
//   const documentations: Array<Record<string, any>> = [];

//   for (const struct of structs) {
//     const schema = struct.schema ?? {};
//     const relations = struct.relations ?? {};
//     const seeders = struct.seeders ?? [];
//     const controllers = struct.controllers ?? {};

//     await modelGeneration(struct.model, schema, relations);

//     await migrationGeneration(struct.model, schema);

//     if (controllers !== false) {
//       if (Object.keys(controllers).length > 0) {
//         for (const [route, controller] of Object.entries(controllers)) {
//           await controllerGeneration(struct.model, schema, relations, controller, route);
//         }
//         documentations.push({ controllers, schema, seeders });
//       } else {
//         const defaultRoute = conversion.strSlug(conversion.strSnake(conversion.strPlural(struct.model.replace("Controller", "")), "-"));
//         await controllerGeneration(struct.model, schema, relations);
//         documentations.push({
//           controllers: [{ [defaultRoute]: null }],
//           schema,
//           seeders,
//         });
//       }
//     }

//     if (seeders.length > 0) await seederGeneration(struct.model, schema, seeders);
//   }

//   await documentationGeneration(documentations);
// }



// =======================>
// ## Command: Blueprint load json files
// =======================>
function loadBlueprintFiles(dir = "blueprints") {
  const basePath = path.join(process.cwd(), "src", dir)

  if (!fs.existsSync(basePath)) {
    throw new Error("Blueprint folder not found")
  }

  return fs.readdirSync(basePath)
    .filter(f => f.endsWith(".blueprint.json"))
    .map(file => {
      const fullPath = path.join(basePath, file)
      const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"))

      if (!Array.isArray(content)) {
        throw new Error(`${file} must export array of blueprints`)
      }

      return {
        file,
        blueprints: content
      }
    })
}
// async function askChoice(message: string, choices: string[]): Promise<string> {
//   return new Promise((resolve) => {
//     console.log(message);
//     choices.forEach((c, i) => {
//       console.log(`${i + 1}. ${c}`);
//     });

//     const rl = readline.createInterface({
//       input: process.stdin,
//       output: process.stdout,
//     });

//     rl.question("Masukkan nomor pilihan: ", (answer) => {
//       const index = parseInt(answer, 10) - 1;
//       rl.close();
//       if (index >= 0 && index < choices.length) {
//         resolve(choices[index]);
//       } else {
//         logger.error(`Pilihan tidak valid, default ke: ${choices[0]}`)
//         resolve(choices[0]);
//       }
//     });
//   });
// }



// =====================================>
// ## Command: blueprint
// =====================================>
export const blueprintCommand = new Command("blueprint")
  .option("-o, --only <names...>", "Run only specific blueprints")
  .description("Run blueprints")
  .action(async (opts) => {
    await runBlueprints({ only: opts.only })

    logger.info("Success run all blueprints!")
    process.exit(0);
  })

// export const blueprintCommand = new Command("blueprint")
//   .argument("[blueprint]", "Name of blueprint")
//   .description("Run blueprint generation")
//   .action(async (blueprint?: string) => {
//     if (blueprint) {
//       try {
//         const modulePath = `../blueprints/${conversion.strPascal(blueprint)}Blueprint`;
//         const { default: RunnerClass } = await import(modulePath);

//         const runner = new RunnerClass();
//         await runner.run();

//         logger.info(`Successfully Generated ${blueprint} Blueprint!`)
//       } catch (err) {
//         logger.error(`Blueprint ${blueprint} Not Found!`)
//       }
//     } else {
//       const runChoice = await askChoice("Choose what you want to run?", [
//         "Run Starter Blueprint",
//         "Run Registered Blueprint",
//       ]);

//       if (runChoice === "Run Starter Blueprint") {
//         await new StarterBlueprint().run();
//         logger.info(`Successfully Generated Starter Blueprints!`)
//       } else {
//         await new BaseBlueprint().run();
//         logger.info(`Successfully Generated Registered Blueprints!`)
//       }
//     }
//   });

