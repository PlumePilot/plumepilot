// Supplementary renderer benchmark. These timings are NOT browser measurements.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
// Browser distribution uses newer collection/binary helpers absent in Node 24.
Uint8Array.prototype.toHex ??= function () {
  return Buffer.from(this).toString("hex");
};
Uint8Array.fromHex ??= (value) => new Uint8Array(Buffer.from(value, "hex"));
Map.prototype.getOrInsertComputed ??= function (key, factory) {
  if (!this.has(key)) this.set(key, factory(key));
  return this.get(key);
};
const require = createRequire(import.meta.url);
const { createCanvas, DOMMatrix, ImageData, Path2D } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/@napi-rs/canvas",
);
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
globalThis.document = {
  createElement(type) {
    if (type !== "canvas") throw Error(type);
    const canvas = createCanvas(1, 1);
    globalThis.benchmarkCanvases?.push(canvas);
    canvas.toBlob = (callback, mediaType, quality) => {
      try {
        globalThis.onBenchmarkEncode?.();
        callback(
          new Blob(
            [
              canvas.toBuffer(
                mediaType,
                mediaType === "image/jpeg"
                  ? Math.round(quality * 100)
                  : undefined,
              ),
            ],
            { type: mediaType },
          ),
        );
      } catch {
        callback(null);
      }
    };
    return canvas;
  },
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = process.env.EPUB_BENCH_OUTPUT || "/tmp/plumepilot-epub-node";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url).startsWith("http")) return originalFetch(url, options);
  return new Response(
    await readFile(
      String(url).startsWith("file:")
        ? new URL(url)
        : path.resolve(root, String(url)),
    ),
    { status: 200 },
  );
};
globalThis.JSZip = require(path.join(root, "vendor/jszip.js"));
let source = await readFile(path.join(root, "epub-core.mjs"), "utf8");
source = source
  .replace(
    '"./vendor/pdf.mjs"',
    JSON.stringify(pathToFileURL(path.join(root, "vendor/pdf.mjs")).href),
  )
  .replace(
    '"./epub-regions.mjs"',
    JSON.stringify(pathToFileURL(path.join(root, "epub-regions.mjs")).href),
  )
  .replace(
    /standardFontDataUrl: new URL\([\s\S]*?\)\.href,/,
    `standardFontDataUrl: ${JSON.stringify(path.join(root, "vendor/standard_fonts/") + path.sep)},`,
  )
  .replaceAll(
    "import.meta.url",
    JSON.stringify(pathToFileURL(path.join(root, "epub-core.mjs")).href),
  );
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "core.mjs"), source);
const { buildCourseEpub } = await import(
  pathToFileURL(path.join(output, "core.mjs"))
);
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["tests/fixtures/epub-regions.pdf"];
const results = [];
for (const [label, regionalPreservation] of [
  ["baseline", false],
  ["regional", true],
]) {
  const diagnostics = {};
  const result = await buildCourseEpub(
    "Original regional fixtures",
    files.map((url, i) => ({ url, chapter: `Fixture ${i + 1}` })),
    () => {},
    { generatorVersion: "prototype", regionalPreservation, diagnostics },
  );
  await writeFile(path.join(output, label + ".epub"), result.bytes);
  results.push({
    label,
    runtime: process.version,
    scope: "Node/native canvas, not a browser",
    files,
    ...diagnostics,
    failures: result.failures,
  });
}
await writeFile(
  path.join(output, "results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
if (process.env.EPUB_BENCH_CHECKS !== "0") {
  const { default: assert } = await import("node:assert/strict");
  const controller = new AbortController();
  globalThis.benchmarkCanvases = [];
  globalThis.onBenchmarkEncode = () => controller.abort();
  await assert.rejects(
    buildCourseEpub(
      "Cancel fixture",
      [{ url: files[0], chapter: "Cancel" }],
      () => {},
      { regionalPreservation: true, signal: controller.signal },
    ),
    { name: "AbortError" },
  );
  assert.ok(globalThis.benchmarkCanvases.length >= 3);
  assert.ok(
    globalThis.benchmarkCanvases.every((c) => c.width <= 1 && c.height <= 1),
  );
  delete globalThis.onBenchmarkEncode;
  delete globalThis.benchmarkCanvases;
  const repeat = await buildCourseEpub(
    "Repeat fixture",
    [{ url: files[0], chapter: "Repeat" }],
    () => {},
    { regionalPreservation: true },
  );
  assert.equal(repeat.failures.length, 0);
  console.log(
    "PASS: cancellation during regional encoding releases temporary canvases; repeated export succeeds",
  );
}
console.log(JSON.stringify(results, null, 2));
process.exit(0); // browser-yield MessageChannel is intentionally live in core
