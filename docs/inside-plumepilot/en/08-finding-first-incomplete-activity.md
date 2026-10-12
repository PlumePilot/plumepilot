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


# Part VIII — Remember what has already been verified

## 18. `verifiedCompleteChapters`

Suppose the visual fallback opens a candidate and discovers that it is actually complete. We should not discard that evidence and start over.

The code preserves a list:

```js
verifiedCompleteChapters: [
  ...(options.verifiedCompleteChapters || []),
  nextIdentity,
]
```

When building `discoveryOrder`, already verified chapters are excluded:

```js
!(options.verifiedCompleteChapters || []).some((identity) =>
  sameChapterIdentity(outline[index].identity, identity)
)
```

This is a small example of **negative memoization inside a workflow**:

```text
this chapter has already been verified complete
→ do not pay for the same check again
```

It is not a persistent global cache. It is local memory for the current search.

---

# Part IX — Finding the chapter is not yet navigation

## 19. Selecting the candidate does not complete the job

Once the algorithm identifies a candidate:

```js
nextIdentity = apiDiscovery.entry.identity;
```

PlumePilot must turn that logical identity into an action on a live page:

```text
candidate identity
    ↓
openChapter()
    ↓
wait for rendering
    ↓
reacquire current chapter
    ↓
select exact activity
```

The DOM can change between each step. The implementation therefore waits for the freshly rendered chapter:

```js
let chapterReady = await waitFor(() => {
  const fresh = findChapter(nextIdentity);
  if (!fresh) return null;

  const rows = chapterRows(fresh);
  return rows.length > 0 ? fresh : null;
});
```

This connects Chapter 08 directly to the dynamic-DOM lessons from Chapter 03. Even a perfect search plan requires careful execution in an asynchronous, changing interface.

---

## 20. API evidence versus DOM evidence

During bookmark-style search, PlumePilot chooses how to identify the activity.

When the API has already identified it precisely:

```js
const activity = apiUnfinishedItem || ...;
```

When more verification is needed:

```js
visibleIncompleteActivity(nextIdentity, apiVerifiedActivities)
```

The overall information flow is:

```text
API
 ↓
provides evidence
 ↓
DOM
 ↓
confirms or supplements it
```

Neither source automatically replaces the other. The algorithm combines them according to their strengths.

---

## 21. Do not overwrite strong evidence with weak evidence

A real code comment captures this principle:

```js
// Missing sidebar percentages are unknown, not 0%. A verified API
// target must not be replaced by a completed Obiettivi row in the DOM.
```

When integrating information sources, we need an **evidence precedence** rule.

For example:

```text
verified API: Video B = 42%
incomplete DOM rendering: percentage unavailable
```

The missing visual percentage must not be reinterpreted as zero or used to discard the already verified API target.

> **A weaker signal should not erase stronger evidence merely because it was observed later.**

---

# Part X — Tests are a different kind of target

## 22. Activities do not all have the same semantics

A chapter may contain:

```text
Objectives
videos
Test
```

The search respects user preferences and the type of activity requiring attention.

A pending test may become the target:

```js
const testNeedsAttention =
  Boolean(test) &&
  (options.bookmarkSearch
    ? pendingTest
    : ...);
```

Later:

```js
if (activity?.contentType === "test") {
  const test = getEndOfLessonTest(chapterReady);
  ...
  test.scrollIntoView(...);
  return true;
}
```

So the result is not necessarily:

```text
click a video
```

It can mean:

```text
bring the user to the test
```

This is a search across **heterogeneous elements** that share one abstract property—needing attention—but require different final actions.

---

# Part XI — Concurrency and cancellation

## 23. A long-running search can become obsolete

At the start of discovery:

```js
smartResumeRunning = true;
const generation = ++smartResumeGeneration;
```

The code defines:

```js
const isCancelled = () =>
  generation !== smartResumeGeneration ||
  courseCode !== courseCodeFromUrl() ||
  !enabled ||
  busy;
```

Source: `content.js`, `startFirstIncompleteDiscovery()`.

The counter is a **generation token**.

Suppose:

```text
search A starts
    ↓
await API
    ↓
user changes application state
    ↓
search B starts
```

When A resumes, it must not be allowed to manipulate the page.

Compare:

```text
A's generation
```

with:

```text
current generation
```

If they differ:

```text
A is stale
→ stop
```

This resembles an optimistic-concurrency token: a continuation must prove that it still belongs to the currently authorized operation.

---

## 24. Why `smartResumeRunning` is not enough

