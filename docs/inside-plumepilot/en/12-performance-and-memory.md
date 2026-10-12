# 12 — Performance and memory

## When the browser becomes our runtime

> **Reference snapshot for this chapter**  
> This chapter uses the **v2.35.2 UI/UX candidate**, branch `feat/ui-ux-2.35.2`, commit `4d32a8c2a6cd291e4fe389bdf10fdbaf1856a8c2`. Its manifest still displays `2.35.1` because the version bump belonged to the final release preparation.

Earlier chapters introduced DOM scans, network calls, polling, caches, retries, PDF exports, canvas rendering, ZIP compression, MutationObservers, and long-running batch operations. Examined separately, each looks like a local implementation detail. Together they reveal a larger issue: **the browser must run JavaScript while also handling DOM/layout, rendering, input, network I/O, image decoding, caches, and multiple extension contexts**.

Saying *"PlumePilot is slow"* is therefore not a useful diagnosis by itself. We need to ask which resource is constrained, whether work is redundant, and whether the user interface remains responsive. This chapter studies **resource budgets, measurement, working-set design, and correctness-preserving optimization**, rather than collecting isolated micro-optimizations.

---

# Part I — Performance is resource budgeting

## 1. Four different budgets

For PlumePilot it helps to separate **CPU**, **I/O**, **memory**, and **responsiveness**. CPU covers computation such as DOM processing, image analysis, JSON parsing, hashing, and compression. I/O is time spent waiting for HTTP requests, downloads, and other external services. Memory measures how many objects and binary buffers coexist. Responsiveness measures how long the main thread is unavailable to handle input, paint, or animate. These budgets interact but cannot be treated as interchangeable: speeding up one may increase the cost of another. **Optimizing starts with identifying the resource we want to protect.**

---

## 2. Wall time, CPU time, and perceived latency

A 20-second export might spend almost all that time waiting on a network, or spend nearly all of it computing and blocking the browser. Both have similar **wall time**, but require very different fixes. A third dimension is **perceived latency**: a 20-second task with honest progress updates and a working Cancel button may feel more manageable than a 12-second task that freezes the interface. The right evaluation is not only "How long did it take?" but also "How did the browser behave during the wait?"

---

# Part II — Measure before optimizing

## 3. `performance.now()` and the monotonic clock

`epub-core.mjs` records `startedAt = performance.now()` and later assigns `diagnostics.elapsedMs = performance.now() - startedAt`. This is preferable to subtracting `Date.now()` values for duration measurements because the Performance API provides a monotonic time origin designed for elapsed intervals. Use a wall-clock timestamp to record *when* an operation occurred, but a monotonic timer to measure *how long* it lasted. Historical references remain attached to the examples below.

**Examples from the historical implementation:**

```js
const startedAt = performance.now();
```

```js
diagnostics.elapsedMs = performance.now() - startedAt;
```

```js
Date.now()
```

**Historical reference:** `epub-core.mjs:1842`; `epub-core.mjs:2119–2121`

---

## 4. Measure the right system

The repository contains EPUB benchmarks, but their own comments explicitly limit the conclusions that can be drawn. A Node renderer benchmark is **not a browser memory measurement**. A Chromium converter run over HTTP is **not an installed-extension integration test or a full process-memory benchmark**. Their timings still have value; they simply answer different questions. Node, Chromium, PDF.js workers, canvas implementations, and extension contexts may account for memory differently. A benchmark must say what it measures—and what it does not.

**Examples from the historical implementation:**

```js
// Supplementary renderer benchmark. These timings are NOT browser measurements.
```

```js
scope:
  "Chromium converter over HTTP; not an installed-extension integration or process-memory test"
```

**Historical reference:** `scripts/benchmark-epub-node.mjs:1`; `scripts/benchmark-epub-regions.mjs:95–101`

---

## 5. Benchmarking versus profiling

**Benchmarking** measures an observable result under a defined workload: time, size, number of requests, pages processed, or throughput. **Profiling** investigates where those resources are consumed: JavaScript stacks, layout work, rendering, allocations, and retained objects. A benchmark may show that v2.35.2 is slower than v2.35.1; a profiler helps explain whether the difference comes from DOM scans, images, decompression, or another stage. Use both: first establish the regression, then diagnose its cause.

---

## 6. Useful PlumePilot metrics

Examples include total export time, per-page conversion time, output bytes, network request count, cache hits and misses, number of visual versus text pages, peak memory, observer callback count, UI long tasks, and cancellation latency. These metrics need not all appear in the product. Many belong in dedicated benchmarks or diagnostics. The important point is to associate each potential regression with a measurable behavior we intend to preserve.

---

# Part III — Big-O is not enough

## 7. Two `O(N)` algorithms can cost radically different amounts

Chapter 08 compared a full chapter scan against master-index-first discovery. Both can process a list of `N` chapters and remain formally `O(N)`. But an in-memory scan costs very little compared with opening 50 chapters, triggering LMS rendering, and issuing 50 requests. A more useful practical model distinguishes **number of DOM openings**, **network detail requests**, and **synchronization waits**. Cutting expensive calls from 50 to 5 can be a major improvement without changing asymptotic complexity at all.

---

## 8. Optimize the search space

`findNextPlaybackTargetViaApi()` builds `discoveryOrder` and uses master percentages to move suspected incomplete chapters into the first pass, retaining the others for later verification. This is **cost-based optimization**: prioritize the checks most likely to find the target, because each detailed check has an I/O cost. The array manipulation is not magically sublinear; it changes how many expensive operations are likely to be needed before the answer is found.

**Examples from the historical implementation:**

```js
findNextPlaybackTargetViaApi(...)
```

```js
const suspectedIncomplete = (index) => {
  const route = routeByLessonNumber.get(outline[index].lessonNumber);
  return !route || Number(route.percentage) < 100;
};

discoveryOrder = [
  ...discoveryOrder.filter(suspectedIncomplete),
  ...discoveryOrder.filter((index) => !suspectedIncomplete(index)),
];
```

**Historical reference:** `content.js:5896–5911`

---

## 9. Skip work already justified by evidence

In the non-bookmark, non-forward-video path, the code may skip a chapter when the indexed summary reports 100%. Here the master index does not have to provide every activity detail. It answers the less expensive question: *Can we safely avoid a detailed check for this stage of the workflow?* Importantly, this context-specific shortcut is distinct from the more thorough first-incomplete bookmark search, which can make a second pass when summaries appear unreliable.

**Examples from the historical implementation:**

```js
if (
  !options.bookmarkSearch &&
  !options.forwardVideoSearch &&
  indexedChapter &&
  Number(indexedChapter.percentage) >= 100
) {
  continue;
}
```

**Historical reference:** `content.js:5947–5953`

---

# Part IV — DOM: the hidden cost

## 10. `querySelectorAll()` is not free

`content.js` performs searches such as `document.querySelectorAll("video").forEach(attach)`. The expense depends on the subtree size, selector complexity, invocation frequency, work done per result, and interactions with style and layout. An occasional query may be negligible. The same global query repeated after every change in a busy page can become a **hot path**. Before optimizing selectors, measure how often the code actually runs and what dominates that time.

**Examples from the historical implementation:**

```js
document.querySelectorAll("video").forEach(attach);
```

---

## 11. The global autoplay `MutationObserver`

The code observes `document.documentElement` with `childList: true` and `subtree: true`. Whenever `scan()` runs, it can rediscover video elements and inspect the active lesson. This is robust against the LMS's unknown internal framework, but may also repeat scans after unrelated changes. It is a **candidate hotspot**, not proof of an actual problem. First profile; only then consider narrower observation, scheduling, or coalescing if the measurements justify it.

**Examples from the historical implementation:**

