import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const achievementsSource = readFileSync(new URL("../achievements.js", import.meta.url), "utf8");
const backgroundSource = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const floatingMenuSource = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");
const popupSource = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
const popupCssSource = readFileSync(new URL("../popup.css", import.meta.url), "utf8");
const popupHtmlSource = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const flameSprite = readFileSync(new URL("../assets/gaming/chapter-limit-flame-levels.png", import.meta.url));
const themeSource = readFileSync(new URL("../theme.js", import.meta.url), "utf8");

const stored = { visualStyle: "standard" };
const context = vm.createContext({
  storageGet: async key => stored[key] ?? null,
  storageSet: async values => Object.assign(stored, values),
});
vm.runInContext(achievementsSource, context);
vm.runInContext(
  backgroundSource.slice(
    backgroundSource.indexOf("  function newlyUnlockedRewards("),
    backgroundSource.indexOf("  function claimAchievement("),
  ),
  context,
);

const standardResult = await context.claimAchievementUnlocked("create-test-collection");
assert.equal(standardResult.accepted, false);
assert.equal(standardResult.reason, "gaming-inactive");
assert.equal(stored.studywingAchievements, undefined);

stored.visualStyle = "gaming";
const gamingResult = await context.claimAchievementUnlocked("create-test-collection");
assert.equal(gamingResult.accepted, true);
assert.equal(gamingResult.awardedExp, 25);
assert.equal(stored.studywingAchievements.totalExp, 25);
assert.deepEqual(Array.from(stored.studywingAchievements.claimedAchievementIds), ["create-test-collection"]);

const panelTemplateStart = floatingMenuSource.indexOf('<section id="studywing-panel"');
const headerStart = floatingMenuSource.indexOf('<div class="header">', panelTemplateStart);
const tabsStart = floatingMenuSource.indexOf('<nav class="menu-tabs"', headerStart);
const bodyStart = floatingMenuSource.indexOf('<div class="body">', headerStart);
assert.ok(panelTemplateStart >= 0 && headerStart > panelTemplateStart);
assert.ok(tabsStart > headerStart && tabsStart < bodyStart, "tabs must sit outside the scrolling body");
assert.match(floatingMenuSource, /\.panel\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/s);
assert.match(floatingMenuSource, /\.body\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s);
assert.match(floatingMenuSource, /\.menu-tabs\s*\{[^}]*flex:\s*0 0 auto;/s);
assert.match(popupCssSource, /\.container\s*\{[^}]*padding:\s*0 18px 14px 14px;/s);
assert.match(popupCssSource, /\.popup-sticky-header\s*\{[^}]*top:\s*0;[^}]*padding:\s*14px 0 4px;/s);
assert.match(popupCssSource, /html\[data-visual-style="gaming"\] \.popup-sticky-header\s*\{[^}]*top:\s*8px;[^}]*padding-top:\s*6px;/s);
assert.match(themeSource, /const VISUAL_STYLE_KEY = "visualStyle";/);
assert.match(themeSource, /document\.documentElement\.dataset\.visualStyle = visualStyle;/);
assert.match(popupSource, /turboTestsStatus\.textContent = turbo \?[^;]+: "";/s);
assert.match(popupSource, /objectivesStatus\.textContent = objectives[^;]+: "";/s);
assert.match(popupSource, /testCollectionStatus\.textContent = operation\?\.kind === "tests"[^;]+: "";/s);
assert.match(popupSource, /materialsStatus\.textContent = operation\?\.kind === "materials"[^;]+: "";/s);
assert.match(popupCssSource, /html\[data-menu-size="medium"\]\s*\{[^}]+--sw-action-font-size:\s*14px;[^}]+--sw-control-font-size:\s*12px;[^}]+--sw-secondary-font-size:\s*11px;/s);
assert.match(floatingMenuSource, /:host\(\[data-menu-size="medium"\]\) \.course-progress-options-menu summary small,[^}]+\.autoplay-options-summary,[^}]+font-size:\s*10px;/s);
assert.match(floatingMenuSource, /:host\(\[data-menu-size="large"\]\) \.course-progress-options-menu summary,[^}]+\.autoplay-options-title,[^}]+font-size:\s*12px;/s);
assert.match(floatingMenuSource, /:host\(\[data-menu-size="large"\]\) \.course-progress-options-menu summary small,[^}]+\.autoplay-options-summary,[^}]+font-size:\s*11px;/s);
assert.match(floatingMenuSource, /:host\(\[data-menu-size="large"\]\) \.action\s*\{\s*font-size:\s*12px;/s);
assert.match(popupHtmlSource, /id="chapterLimitValue" type="number"[^>]+min="1"[^>]+step="1"/);
assert.match(popupHtmlSource, /id="chapterLimitSlider"[^>]+type="range"[^>]+min="1"[^>]+step="1"/);
assert.match(floatingMenuSource, /data-role="chapter-limit-value" type="number"[^>]+min="1"[^>]+step="1"/);
assert.match(floatingMenuSource, /data-role="chapter-limit-slider" type="range"[^>]+min="1"[^>]+step="1"/);
assert.match(popupSource, /chapterLimitSlider\.addEventListener\("change", \(\) => updateChapterLimitValue/);
assert.match(floatingMenuSource, /chapterLimitSlider\.addEventListener\("change", \(\) => setLimit/);
assert.ok(manifest.web_accessible_resources.some(group => group.resources?.includes("assets/gaming/chapter-limit-flame-levels.png")));
assert.equal(flameSprite.readUInt32BE(16), 160, "flame sprite must retain five 32px columns");
assert.equal(flameSprite.readUInt32BE(20), 32, "flame sprite height must fit the slider thumb");

console.log("PASS: EXP modes, navigation, responsive text and chapter-limit selectors are consistent");
