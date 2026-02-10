import fs from "fs";
import path from "path";
import { conversion } from "@utils";
import { resolveBlueprintPath } from "./runner";


// ================================>
// ## Command: Blueprint controller generation
// ================================>
export async function controllerGeneration(
  model        :  string,
  schema       :  Record<string, string>  =  {},
  relations    :  Record<string, string>  =  {},
  controller   :  string                  =  "",
  route        :  string                  =  "",
  permission   :  string                  =  "",
  marker       :  string
) {
  const resolvePath = resolveBlueprintPath(controller, "controller");
  if (!resolvePath) { return false };

  const { filePath } = resolvePath;

  const modelName = conversion.strPascal(model?.split("/")?.pop() || "");
  const controllerName = conversion.strPascal(controller?.split("/")?.pop() || "") + "Controller";
  const permissionCode = conversion.strPascal(permission?.split(":")?.[0] || "");
  const permissionName = conversion.strPascal(permission?.split(":")?.[1] || "", " ") || conversion.strPascal(controller?.split("/")?.pop() || "");

  const validations = {
    ...generateFieldValidations(model, schema),
    ...generateRelationValidations(relations)
  }

  let stub = fs.readFileSync(path.join(process.cwd(), "src", "utils", "commands", "make", "stubs", "light-controller.stub"), "utf-8");

  stub = stub
    .replace(/{{\s*marker\s*}}/g, marker)
    .replace(/{{\s*name\s*}}/g, controllerName)
    .replace(/{{\s*model\s*}}/g, modelName)
    .replace(/{{\s*permission_code\s*}}/g, permissionCode)
    .replace(/{{\s*permission_name\s*}}/g, permissionName)
    .replace(/{{\s*validations\s*}}/g, renderValidationObject(validations));

  fs.writeFileSync(filePath, stub, "utf-8");

  apiRouteGeneration(route, controllerName);

  return true;
}


// =============================>
// ## Command: Blueprint route generation
// =============================>
function apiRouteGeneration(routePath: string, controllerName: string) {
  const { file, apiPath } = parseRoutePath(routePath)

  const routesPath = ensureRouteFile(file)
  let content = fs.readFileSync(routesPath, "utf-8")

  content = ensureControllerImported(content, controllerName)
  content = ensureApiRoute(content, apiPath, controllerName)

  fs.writeFileSync(routesPath, content, "utf-8")
}






function renderValidationObject(rules: Record<string, string[]>) {
  return `\n${Object.entries(rules).map(([k, v]) => `            "${k}": ${JSON.stringify(v)}`).join(",\n")}\n        `
}

function generateRelationValidations(relations: Record<string, string>) {
  const rules: Record<string, string[]> = {}

  for (const [name, def] of Object.entries(relations)) {
    if (!def.includes("fillable")) continue

    const isMany = def.startsWith("[]") || def.startsWith("[]:")
    const target = def.replace(/[\[\]:]/g, "").split(" ")[0]
    const table  = conversion.strSnake(conversion.strPlural(target))

    if (isMany) {
      rules[name]         =  ["array"]
      rules[`${name}.*`]  =  ["number", `exists:${table},id`]
    } else {
      rules[conversion.strSingular(table) + "_id"]  =  ["number", `exists:${table},id`]
    }
  }

  return rules
}


function generateFieldValidations(model: string, schema: Record<string, string>) {
  const rules: Record<string, string[]> = {}
  const table = conversion.strSnake(conversion.strPlural(model))

  for (const [field, def] of Object.entries(schema)) {
    const r: string[] = []

    if(def.includes("required")) {
      r.push( "required")
    }

    if (def.includes("type:string")) {
      r.push("string")

      const len = def.match(/type:string,(\d+)/)
      if (len) r.push(`max:${len[1]}`)
    }

    if (def.includes("type:integer") || def.includes("type:bigInteger") || def.includes("type:float")) {
      r.push("numeric")
    }

    const min = def.match(/min:(\d+)/)
    if (min) r.push(`min:${min[1]}`)

    const max = def.match(/max:(\d+)/)
    if (max) r.push(`max:${max[1]}`)

    if (def.includes("unique")) {
      r.push(`unique:${table},${field}`)
    }

    if (r?.length) rules[field] =  r
  }

  return rules
}



function ensureControllerImported(content: string, controllerName: string): string {
  const importBlockRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]@[\w-]*controllers['"]/

  if (importBlockRegex.test(content)) {
    return content.replace(importBlockRegex, (match, group) => {
      if (group.includes(controllerName)) return match

      const updated = group.trim() ? `${group.trim()}\n    ${controllerName},` : controllerName

      return `import {\n${updated}\n} from '@controllers'`
    })
  }

  const importLine =
`import {
    ${controllerName}
} from '@controllers'\n\n`

  return importLine + content
}

function ensureApiRoute(content: string, routePath: string, controllerName: string): string {
  const apiLine = `api(route, "${routePath}", ${controllerName});`

  if (content.includes(apiLine)) return content

  const returnIndex = content.lastIndexOf("return route;")
  if (returnIndex === -1) {
    throw new Error("Cannot find `return route;` in routes file")
  }

  return (content.slice(0, returnIndex) + apiLine + "\n    " + content.slice(returnIndex))
}


function parseRoutePath(routePath: string) {
  if (!routePath.includes(":")) {
    return { file: "index", apiPath: routePath }
  }

  const parts = routePath.split(":").filter(Boolean)

  const file = parts.shift()!
  const apiPath = parts.join("/")

  return { file, apiPath }
}


function ensureRouteFile(file: string) {
  const routesDir = path.join(process.cwd(), "src", "routes")
  if (file === "index") return path.join(routesDir, "index.ts")

  const filePath = path.join(routesDir, `${file}.routes.ts`)
  if (fs.existsSync(filePath)) return filePath

  const stubPath = path.join(process.cwd(),"utils/commands/make/stubs/route.stub")
  let stub = fs.readFileSync(stubPath, "utf-8")

  stub = stub.replace(/{{\s*name\s*}}/g, file).replace(/{{\s*path\s*}}/g, file)

  fs.writeFileSync(filePath, stub, "utf-8")

  return filePath
}
