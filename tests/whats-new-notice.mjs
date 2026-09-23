import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const definitionSource = readFileSync(new URL("../whats-new.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(definitionSource, context);
const api = context.PlumePilotWhatsNew;

assert.equal(api.RELEASE.version, "2.34.0");
assert.equal(api.RELEASE.items.length, 6);
assert.match(api.RELEASE.summary, /Mercatorum e San Raffaele/);
assert.match(api.PENDING_KEY, /PendingWhatsNewVersion$/);
assert.match(api.LAST_SEEN_KEY, /LastSeenWhatsNewVersion$/);

const background = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const popupHtml = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
const popupJs = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
const popupCss = readFileSync(new URL("../popup.css", import.meta.url), "utf8");
const build = readFileSync(new URL("../scripts/build-release.mjs", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
assert.equal(manifest.version, api.RELEASE.version);

assert.match(background, /details\.reason !== "update"/);
assert.match(background, /currentVersion !== whatsNewApi\.RELEASE\.version/);
assert.doesNotMatch(background, /reason\s*===\s*["']install["']/);
assert.match(popupHtml, /id="whatsNewBanner"[^>]+hidden/);
assert.match(popupHtml, /role="dialog"[^>]+aria-modal="true"/);
assert.match(popupHtml, /id="openWhatsNewFromAbout"[^>]*>Novità</);
assert.match(popupJs, /currentVersion === releaseVersion/);
assert.match(popupJs, /result\[whatsNewApi\.PENDING_KEY\] === releaseVersion/);
assert.match(popupJs, /result\[whatsNewApi\.LAST_SEEN_KEY\] !== releaseVersion/);
assert.match(popupJs, /chrome\.storage\.local\.remove\(whatsNewApi\.PENDING_KEY\)/);
assert.match(popupJs, /event\.key !== "Tab"/);
assert.match(popupCss, /\.whats-new-banner\[hidden\]/);
assert.ok(manifest.background.scripts.includes("whats-new.js"));
assert.match(build, /"sound-settings\.js", "whats-new\.js", "background\.js"/);

console.log("PASS: update-only Novità notice, per-version dismissal and manual access are consistent");
