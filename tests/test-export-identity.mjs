import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const interceptor = readFileSync(new URL("../commission-interceptor.js", import.meta.url), "utf8");
const context = vm.createContext({
  normalizedText: value => String(value || "").trim().replace(/\\'/g, "'").replace(/[’‘]/g, "'").replace(/\s+/g, " "),
  validPositiveInteger: value => Number.isInteger(Number(value)) && Number(value) > 0,
  safeString: value => typeof value === "string" ? value : null,
  ensureExportNotCancelled() {},
  setExportCollectionStatus() {},
  exportSleep: async () => {},
  API_LESSON_RETRY_DELAYS_MS: [750, 1500],
});
vm.runInContext(interceptor.slice(interceptor.indexOf("  function normalizeCourseOutline("),
  interceptor.indexOf("  function detailedLessonRoute(")), context);
vm.runInContext(source.slice(source.indexOf("  function testRouteKey("),
  source.indexOf("  async function collectCourseMaterialsViaApi(")), context);

// Same folder/order/ID shape as the reported 29-chapter master, synthetic titles.
const groups = [
  [[1,1],[2,2],[3,3],[4,4],[26,5],[23,6],[6,7],[7,8],[8,9],[25,18]],
  [[9,10],[10,11],[11,12],[12,14],[13,16],[14,19],[24,21],[15,24],[29,25],[16,28]],
  [[17,1],[18,2],[28,3],[31,4],[19,5],[20,6],[21,7],[30,8],[22,9]],
];
const rows = groups.flatMap((group, index) => group.map(([id, display_order]) => ({
  id, lp_id: id, folder_id: index + 1, display_order, title: "Title " + id,
})));
const outline = rows.map((row, index) => ({
  identity: {sectionText: "Section " + row.folder_id, chapterText: row.display_order + " - " + row.title},
  lessonNumber: index + 1, order: index,
}));
const master = context.normalizeCourseOutline({data: rows});
for (const visible of [outline, outline.filter((_, i) => i !== 3 && i !== 22), outline.slice(0,20), []]) {
  const result = await context.recoverCourseTestOutline([], visible, master, "test");
  assert.equal(result.length, 29);
  assert.equal(new Set(result.map(row => row.chapterKey)).size, 29);
  assert.deepEqual(Array.from(result, row => row.route.id), rows.map(row => row.id));
  assert.deepEqual([1,2,3].map(folder => result.filter(row => row.route.folderId === folder).length), [10,10,9]);
}
const duplicateTitles = rows.map(row => ({...row, title: "Same title"}));
assert.equal((await context.recoverCourseTestOutline([], [], context.normalizeCourseOutline({data:duplicateTitles}), "test")).length, 29);
let requests = 0;
context.turboApiRequest = async () => ++requests < 3
  ? {ok:true, data:{}}
  : {ok:true, data:{test:{id:6559, lp_id:26}}};
assert.equal((await context.requestExportTestLesson("course", {lessonNumber:5, route:{lpId:26,id:26}, identity:{chapterText:"test"}}, "test")).ok, true);
assert.equal(requests, 3);
context.ensureExportNotCancelled = () => { throw new Error("cancelled"); };
await assert.rejects(context.requestExportTestLesson("course", {}, "test"), /cancelled/);
console.log("PASS: 29 chapters; 10/10/9 folders; missing DOM chapters/module; duplicate titles; metadata retry; cancellation");
