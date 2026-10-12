# 03 — DOM and dynamic pages

## Working inside a UI we do not control

In the previous chapter, we followed messages as they crossed the popup, background, bridge, and `MAIN` world.

Now PlumePilot faces a harder task: **understanding a web page built by someone else while that page keeps changing**.

We could describe a content script as code that "reads the DOM and clicks elements." Technically true—but not very helpful. The difficult questions are:

- Does the element already exist, or will it be rendered later?
- Does the DOM accurately represent the platform's actual state?
- Is a node saved five seconds ago still part of the current document?
- Does a closed accordion mean its chapter does not exist, or only that its contents are not rendered?
- Do two chapters with the same number represent the same chapter?
- After `.click()`, when has the action actually taken effect?
- Do timeouts mean the same thing in a hidden tab?
- Can an old DOM reference survive a sidebar rebuild?

These are not PlumePilot-specific questions. They arise in extensions, userscripts, end-to-end tests, interactive scrapers, automation, accessibility tools, and integrations with legacy applications.

The central lesson is:

> **The DOM is a temporary representation of application state, not necessarily the application state itself.**

---

# Part I — The DOM is not a database

## 1. What exactly is the DOM?

When the browser parses HTML, it builds a tree of JavaScript objects.

For example:

```html
<div class="course">
  <div class="chapter">
    <span>1 - Introduzione</span>
  </div>
</div>
```

can be visualized as:

```text
Document
└── div.course
    └── div.chapter
        └── span
            └── "1 - Introduzione"
```

JavaScript can traverse and modify that tree:

```js
document.querySelector(".chapter");
```

The result is an `Element` representing **that particular node at that particular moment**.

A modern frontend may do this:

```text
application state changes
         ↓
frontend recalculates UI
         ↓
old nodes are removed
         ↓
new nodes are created
```

The user may still see "1 - Introduzione", even though JavaScript now faces a different object.

The text is the same. **The DOM identity is not.**

---

## 2. A DOM reference is not a logical identity

Suppose we write:

```js
const row = document.querySelector(".lesson");
```

Later the platform refreshes its sidebar:

```text
row variable ───────► old, detached node

current DOM ────────► new node representing the same lesson
```

The variable still holds a valid JavaScript object. It just may not belong to the active document any longer.

This is a **stale reference**: once valid, now disconnected from the current UI.

```text
DOM identity       ≠       domain identity

"this exact div"   ≠       "this exact lesson"
```

A lesson is a domain concept. A `div` is one of its temporary representations.

---

## 3. First real example: `lessons()`

PlumePilot finds lesson rows in `content.js`:

```js
function lessons() {
  return [...document.querySelectorAll("div.border-t")].filter((x) =>
    x.querySelector(":scope > div.cursor-pointer"),
  );
}
```

Source: [`content.js` L647–L651](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L647-L651).

Notice what the code **does not** do: it does not cache an initial `NodeList` globally and reuse it forever. Each call to `lessons()` queries the **current DOM**. That small choice matters a great deal in a dynamic application.

---

## 4. `querySelectorAll()` returns a static snapshot

`querySelectorAll()` returns a **static**, not live, `NodeList`:

```js
const rows = document.querySelectorAll(".lesson");
```

If the DOM changes later, the collection does not automatically include the new elements. PlumePilot immediately turns the list into an array:

```js
[...document.querySelectorAll(...)]
```

Think of it as a snapshot:

```text
t0: DOM = A B C
querySelectorAll() → [A, B, C]

t1: DOM = A D C
old collection     → [A, B, C]
new query          → [A, D, C]
```

The old collection does not acquire `D`, and `B` might have been detached.

Functions such as `lessons()`, `chapters()`, and `sections()` are therefore not merely convenience helpers: they are **readers of the current rendered state**.

### Further reading

MDN documents this non-live behavior: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll

---

# Part II — Selectors are implicit contracts

## 5. A CSS selector can become a software dependency

Consider:

```js
document.querySelectorAll("div.border-t");
```

The `.border-t` class belongs to the host platform, not to PlumePilot. Our code implicitly assumes:

```text
the platform will continue to render lesson rows
using a structure compatible with this selector
```

There is no documented versioned API guaranteeing this class will still exist tomorrow. That makes DOM integration inherently more fragile than integration against a stable, versioned contract.

---

## 6. Syntactic versus semantic selectors

Compare two approaches.

### Strongly structural selector

```js
div > div:nth-child(3) > div:nth-child(2) > span
```

### More semantic selector

```js
[aria-label="lesson-progress"]
```

The first depends heavily on layout; the second expresses meaning.

Ideally, a host page would provide stable semantic hooks—documented IDs, dedicated `data-*` attributes, roles, accessible labels, URLs, or domain identifiers.

When we do not control the page, those hooks may be unavailable. PlumePilot has to combine:

```text
CSS classes
relative structure
visible text
URLs
icons
visual state
API data
```

There is no universally perfect selector. The useful question is:

> **Which combination of signals is stable enough for the operation we need?**

---

## 7. `:scope` reduces ambiguity

`lessons()` uses:

```js
x.querySelector(":scope > div.cursor-pointer")
```

In CSS, `>` means *direct child* and `:scope` refers to the element on which the query is being executed.

We are not asking whether any clickable descendant exists somewhere. We are checking for the **expected clickable direct child**:

```text
row
└── wrapper.cursor-pointer        ✓
```

versus:

