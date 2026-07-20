import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const appFiles = [
  "index.html",
  "liquid-glass.css",
  "unterrichtsmaterial.js",
  "tarif-toni.css",
  "tarif-toni.js",
  "manifest.webmanifest",
  "app-icon.svg",
  "C9BD4168-EDB7-44C9-8257-97976AA34FB8.png",
  "tarif-toni-character-sheet.png",
  "privacy.html",
  "support.html"
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of appFiles) {
  await cp(resolve(root, file), resolve(dist, file));
}

const indexPath = resolve(dist, "index.html");
let index = await readFile(indexPath, "utf8");

// The native container already works offline, so the PWA service worker is
// intentionally disabled inside the App Store build.
index = index.replace(
  /<script>\s*if \("serviceWorker" in navigator\)[\s\S]*?<\/script>\s*<\/body>/,
  "</body>"
);

await writeFile(indexPath, index, "utf8");
console.log(`Prepared native web assets in ${dist}`);