```js
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

```js
document.querySelectorAll("video").forEach(attach);
const activeRow = currentLesson();
...
```

**Historical reference:** `content.js:7076–7079`; `content.js:7066–7074`

---

## 12. Use observers as invalidation signals

A productive mental model is not "every mutation requires an immediate full rescan." A mutation can instead signal that **previous knowledge might be invalid**; the app can then schedule an appropriate check. This permits techniques such as narrowing observed regions, suppressing redundant work, or combining multiple notifications into one scheduled action. PlumePilot uses related scheduling patterns elsewhere, though not every observer currently implements the same optimization.

---

## 13. Coalescing

A page framework might generate thirty DOM mutations while rendering one visual update. Thirty callbacks need not imply thirty full `scan()` executions. **Coalescing** combines related notifications into fewer meaningful units of work—sometimes one scan in a timer or the next animation frame. PlumePilot already uses `schedule...()` helpers in various places. Whether the global observer should use additional coalescing is a measurement question, not a foregone conclusion.

**Examples from the historical implementation:**

```js
scan();
```

---

## 14. Layout reads

Calls such as `element.getBoundingClientRect()` can require current geometry, making them different from reading an ordinary JavaScript property. PlumePilot uses layout information to determine which video is visible, whether an element is rendered, where the floating launcher sits, and how to scroll. The risk grows when code repeatedly interleaves **DOM writes → layout reads → DOM writes**, potentially forcing several layout updates. Where practical, group reads and writes rather than alternating them unnecessarily.

**Examples from the historical implementation:**

```js
element.getBoundingClientRect()
```

---

# Part V — Network: faster is not always more parallel

## 15. The false instinct: `Promise.all()` everywhere

Loading 40 chapters simultaneously looks like an obvious speedup, but it can create dozens of concurrent requests, active Promises, decoded responses, and intermediate buffers. Wall time may decrease while peak memory, server load, and rate-limit risk rise. The LMS is an external service we do not control. PlumePilot therefore often prefers conservative sequencing over unbounded fan-out. Concurrency should be an explicit resource decision.

**Examples from the historical implementation:**

```js
await Promise.all(chapters.map(loadChapter));
```

---

## 16. Pacing as backpressure

The implementation declares `API_MATERIAL_PACING_MS = 150` and `TURBO_API_PACING_MS = 350`. Material collection pauses between ordinary requests using `exportSleep(API_MATERIAL_PACING_MS, operationId)`. This is **application-level backpressure**: do not saturate the producer or the host platform merely because the next request is technically possible. It reduces bursts and may make long workflows more predictable.

**Examples from the historical implementation:**

```js
const API_MATERIAL_PACING_MS = 150;
const TURBO_API_PACING_MS = 350;
```

```js
if (index + 1 < outline.length) {
  await exportSleep(API_MATERIAL_PACING_MS, operationId);
}
```

**Historical reference:** `content.js:60–61`; `content.js:3172–3175`

---

## 17. Why pacing can improve the system even when it adds delays

Adding 150 ms between requests raises a minimal per-request interval, but can reduce retries, temporary overload, rate-limit responses, UI contention, and unpredictable recovery. Maximum theoretical throughput is not necessarily the maximum **reliable** throughput. A slightly slower but stable pipeline may complete more successfully and impose less disruptive load on the browser and the LMS.

---

## 18. Retry is not throughput control

`COURSE_INDEX_RETRY_DELAYS_MS` and `API_LESSON_RETRY_DELAYS_MS` represent delays after failures. By contrast, pacing regulates normal successful work. Combining the two into one vague "sleep after request" abstraction would blur their purposes. **Retry** attempts recovery from transient failure; **pacing** controls normal request rate. They need separate policies and diagnostics.

**Examples from the historical implementation:**

```js
const COURSE_INDEX_RETRY_DELAYS_MS = [350, 750];
const API_LESSON_RETRY_DELAYS_MS = [750, 1500];
```

**Historical reference:** `content.js:62–63`

---

## 19. Request deduplication

The quiz builder's `imageCache` stores the **Promise for an in-flight request**, not merely a completed image. If two consumers ask for the same URL simultaneously, both receive the same pending Promise. That prevents redundant network work, decoding, and memory allocation. It is often called **in-flight deduplication** and can be more effective than caching only completed responses.

**Examples from the historical implementation:**

```js
const imageCache = new Map();
```

```js
if (imageCache.has(url)) return imageCache.get(url);
```

**Historical reference:** `test-builder.js:16`

---

## 20. A cache hit eliminates work

In an API pipeline, a cache hit can eliminate a network round trip, response parsing, waiting, a re-render, and retry risk. It may improve CPU, network, and responsiveness together. The cost moves toward retaining data in memory. As Chapter 06 explained, a cache is useful only when its identity, freshness, lifetime, and invalidation policy make the saved work worthwhile.

---

# Part VI — Bounded memory

## 21. An unbounded cache promises growth

The MAIN-world interceptor keeps `pageLessonSnapshots` in a `Map`, but limits it to 50 entries. On overflow it removes the earliest retained key. Without such a bound, a long-lived page visiting many lesson identities could keep accumulating snapshots. **Bounded growth** is an architectural invariant: the program has a reason to release old state even if the browser page never reloads.

**Examples from the historical implementation:**

```js
const pageLessonSnapshots = new Map();
```

```js
if (pageLessonSnapshots.size > 50) {
  pageLessonSnapshots.delete(pageLessonSnapshots.keys().next().value);
}
```

**Historical reference:** `commission-interceptor.js:414–415`

---

## 22. FIFO-ish, not LRU

A JavaScript `Map` preserves insertion order. Removing `map.keys().next().value` evicts the earliest retained entry, which is approximately **FIFO**, not true **LRU**. Merely reading an item does not update its insertion position. A proper LRU would require additional operations to record recency. FIFO-ish eviction is acceptable when its simplicity suits the workload and no evidence demands a more sophisticated policy.

**Examples from the historical implementation:**

```js
map.keys().next().value
```

---

## 23. Boundedness as an invariant

Even a lookup that is very efficient per item can be hazardous if its data structure grows without limit. Asking whether `Map.get()` is fast is incomplete; we also need to ask **how many entries can remain live and when will they be removed?** Both the per-operation cost and the maximum retained working set matter.

---

# Part VII — EPUB: a practical memory laboratory

## 24. Working set

Chapter 09 followed EPUB's many intermediate representations. During conversion, PDF bytes, parsed PDF structures, text items, a canvas, image buffers, encoded assets, ZIP entries, and the eventual archive may overlap. The **working set** is the subset of these resources needed simultaneously at a particular stage. The memory question is not only the size of the eventual EPUB but how many representations must coexist before old ones can be released.

---

## 25. Peak memory

**Peak memory** is the maximum live memory observed during an operation. Two converters producing an identical 40 MB EPUB might require very different peaks. A smaller output file does **not** prove a smaller peak memory footprint. This is why changelog measurements must distinguish artifact size, environment, workload, and actual runtime memory measurements rather than conflating them.

**Historical reference:** `CHANGELOG.md:9`

---

## 26. Canvas pixels are uncompressed

A PNG file of 800 KiB can come from a canvas holding millions of uncompressed pixels. A conventional 8-bit RGBA buffer needs about four bytes per pixel. PlumePilot caps visual rendering with `VISUAL_MAX_PIXELS = 5000000` and `VISUAL_MAX_DIMENSION = 8192`. Five million RGBA pixels already imply about 20 MB (approximately 19.1 MiB) for one pixel buffer alone, before PDF.js objects, temporary `ImageData`, encoded images, or other canvases.

**Examples from the historical implementation:**

```js
const VISUAL_MAX_PIXELS = 5000000;
const VISUAL_MAX_DIMENSION = 8192;
```

**Historical reference:** `epub-core.mjs:22–23`

---

## 27. Limit scale before allocating

`visualRenderScale()` constrains the requested scale by target width, maximum pixel count, maximum dimension, and page geometry. This is more effective than rendering a giant bitmap and shrinking it afterward. It is a kind of **admission control** on allocation: select a safe workload **before** asking the browser to reserve large pixel buffers.

**Examples from the historical implementation:**

```js
function visualRenderScale(viewport, renderWidth = VISUAL_RENDER_WIDTH) {
  return Math.min(
    renderWidth / viewport.width,
    Math.sqrt(VISUAL_MAX_PIXELS / (viewport.width * viewport.height)),
    VISUAL_MAX_DIMENSION / Math.max(viewport.width, viewport.height),
  );
}
```

**Historical reference:** `epub-core.mjs:1101–1107`

---

## 28. `getImageData()` creates more work and more data

Regional conversion reads pixel data through `context.getImageData(...)`. The returned `ImageData` represents pixels from the requested region, which costs CPU and memory beyond the canvas backing store. PlumePilot can operate on individual **bands** rather than allocating an extra full-page pixel representation every time. Region granularity is part of the memory strategy.

**Examples from the historical implementation:**

```js
const pixels = context.getImageData(
  0,
  band.start,
  canvas.width,
  band.end - band.start,
).data;
```

**Historical reference:** `epub-core.mjs:1453–1461`

---

## 29. A local cache for `rowInk`

Regional classification defines a `rowInkCache` typed array and a `cachedRowInk(y)` helper. Calculating the ink occupancy of one row requires reading pixels; the algorithm may consult that same row while detecting edges, planning regions, or deciding boundaries. A small in-memory integer cache replaces repeated expensive pixel reads. This is a deliberate trade: a tiny predictable amount of memory to avoid substantial repeated work.

**Examples from the historical implementation:**

```js
const rowInkCache = new Int32Array(canvas.height).fill(-1);
const cachedRowInk = (y) => {
  if (rowInkCache[y] < 0)
    rowInkCache[y] = rowInk(context, y, 0, canvas.width);
  return rowInkCache[y];
};
```

**Historical reference:** `epub-core.mjs:1388–1392`

---

# Part VIII — Lifetime and explicit release

## 30. JavaScript has garbage collection; we control reachability

Garbage collection does not make memory management irrelevant. It reclaims objects that are no longer reachable. Application code determines which references remain in Maps, arrays, closures, listeners, or library-owned structures. `cache.set(key, hugeBuffer)` can keep a large buffer alive as long as that entry remains reachable. The developer cannot usually call `free()`, but can design ownership, lifetime, and cleanup so unnecessary objects stop being retained.

**Examples from the historical implementation:**

```js
cache.set(key, hugeBuffer);
```

---

## 31. Shrink a canvas to `1×1`

After rendering, the converter sets `canvas.width = 1` and `canvas.height = 1` in cleanup paths. This is not equivalent to manually freeing arbitrary JavaScript memory. It tells the browser that the large backing surface is no longer needed and replaces it with a minimal one. When native browser resources have a clearly finished lifetime, making that boundary explicit reduces accidental retention.

**Examples from the historical implementation:**

```js
finally {
  canvas.width = 1;
  canvas.height = 1;
}
```

**Historical reference:** `epub-core.mjs:1132–1135
epub-core.mjs:1194–1203
epub-core.mjs:1546–1563`

---

## 32. `page.cleanup()`

Each PDF.js page is obtained, processed, and cleaned in a `finally` block. That means cleanup has a path whether conversion succeeds, fails, or is cancelled. `finally` is not merely an error-handling convenience: it is part of **resource-lifetime correctness**. PDF page objects may retain decoded or parsed resources beyond the visible function call if their cleanup is omitted.

**Examples from the historical implementation:**

```js
const page = await pdf.getPage(pageNumber);
try {
  ...
} finally {
  page.cleanup();
}
```

**Historical reference:** `epub-core.mjs:1684–1762`

---

## 33. `pdf.destroy()`

At the end of a material, the code awaits an existing `destroyPromise` or invokes `pdf.destroy()`; when loading was interrupted it can destroy `loadingTask` instead. These alternatives cover both completed documents and cancellation during loading. A cancellable system must release resources along **non-natural termination paths** as well as ordinary success.

**Examples from the historical implementation:**

```js
if (destroyPromise) {
  await destroyPromise;
} else if (pdf) {
  await pdf.destroy().catch(() => {});
} else if (loadingTask) {
  await loadingTask.destroy().catch(() => {});
}
```

**Historical reference:** `epub-core.mjs:1775–1783`

---

## 34. Remove temporary listeners

PDF.js rendering connects `AbortSignal` to `task.cancel()` with a temporary `abort` listener, then removes that listener during cleanup. The same pattern appears in yielding and retrying network requests. One listener may be cheap, but a forgotten listener can retain closures, controllers, and associated work. Listener lifetime should be bounded by the operation that created it.

**Examples from the historical implementation:**

```js
signal?.addEventListener("abort", cancel, { once: true });
```

```js
signal?.removeEventListener("abort", cancel);
```

**Historical reference:** `epub-core.mjs:1082–1096`

---

# Part IX — Sequential conversion and peak RAM

## 35. One course material at a time

`buildCourseEpub()` iterates materials sequentially and awaits `convertMaterial()` for each one. An unbounded `Promise.all(materials.map(convertMaterial))` could keep many PDF documents, page structures, canvases, and encoded images alive concurrently. Sequential processing sacrifices possible parallel throughput to keep the **working set** predictable. For memory-heavy browser conversions that is often the safer default.

**Examples from the historical implementation:**

```js
for (let index = 0; index < materials.length; index++) {
  ...
  const converted = await convertMaterial(...);
  ...
}
```

```js
await Promise.all(materials.map(convertMaterial));
```

**Historical reference:** `epub-core.mjs:1891–1962`

---

## 36. Ideal streaming versus an in-memory builder

JSZip holds the logical archive and eventually produces a `Uint8Array` through `generateAsync()`. During finalization, individual assets, ZIP bookkeeping, compression state, and the final buffer may overlap. A truly streaming archive writer might reduce this peak but introduces more complex error recovery, ordering, manifest production, and cross-browser considerations. Ask whether the expected benefit justifies that complexity for the documents users actually export.

**Examples from the historical implementation:**

```js
const bytes = await zip.generateAsync({
  type: "uint8array",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
}, ...);
```

**Historical reference:** `epub-core.mjs:2098–2117`

---

# Part X — Deduplication: save file size and working set

## 37. Content-addressable deduplication

`epub-assets.mjs` uses a `Map` keyed by content identity. It hashes image bytes with SHA-256 and combines media type, extension, and digest in a key. If an identical asset is already registered, the builder reuses it rather than adding a second encoded file. This saves archive bytes and reduces redundant retained buffers, at the cost of computing the hash.

**Examples from the historical implementation:**

```js
const byHash = new Map();
```

```js
const digest = new Uint8Array(
  await crypto.subtle.digest("SHA-256", image.bytes)
);
```

```js
const key = `${image.mediaType}:${extension}:${hash}`;
```

**Historical reference:** `epub-assets.mjs:1–20`

---

## 38. Hashing spends CPU to save memory and output

Computing SHA-256 is not free. For every asset we must read its bytes and perform cryptographic digest work. In exchange we may skip duplicate storage, ZIP entries, and downstream encoding or transfer. This is another **multi-budget trade-off**: spend bounded CPU work to reduce memory and output size when duplicate assets occur often enough.

---

## 39. Ownership passes to JSZip

After `assetRegistry.register(image)`, `epub-core.mjs` sets `image.bytes = null`. The implementation even comments that duplicate buffers should be released because JSZip retains the canonical bytes. This expresses a **conceptual ownership transfer**: the conversion stage no longer needs to keep its own handle to a large asset once the archive owns the necessary copy.

**Examples from the historical implementation:**

```js
const asset = await assetRegistry.register(image);
...
image.bytes = null;
```

```js
// Release duplicate buffers; JSZip retains only the canonical bytes.
```

**Historical reference:** `epub-core.mjs:1914–1920`

---

## 40. Do not duplicate ownership

Several references to one buffer do not necessarily mean duplicated physical bytes, but they make it harder to determine when that buffer can become unreachable. Maintaining separate full copies is worse. The useful rule is that **every large buffer should have one clearly identifiable owner** at each phase of the pipeline, with explicit handoff and cleanup when ownership changes.

---

## 41. Not all images should use the same codec

PlumePilot samples a 64×64 representation of the rendered canvas before deciding how to encode an image. JPEG often compresses photographic or continuous-tone content more efficiently. PNG is usually more faithful for diagrams, sharp lines, and rasterized text. `chooseCanvasFormat()` returns the extension, media type, and optionally JPEG quality. The choice is a **representation-level performance optimization**, not simply a file-extension preference.

**Examples from the historical implementation:**

```js
sample.width = 64;
sample.height = 64;
context.drawImage(canvas, 0, 0, sample.width, sample.height);
```

```js
return photographic
  ? { extension: "jpg", mediaType: "image/jpeg", quality: 0.9 }
  : { extension: "png", mediaType: "image/png", quality: undefined };
