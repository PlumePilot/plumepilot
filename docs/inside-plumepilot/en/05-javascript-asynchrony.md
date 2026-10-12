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
