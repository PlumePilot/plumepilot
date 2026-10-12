# 17 — What would we do differently today?

## A retrospective without hindsight bias

> **Reference snapshot for this chapter**  
> PlumePilot **2.35.2 release candidate**, branch `feat/ui-ux-2.35.2`, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`.

Looking back on a real project, it is tempting to say a file is too large, an internal API should have been explicit, or a framework should have been introduced earlier. But retrospective certainty knows the future. When PlumePilot began, we did not yet know it would support three universities, three browsers, two menu surfaces, PDF/HTML/EPUB exports, rich-text quiz notes, configurable autoplay, commission monitoring and independent browser-store builds.

An architecture suited to three files may be poorly suited to fifty features. Conversely, designing for a hypothetical large system on day one may itself be a mistake. The useful question is not *What would the perfect original architecture have been?* It is **Knowing the actual shape of the problem, what would we change as PlumePilot grows—and what would we deliberately keep?**

---

# Part I — Debt is not the same as error

## 1. Four different categories

When evaluating an old choice, distinguish a mistake, a trade-off, scaling debt, and a decision that is still correct. Judging all four as “bad architecture” would erase the history that explains why the system grew as it did.

---

## 2. A genuine mistake

Some decisions are unsound even with the information available at the time, for instance persisting authentication secrets unnecessarily or assuming ambiguous identifiers are globally unique. The remedy is to correct the underlying invalid assumption.

---

## 3. A trade-off

Choosing vanilla JavaScript reduced build-tool overhead, package complexity and review surface. The same decision may become more expensive as the interface grows, but it was not necessarily wrong at the beginning.

---

## 4. Scaling debt

One file containing several related features may be simplest for a tiny extension. As unrelated capabilities accumulate, coupling and regression risk rise. The choice was reasonable then and now carries an evolutionary cost.

---

## 5. A decision that remains correct

Working locally in the user's authenticated LMS session avoids a new developer-operated backend. A hosted service would add privacy, authentication, deployment and operational obligations without automatic benefit.

---

# Part II — Avoid a complete rewrite

## 6. The temptation to rewrite everything

After learning about boundaries, protocols, state machines and test seams, one can sketch a beautiful replacement architecture. That temptation undervalues the proven behavior embedded in the existing system.

---

## 7. What a rewrite would lose

The current code contains knowledge acquired through DOM races, API inconsistencies, hidden tabs, Firefox review, PDF edge cases and real course regressions. Rebuilding familiar features may accidentally omit the unusual exceptions that make them reliable.

---

## 8. The Strangler approach

Prefer incremental replacement around stable boundaries: identify a responsibility, protect its behavior with tests, extract it, and redirect callers. The Strangler Fig pattern allows a better architecture to grow around working software without risking a wholesale rewrite.

---

# Part III — Extract boundaries from content.js

## 9. Why content.js is under pressure

content.js coordinates DOM discovery, autoplay, chapter state, message bridges, export entry points and platform workarounds. It is not automatically one undifferentiated God object, but it has become a convergence point for many reasons to change.

---

## 10. What we would do today

Split by cohesive responsibility rather than arbitrary file length. Candidate modules include LMS adapters, lesson identity, discovery policy, playback orchestration, course progress, and UI-facing bridges.

---

## 11. The extraction rule

Start with functions that have stable inputs and outputs, few browser globals, clear tests and an obvious owner. Do not assume the biggest function is the safest or most valuable first extraction.

---

# Part IV — Functional core, imperative shell

## 12. Functional core and imperative shell in practice

A pure decision layer decides what the next step should be; the surrounding shell reads the current DOM, sends requests, performs navigation and persists state. This makes complicated rules testable without pretending browser effects can disappear.

---

## 13. First-incomplete as an example

A discovery engine could accept normalized chapter state and effective policy, returning a logical target or an unresolved result. Only an adapter would locate and open the corresponding LMS element.

**Code from the original chapter:**

```js
const plan = chooseDiscoveryPlan({
  outline,
  masterIndex,
  verifiedComplete,
  mode,
});
```

```js
{
  candidates: [...],
  requiresFreshData: true,
  fallbackPolicy: "visual"
}
```

---

## 14. The advantage

Candidate ordering, stale summaries, duplicate identities and fallback decisions could be tested with plain objects rather than loading much of content.js through node:vm.

---

# Part V — Effects are essential

## 15. A browser extension necessarily has effects

Reading host DOM, sending messages, playing notification sounds, generating downloads and selecting lessons are fundamental to the product. Hiding them behind elaborate pure abstractions can make code harder to understand.

---

## 16. A realistic objective

**Make deterministic decisions pure when useful; keep browser effects explicit and guarded.** This is more practical than attempting to turn the entire extension into one pure-functional program.

---

# Part VI — Formal platform adapters

## 17. The platform-adapter problem

Support grew from one LMS environment into Pegaso, Mercatorum and San Raffaele. Many course operations are shared, while DOM shapes, routes and provider data vary.

---

## 18. Formalize the platform adapter earlier

A simple adapter object can expose normalized capabilities—resolve sections, identify current course, locate lesson, parse progress—without imposing a class hierarchy.

**Code from the original chapter:**

```js
const platform = {
  id,
  courseCodeFromUrl(),
  sections(),
  chapters(section),
  currentLesson(),
  commissionLabel(...),
};
```

---

## 19. Why an adapter helps

Domain code should ask “which lesson does this represent?” instead of knowing whether an LMS uses a particular class name, page section or folder nesting.

---

# Part VII — A clearer anti-corruption layer

## 20. The adapter already exists implicitly

Existing normalizers, route helpers and platform checks perform much of this role. The improvement is making contracts, ownership and boundaries explicit rather than claiming the code currently has none.

---

## 21. What we would reorganize

Group volatile external contracts into modules such as platform DOM, API response normalization and course identity. Other subsystems consume stable normalized values.

---

# Part VIII — Internal messaging contracts

## 22. Today's messaging shapes

Messages already carry types, IDs, payloads and acknowledgements. Although expressed as ordinary objects and string constants, they are internal APIs between different execution worlds.

**Code from the original chapter:**

```js
{
  type: "PEGASO_START_EXPORT",
  ...
}
```

---

## 23. Treat those messages as APIs

Centralize important message names and expected payload contracts. Validation at the receiver protects against missing fields, stale contexts and malformed requests.

**Code from the original chapter:**

```js
export const MessageType = Object.freeze({
  START_EXPORT: "PEGASO_START_EXPORT",
  CANCEL_EXPORT: "PEGASO_CANCEL_EXPORT",
  ...
});
```

---

## 24. Boundary validation

For critical commands, validate required operation identity, recognized type, field shape, supported state and expected response semantics before any consequential effect.

---

## 25. Why not automatically use JSON Schema?

A library or formal schema can help a large protocol, but a few small explicit validators may be cheaper and clearer for the present message inventory.

**Code from the original chapter:**

```js
function parseStartExportMessage(value) {
  ...
}
```

---

# Part IX — Protocol versions only when needed

## 26. Protocol versioning is not always needed

Content scripts and background resources normally upgrade together as one extension package, so this is not a long-lived public client/server versioning problem.

---

## 27. But lifecycles can overlap

A tab might remain open across an extension update, or a context can receive an unexpected old or new payload. Lightweight protocol version metadata could help diagnose a real compatibility transition.

---

# Part X — Explicit autoplay state transitions

## 28. Autoplay is already a state machine

Chapter 07 showed that playback behavior depends on the current lesson, operation, test policy, manual overrides, async recovery and cancellation. Its logical state is currently spread across several cooperating values.

---

## 29. Introduce an explicit transition layer

A reducer or transition function can accept current state and an event, return the next state and describe permitted effects. XState is optional; a small domain-specific reducer may be enough.

**Code from the original chapter:**

```js
function transition(state, event) {
  switch (state.phase) {
    ...
  }
}
```

---

## 30. One possible state shape

Represent phase, current lesson identity, operation generation, effective policy and pending recovery explicitly rather than relying on independently mutable Booleans.

**Code from the original chapter:**

```js
{
  phase: "watching",
  playback: {...},
  policy: {...},
  pendingBoundary: null,
  generation: 12,
}
```

---

## 31. Important events

Start, pause, stop, lesson changed, video ended, test boundary reached, navigation requested, recovery completed, and user-selected lesson can all be modeled as state-machine inputs.

---

## 32. Why make transitions visible?

The priority among manual action, skip-completed behavior, test boundaries and stale async callbacks becomes one reviewable contract instead of being scattered across listeners.

---

# Part XI — Do not centralize every state

## 33. Not one global Redux store

Popup, floating panel, MAIN world and background have genuinely separate lifecycles. A “global” store would still need messaging, persistence and ownership rules.

---

## 34. Keep local state local

Focus, temporary editing state and open detail panels belong to individual UI instances; long-running operation state belongs to its coordinator; durable preferences belong to shared storage.

---

# Part XII — Storage repositories

## 35. Today's storage wrappers

Helpers exist, but many modules know concrete storage keys, legacy forms and upgrade paths. That knowledge is vulnerable to duplication as features grow.

---

## 36. A storage repository boundary

A small repository object per domain can own key construction, parsing, serialization, migration and platform scoping while callers work in domain terms.

---

## 37. What the caller should request

Ask for getCourseProgress(platform, courseId) or saveExamSnapshot(identity, value), not a raw key with undocumented prefix rules.

**Code from the original chapter:**

```js
await courseState.get(courseIdentity);
```

---

# Part XIII — Schema evolution

## 38. Version complex stored structures

Snapshots and layout schemas benefit from an explicit version so a reader can distinguish valid old data from malformed or unsupported formats.

**Code from the original chapter:**

```js
{
  version: 3,
  ...
}
```

---

## 39. A migration pipeline

Read raw persisted input → detect version → normalize or migrate → validate current shape → return one clear domain representation. This avoids permanent scattered legacy checks.

---

# Part XIV — Cache policies

## 40. Current cache variety

PlumePilot uses Maps for different needs: lesson detail, intercepted snapshots, images in progress and recent sound events. Their different policies are often justified.

---

## 41. Make each policy explicit

Document owner, identity, maximum capacity, freshness, invalidation, error caching and what a caller may safely infer from a hit.

---

## 42. Avoid one universal GenericCache

A cache of completed lesson facts and an in-flight request registry have different contracts. One overly abstract class might hide those essential differences.

---

## 43. Reuse mechanisms, not meanings

Shared utilities for bounded maps, TTL checks or pending-Promise deduplication can be helpful while each subsystem retains its domain-specific correctness policy.

---

# Part XV — In-flight request coalescing

## 44. Coalesce requests in flight

If two consumers ask for the same lesson detail simultaneously, share the pending Promise for the same qualified identity instead of issuing duplicate network requests.

---

## 45. Coalescing flow

Check an in-flight map → reuse an existing Promise, or start one and register it → remove its entry after settlement. This avoids a cache stampede without forcing unrelated requests into one serial queue.

---

## 46. Why it helps

Duplicate requests, parsing and temporary buffers are avoided while distinct identities can still proceed concurrently under suitable pacing rules.

---

# Part XVI — Independent discovery engine

## 47. First-incomplete and skip-completed share concepts

Both evaluate course order, completion evidence, ambiguous identity, API availability and navigation targets. Their policies differ, but their underlying discovery model overlaps.

---

## 48. Extract a discovery engine

Let the engine work on normalized course snapshots and a requested mode, returning domain targets or a reason verification is required.

---

## 49. Discovery mode is explicit

Differentiate first-incomplete search, forward skip-completed and other navigational intentions rather than toggling hidden flags whose combinations change the meaning of discovery.

---

## 50. Return an explicit result

A target should contain identity and supporting evidence; unresolved outcomes should include the reason. Avoid returning a guessed row or a bare Boolean for ambiguous cases.

**Code from the original chapter:**

```js
{
  status: "target",
  chapterIdentity,
  activityIdentity,
  evidence,
  requiresVisualVerification
}
```

---

## 51. Apply the DOM adapter afterward

Only once a logical target is selected does a browser adapter locate the current rendered element, revalidate identity and navigate. The domain decision can then be tested separately from DOM timing.

---

# Part XVII — Intermediate representations for export

## 52. PDF, EPUB and HTML have distinct pipelines

They share some extracted content and assets but have different requirements for pagination, reflow, image handling, interactivity, accessibility and output format.

---

## 53. A modest intermediate representation

Normalized source content—sections, text, tables, figures, formulas and associated resources—could feed format-specific renderers, reducing repeated extraction logic.

**Code from the original chapter:**

```js
{
  course,
  sections: [
    {
      title,
      chapters: [...]
    }
  ],
  assets: [...]
}
```

---

## 54. Not one enormous universal IR

Quiz and course-material exports have different domain structures. Smaller purpose-built representations may be clearer than a universal document object attempting to model everything.

---

# Part XVIII — Workers for measured CPU bottlenecks

## 55. Should CPU-heavy work move to workers?

Some PDF rendering, image analysis or encoding stages may block the UI. Moving targeted transformations to Workers or OffscreenCanvas could help responsiveness where supported.

---

## 56. A Worker does not guarantee speed

Worker startup, serialization, data transfer, additional buffers, API compatibility and coordination create costs. Total elapsed time or peak memory may even increase.

---

## 57. Measure first

Profile actual CPU hotspots, main-thread long tasks and memory peaks. A worker is ineffective if the bottleneck is the LMS network or a final archive that still allocates large buffers.

---

## 58. Transfer large buffers deliberately

When using Workers, prefer transferable ArrayBuffers where ownership can move, rather than duplicating large data unnecessarily. Detached sender buffers change lifetime semantics.

---

# Part XIX — A modern editing-command model

## 59. The editor today

The offline notes editor pragmatically uses Selection, Range and execCommand() for some formatting and undo behavior. This worked at the project's scope and browser baseline.

---

## 60. Future editor debt

execCommand() is deprecated. If editing requirements expand, introduce an explicit command model while preserving current selection, caret and undo contracts.

---

## 61. Model editing commands

Commands such as toggle bold, apply color, insert callout or move list type should specify intended range, result, selection restoration and undo effects.

---

## 62. Study Input Events

beforeinput, inputType and related APIs can support a more intentional editing model and reduce reliance on legacy formatting commands, subject to browser tests.

---

# Part XX — Keep the rich-text editor proportional

## 63. Preserve the actual scope

The editor is for personal notes and review annotations in an offline quiz, not realtime collaboration, document publication or elaborate multi-user change tracking.

---

## 64. Do not build Google Docs

Powerful rich-text frameworks introduce large scope and dependency cost. Do not adopt them simply because the current editor has an imperfect implementation detail.

---

# Part XXI — Shared UI primitives

## 65. The 2.35.2 UI extraction already began

menu-ux.js and menu-ux.css share autoplay summaries, navigation, layout policies, font handling and typography between popup and floating menu.

---

## 66. Formalize a few shared primitives

Small helpers for navigation details, disclosure scrolling, action groups and focus restoration could become stable reusable UI interfaces.

---

## 67. No framework is required for that

Vanilla DOM factories and shared attribute protocols can be enough when the component hierarchy remains manageable and the UI has well-defined responsibilities.

**Code from the original chapter:**

```js
function createSettingsGroup({...}) {
  ...
}
```

---

# Part XXII — A framework is a trade-off

## 68. Would React help?

A larger UI with many interdependent views could benefit from declarative components and more predictable rendering. The question is about coordination costs, not popularity.

---

## 69. What a framework might solve

It may simplify rerendering, local component state, conditional layout, reconciliation and reuse of view components.

---

## 70. What it would add

Build dependencies, bundle size, migration work, runtime integration concerns and new regressions. It would not automatically solve browser execution contexts, store review, source of truth or focus semantics.

---

## 71. Our current React decision

At the present scale we probably would **not rewrite the UI in React**. First strengthen view models, adapters and stable primitives, then reevaluate if actual complexity keeps growing.

---

# Part XXIII — Gradual static typing

## 72. TypeScript is a different proposition

Type information can help with message payloads, normalized API data, stored records and operation result shapes. Its expected benefit is relatively stronger, but gradual adoption remains preferable.

---

## 73. No need for a total migration

Begin with JSDoc types, // @ts-check and checkJs on selected new or extracted modules, rather than changing the entire toolchain and codebase immediately.

---

## 74. A practical gradual example

Annotate a normalized lesson or operation record so editors and the TypeScript language service can catch incorrect field use while runtime remains JavaScript.

**Code from the original chapter:**

```js
/**
 * @typedef {Object} PlaybackTarget
 * @property {"target"|"end"|"fallback"} status
 * @property {ChapterIdentity=} chapter
 */
```

---

# Part XXIV — Type the important boundaries first

## 75. Type the high-risk boundaries first

Messaging, platform adapters, storage repositories and operation transitions should receive attention before spending effort typing arbitrary CSS class strings or stable local details.

---
