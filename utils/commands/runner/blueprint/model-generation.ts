import fs from "fs";
import path from "path";
import { conversion } from "@utils";
import { resolveBlueprintPath } from "./runner";


// ============================>
// ## Command: blueprint model generation
// ============================>
export async function modelGeneration(model: string, schema: Record<string, string> = {}, relations: Record<string, string> = {}, marker: string): Promise<boolean> {
  const resolvePath = resolveBlueprintPath(model, "model");
  if (!resolvePath) { return false };

  const { name, folder, basePath, filePath } = resolvePath;
  const modelName = conversion.strPascal(name);

  let imports: string[] = []
  let importUtils: string[] = ["Field"]

  // ? Fields
  const fields: string[] = []

  for (const [name, def] of Object.entries(schema)) {
    const flags: string[] = []
    const typeMatch = /type:(\w+),?(\d+)?/.exec(def);
    const type = typeMatch?.[1] ?? "string";

    let columnType = "any";
    switch (type) {
      case "bigInt":
      case "bigint":
      case "bigInteger":
      case "int":
      case "integer":
      case "float":
        columnType = "number";
        break;
      case "string":
      case "text":
      case "time":
        columnType = "string";
        break;
      case "date":
      case "timestamp":
        columnType = "Date";
        break;
      case "json":
        columnType = "Record<string,any>";
        break;
      case "boolean":
        columnType = "boolean";
        break;
      default:
        columnType = "any";
        break;
    }

    if (def.includes("fillable")) flags.push("fillable")
    if (def.includes("searchable")) flags.push("searchable")
    if (def.includes("selectable")) flags.push("selectable")
    if (def.includes("hidden")) flags.push("hidden")

    const decorator = flags.length ? `@Field(${JSON.stringify(flags)})` : ""

    fields.push([
      `    ${decorator}`,
      `    ${name}!: ${columnType}`
    ].join("\n"))
  }

  // ? Relations
  const relationFields: string[] = []
  
  let importRelations: string[] = [];

  for (const [name, def] of Object.entries(relations)) {
    let type = "BelongsTo"
    let target = conversion.strPascal(def.replace(/\[\]|\[1\]|:/g, "").split(" ")[0].split(",")[0])
    const fk = def.split(" ")[0].split(",")[1] || null

    if (def.startsWith("[]:")) type = "BelongsToMany"
    else if (def.startsWith("[]")) type = "HasMany"
    else if (def.startsWith("[1]")) type = "HasOne"

    !importUtils.includes(type) && importUtils.push(type)
    !importRelations.includes(target) && importRelations.push(`${target}`)

    const isMany = type === "HasMany" || type === "BelongsToMany"

    relationFields.push([
      ...(type === "BelongsTo" ? [`    ${fk ? fk : conversion.strSnake(target) + "_id"}!: number\n`] : []),
      `    @${type}(() => ${target}${fk ? `, { foreignKey: "${fk}" }` : ""})`,
      `    ${name}!: ${isMany ? `${target}[]` : target}`
    ].join("\n"))
  }

  if(importRelations.length) {
    imports.push(`import { ${importRelations.join(", ")} } from '@models'`)
  }

  let stub = fs.readFileSync(path.join(process.cwd(), "utils/commands/make/stubs/light-model.stub"), "utf-8")

  const strImportUtils = importUtils?.length ? ", " + importUtils.join(", ") : ""

  stub = stub
    .replace(/{{\s*marker\s*}}/g, marker)
    .replace(/{{\s*name\s*}}/g, modelName)
    .replace(/{{\s*fields\s*}}/g, fields.join("\n\n"))
    .replace(/{{\s*relations\s*}}/g, relationFields.join("\n\n"))
    .replace(/{{\s*attributes\s*}}/g, "")
    .replace(/{{\s*import\s*}}/g, imports.join("\n"))
    .replace(/{{\s*import_utils\s*}}/g, strImportUtils)

  fs.writeFileSync(filePath, stub, "utf-8")

  for (const def of Object.values(relations)) {
    if (!def.startsWith("[]:")) continue

    const target = def.replace("[]:", "").trim()
    generatePivotModel(model, target, marker, basePath)
  }

  return true
}


function generatePivotModel(sourceModel: string, targetModel: string, marker: string, basePath: string) {
  if (sourceModel > targetModel) return

  const a = sourceModel.split("/").pop()!
  const b = targetModel.split("/").pop()!

  const pivotModelName = conversion.strPascal(a) + "Has" + conversion.strPascal(b)

  const pivotRelations: Record<string, string> = {
    [conversion.strSnake(a)]: a,
    [conversion.strSnake(b)]: b
  }

  modelGeneration(
    `${basePath}/${conversion.strSlug(pivotModelName)}`,
    {},                 
    pivotRelations,
    marker
  )
}
