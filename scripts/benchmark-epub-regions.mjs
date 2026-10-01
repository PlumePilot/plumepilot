// Browser benchmark against original public fixtures. Optional external PDFs
// must be copied privately under the repository and excluded from commits.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright",
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.env.EPUB_BENCH_OUTPUT || "/tmp/plumepilot-epub-regions";
const server = createServer(async (req, res) => {
  const file = path.resolve(
    root,
    "." + decodeURIComponent(req.url.split("?")[0]),
  );
  if (!file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    res.setHeader(
      "Content-Type",
      file.endsWith(".mjs") || file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".pdf")
          ? "application/pdf"
          : "text/html",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.error(m.text());
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin + "/epub-builder.html");
  await page.addScriptTag({ url: origin + "/vendor/jszip.js" });
  await mkdir(output, { recursive: true });
  const results = [];
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["tests/fixtures/epub-regions.pdf"];
  for (const [label, regionalPreservation] of [
    ["baseline", false],
    ["regional", true],
  ]) {
    const result = await page.evaluate(
      async ({ regionalPreservation, files }) => {
        const { buildCourseEpub } = await import("./epub-core.mjs");
        const diagnostics = {};
        const result = await buildCourseEpub(
          "Original regional fixtures",
          files.map((url, i) => ({ url, chapter: `Fixture ${i + 1}` })),
          () => {},
          { generatorVersion: "prototype", regionalPreservation, diagnostics },
        );
        return {
          diagnostics,
          bytes: Array.from(result.bytes),
          failures: result.failures,
        };
      },
      { regionalPreservation, files },
    );
    await writeFile(
      path.join(output, label + ".epub"),
      new Uint8Array(result.bytes),
    );
    results.push({
      label,
      browserVersion: browser.version(),
      files,
      ...result.diagnostics,
      failures: result.failures,
    });
  }
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