A Boolean can answer:

```text
is a search running?
```

but not:

```text
which search is this callback from?
```

A generation counter adds temporal identity:

```text
run 17
run 18
run 19
```

An asynchronous continuation from run 17 cannot accidentally become valid during run 19.

The two mechanisms protect different properties:

```text
Boolean running guard
→ prevents overlapping starts

generation token
→ invalidates continuations from older runs
```

---

# Part XII — How the algorithm evolved

## 25. Version 2.14.4 — Smart sequential search

The changelog records an early form of smart resume:

```text
cached outline
→ skip completed chapters/videos
→ consider Objectives
→ find first video below 100%
```

That was already better than navigating blindly through every activity, but it still depended heavily on detailed sequential checks and the rendered UI.

---

## 26. Version 2.14.7 — Course-index-assisted discovery

The course completion index was introduced.

The idea:

```text
aggregate index
→ avoid expensive detail checks for unlikely modules
```

The changelog describes reusing the index already loaded by the page, skipping modules reported as 100%, checking candidates below 100%, and using visual fallback when detailed verification was unavailable.

This established the architecture:

```text
index → candidate → detail / fallback
```

---

## 27. Version 2.15.0 — From saved preference to one-shot command

The feature also changed its product semantics.

Previously:

```text
Start from the first incomplete activity
```

was a persistent preference.

It became:

```text
Find the first incomplete activity
```

an explicit user action.

That change matters algorithmically. The feature is no longer a policy automatically applied at every startup. It becomes:

```text
user query
→ search from the beginning
→ navigate to the result
```

Essentially, a smart bookmark.

---

## 28. Version 2.15.3 — Master-index-first

To reduce work further, the master index became the main tool for choosing a candidate.

Conceptually:

```text
find first percentage below 100%
→ map it to a visible chapter
→ open the precise target
```

Very efficient—but later observations exposed the risks of treating a summary as definitive.

---

## 29. Version 2.35.1 — Prioritize with the index, do not treat it as dogma

The newer algorithm takes a more conservative route:

```text
1. force a master refresh
2. build course outline
3. construct discovery order
4. prioritize chapters below 100%
5. verify candidates
6. inspect chapters reported at 100% if needed
7. use detail APIs
8. use targeted visual fallback when needed
```

This is the most instructive design.

The optimization remains, but becomes **reversible**:

```text
heuristic works
→ very fast
```

If the heuristic fails to identify a valid target:

```text
second pass
→ continue verification
```

A fast path is useful; preserving an alternative correctness path makes the system more resilient.

---

# Part XIII — Cost analysis

## 30. Naive cost model

With `N` chapters:

```text
N DOM openings
N render waits
potentially N detail requests
```

A rough model is:

```text
T_naive ≈ N × (DOM + render + network)
```

This is not an exact benchmark; it makes the relative cost sources visible.

---

## 31. Index-assisted cost model

Suppose:

```text
N = 40 chapters
K = 3 candidates below 100%
```

The master index requires approximately one retrieval.

Then:

```text
1 master request
+ up to K detail verifications
+ 1 target DOM opening
```

In a favorable case:

```text
T ≈ index + K × detail + 1 × DOM
```

The improvement can be substantial even if building and filtering the arrays remains `O(N)`.

The expensive operations—not the small in-memory loop—have been reduced.

---

## 32. Worst case

The unfavorable case might involve a stale master index, candidates below 100% that turn out complete, a second pass over entries reported as 100%, detail requests requiring retries, incomplete responses, and visual verification.

The cost may approach a full scan.

But that is often a desirable property: optimize the **common case** without deliberately removing the **thorough verification path**.

---

# Part XIV — The strategy in pseudocode

## 33. Simplified version of the current strategy

The following is **illustrative pseudocode, not a verbatim PlumePilot function**:

```js
async function findFirstIncomplete(course) {
  const outline = await getOutline(course);
  const master = await getFreshMasterIndex(course);

  const candidates = partitionStable(
    outline,
    chapter => masterPercentage(chapter) < 100 || !isMapped(chapter)
  );

  const verifiedComplete = new Set();

  for (const chapter of candidates) {
    if (verifiedComplete.has(chapter.id)) continue;

    const detail = await getLessonDetail(chapter);

    if (!detail.isReliable) {
      const visual = await verifyVisually(chapter);

      if (visual.target) return visual.target;

      verifiedComplete.add(chapter.id);
      continue;
    }

    const target = firstIncompleteActivity(detail);

    if (target) return target;
  }

  return null;
}
```

