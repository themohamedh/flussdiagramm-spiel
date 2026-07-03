import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || process.argv.find((arg) => arg.startsWith("--port="))?.slice("--port=".length) || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

function requestPath(requestUrl = "/") {
  let pathname;
  try {
    const url = new URL(requestUrl, `http://${host}:${port}`);
    pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  } catch {
    return null;
  }

  const target = path.resolve(root, `.${pathname.replace(/\\/g, "/")}`);
  const relative = path.relative(root, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  const target = requestPath(request.url);
  if (!target) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(target);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream"
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error?.code === "ENOENT" ? "Not found" : "Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}/`);
});
