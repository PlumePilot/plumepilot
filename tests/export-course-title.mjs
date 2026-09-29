import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const materials = source.slice(
  source.indexOf("  async function collectCourseMaterials(requestedFormat, operationId)"),
  source.indexOf("  function testSourceCacheKey("),
);
const tests = source.slice(
  source.indexOf("  async function collectCourseTests(operationId)"),
  source.indexOf("  function getEndOfLessonTest("),
);

for (const format of ["pdf", "epub", "materials", "tests"]) {
  let currentTitle = "Lezione A";
  let release;
  let entered;
  const pending = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const messages = [];
  const outline = [{
    identity: {sectionText: "Modulo", chapterText: "Capitolo"},
    chapterKey: "1:1:1", lessonNumber: 1, order: 0, route: {},
  }];
  const context = vm.createContext({
    window: { postMessage: message => messages.push(message) },
    courseTitle: () => currentTitle,
    sections: () => [{text: "Modulo"}],
    courseCodeFromUrl: () => "course-A",
    collectingCourseMaterials: false,
    courseBatchRunning: () => false,
    ensureExportNotCancelled() {},
    setExportCollectionStatus() {},
    removeExportCollectionToastAfter() {},
    enabled: false,
    materialOutlineCache: new Map([["course-A", {sectionSignature: "Modulo", outline}]]),
    collectCourseMaterialsViaApi: async (_collectionFormat, _sections, collected) => {
      entered();
      await pending;
      collected.push({chapter: "Capitolo", order: 0, url: "https://example.test/A.pdf"});
      return true;
    },
    turboApiRequest: async () => {
      entered();
      await pending;
      return {ok: true, data: {entries: []}};
    },
    recoverCourseTestOutline: async () => outline,
    requestExportTestLesson: async () => ({ok: true, data: {test: {id: 123}}}),
    requestTestSourceWithRetry: async () => ({ok: true, data: {questions: [{question: "A?"}]}}),
    testSourceCache: new Map(),
  });
  context.window.top = context.window;
  vm.runInContext(format === "tests" ? tests : materials, context);
  const operation = format === "tests"
    ? context.collectCourseTests("operation-A")
    : context.collectCourseMaterials(format, "operation-A");
  await started;
  currentTitle = "Lezione B";
  release();
  await operation;
  const result = messages.find(message => message.type.endsWith("_COLLECTED"));
  assert.ok(result, `${format}: export must finish`);
  assert.equal(result.payload.courseTitle, "Lezione A", `${format}: preserve title at start`);
  assert.equal(result.operationId, "operation-A");
}

console.log("PASS: PDF, EPUB, materials and test exports keep their starting course title");
