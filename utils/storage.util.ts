import fs from "fs";
import path from "path";
import { Elysia } from "elysia";
import { db } from "./db.util";



// ================================>
// ## Storage: Middleware storage handler
// ================================>
export const storage = (app: Elysia) => app.get("/storage/*", async ({ params, set, user }: Record<string, any>) => {
  const requestedPath  =  params["*"];
  const baseDir        =  path.resolve("storage", "public");
  const targetPath     =  path.resolve(baseDir, requestedPath);

  if (!targetPath.startsWith(baseDir)) {
    set.status = 400;
    return { error: "Invalid path" };
  }

  if (fs.existsSync(targetPath)) {
    const ext = path.extname(targetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg"   :  "image/jpeg",
      ".jpeg"  :  "image/jpeg",
      ".png"   :  "image/png",
      ".webp"  :  "image/webp",
      ".gif"   :  "image/gif",
      ".pdf"   :  "application/pdf",
      ".txt"   :  "text/plain",
      ".json"  :  "application/json",
      ".svg"   :  "image/svg+xml",
    };

    const buffer = fs.readFileSync(targetPath);

    set.headers["Content-Type"] = mimeTypes[ext] || "application/octet-stream";
    set.headers["Content-Length"] = buffer.length.toString();

    return new Response(buffer);
  } else {
    const baseDir        =  path.resolve("storage", "private");
    const targetPath     =  path.resolve(baseDir, requestedPath);

    if (fs.existsSync(targetPath)) {
      if (!user) {
        set.status = 404
        return { error: "File not found" };
      }

      const file = await db("storages").where({ path: requestedPath, disk: "private" }).first()

      if (!file) {
        set.status = 404
        return { error: "File not found" }
      }

      let hasAccess = file.user_id === user.id

      if (!hasAccess) {
        hasAccess = await db("storage_permissions").where("storage_id", file.id)
          .andWhere((q) => {
            q.where("user_id", user.id)
            .orWhere("role_id", user.role_id)
          })
          .first().then(Boolean)
      }


      if (!hasAccess) {
        set.status = 404
        return { error: "File not found" }
      }

    } else {
      set.status = 404;
      return { error: "File not found" };
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg"   :  "image/jpeg",
      ".jpeg"  :  "image/jpeg",
      ".png"   :  "image/png",
      ".webp"  :  "image/webp",
      ".gif"   :  "image/gif",
      ".pdf"   :  "application/pdf",
      ".txt"   :  "text/plain",
      ".json"  :  "application/json",
      ".svg"   :  "image/svg+xml",
    };

    const buffer = fs.readFileSync(targetPath);

    set.headers["Content-Type"] = mimeTypes[ext] || "application/octet-stream";
    set.headers["Content-Length"] = buffer.length.toString();

    return new Response(buffer);
  }

  
});