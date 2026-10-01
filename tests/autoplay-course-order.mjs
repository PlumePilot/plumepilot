import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const row = (name, progress) => ({name, progress});
const objective = row("Obiettivi", 100), first = row("Video 1", 100), second = row("Video 2", 100), third = row("Video 3", 0);
const sameChapter = vm.createContext({
  currentChapter: () => ({}), chapterRows: () => [objective, first, second, third],
  findChapter: () => ({}), lessonName: r => r.name, getProgress: r => r.progress, log() {},
});
vm.runInContext(extract("  function nextLesson(row)", "  function video()"), sameChapter);
vm.runInContext(extract("  function firstUnfinishedVideo(identity)", "  function clickRow(row)"), sameChapter);
assert.equal(sameChapter.nextLesson(first), second, "replay must not skip a completed next video");
assert.equal(sameChapter.nextLesson(third), null);
assert.equal(sameChapter.firstVideoInChapter({}), first, "sequential chapter entry starts at video 1");
assert.equal(sameChapter.firstUnfinishedVideo({}), third, "bookmark keeps progress-based selection");

const chapter = (sectionText, text, rows) => ({sectionText, text, rows});
async function transition({crossSection = false, sequential = true, missingCurrent = false, stopAtTest = false} = {}) {
  const current = chapter("B", "3 - Current", [first]);
  const next = chapter(crossSection ? "C" : "B", "4 - Next", [first, second, third]);
  const openedSections = [], openedChapters = [], clicked = [];
  let apiCalls = 0, activeSection = "B";
  const context = vm.createContext({
    playbackDiscoveryCancelled: () => false,
    stopAtCurrentTestBeforeDiscovery: async () => stopAtTest,
    findNextPlaybackTargetViaApi: async () => {
      apiCalls++;
      return {status: "target", entry: {identity: {sectionText: next.sectionText, chapterText: next.text}}, unfinishedItem: {contentType: "video"}};
    },
    sections: () => [{text: "A"}, {text: "B"}, {text: "C"}],
    openSection: async text => { openedSections.push(text); activeSection = text; return true; },
    chapters: () => [current, next].filter(ch => ch.sectionText === activeSection && !(missingCurrent && ch === current)),
    chapterIdentity: ch => ({sectionText: ch.sectionText, chapterText: ch.text}),
    openChapter: async identity => { openedChapters.push(identity); return true; },
    findChapter: identity => [current, next].find(ch => ch.text === identity.chapterText),
    chapterRows: ch => ch.rows,
    firstVideoInChapter: () => first,
    firstUnfinishedVideo: () => third,
    lessonName: r => r.name, getProgress: r => r.progress,
    IS_CHROMIUM: false, CHAPTER_SETTLE_DELAY_MS: 0,
    sleep: async () => {}, waitFor: async fn => fn(),
    clickRow: r => clicked.push(r), video: () => ({}), attach() {},
    setResumeDiscoveryStatus() {}, removeResumeDiscoveryStatus() {}, log() {},
    stoppedAtTestContext: null,
  });
  vm.runInContext(extract("  async function openNextAvailableChapter(", "  async function nextChapter("), context);
  const result = await context.openNextAvailableChapter({sectionText: "B", chapterText: current.text}, {}, false,
    sequential ? {sequential: true} : {bookmarkSearch: true});
  return {result, apiCalls, clicked, openedSections, openedChapters};
}
for (const crossSection of [false, true]) {
  const result = await transition({crossSection});
  assert.equal(result.result, true);
  assert.equal(result.apiCalls, 0, "ordinary autoplay must not request incomplete discovery");
  assert.equal(result.clicked[0], first, "completed next chapter must be played from its first video");
  assert.deepEqual(result.openedSections, crossSection ? ["B", "C"] : ["B"], "do not scan earlier paragraphs");
  assert.equal(result.openedChapters.length, 1);
}
const bookmark = await transition({sequential: false});
assert.equal(bookmark.apiCalls, 1);
assert.equal(bookmark.clicked[0], third);
const missing = await transition({missingCurrent: true});
assert.equal(missing.result, false, "ambiguous current chapter must not jump to another section");
assert.equal(missing.openedChapters.length, 0);
const stopped = await transition({stopAtTest: true});
assert.equal(stopped.result, false);
assert.equal(stopped.clicked.length, 0, "test stop remains effective");

let stored;
const recovery = vm.createContext({
  documentIsHidden: () => false, readChapterRecovery: () => null,
  MAX_CHAPTER_RELOADS: 1, CHAPTER_RECOVERY_KEY: "recovery", log() {},
  sessionStorage: {setItem: (_key, value) => {stored = JSON.parse(value);}}, location: {reload() {}},
});
vm.runInContext(extract("  function reloadForChapterRecovery(", "  async function waitForCourseReadyAfterReload("), recovery);
assert.equal(recovery.reloadForChapterRecovery({chapterText: "3"}, {sequential: true}), true);
assert.equal(stored.sequential, true, "recovery must preserve ordered autoplay");
console.log("PASS: replay order within/across chapters and sections; bookmark separation; safe identity; test stop; reload mode");

let pendingResume = null, advances = 0;
const replayPlayer = {ended: false, duration: 60, currentTime: 5};
const resumed = vm.createContext({
  video: () => replayPlayer, currentLesson: () => first, lessonName: r => r.name,
  playbackContext: null, timer: null, rememberPlaybackLesson() {}, log() {}, enabled: true,
  recoverPlaybackLesson: async () => first, playbackLessonRow: () => first,
  clearTimeout() {}, setTimeout: fn => {pendingResume = fn; return 1;}, RESUME_DELAY_MS: 0,
  advance: async () => {advances++;},
});
vm.runInContext(extract("  async function resumeIfVideoAlreadyEnded()", "  function attach(v)"), resumed);
await resumed.resumeIfVideoAlreadyEnded();
assert.equal(pendingResume, null, "enabling autoplay during a completed video's replay must not skip it");
replayPlayer.ended = true; replayPlayer.currentTime = 60;
await resumed.resumeIfVideoAlreadyEnded();
assert.equal(typeof pendingResume, "function");
replayPlayer.ended = false; replayPlayer.currentTime = 0;
await pendingResume();
assert.equal(advances, 0, "restarting before a pending resume cancels advancement");

const listeners = new Map();
const reused = {dataset: {}, ended: true, duration: 60, currentTime: 60,
  addEventListener: (name, fn) => listeners.set(name, fn)};
let endTimer;
const events = vm.createContext({
  currentLesson: () => first, rememberPlaybackLesson() {}, captureEndedVideoProgress: async () => {},
  lastVideo: null, timer: null, enabled: true, log() {}, clearTimeout() {},
  setTimeout: fn => {endTimer = fn; return 1;}, DELAY_MS: 0, advance: () => {advances++;},
});
vm.runInContext(extract("  function attach(v)", "  function scan()"), events);
events.attach(reused);
listeners.get("ended")(); endTimer();
assert.equal(advances, 1);
reused.ended = false; reused.currentTime = 0;
listeners.get("play")();
assert.equal(events.lastVideo, null);
reused.ended = true; reused.currentTime = 60;
listeners.get("ended")(); endTimer();
assert.equal(advances, 2, "a reused player must advance at each actual video end");
console.log("PASS: enable during replay; delayed resume cancellation; consecutive ends on a reused player");
