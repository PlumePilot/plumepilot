import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../floating-menu-layout.js", import.meta.url), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const api = context.PlumePilotFloatingMenuLayout;

assert.equal(api.STORAGE_KEY, "floatingMenuLayout");
assert.equal(api.VERSION, 1);
assert.deepEqual(
  Array.from(api.normalizeLayout(null).items, (item) => ({ ...item })),
  Array.from(api.DEFAULT_LAYOUT.items, (item) => ({ ...item })),
);
assert.equal(api.isDefaultLayout(null), true);

const custom = api.normalizeLayout({
  version: 1,
  items: [
    { id: "study-materials", visible: false },
    { id: "complete-tests", visible: true },
    { id: "unknown", visible: true },
    { id: "complete-tests", visible: false },
  ],
});
assert.deepEqual(
  Array.from(custom.items, (item) => ({ ...item })),
  [
    { id: "study-materials", visible: false },
    { id: "complete-tests", visible: true },
    { id: "complete-objectives", visible: true },
    { id: "test-collection", visible: true },
  ],
);
assert.equal(api.isDefaultLayout(custom), false);

const popup = readFileSync(new URL("../popup.js", import.meta.url), "utf8");
const floating = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");
const achievements = readFileSync(new URL("../achievements.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

assert.match(popup, /claimAchievement\("customize-floating-menu"\)/);
assert.match(floating, /function applyFloatingMenuLayout\(\)/);
assert.equal((floating.match(/data-layout-item="/g) || []).length, 4);
assert.match(achievements, /title: "Su misura"[^\n]+exp: 20/);
assert.ok(manifest.content_scripts.some((entry) => entry.js?.includes("floating-menu-layout.js")));

console.log("PASS: floating menu layout normalization, persistence hooks, visibility and achievement are consistent");
