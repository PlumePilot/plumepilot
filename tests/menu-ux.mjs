import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL("../menu-ux.js", import.meta.url), "utf8"), context);
const {autoplayPresentation} = context.PlumePilotMenuUx;
assert.equal(autoplayPresentation().summary, "Tutti i video · Test ignorati");
assert.equal(autoplayPresentation({skipCompleted: true, testBehavior: "stop"}).summary,
  "Solo video da completare · Stop ai test");
const overridden = autoplayPresentation({testBehavior: "stop", limitEnabled: true, limit: 3, stopAt70: true});
assert.match(overridden.summary, /Test ignorati · Stop al 70% · Limite: 3 capitoli/);
assert.match(overridden.testOverride, /scelta salvata resta “Fermati”/);
assert.match(overridden.stopHint, /precedenza sul limite/);
const bypassed = autoplayPresentation({testBehavior: "complete", limitEnabled: true, limit: 2,
  stopAt70: true, thresholdBypassed: true});
assert.doesNotMatch(bypassed.summary, /Stop al 70%/);
assert.match(bypassed.summary, /Test automatici/);
assert.equal(bypassed.testOverride, "");
assert.match(bypassed.stopHint, /continuare oltre il 70%/);

const popup = readFileSync(new URL("../popup.html", import.meta.url), "utf8");
const floating = readFileSync(new URL("../floating-menu.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const popupCourse = popup.slice(popup.indexOf('id="coursePanel"'), popup.indexOf('id="examsPanel"'));
const floatingCourse = floating.slice(floating.indexOf('<div id="studywing-course-panel"'),
  floating.indexOf('<div id="studywing-exams-panel"'));
for (const source of [popupCourse, floatingCourse]) {
  assert.match(source, /data-ux-home/);
  assert.match(source, /data-ux-detail[^>]+hidden/);
  assert.match(source, /data-ux-back/);
  assert.match(source, />Materiali per lo studio</);
  assert.match(source, />Completamento del corso</);
  for (const group of ["video", "test", "stop"])
    assert.match(source, new RegExp(`data-ux-settings-group="${group}"`));
}
assert.ok(popupCourse.indexOf('id="findFirstIncomplete"') < popupCourse.indexOf('data-ux-detail'));
assert.ok(floatingCourse.indexOf('data-action="find-first-incomplete"') < floatingCourse.indexOf('data-ux-detail'));
assert.ok(popupCourse.indexOf('id="autoplayStopAt70Enabled"') > popupCourse.indexOf('data-ux-detail'));
assert.ok(floatingCourse.indexOf('data-setting="autoplay-stop-at-70-enabled"') > floatingCourse.indexOf('data-ux-detail'));
const scripts = manifest.content_scripts.find(entry => entry.js.includes("floating-menu.js")).js;
assert.ok(scripts.indexOf("menu-ux.js") < scripts.indexOf("floating-menu.js"));
assert.ok(manifest.web_accessible_resources.some(group => group.resources.includes("menu-ux.css")));
assert.match(popup, /<script src="menu-ux.js"><\/script>/);
assert.match(popup, /id="examsTab"[^>]+>.*Esami/);
console.log("PASS: shared menu hierarchy and effective autoplay summaries preserve limits, test overrides and per-course 70% bypass");
