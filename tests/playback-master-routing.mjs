import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const outline = ["Alpha", "Beta", "Gamma", "Delta"].map((title, index) => ({
  lessonNumber: index + 1,
  identity: {
    sectionText: index < 2 ? "Section A" : "Section B",
    chapterText: `${index % 2 + 1} - ${title}`,
  },
}));
const master = ["Alpha", "Beta", "Gamma", "Delta"].map((title, index) => ({
  displayOrder: index % 2 + 1,
  masterOrder: index,
  folderId: index < 2 ? 1 : 2,
  lpId: 100 + index,
  id: 200 + index,
  percentage: index === 3 ? 40 : 100,
  title,
}));
let requested = null;
const context = vm.createContext({
  normalizedText: (value) => String(value || "").trim().replace(/\s+/g, " "),
  playbackDiscoveryCancelled: () => false,
  setResumeDiscoveryStatus() {}, removeResumeDiscoveryStatus() {}, log() {},
  courseCodeFromUrl: () => "COURSE",
  getPlaybackCourseOutline: async () => outline,
  getPlaybackCourseIndex: async () => master,
  sameChapterIdentity: (a, b) => a.sectionText === b.sectionText && a.chapterText === b.chapterText,
  requestLessonWithRetry: async (...args) => {
    requested = args;
    return { ok: true, data: { playbackItems: [{ contentType: "video", percentage: 35, title: "Next" }], test: null } };
  },
  sleep: async () => {},
  TURBO_API_PACING_MS: 350,
  enabled: true, collectingCourseMaterials: false,
  stopAtTests: false, autoCompleteTests: false,
});
vm.runInContext(extract("  function courseIndexRouteMap(", "  // Display numbers are local labels"), context);
vm.runInContext(extract("  async function findNextPlaybackTargetViaApi(", "  async function openNextAvailableChapter("), context);
const routes = context.playbackCourseRouteMap(master, outline);
assert.deepEqual(Array.from(routes.values(), (entry) => entry.lpId), [100, 101, 102, 103]);
const result = await context.findNextPlaybackTargetViaApi(outline[0].identity);
assert.equal(result.status, "target");
assert.equal(result.entry.lessonNumber, 4);
assert.equal(requested[1], 4);
assert.equal(requested[5], 103, "the detailed route must use the target's lp_id");
assert.equal(requested[7], 203, "the detailed route must use the target's paragraph ID");

// When the master order and labels disagree, a numeric label alone cannot
// justify skipping a chapter as complete.
const ambiguous = master.map((route) => ({ ...route, masterOrder: null, title: "Other" }));
assert.equal(context.playbackCourseRouteMap(ambiguous, outline).size, 0);
console.log("PASS: repeated display_order values use verified master identities and skip completed chapters");
