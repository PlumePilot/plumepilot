import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const content = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const interceptor = readFileSync(new URL("../commission-interceptor.js", import.meta.url), "utf8");
const extract = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const context = vm.createContext({});
vm.runInContext(extract(content, "  function getKnownProgress(", "  async function waitForLessonCompletion("), context);
const row = (...texts) => ({querySelectorAll: () => texts.map(textContent => ({textContent}))});
assert.equal(context.getKnownProgress(row()), null, "no visible percentage is unknown, not zero");
assert.equal(context.getProgress(row()), 0, "legacy video progress callers keep their default");
assert.equal(context.getKnownProgress(row("0%")), 0);
assert.equal(context.getKnownProgress(row("100%")), 100);
assert.equal(context.getKnownProgress(row("100 %")), 100);
assert.equal(context.getKnownProgress(row("83,5 %")), 83.5);
assert.equal(context.getKnownProgress(row("Obiettivi", "Completato")), null, "labels alone cannot fabricate a numeric percentage");
assert.equal(context.getKnownProgress(row("101%")), null);

const api = vm.createContext({
  validPositiveInteger: value => Number.isInteger(Number(value)) && Number(value) > 0,
  safeString: value => typeof value === "string" ? value : "",
});
vm.runInContext(extract(interceptor, "  function activityPercentageKnown(", "  function safePdfUrl("), api);
vm.runInContext(extract(interceptor, "  function lessonPlayback(", "  function lessonProgress("), api);
const intro = percentage => ({contentType: "intro", percentage, lp_id: 1, lp_item_id: 2, title: "Obiettivi"});
for (const percentage of [100, "100", 0, "0"]) {
  const body = {data: [intro(percentage)]};
  assert.equal(api.lessonObjective(body).percentageKnown, true);
  assert.equal(api.lessonObjective(body).percentage, Number(percentage));
  assert.equal(api.lessonPlayback(body).items[0].percentageKnown, true);
}
for (const percentage of [undefined, null, "", " ", "invalid", false]) {
  const body = {data: [intro(percentage)]};
  assert.equal(api.lessonObjective(body).percentageKnown, false, "missing/invalid API percentage cannot be treated as an unfinished objective");
  assert.equal(api.lessonPlayback(body).items[0].percentageKnown, false);
}
console.log("PASS: explicit objective 100%/0%; missing sidebar/API values stay unknown; legacy video defaults preserved");
