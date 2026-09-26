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
assert.ok(hazards.every((item) => item.time >= 15 && item.time < 85));
console.log("Pausa? deterministic level: 18 beats, 90 objects, 30 per type, safe intro.");
