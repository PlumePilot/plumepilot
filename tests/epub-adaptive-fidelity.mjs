import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Load first-party logic without browser/renderer dependencies. Actual PDF.js
// extraction and raster checks are documented separately in docs/epub-fidelity.md.
const ops = Object.fromEntries([
  "save", "restore", "transform", "paintImageXObject", "constructPath",
  "stroke", "fill", "shadingFill",
].map((name, index) => [name, index + 1]));
const source = readFileSync(new URL("../epub-core.mjs", import.meta.url), "utf8")
  .replace('import * as pdfjsLib from "./vendor/pdf.mjs";', "")
  .replaceAll("import.meta.url", '"file:///epub-core.mjs"')
  .replace("export async function", "async function")
  .replace("export const __testing =", "globalThis.api =");
const context = vm.createContext({
  URL, pdfjsLib: { OPS: ops, GlobalWorkerOptions: {} },
  MessageChannel: class { port1 = {}; port2 = {}; },
});
vm.runInContext(source, context);
const api = context.api;
const viewport = { width: 600, height: 800 };
const item = (str, x, y, size = 12, width = str.length * 6) => ({
  str, transform: [size, 0, 0, size, x, y], width, fontName: "plain",
});
const prose = [0, 1, 2, 3, 4].map((i) =>
  item("Una frase sufficientemente lunga per descrivere il procedimento.", 60, 700 - i * 20));
const content = (items) => ({ items, styles: {} });
const page = (operations = { fnArray: [], argsArray: [] }, size = viewport) => ({
  getViewport: () => size, getOperatorList: async () => operations,
});
assert.equal((await api.pageNeedsVisual(page(), content(prose))).visual, false);
assert.equal(api.hasSuspiciousText(content([item("x \uE000 y", 60, 600)])), true);
assert.equal(api.hasSuspiciousText(content([item("x \uFFFD y", 60, 600)])), true);
// An isolated decorative/invalid footer must not convert all prose to images.
assert.equal((await api.pageNeedsVisual(page(), content([
  ...prose, item("Copyright \uE000", 60, 20),
]))).visual, false);
for (const y of [625, 615]) {
  const math = content([...prose, item("x", 60, 620), item("2", 67, y, 8, 4), item("= 4", 84, 620)]);
  assert.equal(api.hasPositionedScript(math, viewport), true);
  assert.equal((await api.pageNeedsVisual(page(), math)).visual, true);
}
const footnoteBase = item("Una frase sufficientemente lunga con una nota", 60, 590);
const reference = content([...prose, footnoteBase,
  item("1", 60 + footnoteBase.width + 1, 594, 8, 4)]);
assert.equal(api.hasPositionedScript(reference, viewport), false);
assert.match(api.textPageToHtml(reference, viewport).html, /footnote-ref/);
assert.equal(api.hasPositionedScript(content([...prose, item("2", 432, 700, 8, 4)]), viewport), false);

const table = content(["Nome", "A", "B"].flatMap((label, i) => [
  item(label, 60, 600 - i * 20), item(String(i + 1), 300, 600 - i * 20),
]));
assert.equal(api.hasSmallTable(table, viewport), true);
assert.equal((await api.pageNeedsVisual(page(), table)).visual, true);
assert.equal(api.hasSmallTable(content(table.items.slice(0, 4)), viewport), false);
assert.equal(api.hasSmallTable(content(prose), viewport), false);

const outlined = await api.pageNeedsVisual(page({ fnArray: Array(20).fill(ops.fill) }), content([]));
assert.equal(outlined.visual, true);
assert.equal(outlined.preserveWhole, false);
assert.equal(outlined.renderWidth, 1800);
const cover = await api.pageNeedsVisual(page({
  fnArray: [ops.transform, ops.paintImageXObject],
  argsArray: [[600, 0, 0, 800, 0, 0], []],
}), content([]));
assert.equal(cover.preserveWhole, true);
assert.equal(cover.renderWidth, 1200);
const slide = await api.pageNeedsVisual(page(undefined, { width: 960, height: 540 }), content(prose));
assert.equal(slide.preserveWhole, true);
assert.equal(slide.renderWidth, 1200);
const slideTable = await api.pageNeedsVisual(page({
  fnArray: Array(20).fill(ops.stroke),
}, { width: 960, height: 540 }), content(prose));
assert.equal(slideTable.renderWidth, 1800);
assert.equal(slideTable.preserveWhole, true);

const ranges = (ink, options) => Array.from(api.visualBlockRanges(0, 2400, 1200, ink, options),
  ({ start, end }) => ({ start, end }));
assert.deepEqual(ranges(() => 10), [{ start: 0, end: 2400 }]);
// A narrow white row inside an equation is not a safe cut.
assert.deepEqual(ranges((y) => y === 1150 ? 0 : 10), [{ start: 0, end: 2400 }]);
const split = ranges((y) => y >= 1130 && y < 1170 ? 0 : 10);
assert.equal(split.length, 2);
assert.ok(split[0].end > 1130 && split[0].end < 1170);
assert.equal(split[0].end, split[1].start);
assert.equal(split[1].end, 2400);
const extended = ranges((y) => y >= 1550 && y < 1580 ? 0 : 10);
assert.ok(extended[0].end >= 1550);
assert.deepEqual(ranges(() => 0, { preserveWhole: true }), [{ start: 0, end: 2400 }]);
assert.deepEqual(Array.from(api.visualBlockRanges(20, 20, 1200, () => 0)), []);
for (const size of [viewport, { width: 1000, height: 100000 }]) {
  const scale = api.visualRenderScale(size, 1800);
  assert.ok(size.width * size.height * scale * scale <= 5000001);
  assert.ok(Math.max(size.width, size.height) * scale <= 8192);
}
console.log("PASS: EPUB prose, missing symbols, scripts/footnotes, small tables, outlined pages/covers, safe cuts and raster limits");
