# 14 — Debugging, tests, and regressions

## Turning a bug into lasting knowledge

> **Reference snapshot for this chapter**  
> PlumePilot **2.35.2 release candidate**, branch `feat/ui-ux-2.35.2`, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`.

A bug fixed today can return tomorrow. A bug explained through a minimal reproduction, a verified cause, a clearly stated invariant, and an automated regression test becomes durable project knowledge. PlumePilot offers many practical examples: autoplay recovery, reusable video elements, hidden tabs, incomplete-activity routing, multi-university storage, offline quiz exports, and the cross-browser release process.

---

## 1. From symptom to invariant

A proper fix follows a loop: observe a symptom, reproduce it, identify its cause, define the invariant, implement the change, and preserve that invariant in a regression test. Fixing only what is visible leaves the same underlying risk alive.

---

## 2. A symptom is not the root cause

If autoplay opens too many chapters, hiding intermediate UI transitions may conceal the symptom. The cause could be incorrect interpretation of the master index or ambiguous chapter identity. The test should protect the actual search contract, not a particular click sequence.

---

## 3. Debugging as the scientific method

Make a hypothesis about system behavior, predict a result, run a controlled experiment, and compare the outcome with the prediction. A failed prediction means the model or implementation needs revision.

---

## 4. Case study: the master index

An early assumption that 100% progress always meant complete was contradicted by real platform behavior. The algorithm evolved from treating summaries as proof to using them as prioritization evidence with verification paths. A bug improved the architectural model.

---

## 5. “Sometimes” is not a reproducer

A good report specifies browser, version, account or course conditions, state before the action, exact steps, expected result, and observed result. This description is already close to a test case.

---

## 6. Reduce the case

A failure in a large course can often be recreated with only two chapters and one unusual progress state. Minimal reproduction removes unrelated variables and makes the causal path easier to inspect.

---

## 7. A reproduction matrix

Relevant dimensions include browser, LMS platform, chapter order, activity state, autoplay settings, visible or hidden tab, popup or floating UI, and warmed or cold cache. Varying all of them at once defeats diagnosis.

---

## 8. Change one factor at a time

Hold the course, settings, and interaction sequence constant while changing only Firefox versus Chromium, or background versus content context. When one factor reliably changes the outcome, it becomes an actionable hypothesis.

---

## 9. One extension, several programs

Popup, service worker or background script, content script, MAIN-world code, and builder page have separate JavaScript lifecycles. Logs appearing in a different console are not evidence that a function failed to execute.

---

## 10. Start by identifying the execution context

To debug privileged messages, inspect the extension context that owns the API. To debug player DOM events, inspect the relevant tab/world. Always establish where the suspect line actually runs before interpreting its logs.

---

## 11. Same document, separate globals

MAIN and ISOLATED worlds can observe the same DOM yet have different global objects, patched functions, and event access. Debugging a shared page is not equivalent to debugging a shared JavaScript environment.

---

## 12. A typical bridge failure

A MAIN-world event may be emitted correctly while its ISOLATED bridge fails to forward it. Instead of asking whether one function was called, trace the entire event pipeline across its trust boundaries.

---

## 13. Instrumentation points

For a chain A → B → C → D, log or assert at the transitions, not only at D. Boundary observations reveal where a command disappears or changes shape.

---

## 14. Correlation IDs

A request ID connects the original command to acknowledgements, progress, completion, and failures. Without correlation, interleaved logs from concurrent exports are ambiguous.

**Example from the historical source:**

```js
requestId
```

---

## 15. A useful log answers a question

A vague “failed” message has little value. Prefer a structured record with operation identity, phase, expected condition, observed condition, and a safe failure reason.

---

## 16. Log invariants, not random details

For a routing bug, log lesson identity, display order, folder ID, target, and ambiguous matches. A button's CSS color is irrelevant unless the actual hypothesis concerns presentation.

---

## 17. Hypothesis-driven debugging

Avoid random edits followed by repeated manual checks. State the suspected cause, create a scenario that would disprove it, measure the result, then apply the narrowest correction.

---

## 18. There is more than one test type

PlumePilot uses small Node tests, DOM and timer fakes, source-structure checks, generated-artifact tests, browser integration fixtures, and release archive validation. Each protects a different layer.

---

## 19. Classify tests by the contract they prove

Separate pure unit behavior, state transitions, adapter boundaries, structure, browser integration, and final artifacts. A generic “test passed” label does not reveal what was actually validated.

---

## 20. The minimal Node assertion runner

Many project tests use node:assert/strict directly, including equal, deepEqual, match, and ok. A larger framework is not mandatory when a script can deterministically prove the invariant.

**Example from the historical source:**

```js
import assert from "node:assert/strict";
```

```js
assert.equal(...)
assert.deepEqual(...)
assert.match(...)
assert.ok(...)
```

---

## 21. Why strict assertions matter

Identity-sensitive assertions should not accidentally treat numeric 1 as string "1". Strict comparisons catch differences that JavaScript coercion might conceal in production data.

**Example from the historical source:**

```js
1
```

```js
"1"
```

---

## 22. Using node:vm as a small laboratory

Tests sometimes read part of production source and execute it in a VM context with controlled globals. This tests actual application logic while replacing browser dependencies.

**Example from the historical source:**

```js
const source = readFileSync(
  new URL("../content.js", import.meta.url),
  "utf8"
);

