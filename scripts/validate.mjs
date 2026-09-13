import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "data/portfolio.json",
  "README.md",
  "docs/EVIDENCE_REGISTER.md",
  "docs/RESUME_BULLETS.md"
];

const publicFiles = ["index.html", "styles.css", "app.js", "data/portfolio.json"];
const failures = [];

async function mustExist(relativePath) {
  try {
    const info = await stat(resolve(root, relativePath));
    if (!info.isFile()) failures.push(`${relativePath} 不是文件`);
  } catch {
    failures.push(`缺少 ${relativePath}`);
  }
}

await Promise.all(requiredFiles.map(mustExist));

const html = await readFile(resolve(root, "index.html"), "utf8");
const localReferences = [...html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)].map((match) => match[1]);
await Promise.all(localReferences.map((reference) => mustExist(reference.replace(/^\.\//, ""))));

const data = JSON.parse(await readFile(resolve(root, "data/portfolio.json"), "utf8"));
if (!Array.isArray(data.projects) || data.projects.length !== 8) {
  failures.push("作品集必须包含 8 个核心项目");
}

const slugs = new Set();
for (const project of data.projects ?? []) {
  const required = ["slug", "name", "headline", "problem", "solution", "next"];
  for (const field of required) {
    if (!project[field]) failures.push(`${project.slug ?? "未知项目"} 缺少 ${field}`);
  }
  if (slugs.has(project.slug)) failures.push(`项目 slug 重复：${project.slug}`);
  slugs.add(project.slug);
  if (!Array.isArray(project.facts) || project.facts.length < 3) {
    failures.push(`${project.slug} 至少需要 3 条事实证据`);
  }
  if (!Array.isArray(project.proof) || project.proof.length < 3) {
    failures.push(`${project.slug} 至少需要 3 条验证说明`);
  }
}

const forbiddenContent = [
  { label: "Windows 本地绝对路径", pattern: /[A-Z]:\\Users\\/i },
  { label: "Google API key", pattern: /AIza[0-9A-Za-z_-]{20,}/ },
  { label: "通用 secret/key 赋值", pattern: /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{12,}["']/i },
  { label: "Cookie header", pattern: /cookie:\s*[^\n]{8,}/i },
  { label: "占位文案", pattern: /\b(?:lorem ipsum|todo|fixme)\b/i }
];

for (const relativePath of publicFiles) {
  const content = await readFile(resolve(root, relativePath), "utf8");
  for (const rule of forbiddenContent) {
    if (rule.pattern.test(content)) failures.push(`${relativePath} 命中禁止项：${rule.label}`);
  }
}

if (!html.includes('lang="zh-CN"')) failures.push("HTML 缺少中文语言声明");
if (!html.includes("skip-link")) failures.push("HTML 缺少键盘跳转链接");
if (!html.includes("data-project-dialog")) failures.push("HTML 缺少项目详情对话框");

if (failures.length > 0) {
  process.stderr.write(`验证失败（${failures.length}）：\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`验证通过：${requiredFiles.length} 个核心文件、${data.projects.length} 个项目、${localReferences.length} 个本地资源引用。\n`);
}
