// ================================>
// ## Route: Basic api routers
// ================================>
export function api(app: any, basePath: string, controller: any) {
  return app.group(basePath, (group: any) => group
    .get("/", controller.index)
    .post("/", controller.store)
    .get("/:id", controller.show)
    .put("/:id", controller.update)
    .delete("/:id", controller.destroy)
  )
}