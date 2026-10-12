# 08 — Finding the first incomplete activity

## Heuristics, indexes, verification, and fallbacks

One of PlumePilot's seemingly simplest features actually poses an interesting algorithmic problem:

> **Given a course containing many chapters and activities, how can we find the first genuinely incomplete activity without opening and inspecting everything?**

The naive answer is straightforward:

```text
open chapter 1
check every activity
if everything is complete → chapter 2
check every activity
...
```

It works—but it can be expensive. Each chapter may require opening an accordion, waiting for rendering, reading the DOM, making an API request, synchronizing with a changing UI, and recovering when content fails to render.

For a long course, the question is not just:

> **Which is the first item with progress below 100%?**

It is:

> **What is the cheapest way to locate the first correct candidate when our information sources may be incomplete, stale, or ambiguous?**

This chapter is about algorithms in practice. Rather than studying quicksort or balanced trees in isolation, we will explore search spaces, indexes, heuristics, candidate ordering, verification, completeness, false positives and negatives, short-circuiting, fallback, progressive refinement, CPU cost versus I/O cost, and correctness under incomplete information.

---

# Part I — The problem as an ordered search

## 1. The problem as an ordered search

Suppose a course contains `N` modules. Each module contains activities in order:

```text
Objectives
Video 1
Video 2
...
Final test
```

We want the first incomplete activity **in course order**.

Formally, consider:

```text
A1, A2, A3, ..., Am
```

with a completion function:

```text
complete(Ai) ∈ {true, false, unknown}
```

The result we want is:

```text
min i such that complete(Ai) = false
```

The difficulty is that evaluating `complete(Ai)` is not free.

For some activities, we have an inexpensive aggregate signal. Others require a detailed API request. Still others require us to open the chapter and inspect its DOM.

This creates another question:

> **In what order should we pay for these checks?**

---

## 2. A linear search is correct, but not necessarily efficient

The simplest solution is a linear scan:

```js
for (const chapter of course) {
  open(chapter);
  for (const activity of chapter.activities) {
    if (!isComplete(activity)) return activity;
  }
}
```

In conventional complexity notation, we might say:

```text
O(N)
```

if we treat each chapter as one unit.

But that hides what is actually expensive inside the browser.

One iteration might involve:

```text
DOM click
→ asynchronous rendering
→ waiting
→ network request
→ JSON parsing
→ more waiting
```

For PlumePilot, it is more informative to distinguish:

```text
CPU cost
DOM cost
network cost
synchronization cost
```

An `O(N)` scan that makes `N` HTTP requests can be dramatically slower than an `O(N)` scan over an already available in-memory array.

> **Big-O describes how work grows; it does not, by itself, describe the real cost of that work.**

---

# Part II — From the DOM to an index

## 3. The first idea: inspect what is visible

A first version of this problem can be addressed directly through the DOM.

The code still contains a function that captures the approach:

```js
function firstVideoInChapter(identity, incompleteOnly = false) {
  const chapter = findChapter(identity);

  if (!chapter) return null;

  return (
    chapterRows(chapter).find((row) => {
      const name = lessonName(row).toLowerCase();

      if (!name || name === "obiettivi") return false;

      const progress = getProgress(row);

      return !incompleteOnly || progress < 100;
    }) || null
  );
}
```

Source: `content.js`, around line 1417 in the historical snapshot.

Notice `Array.find()`. We do not need every incomplete video. We need the **first**.

Using `filter()` would conceptually mean:

```text
inspect everything → construct another array → take its first element
```

But `find()` stops at the first match:

```text
video 1 → 100% → continue
video 2 → 100% → continue
video 3 → 42%  → STOP
video 4 → no need to inspect
```

This is a modest optimization, but also a clearer expression of the algorithm's intent.

---

## 4. The DOM problem: to search, you first have to render

DOM-based search has a structural limitation.

A chapter's rows often exist only after the corresponding chapter has been opened or rendered.

A global scan becomes:

```text
chapter 1
  ↓
open
  ↓
render
  ↓
verify
  ↓
chapter 2
  ↓
open
  ↓
render
  ↓
verify
...
```

If the first incomplete activity is in chapter 30, we may needlessly interact with 29 earlier chapters.

This was precisely one kind of regression encountered during development: the feature could find the correct target, but only after opening intermediate chapters that should have been skipped.

**Getting the right result is not the entire definition of quality. The route we take to reach it matters.**

---

# Part III — Separate the index from the detailed record

## 5. The essential distinction: index ≠ detail data

A database rarely reads every row of a table for every query. It uses indexes.

The same mental model helps here.

Imagine two levels:

```text
COURSE INDEX
--------------------------------
Module 1    100%
Module 2    100%
Module 3     80%
Module 4    100%
Module 5     20%

DETAIL
--------------------------------
Module 3
  Objectives 100%
  Video A    100%
  Video B     42%
  Test         0%
```

