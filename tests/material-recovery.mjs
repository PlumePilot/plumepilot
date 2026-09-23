import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const functionStart = source.indexOf("  async function waitForChapterDispensa(");
const functionEnd = source.indexOf("\n  async function openSectionForEpub(", functionStart);

assert.ok(functionStart >= 0 && functionEnd > functionStart);
assert.match(source, /const MATERIAL_CONTENT_SETTLE_MS = 2500;/);
assert.equal(
  (source.match(/await waitForChapterDispensa\(/g) || []).length,
  3,
  "the bounded material-state wait must cover EPUB, PDF recovery and visual collection",
);
assert.match(
  source.slice(
    source.indexOf("  async function getChapterDispensaForEpub("),
    source.indexOf("  async function resetSectionForEpub("),
  ),
  /link === MATERIAL_LINK_ABSENT[\s\S]+return null;/,
  "a rendered chapter without a Dispensa must not exhaust all EPUB retries",
);

async function runMaterialWait({ times, linkAt = null }) {
  let now = 0;
  const link = { href: "https://example.cloudfront.net/dispensa.pdf" };
  const container = {
    textContent: "Obiettivi Video Test",
    querySelectorAll(selector) {
      return { length: selector === "a" ? 0 : 12 };
    },
  };
  const context = vm.createContext({
    Date: { now: () => now },
    findChapter: () => ({ span: {} }),
    getChapterDispensa: () => (linkAt !== null && now >= linkAt ? link : null),
    getChapterContainer: () => container,
    chapterRows: () => [{}, {}, {}],
    isChapterOpen: () => true,
    waitForExport: async callback => {
      for (const time of times) {
        now = time;
        const result = callback();
        if (result) return result;
      }
      return null;
    },
  });

  vm.runInContext(
    `const MATERIAL_CONTENT_SETTLE_MS = 2500;
     const MATERIAL_LINK_ABSENT = Symbol("material-link-absent");
     ${source.slice(functionStart, functionEnd)}
     globalThis.waitForChapterDispensa = waitForChapterDispensa;
     globalThis.materialLinkAbsent = MATERIAL_LINK_ABSENT;`,
    context,
  );

  const result = await context.waitForChapterDispensa({}, 15000, "operation");
  return { result, absent: context.materialLinkAbsent, link };
}

const missing = await runMaterialWait({ times: [0, 1000, 2499, 2500] });
assert.equal(
  missing.result,
  missing.absent,
  "stable rendered content must report a missing Dispensa after 2.5 seconds",
);

const delayed = await runMaterialWait({ times: [0, 1000, 2000], linkAt: 2000 });
assert.equal(
  delayed.result,
  delayed.link,
  "a Dispensa that appears while content settles must still be recovered",
);

console.log("PASS: missing material recovery exits promptly while preserving delayed links");
