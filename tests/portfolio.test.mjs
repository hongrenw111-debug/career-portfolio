import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const data = JSON.parse(await readFile(resolve(root, "data/portfolio.json"), "utf8"));
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const app = await readFile(resolve(root, "app.js"), "utf8");

test("portfolio keeps a single featured project and unique slugs", () => {
  assert.equal(data.projects.filter((project) => project.featured).length, 1);
  assert.equal(new Set(data.projects.map((project) => project.slug)).size, data.projects.length);
});

test("every project separates current proof from future work", () => {
  for (const project of data.projects) {
    assert.ok(project.status.length > 0, `${project.slug} has a status`);
    assert.ok(project.proof.length >= 3, `${project.slug} has evidence`);
    assert.ok(project.next.length >= 12, `${project.slug} has a concrete next step`);
    assert.ok(project.responsibilities.length >= 4, `${project.slug} shows ownership`);
  }
});

test("CS2 project is explicitly presented as simulation", () => {
  const cs2 = data.projects.find((project) => project.slug === "cs2-simulator");
  assert.ok(cs2);
  assert.match(`${cs2.status} ${cs2.proof.join(" ")}`, /模拟|SIMULATION/i);
});

test("page has semantic navigation and accessible dialogs", () => {
  assert.match(html, /<main id="main-content">/);
  assert.match(html, /<nav[^>]+aria-label="主导航"/);
  assert.match(html, /<dialog class="project-dialog"/);
  assert.match(html, /aria-label="关闭项目详情"/);
  assert.match(html, /role="status" aria-live="polite"/);
});

test("motion is optional and small screens have a dedicated layout", () => {
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("dynamic text is escaped before template rendering", () => {
  assert.match(app, /const escapeHtml/);
  assert.match(app, /escapeHtml\(project\.headline\)/);
});
