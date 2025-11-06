import fs from "fs";
import path from "path";
import { Elysia } from "elysia";



// ================================>
// ## Storage: Middleware storage handler
// ================================>
export const storage = (app: Elysia) => app.get("/storage/*", async ({ params, set }) => {
  const requestedPath  =  params["*"];
  const baseDir        =  path.resolve("storage", "public");
  const targetPath     =  path.resolve(baseDir, requestedPath);

  if (!targetPath.startsWith(baseDir)) {
    set.status = 400;
    return { error: "Invalid path" };
  }

  if (!fs.existsSync(targetPath)) {
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
});