import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { hasUnsupportedMathText, wrapMathText } from "../epub-math.mjs";
import { createImageAssetRegistry } from "../epub-assets.mjs";
const require = createRequire(import.meta.url);
const JSZip = require("../vendor/jszip.js");

const math = "2𝑏 = 2 ∗ 3𝑐 = 6𝑐; R ≠ ℝ; N ≠ ℕ; α ≤ β";
assert.equal(hasUnsupportedMathText(math), false);
assert.equal(wrapMathText(math).replace(/<[^>]+>/g, ""), math);
assert.match(wrapMathText("2𝑏"), /2<span class="math-symbol">𝑏<\/span>/u);
for (const value of ["x\uFFFD", "x\uE000", "x\u{F0000}", "x\u0007", "x\u0378"]) {
  assert.equal(hasUnsupportedMathText(value), true);
}
assert.equal(hasUnsupportedMathText("Ordinary prose\nwith a tab\t."), false);

const zip = new JSZip(), diagnostics = {};
const registry = createImageAssetRegistry(zip, undefined, diagnostics);
const bytes = new Uint8Array([1, 2, 3, 4]);
const first = await registry.register({ name: "images/chapter-1.png", mediaType: "image/png", bytes });
const reused = await registry.register({ name: "images/chapter-2.png", mediaType: "image/png", bytes: bytes.slice() });
assert.equal(first, reused);
assert.equal(first.bytes, undefined);
assert.equal(Object.keys(zip.files).filter((name) => name.endsWith(".png")).length, 1);
// The content digest alone must not merge distinct media types/extensions.
await registry.register({ name: "images/type.jpg", mediaType: "image/jpeg", bytes });
await registry.register({ name: "images/extension.jpeg", mediaType: "image/jpeg", bytes });
assert.deepEqual(diagnostics.assets, { inputImageCount: 4, uniqueImageCount: 3,
  reusedImageCount: 1, inputImageBytes: 16, storedImageBytes: 12, reusedImageBytes: 4 });
const second = createImageAssetRegistry(new JSZip());
assert.equal((await second.register({ name: "images/new.png", mediaType: "image/png", bytes })).name, "images/new.png");
const controller = new AbortController(), cancelled = createImageAssetRegistry(new JSZip(), controller.signal);
const registration = cancelled.register({ name: "images/abort.png", mediaType: "image/png", bytes });
controller.abort();
await assert.rejects(registration, { name: "AbortError" });
assert.equal(cancelled.images.length, 0);
console.log("PASS: mathematical alphabets preserved, actual font coverage, export-scoped SHA-256/media/extension reuse and cancellation");
