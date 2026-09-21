import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const listeners = new Map();
let now = 0;
let reloads = 0;

const document = {
  visibilityState: "hidden",
  addEventListener(type, listener) {
    listeners.set(type, listener);
  },
};

const context = vm.createContext({
  WAIT_MS: 100,
  Date: { now: () => now },
  document,
  ensureExportNotCancelled() {},
  exportSleep: async (ms) => {
    now += ms;
  },
  log() {},
  location: { reload: () => { reloads += 1; } },
  readChapterRecovery: () => null,
  clearChapterRecovery() {},
  sessionStorage: { setItem() {} },
  CHAPTER_RECOVERY_KEY: "recovery",
  MAX_CHAPTER_RELOADS: 1,
});

context.sleep = async (ms) => {
  now += ms;
  if (now >= 350 && document.visibilityState === "hidden") {
    document.visibilityState = "visible";
    listeners.get("visibilitychange")?.();
  }
};

vm.runInContext(
  source.slice(
    source.indexOf("  let pageHiddenEpoch"),
    source.indexOf("  function achievementUnlockSuffix"),
  ),
  context,
);
vm.runInContext(
  source.slice(
    source.indexOf("  async function waitFor(fn"),
    source.indexOf("  function exportAbortError"),
  ),
  context,
);
vm.runInContext(
  source.slice(
    source.indexOf("  function reloadForChapterRecovery"),
    source.indexOf("  async function waitForCourseReadyAfterReload"),
  ),
  context,
);

const result = await context.waitFor(
  () => document.visibilityState === "visible" && { rendered: true },
  100,
);
assert.equal(result.rendered, true, "DOM waits must resume after the tab is visible");

document.visibilityState = "hidden";
assert.equal(context.reloadForChapterRecovery({ chapterText: "2 - Test" }), false);
assert.equal(reloads, 0, "chapter recovery must not reload a hidden page");

console.log("PASS: hidden DOM timeouts resume visibly and cannot trigger a reload");
