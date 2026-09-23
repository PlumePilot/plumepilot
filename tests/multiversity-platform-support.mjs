import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const interceptor = readFileSync(new URL("../commission-interceptor.js", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../bridge.js", import.meta.url), "utf8");
const background = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const popup = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
const floating = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");

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
assert.match(bridge, /PEGASO_COMMISSION_PAYLOAD_STORE/);
assert.doesNotMatch(bridge, /chrome\.storage\.local\.set\(\{\s*commissionExams:/);
assert.match(bridge, /commissionCheckLeases/);
assert.match(bridge, /currentPlatformCourseMap\(result\.autoplayChapterLimits\)/);
assert.match(bridge, /platformId: PLATFORM_ID,[\s\S]+chapterKey: event\.data\.chapterKey/);
assert.match(background, /commissionCheckLeases/);
assert.match(background, /commissionExamsCapturedAtByPlatform/);
assert.match(background, /function storeCommissionPayload\(message\)[\s\S]+return serializedCommission/);
assert.match(background, /const progressKey = `\$\{platformId\}:\$\{chapterKey\}`/);
assert.match(background, /claimCourseProgressThreshold\(platformId, courseCode\)/);
assert.match(popup, /function courseScopedValue\(/);
assert.match(floating, /function courseScopedValue\(/);
assert.match(floating, /eventId: `course-threshold:\$\{PLATFORM_ID\}:\$\{courseCode\}`/);
assert.match(background, /\*:\/\/\*\.mercatorum\.multiversity\.click\/\*/);
assert.match(background, /\*:\/\/\*\.utsr\.multiversity\.click\/\*/);


assert.match(floating, /function courseSurfaceAvailable\(\)/);
assert.match(
  floating,
  /const supportedSurface =\s*courseSurfaceAvailable\(\) \|\| isCommissionOnlyPage\(\)/,
);
assert.match(
  floating,
  /const shouldShow =\s*settings\.floatingMenuEnabled === true && supportedSurface/,
);
assert.match(floating, /ui\.courseTab\.hidden = false/);
assert.match(floating, /ui\.courseTools\.inert = !courseAvailable/);
assert.match(
  floating,
  /ui\.hide\.addEventListener\("click",[\s\S]+writeSetting\("floatingMenuEnabled", false\)/,
);
assert.match(floating, /Apri un corso per usare questi strumenti/);

console.log("multiversity-platform-support: ok");
