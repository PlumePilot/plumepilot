# 05 — JavaScript asynchrony

## Events, Promises, timeouts, and race conditions

So far we have repeatedly encountered code such as:

```js
await requestLessonWithRetry(...);
setTimeout(runCommissionCheck, delay);
chrome.runtime.sendMessage(...);
window.postMessage(...);
new MutationObserver(...);
```

These are not isolated conveniences. They are part of the timing model that makes a modern browser extension work.

A popup requests data and closes; a background operation continues. A video ends while the page rebuilds its DOM. One request completes before an earlier request. A cancellation arrives while another component is waiting.

To understand these cases, we need to move beyond "asynchronous means it happens later." We need to understand **when execution can be interleaved, who owns an operation, and how its eventual result is handled**.

---

# Part I — The first misconception: "JavaScript is single-threaded, so race conditions cannot happen"

## 1. A true statement that can be misleading

On the browser's ordinary JavaScript main thread, an executing synchronous function is not arbitrarily interrupted so another JavaScript callback can run in the same agent. This is called **run-to-completion**.

```js
counter++;
console.log(counter);
```

Another callback cannot spontaneously insert itself between those two synchronous statements.

But this does not mean that an entire `async` function runs without interference. At an `await`, the function may yield control:

```js
const previous = await readState();
await saveState(previous + 1);
```

Another operation can run while the first is suspended. The individual pieces run to completion, but the **logical operation spans multiple pieces**.

---

## 2. Concurrency is not parallelism

### Concurrency

Several operations make progress over an overlapping period, alternating execution and waiting.

### Parallelism

Two or more operations actually execute at the same instant on different processing units or threads.

The browser's main JavaScript thread supports substantial **concurrency without executing two callbacks simultaneously on that same thread**.

```text
JavaScript starts fetch A
JavaScript starts fetch B
browser waits for network operations
user clicks a button
JavaScript handles the click
response B arrives → handle B
response A arrives → handle A
```

A and B overlap in time, even though their JavaScript callbacks are executed separately.

---

# Part II — Call stack and event loop

## 3. The call stack

When JavaScript calls a function, its execution frame is pushed onto the call stack:

```js
function a() {
  b();
}

function b() {
  console.log("hello");
}

a();
```

```text
main
  ↓
a()
  ↓
b()
  ↓
console.log()
```

As each function returns, its frame is removed. Synchronous execution proceeds according to run-to-completion.

---

## 4. But `fetch()` cannot occupy the stack until the network responds

```js
const response = await fetch(url);
```

An HTTP request might take 20 milliseconds, 2 seconds, or much longer. If JavaScript held the main thread blocked during that entire wait, the browser could not normally respond to clicks, scrolling, painting, or other callbacks.

Instead, the browser manages the underlying asynchronous operation; JavaScript resumes when the result is ready and its continuation is scheduled.

This separation is the foundation of the browser's event-driven programming model.

---

## 5. The event loop as scheduler

A simplified mental model:

```text
           ┌───────────────┐
           │ current task  │
           │ + call stack  │
           └──────┬────────┘
                  │ completes
                  ▼
           ┌───────────────┐
           │ microtasks    │
           └──────┬────────┘
                  │ drained
                  ▼
           ┌───────────────┐
           │ rendering may │
           │ occur         │
           └──────┬────────┘
                  ▼
           ┌───────────────┐
           │ next task     │
           └───────────────┘
```

This is deliberately simplified. The browser has multiple task sources and rendering rules, but it is enough to reason about PlumePilot's timers, user events, `postMessage`, Promise continuations, and `MutationObserver` notifications.

---

# Part III — Tasks and microtasks

## 6. Asynchronous work does not all use the same queue

A particularly important distinction is:

```text
task
microtask
```

Timers and ordinary events typically schedule tasks; Promise continuations schedule microtasks; `MutationObserver` callbacks use microtask delivery.

After the current task finishes, pending microtasks are processed before the next task. This explains execution orders that may initially seem surprising.

---

## 7. A minimal example

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => console.log("C"));