This does not reproduce every guard, retry, user preference, or navigation detail. It illustrates the separation of outline, index, ordered candidates, detail checks, and local fallback.

---


# Part XV — An information-retrieval problem

## 34. Precision and recall as a mental model

Without turning PlumePilot into a machine-learning system, we can borrow two concepts from information retrieval.

### Precision

Among the candidates we choose to inspect, how many actually contain unfinished work?

### Recall

Among all genuinely incomplete chapters, how many does the search avoid missing?

An aggressive index filter might provide:

```text
high precision
low checking cost
but imperfect recall
```

The second pass over entries reported as 100% improves recall by preserving candidates excluded from the fast path.

In simplified terms:

```text
master-prioritized pass
→ speed

additional verification pass
→ resilience against missed candidates
```

It is a common trade-off in search systems.

---

# Part XVI — What this algorithm teaches us

## 35. An index reduces the search space

The index does not have to contain the entire truth.

It may be enough to transform:

```text
40 chapters
    ↓
3 candidates worth checking immediately
```

This is valuable even when a fallback is still required.

---

## 36. Domain order comes before heuristic order

We are not searching for:

```text
the lowest completion percentage
```

but:

```text
the first incomplete activity
```

Thus any prioritization strategy must be judged against the pedagogical ordering requirement, not only average speed.

---

## 37. Unknown must remain unknown

One of the most dangerous errors in real systems is a silent conversion such as:

```text
missing → false
missing → 0
missing → completed
```

If the system does not know a value, **unknown** may be the only honest representation.

---

## 38. The best optimizations are reversible

A good optimization says:

```text
try the cheaper path first
```

not:

```text
delete the more expensive path permanently
```

Here:

```text
master below 100% → first pass
master at 100%    → second pass when needed
```

is more resilient than:

```text
master at 100% → never check again
```

---

## 39. Preserve previously verified work

When module 12 cannot be verified:

```text
do not restart at module 1
```

Open module 12.

If module 12 turns out to be complete:

```text
remember that within the current search
```

Then continue.

This eliminates redundant checks and keeps fallbacks local.

---

## 40. Separate discovery from execution

Discovery answers:

```text
where should I go?
```

DOM interaction answers:

```text
how do I get there?
```

These are distinct responsibilities.

They are still intertwined in parts of the existing implementation, but conceptually we could separate them:

```text
Discovery Engine
    ↓
Target
    ↓
Navigation / DOM Adapter
```

That could be a future architectural evolution, without implying that a refactor is necessary now.

---

# Part XVII — What we might model differently today

## 41. An explicit `DiscoveryCandidate`

A model could make information provenance clearer:

```ts
type DiscoveryCandidate = {
  chapter: ChapterIdentity;
  lessonNumber: number;
  masterPercentage: number | null;
  confidence: "indexed" | "detailed" | "visual";
  activity?: ActivityIdentity;
  needsVisualVerification: boolean;
};
```

This would give the candidate an explicit confidence/source field rather than relying on loosely related flags.

---

## 42. A result type instead of scattered flags

For example:

```ts
type DiscoveryResult =
  | { type: "target"; candidate: DiscoveryCandidate }
  | { type: "end" }
  | { type: "cancelled" }
  | { type: "unavailable"; reason: string };
```

The current JavaScript already represents something similar implicitly:

```text
status: target
status: end
status: cancelled
status: fallback
```

The lesson is not "rewrite PlumePilot in TypeScript." It is:

> **When an algorithm can end in semantically different ways, representing those outcomes explicitly reduces ambiguity.**

---

# Part XVIII — Testing the search algorithm

## 43. The happy path is not enough

A useful test matrix should include at least:

| Scenario | Master | Detail | DOM | Expected behavior |
|---|---|---|---|---|
| First module incomplete | below 100% | valid | — | Target in module 1 |
| First four complete | `100,100,100,100,<100` | valid | — | Target in module 5 |
| Stale master | all 100% | module 3 incomplete | — | Module 3 found during second pass |
| Missing mapping | entry without route | — | valid | Targeted visual verification |
| Incomplete detail | below 100% | exhausted retries | valid | Visual verification of candidate |
| False candidate | below 100% | complete | complete | Continue without a full restart |
| Missing DOM percentage | below 100% | partial | unknown | Do not invent 0% |
| Cancelled search | any | await in progress | — | No navigation |
| Course changes | any | await in progress | — | Old run invalidated |
| Pending test | below 100% | pending test | valid | Bring test into view |