The first level does not necessarily tell us *which* activity is incomplete.

But it can tell us:

> **Where is it most useful to look first?**

This is exactly the role of PlumePilot's course/master index.

---

## 6. `getPlaybackCourseIndex()`

The code normalizes the index into entries such as:

```js
{
  displayOrder,
  percentage,
  masterOrder,
  folderId,
  id,
  lpId,
  title
}
```

The important mapping is:

```js
const entries = response.data.entries
  .map((entry) => {
    const displayOrder = Number(entry?.displayOrder);
    const percentage = Number(entry?.percentage);

    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      return null;
    }

    return {
      displayOrder,
      percentage: Number.isFinite(percentage) ? percentage : 0,
      ...
    };
  })
  .filter(Boolean)
  .sort((first, second) => first.displayOrder - second.displayOrder);
```

Source: `content.js`, around lines 5760–5822.

The result is an ordered structure that is relatively cheap to consult:

```text
[
  { displayOrder: 1, percentage: 100 },
  { displayOrder: 2, percentage: 100 },
  { displayOrder: 3, percentage: 82  },
  { displayOrder: 4, percentage: 100 },
  { displayOrder: 5, percentage: 35  }
]
```

Why not simply take the first entry below 100% and stop?

For a while the algorithm was close to that model. Real experience revealed that the assumption was too strong.

---

## 7. Heuristic, index, and source of truth are not synonyms

Suppose the index reports:

```text
Module 1 → 100%
Module 2 → 100%
Module 3 →  80%
```

It makes sense to inspect module 3 first.

But it does **not** follow that:

```text
Modules 1 and 2 can never be relevant again
```

The aggregate data might be slightly stale, updated on a different schedule from detailed endpoints, unable to represent a particular activity state, or temporarily inconsistent with the UI.

Thus:

```text
percentage < 100
       ↓
strong candidate
       ≠
definitive proof
```

Distinguish:

### Source of truth

A source we treat as authoritative for a particular decision.

### Index

A structure that helps us quickly find where to search.

### Heuristic

A signal that improves search order without independently guaranteeing correctness.

In the current design, the master percentage primarily acts as a **prioritization index/heuristic**.

---

# Part IV — Candidate ordering

## 8. The elegant part of the current algorithm

The implementation begins with:

```js
let discoveryOrder = outline
  .map((_entry, index) => index)
  .filter((index) =>
    index >= firstIndex &&
    !(options.verifiedCompleteChapters || []).some((identity) =>
      sameChapterIdentity(outline[index].identity, identity)
    )
  );
```

It then partitions the candidates:

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

Source: `content.js`, around lines 5894–5911.

Consider the original order:

```text
[1, 2, 3, 4, 5, 6]
```

with:

```text
1 → 100%
2 → 100%
3 →  80%
4 → 100%
5 →  40%
6 → 100%
```

The new candidate order is:

```text
[3, 5, 1, 2, 4, 6]
```

Chapters reported at 100% have **not** been permanently eliminated. They have been moved to a **second pass**.

This resembles a **stable partition**:

```text
suspected incomplete candidates first
other candidates second
```

while preserving the course order **within each group**.

Does 80% come before 40% because it has a higher percentage? No. The percentage is not a numeric ranking. We only ask:

```text
suspected incomplete?
```

and keep the original course order among candidates with the same answer.

That distinction matters because the feature is about finding an incomplete activity in the course's pedagogical sequence, **not the activity in the least-complete module**.

---

## 9. Why not sort by percentage?

It might look natural to write:

```js
chapters.sort((a, b) => a.percentage - b.percentage);
```

But consider:

```text
Module 3 → 80%
Module 5 → 20%
```

The first incomplete activity can be in module 3. Sorting by percentage would inspect module 5 before module 3, contrary to the feature's purpose.

The requirement is not:

> Find the least-complete chapter.

It is:

> Find the first incomplete activity in course order.

The index should reduce the work, not redefine the domain's ordering semantics.

---

## 10. Two passes, not an irreversible shortcut

The code explicitly comments:

```js
// Prefer the master's unfinished candidates, keeping course order within
// each pass. A second pass verifies 100% summaries if no candidate matches.
```

This captures the algorithm's architectural evolution.

An earlier approach might be:

```text
master says 100% → skip forever
```

That is fast, but a stale master response can cause a **false negative**:

```text
genuinely incomplete activity
but classified as complete
→ never checked
```

The safer current approach is:

```text
PASS 1
chapters below 100% or without a reliable mapping

if no valid target is found
         ↓
PASS 2
chapters reported at 100% in the aggregate
```

The index improves common-case performance while retaining a broader verification path when necessary.

