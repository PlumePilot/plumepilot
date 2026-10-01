import assert from "node:assert/strict";
import { inkBands, intersectsBand, inkIsCovered } from "../epub-regions.mjs";
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
console.log(
  "PASS: wide blank separators, fraction containment, band ownership and unknown-ink fallback",
);
