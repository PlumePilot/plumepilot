import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const achievementsSource = readFileSync(new URL("../achievements.js", import.meta.url), "utf8");
const backgroundSource = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const floatingMenuSource = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");
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
assert.match(themeSource, /const VISUAL_STYLE_KEY = "visualStyle";/);
assert.match(themeSource, /document\.documentElement\.dataset\.visualStyle = visualStyle;/);

console.log("PASS: Standard rejects EXP claims; Gaming accepts them; floating tabs remain outside the scrolling body");
