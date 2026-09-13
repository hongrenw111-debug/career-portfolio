import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const debugPort = Number.parseInt(process.env.CDP_PORT ?? "9223", 10);
const targetUrl = process.env.TARGET_URL ?? "http://127.0.0.1:4173/";
const viewportWidth = Number.parseInt(process.env.VIEWPORT_WIDTH ?? "390", 10);
const viewportHeight = Number.parseInt(process.env.VIEWPORT_HEIGHT ?? "844", 10);
const scrollY = Number.parseInt(process.env.SCROLL_Y ?? "0", 10);
const openDialog = process.env.OPEN_DIALOG ?? "";
const projectSlug = process.env.PROJECT_SLUG ?? "agentgate";

const targets = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
const target = targets.find((entry) => entry.type === "page" && entry.url.startsWith(targetUrl));
if (!target?.webSocketDebuggerUrl) throw new Error(`没有找到 ${targetUrl} 的 Chrome 调试页签`);

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", rejectOpen, { once: true });
});

let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
const networkFailures = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve: resolveCall, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolveCall(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    runtimeErrors.push(message.params.entry.text);
  }
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
    networkFailures.push(`${message.params.response.status} ${message.params.response.url}`);
  }
  if (message.method === "Network.loadingFailed") {
    networkFailures.push(`${message.params.errorText} ${message.params.requestId}`);
  }
});

function call(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolveCall, reject) => {
    pending.set(id, { resolve: resolveCall, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await call("Runtime.enable");
await call("Log.enable");
await call("Page.enable");
await call("Network.enable");
await call("Page.bringToFront");
await call("Emulation.setDeviceMetricsOverride", {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: viewportWidth < 760
});
runtimeErrors.length = 0;
networkFailures.length = 0;
await call("Page.reload", { ignoreCache: true });
await new Promise((resolveWait) => setTimeout(resolveWait, 120));
await evaluate(`window.scrollTo({ top: ${scrollY}, behavior: 'instant' }); true`);
await new Promise((resolveWait) => setTimeout(resolveWait, 900));

const layout = await evaluate(`(() => {
  const viewport = document.documentElement.clientWidth;
  const offenders = [...document.querySelectorAll('body *')]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className.slice(0, 80) : '',
        text: (element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width)
      };
    })
    .filter((item) => item.right > viewport + 1 || item.left < -1)
    .slice(0, 25);
  const globalOffenders = [...document.querySelectorAll('body *')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.right <= viewport + 1 && rect.left >= -1) return false;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth) return false;
        parent = parent.parentElement;
      }
      return true;
    })
    .map((element) => ({
      tag: element.tagName.toLowerCase(),
      className: typeof element.className === 'string' ? element.className.slice(0, 80) : '',
      text: (element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
    }))
    .slice(0, 25);
  return {
    title: document.title,
    viewport,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    h1: document.querySelector('h1')?.innerText,
    projectRows: document.querySelectorAll('[data-project-row]').length,
    revealStates: [...document.querySelectorAll('.reveal')].slice(0, 8).map((element) => ({
      className: element.className,
      opacity: getComputedStyle(element).opacity,
      top: Math.round(element.getBoundingClientRect().top)
    })),
    offenders: globalOffenders,
    nestedScrollItems: offenders.length - globalOffenders.length
  };
})()`);

const interaction = await evaluate(`(async () => {
  document.querySelector('[data-project-open="${projectSlug.replaceAll('"', '\\"')}"]')?.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const projectOpen = document.querySelector('[data-project-dialog]')?.open === true;
  document.querySelector('[data-dialog-close]')?.click();
  document.querySelector('[data-resume-trigger]')?.click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const resumeOpen = document.querySelector('[data-resume-dialog]')?.open === true;
  document.querySelector('[data-resume-close]')?.click();
  document.querySelector('[data-fault="quota"]')?.click();
  const faultAtlasChanged = document.querySelector('[data-atlas-decision]')?.textContent?.includes('停止重试') === true;
  document.querySelector('[data-fault="network"]')?.click();
  return { projectOpen, resumeOpen, faultAtlasChanged };
})()`);

if (openDialog === "project") {
  await evaluate(`document.querySelector('[data-project-open="${projectSlug.replaceAll('"', '\\"')}"]')?.click(); true`);
} else if (openDialog === "resume") {
  await evaluate(`document.querySelector('[data-resume-trigger]')?.click(); true`);
}
await new Promise((resolveWait) => setTimeout(resolveWait, 100));
const dialogState = await evaluate(`({
  project: document.querySelector('[data-project-dialog]')?.open === true,
  resume: document.querySelector('[data-resume-dialog]')?.open === true
})`);

await evaluate(`window.scrollTo({ top: ${scrollY}, behavior: 'instant' }); true`);
await new Promise((resolveWait) => setTimeout(resolveWait, 680));

const screenshot = await call("Page.captureScreenshot", {
  format: "png",
  fromSurface: true,
  captureBeyondViewport: false
});
const dialogSuffix = openDialog ? `-${openDialog}` : "";
const screenshotName = `${viewportWidth < 760 ? "mobile" : "desktop"}-audit-${scrollY}${dialogSuffix}.png`;
const screenshotPath = resolve(root, screenshotName);
await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

const report = {
  viewport: `${viewportWidth}x${viewportHeight}`,
  scrollY,
  layout,
  interaction,
  dialogState,
  runtimeErrors,
  networkFailures,
  screenshotPath
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
socket.close();

if (layout.scrollWidth > layout.viewport || layout.offenders.length > 0 || !interaction.projectOpen || !interaction.resumeOpen || !interaction.faultAtlasChanged || runtimeErrors.length > 0 || networkFailures.length > 0) {
  process.exitCode = 1;
}
