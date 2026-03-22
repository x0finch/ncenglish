/**
 * GitHub Pages serves 404.html for unknown paths; copy index.html so client routes work.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const indexHtml = join(root, "dist", "index.html");
const notFoundHtml = join(root, "dist", "404.html");

if (existsSync(indexHtml)) {
  copyFileSync(indexHtml, notFoundHtml);
  console.log("[spa-fallback] wrote dist/404.html");
}
