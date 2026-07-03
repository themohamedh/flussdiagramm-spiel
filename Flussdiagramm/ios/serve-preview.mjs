import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

createServer(async (_request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(await readFile(join(root, "preview.html")));
}).listen(8765, "127.0.0.1");