```

**Historical reference:** `epub-core.mjs:1036–1050`

---

# Part XII — Text first: avoid rasterization when possible

## 42. Optimize before encoding

The converter does not always encode both PNG and JPEG and compare output sizes. That could double expensive encoding work. Instead it applies a relatively cheap classification heuristic **before** the costly transformation, then encodes once. The pattern is familiar from chapter discovery: **use inexpensive evidence to choose which expensive operation is worth executing**.

---

## 43. The most powerful optimization is not doing the work

For a simple PDF page, the converter first attempts `textPageToHtml()` when the page classifier does not demand visual rendering. If the text is reliable, it avoids allocating a large canvas, rasterizing pixels, encoding a PNG/JPEG, and storing a heavyweight image in the EPUB. Text-first conversion can improve CPU, memory, output size, selectability, and reader accessibility at the same time.

**Examples from the historical implementation:**

```js
converted = textPageToHtml(...);
```

**Historical reference:** `epub-core.mjs:1684–1717`

---

## 44. Fast paths and slow paths

A **fast path** handles common, simpler cases at low cost. A **slow path** performs more expensive but higher-fidelity work when necessary. In EPUB conversion, text reconstruction is one fast path; regional or visual rendering is the fallback for complex pages. A well-designed fast path does not abolish the slow path—it avoids paying for it when its stronger guarantees are unnecessary.

---

## 45. Progressive refinement

The pipeline progressively increases the cost of its investigation: look at extracted text and operators, classify the page, try text conversion where appropriate, verify the result, and invoke regional or full visual preservation only when uncertainty warrants it. This is the same algorithmic principle as finding an incomplete activity: **start with the cheapest useful evidence, escalate only when necessary**.

---

# Part XIII — Cooperative scheduling

## 46. The long-task problem

JavaScript on the main thread runs synchronous work to completion. A long uninterrupted conversion loop may prevent the browser from painting progress, responding to input, or processing a Cancel click. Even if the computation eventually finishes correctly, the user experience can be unacceptable. Thus responsiveness is not just the total elapsed time of conversion: the longest uninterrupted period of main-thread work also matters.

---

## 47. `yieldToBrowser()`

The EPUB converter creates a `MessageChannel` and a queue of callbacks. `yieldToBrowser(signal)` queues a resume function and sends a message through `port2`. The message handled on `port1` resumes the waiting Promise in a later task. This does not turn the conversion into parallel work; it divides one logical workflow into **cooperative chunks** that let the browser interleave other tasks.

**Examples from the historical implementation:**

```js
const browserYieldChannel = new MessageChannel();
const browserYieldQueue = [];
browserYieldChannel.port1.onmessage = () =>
  browserYieldQueue.shift()?.();
