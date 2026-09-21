import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const floatingSource = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");

const start = contentSource.indexOf("  function pegasoStyleSections(");
const end = contentSource.indexOf("  function chapterIdentity(", start);
assert.ok(start >= 0 && end > start);

function mercatorumSpan(text) {
  const clickable = { text };
  return {
    textContent: text,
    closest(selector) {
      return selector === "div.cursor-pointer.relative.align-middle"
        ? clickable
        : null;
    },
  };
}

const spans = [
  mercatorumSpan("1 - Dal data retrieval al data mining"),
  mercatorumSpan("2 - Dalle variabili agli indicatori elementari"),
  mercatorumSpan("Titolo non numerato"),
];
const documentElement = {};
const context = vm.createContext({
  IS_MERCATORUM: true,
  MERCATORUM_STATIC_SECTION: "Lezioni",
  document: {
    documentElement,
    querySelectorAll(selector) {
      if (selector === "div.flex-wrap.bg-platform-light-gray") return [];
      if (selector === "span") return spans;
      return [];
    },
  },
});
vm.runInContext(contentSource.slice(start, end), context);

const sections = context.sections();
const chapters = context.chapters();
assert.equal(sections.length, 1);
assert.equal(sections[0].text, "Lezioni");
assert.equal(sections[0].static, true);
assert.equal(sections[0].outer, documentElement);
assert.deepEqual(
  Array.from(chapters, (chapter) => chapter.text),
  [
    "1 - Dal data retrieval al data mining",
    "2 - Dalle variabili agli indicatori elementari",
  ],
);
assert.ok(chapters.every((chapter) => chapter.sectionText === "Lezioni"));

assert.match(
  floatingSource,
  /currentCourseCode\(\) &&[\s\S]+PLATFORM_ID === "mercatorum"/,
  "Mercatorum course routes must be sufficient to display the floating menu",
);
assert.match(contentSource, /if \(section\.static === true\)[\s\S]+return chapters\(\)\.some/);
assert.match(contentSource, /if \(section\.static === true\) \{\s*return hasVisibleChapters\(\);/);

console.log("PASS: Mercatorum numbered rows provide a static course section and floating-menu fallback");