This kind of matrix often reveals more than line coverage alone, because it tests the relationship between **evidence, decisions, and actions**.

---

# Part XIX — A backend developer's analogy

Imagine a very large database table:

```sql
SELECT *
FROM activities
WHERE completed = false
ORDER BY course_order
LIMIT 1;
```

Without a useful index, the database may need to examine many rows.

PlumePilot faces a similar problem, but the information is spread across:

```text
master endpoint
lesson endpoint
local cache
DOM
```

The course index acts like a **coarse index**. A lesson detail request resembles fetching the complete row. The DOM is like a legacy subsystem we can inspect when structured data is insufficient.

This is not a perfect analogy. There is no full query planner, and PlumePilot does not have a transactionally consistent snapshot across all sources.

But the principle transfers well:

> **Start with the cheapest representation that meaningfully narrows the search; access expensive detail only for promising candidates.**

---

# Part XX — Concepts to carry forward

## 1. Index and source of truth are different concepts

An index can be tremendously useful even when it is not fully authoritative.

---

## 2. Reordering checks is different from eliminating candidates

```text
check chapters below 100% first
```

is safer than:

```text
never check chapters reported at 100%
```

---

## 3. The important cost is often I/O, not CPU

Avoiding DOM openings and HTTP requests can save far more time than micro-optimizing one JavaScript loop.

---

## 4. Unknown is not false

The absence of information must remain representable, rather than being silently converted into a known outcome.

---

## 5. The best fallbacks are local

When module 12 cannot be verified, inspect module 12. Do not restart at module 1.

---

## 6. Preserve verified evidence

`verifiedCompleteChapters` avoids repeating checks that already produced trustworthy results.

---

## 7. Asynchronous operations must be allowed to become stale

Generation tokens and cancellation guards prevent obsolete searches from acting on the page.

---

## 8. Discovery and execution are conceptually distinct responsibilities

```text
discover target
    ↓
navigate to target
```

is a cleaner model than treating decision-making and DOM manipulation as an inseparable operation.

---

# Part XXI — Exercises

## Exercise 1 — Stable partition

Given:

```js
const chapters = [
  { id: 1, percentage: 100 },
  { id: 2, percentage: 75 },
  { id: 3, percentage: 100 },
  { id: 4, percentage: 20 },
];
```

Produce the order:

```text
[2, 4, 1, 3]
```

without sorting numerically by percentage. Preserve the relative ordering within both groups.

---

## Exercise 2 — Why can `sort()` be semantically wrong?

Explain why:

```js
chapters.sort((a, b) => a.percentage - b.percentage);
```

does not correctly express "first incomplete activity."

---

## Exercise 3 — Three-valued knowledge

Represent progress as:

```ts
"complete" | "incomplete" | "unknown"
```

rather than a Boolean.

Which parts of the algorithm become easier to express?

---

## Exercise 4 — Worst case

Imagine 50 chapters and a master index that incorrectly reports everything at 100%.

How many detailed verifications might be required to preserve thoroughness? Why is this worst-case degradation acceptable?

---

## Exercise 5 — A query planner

Sketch three plans:

```text
DOM-first
API-detail-first
master-index-first
```

For each, compare the number of requests, number of DOM openings, reliability, and behavior when data is stale.

---

# Part XXII — Further reading

For the JavaScript data operations used directly in this algorithm:

- MDN — `Array.prototype.find()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find

- MDN — `Array.prototype.filter()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

- MDN — `Map`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

Studying relational database indexes and query planning will also provide useful analogies. Keep in mind, however, that PlumePilot is not implementing a database management system.

---

# Part XXIII — In the next chapter

We now understand how PlumePilot decides **which information to retrieve, and in which order**.

Chapter 09 changes the kind of problem completely:

**Generating PDF, HTML, and EPUB in the browser.**

We will study a pipeline from course structures and resource URLs to downloadable binary files:

```text
collection
    ↓
normalization
    ↓
asset fetching
    ↓
parsing
    ↓
transformation
    ↓
layout / reflow
    ↓
serialization
    ↓
Blob / download
```

And we will ask a very practical question when the browser processes tens or hundreds of megabytes:

> **What does it mean to use the browser not merely as a user interface, but as a full document-generation runtime?**

---

[← 07 — Autoplay as a state machine](07-autoplay-as-a-state-machine.md) · [Contents](index.md) · [09 — Generating PDF, HTML, and EPUB →](09-generating-pdf-html-and-epub.md)
