import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
function extract(start, end, text = source) {
  const first = text.indexOf(start), last = text.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing function boundary: ${start}`);
  return text.slice(first, last);
}
const identity = number => ({sectionText: "Paragraph", chapterText: `${number} - Chapter ${number}`});
const outline = Array.from({length: 5}, (_, index) => ({lessonNumber: index + 1, identity: identity(index + 1)}));
const master = outline.map((entry, index) => ({
  displayOrder: entry.lessonNumber, masterOrder: index, title: `Chapter ${entry.lessonNumber}`,
  lpId: 100 + index, id: 200 + index, percentage: 100,
}));
const activity = (contentType, percentage, title = contentType) => ({contentType, percentage, title});
const complete = () => ({ok: true, data: {
  playbackItems: [activity("intro", 100, "Obiettivi"), activity("video", 100, "Video")],
  playbackDataComplete: true, progressDataComplete: true, test: activity("test", 100),
}});

async function discover({pendingChapter, type = "video", currentActivity = null, failedChapter, ambiguous = false, noTest = false} = {}) {
  const requested = [];
  const context = vm.createContext({
    normalizedText: value => String(value || "").trim(),
    playbackDiscoveryCancelled: () => false,
    setResumeDiscoveryStatus() {}, removeResumeDiscoveryStatus() {}, log() {},
    courseCodeFromUrl: () => "COURSE", getPlaybackCourseOutline: async () => outline,
    getPlaybackCourseIndex: async () => ambiguous ? master.map(entry => ({...entry, masterOrder: null, title: "Other"})) : master,
    sameChapterIdentity: (a, b) => a?.sectionText === b?.sectionText && a?.chapterText === b?.chapterText,
    requestLessonWithRetry: async (...args) => {
      requested.push(args);
      if (args[1] === failedChapter) return {ok: false, error: "LESSON_DATA_INCOMPLETE"};
      const response = complete();
      if (noTest) response.data.test = null;
      if (args[1] === pendingChapter) {
        if (type === "introAndVideo") {
          response.data.playbackItems.reverse().forEach(item => {item.percentage = 0;});
        } else if (type === "test") response.data.test = activity("test", 0);
        else if (type === "progressTest") {
          response.data.test = null;
          response.data.progressItems = [activity("test", 0)];
        } else {
          response.data.playbackItems.find(item => item.contentType === type).percentage = 0;
        }
      }
      return response;
    },
    sleep: async () => {}, TURBO_API_PACING_MS: 0,
    stopAtTests: false, autoCompleteTests: false,
  });
  vm.runInContext(extract("  function courseIndexRouteMap(", "  // Display numbers are local labels"), context);
  vm.runInContext(extract("  async function findNextPlaybackTargetViaApi(", "  async function openNextAvailableChapter("), context);
  const result = await context.findNextPlaybackTargetViaApi(identity(1), {
    includeCurrent: true, bookmarkSearch: true, masterRefreshed: true, pendingTestsOnly: true,
    currentActivityCheck: {identity: identity(5), activity: currentActivity},
  });
  return {result, requested};
}

for (const type of ["intro", "video", "test", "progressTest"]) {
  const {result, requested} = await discover({pendingChapter: 2, type});
  assert.equal(result.status, "target", "master 100% is not evidence that every activity is complete");
  assert.equal(result.entry.lessonNumber, 2);
  assert.equal(result.unfinishedItem?.contentType || result.testTarget?.contentType,
    type === "progressTest" ? "test" : type);
  assert.deepEqual(requested.map(args => args[1]), [1, 2], "stop at earliest pending chapter without opening all chapters");
  assert.equal(requested[1][5], 101, "master routes the correct lp_id");
  assert.equal(requested[1][7], 201, "master routes the correct paragraph ID");
  assert.ok(requested.every(args => args[8] === true), "explicit discovery bypasses historical percentage caches");
}
const earlier = await discover({pendingChapter: 1, currentActivity: activity("video", 0, "Current")});
assert.equal(earlier.result.entry.lessonNumber, 1, "current chapter 5 cannot hide an earlier incomplete chapter");
assert.equal((await discover({pendingChapter: 1, type: "introAndVideo"})).result.unfinishedItem.contentType, "intro", "Obiettivi precede videos even when API payload order differs");
const current = await discover({currentActivity: activity("video", 0, "Current")});
assert.equal(current.result.entry.lessonNumber, 5);
assert.deepEqual(current.requested.map(args => args[1]), [1, 2, 3, 4], "reuse current chapter's visible pending activity");
const allComplete = await discover();
assert.equal(allComplete.result.status, "end");
assert.equal(allComplete.requested.length, 5, "completion requires all activity details, not just the master summary");
assert.equal((await discover({noTest: true})).result.status, "end", "complete details can confirm chapters with no test");
const failed = await discover({failedChapter: 2});
assert.equal(failed.result.entry.lessonNumber, 2);
assert.equal(failed.result.visualVerification, true, "partial API data requires visual verification");
const ambiguous = await discover({ambiguous: true});
assert.equal(ambiguous.result.visualVerification, true);
assert.equal(ambiguous.requested.length, 0, "an ambiguous master identity must not query an unrelated module");

let cacheReads = 0;
const freshResponse = {ok: true, data: {playbackDataComplete: true, playbackItems: [activity("video", 12)]}};
const cachedResponse = complete();
const cache = vm.createContext({
  cachedLessonResponse: () => {cacheReads++; return cachedResponse;},
  turboApiRequest: async () => freshResponse, rememberLessonResponse() {},
  hasRequiredLessonData: response => response.data.playbackDataComplete,
  API_LESSON_RETRY_DELAYS_MS: [], log() {},
});
vm.runInContext(extract("  async function requestLessonWithRetry(", "  async function apiCourseOutline("), cache);
assert.equal(await cache.requestLessonWithRetry("COURSE", 1, "playback"), cachedResponse);
assert.equal(await cache.requestLessonWithRetry("COURSE", 1, "playback", null, null, 100, false, 200, true), freshResponse);
assert.equal(cacheReads, 1, "fresh discovery cannot merge a stale cached 100% into its decision");

async function openBookmark(type, autoCompleteTests) {
  const rows = [{name: "Obiettivi", progress: type === "intro" ? 0 : 100}, {name: "Video", progress: type === "video" ? 30 : 100}];
  const chapter = {rows};
  let testScrolls = 0, completions = 0, playerReads = 0;
  const clicks = [];
  const test = {scrollIntoView() {testScrolls++;}};
  const context = vm.createContext({
    playbackDiscoveryCancelled: () => false,
    stopAtCurrentTestBeforeDiscovery: async () => {throw new Error("Bookmark must bypass autoplay test boundaries");},
    findNextPlaybackTargetViaApi: async () => ({status: "target", entry: outline[0],
      unfinishedItem: type === "test" ? null : activity(type, 0, type === "intro" ? "Obiettivi" : "Video"),
      testTarget: type === "test" ? activity("test", 0) : null}),
    openChapter: async () => true, findChapter: () => chapter, chapterRows: ch => ch.rows,
    lessonName: row => row.name, getProgress: row => row.progress,
    getEndOfLessonTest: () => test, isEndOfLessonTestCompleted: () => type !== "test",
    completeEndOfLessonTestViaApi: async () => {completions++; return true;},
    completeAutomaticEndOfLessonTest: async () => {completions++; return true;},
    normalizedText: text => text,
    clickRow: row => {clicks.push(row.name); return true;},
    waitFor: async fn => fn(), video: () => {playerReads++; return {};}, attach() {},
    sleep: async () => {}, IS_CHROMIUM: false, CHAPTER_SETTLE_DELAY_MS: 0,
    autoCompleteTests, stopAtTests: false, setResumeDiscoveryStatus() {}, removeResumeDiscoveryStatus() {}, log() {},
  });
  vm.runInContext(extract("  function visibleIncompleteActivity(", "  function firstVideoInChapter("), context);
  vm.runInContext(extract("  async function openNextAvailableChapter(", "  async function nextChapter("), context);
  const result = await context.openNextAvailableChapter(identity(1), {}, false, {
    bookmarkSearch: true, includeCurrent: true, skipCurrentTestBoundary: true,
  });
  assert.equal(result, true);
  assert.equal(completions, 0, "bookmark must not submit answers even with automatic test completion enabled");
  assert.deepEqual(clicks, type === "test" ? [] : [type === "intro" ? "Obiettivi" : "Video"]);
  assert.equal(testScrolls, type === "test" ? 1 : 0, "pending tests are located even when autoplay ignores them");
  assert.equal(playerReads, type === "video" ? 1 : 0, "bookmark leaves Obiettivi selected rather than advancing to a video");
}
for (const type of ["intro", "video", "test"]) for (const autoComplete of [false, true]) await openBookmark(type, autoComplete);

const preparationOrder = [];
let searchOptions, searchStart;
let startCourse = "COURSE", navigateDuringMaster = false;
const start = vm.createContext({
  enabled: true, busy: false, collectingCourseMaterials: false, courseBatchRunning: () => false,
  courseCodeFromUrl: () => startCourse, readChapterRecovery: () => null,
  readSessionConflictRecovery: () => null, readWatchValidationRecovery: () => null,
  smartResumeRunning: false, smartResumeGeneration: 0, objectivesSelectionEpoch: 0, timer: 1,
  clearTimeout() {}, currentLesson: () => ({}), currentChapter: () => ({}), chapterIdentity: () => identity(5),
  visibleIncompleteActivity: () => {preparationOrder.push("current"); return activity("video", 0, "Current");},
  getPlaybackCourseIndex: async (_code, options) => {
    preparationOrder.push("master"); assert.equal(options.forceRefresh, true);
    if (navigateDuringMaster) startCourse = "OTHER";
    return master;
  },
  sections: () => [{text: "Paragraph"}], getPlaybackCourseOutline: async () => outline,
  waitFor: async fn => fn(), SMART_RESUME_READY_TIMEOUT_MS: 0, video: () => ({}),
  openNextAvailableChapter: async (first, _video, _recovering, options) => {searchStart = first; searchOptions = options; return true;},
  window: {postMessage() {}}, setResumeDiscoveryStatus() {}, log() {},
});
vm.runInContext(extract("  async function startFirstIncompleteDiscovery(", "  async function resumeIfVideoAlreadyEnded()"), start);
await start.startFirstIncompleteDiscovery("button");
assert.deepEqual(preparationOrder, ["current", "master"]);
assert.equal(searchStart.chapterText, identity(1).chapterText, "bookmark searches from the beginning despite current chapter 5");
assert.equal(searchOptions.currentActivityCheck.identity.chapterText, identity(5).chapterText);
assert.equal(searchOptions.masterRefreshed, true);
assert.equal(start.timer, null, "a queued autoplay transition cannot race with bookmark selection");
assert.equal(start.smartResumeRunning, false);
searchStart = null;
navigateDuringMaster = true;
await start.startFirstIncompleteDiscovery("button");
assert.equal(searchStart, null, "changing course during discovery must cancel before selecting another course's chapter");
assert.equal(start.smartResumeRunning, false);

const bridge = readFileSync(new URL("../bridge.js", import.meta.url), "utf8");
const messages = [];
let skipPreference = false;
const preferences = vm.createContext({
  window: {postMessage: message => messages.push(message)}, extensionVersion: "2.35.0",
  chrome: {storage: {local: {get: (defaults, callback) => callback({...defaults, autoplaySkipCompletedVideos: skipPreference})}}},
  currentPlatformCourseMap: value => value, commissionCheckEnabled: false,
  scheduleCommissionCheck() {}, cancelCommissionCheck() {},
});
vm.runInContext(extract("  function sendState(", "  chrome.storage.local.remove(\"startFromFirstIncomplete\");", bridge), preferences);
preferences.readAndSendState(true);
assert.equal(messages.at(-1).autoplaySkipCompletedVideos, false, "replay remains the default for existing users");
skipPreference = true;
preferences.readAndSendState(false);
assert.equal(messages.at(-1).autoplaySkipCompletedVideos, true, "the selected preference reaches playback state");
console.log("PASS: earliest incomplete Obiettivi/videos/tests; stale 100% master/cache; safe routes; visual fallback; current-chapter precheck; bookmark never answers tests; autoplay preference propagation");