const context = vm.createContext({
  enabled: true,
  ...
});

vm.runInContext(
  extract("async function ...", "function ..."),
  context
);
```

---

## 23. What the VM gives us

A test can provide fake document nodes, timers, APIs, and storage, then observe side effects from a production helper. That isolates a targeted behavior from the full LMS.

---

## 24. Dependency injection without a framework

Instead of rewriting every production function to accept dependencies, a VM test context can inject specific globals at test time. This is pragmatic dependency injection for a legacy module shape.

**Example from the historical source:**

```js
function advance({
  currentLesson,
  recoverPlaybackLesson,
  sleep,
  ...
}) { ... }
```

---

## 25. A VM context is not a security sandbox

Node's vm contexts are not suitable for safely executing arbitrary hostile code. PlumePilot uses them with trusted project sources and deliberately controlled test inputs.

---

## 26. The closed-accordion test

A fake currentLesson initially returns null because its accordion is closed. A recovery helper returns a row only after a simulated rerender. The scenario isolates whether autoplay reacquires the actual playable row.

**Example from the historical source:**

```js
currentLesson: () => null
```

```js
recoverPlaybackLesson:
  async () =>
    ++recoveries === 1
      ? firstRow
      : restoredRow
```

---

## 27. Do not simulate all of React

The fake does not implement the LMS's framework. It models only the observable condition required by the invariant: a lesson element can disappear and be recreated before the next action.

---

## 28. What the test requires

The advance function must operate on the newly rendered lesson row rather than an obsolete reference. Assertions describe that behavior directly.

**Example from the historical source:**

```js
assert.equal(
  nextRowReceived,
  restoredRow,
  "advance must use the re-rendered lesson row"
);
```

---

## 29. Include a negative case

If the active lesson changes to a different one, the previous autoplay recovery must not advance it. A fix that always clicks a recovered row could override a user's manual navigation.

**Example from the historical source:**

```js
assert.equal(
  nextRowReceived,
  null,
  "a different active lesson must not be advanced"
);
```

---

## 30. Controlled timers

Capture the timeout callback rather than allowing real seconds to pass. The test decides precisely when the scheduled continuation runs.

**Example from the historical source:**

```js
setTimeout: (fn) => {
  pendingTimer = fn;
  return 1;
}
```

```js
await pendingTimer();
```

---

## 31. Deterministic race testing

Force a state change before invoking the captured callback. The race becomes reproducible and its effect can be asserted without hoping for fortunate timing.

---

## 32. One video element, different content

The LMS may reuse the same HTMLVideoElement across lesson changes. A test changes the media identity while retaining the object reference.

**Example from the historical source:**

```js
const reused = {
  ended: true,
  duration: 60,
  currentTime: 60,
  addEventListener(...)
};
```

---

## 33. Identity is not object identity

Autoplay must recognize a changed lesson even when the video DOM node remains identical. The semantic media identity must be checked, not only object equality.

---

## 34. Hidden-tab recovery

Background tabs may throttle timers and rendering. A naive timeout can be misread as evidence that the page is broken and trigger unnecessary reloads.

---

## 35. A fake clock

The test replaces Date.now and sleep with controlled virtual time. Recovery conditions can be exercised instantly and deterministically.

**Example from the historical source:**

```js
let now = 0;