```text
row
└── some unrelated wrapper
    └── nested widget
        └── .cursor-pointer       ✗
```

The selector encodes a small structural expectation and reduces false positives.

---

## 8. `closest()` recovers an element's context

In Mercatorum chapter identification, PlumePilot uses:

```js
const clickable =
  span.closest("div.cursor-pointer.relative.align-middle") ||
  span.closest("div.cursor-pointer");
```

Source: [`content.js` L1180–L1198](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1180-L1198).

`closest()` starts at a node and walks upward through its ancestors until it finds a match:

```text
clickable div
└── wrapper
    └── span "3 - Title"
         ▲
         └── start here
```

The meaningful text may be in a `span`, while the actual interactive component is a parent. This is exactly where `closest()` helps.

MDN: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

---

# Part III — One domain, multiple DOM structures

## 9. `sections()` is already a small cross-platform adapter

A markup structure that seems universal when supporting only Pegaso may stop being universal when adding Mercatorum and San Raffaele.

Consider:

```js
function sections() {
  const nativeSections = pegasoStyleSections();
  if (nativeSections.length) return nativeSections;

  const fallbackChapters = mercatorumChapterRows();
  if (!fallbackChapters.length) return [];

  return [{
    outer: document.documentElement,
    header: null,
    span: fallbackChapters[0].clickable,
    text: MERCATORUM_STATIC_SECTION,
    static: true,
  }];
}
```

Source: [`content.js` L1201–L1213](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1201-L1213).

The rest of the algorithm wants to reason about:

```text
sections
  └── chapters
      └── activities
```

But the host platforms do not expose exactly the same UI hierarchy. Instead of spreading platform-specific conditions throughout the code, `sections()` returns a **common conceptual shape**.

The host says, "I render the course like this." PlumePilot translates that into, "For my domain, this is a section."

This is the beginning of a **DOM adapter**.

---

## 10. Normalize first, reason afterward

Backend integrations with multiple providers have the same challenge:

```text
Provider A → customer_id
Provider B → userCode
Provider C → account.id
                 ↓
          { customerId }
```

An application layer is easier to maintain when it receives one conceptual representation.

Likewise:

```text
Pegaso DOM ────────┐
                   ├──► PlumePilot's conceptual model
Mercatorum DOM ────┘
```

This separation will return when we discuss how we might structure PlumePilot if we were designing it today.

---

# Part IV — The problem of time

## 11. `document_idle` does not mean "application ready"

The manifest loads `content.js` using:

```json
"run_at": "document_idle"
```

It is tempting to assume:

```text
content.js starts → page is ready
```

But `document_idle` describes extension injection timing, not the readiness of the host application's asynchronous data or UI.

A single-page application may progress through:

```text
initial HTML available
        ↓
content script starts
        ↓
application fetch
        ↓
API response
        ↓
chapters rendered
        ↓
active lesson rendered
```

At time `t0`:

```js
chapters().length === 0
```

At `t0 + 800 ms`:

```js
chapters().length === 42
```

Neither observation is necessarily incorrect; they describe different moments.

---

## 12. A real regression: initially empty DOM

PlumePilot's changelog preserves a useful case from v2.14.5:

- The course structure was rendered asynchronously.
- The "first incomplete activity" algorithm ran before the active lesson row existed.
- An initially empty DOM was interpreted as a definitive failure.

Historical source: [`CHANGELOG.md` L793–L799](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L793-L799).

The critical distinction is:

```text
"not found now"
       ≠
"does not exist"

"not found now" may mean "not rendered yet"
```

These are semantically different states.

---

## 13. The three-state problem

Many DOM bugs originate in treating readiness as a binary decision:

```text
found / not found
```

The actual states may be:

```text
FOUND
NOT_READY_YET
DEFINITELY_MISSING
```

An empty `chapters()` result could mean:

1. The course truly has no chapters.
2. We are on the wrong page.
3. The frontend has not rendered them.
4. The platform changed its markup and broke our selectors.

We cannot distinguish these cases from the empty array alone. We also need **application context and timing**.

---

# Part V — Wait for a condition, not an arbitrary number

## 14. `waitFor()`

PlumePilot has a deceptively simple central utility:

```js
async function waitFor(fn, timeout = WAIT_MS) {
  let start = Date.now();

  while (Date.now() - start < timeout) {
    const x = fn();

    if (x) {
      return x;
    }

    await sleep(100);
  }

  return null;
}
```

The real version also accounts for page visibility. The core pattern is shown here.

Source: [`content.js` L1577–L1609](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1577-L1609).

Instead of:

```js
await sleep(2000);
const chapter = findChapter(...);
```

we can use:

```js
const chapter = await waitFor(() => findChapter(...));
```

The conceptual difference is substantial.

---

## 15. Fixed delay versus conditional waiting

### Fixed delay

```text
wait exactly 2 seconds → try
```

If the UI is ready in 100 ms, we waste 1.9 seconds. If it is ready after 2.1 seconds, we fail anyway.

### Conditional waiting

```text
every 100 ms:
    is the condition true?
        yes → proceed immediately
        no  → retry until timeout
```

Now the timeout is a **deadline**, not a guess about how long rendering should take.

---

## 16. Polling

`waitFor()` implements **polling**: checking a condition repeatedly at a defined interval.

```text
t0       check → false
t0+100   check → false
t0+200   check → true → continue
```

Polling can seem less elegant than an event, but a system we do not control may not expose any reliable event. Polling can be robust when it is:

- bounded by a deadline;
- performed at a sensible interval;
- driven by a precise condition.

---

## 17. When would an event be preferable?

If we owned the host application, it might expose:

```js
courseStore.on("chaptersLoaded", callback);
```

or:

```js
window.dispatchEvent(new CustomEvent("course-ready"));
```

PlumePilot does not own such a contract and must infer readiness using observable signals:

```text
DOM / URL / video / API / MutationObserver / polling
```

This illustrates the difference between **software that owns state** and **software that observes another system's state**.

---

# Part VI — `MutationObserver`: knowing that something changed

## 18. Why an initial scan is not enough

Toward the end of `content.js`:

```js
function scan() {
  document.querySelectorAll("video").forEach(attach);
  const activeRow = currentLesson();
  if (activeRow) rememberPlaybackLesson(activeRow);
  scheduleSessionConflictScan();

  if (!courseProgressState || courseProgressState.baselinePercent === null) {
    scheduleCourseProgressInitialization(250);
  }
}

new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

scan();
```

Source: [`content.js` L7066–L7090](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L7066-L7090).

The sequence combines an initial scan with observation of later changes. The video we need **might not exist when PlumePilot starts**.

---

## 19. `MutationObserver`

`MutationObserver` is a browser API for observing DOM changes.

The configuration:

```js
{
  childList: true,
  subtree: true,
}
```

means:

```text
childList → detect added and removed children
subtree   → include descendants, not just direct children
```

The observed target is `document.documentElement`, essentially the whole document.

MDN: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

---

## 20. Mutation notification is not semantic understanding

An observer can tell us that a node was added. It does not know that the node is "the new video player for lesson 7."

PlumePilot handles this by running:

```js
scan();
```

rather than attempting to interpret the domain meaning of each mutation record.

```text
DOM mutation notification
          ↓
"something may have changed"
          ↓
recompute the relevant view of state
```

---

## 21. An observer as an invalidation signal

Think of the observer as a cache invalidation signal:

```text
"I know which video elements exist"
          ↓
DOM mutation
          ↓
"that knowledge might be stale"
          ↓
scan()
```

The notification is not necessarily the new truth. It tells us **when we may need to read again**.

---

# Part VII — Attaching to elements that appear later

## 22. `document.querySelectorAll("video").forEach(attach)`

The scan attaches playback behavior to the currently available video elements:

```js
document.querySelectorAll("video").forEach(attach);
```

This handles the lifecycle:

```text
PlumePilot starts
    ↓
no <video> exists
    ↓
frontend loads the lesson
    ↓
creates <video>
    ↓
MutationObserver
    ↓
scan()
    ↓
attach(video)
```

Without later observation, the first scan that found zero videos might also be the last.

---

## 23. But a global observer can be expensive

Watching `document.documentElement` with `subtree: true` may produce notifications about changes unrelated to autoplay:

```text
tooltips
counters
animations
notifications
menus
unrelated components
```

Callbacks should therefore be inexpensive, or observations should be coalesced/debounced where appropriate.

PlumePilot's scan is reasonably focused, but the general trade-off remains:

> **Broad observation is convenient, but increases the number of invalidations we must absorb.**

---

## 24. Specific versus general observers

### Strategy A — Broad observation

```js
observe(document.documentElement, {
  childList: true,
  subtree: true,
});
```

Advantages: it works no matter where the new component appears, and survives large subtree replacements.

Disadvantages: more notifications; the callback must filter irrelevant changes.

### Strategy B — Narrow observation

```js
observe(sidebar, {
  childList: true,
  subtree: true,
});
```

Advantages: less noise and clearer semantics.

Disadvantages: if the sidebar itself is replaced, we may be watching a detached node; we also need the sidebar to exist before observing it.

On a poorly documented, highly dynamic host page, broad observation can be the pragmatic choice.

---

# Part VIII — A node can disappear while we wait

## 25. Autoplay and closed accordions

Consider a lesson finishing. PlumePilot must:

```text
1. confirm completion
2. find the current lesson
3. find the next lesson
4. open it
```

This looks simple until the platform updates the sidebar during the wait, or the user closes an accordion.

The v2.35.1 changelog explicitly describes better recovery with closed accordions, handoff from Objectives, and chapter routing.

Historical source: [`CHANGELOG.md` L3–L10](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L3-L10).

A comment in `content.js` explains the deeper reason:

```js
// Completion can update the sidebar or the user can close its accordion
// while we wait. Keep the identity so a detached row is never used for
// finding the next activity after the wait.
const completedLesson = playbackContext;
```

Source: [`content.js` L6680–L6683](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6680-L6683).

---

## 26. The detached-node problem

Suppose `cur` is the selected lesson row:

```js
const cur = currentLesson();
```

We then await completion:

```js
await waitForLessonCompletion(cur, video);
```

Meanwhile:

```text
old sidebar                new sidebar
└── row A ← cur     →       └── row B ← same logical lesson
```

The variable still points to row A. Calling:

```js
nextLesson(cur);
```

might calculate the successor from a **DOM structure that no longer exists in the active page**.

---

## 27. Save the identity, not just the node

PlumePilot records a playback context:

```js
playbackContext = {
  videoElement,
  courseCode: courseCodeFromUrl(),
  lessonNumber: lessonNumberFromUrl(),
  identity,
  name: lessonName(row),
  index,
};
```

Source: [`content.js` L663–L677](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L663-L677).

It stores more than the DOM node. It preserves identifying information:

```text
courseCode
lessonNumber
chapter identity
lesson name
index
```

The pattern is:

```text
fragile object reference
          ↓
extract relatively stable identity
          ↓
resolve that identity against the current DOM when needed
```

---

## 28. `recoverPlaybackLesson()`

The recovery function makes this explicit:

```js
async function recoverPlaybackLesson(videoElement) {
  const visible = currentLesson();

  if (visible) {
    rememberPlaybackLesson(visible, videoElement);
    return visible;
  }

  const context = playbackContext;

  // verify the context still belongs to the current course/module
  // ...

  if (!(await openChapter(context.identity))) return null;

  const row = await waitFor(() => playbackLessonRow(context));

  if (row) rememberPlaybackLesson(row, videoElement);
  return row;
}
```

Source: [`content.js` L691–L705](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L691-L705).

The decision tree:

```text
is the current row still visible?
     ├── yes → use the current version
     └── no
           ↓
     do we have stored identity?
           ↓
     reopen the chapter
           ↓
     locate the row in the new DOM
```

Much safer than keeping an element from before an asynchronous operation and using it without revalidation.

---

## 29. The general pattern: resolve late

Instead of:

```text
resolve DOM node → wait five seconds → use old node
```

prefer:

```text
save logical identity → wait → resolve current DOM node → use it
```

### A backend developer's analogy

Compare:

```js
const user = await repo.findById(id);
await longExternalOperation();
// assume user still reflects current state
```

with:

```js
const userId = id;
await longExternalOperation();
const freshUser = await repo.findById(userId);
```

The mechanisms differ, but the mental model is similar: an object obtained earlier may not describe the current world.

---

# Part IX — Clicking does not mean the action is complete

## 30. `.click()` starts a transition

In `openSection()`, PlumePilot does:

```js
section.span.scrollIntoView({ block: "center", behavior: "instant" });
section.span.click();
```

It does not immediately return success. Instead:

```js
const opened = await waitFor(() => {
  section = getSection();
  return isOpen() && section ? section : null;
});
```

Source: [`content.js` L1668–L1705](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1668-L1705).

```text
.click()
    ↓
transition requested
    ↓
frontend reacts
    ↓
DOM changes
    ↓
PlumePilot verifies the resulting state
```

A successful method call is not proof of a completed UI transition.

---

## 31. Command plus verification

The pattern is:

```text
COMMAND
   ↓
WAIT
   ↓
VERIFY
```

For example, click a chapter, wait, then verify that its expanded-state indicator exists.

This resembles the need to send an instruction in a distributed system and wait for the resulting state to converge. The UI is local, but the timing problem is comparable.

---

## 32. Why not read immediately after the click?

This is fragile:

```js
chapter.span.click();
return isChapterOpen(identity);
```

The click handler may schedule a state update and a later render:

```text
event handler → framework state update → render scheduling → DOM update
```

The DOM does not necessarily reflect the new state on the very next JavaScript line. PlumePilot waits for an observable result instead.

---

# Part X — Verify against the current DOM

## 33. Notice `getSection()` inside the polling loop

`openSection()` defines:

```js
const getSection = () =>
  sections().find((section) => section.text === sectionText);
```

And during the wait:

```js
section = getSection();
```

Why not reuse the original `section`? The click may have caused a DOM rebuild. The code reconstructs a **fresh representation** using the stable-enough identifier:

```text
logical identity: sectionText
current representation: getSection()
```

---

## 34. The `fresh` prefix is not accidental

Variables such as:

```js
fresh
freshModal
freshTest
```

express a recurring concern:

> After asynchronous work, read the DOM again instead of assuming an old element is still authoritative.

This is more than a naming convention; it is a useful discipline for dynamic UIs.

---

# Part XI — Closed accordion: not rendered does not mean nonexistent

## 35. Local virtualization and conditional rendering

An accordion may not keep all descendants in the rendered tree.

Closed:

```text
Chapter header
```

Open:

```text
Chapter header
├── Video 1
├── Video 2
├── Test
└── Objectives
```

A failed query for a lesson row may therefore mean that the relevant container is closed—not that the lesson does not exist.

```text
logical state ≠ rendered state
```

---

## 36. `openChapter()` treats opening as a precondition

PlumePilot checks whether the chapter is open:

```js
const isOpen = () => {
  const fresh = getChapter();
  if (!fresh) return false;

  const outer = getOuterChapter(fresh);
  return !!outer?.querySelector('[id*="chevron-up"]');
};
```

If necessary, it clicks the chapter and waits for a fresh open-state reading:

```js
chapter.span.click();

const readOpenedChapter = () => (isOpen() ? getChapter() : null);
const opened = await waitFor(readOpenedChapter);
```

Source: [`content.js` L5502–L5561](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L5502-L5561).

The chapter must reach the precondition `OPEN` before its rendered descendants can be queried reliably.

---

## 37. Precondition recovery

The general pattern is:

```text
want to perform X
       ↓
is prerequisite P satisfied?
       ├── yes → perform X
       └── no  → recover P
                    ↓
                 verify P
                    ↓
                 perform X
```

In PlumePilot, finding a lesson may first require opening and verifying its chapter. This is a form of **local self-healing**.

---

# Part XII — A rendered element can be a stronger signal than a hidden one

## 38. Reading the course percentage

PlumePilot reads a visible percentage through a multi-stage filter:

