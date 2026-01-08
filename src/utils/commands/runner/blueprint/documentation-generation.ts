import fs from "fs"
import path from "path"
import { conversion } from "@utils"

const ERD_PATH = path.join(process.cwd(), "storage", "documentation", "entity")
const API_PATH = path.join(process.cwd(), "storage", "documentation", "api")



// =========================================>
// ## Command: Blueprint documentation generation
// =========================================>
export async function generatePostmanAPIDocumentation(
  documentations: Array<Record<string, any>>
): Promise<boolean> {
  const collectionName = process.env.APP_NAME || "API Collection";
  const filePath = path.join(API_PATH, `${collectionName}.postman.json`);

  if (!fs.existsSync(API_PATH)) {
    fs.mkdirSync(API_PATH, { recursive: true });
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



function extractSchema(schema: Record<string, string>) {
  const obj: Record<string, any> = {};
  for (const key of Object.keys(schema)) {
    obj[key] = "";
  }
  return obj;
}





// =========================================>
// ## Blueprint: mermaid entity documentation generation
// =========================================>
export async function generateMermaidEntityDocumentation(
  blueprintFile: string,
  blueprints: any[]
) {
  const filePath = getMermaidERDPath(blueprintFile)

  if (!fs.existsSync(ERD_PATH)) {
    fs.mkdirSync(ERD_PATH, { recursive: true })
  }

  const entities: string[] = []
  const relations: string[] = []

  for (const bp of blueprints) {
    entities.push(renderMermaidEntity(bp.model, bp.schema ?? {}))

    if (bp.relations) {
      relations.push(renderMermaidRelations(bp.model, bp.relations))
    }
  }

  const content = `
erDiagram
${entities.join("\n")}
${relations.join("\n")}
`

  fs.writeFileSync(filePath, content.trim(), "utf-8")
}



function getMermaidERDPath(blueprintFile: string) {
  const name = blueprintFile.replace(".blueprint.json", "")
  return path.join(ERD_PATH, `${name}.mmd`)
}

function mapToMermaidType(def: string): string {
  if (def.includes("type:string")) return "string"
  if (def.includes("type:bigInteger")) return "bigint"
  if (def.includes("type:integer")) return "int"
  if (def.includes("type:json")) return "json"
  if (def.includes("type:timestamp")) return "timestamp"
  return "string"
}

function renderMermaidEntity(model: string, schema: Record<string, string>) {
  const table = conversion.strSnake(conversion.strPlural(model.split("/").pop()!))

  const fields = Object.entries(schema).map(([name, def]) => `    ${mapToMermaidType(def)} ${name}`).join("\n")

  return `
  ${table} {
${fields}
  }
`
}

function renderMermaidRelations(
  model: string,
  relations: Record<string, string>
) {
  const source = conversion.strSnake(
    conversion.strPlural(model.split("/").pop()!)
  )

  return Object.entries(relations)
    .map(([name, def]) => {
      const targetModel = def.replace(/\[\]|\[1\]|:/g, "").split(" ")[0]
      const target = conversion.strSnake(conversion.strPlural(targetModel))

      if (def.startsWith("[]:")) {
        return `  ${source} }o--o{ ${target} : ${name}`
      }
      if (def.startsWith("[]")) {
        return `  ${source} ||--o{ ${target} : ${name}`
      }
      if (def.startsWith("[1]")) {
        return `  ${source} ||--|| ${target} : ${name}`
      }
      return `  ${source} }o--|| ${target} : ${name}`
    })
    .join("\n")
}





// =========================================>
// ## Blueprint: drawio entity documentation generation
// =========================================>
const MODULE_WIDTH = 1600      
const MODULE_PADDING_X = 80
const MODULE_PADDING_Y = 80

const ENTITY_COL_WIDTH = 320
const ENTITY_ROW_HEIGHT = 240
const ENTITY_COLS = 3



export async function generateDrawioEntityDocumentation(
  blueprintFiles: Array<{ file: string; blueprints: any[] }>
) {
  const appName = conversion.strSlug(process.env.APP_NAME || "app");
  const filePath = path.join(ERD_PATH, `${appName}.drawio.xml`)

  if (!fs.existsSync(ERD_PATH)) {
    fs.mkdirSync(ERD_PATH, { recursive: true })
  }

  let xml = drawioHeader()
  const entityIds = new Map<string, string>()

  let moduleIndex = 0

  for (const file of blueprintFiles) {
    const moduleX = moduleIndex * MODULE_WIDTH
    const moduleY = 0

    renderDrawioModule(
      file.blueprints,
      moduleX,
      moduleY,
      entityIds,
      (chunk) => {
        xml += "\n" + chunk
      }
    )

    moduleIndex++
  }

  xml += "\n" + drawioFooter()
  fs.writeFileSync(filePath, xml, "utf-8")
}


function renderDrawioModule(
  blueprints: any[],
  baseX: number,
  baseY: number,
  entityIds: Map<string, string>,
  push: (xml: string) => void
) {
  blueprints.forEach((bp, i) => {
    const table = conversion.strSnake(
      conversion.strPlural(bp.model.split("/").pop()!)
    )

    const col = i % ENTITY_COLS
    const row = Math.floor(i / ENTITY_COLS)

    const x =
      baseX +
      MODULE_PADDING_X +
      col * ENTITY_COL_WIDTH

    const y =
      baseY +
      MODULE_PADDING_Y +
      row * ENTITY_ROW_HEIGHT

    entityIds.set(table, table)

    renderERDTableFromSchema(
      table,
      bp.schema ?? {},
      x,
      y,
      push
    )
  })

  // relasi tetap sama
  blueprints.forEach((bp) => {
    if (!bp.relations) return

    const source = conversion.strSnake(
      conversion.strPlural(bp.model.split("/").pop()!)
    )

    Object.entries(bp.relations).forEach(([name, def], idx) => {
      const targetModel = (def as string)
        .replace(/\[\]|\[1\]|:/g, "")
        .split(" ")[0]

      const target = conversion.strSnake(
        conversion.strPlural(targetModel)
      )

      if (!entityIds.has(target)) return

      push(
        renderDrawioRelation(
          `rel_${source}_${target}_${idx}`,
          source,
          target,
          name
        )
      )
    })
  })
}



function drawioHeader(): string {
  return `
<mxfile>
  <diagram name="ERD">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
`.trim()
}

function drawioFooter(): string {
  return `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`.trim()
}

function renderERDTableFromSchema(
  table: string,
  schema: Record<string, string>,
  baseX: number,
  baseY: number,
  push: (xml: string) => void
) {
  const fields = Object.entries(schema)

  push(renderDrawioTable(table, table, baseX, baseY, fields.length))

  fields.forEach(([name, def], index) => {
    const rowId = `${table}_row_${index}`
    const y = 30 + index * 30

    push(renderDrawioTableRow(rowId, table, y))

    const isPK = name === "id"
    const isFK = name.endsWith("_id")

    push(
      renderDrawioTableCell(
        `${rowId}_key`,
        rowId,
        isPK ? "PK" : isFK ? "FK" : "",
        0,
        40,
        true
      )
    )

    push(
      renderDrawioTableCell(
        `${rowId}_name`,
        rowId,
        `${name} : ${mapDrawioType(def)}`,
        40,
        220
      )
    )
  })
}


function mapDrawioType(def: string) {
  if (def.includes("type:bigInteger")) return "bigint"
  if (def.includes("type:integer")) return "int"
  if (def.includes("type:json")) return "json"
  if (def.includes("type:timestamp")) return "timestamp"
  return "string"
}

function renderDrawioTable(
  tableId: string,
  tableName: string,
  x: number,
  y: number,
  rowCount: number
) {
  const height = 30 + rowCount * 30

  return `
<mxCell id="${tableId}"
  value="${tableName}"
  style="shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;html=1;"
  vertex="1"
  parent="1">
  <mxGeometry x="${x}" y="${y}" width="260" height="${height}" as="geometry"/>
</mxCell>
`.trim()
}

function renderDrawioTableRow(
  rowId: string,
  tableId: string,
  y: number
) {
  return `
<mxCell id="${rowId}"
  parent="${tableId}"
  value=""
  style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;"
  vertex="1">
  <mxGeometry y="${y}" width="260" height="30" as="geometry"/>
</mxCell>
`.trim()
}


function renderDrawioTableCell(
  cellId: string,
  rowId: string,
  value: string,
  x: number,
  width: number,
  bold = false
) {
  return `
<mxCell id="${cellId}"
  parent="${rowId}"
  value="${value}"
  style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=6;fontStyle=${bold ? 1 : 0};overflow=hidden;whiteSpace=wrap;html=1;"
  vertex="1">
  <mxGeometry x="${x}" width="${width}" height="30" as="geometry"/>
</mxCell>
`.trim()
}
// function renderDrawioEntity(
//   id: string,
//   table: string,
//   fields: string[],
//   x: number,
//   y: number
// ) {
//   const value =
//     table +
//     "&#xa;" +
//     fields.join("&#xa;")

//   const height = 60 + fields.length * 20

//   return `
// <mxCell
//   id="${id}"
//   value="${value}"
//   style="shape=mxgraph.er.entityTable;whiteSpace=wrap;"
//   vertex="1"
//   parent="1">
//   <mxGeometry x="${x}" y="${y}" width="260" height="${height}" as="geometry"/>
// </mxCell>
// `.trim()
// }




// function mapDrawioERDField(
//   name: string,
//   def: string
// ) {
//   let type = "string"

//   if (def.includes("type:bigInteger")) type = "bigint"
//   else if (def.includes("type:integer")) type = "int"
//   else if (def.includes("type:json")) type = "json"
//   else if (def.includes("type:timestamp")) type = "timestamp"

//   let suffix = ""

//   if (name === "id") suffix = " PK"
//   else if (name.endsWith("_id")) suffix = " FK"

//   return `${name} : ${type}${suffix}`
// }



function renderDrawioRelation(
  id: string,
  source: string,
  target: string,
  label: string
) {
  return `
<mxCell
  id="${id}"
  value="${label}"
  style="edgeStyle=entityRelationEdgeStyle;html=1;"
  edge="1"
  parent="1"
  source="${source}"
  target="${target}">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
`.trim()
}