Date: {
  now: () => now
}
```

```js
sleep = async (ms) => {
  now += ms;
  ...
};
```

---

## 36. Visibility transition

The fake document switches from hidden to visible after a chosen virtual timestamp and dispatches a visibility event. The wait should resume without treating the hidden interval as a fatal navigation failure.

**Example from the historical source:**

```js
assert.equal(
  result.rendered,
  true,
  "DOM waits must resume after the tab is visible"
);
```

---

## 37. Another invariant

Recovery must not reload a page merely because it remained hidden while timers were throttled.

**Example from the historical source:**

```js
assert.equal(
  reloads,
  0,
  "chapter recovery must not reload a hidden page"
);
```

---

## 38. Safety

A safety property says something bad never happens: for instance, do not advance a different active lesson or reload a hidden tab unnecessarily.

---

## 39. Liveness

A liveness property says something good eventually happens: once the tab becomes visible and the DOM appears, the workflow should proceed. A system can be safe but stuck, or active but unsafe.

---

## 40. An algorithmic regression suite

first-incomplete-activities.mjs uses controlled outlines, master percentages, detail responses, and side effects to verify discovery logic without rendering the entire LMS.

---

## 41. Earliest incomplete property

If chapter 1 is complete and chapter 2 is incomplete, return chapter 2; also assert which detail requests occurred and in what order.

**Example from the historical source:**

```js
assert.equal(
  result.entry.lessonNumber,
  2
);
```

```js
assert.deepEqual(
  requested.map(args => args[1]),
  [1, 2]
);
```

---

## 42. Performance can be a specification

With a master index prioritizing chapter 4 as incomplete, a test can require that only chapter 4 is queried on the successful fast path. This protects the optimization from regressions.

**Example from the historical source:**

```js
requested === [4]
```

---

## 43. Not at the expense of correctness

If the favored chapter is actually complete while an earlier chapter is incomplete, the fallback must continue searching. Protect the speed path and the recovery path together.

**Example from the historical source:**

```js
requested === [4, 1]
```

---

## 44. Happy paths are insufficient

Test stale summaries, missing mappings, malformed responses, conflicting percentages, failed requests, and user cancellation. These are adversarial inputs to an algorithm, not necessarily security attacks.

---

## 45. Complete, incomplete, unknown

A missing or non-finite percentage is not automatically 0% or 100%. Tests should preserve the third state: unknown.

---

## 46. Identity collisions

Different chapters can share display_order values when the numbering restarts in each folder. Global routing based only on display order is unsafe.

---

## 47. Test the ambiguity directly

Construct two plausible matches and require an empty or unresolved mapping when no stronger identity is available. This is fail-closed identity resolution.

**Example from the historical source:**

```js
assert.equal(
  playbackCourseRouteMap(ambiguous, outline).size,
  0
);
```

---

## 48. Test that a dangerous action does not occur

Some of the best tests assert no unwanted reload, no wrong-row click, no ambiguous match, and no inappropriate confirmation. Preventing harmful side effects is as important as successful execution.

---

## 49. Multiversity isolation

Pegaso and Mercatorum may have overlapping course codes or identifiers. Storage identity must include platform context to prevent cross-university collisions.

---

## 50. Deliberately construct a collision

Store data for two universities with matching logical IDs in one test, then verify both survive and remain distinct.

---

## 51. Test concurrent writes

Promise.all can start independent storage updates simultaneously. The test checks that serialization does not lose one of the updates.

**Example from the historical source:**

```js
await Promise.all([
  storePegaso(),
  storeMercatorum()
]);
```

---

## 52. Legacy keys

Old unprefixed data can remain valid for legacy Pegaso behavior without being incorrectly interpreted as Mercatorum data.

---

## 53. Migration behavior is a contract

A schema upgrade must define not only the new shape but what old keys mean, how long they remain readable, and what is not allowed to leak into another platform.

---

## 54. Not every test runs the feature

Some tests inspect static source or HTML with regular expressions and ordering assertions. They prove narrow structural properties rather than full behavior.

**Example from the historical source:**

```js
assert.match(
  popupHtmlSource,
  /id="chapterLimitValue" .../
);
```

```js
assert.ok(
  contentSource.indexOf("if (thresholdReached)") <
  contentSource.indexOf("if (sessionLimitReached)")
);
```

---

## 55. What structural tests protect

Source tests are effective for required IDs, manifest declarations, load ordering, and important guard placement. They are inexpensive early warnings.

---

## 56. Source matching is not behavior

Seeing a function name or guard expression in source does not prove the function runs correctly. Structural tests complement but cannot replace behavioral tests.

**Example from the historical source:**

```js
assert.match(
  source,
  /someFunction/
);
```

---

## 57. A particularly valid use

A test verifies menu-ux.js loads before floating-menu.js. That is a genuine architectural ordering contract, so checking the source manifest is appropriate.

**Example from the historical source:**

```js
assert.ok(
  scripts.indexOf("menu-ux.js") <
  scripts.indexOf("floating-menu.js")
);
```

---

## 58. Architecture tests

These verify wiring, dependency order, presence of declared features, and component boundaries. They protect system shape without impersonating an end user.

---

## 59. Generated HTML quiz tests

test-html-notes.mjs constructs a mock quiz job, invokes the export path, captures the Blob, and examines the output it would give a user.

---

## 60. Inspect the generated product

Assert that the saved HTML contains note structures, status data, allowed behavior, and other required content. Checking only an internal builder function would prove less.

---

## 61. Parse the embedded script

The test extracts the generated script and asks the local JavaScript parser to accept it. This catches accidental syntax errors in serialized offline HTML.

**Example from the historical source:**

```html
<script> ... </script>
```

```js
new Function(script);
```

---

## 62. Node is not a browser

A fake DOM cannot faithfully reproduce native focus, Shadow DOM, CSS layout, keyboard navigation, or Chromium rendering. Those contracts require integration tests in a real browser.

---

## 63. Browser integration layer

The v2.35.2 fixture exercises both UI controllers with a shared fake extension store, checking navigation, focus, preference synchronization, scroll, theme, and active operations.

---

## 64. Prefer user-visible E2E contracts

An E2E test that asserts private variable shapes can break on harmless refactors. Verify observable behavior whenever that is the contract being promised.

---

## 65. Contract-oriented E2E

Prefer “the Back button restores focus and the previous scroll position” over “internal homeScroll equals a particular number,” unless that internal value itself is an explicit contract.

---

## 66. The debugger can affect lifecycle

Keeping DevTools open can change the service worker's idle and termination behavior. A lifecycle bug may disappear while inspected.

---

## 67. The consequence

A feature that accidentally relies on a live background global can appear stable during debugging and fail after Chrome terminates the idle worker.

---

## 68. Test termination explicitly

Terminate the worker in a controlled browser test, restart the relevant workflow, and verify state restoration, event listeners, and active-operation coordination.

---

## 69. What is a flaky test?

A flaky test sometimes passes and sometimes fails without relevant source changes. Async timing and browser scheduling are common causes.

---

## 70. Common sources of flakiness

Uncontrolled timers, real network latency, shared persistent storage, animations, unexpected background termination, and unstable DOM readiness can all alter outcomes.

---

## 71. Fake time

Control Date.now, timers, and sleep whenever the property depends on logical order rather than real waiting.

---

## 72. Fake APIs

Inject deterministic success, partial results, rate limits, errors, or cancellations instead of depending on a live endpoint to fail at the right moment.

**Example from the historical source:**

```js
requestLessonWithRetry: async (...) => ({
  ok: true,
  data: ...
});
```

---

## 73. A minimal fake DOM

Create only the nodes, attributes, and events needed by the invariant. Avoid implementing an entire browser in a unit-test helper.

---

## 74. Do not fake away all reality

A perfect fake may conceal the browser quirk that caused the original bug. Combine deterministic tests with browser fixtures and selected manual checks.

---

## 75. The traditional test pyramid

A conventional pyramid has many fast unit tests, fewer integration tests, and a small number of expensive E2E tests.

---

## 76. An LMS extension needs several boundaries

PlumePilot integrates with browser APIs, remote LMS behavior, cross-world messaging, dynamic DOM, and packaged resources. Its test strategy therefore needs contract and artifact tests in addition to pure unit coverage.

---

## 77. Build a test matrix from each bug

For autoplay, axes include chapter identity, completion, visibility, cache freshness, test policy, browser, and DOM lifecycle. Do not try to enumerate every Cartesian combination.

---

## 78. Pairwise thinking

Select combinations likely to expose interactions. For example, a closed accordion combined with an autoplay recovery transition uncovered a real regression.

---

## 79. State-transition coverage

For a state machine, testing only states is not enough. Test transitions such as waiting → recovered, playing → stopped, and cancellation during a pending wait.

---

## 80. Cover guard outcomes

Each critical guard deserves at least a test where it permits an action and one where it rejects the action. Otherwise a skipped branch can hide an unsafe transition.

---

## 81. Line coverage is not behavior coverage

Executing every line does not establish correctness under ambiguous identities, unusual timing, malformed responses, or missing browser capabilities. Ask which property was proven.

---

## 82. Assertions document intent

The message “advance must use the re-rendered lesson row” is a concise statement of the system's contract, even when the test passes.

---

## 83. A regression test tells a story

A meaningful test name describes the scenario and protected result, not just an internal function number. Future maintainers should understand why an odd guard exists.

---

## 84. Use changelog, tests, and source together

The changelog explains when and why a workaround appeared; the test defines the intended invariant; source shows the implementation. Triangulate them before removing old-looking code.

---

## 85. Git bisect as a mental model

If a feature worked on one commit and fails on a later one, binary search over the history narrows when the regression first appeared.

---

## 86. Automated tests strengthen bisect

A command that reliably returns pass or fail can serve as the oracle for git bisect and identify the introducing commit.

**Example from the historical source:**

```bash
node tests/foo.mjs
```

---

## 87. Root cause and contributing factors

Hidden-tab failures may combine throttled timers, incorrect timeout interpretation, and an overly aggressive reload fallback. A useful postmortem distinguishes these factors instead of naming one vague cause.

---

## 88. A technical Five Whys

If routing chose the wrong chapter, ask why display_order was reused, why the route treated it as global identity, and why no ambiguity guard existed. The final question should identify the missing invariant.

---

## 89. Temporary debug logging

Large dumps of DOM nodes can help one session, but may retain objects, pollute output, and expose data. Remove them after diagnosis.

**Example from the historical source:**

```js
console.log(allDOMNodes)
```

---

## 90. Stable diagnostics

Structured events such as operationStarted, candidateRejected, fallbackSelected, or buildFinalized may deserve persistent, opt-in diagnostic support because they describe domain transitions.

---

## 91. Protect privacy during debugging

Extensions handle course data, authentication context, and personal notes. Avoid logging passwords, cookies, raw tokens, or unnecessary user content. Redact and limit diagnostic payloads.

---

## 92. “Failed” is not enough

A helpful error identifies which phase and resource failed, whether the condition might be temporary, and what happens next.

---

## 93. Two audiences

Users need a concise action-oriented message; developers may need operation IDs, response status, retry counts, and safe technical metadata. Do not expose all raw diagnostics to every user.

---

## 94. A fallback must be tested

Any code path that claims to recover from an API or DOM failure should have a test that deliberately triggers that failure and observes the fallback.

---

## 95. Inject an incomplete lesson response

The first-incomplete suite returns an explicit failed or incomplete detail response for one chapter instead of waiting for a live LMS failure.

**Example from the historical source:**

```js
if (args[1] === failedChapter) {
  return {
    ok: false,
    error: "LESSON_DATA_INCOMPLETE"
  };
}
```

---

## 96. Expected fallback result

The result should request visualVerification for the affected candidate and preserve already established search progress, not restart blindly.

**Example from the historical source:**

```js
assert.equal(
  failed.result.visualVerification,
  true
);
```

---

## 97. Cancellation is semantic behavior

Differentiate cancelled by user, network timeout, and ordinary operation failure. Abortion is not merely one more error.

---

## 98. Cancellation latency

A long operation should stop expensive stages promptly after cancellation; EPUB yields and abort checks are part of this contract.

---

## 99. Benchmark versus test

A test asks whether a required property holds; a benchmark asks how long or how much memory a workload consumes. They can inform each other but are not interchangeable.

---

## 100. EPUB fixtures and output

Use representative text, mathematical, visual, and table-heavy PDFs to verify conversion semantics, archive validity, and cancellation.

---
