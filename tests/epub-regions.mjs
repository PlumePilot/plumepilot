import assert from "node:assert/strict";
import { inkBands, intersectsBand, inkIsCovered, refineInkBands } from "../epub-regions.mjs";
const ranges = inkBands(140, 24, (y) => (y < 40 || y >= 100 ? 1 : 0));
assert.deepEqual(ranges, [
  { start: 0, end: 70 },
  { start: 70, end: 140 },
]);
// A gap inside a fraction must not split numerator and denominator.
assert.deepEqual(
  inkBands(80, 24, (y) => (y >= 28 && y < 40 ? 0 : 1)),
  [{ start: 0, end: 80 }],
);
assert.deepEqual(
  inkBands(80, 24, () => 1),
  [{ start: 0, end: 80 }],
);
assert.equal(intersectsBand({ top: 60, bottom: 90 }, ranges[0]), true);
assert.equal(intersectsBand({ top: 70, bottom: 90 }, ranges[0]), false);
const pixels = new Uint8ClampedArray(4 * 10 * 10).fill(255);
const dark = (x, y) => pixels.fill(0, 4 * (y * 10 + x), 4 * (y * 10 + x) + 3);
dark(4, 3);
const boxes = [{ left: 3, right: 6, top: 12, bottom: 15 }];
assert.equal(inkIsCovered(pixels, 10, 10, boxes), true);
// Unknown diagram/rule ink outside extracted text must force visual output.
dark(8, 8);
assert.equal(inkIsCovered(pixels, 10, 10, boxes), false);
assert.equal(inkIsCovered(pixels, 10, 10, []), false);
const ink = (y) => y < 30 || (y >= 40 && y < 58) || y >= 68 ? 1 : 0;
const coarse = inkBands(100, 24, ink);
assert.equal(coarse.length, 1);
const proseRows = [{ top: 0, bottom: 30, prose: true },
  { top: 40, bottom: 58, prose: false }, { top: 68, bottom: 100, prose: true }];
assert.deepEqual(refineInkBands(100, 8, ink, proseRows, proseRows, coarse),
  [{ start: 0, end: 35 }, { start: 35, end: 63 }, { start: 63, end: 100 }]);
// Never introduce a small cut between numerator/denominator or diagram labels.
const mathRows = proseRows.map((row) => ({ ...row, prose: false }));
assert.deepEqual(refineInkBands(100, 8, ink, mathRows, mathRows, coarse), coarse);
// A vertical table border or connected shape spanning a blank band owns both sides.
assert.deepEqual(refineInkBands(100, 8, ink,
  [...proseRows, { top: 20, bottom: 80 }], proseRows, coarse), coarse);
console.log(
  "PASS: wide blank separators, fraction containment, band ownership and unknown-ink fallback",
);
