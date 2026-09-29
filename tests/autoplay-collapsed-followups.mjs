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
