import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const host = process.env.HOST ?? "127.0.0.1";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"]
]);

function safePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const decoded = decodeURIComponent(url.pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = resolve(projectRoot, relative);
  const rootPrefix = `${projectRoot}${sep}`.toLowerCase();
  if (candidate.toLowerCase() !== projectRoot.toLowerCase() && !candidate.toLowerCase().startsWith(rootPrefix)) {
    return null;
  }
  return candidate;
}

const server = createServer(async (request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  try {
    const candidate = safePath(request.url);
    if (!candidate) {
      response.writeHead(400);
      response.end("Bad Request");
      return;
    }

    const info = await stat(candidate);
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(candidate);
    const type = contentTypes.get(extname(candidate).toLowerCase()) ?? "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": type,
      "Content-Length": body.byteLength,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
});

server.listen(port, host, () => {
  process.stdout.write(`RA Systems Portfolio: http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