console.log("D");
```

The expected output is:

```text
A
D
C
B
```

`A` and `D` are synchronous. The Promise continuation (`C`) is a microtask. The timer callback (`B`) runs in a later task.

> **"Asynchronous" does not mean "random order." Scheduling has specific rules.**

---

## 8. `setTimeout(fn, 0)` does not mean "now"

```js
setTimeout(callback, 0);
```

means approximately "make this callback eligible in a subsequent task, after the current execution finishes," not "run the callback immediately."

PlumePilot uses:

```js
setTimeout(() => {
  const selected = currentLesson();
  if (selected) rememberPlaybackLesson(selected);
}, 0);
```

Source: [`content.js` L7080–L7088](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L7080-L7088).

The intent is to give the current click-handling task a chance to finish before reading the resulting selection. It is a deliberate timing decision, **not a guarantee that every later frontend render has completed**.

---

# Part IV — Promises represent future results

## 9. A Promise is not its eventual value

A Promise may be:

```text
pending
fulfilled
rejected
```

For example:

```js
const promise = fetch(url);
```

`promise` is not yet the HTTP response. It represents an operation whose eventual result will be a response or an error.

---

## 10. Why PlumePilot creates Promises manually

Many modern Web APIs are Promise-based, but several extension APIs used by the project still expose callback-style operations:

```js
chrome.storage.local.get(key, callback);
```

PlumePilot wraps them:

```js
const storageGet = (key) =>
  new Promise((resolve, reject) =>
    chrome.storage.local.get(key, (result) =>
      chrome.runtime.lastError
        ? reject(new Error(chrome.runtime.lastError.message))
        : resolve(result[key] || null)
    )
  );
```

Source: [`background.js` L40–L43](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L40-L43).

Converting callbacks to Promises at an API boundary lets the rest of the application use one asynchronous model. It also separates a successfully delivered result from a runtime failure.

---

# Part V — `async` and `await`

## 11. What `async` really does

An `async` function returns a Promise:

```js
async function example() {
  return 42;
}
```

Calling `example()` yields a Promise fulfilled with `42`, not a bare number. An exception thrown from an async function normally rejects that Promise.

This helps us understand why callers use `await` or `.then()`/`.catch()`.

---

## 12. `await` does not block the browser

```js
const operation = await currentOperation();
```

does not mean "stop all JavaScript until this operation finishes." It means the **current async function** suspends until the awaited value settles.

Other tasks can run, users can interact with the page, cancellation messages can arrive, and operation status updates can be processed.

---

## 13. `await` divides a function into time-separated segments

Consider `acquire()` in the background:

```js
async function acquire(kind, sourceTabId) {
  return serialized(async () => {
    let existing = await currentOperation();
    // ...
    await storageSet({ [OPERATION_KEY]: operation });
    return { accepted: true, operation };
  });
}
```

Source: [`background.js` L620–L641](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L620-L641).

Conceptually:

```text
segment A
    ↓ await currentOperation()
    [suspended]
segment B
    ↓ await storageSet(...)
    [suspended]
segment C
```

Between those segments, another operation may run. We must reason about the invariants that need to remain valid across each suspension.

---

# Part VI — PlumePilot's most instructive race condition

## 14. What could go wrong in `acquire()` without serialization?

Imagine two commands arrive almost simultaneously:

```text
A: start materials export
B: start Turbo Test
```

Both perform:

```js
const existing = await currentOperation();
```

If no operation is active, the possible interleaving is:

```text
A reads: nothing active
B reads: nothing active
A decides it can acquire
B decides it can acquire
A writes its operation
B writes its operation
```

Both may report successful acquisition, violating the intended rule that only one incompatible operation owns the shared resource.

---

## 15. Why single-threaded JavaScript does not save us

No synchronous statement was interrupted halfway through. The race exists **between awaits**.

The logical read–check–write sequence was not atomic:

```text
read state
    ↓
check ownership
    ↓
write new state
```

This is closely analogous to a database read-modify-write operation performed without a transaction or lock.

---

# Part VII — `serialized()`: a Promise queue as a logical lock

## 16. The code

In `background.js`:

```js
function serialized(task) {
  const next = operationQueue.then(task, task);
  operationQueue = next.catch(() => {});
  return next;
}
```

Source: [`background.js` L44–L49](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L44-L49).

This is not an operating-system mutex. It is a **Promise chain**. The project uses separate queues for different responsibilities, including operations, builder coordination, commission monitoring, achievements, and sounds.

---

## 17. How the chain works

Initially:

```js
operationQueue = Promise.resolve();
```

When A arrives:

```js
const nextA = operationQueue.then(A, A);
operationQueue = nextA.catch(() => {});
```

When B arrives before A finishes, B attaches itself to the **new** queue Promise, which represents completion of A:

```text
A starts → A finishes → B starts → B finishes
```

rather than:

```text
A starts ────────────────┐
B starts ────────────────┘
```

This serializes the relevant logical operations.

---

## 18. Why `then(task, task)`?

```js
operationQueue.then(task, task)
```

runs the next task whether the previous queue Promise was fulfilled or rejected. Otherwise a rejected queue could prevent future work.

Also:

```js
operationQueue = next.catch(() => {});
```

keeps the **internal queue chain** usable even after failure. Importantly, the caller still receives `next`, so its own task can still reject.

The error is absorbed for queue continuity, **not hidden from the caller**.

---

## 19. Logical critical section

A **critical section** is a region that accesses shared state and must exclude incompatible interleavings.

For PlumePilot:

```text
currentOperation()
      ↓
