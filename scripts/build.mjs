import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");

const publicEntries = ["index.html", "styles.css", "app.js", "assets", "data/portfolio.json"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of publicEntries) {
  await cp(resolve(root, entry), resolve(dist, entry), { recursive: true });
}

process.stdout.write(`已构建 dist：${publicEntries.length} 个公开条目。\n`);
