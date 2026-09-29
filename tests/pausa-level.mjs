import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const sandbox = {};
sandbox.globalThis = sandbox;
runInNewContext(readFileSync(new URL("../pausa/level.js", import.meta.url), "utf8"), sandbox);
const { duration, beats, collectibles, hazards } = sandbox.PausaLevel;
assert.equal(duration, 90);
assert.equal(beats.length, 18);
assert.equal(collectibles.length, 90);
for (const type of ["dispensa", "test", "obiettivo"])
  assert.equal(collectibles.filter((item) => item.type === type).length, 30, type);
for (let beat = 0; beat < 18; beat += 1)
  assert.equal(collectibles.filter((item) => item.time >= beat * 5 && item.time < (beat + 1) * 5).length, 5, `beat ${beat}`);
assert.ok(collectibles.every((item) => item.y >= .3 && item.y <= .7 && item.time < duration));
assert.ok(hazards.every((item) => item.time >= 1 && item.time < 88));
assert.ok(hazards.every((item) => item.type === "pencil"
  ? ["high", "middle", "low"].includes(item.lane)
  : [1, 2, 3, 4].includes(item.count)));
for (const [name, width, height] of [
  ["collect-book.png", 64, 16], ["collect-test.png", 64, 16],
  ["collect-obj.png", 64, 16], ["enemy-pencil.png", 64, 16],
  ["enemy-books.png", 13, 9], ["enemy-cloud.png", 13, 9],
]) {
  const png = readFileSync(new URL(`../pausa/assets/${name}`, import.meta.url));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", name);
  assert.equal(png.readUInt32BE(16), width, name);
  assert.equal(png.readUInt32BE(20), height, name);
}
for (const theme of ["light", "dark"]) {
  const png = readFileSync(new URL(`../assets/gaming/mascot-idle-${theme}.png`, import.meta.url));
  assert.equal(png.readUInt32BE(16), 160);
  assert.equal(png.readUInt32BE(20), 32);
}

// The course may offer risky pickups, but no collectible should sit inside
// the opaque area of a hazard at the moment both reach the same x.
const H = 400, PX = 226, SPEED = 198;
for (const hazard of hazards) {
  const bounds = hazard.type === "books"
    ? [PX - 32.5, 382 - hazard.count * 45, 65, hazard.count * 45]
    : hazard.type === "cloud"
      ? [PX - 32.5, 18, 65, hazard.count * 45]
      : [PX - 20, ({ high: .27, middle: .5, low: .73 })[hazard.lane] * H - 20, 40, 40];
  for (const item of collectibles) {
    const x = PX + (item.time - hazard.time) * SPEED, y = item.y * H;
    const dx = Math.max(bounds[0] - x, 0, x - bounds[0] - bounds[2]);
    const dy = Math.max(bounds[1] - y, 0, y - bounds[1] - bounds[3]);
    assert.ok(Math.hypot(dx, dy) >= 25, `Item at ${item.time}s overlaps ${hazard.type} at ${hazard.time}s`);
  }
}
for (const book of hazards.filter((item) => item.type === "books")) {
  for (const cloud of hazards.filter((item) => item.type === "cloud" && Math.abs(item.time - book.time) < 65 / SPEED)) {
    const gap = 382 - book.count * 45 - (18 + cloud.count * 45);
    assert.ok(gap >= 50, `Blocked corridor near ${book.time}s / ${cloud.time}s`);
  }
}
console.log("Pausa? deterministic level: 18 beats, 90 objects, 30 per type, clear pickups and passable corridors.");