validate owner
      ↓
create / update / release operation
```

is a logical critical section. `serialized()` ensures that mutations affecting the same invariant pass through one ordered lane.

---

# Part VIII — One global lock or domain-specific queues?

## 20. Why not put everything in one queue?

PlumePilot does not use a global queue for every activity. It separates responsibilities:

```text
operationQueue
commissionQueue
achievementQueue
soundQueue
```

If two operations do not share an invariant, serializing them together needlessly reduces concurrency.

The right question is not "How do I eliminate all concurrency?" but:

> **Which shared state requires a single total order of updates?**

---

# Part IX — Simple guards: `busy`

## 21. Not every race requires a queue

Autoplay also uses a more local strategy:

```js
if (busy || v !== lastVideo) {
  return;
}

busy = true;

try {
  // asynchronous advance
} finally {
  busy = false;
}
```

Sources: [`content.js` L6665–L6671](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6665-L6671), [L6812–L6815](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6812-L6815).

`busy` prevents multiple `advance()` attempts from overlapping in the same context. This is a **reentrancy guard**.

---

## 22. Reentrancy

A function is reentrant when a new logical invocation may begin before an earlier invocation has finished.

During autoplay, a second signal could arrive while the first attempt is:

```text
waiting for 100%
reopening a chapter
completing a test
locating the next video
```

The `busy` flag establishes the local invariant that one logical advance is in progress at a time.

---

## 23. Why `finally` is essential

This is fragile:

```js
busy = true;
await something();
busy = false;
```

An exception or early return can skip the reset.

Use:

```js
busy = true;
try {
  await something();
} finally {
  busy = false;
}
```

`finally` executes during normal return and error propagation.

> When an operation acquires a temporary resource—lock, flag, timer, controller, lease—identify where it will be released on **every exit path**.

---

# Part X — Every `await` can invalidate assumptions

## 24. The world may change after an `await`

Autoplay does:

```js
let cur = await recoverPlaybackLesson(v);

if (!enabled || v !== lastVideo) return;
```

Why check `enabled` again? Because the user could turn autoplay off during `recoverPlaybackLesson()`, or the player could change.

A condition that was true **before** an `await` is not guaranteed to remain true **after** it.

---

## 25. This pattern appears repeatedly

After waiting for lesson completion, PlumePilot rechecks several invariants:

```js
if (
  !enabled ||
  v !== lastVideo ||
  video() !== v ||
  !stableCur ||
  playbackLessonRow(completedLesson) !== stableCur
) {
  return;
}
```

Source: [`content.js` L6694–L6699](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6694-L6699).

During an asynchronous wait, the user may change preferences, the DOM may be rebuilt, the route may change, or another workflow may modify shared state.

Rechecking is a correctness requirement, not paranoia.

---

## 26. The check → await → re-check pattern

```text
verify precondition
        ↓
await asynchronous work
        ↓
verify invariant again
        ↓
continue only if still valid
```

For example:

```js
if (!enabled) return;

await slowOperation();

if (!enabled) return;
```

This is one of the most useful patterns when working with mutable browser UI and asynchronous state.

---

# Part XI — Wait for conditions, not merely time

## 27. `sleep()`

PlumePilot defines:

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
```

This allows:

```js
await sleep(250);
```

But it answers only "has this much time elapsed?" It does not tell us whether a chapter has opened, a response has arrived, or the DOM is ready.

---

## 28. `waitFor()`

The project instead uses a condition-driven wait:

```js
async function waitFor(fn, timeout = WAIT_MS) {
  let start = Date.now();

  while (Date.now() - start < timeout) {
    const x = fn();
    if (x) return x;
    await sleep(100);
  }

  return null;
}
```

Source: [`content.js` L1577–L1609](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1577-L1609).

The real implementation also handles hidden tabs and a possible additional waiting window.

Here, **time provides the deadline**; the readiness condition determines success.

---

## 29. Asynchronous polling

`waitFor()` is polling:

```text
check → false
    ↓
await 100 ms
    ↓
check → false
    ↓
await 100 ms
    ↓
check → true
    ↓
continue
```