**Important nuance:** two-pass prioritization protects against permanently overlooking a chapter merely because its summary reads 100%; it does not constitute a mathematical proof of a globally earliest target when different sources disagree. A strict earliest-target guarantee would also require resolving relevant earlier uncertain candidates before committing to a later one.

---

# Part V — Progressive refinement

## 11. From inexpensive evidence to expensive evidence

We can picture the information sources as a pyramid:

```text
          visual DOM
          highest cost
              ▲
              │
       lesson detail API
              ▲
              │
      course/master index
              ▲
              │
       cache/local state
          lowest cost
```

The algorithm climbs the pyramid only as needed.

This is **progressive refinement**:

1. Consult a coarse, inexpensive representation.
2. Prioritize plausible candidates.
3. Request more detailed information.
4. Use visual verification for remaining uncertainty.

The same pattern appears elsewhere:

```text
database index → row lookup
cache → database
metadata → full file
search index → document retrieval
bounding box → precise collision detection
```

---

## 12. The detail request

For each candidate, PlumePilot can request detailed lesson information:

```js
const lesson = await requestLessonWithRetry(
  courseCode,
  entry.lessonNumber,
  "playback",
  null,
  null,
  lessonLpId,
  false,
  indexedChapter?.id || entry.lessonNumber,
  true,
);
```

It then examines:

```text
Objectives
videos
progressItems
test
```

A potential target can be chosen as:

```js
const unfinishedItem =
  !options.forwardVideoSearch && objectivePending
    ? { ...objective, contentType: "intro" }
    : playbackItems.find(
        (item) =>
          item.contentType === "video" &&
          Number(item.percentage) < 100
      );
```

This is another linear search, but over a much smaller collection: one module's activities.

```text
course index
    ↓
chapter candidate
    ↓
lesson detail
    ↓
activity candidate
```

---

## 13. The result is more than `found` / `not found`

A naive helper might return:

```js
return activity || null;
```

The real workflow needs to distinguish:

```text
target
end
cancelled
fallback
```

A target result may carry:

```js
{
  status: "target",
  entry,
  unfinishedItem,
  testTarget,
  visualVerification,
  verifiedActivities,
  lessonLpId,
  lessonParagraphId
}
```

Why so much information?

Because:

```text
we identified the chapter
```

does not imply:

```text
we know exactly which DOM row to click
```

The algorithm must communicate both the chosen candidate and **how certain the evidence is**.

---

# Part VI — Unknown is a real state

## 14. Three values instead of two

For completion, it is often useful to think in terms of:

```text
complete
incomplete
unknown
```

rather than a Boolean:

```text
true / false
```

`visibleIncompleteActivity()` makes that distinction:

```js
if (percentage === null || !Number.isFinite(percentage)) {
  return { contentType: "unknown", title };
}
```

Missing information should not automatically become:

```text
0%
```

because:

```text
I don't know
```

is different from:

```text
I know it is incomplete
```

A tempting but dangerous default is:

```js
const percentage = value || 0;
```

When `value` is unavailable, this can turn absence of evidence into an apparently exact number.

For critical decisions, **unknown must remain representable**.

---

## 15. False positives and false negatives

Two error categories are especially useful here.

### False positive

The algorithm says:

```text
this activity is incomplete
```

but it is actually complete.

A possible result is an unnecessary navigation or verification.

### False negative

The algorithm says:

```text
this activity or chapter may be skipped
```

but it contains unfinished work.

The result may be a later target or an incorrect "everything completed" conclusion.

For "Find the first incomplete activity", false negatives are generally more costly.

Thus the preferred policy is:

```text
uncertainty → perform an additional check
```

rather than:

```text
uncertainty → skip permanently
```

---

# Part VII — When the API is not enough

## 16. Visual fallback is not algorithm failure

If a lesson response remains incomplete after retries, PlumePilot does not necessarily restart its search:

```js
if (!lesson.ok) {
  return {
    status: "target",
    entry,
    unfinishedItem: null,
    visualVerification: true,
  };
}
```

Source: `content.js`, around lines 5979–5995.

The algorithm has already established something valuable:

```text
this is a candidate that cannot be safely ruled out
```

Instead of:

```text
API failure
→ discard progress
→ restart from chapter 1
```

it can do:

```text
uncertain API data for module 12
→ open module 12
→ verify visually
```

This is a **targeted fallback**.

---

## 17. Global versus local fallback

### Global

```text
module 12 could not be verified
        ↓
restart at module 1
        ↓
recheck modules 1–11
```

### Local

```text
module 12 could not be verified
        ↓
open module 12
        ↓
verify it
```

The local version preserves work that has already been completed.

This is a valuable general principle for robust pipelines and distributed systems:

> **When one stage fails, preserve as much already verified information as possible.**

---
