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