```

```js
function yieldToBrowser(signal) {
  ...
  browserYieldQueue.push(resume);
  browserYieldChannel.port2.postMessage(null);
}
```

**Historical reference:** `epub-core.mjs:137–167`

---

## 48. Yielding does not necessarily reduce total work

Doing 100 units of computation in one uninterrupted task may have slightly less overhead than performing the same work in ten chunks with yields. However, the second approach gives the browser opportunities to react to events and update the UI. A small increase in wall time can be an excellent trade when it avoids visible freezing. **Yielding improves scheduling responsiveness, not necessarily CPU cost.**

---

## 49. Where PlumePilot yields control

The converter uses `await yieldToBrowser(signal)` after visual blocks, during regional planning, after regions, and after pages. These are deliberate **cooperative scheduling points**. Position matters: a yield once every hundred pages would not help if each page already monopolized the thread for a long time. Their locations should match the actual units of expensive work.

**Historical reference:** `epub-core.mjs:1198
epub-core.mjs:1487
epub-core.mjs:1551
epub-core.mjs:1764`

---

## 50. Why `MessageChannel`?

`MessageChannel` is usually introduced as a communication API between contexts or endpoints. Here it serves as a browser scheduling primitive: posting a message arranges for its handler to run as a subsequent task. The purpose is not to send data to another frame but to allow the current computation to pause and resume without a long synchronous block. It is an interesting reuse of a standard browser API.

---

## 51. Would `requestIdleCallback()` be better?

Not automatically. `requestIdleCallback()` is designed for lower-priority work when the browser is idle; support and scheduling behavior vary among browsers, and callbacks without a timeout may be delayed. An EPUB export is **explicitly requested by the user** and should keep progressing while still allowing the browser to respond. The existing `MessageChannel` approach is a reasonable trade-off for that contract; substituting another API requires measurements and compatibility analysis.

---

# Part XIV — Cancellation is performance too

## 52. Unwanted work is wasted work

When the user presses Cancel, the benefit is not merely that the interface acknowledges a command. Cancellation should stop future downloads, PDF rendering, image encoding, and other expensive stages that no longer contribute to a desired artifact. It protects CPU, network, memory, and responsiveness. **Cancellation is a form of resource management.**

---

## 53. Abort inside rendering

`renderPage()` attaches the external `AbortSignal` to the PDF.js render task with `task.cancel()`. Cancelling only the UI button while letting rendering continue would fail to reclaim resources promptly. Cancellation must propagate into the actual worker and rendering stages, and the associated listener must be removed during cleanup.

**Examples from the historical implementation:**

```js
const task = page.render(...);
const cancel = () => task.cancel();
signal?.addEventListener("abort", cancel, { once: true });
```

**Historical reference:** `epub-core.mjs:1074–1096`

---

## 54. Cancellation latency

A workflow is not fully characterized by whether it *eventually* cancels. Ask how much time passes between a user's cancellation and actual cessation of expensive work. This is **cancellation latency**. Smaller processing units, frequent signal checks, abortable network operations, and cancellable PDF.js tasks reduce it. An uninterruptible final packaging stage should be presented honestly rather than as cancellable.

---

# Part XV — Output size and RAM are different metrics

## 55. A misleading comparison

Imagine output A is 80 MB and output B is 50 MB. We cannot automatically conclude that B needed less RAM. B may have allocated more temporary canvases, held several encoded representations, or performed extra compression. **Output size measures the artifact; peak memory measures the build process.** They must be benchmarked independently.

---

## 56. Compression: space versus CPU

JSZip uses DEFLATE at compression level 6 in the historical builder. Higher compression may reduce output size but increase CPU time and temporary work; lower compression can finish sooner but produce a larger file. There is no universally optimal setting without considering target ereader limits, expected file sizes, and browser responsiveness. Again, optimization is about choosing which resource matters for the actual product.

**Examples from the historical implementation:**

```js
compression: "DEFLATE",
compressionOptions: { level: 6 }
```

**Historical reference:** `epub-core.mjs:2098–2103`

---

# Part XVI — Selective parallelism

## 57. Where `Promise.all()` makes sense

The quiz PDF builder loads a small, known set of independent font files in parallel with `Promise.all()`. This is bounded fan-out: two assets, predictable size, no large cascade of dependent work. Parallelism can reduce wall time without creating an unacceptable peak working set. The problem is not `Promise.all()` itself but **unbounded concurrency applied to large or unpredictable workloads**.

**Examples from the historical implementation:**

```js
const [regularBytes, boldBytes] = await Promise.all([...]);
```

**Historical reference:** `test-builder.js:197`

---

## 58. Where concurrency can increase the working set

The offline HTML quiz builder uses nested `Promise.all()` operations to prepare question images. This is readable and may accelerate small quizzes, while `imageCache` deduplicates requests to the same URL. However, a very large image-rich quiz can still have many **different** downloads in flight. The cache does not impose a global concurrency limit. Profiling a realistic large fixture should come before adding a queue.

**Historical reference:** `test-builder.js:326–347`

---

## 59. Concurrency limits as a compromise

A potential future image pipeline could allow, for example, four downloads at a time rather than one or hundreds. This resembles a database connection pool or backend worker pool. It balances wall time, memory, network load, and complexity. But a concurrency limiter introduces additional state, cancellation handling, and failure semantics, so it should be justified by measured need.

---

# Part XVII — Strings, Base64, and duplication

## 60. Self-contained offline HTML

The quiz HTML embeds images as Data URLs. This meets the product requirement that one saved HTML file should open without fetching assets from the LMS. But Base64 expands the representation: three binary bytes typically become four encoded characters, and generation may temporarily retain raw bytes, encoded strings, JSON data, and the final HTML. A portability benefit can have a real memory and output-size cost.

---

## 61. Self-contained is a requirement, not a micro-optimization

We could reduce some string duplication by storing images in separate files and linking to them. That would weaken the convenience of sharing or reopening **one** offline document, which is central to this feature. The correct architecture must optimize **subject to the product's requirements**, not simply the easiest memory metric. Packaging choices that improve a benchmark but break offline portability are not valid optimizations for this use case.

---

# Part XVIII — Object URLs and resource lifetime

## 62. Blob URLs

The builder creates an Object URL from a `Blob` containing final bytes, assigns that URL to an anchor's `href`, triggers the download, and eventually calls `URL.revokeObjectURL()`. A Blob URL makes binary resources available through a URL-like interface while they remain owned by the browser. Even the final download path has a lifetime and a cleanup requirement.

**Examples from the historical implementation:**

```js
const url = URL.createObjectURL(
  new Blob([bytes], { type: mime })
);
```

```js
setTimeout(() => URL.revokeObjectURL(url), 5000);
```

**Historical reference:** `materials-builder.js:75–84`

---

## 63. Why not revoke immediately?

If we revoke the Blob URL before the browser has consumed the triggered download, the download may fail. PlumePilot uses a short delayed revocation—5,000 ms in the historical example—as a pragmatic compromise. It allows the click to initiate the transfer while avoiding indefinitely retaining the associated binary resource. A fixed delay is not a universal perfect lifetime mechanism, but makes the cleanup decision explicit.

---

# Part XIX — Memory leaks versus high memory usage

## 64. High memory usage and leaks are not synonyms

An export that starts near 80 MB, temporarily rises to 300 MB, then returns near baseline demonstrates **high peak memory**, not necessarily a leak. An export that finishes but leaves progressively higher retained memory after every run suggests a different problem: memory retention or leakage. These patterns require different investigations and should not be conflated.

---

## 65. A leak is unjustified retained memory

Possible causes include permanent Maps, forgotten event listeners, closures retaining buffers, Object URLs never revoked, or libraries whose documents are not destroyed. PlumePilot reduces these risks through bounded caches, temporary listener removal, PDF.js cleanup, canvas shrinking, page-lifetime caches, and operation cleanup. The key symptom is retained resources after their logical usefulness has ended.

---

## 66. Three snapshots as a mental method

Compare memory **before export**, **during peak work**, and **after completion and settling**. The middle snapshot is expected to grow; the diagnostic question is whether the post-export baseline gradually rises over repeated runs. Garbage collection, JIT behavior, and browser caches can make exact values noisy, so observe trends and object retention rather than demanding identical numbers after every execution.

---

# Part XX — Garbage collection makes memory noisy

## 67. Do not measure just one point

The garbage collector decides when to reclaim unreachable objects. A heap that remains elevated immediately after an export may contain reclaimable memory that has not yet been collected. Repeated runs, comparable conditions, snapshots, and retained-object analysis provide more trustworthy evidence than one live counter. Distinguish allocation, reachability, reclamation, and operating-system memory reporting.

---

## 68. `performance.memory` is not universal truth

The historical `performance.memory` property is non-standard and deprecated. `performance.measureUserAgentSpecificMemory()` is a more recent API but has limited availability and security/isolation requirements. It is unsuitable as an assumed portable production metric for PlumePilot. Browser DevTools, representative fixtures, and clearly scoped benchmarks remain essential for concrete memory investigations.

**Examples from the historical implementation:**

```js
performance.measureUserAgentSpecificMemory()
```

---

# Part XXI — Cache and memory pressure

## 69. Useful cache versus eternal cache

Each cache should answer: who owns it, how many entries it may retain, how entries become stale, and when it ends. `lessonApiCache` applies freshness and semantic reuse rules. `pageLessonSnapshots` has a numeric cap. Other page-scoped caches disappear with their owning content context. These are different but legitimate ways to control staleness and growth.

---

## 70. TTL controls staleness, not size

`API_LESSON_CACHE_FRESH_MS = 5 * 60 * 1000` defines a freshness interval. But a TTL does not automatically remove expired entries or cap the number of keys in memory. A long-lived Map can retain thousands of expired records until they are explicitly evicted, replaced, or the context ends. **Freshness policy and capacity policy are independent.**

**Examples from the historical implementation:**

```js
const API_LESSON_CACHE_FRESH_MS = 5 * 60 * 1000;
```

**Historical reference:** `content.js:64`

---

# Part XXII — The cost of intermediate structures

## 71. `Array.from`, spread, and copies

Modern JavaScript often uses spread syntax to turn a NodeList into an array or combine existing arrays. Such operations allocate new collection structures. In PlumePilot's ordinary UI and course logic, that overhead is usually minor compared with network, PDF rendering, or canvas work. In a genuinely hot loop with many thousands of items, it might matter. Do not sacrifice clarity for speculative micro-allocations without profiling evidence.

**Examples from the historical implementation:**

```js
[...document.querySelectorAll(...)]
```

```js
[...arrayA, ...arrayB]
```

---

## 72. Premature optimization

It is easy to rewrite a readable `array.filter(...).map(...)` pipeline into a complex manual loop to save one array allocation. If 95% of actual execution time is spent in Fetch, layout, or rendering, we have optimized the wrong thing. **Premature optimization** means changing code for a presumed bottleneck before measuring whether that bottleneck matters in representative workloads.

**Examples from the historical implementation:**

```js
array.filter(...).map(...)
```

---

# Part XXIII — Performance and correctness

## 73. An optimization that changes semantics is a bug

The history of first-incomplete search shows the danger: permanently skipping all chapters reported at 100% would be faster, but a stale master index could make the result incorrect. The more conservative algorithm preserves a second verification pass. Performance should be measured **under correctness constraints**. Saving five requests is not an improvement if it silently skips work the user still needs.

---

## 74. Conservative optimization

A useful pattern in uncertain systems is **fast path first, thorough fallback available**. Examples include master-index prioritization followed by detailed verification, text conversion followed by visual preservation when needed, and cache use followed by fresh data when stale. This creates graceful performance degradation: the common case is efficient, while unusual cases remain supported rather than producing incorrect answers.

---

# Part XXIV — Responsiveness as a functional requirement

## 75. Progress updates are not decoration

During EPUB generation the builder publishes stages, percentages, messages, and counters. These updates do not reduce CPU usage, but make a long task observable. An interface saying "Converting page 14 of 90" helps distinguish legitimate ongoing work from a frozen application. Progress visibility improves perceived latency, supports problem reports, and tells the user whether cancellation or patience is appropriate.

---

## 76. Cancellable and non-cancellable phases

During final ZIP compression, the builder reports `cancellable: false` and changes its UI accordingly. The code can check `AbortSignal` in earlier stages, but cannot guarantee immediate safe interruption of every finalization step. This is a **truthful UI** requirement: never present an operational control as available when the underlying process cannot honor it reliably.

**Examples from the historical implementation:**

```js
cancellable: false
```

**Historical reference:** `epub-core.mjs:2089–2116`; `materials-builder.js:69–72`

---

# Part XXV — The price of visual fidelity

## 77. Quality and performance compete

A page containing a complicated equation might convert quickly to text, but become wrong if essential mathematical symbols are omitted. Full rasterization preserves appearance at the expense of memory, encoding time, output bytes, reflow, and accessibility. Regional preservation attempts to separate clean text from fragile formulas or diagrams. A faster algorithm that changes the educational meaning of a page is not a successful optimization.

---

## 78. Quality as a budget

Each page has several competing objectives: semantic correctness, visual fidelity, selectable/reflowable text, encoded size, CPU time, memory pressure, and accessibility. No single representation dominates on every dimension. `pageNeedsVisual()` and related logic form a small **policy engine**, selecting a compromise according to observable page characteristics.

---

## 79. Regional preservation under constraints

Regional mode tries to preserve selected diagrams, equations, or tables as images while retaining surrounding text as reflowable XHTML. This can save final file size and improve reading flexibility compared with a full-page raster image. However, detecting regions requires operator lists, bounding boxes, row-ink calculations, region planning, and pixel coverage checks. Better output quality can legitimately require **more CPU during conversion**.

---

# Part XXVI — Resource budget per page

## 80. A conceptual optimization model

We can describe a page with several costs: CPU time `C`, peak memory `M`, output bytes `B`, and semantic or visual loss `L`. The converter chooses among text, regional, and visual strategies while trying to respect a quality threshold and a practical resource budget. PlumePilot does not solve a mathematical optimization problem globally; its heuristics approximate the same trade-off. The model clarifies why "fastest" alone cannot select the right mode.

---

# Part XXVII — Main thread versus workers

## 81. The PDF.js worker does not remove all main-thread work

PDF.js configures its worker using `pdfjsLib.GlobalWorkerOptions.workerSrc`. Some parsing and document processing may run away from the main thread, but the builder page still coordinates conversion, canvas rendering, image encoding, DOM progress updates, and ZIP packaging. A worker is **not** a guarantee that every expensive operation has moved off the main thread. Profile the complete pipeline before concluding that the UI is protected from long tasks.

**Examples from the historical implementation:**

```js
pdfjsLib.GlobalWorkerOptions.workerSrc = ...
```

**Historical reference:** `epub-core.mjs:8–11`

---

## 82. What might move to workers in the future?

Possible candidates include image analysis, hashing, parts of encoding, or other transformations that do not require normal DOM access. But `OffscreenCanvas` capabilities, extension browser compatibility, PDF.js integration, and moving large buffers between contexts bring their own complications. Worker extraction should follow measured bottlenecks, not an assumption that worker code is automatically faster.

---

## 83. Transfer versus copy

When sending a large `ArrayBuffer` to a worker, **copying** it can produce another large allocation, while **transferring** ownership can avoid that copy but detach the sender's access. For a 50 MB buffer the difference may matter to peak memory. Ownership transfers are therefore a natural design question for any future worker-based converter, but do not justify a refactor without representative measurements.

---

# Part XXVIII — Extension background and performance

## 84. The background is not a permanent process

On Chromium Manifest V3, the extension's background service worker may be terminated when idle and started again later. Termination can free process-local caches and queues, but startup adds latency and forces important state to be reconstructed. Ephemeral lifetimes are therefore simultaneously a memory advantage and a coordination constraint. Durable operation state must not depend solely on globals in a worker that can disappear.

---

# Part XXIX — Cross-context performance

## 85. Messaging has a cost, but it is rarely the first suspect

PlumePilot communicates among popup, background, content bridge, MAIN world, and builder. Crossing these boundaries requires serialization, dispatch, validation, and sometimes copying. However, optimizing small status messages is unlikely to help if PDF rasterization dominates a 30-second export. **Measure the actual payload and frequency** before treating messaging as the bottleneck.

---

## 86. Large payloads deserve different handling

Sending a command such as `{ type: "START" }` is very different from transporting several megabytes of binary material. PlumePilot generally leaves large artifacts in the context where they are generated and uses messaging to communicate operation IDs, commands, progress, and completion. For builder handoff, the background uses extension storage rather than embedding huge payloads in a URL. Avoid unnecessary cross-context buffer movement.

**Examples from the historical implementation:**

```js
{ type: "START" }
```

---

# Part XXX — Data locality

## 87. Keep data near its consumer

`lessonApiCache` lives alongside lesson discovery. `turboControllers` are kept in the MAIN-world interceptor owning abortable requests. EPUB assets live with the document builder. This is **data locality**: keep information close to the code that uses or controls it unless sharing is necessary. Reducing transfers can simplify ownership, reduce copies, and avoid making a single background process the bottleneck for unrelated work.

---

# Part XXXI — UI performance

## 88. Selective rendering

Chapter 11 examined `chrome.storage.onChanged` updates. The floating menu does not indiscriminately rebuild its entire UI for each preference change; it chooses which render functions apply. This is manual dependency tracking. It reduces unnecessary DOM updates and preserves ephemeral interaction state such as focus, expanded panels, and scroll position.

**Historical reference:** `floating-menu.js:4588–4664`

---

## 89. Why not always rerender everything?

For a very small UI, a complete rerender may be perfectly acceptable. But replacing many nodes can restart transitions, lose focus, reset disclosures, and cause visual jumps even when its CPU cost is small. Selective rendering protects both **runtime efficiency** and **interaction stability**. Which approach is better depends on component complexity and the cost of keeping dependencies synchronized.

---

# Part XXXII — CSS and layout

## 90. Shared CSS reduces divergence, not necessarily runtime cost

`menu-ux.css` exists primarily to give popup and floating menu consistent visual rules. A shared file does not automatically make CSS application faster: the browser still needs to match selectors and compute style for each relevant node. The main benefit is **maintainability, coherent design tokens, and fewer regressions**, which are forms of development performance.

---

# Part XXXIII — Developer performance

## 91. Team performance

Another resource budget is the team's time to diagnose, review, and safely modify code. Clear ownership, small presentation helpers, explicit state schemas, regression fixtures, and controlled scope can make code slightly more verbose yet drastically reduce debugging time. These gains will not appear in Chrome's Performance panel, but matter directly to the lifetime cost of the project.

---

# Part XXXIV — Logging and performance

## 92. Toggleable debug logs

`epub-core.mjs` has `STUDYWING_DEBUG = false` and a guarded `debugLog()` helper. Detailed diagnostics are invaluable when investigating conversion problems, but high-frequency logging can consume CPU, retain objects in debugging environments, and distort benchmark results. Keep diagnostic instrumentation intentional and clearly separated from normal production behavior.

**Examples from the historical implementation:**

```js
const STUDYWING_DEBUG = false;
const debugLog = (...values) => {
  if (STUDYWING_DEBUG) console.info(...values);
};
```

**Historical reference:** `epub-core.mjs:5–7`

---

# Part XXXV — Benchmarking pitfalls

## 93. Benchmarking with DevTools open

Developer tools can influence observed behavior through instrumentation, stack traces, console recording, source maps, CPU profiling, and heap snapshots. This does not mean DevTools should be avoided; it means test conditions should be documented and measurements repeated. Comparing two versions requires comparable environments and a clear description of any profiling overhead.

---

## 94. Warm cache versus cold cache

A second run may benefit from browser HTTP cache, warmed JavaScript code paths, decoded resources, or already loaded fonts. A first run may incur startup or download costs that the second avoids. Relevant benchmarks should distinguish **cold** and **warm** runs when they produce different conclusions. It is not fair to compare one version cold and another warm.

---

## 95. A fixture that is too small

A three-page PDF may never expose the resource behavior of a 300-page export. A course with five chapters may not reveal cache growth encountered after visiting two hundred. Representative performance testing must cover **scale**, not only functional correctness on a tiny fixture. Include image-rich PDFs, text-heavy PDFs, mathematical pages, and large quizzes when those workloads matter to users.

---

# Part XXXVI — An EPUB profiling plan

## 96. First question: wall time

Measure elapsed duration from explicit start and end events with `performance.now()` and repeat the workload several times. Separate network download, page conversion, ZIP finalization, and other major stages where possible. A single total time can tell us that a regression exists, but phase timings make it easier to locate the cause.

---

## 97. Second question: where does the time go?

Use the browser's Performance panel to inspect script execution, long tasks, PDF.js work, canvas rendering, image encoding, layout, and compression. Avoid assuming the most visible stage is the dominant cost. A download spinner can remain visible while most time is actually spent preparing images or serializing the archive.

---

## 98. Third question: memory trend

Record snapshots before export, during peak conversion, after completion, and after a comparable settling period. Repeat the export if appropriate. Look for a cumulative rise in retained memory over successive runs, not just a high temporary peak. Keep the browser, fixture, and test environment consistent.

---

## 99. Fourth question: retained objects

If memory does not return toward a stable baseline, inspect retained objects and their retaining paths. Candidates include image byte arrays, canvases, Maps, closures, listeners, PDF.js objects, and archive buffers. The **retained size** of an object graph may be more informative than an object's shallow size because one small owner can keep a much larger structure reachable.

---

# Part XXXVII — An autoplay profiling plan

## 100. Measure the observer callback

Record a long autoplay session while the LMS dynamically updates its DOM. Determine how frequently the global `MutationObserver` callback runs, how much CPU it consumes, and whether it triggers meaningful work or redundant scans. If the cost is negligible, leave the implementation alone. If it is a hotspot, evaluate more targeted observation or scheduling.

---

## 101. Measure DOM scanning against API discovery

For the same course, compare visual/DOM-first discovery with master-index/API-first discovery. Track wall time, number of chapter openings, network detail requests, retries, and successful target identification. The most important metric may not be JavaScript CPU time at all—it may be the number of LMS UI transitions avoided while preserving a correct target.

---

# Part XXXVIII — An offline quiz profiling plan

## 102. Large image collections

Build a quiz fixture containing many distinct images, repeated images, and images of different sizes. Measure total HTML build time, peak working set, request count, number of simultaneous downloads, and output size. Compare the current nested `Promise.all()` strategy with a bounded-concurrency implementation only after obtaining this baseline. A queue's added complexity should pay for itself in a real workload.

---

# Part XXXIX — A backend analogy

## 103. The browser as a small application server with a UI

A backend developer can map PlumePilot's work onto familiar concepts: API requests, caches, job coordination, retry/backpressure, transformation pipelines, queues, serialization, and operation ownership. The crucial difference is that the browser's main thread also needs to process clicks, key presses, scrolling, and painting. A CPU-heavy synchronous task has an immediately visible UX cost. The browser is therefore not simply a JavaScript VM hosting a tiny server.

---

# Part XL — Performance invariants

## 104. Useful performance invariants

We can express resource-oriented guarantees as testable properties:

**EPUB:** no page canvas remains at full resolution after its processing ends; PDF.js documents are destroyed on success or cancellation; a cancelled export does not proceed into an unwanted download; final assets retain valid EPUB structure.

**API:** request pacing and bounded snapshot caches remain enforced; a cache optimization never permanently hides an unfinished activity.

**UI:** active work remains observable and cancellable where supported; opening a secondary view or rerendering settings does not arbitrarily lose focus.

These invariants protect both correctness and resource behavior more reliably than comparing a single elapsed-millisecond value.

---

# Part XLI — Performance regression tests

## 105. Not every performance test needs a timing assertion

Many stable regression tests can verify structural behavior: a cache never exceeds its configured cap; abort listeners are removed; canvases are reduced; no unnecessary duplicate URL request starts; after cancellation no further archive generation occurs. These are less sensitive to hardware and machine load than asserting that an operation always completes in less than an arbitrary number of milliseconds.

---

## 106. The Node benchmark already verifies cleanup

`scripts/benchmark-epub-node.mjs` contains a resource-oriented check that observed canvases have minimal dimensions after cancellation. This does not measure how much RAM Chromium consumes. It proves an important cleanup path ran and left an expected invariant true. Such tests complement browser memory profiling rather than replacing it.

**Historical reference:** `scripts/benchmark-epub-node.mjs:151–176`

---

# Part XLII — What to optimize next

## 107. First: measure the `MutationObserver`

The global observer is a possible source of repeated work, but rewriting it immediately would be premature. Instrument callback frequency and duration, profile a representative LMS session, and only then consider coalescing, a narrower subtree, or targeted invalidation if the results show a meaningful hotspot.

---

## 108. Second: measure nested `Promise.all` in quizzes

Only a sufficiently large, image-rich quiz can tell us whether a bounded image-download pool is needed. A queue changes scheduling state and failure handling. Do not introduce this machinery merely because limiting concurrency sounds more sophisticated; demonstrate a workload where it improves memory or responsiveness without unacceptable wall-time cost.

---

## 109. Third: measure JSZip peak memory

If EPUB still has high peak memory after page-level cleanup and asset deduplication, archive finalization may be the next bottleneck. At that point evaluate compression level, retained buffers, or a streaming-compatible packaging strategy using realistic fixtures. The added complexity is justified only when the peak-memory reduction matters to target browsers and devices.

---

## 110. Fourth: standardized diagnostics

A small, optional diagnostic object could consistently record `elapsedMs`, `networkRequests`, `cacheHits`, `cacheMisses`, `pagesText`, `pagesRegional`, `pagesVisual`, `inputBytes`, and `outputBytes` across development benchmarks. Standardized fields make releases easier to compare than scattered one-off logs. This would belong in benchmark or development mode, not necessarily in every user-facing operation.

**Examples from the historical implementation:**

```js
{
  elapsedMs,
  networkRequests,
  cacheHits,
  cacheMisses,
  pagesText,
  pagesRegional,
  pagesVisual,
  inputBytes,
  outputBytes,
  uniqueAssetBytes
}
```

---

# Part XLIII — What not to optimize today

## 111. I would not rewrite `Map` with objects

There is no evidence that JavaScript `Map` lookups dominate the observed workloads. Replacing maps with plain objects solely for hypothetical micro-performance could damage semantic clarity, key handling, and maintainability. Measure before paying that cost.

---

## 112. I would not remove every `await sleep()`

Some waits are **pacing**, others are **readiness synchronization**, **retries**, or **recovery deadlines**. Deleting them indiscriminately could increase server load, reintroduce race conditions, or cause navigation before the LMS is ready. Classify each delay by purpose, then benchmark any change while verifying behavior.

---

## 113. I would not parallelize all EPUB chapters

The cost of overlapping PDF documents, canvases, images, and ZIP buffers makes unbounded chapter-level parallelism risky. Without benchmarks showing a safe improvement, sequential conversion remains a reasonable conservative choice for memory-limited browsers.

---

## 114. I would not depend on a nonportable memory API in production

`performance.measureUserAgentSpecificMemory()` is useful to study where supported, but its compatibility and security prerequisites make it unsuitable as a universal production dependency. Existing benchmark harnesses and DevTools can support targeted investigations without imposing that API on all browser users.

---

# Part XLIV — A practical checklist

## 115. When something feels slow

First ask which operation is slow; whether the delay is network, CPU, layout, image decoding, or synchronization; whether the problem appears on cold or warm runs; how large the workload is; what the peak memory trend looks like; and whether cancellation or progress updates remain responsive. These diagnostic questions are more useful than reflexively adding `Promise.all()` or changing data structures.

---

# Part XLV — A complete PlumePilot map

## 116. Technique → resource budget

The following comparison is qualitative, not a benchmark. The arrows indicate typical intended effects and important trade-offs; actual results depend on workload.

| Technique | CPU | Network | Memory | Responsiveness |
|---|---|---|---|---|
| Course master index | ↓ | ↓ | Slight ↑ | ↑ |
| `lessonApiCache` | ↓ | ↓ | ↑ | ↑ |
| Request pacing | ≈ | Burst ↓ | Peak ↓/≈ | ↑ |
| Unbounded `Promise.all` | Wall time ↓ | Concurrency ↑ | Peak ↑ | Depends |
| Sequential EPUB conversion | Wall time ↑ | ≈ | Peak ↓ | Predictable |
| Text fast path | ↓ | ≈ | ↓ | ↑ |
| Regional rendering | ↑ | ≈ | Depends | Improved by yields |
| Canvas size cap | ↓/≈ | ≈ | ↓ | ↑ |
| SHA-256 asset deduplication | ↑ | ≈ | ↓ | Depends |
| `yieldToBrowser()` | Overhead ↑ | ≈ | ≈ | ↑↑ |
| Bounded cache | ≈ | Possible ↑ after eviction | ↓ | Predictable |
| Selective UI rendering | ↓ | ≈ | ≈ | ↑ |

The goal is not to make every arrow point downward. It is to choose acceptable trade-offs while protecting correctness and the actual user experience.

---

# Part XLVI — Concepts to carry forward

## 117. Performance is resource management

Instead of thinking only "How many milliseconds does this function need?", ask which CPU, network, memory, and responsiveness budgets it consumes and how long it holds each resource. This makes performance a first-class architectural concern.

---

## 118. The best optimization often avoids work

Examples include using an index before detailed API calls, reusing a valid cache response, deduplicating an in-flight image download, skipping unnecessary visual rasterization, or avoiding DOM rerenders for unrelated settings. Eliminated work is usually a stronger improvement than making the same work marginally faster.

---

## 119. Working-set control may matter more than output size

In a binary-processing pipeline, an archive's final size and the maximum live memory during its creation are different metrics. Releasing pages, canvases, and temporary buffers early can matter more for reliability than shaving a few megabytes off the final EPUB.

---

## 120. Yielding is different from doing less work

`yieldToBrowser()` does not automatically reduce the amount of computation or total wall time. It enables cooperation with the browser's event loop. A more responsive UI can be worth a modest scheduling overhead.

---

## 121. Parallelism and memory are often in tension

More concurrent operations usually mean more simultaneously live buffers, requests, Promises, and state. Concurrency should be a chosen limit informed by workload measurements, not an automatic response to a slow operation.

---

## 122. Cleanup is part of the algorithm

`finally`, `destroy()`, listener removal, clearing large buffers, and revoking Object URLs are not optional accessory code. They define the **temporal correctness** and memory lifetime of the overall workflow.

---

## 123. Declarative benchmarks

Every benchmark should state its environment, fixture, metric, included stages, excluded stages, and interpretation limits. Without those declarations, an isolated performance number risks becoming folklore instead of actionable engineering evidence.

**Examples from the historical implementation:**

```js
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