```js
function readPegasoCoursePercentage() {
  const candidates = [...document.querySelectorAll("div.percent")]
    .filter((element) =>
      element.querySelector("circle.circular-progress") &&
      element.querySelector(".number-container"),
    )
    .map((element) => {
      const match = String(element.textContent || "")
        .trim()
        .match(/^(\d{1,3})%$/);

      const rect = element.getBoundingClientRect();

      return match && rect.width > 0 && rect.height > 0
        ? Math.max(0, Math.min(100, Number(match[1])))
        : null;
    })
    .filter((value) => value !== null);

  return candidates.length === 1 ? candidates[0] : null;
}
```

Source: [`content.js` L4347–L4362](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4347-L4362).

---

## 39. It does not simply take the first `.percent`

The code combines several signals:

```text
.percent class
+
contains circular-progress
+
contains number-container
+
text matches exactly NN%
+
nonzero rendered dimensions
```

Then it imposes another rule:

```js
return candidates.length === 1 ? candidates[0] : null;
```

When more than one candidate looks plausible, PlumePilot **chooses not to guess**.

---

## 40. Explicit ambiguity beats an arbitrary choice

```text
0 candidates → unknown
1 candidate  → likely correct
2 candidates → ambiguous
```

Returning `candidates[0]` would hide the ambiguity. Returning `null` can be a deliberate decision:

> I do not have enough evidence to claim one value is correct.

This is a form of **fail-safe inference**, not necessarily a failure.

---

## 41. `getBoundingClientRect()` as a pragmatic filter

The function checks:

```js
const rect = element.getBoundingClientRect();
rect.width > 0 && rect.height > 0
```

This gives dimensions and position relative to the viewport and helps exclude elements occupying no rendered area.

MDN: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

However, it is **not a universal visibility test**. An element can have positive dimensions while being transparent, covered, or outside the viewport. This check establishes only that the candidate has a nonzero layout rectangle.

---

# Part XIII — DOM as baseline, not always source of truth

## 42. The percentage is a baseline

Progress logic first reads the DOM percentage:

```js
const domPercent = readPegasoCoursePercentage();

if (domPercent !== null && courseProgressState.baselinePercent === null) {
  courseProgressState.baselinePercent = domPercent;
  courseProgressState.domPercent = domPercent;
}
```

Later, the displayed percentage can be computed from an exact value or from baseline plus observed session progress:

```js
const value = exactAvailable
  ? Number(state.exactPercent)
  : state.baselinePercent + Math.max(0, Number(state.sessionDelta) || 0);
```

Sources:
- [`content.js` L4440–L4455](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4440-L4455)
- [`content.js` L4463–L4469](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4463-L4469)

The DOM provides a **baseline**. A more exact value takes precedence when available.

---

## 43. Hierarchy of evidence

```text
is an exact value available?
      ├── yes → exactPercent
      └── no
           ↓
       DOM baseline
            +
       observed session delta
```

Not every source knows everything at every moment. PlumePilot combines signals with different reliability levels.

In later chapters we will distinguish the roles of the DOM, APIs, caches, master calls, and local state.

---

## 44. Source of truth versus source of signal

### Source of truth

A source treated as authoritative for a particular state or decision.

### Source of signal

A source that offers useful evidence, without necessarily being definitive.

The DOM is often an excellent **source of signal**: "the interface shows 82%" is useful information. But critical decisions may need confirmation through more structured data.

---

# Part XIV — URL identity can outlast visible labels

## 45. A label may change while the URL remains stable

A code comment in the chapter-limit logic says:

```js
// The visible chapter label is not a stable identifier: Pegaso may rebuild
// it while lesson percentages change. The URL lesson number is the same
// display-order identity used by the course APIs and remains stable while
// PlumePilot moves between videos of the same chapter.
```

The code therefore prefers:

```js
const lessonNumber = lessonNumberFromUrl();
```

URL parser source: [`content.js` L4336–L4345](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4336-L4345).

Again, a changing visual representation is replaced by a more stable logical identifier.

---

## 46. When is visible text an acceptable identifier?

PlumePilot also uses:

```js
{
  sectionText: chapter.sectionText,
  chapterText: chapter.text,
}
```

because better IDs are not always immediately available.

"Never use visible text as identity" would be too rigid. Instead, ask **what identity the host actually exposes**.

A rough preference order is:

```text
stable domain ID
    ↓
ID/key in the URL
    ↓
stable semantic attribute
    ↓
combination of fields
    ↓
visible text
    ↓
pure DOM position
```

Real integrations often require compromises.

---

# Part XV — Composite identity

## 47. A chapter number is not enough

A course can have multiple sections with numbering that starts again at 1:

```text
Mathematical Analysis I
  1 - ...
  2 - ...

Mathematical Analysis II
  1 - ...
  2 - ...
```

`chapterNumber = 1` would collide. Therefore `chapterIdentity()` returns:

```js
{
  sectionText: chapter.sectionText,
  chapterText: chapter.text,
}
```

Source: [`content.js` L1235–L1238](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L1235-L1238).

The v1.8.0 changelog records exactly this decision: section plus title allows chapter numbers to restart in different sections.

