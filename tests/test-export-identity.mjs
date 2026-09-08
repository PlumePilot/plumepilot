import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const interceptor = readFileSync(new URL("../commission-interceptor.js", import.meta.url), "utf8");
const context = vm.createContext({
  normalizedText: value => String(value || "").trim().replace(/\\'/g, "'").replace(/[’‘]/g, "'").replace(/\s+/g, " "),
  validPositiveInteger: value => Number.isInteger(Number(value)) && Number(value) > 0,
  validNonNegativeInteger: value => value !== null && value !== "" && typeof value !== "boolean" && Number.isInteger(Number(value)) && Number(value) >= 0,
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

// Same shape as the reported single-module probability course: folder_id=0 is
// an explicit, valid no-folder identity and IDs do not determine output order.
const singleModuleIds = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  25, 21, 22, 23, 24, 26, 27, 28, 29, 30,
];
const singleModuleRows = singleModuleIds.map((id, index) => ({
  id,
  lp_id: id,
  folder_id: 0,
  display_order: index + 1,
  title: `Probability title ${index + 1}`,
}));
const singleModuleMaster = context.normalizeCourseOutline({data: singleModuleRows});
const singleModuleResult = await context.recoverCourseTestOutline([], [], singleModuleMaster, "test");
assert.equal(singleModuleResult.length, 30);
assert.deepEqual(Array.from(singleModuleResult, row => row.route.id), singleModuleIds);
assert.equal(new Set(singleModuleResult.map(row => row.chapterKey)).size, 30);
assert.equal(singleModuleResult[0].chapterKey, "0:1:1");
assert.ok(singleModuleResult.every(row => row.route.folderId === 0));
assert.ok(singleModuleResult.every(row => row.identity.sectionText === "Lezioni"));

for (const folder_id of [undefined, null, "", -1]) {
  const missingFolderMaster = context.normalizeCourseOutline({data: [{
    id: 1, lp_id: 1, folder_id, display_order: 1, title: "Invalid folder",
  }]});
  await assert.rejects(
    context.recoverCourseTestOutline([], [], missingFolderMaster, "test"),
    /Identità dei capitoli ambigua/,
  );
}

let requests = 0;
context.turboApiRequest = async () => ++requests < 3
  ? {ok:true, data:{}}
  : {ok:true, data:{test:{id:6559, lp_id:26}}};
assert.equal((await context.requestExportTestLesson("course", {lessonNumber:5, route:{lpId:26,id:26}, identity:{chapterText:"test"}}, "test")).ok, true);
assert.equal(requests, 3);
context.ensureExportNotCancelled = () => { throw new Error("cancelled"); };
await assert.rejects(context.requestExportTestLesson("course", {}, "test"), /cancelled/);
console.log("PASS: 29 chapters in 10/10/9 folders; 30 chapters with folder_id=0; missing DOM chapters/module; duplicate titles; metadata retry; cancellation");
