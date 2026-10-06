import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const outline = Array.from({length: 5}, (_, index) => ({lessonNumber: index + 1,
  identity: {sectionText: "A", chapterText: `${index + 1} - Chapter`}}));
const master = outline.map((entry, index) => ({displayOrder: index + 1, lpId: 100 + index, id: 200 + index, percentage: 100}));
const item = (contentType, percentage) => ({contentType, percentage, percentageKnown: true, title: contentType});

async function search({stop = false, automatic = false, testPending = true, masterAllComplete = false, allVideosComplete = false} = {}) {
  const requests = [];
  const context = vm.createContext({
    courseCodeFromUrl: () => "COURSE", playbackDiscoveryCancelled: () => false,
    getPlaybackCourseOutline: async () => outline,
    getPlaybackCourseIndex: async () => master.map((entry, index) => ({...entry, percentage: !masterAllComplete && index === 4 ? 80 : 100})),
    playbackCourseRouteMap: index => new Map(index.map((entry, number) => [number + 1, entry])),
    sameChapterIdentity: (a, b) => a.chapterText === b.chapterText,
    setResumeDiscoveryStatus() {}, removeResumeDiscoveryStatus() {}, log() {},
    sleep: async () => {}, TURBO_API_PACING_MS: 0,
    stopAtTests: stop, autoCompleteTests: automatic,
    requestLessonWithRetry: async (...args) => {
      requests.push(args);
      const number = args[1];
      return {ok: true, data: {
        // A pending objective in a completed-video chapter is not a video target.
        playbackItems: [item("intro", 0), item("video", number === 5 && !allVideosComplete ? 45 : 100)],
        test: number === 3 && testPending ? item("test", 0) : null,
        progressDataComplete: true,
      }};
    },
  });
  vm.runInContext(extract("  async function findNextPlaybackTargetViaApi(", "  async function openNextAvailableChapter("), context);
  const result = await context.findNextPlaybackTargetViaApi(outline[0].identity, {forwardVideoSearch: true});
  return {result, requests};
}
const ignore = await search();
assert.equal(ignore.result.entry.lessonNumber, 5, "from the last video of chapter 1, jump to chapter 5 without selecting 2–4");
assert.equal(ignore.result.unfinishedItem.contentType, "video");
assert.equal(ignore.result.objectivePending, true, "opening the target still knows whether its objectives are pending");
assert.deepEqual(ignore.requests.map(args => args[1]), [5], "master's incomplete candidate is checked directly without querying or opening 2–4");
assert.ok(ignore.requests.every(args => args[8] === true), "stale percentages cannot hide a pending forward video");
assert.equal(ignore.requests.at(-1)[5], 104);
assert.equal(ignore.requests.at(-1)[7], 204);
const inaccurateMaster = await search({masterAllComplete: true});
assert.equal(inaccurateMaster.result.entry.lessonNumber, 5);
assert.deepEqual(inaccurateMaster.requests.map(args => args[1]), [2, 3, 4, 5], "all-100% master summaries need a fallback before claiming no videos remain");
const finished = await search({allVideosComplete: true});
assert.equal(finished.result.status, "end");
assert.deepEqual(finished.requests.map(args => args[1]), [5, 2, 3, 4]);
for (const policy of [{stop: true}, {automatic: true}]) {
  const attention = await search(policy);
  assert.equal(attention.result.entry.lessonNumber, 3, "respect an intermediate pending test when required by the autoplay policy");
  assert.equal(attention.result.unfinishedItem, null);
  assert.equal(attention.result.testTarget.contentType, "test");
}
assert.equal((await search({stop: true, testPending: false})).result.entry.lessonNumber, 5, "chapters with complete detail and no test need no visual opening");
console.log("PASS: API-guided forward skip from chapter 1 to 5; no objective-only targets; fresh percentages and verified routes; autoplay test policy preserved");
