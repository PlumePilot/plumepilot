import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../sound-settings.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const api = context.PlumePilotSounds;

assert.equal(api.normalizeSettings({}).soundNotificationsEnabled, false);
assert.equal(api.normalizeSound("missing"), "chirp");
assert.equal(api.normalizeVolume(-1), 0);
assert.equal(api.normalizeVolume(101), 100);
assert.equal(api.normalizeVolume("bad"), 70);
assert.deepEqual(Object.keys(api.SOUNDS), ["chirp", "trumpets", "guitar", "violin"]);
for (const definition of Object.values(api.SOUNDS)) {
  assert.match(definition.path, /^assets\/audio\/[a-z-]+\.mp3$/);
  assert.ok(readFileSync(new URL(`../${definition.path}`, import.meta.url)).length > 1000);
}

const achievements = readFileSync(new URL("../achievements.js", import.meta.url), "utf8");
const background = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../bridge.js", import.meta.url), "utf8");
const content = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const floating = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");
const popupCss = readFileSync(new URL("../popup.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const sprite = readFileSync(new URL("../assets/gaming/action-notification-sound.png", import.meta.url));
assert.match(achievements, /title: "Orecchie tese!"[^\n]+exp: 20/);
assert.match(background, /serializedSound\(\(\) => playSoundEvent/);
assert.match(background, /claimAchievement\("receive-sound-notification"\)/);
assert.match(bridge, /previousSnapshot\?\.state === commissionStates\.STATES\.PENDING/);
assert.match(content, /thresholdReached \|\| sessionLimitReached/);
assert.match(content, /`course-threshold:\$\{courseCode\}`/);
assert.match(floating, /`course-threshold:\$\{courseCode\}`/);
assert.match(background, /chrome\.offscreen\.createDocument/);
assert.match(background, /PLUMEPILOT_OFFSCREEN_PLAY/);
assert.match(floating, /\.sound-options select,[\s\S]+width: 100%;[\s\S]+min-width: 0;/);
assert.match(popupCss, /\.sound-controls label, \.sound-controls select \{ font-size: var\(--sw-control-font-size\); \}/);
assert.ok(manifest.web_accessible_resources.some((group) => group.resources?.includes("assets/gaming/action-notification-sound.png")));
assert.equal(sprite.readUInt32BE(16), 384);
assert.equal(sprite.readUInt32BE(20), 32);

console.log("PASS: sound defaults, local assets, serialized deduplication, triggers and achievement are consistent");