Crucially, `await sleep(100)` does **not block the JavaScript main thread**. Other browser work can proceed.

---

# Part XII — Timers: minimum delay, not a precise appointment

## 30. The commission monitor

`bridge.js` contains:

```js
function scheduleCommissionCheck(delayMs = 0) {
  clearTimeout(commissionCheckTimer);
  commissionCheckTimer = null;
  if (!commissionCheckEnabled || !pageIsVisible()) return;
  commissionCheckTimer = setTimeout(
    runCommissionCheck,
    Math.max(0, Number(delayMs) || 0),
  );
}
```

Source: [`bridge.js` L112–L117](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/bridge.js#L112-L117).

This small function teaches us three things.

---

## 31. First: replace timers instead of accumulating them

Before creating a new timer:

```js
clearTimeout(commissionCheckTimer);
```

The code intends to maintain at most one scheduled future commission check, rather than accumulating duplicates from repeated triggers.

---

## 32. Second: time is not the only precondition

A timer is scheduled only when:

```js
commissionCheckEnabled && pageIsVisible()
```

Scheduling is conditional on the current application state.

---

## 33. Third: `delayMs` is not a guaranteed appointment

`setTimeout(fn, 1000)` does not promise execution **exactly** 1,000 ms later. It establishes a minimum delay before the callback becomes eligible, subject to task scheduling and browser throttling.

This is why PlumePilot uses actual timestamps where elapsed time matters, instead of assuming every callback executes at its requested deadline.

---

# Part XIII — Hidden tabs and browser time

## 34. A browser is not an ideal stopwatch

Browsers may throttle timers and background execution in hidden tabs.

PlumePilot's real `waitFor()` records visibility state such as:

```js
const hiddenEpochAtStart = pageHiddenEpoch;
const startedHidden = documentIsHidden();
```

If a timeout occurs while the page was hidden, the code can allow another waiting window when it becomes visible.

It avoids conflating "the application did not finish" with "the browser did not give the page the usual execution opportunities."

---

# Part XIV — An application timeout is not a sleep

## 35. `turboApiRequest()`

In Chapter 04 we saw the local RPC between `content.js` and the interceptor. Now look at its temporal behavior:

```js
function turboApiRequest(action, payload = {}) {
  return new Promise((resolve) => {
    const requestId = `studywing-${Date.now()}-${++turboApiRequestSequence}`;

    const timeout = setTimeout(() => {
      pendingTurboApiRequests.delete(requestId);
      resolve({ ok: false, error: "RESPONSE_TIMEOUT" });
    }, TURBO_API_RESPONSE_TIMEOUT_MS);

    pendingTurboApiRequests.set(requestId, { resolve, timeout });

    window.postMessage({
      type: TURBO_API_REQUEST,
      requestId,
      action,
      ...payload,
    }, "*");
  });
}
```

Source: [`content.js` L4904–L4923](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4904-L4923).

The timeout does not instruct the caller to wait a fixed period before continuing. It defines an **application deadline**: the maximum permitted wait for a correlated response.

---

## 36. Why a deadline is necessary

The `MAIN` world might not respond because a page changes, its listener disappears, navigation interrupts the workflow, an unexpected error occurs, or a message is lost.

Without a deadline, the pending request map might retain `requestId → resolve` indefinitely and leave callers suspended forever.

With a deadline, the failure becomes explicit:

```js
{ ok: false, error: "RESPONSE_TIMEOUT" }
```

---

# Part XV — Correlation IDs and concurrency

## 37. Why `requestId` matters

Several requests may be in flight:

```text
request A → lesson 1
request B → lesson 2
request C → course outline
```

Responses might arrive:

```text
B
A
C
```

We cannot correlate a response by arrival order alone. The `pendingTurboApiRequests` map tracks the identity of each outstanding call.

---

## 38. Asynchronous request multiplexing

```text
              ┌── request A ──┐
content.js ───┼── request B ──┼──► MAIN world
              └── request C ──┘

              ┌── response B ◄┐
content.js ◄──┼── response A ◄┼── MAIN world
              └── response C ◄┘
```

The explicit request ID separates **logical identity from completion order**. This is a small message-based RPC multiplexer.

---


# Part XVI — Actually cancelling an operation

## 39. A Promise is not magically cancellable

Given:

```js
const p = fetch(url);
```

there is no universal "cancel this Promise" operation. A Promise represents an eventual result. To stop work, we must cancel the **underlying operation** when supported.

For network requests, browsers provide `AbortController`.

---

## 40. `AbortController` in PlumePilot's API integration

The interceptor uses a controller and passes its signal to Fetch:

```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

try {
  const response = await originalFetch.call(window, url, {
    ...options,
    signal: controller.signal,
  });
  // ...
} finally {
  clearTimeout(timeout);
  turboControllers.delete(message.requestId);
}
```

Source: [`commission-interceptor.js` L500–L529](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L500-L529).

```text
our decision: cancel
        ↓
AbortSignal
        ↓
underlying fetch operation
```

---

## 41. Building a timeout on top of cancellation

Notice:

```js
setTimeout(() => controller.abort(), API_TIMEOUT_MS);
```

The timer does not merely reject an unrelated wrapper Promise; it triggers cancellation of the network operation itself.

```text
request starts
    ↓
deadline timer starts
    ↓
request finishes first?
    ├── yes → clearTimeout()
    └── no  → abort()
                ↓
             fetch rejects
```

This reduces the risk of leaving a real network operation running after the caller has declared it timed out.

---

# Part XVII — Collective cancellation

## 42. `turboControllers`

The interceptor tracks active controllers:

```js
turboControllers.set(message.requestId, controller);
```

When it receives:

```text
STUDYWING_TURBO_API_CANCEL
```

it can abort them:

```js
for (const controller of turboControllers.values()) {
  controller.abort();
}
```

Source: [`commission-interceptor.js` L792–L795](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L792-L795).

The map is more than request bookkeeping: it is a registry of **in-flight cancellable operations**.

---

# Part XVIII — Cooperative cancellation

## 43. Not everything accepts an `AbortSignal`

A course export can consist of many separate steps:

```text
open section
wait for rendering
read chapter
request API data
wait for pacing
open next chapter
...
```

There may be no single native browser API capable of cancelling the entire workflow.

Here we need **cooperative cancellation**.

---

## 44. `ensureExportNotCancelled()`

PlumePilot periodically checks:

```js
function ensureExportNotCancelled(operationId) {
  if (
    exportCancelRequested &&
    operationId &&
    operationId === activeExportOperationId
  ) {
    throw exportAbortError();
  }
}
```

Source: [`content.js` L1611–L1625](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1611-L1625).

The workflow follows an implicit contract: "Between steps, I will check whether I should stop."

---

## 45. Even `sleep` becomes cancellable

A plain:

```js
await sleep(3000);
```

would not respond to cancellation until the three seconds elapsed.

PlumePilot therefore breaks long delays into short cooperative intervals:

```js
async function exportSleep(ms, operationId) {
  const end = Date.now() + ms;

  while (Date.now() < end) {
    ensureExportNotCancelled(operationId);
    await sleep(Math.min(100, end - Date.now()));
  }

  ensureExportNotCancelled(operationId);
}
```

Source: [`content.js` L1627–L1634](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1627-L1634).

The delay itself remains useful, but now it periodically yields the opportunity to stop.

---

## 46. Cancellation responsiveness

This design provides a measurable property: during such a delay, the theoretical polling contribution to cancellation latency is approximately **100 milliseconds**, rather than the full delay.

It is not merely a technical detail. A "Cancel" button that responds ten seconds later feels broken even when the operation eventually stops.

---

# Part XIX — `AbortController` in the EPUB builder

## 47. Another kind of cancellation

The builder creates a controller for EPUB generation:

```js
buildController = format === "epub"
  ? new AbortController()
  : null;
```

Its signal is passed into:

```js
buildCourseEpub(..., {
  signal: buildController.signal,
});
```

The cancellation control then aborts the controller as needed.

Sources: [`materials-builder.js` L134–L175](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/materials-builder.js#L134-L175), [L179–L185](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/materials-builder.js#L179-L185).

This shows how the same cancellation concept can be applied to document generation, not just network requests.

---

# Part XX — `try` / `catch` / `finally` in long-running workflows

## 48. The builder as a complete example

The builder follows a robust lifecycle:

```text
acquire
   ↓
try
   build
   download
catch
   show error or cancellation
finally
   release
   clean up controller
   restore UI
```

The `finally` block is particularly important: it contains work that must happen whether the build succeeds, fails, or is cancelled.

---

## 49. Failure and cancellation are not the same outcome

The builder distinguishes an abort:

```js
const cancelled = error?.name === "AbortError";
```

from other failures.

```text
failure      = something did not work as expected
cancellation = the user intentionally requested a stop
```

Both may interrupt the normal flow via exceptions, but they have different meanings for messages shown to users and for subsequent recovery.

---

# Part XXI — Error propagation with Promises

## 50. `throw` inside an async function

Inside an `async` function:

```js
throw new Error("x");
```

rejects the returned Promise.

Thus:

```js
await functionThatFails();
```

will propagate the rejection as an exception at the `await` point, where it can be handled using `try`/`catch`.

This keeps asynchronous workflow code structurally close to familiar synchronous error handling.

---

## 51. `action.then(sendResponse).catch(...)`

The background dispatcher ends with a pattern like:

```js
action
  .then(sendResponse)
  .catch((error) => {
    console.error(...);
    sendResponse({ accepted: false, reason: error.message });
  });

return true;
```

Source: [`background.js` L918–L945](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L918-L945).

It turns:

```text
fulfilled Promise → successful protocol response
rejected Promise  → application error response
```

The messaging boundary is also an **error boundary**.

---

# Part XXII — Why `return true` is also about asynchrony

## 52. The listener may return before the response

A WebExtension listener is invoked synchronously when a message arrives, but its work may involve storage, networking, sending a tab message, or creating a builder page.

`sendResponse()` may therefore run later.

In the callback-style protocol used here, `return true` tells the runtime to keep the response channel available for asynchronous completion.

We studied the protocol in Chapter 02; now we understand the event-loop reason behind it.

---

# Part XXIII — Controlled fire-and-forget

## 53. Not everything needs to be awaited

In `content.js`:

```js
void collectCourseMaterials(format, operationId).finally(() => {
  log("Export collection request finished.", { operationId, format });
});
```

The message handler acknowledges that collection has started; it does not await the full export. This is appropriate because the longer workflow has its own status and completion protocol.

---

## 54. Accepted command does not equal completed operation

For a backend job:

```text
POST /job → 202 Accepted
```

For PlumePilot:

```text
PEGASO_COLLECT_COURSE_MATERIALS
    → accepted: true
```

Both communicate "the request was accepted," not "the job has finished."

Later status and terminal events represent progress and completion.

---

# Part XXIV — Fire-and-forget still requires error handling

## 55. The risk of `void somePromise()`

A bare:

```js
void doSomethingAsync();
```

may leave rejected Promises unobserved. Whenever a caller deliberately does not await work, the system must still answer:

```text
Who observes failure?
Who cleans up the state?
Who notifies the user?
```

In PlumePilot's export workflow, the long-running function itself publishes status/failure events and performs cleanup. Omitting `await` in the caller does **not** mean failure may be ignored.

---

# Part XXV — `Promise.allSettled()`

## 56. When every outcome matters, including failures

To clear commission memory across tabs, the background can contact all relevant tabs:

```js
const results = await Promise.allSettled(
  tabs
    .filter((tab) => Number.isInteger(tab?.id))
    .map((tab) =>
      sendTabMessage(tab.id, {
        type: "PEGASO_CLEAR_COMMISSION_MEMORY",
      })
    ),
);
```

Source: [`background.js` L684–L698](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L684-L698).

Why `allSettled()` rather than `all()`?

---

## 57. `Promise.all()` is fail-fast

```js
await Promise.all([A, B, C]);
```

If B rejects, the aggregate Promise rejects. This is useful when all results are required for overall success, though the other operations are not automatically cancelled.

But tabs are independent. One may have just closed. We still want to process the others.

---

## 58. `Promise.allSettled()` retains every outcome

The result contains entries such as:

```js
{ status: "fulfilled", value: ... }
```

or:

```js
{ status: "rejected", reason: ... }
```

The background can count successful and failed deliveries without abandoning the overall attempt when one tab fails.

---

# Part XXVI — Parallelize or serialize?

## 59. Opposite tools can both be correct

```text
serialized()       → force an order
Promise.allSettled → allow concurrent independent operations
```

### Serialize when

Operations modify shared state, ordering matters, read-modify-write must be protected, or two workflows are mutually incompatible.

### Run concurrently when

Operations are independent, one failure should not stop the others, or parallelism offers genuine benefit without violating invariants.

The correct choice follows **domain semantics**, not a blanket preference for one style.

---

# Part XXVII — Backpressure and pacing

## 60. We could start a hundred requests. Should we?

Chapter 04 introduced pacing:

```js
await exportSleep(API_MATERIAL_PACING_MS, operationId);
```

This intentionally limits the rate of requests.

A large burst might increase load, complicate cancellation, amplify transient errors, or produce memory spikes. Maximum concurrency is not automatically maximum reliability.

Pacing is a simple form of **backpressure**: keeping the producer from overwhelming the system it depends on.

---

# Part XXVIII — `finally` and temporal cleanup

## 61. Timers and controllers need defined lifetimes

In `executeTurboApiRequest()`:

```js
finally {
  clearTimeout(timeout);
  turboControllers.delete(message.requestId);
}
```

This ensures that on success, HTTP failure, invalid JSON, abort, or unexpected exception, temporary resources do not remain registered indefinitely.

Read `finally` as: **restore the workflow's temporary invariants**.

---

# Part XXIX — Resource lifetime

## 62. Every asynchronous operation owns resources

Not just memory buffers or files:

```text
timers
listeners
AbortControllers
Map entries
operation IDs
busy flags
leases
builder tabs
storage jobs
```

Each has a lifetime. Ask:

```text
Who creates it?
Who owns it?
When is it destroyed?
What happens if the workflow fails halfway through?
```

This perspective is especially useful when debugging "stuck" state.

---

# Part XXX — Lost wakeups and startup ordering

## 63. An event may arrive before anyone listens

As in Chapter 02:

```text
bridge publishes autoplay state
          ↓
content.js has not registered listener
          ↓
event lost
```

This is a timing bug, not a syntax error.

PlumePilot solves it by explicitly asking for current state after subscribing:

```js
window.postMessage({
  type: "PEGASO_AUTONEXT_STATE_REQUEST",
}, "*");
```

Source: [`content.js` L557–L559](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L557-L559).

A state snapshot plus future events is more reliable than assuming every initial event will arrive.

---

# Part XXXI — Race between DOM and workflow

## 64. The DOM can change during `await`

The previous chapter introduced stale references. Now we can explain their timing.

Autoplay stores:

```js
const completedLesson = playbackContext;
```

then waits:

```js
const completed = await waitForLessonCompletion(cur, v);
```

During that wait, the sidebar may be rebuilt or closed. Therefore the code re-resolves the lesson afterward rather than blindly trusting `cur`.

**Asynchrony explains why DOM references become stale.**

---

# Part XXXII — A home-built condition variable

## 65. `waitFor()` as synchronization with an external system

Concurrency theory has primitives such as condition variables, semaphores, futures, and channels.

When PlumePilot has no reliable event from the host UI, `waitFor()` serves a conceptually similar purpose:

```text
do not proceed until an observable condition becomes true
```

It is implemented by polling, not a native runtime condition variable, but the synchronization idea is related.

---

# Part XXXIII — Avoid magic sleeps

## 66. Two kinds of waiting

### Semantic waiting

```js
await waitFor(() => chapterIsOpen());
```

This says: "Continue when the chapter is open."

### Deliberate temporal waiting

```js
await sleep(LESSON_CLOSE_DELAY_MS);
```

This says: "Allow a known settling interval before continuing."

Both can be justified. The important point is knowing **why** the wait exists.

---

## 67. The delay after 100%

`waitForLessonCompletion()` includes:

```js
await sleep(LESSON_CLOSE_DELAY_MS);
```

after the sidebar reaches 100%.

Source: [`content.js` L1380–L1388](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1380-L1388).

The visible progress can reach 100% before the host application has fully released the lesson/player session. The short extra delay accounts for **temporal eventual consistency** between different parts of the host.

---

# Part XXXIV — Scheduling is also UX design

## 68. Asynchronous timing shapes the experience

Choosing:

```text
retry after 350 ms
poll every 100 ms
pace requests by 150 ms
check commission periodically
check for cancellation every 100 ms
```

defines responsiveness, traffic, load, tolerance of platform delays, and what the user perceives.

These are product decisions as well as technical decisions.

---

# Part XXXV — Race condition does not mean "random bug"

## 69. Why races appear random

```text
fast network       → works
slow network       → fails
DevTools open       → different timing
visible tab         → works
background tab      → fails
```

The behavior can look unpredictable because interleaving depends on timing. The cause is real and explainable; it is simply temporal.

---

## 70. How to spot a potential race

Useful questions:

```text
Does this function contain await?
Does it read state before await and reuse it afterward?
Can another caller modify that state?
Can a callback arrive twice?
Can two different UIs start the same workflow?
Is an older timer still active?
Can the DOM be rebuilt while we wait?
```

These questions are often more useful than adding random logging.

---

# Part XXXVI — Race prevention strategies in PlumePilot

## 71. There is no universal fix

The project employs several complementary strategies:

| Strategy | Purpose |
|---|---|
| Serialized Promise queue | Order changes to shared state |
| `busy` flag | Prevent local reentrancy |
| `operationId` | Correlate ownership and workflow |
| `requestId` | Match replies to requests |
| Deduplication sets | Suppress repeated messages |
| `AbortController` | Cancel supported in-flight work |
| Re-check after `await` | Validate assumptions again |
| Fresh DOM resolution | Avoid stale element references |
| Timeout | Bound how long a caller waits |

"Race condition" names a class of problems; the right remedy depends on the **shared state and its protocol**.

---

# Part XXXVII — Serialization is not idempotency

## 72. Two frequently confused ideas

**Serialization** means operations run in an enforced order:

```text
A → B → C
```

**Idempotency** means executing an operation more than once does not cause unintended additional effects.

A queue does not make an operation idempotent. An idempotent operation may still need serialization when it interacts with other shared state.

PlumePilot uses both concepts.

---

# Part XXXVIII — A Promise is a state machine

## 73. Promises have a small lifecycle

```text
           ┌── fulfilled
pending ───┤
           └── rejected
```

A settled Promise does not return to pending. Its outcome is final.

An outer workflow may have many more phases:

```text
collecting
stopping
building
completed
failed
```

But each Promise represents one future result with one terminal outcome.

---

# Part XXXIX — Errors as values or rejections

## 74. Two styles in the project

Some operations signal failure through exceptions:

```js
throw new Error(...);
```

Others return an application-level result:

```js
{ ok: false, error: "RESPONSE_TIMEOUT" }
```

A mini-RPC may benefit from a consistent result envelope. An internal workflow may prefer exception propagation to a central `catch` block.

Neither style is universally wrong. The important thing is that each boundary has **clear failure semantics**.

---

# Part XL — Timeout, retry, cancellation, and pacing are different

## 75. Timeout

A timeout says:

> "After this deadline I will not wait any longer."

It does not automatically stop underlying work unless cancellation is connected to it.

## 76. Retry

A retry says:

> "I will attempt the operation again."

It should be governed by whether repeating the operation is safe and useful.

## 77. Cancellation

Cancellation says:

> "This workflow should stop because the operation is no longer wanted."

It may involve abort signals or cooperative checks.

## 78. Pacing

Pacing says:

> "This work is valid, but I do not want to start the next request too quickly."

All four involve time. They solve different problems, and confusing them produces hard-to-reason-about code.

---

# Part XLI — The builder and double clicks

## 79. `building` as a local UI guard

In `materials-builder.js`:

```js
async function build(format) {
  if (building || !job) return;
  setBusy(true);
  // ...
}
```

Source: [`materials-builder.js` L134–L136](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/materials-builder.js#L134-L136).

This prevents a double click or nearly simultaneous PDF/EPUB actions from starting duplicate local builds.

The system also has broader operation protection through `acquire(format)`.

---

# Part XLII — Defence in depth against concurrency

## 80. Two guards are not necessarily redundant

The UI guard provides immediate local feedback and stops duplicate actions in the builder.

The operation manager protects the global invariant even if a command arrives from the popup, floating menu, builder, or another tab.

They protect different scopes. This is **defence in depth** applied to concurrency.

---

# Part XLIII — What if a tab disappears?

## 81. Async ownership can become orphaned

An operation can outlive the tab that started it. The background checks whether the owner still exists:

```js
if (await tabExists(ownerTabId)) {
  return ...;
}

await removeOperation(operation);
```

Source: [`background.js` L604–L618](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/background.js#L604-L618).

Otherwise a global lock could remain occupied forever after its owner has disappeared.

---

# Part XLIV — Safety and liveness

## 82. Two useful correctness properties

### Safety

Something bad must **never happen**.

Example: two globally incompatible exports must not run simultaneously.

### Liveness

Something good must **eventually remain possible**.

Example: closing the owning tab must not leave the operation lock permanently held.

Queues and locks primarily protect safety. Orphan-owner cleanup helps preserve liveness.

These concepts from concurrent and distributed systems are surprisingly practical for browser extensions.

---

# Part XLV — Common temporal bug categories

## 83. Stale read

```text
read state → await → use old state as if still current
```

## 84. Double start

```text
two triggers start the same logical workflow
```

## 85. Lost response

```text
request starts → listener/context disappears → Promise remains pending
```

## 86. Duplicate timer

```text
new timer is scheduled without clearing the previous timer
```

## 87. Orphan lock

```text
owner disappears → shared state remains occupied
```

## 88. Late response

```text
response arrives correctly
but belongs to an application state that is no longer current
```

These categories are excellent labels to use when debugging.

---

# Part XLVI — Debugging asynchronous behavior

## 89. Log identity, not just messages

A log saying:

```text
request completed
```

is rarely enough. Include:

```text
requestId
operationId
courseCode
sourceTabId
phase
timestamp
```

These details help reconstruct **which event belongs to which operation and when it happened**.

---
