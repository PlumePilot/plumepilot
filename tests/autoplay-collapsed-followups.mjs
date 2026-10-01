import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const videoElement = { ended: true, duration: 20, currentTime: 20 };
const firstRow = { name: "Video 1" };
const restoredRow = { name: "Video 1" };
const nextRow = { name: "Video 2" };
let recoveries = 0;
let nextRowReceived = null;
let clicked = null;
let pendingTimer = null;
let expectedRow = restoredRow;

const context = vm.createContext({
  enabled: true, busy: false, lastVideo: videoElement, timer: null,
  playbackContext: { lesson: "Video 1" },
  collectingCourseMaterials: false,
  courseBatchRunning: () => false,
  findWatchValidationModal: () => null,
  video: () => videoElement,
  currentLesson: () => null, // both accordions are closed
  lessonName: (row) => row?.name || "",
  log() {}, clearTimeout() {},
  setTimeout: (fn) => { pendingTimer = fn; return 1; },
  getProgress: () => 100,
  recoverPlaybackLesson: async () => ++recoveries === 1 ? firstRow : restoredRow,
  waitForLessonCompletion: async () => true, // sidebar re-renders during this wait
  playbackLessonRow: () => expectedRow,
  nextLesson: (row) => { nextRowReceived = row; return nextRow; },
  clickRow: (row) => { clicked = row; },
  waitFor: async () => videoElement,
  attach() {},
});
vm.runInContext(extract("  async function advance(v)", "  function resumeAfterTestBoundary"), context);
await context.advance(videoElement);
assert.equal(nextRowReceived, restoredRow, "advance must use the re-rendered lesson row");
assert.equal(clicked, nextRow);
assert.equal(context.busy, false);

recoveries = 0;
nextRowReceived = null;
clicked = null;
expectedRow = { name: "Different video" };
await context.advance(videoElement);
assert.equal(nextRowReceived, null, "a different active lesson must not be advanced");
assert.equal(clicked, null);

recoveries = 1;
expectedRow = restoredRow;
context.playbackContext = { videoElement, lesson: "Video 1" };
let advanced = null;
context.advance = async (v) => { advanced = v; };
context.RESUME_DELAY_MS = 1;
vm.runInContext(extract("  async function resumeIfVideoAlreadyEnded()", "  function attach(v)"), context);
await context.resumeIfVideoAlreadyEnded();
assert.equal(typeof pendingTimer, "function");
await pendingTimer();
assert.equal(advanced, videoElement, "resume must reopen the collapsed chapter for an ended video");

advanced = null;
recoveries = 1;
expectedRow = { name: "Different video" };
await context.resumeIfVideoAlreadyEnded();
await pendingTimer();
assert.equal(advanced, null, "resume must not advance a different selected lesson");
console.log("PASS: collapsed accordion resume and sidebar re-render during completion");

// Obiettivi handoff must restore an accordion closed during its settle delay,
// while a newer manual selection cancels the pending handoff.
let objectiveTimer = null;
let chapterOpen = false;
let objectiveClicks = 0;
const objectiveRow = { name: "Obiettivi" };
const objectiveContext = vm.createContext({
  objectivesSelectionEpoch: 0,
  timer: null, enabled: true, collectingCourseMaterials: false,
  courseBatchRunning: () => false,
  currentChapter: () => ({ text: "1 - Capitolo", sectionText: "Modulo" }),
  chapterIdentity: (chapter) => ({ chapterText: chapter.text, sectionText: chapter.sectionText }),
  courseCodeFromUrl: () => "COURSE",
  lessonNumberFromUrl: () => 1,
  clearTimeout() {}, setTimeout: (fn) => { objectiveTimer = fn; return 1; },
  OBJECTIVES_SETTLE_DELAY_MS: 1,
  currentLesson: () => chapterOpen ? objectiveRow : null,
  lessonName: (row) => row?.name || "",
  getProgress: () => 0,
  lessonApiCache: new Map(),
  lessonApiCacheKey: () => "COURSE:1",
  firstVideoInChapter: () => chapterOpen ? nextRow : null,
  findChapter: () => chapterOpen ? {} : null,
  chapterRows: () => chapterOpen ? [objectiveRow, nextRow] : [],
  openChapter: async () => { chapterOpen = true; return true; },
  clickRow: () => { objectiveClicks++; },
  waitFor: async () => videoElement,
  video: () => videoElement,
  attach() {}, log() {},
});
vm.runInContext(extract("  function resumeFromObjectives(objectiveRow)", "  document.addEventListener(\n    \"click\""), objectiveContext);
objectiveContext.resumeFromObjectives(objectiveRow);
await objectiveTimer();
assert.equal(objectiveClicks, 1, "Obiettivi must find its video after reopening a collapsed chapter");

chapterOpen = false;
objectiveContext.resumeFromObjectives(objectiveRow);
objectiveContext.objectivesSelectionEpoch++;
await objectiveTimer();
assert.equal(chapterOpen, false, "a later manual selection must cancel Obiettivi recovery");
console.log("PASS: Obiettivi handoff restores collapsed rows without overriding another selection");
