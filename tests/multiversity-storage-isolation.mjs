import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const backgroundSource = readFileSync(new URL("../background.js", import.meta.url), "utf8");
const bridgeSource = readFileSync(new URL("../bridge.js", import.meta.url), "utf8");
const commissionStateSource = readFileSync(new URL("../commission-state.js", import.meta.url), "utf8");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing source section: ${start}`);
  return source.slice(from, to);
}

const stored = {};
const commissionContext = vm.createContext({
  console,
  setTimeout,
  SUPPORTED_PLATFORM_IDS: new Set(["pegaso", "mercatorum", "utsr"]),
  commissionQueue: Promise.resolve(),
  storageGetMany: async (defaults) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    return { ...defaults, ...structuredClone(stored) };
  },
  storageSet: async (values) => Object.assign(stored, structuredClone(values)),
});
vm.runInContext(commissionStateSource, commissionContext);
commissionContext.commissionStates = commissionContext.StudyWingCommissionState;
vm.runInContext(
  sourceBetween(backgroundSource, "  function serializedCommission(", "  function serializedCourseThreshold("),
  commissionContext,
);
vm.runInContext(
  sourceBetween(backgroundSource, "  function safeCommissionText(", "  function normalizedCourseCode("),
  commissionContext,
);
vm.runInContext(
  sourceBetween(backgroundSource, "  function normalizedPlatformId(", "  async function currentCommissionLease("),
  commissionContext,
);

await Promise.all([
  commissionContext.storeCommissionPayload({
    platformId: "pegaso",
    capturedAt: 1000,
    exams: [{ exam_id: 7, course_code: "SAME", commission: "In attesa" }],
  }),
  commissionContext.storeCommissionPayload({
    platformId: "mercatorum",
    capturedAt: 2000,
    exams: [{ exam_id: 7, course_code: "SAME", commission: "In attesa" }],
  }),
]);

assert.deepEqual(
  stored.commissionExams.map((exam) => `${exam.platformId}:${exam.exam_id}`).sort(),
  ["mercatorum:7", "pegaso:7"],
  "serialized commission writes must preserve both platforms even when exam IDs collide",
);
assert.deepEqual(
  stored.commissionExamsCapturedAtByPlatform,
  { pegaso: 1000, mercatorum: 2000 },
);

const courseMapHelpers = sourceBetween(
  bridgeSource,
  "  function courseStorageKey(",
  "  let turboTestsStatus",
);
const mixedMap = {
  SAME: "legacy-pegaso",
  "pegaso:SAME": "pegaso",
  "mercatorum:SAME": "mercatorum",
  "utsr:SAME": "utsr",
};
for (const [platformId, expected] of [
  ["pegaso", "pegaso"],
  ["mercatorum", "mercatorum"],
  ["utsr", "utsr"],
]) {
  const context = vm.createContext({ PLATFORM_ID: platformId });
  vm.runInContext(courseMapHelpers, context);
  const scoped = context.currentPlatformCourseMap(mixedMap);
  assert.equal(scoped.SAME, expected);
  assert.equal(Object.keys(scoped).length, 1);
}

const pegasoLegacyContext = vm.createContext({ PLATFORM_ID: "pegaso" });
vm.runInContext(courseMapHelpers, pegasoLegacyContext);
assert.equal(
  pegasoLegacyContext.currentPlatformCourseMap({ SAME: "legacy-pegaso" }).SAME,
  "legacy-pegaso",
  "legacy unqualified course settings must remain available only to Pegaso",
);
const mercatorumLegacyContext = vm.createContext({ PLATFORM_ID: "mercatorum" });
vm.runInContext(courseMapHelpers, mercatorumLegacyContext);
assert.equal(
  mercatorumLegacyContext.currentPlatformCourseMap({ SAME: "legacy-pegaso" }).SAME,
  undefined,
);

console.log("PASS: commission writes and persisted course identities are isolated per platform");