```js
const cache = new Map();
```

# Part XLVII — Exercises

### Exercise 1 — Canvas budget

Consider a canvas of **2400 × 3000 pixels** using 8-bit RGBA. Calculate the pixel-buffer bytes and approximate MiB; explain why a JPEG output may be much smaller; name at least three additional structures that might coexist in memory.

### Exercise 2 — Serial versus parallel

You have eight PDFs to convert. Each operation requires about **70 MB peak working set** and **3 seconds** of mixed CPU/I/O work. Compare sequential conversion, `Promise.all` for all eight, a pool of two, and a pool of four. Which approach would you choose on an average laptop, and why?

### Exercise 3 — Observer coalescing

Given the original observer below, design a version that calls `scan()` at most once per task or frame while still detecting newly inserted `<video>` elements:

```js
new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

### Exercise 4 — Cache bounds

Turn `const cache = new Map()` into a collection with a maximum of 100 entries. Explain how **FIFO**, **LRU**, and **TTL** differ. Does a TTL automatically limit the number of retained keys?

### Exercise 5 — Measurement plan

Write a benchmark protocol to prove a new EPUB implementation uses less RAM. Specify browser, fixture, cold/warm runs, repetitions, snapshot times, output metric, and regression threshold.

### Exercise 6 — Offline quiz HTML

A nested `Promise.all()` loads too many images at once. Sketch the state and behavior of `mapWithConcurrency(items, 4, mapper)` without needing to implement it fully. What state must the pool retain?

### Exercise 7 — Fast paths

Find three real PlumePilot fast paths. For each identify the inexpensive evidence, the expensive work avoided, and the correctness fallback.

### Exercise 8 — Leak or peak?

After five exports, one run measures **80 MB before**, **300 MB peak**, and **92 MB after**; the second measures **305 MB peak** and **94 MB after**. Is this sufficient evidence of a leak? Explain why not and what should be measured next.

---

# Part XLVIII — Further reading

## 124. Performance API

For elapsed intervals, use [`performance.now()`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now). For named marks and measures, see the [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance). Monotonic intervals are better suited to duration measurements than wall-clock timestamps.

---

## 125. `MutationObserver`

See [MDN: MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver). The API reports DOM changes, but the application's cost depends on observer scope, callback work, and scheduling choices.

---

## 126. `MessageChannel`

See [MDN: MessageChannel](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel). PlumePilot's converter uses a channel as a cooperative yield mechanism between tasks.

---

## 127. Pixel data

See [MDN: CanvasRenderingContext2D.getImageData()](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData). It returns an `ImageData` object holding pixel information from the requested region, which has an allocation and processing cost.

---

## 128. Memory measurement

See [MDN: measureUserAgentSpecificMemory()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory). This API is not a universally available portable measurement tool; availability and security requirements matter. For practical investigations, use [Chrome DevTools](https://developer.chrome.com/docs/devtools/) with clearly documented benchmarks and snapshots.

---

# Part XLIX — Recap

PlumePilot does not have one generic issue called “performance.” It has several interdependent resource budgets. We followed master indexes, cache design, bounded Maps, pacing, retries, DOM scans, MutationObservers, PDF.js, canvas and pixel buffers, text-first and regional EPUB conversion, image deduplication, SHA-256, JSZip, cooperative yielding, cancellation, and cleanup.

> **Good performance comes from avoiding unnecessary work, keeping fewer large objects alive at once, and returning control to the browser regularly—without sacrificing correctness.**

We must not confuse a smaller file with lower peak RAM, more parallel Promises with a faster system, or the same Big-O classification with equal real-world cost.

**The browser is our runtime.** Optimizing means respecting its constraints rather than pretending it is only a JavaScript virtual machine.

# Next chapter — 13: Chrome, Edge, and Firefox

The next chapter shifts from one abstract browser to three actual WebExtension platforms: Chromium/Chrome, Chromium/Edge, and Firefox. We will study manifests, extension contexts, runtime APIs, vendor bundles, permissions, CSP, browser-specific requirements, and real AMO review warnings. **Code compatibility, API compatibility, store packaging, and review compatibility are different problems.**

---

[← 11 — UI without a framework](11-ui-without-a-framework.md) · [Contents](index.md) · 13 — Chrome, Edge, and Firefox (translation in progress)