Source: [`CHANGELOG.md` L1255–L1263](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/CHANGELOG.md#L1255-L1263).

---

## 48. Composite key

This resembles a database **composite key**:

```text
PRIMARY KEY (section_id, chapter_number)
```

PlumePilot conceptually uses:

```text
(sectionText, chapterText)
```

Neither textual value is as strong as an official immutable ID, but the combination distinguishes cases that a chapter number alone cannot.

---

# Part XVI — Event delegation

## 49. A document-level listener can outlive child replacements

Near the end of `content.js`:

```js
document.addEventListener("click", (event) => {
  const row = event.target?.closest?.("div.border-t");

  if (row && row.querySelector(":scope > div.cursor-pointer")) {
    setTimeout(() => {
      const selected = currentLesson();
      if (selected) rememberPlaybackLesson(selected);
    }, 0);
  }
}, true);
```

Source: [`content.js` L7080–L7089](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L7080-L7089).

This is **event delegation**.

Rather than attaching one listener to every lesson row:

```text
row1 → listener
row2 → listener
row3 → listener
```

PlumePilot attaches one listener to a stable ancestor:

```text
document → listener
```

The listener uses `event.target.closest("div.border-t")` to recover the logical clicked row.

---

## 50. Why is delegation useful in a dynamic DOM?

If the frontend destroys row A and creates row B, any listener attached directly to A disappears with that node.

The listener on `document` remains. Future rows can still be observed without separately attaching a listener to each one.

This is a particularly strong advantage of event delegation in frequently rerendered interfaces.

---

## 51. Why `setTimeout(..., 0)`?

After the click, the code defers the read:

```js
setTimeout(() => {
  const selected = currentLesson();
  // ...
}, 0);
```

A zero delay does **not** mean "execute immediately." It schedules a future task, allowing the current task and synchronous event handlers to finish first.

MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide

This does not guarantee that every asynchronous render has finished. For transitions requiring stronger assurance, PlumePilot uses `waitFor()`. Here the deferral is a pragmatic attempt to read the just-selected lesson after the click.

---

# Part XVII — Hidden tabs and unreliable timing

## 52. Browsers may throttle hidden pages

The real `waitFor()` contains additional visibility logic:

```js
const hiddenEpochAtStart = pageHiddenEpoch;
const startedHidden = documentIsHidden();
```

After an initial timeout it can account for whether the page was hidden during the wait and allow another waiting window when it becomes visible.

Browsers throttle timers and background work in hidden tabs. A timeout in a hidden page may indicate either that the operation did not occur **or** that the page had fewer opportunities to run.

---

## 53. Wall-clock time versus application progress

`Date.now()` measures real elapsed time. But five wall-clock seconds in a background tab do not necessarily represent the same amount of executed JavaScript or rendering as five seconds in an active tab.

```text
5 seconds of wall-clock time
          ≠
5 equivalent seconds of application progress
```

We will revisit this in the asynchrony chapter.

---

# Part XVIII — DOM and API: two views of one domain

## 54. Why did PlumePilot keep using the DOM after discovering the APIs?

If the platform's API exposes structured course data, why not stop reading the DOM?

Because the two channels answer different questions.

### APIs are strong when we need to know:

```text
What percentage is complete?
Which activities exist?
What is the state of a lesson?
What is the structured course data?
```

### The DOM remains necessary when we need to know or do:

```text
What is rendered now?
Which row is selected?
Is this chapter open?
Where can we click?
Is the video player present?
What interface is the user actually seeing?
```

These are not competing technologies. They are different **projections of the same system**.

---

## 55. Data plane and presentation plane

An informal distinction:

```text
API / structured data → data plane
DOM / rendered UI     → presentation plane
```

A typical flow may cross both:

```text
API: chapter 5 contains an incomplete activity
                ↓
DOM: locate the component for chapter 5
                ↓
DOM: open the chapter
                ↓
DOM/API: verify the specific activity
```

This combination underpins the modern "find first incomplete activity" feature discussed in Chapter 8.

---

# Part XIX — A small reliability model

## 56. DOM signals have different strengths

### Very weak

```text
"the third div in the second column"
```

### Weak

```text
a purely presentational CSS class
```

### Medium

```text
structure + text + visual role
```

### Stronger

```text
URL + domain identifier + API confirmation
```

PlumePilot uses combinations of all these levels because its understanding of the host platform matured over time. That is normal for integration software.

---

## 57. Reliability = multiple signals plus verification

Much of PlumePilot's robust DOM logic follows this pattern:

```text
RELIABILITY ≈
reasonably stable identity
+
fresh lookup
+
post-action verification
+
fallback
```

For example:

```text
chapter identity
   +
fresh findChapter()
   +
click
   +
waitFor(isOpen)
```

The uncertainty is not eliminated. It is managed.

---

# Part XX — Why DOM code gets complex so quickly

## 58. A `querySelector()` may hide a lot of domain knowledge

```js
const el = document.querySelector(...);
```

Looks like a CSS selector exercise, but a real integration also needs to decide:

```text
when to query
within which scope
which fallback to use
how to recognize ambiguity
what to do if the element is not ready
how to detect a stale node
how to reopen its container
how to verify a click
how to distinguish different platforms
```

Writing the selector is often the least interesting part.

---

## 59. This explains fragile end-to-end tests

The same failure modes appear in Playwright, Selenium, Cypress, and similar tools.

A fragile test might:

```text
sleep for 2 seconds
click the third button
sleep for 1 second
read text
```

A more robust one:

```text
wait for a meaningful readiness condition
locate the element semantically
perform the action
verify the resulting state
```

PlumePilot is not an E2E testing framework, but the engineering lessons overlap.

---

# Part XXI — If we redesigned the DOM layer today

## 60. We could extract a `CoursePageAdapter`

Many DOM helpers currently live directly inside `content.js`. A possible architectural evolution:

```text
content.js
    │
    ▼
CoursePageAdapter
    │
    ├── getSections()
    ├── getChapters()
    ├── getCurrentLesson()
    ├── openChapter(identity)
    ├── readVisibleProgress()
    └── findRenderedActivity(identity)
```

With platform-specific implementations:

```text
PegasoCoursePageAdapter
MercatorumCoursePageAdapter
UtsrCoursePageAdapter
```

This would make a boundary explicit that has already emerged organically in the existing code.

---

## 61. What would we gain?

### Separation of responsibilities

Autoplay could call:

```js
await page.openChapter(identity);
```

without knowing CSS classes or chevron markup.

### Testability

Domain logic could be tested against a fake adapter, without reconstructing the entire platform DOM each time.

### Isolation of changes

If Pegaso changes its CSS structure, ideally most of the repair would remain inside its page adapter.

---

## 62. What would it cost?

Every abstraction has a price:

- defining consistent interfaces;
- migrating large amounts of existing code;
- resisting overly generic adapters;
- handling differences in domain semantics, not just markup.

This does not make the current organization "wrong." It means the project has become mature enough for a boundary to be visible that was not necessarily obvious at the beginning.

---

# Part XXII — Full case study: from video completion to the next element

## 63. Reconstructing the risk

Imagine:

```text
user watches Video B
sidebar is open
PlumePilot knows row B
```

The video ends. PlumePilot waits for the platform to record completion.

During the wait:

```text
A. sidebar percentages update
B. frontend recreates rows
C. user closes the accordion
D. original row B is detached
```

A naive algorithm:

```js
const row = currentLesson();
await waitForCompletion(row);
const next = nextLesson(row);
clickRow(next);
```

The danger is that `row` belongs to the old DOM.

---

## 64. The real algorithm recovers its context

The current flow first resolves:

```js
let cur = await recoverPlaybackLesson(v);
```

Then it remembers the logical context:

```js
const completedLesson = playbackContext;
```

It waits:

```js
const completed = await waitForLessonCompletion(cur, v);
```

Then resolves again:

```js
const stableCur = await recoverPlaybackLesson(v);
```

Finally, it verifies that the recovered lesson still matches the completed context.

Source: [`content.js` L6671–L6702](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L6671-L6702).

```text
resolve
  ↓
remember identity
  ↓
await an external/dynamic change
  ↓
re-resolve
  ↓
validate identity
  ↓
continue
```

This resembles a small optimistic transaction.

---

## 65. Optimistic concurrency on a tiny scale

PlumePilot cannot lock the host DOM and say, "Do not rebuild the sidebar until I am finished."

Instead:

```text
1. record logical identity
2. allow the world to change
3. verify that the preconditions are still valid
4. proceed only if they are
```

Conceptually:

```text
read version → do work → check compatible version → commit
```

There is no explicit version number here. The effective check is whether the saved playback context still matches the freshly resolved DOM.

---

# Part XXIII — Errors that look like DOM bugs but are not

## 66. Not every missing element means a broken selector

A query returning `null` might be caused by:

1. A wrong selector.
2. A component not yet rendered.
3. A closed accordion.
4. A different route.
5. A hidden tab or delayed rendering.
6. A different platform.
7. An intentionally removed component.
8. A changed session.
9. A node living in another frame.

Good debugging starts by understanding **the current system state**, not immediately declaring that the CSS selector is broken.

---

## 67. Log meaning, not just objects

Messages such as:

```text
"Chapter did not open"
"Could not determine current lesson"
"Advance cancelled because the completed lesson changed or disappeared"
```

are more informative than:

```js
console.log(element);
```

They explain which invariant failed. Useful logs should answer:

```text
What were we trying to do?
Which precondition was missing?
Which logical identity were we tracking?
```

Not merely "what was in this variable?"

---

# Part XXIV — A practical method for integrating a dynamic page

## 68. Step 1 — Identify the domain concept

Before writing a selector, ask:

```text
What does this element actually represent?
```

Not "this span," but "chapter 5 in section X."

---

## 69. Step 2 — Find the current DOM representation

Only then resolve it:

```js
findChapter(identity);
```

The DOM becomes an adapter for the domain identity.

---

## 70. Step 3 — Define readiness

Ask:

```text
Which observable condition proves the component is ready?
```

Not "how many milliseconds will it probably take?"

Examples:

```js
chapters().length > 0
```

or:

```js
isChapterOpen(identity)
```

---

## 71. Step 4 — Perform the action

For example:

```js
chapter.span.click();
```

---

## 72. Step 5 — Verify the result

```js
await waitFor(() => isChapterOpen(identity));
```

Do not infer success merely because the click did not throw an exception.

---

## 73. Step 6 — Prepare for node replacement

After a long asynchronous operation, ask yourself:

```text
Am I still using an Element obtained before the await?
```

If so, consider resolving it again. This single habit prevents many subtle bugs.

---

# Part XXV — Exercises

## 74. Exercise 1 — Which code is more robust?

### Version A

```js
const chapter = findChapter(identity);
chapter.span.click();
await sleep(1000);
return chapter;
```

### Version B

```js
const chapter = findChapter(identity);
chapter.span.click();

return await waitFor(() => {
  const fresh = findChapter(identity);
  return fresh && isChapterOpen(identity) ? fresh : null;
});
```

### Reasoning

Prefer B. Not because 1,000 ms is necessarily too short, but because B waits for a **condition**, retrieves a **fresh node**, and **verifies the result**.

A guesses a duration and returns a potentially stale reference.

---

## 75. Exercise 2 — Why is this cache dangerous?

```js
const cachedLessons = lessons();

async function next() {
  await somethingSlow();
  return cachedLessons[3];
}
```

### Answer

The array contains references from an earlier DOM snapshot. The host may have rebuilt the rows during `somethingSlow()`.

Store the lesson's logical identity and call `lessons()` or a fresh lookup when needed.

---

## 76. Exercise 3 — What does `null` mean?

```js
const percent = readPegasoCoursePercentage();
```

`percent === null` might mean:

```text
A. no matching indicators exist
B. they have not rendered properly yet
C. more than one plausible indicator exists
D. we are on the wrong page
E. the platform markup changed
```

The correct answer is **potentially all of them**. The caller must interpret the value in context.

---

## 77. Exercise 4 — Observer or polling?

You need to wait for a just-clicked chapter to open.

You could use a global `MutationObserver` or:

```js
waitFor(() => isChapterOpen(identity))
```

### A good answer

For one bounded transition, `waitFor()` is simple and readable.

For ongoing awareness that arbitrary page components may appear later, `MutationObserver` is more suitable.

Neither API is universally superior; they address different lifetimes.

---

## 78. Exercise 5 — Find the domain identity

You find:

```html
<span>2 - Funzioni</span>
```

What is its identity?

The node alone does not tell us. There could be:

```text
Section A / 2 - Funzioni
Section B / 2 - Funzioni
```

We need more context. That is the reason for composite identities.

---

# Part XXVI — Concepts to carry forward

## 79. DOM snapshot

A DOM query describes the document at one moment. In a dynamic UI, that must not be confused with an immutable structure.

## 80. Stale DOM reference

A reference to a previously obtained node that no longer represents the current UI component.

## 81. Logical identity

The identity of a domain concept, independent of the particular DOM node representing it.

## 82. Selector contract

An implicit dependency on host markup, classes, or attributes used to find an element.

## 83. Readiness condition

An observable condition proving a component is ready for the next operation.

## 84. Polling

Periodic checks until a condition becomes true or a deadline is reached.

## 85. MutationObserver

A browser API that reports changes to the DOM tree, especially useful when relevant components are added or removed after startup.

## 86. Event delegation

Handling events at a stable ancestor rather than attaching listeners to every dynamic child.

## 87. Command plus verification

An action is requested from the UI, then the resulting state is observed and verified.

## 88. Resolve late

Keep relatively stable identities and resolve concrete references as close as possible to the moment of use.

## 89. Precondition recovery

Attempt to restore a necessary condition before proceeding—for example, reopen an accordion before finding its children.

## 90. Hierarchy of evidence

Rank sources by reliability. An exact API value, a DOM baseline, and a heuristic can coexist without having equal authority.

---

# Part XXVII — Further reading

## 91. DOM selection

### MDN — `Document.querySelector()`

https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector

### MDN — `Document.querySelectorAll()`

https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll

Especially important: `querySelectorAll()` returns a static `NodeList`.

### MDN — DOM selection and traversal

https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Selection_and_traversal_on_the_DOM_tree

---

## 92. Relative traversal

### MDN — `Element.closest()`

https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

This explains how PlumePilot can start at a `span` or a click target and walk up to the containing logical component.

---

## 93. Observing the DOM

### MDN — `MutationObserver`

https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

Keep the distinction between "I know the DOM changed" and "I know what that change means for my domain." The observer does not automatically provide the second.

---

## 94. Layout and dimensions

### MDN — `Element.getBoundingClientRect()`

https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

A positive rectangle can be a useful rendering signal without being a complete visibility test.

---

## 95. Tasks and deferral

### MDN — Microtask guide / event loop

https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide

Useful for understanding why `setTimeout(..., 0)` does not mean "run now" and why event effects may only become observable later.

---

# 96. What have we really learned?

The most important lesson is not how to call `querySelector()`. It is learning to see dynamic pages as systems of **temporary representations**.

We have seen that:

```text
a DOM node          ≠ a domain identity
not found           ≠ does not exist
.click() returned   ≠ transition completed
MutationObserver    ≠ semantic understanding of changes
```

And above all, one pattern recurs across PlumePilot:

```text
stable identity
      ↓
fresh lookup
      ↓
action
      ↓
conditional waiting
      ↓
verification
      ↓
fallback / recovery
```

That is software architecture, even when we are working with `<div>` elements.

---

## In the next chapter

Until now we have observed the platform mainly from its surface:

```text
DOM / URL / interactions
```

But PlumePilot gradually learned to look **behind the interface**, at the requests made by the host application itself.

Chapter 04, **APIs and reverse engineering — Understanding the platform by observing its traffic**, examines:

- What reverse engineering means in this setting;
- HTTP requests and responses;
- JSON representations of the domain;
- discovering endpoints and identifiers;
- using an existing authenticated session without persisting credentials;
- master calls and detail calls;
- comparing API data with the DOM;
- how API data made several algorithms faster and more reliable;
- where the DOM remains essential.

We move from asking:

```text
"What do I see on the page?"
```

to:

```text
"Where does the data displayed by this page come from?"
```

This is where integrating with a web application becomes especially interesting.

---

[← 02 — Contexts and messaging](02-contexts-and-messaging.md) · [Contents](index.md) · 04 — APIs and reverse engineering (translation in progress)
