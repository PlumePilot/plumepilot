import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const interceptor = readFileSync(new URL("../commission-interceptor.js", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../bridge.js", import.meta.url), "utf8");
const background = readFileSync(new URL("../background.js", import.meta.url), "utf8");

const matches = [
  "*://*.pegaso.multiversity.click/*",
  "*://*.mercatorum.multiversity.click/*",
  "*://*.utsr.multiversity.click/*",
];

for (const entry of manifest.content_scripts) {
  assert.deepEqual(entry.matches, matches);
}
for (const entry of manifest.web_accessible_resources) {
  assert.deepEqual(entry.matches, matches);
}

for (const origin of [
  "https://lms-api.prod.pegaso.multiversity.click",
  "https://lms-api.prod.mercatorum.multiversity.click",
  "https://lms-api.prod.utsr.multiversity.click",
]) {
  assert.ok(interceptor.includes(origin), `missing API origin: ${origin}`);
}

assert.match(interceptor, /url\.origin === API_ORIGIN && url\.pathname === TARGET_PATH/);
assert.match(interceptor, /payload: \{ \.\.\.lastPayload, requestId/);
assert.match(interceptor, /platformId: PLATFORM_ID/);
assert.match(bridge, /commissionExamTrackingInitializedByPlatform/);
assert.match(bridge, /commissionExamsCapturedAtByPlatform/);
assert.match(bridge, /commissionCheckLeases/);
assert.match(background, /commissionCheckLeases/);
assert.match(background, /commissionExamsCapturedAtByPlatform/);
assert.match(background, /\*:\/\/\*\.mercatorum\.multiversity\.click\/\*/);
assert.match(background, /\*:\/\/\*\.utsr\.multiversity\.click\/\*/);

console.log("multiversity-platform-support: ok");
