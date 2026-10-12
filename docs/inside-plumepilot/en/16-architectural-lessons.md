# 16 — Architectural lessons

## Patterns that emerged from the real project

> **Reference snapshot for this chapter**  
> PlumePilot **2.35.2 release candidate**, `feat/ui-ux-2.35.2`, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`. Earlier feature commits and the architecture chapters provide supporting examples.

The previous chapters looked at concrete subsystems: messaging, APIs, dynamic DOM, autoplay, state, EPUB and quiz export, editing, UI, browser distribution, tests, and Git. This chapter asks a different question: **which recurring architectural ideas explain why those systems work, fail, recover, and evolve?**

These principles were not all designed up front. Many became visible through real bugs and refactors. The goal is to name those patterns without claiming that PlumePilot needs a large framework or a wholesale rewrite.

---

# Part I — Architectural boundaries

## 1. Physical structure versus logical structure

A list of files such as content.js, popup.js, background.js and epub-core.mjs describes repository organization, not the architecture. Logical organization is defined by responsibilities: domain rules, platform adapters, data sources, state owners, effects and build targets. The two views should be connected, not confused.

---

## 2. What is a boundary?

A boundary is a point where trust, execution context, ownership, identity, lifecycle, data representation, or contract changes. PlumePilot crosses boundaries among the LMS, isolated content world, MAIN world, background, popup, builder, and distribution channels.

---

## 3. Why boundaries matter

Many real defects occurred not inside an isolated algorithm but because something crossing a boundary was assumed safe: a lesson node remained current after rerender, a privileged API existed in the page world, or a browser accepted another target's manifest.

---

## 4. Translation at the boundary

Rather than propagating provider-specific terms everywhere, transform them into stable internal meaning. Normalize lesson API data, map varying DOM selectors into one course structure, and compile a shared manifest into browser-specific packages. A good boundary translates, validates and explains.

---

# Part II — Anti-corruption layers

## 5. The recurring anti-corruption layer

Domain-Driven Design calls an adapter that protects an internal model from an external model an **anti-corruption layer**. PlumePilot has modest versions of this pattern; it is not necessary to install a DDD framework to benefit from the principle.

---

## 6. API normalization

The LMS exposes provider-oriented fields, inconsistent nullability and platform-specific IDs. Internal logic wants well-defined course identity, lesson status, and completion evidence. The API adapter translates raw responses into this domain vocabulary and rejects or marks ambiguous fields.

---

## 7. DOM adapter

Pegaso, Mercatorum and San Raffaele can render related course features in different DOM arrangements. Helpers such as sections() produce a common representation instead of scattering institution-specific querySelector paths across unrelated features.

**Historical code or diagram:**

```js
if (pegaso) ...
if (mercatorum) ...
```

---

## 8. Browser packaging adapter

Chrome and Edge use service-worker-oriented manifests while Firefox receives background scripts and different review-safe resources. Build specialization is another anti-corruption layer: shared behavior stays stable, target-specific constraints remain at the boundary.

---

# Part III — Stable identity

## 9. The DOM is not identity

A DOM node can be removed, recreated or reused for another lesson. Autoplay defects exposed why a node reference is not the durable identity of a course activity.

---

## 10. Node identity versus domain identity

HTMLElement references describe one instance of a rendering. Course code, chapter/folder context, lesson ID and media identity describe the activity being processed. Before acting on a DOM node, reconnect it to the intended domain identity.

---

## 11. Composite identity

display_order can restart in each folder or be duplicated across categories. Use composite keys such as platform + course + folder + lesson, or the strongest stable provider IDs available, instead of pretending a local ordinal is globally unique.

---

## 12. The general identity rule

**Choose identity that remains stable for the lifetime of the operation**, not merely what is convenient to read from the current view. A stable ID may require multiple fields.

---

## 13. Identity belongs to a domain

An exam ID is not necessarily unique across different universities or courses. Scope the identity to the domain in which uniqueness is actually guaranteed.

---

## 14. Scoped storage keys

Persisted data keyed only by course ID risks cross-platform collisions. A composite university/course prefix preserves separation without requiring unrelated stores for each university.

---

## 15. Collisions expose missing model structure

When two entities collide, the deeper question is not only how to avoid overwriting their objects but which domain context was omitted from the identity model.

---

# Part IV — Hierarchies of evidence

## 16. Sources have different authority

Master progress, lesson detail APIs, visible DOM, and cached snapshots can disagree. Their values are not interchangeable; model an evidence hierarchy and consider freshness, granularity, and context.

---

## 17. Master call

The master index is cheap and useful for prioritizing chapters or discovering broad completion. It cannot always certify that every activity inside a chapter is complete.

---

## 18. Lesson-detail API

Detail responses can provide better activity-level evidence but may be missing, partial, stale, or temporarily unavailable. Increased granularity does not guarantee perfect reliability.

---

## 19. Visible DOM

The DOM is vulnerable to rerendering and loading delays, yet can provide visual verification when APIs cannot resolve an activity. A fallback source should not silently override stronger fresh evidence.

---

## 20. Layered truth

In practice the pipeline is **summary → detailed API → visual verification**, with state-specific exceptions. This is not a rigid global rank for every field; it is an explicit decision model.

```text
master summary → activity-level API → guarded visual verification
```

---

## 21. Choose which evidence wins

If a fresh detail response proves unfinished work, do not let an old DOM snapshot replace that fact. If the detail response is absent, a guarded visual check may become necessary.

---

## 22. Precedence needs rules

Define priority in terms of evidence freshness, level of detail, identity confidence and known provider quirks. A fallback is justified by a specific uncertainty, not a random preference for one source.

---

# Part V — Three-valued knowledge

## 23. Booleans are often too weak

A completed flag modeled as only true or false loses the distinction between known incomplete and not yet observed. These two cases must not cause the same automated action.

---

## 24. A missing percentage

The absence of a rendered percentage does **not** mean zero progress or full progress. It means the value is currently **unknown**.

---

## 25. Three-valued knowledge

Use complete, incomplete and unknown where appropriate. Similar ternary states appear in exam verdicts, activity readiness, APIs, cache status and asynchronous operations.

---

## 26. Why explicit unknown is useful

Unknown allows the program to request more evidence or decline an unsafe action rather than fabricating certainty through a default Boolean.

---

# Part VI — Fail closed at risky boundaries

## 27. Uncertainty and side effects

When the destination chapter is ambiguous, do not navigate destructively. When a pending test cannot be identified confidently, do not auto-submit or silently skip it.

---

## 28. Fail closed under uncertainty

A good pattern is: obtain evidence → check identity and confidence → perform the side effect only if the required conditions hold; otherwise verify or stop safely.

---

## 29. Real fail-closed cases

An ambiguous course route yields no forced match; an unexpected Firefox vendor patch fails the build; an uncertain bookmark test triggers targeted verification rather than an arbitrary completion judgment.

---

## 30. Correctness over aggressive automation

A system is not smarter merely because it always makes a decision. Sometimes the correct output is “there is insufficient evidence to proceed safely.”

---

# Part VII — Progressive refinement

## 31. Do not start with the most expensive source

First-incomplete discovery should consult the cheap course index before issuing detailed requests or repeatedly opening LMS accordions. Escalate cost only when the cheap evidence is inconclusive.

---

## 32. The same pattern in EPUB

Try text extraction and structural analysis before allocating a full visual canvas; use regional or full rasterization when fidelity requires it.

---

## 33. The same pattern in caches

Return a valid cached value when its identity, status and freshness policy allow reuse; pay for a new network request only when necessary.

---

## 34. Fast path and slow path

**Cheap evidence → fast path if justified → stronger fallback when needed** combines performance with completeness and safety. The slow path is not a failure; it is part of the correctness guarantee.

---

# Part VIII — A cost-aware decision engine

## 35. Not every read has equal cost

Reading a Map entry, making an HTTP detail request and rendering a full chapter in the host DOM have dramatically different resource and latency costs.

---

## 36. Make the decision engine cost-aware

The engine need not assign precise numerical prices to each action. It should order checks deliberately: in-memory index first, targeted detail calls next, expensive visual interaction last.

---

## 37. Query-planner analogy

Like a database query planner, the first-incomplete engine arranges candidate checks so likely useful answers require fewer expensive operations. It optimizes the *search plan* without redefining the correct result.

---

# Part IX — Scope and lifetime of state

## 38. Each state has a natural lifetime

PlumePilot uses short-lived in-memory state, tab/session-scoped state, persistent extension storage, and authoritative LMS server data. Each fits a different lifetime and recovery contract.

---

## 39. In-memory state

Useful for controllers, current DOM targets, temporary request coalescing and runtime caches whose loss on reload is acceptable or recoverable.

---

## 40. sessionStorage

Useful for state intended to survive certain same-tab navigations without becoming permanent user configuration. It belongs to that browsing session, not the entire extension lifetime.

---

## 41. chrome.storage.local

Appropriate for user preferences, relevant long-lived operation snapshots and notes metadata that must survive popup or background restarts.

---

## 42. The server

Authoritative for course content, enrollment and exam outcomes provided by the LMS. Extension storage is not an independent database of official academic state.

---

## 43. The lifetime rule

**Persist state long enough for its purpose, but not longer than necessary.** Excess persistence causes staleness, privacy exposure and confusing migrations.

---

# Part X — State ownership

## 44. Who owns state?

A key architectural question is which component is responsible for changing a value and which components merely observe it. Ownership should match the operation's domain and lifecycle.

---

## 45. Operation state ownership

The background coordinates cross-context operations and is a natural owner of active job state, leases, cancellation and global progress metadata.

---

## 46. UI state projection

The popup and floating menu may display the same operation while being created and destroyed independently. They should not manufacture two separate truths about that operation.

---

## 47. Ownership reduces races

If independent components can read and write shared state without a protocol, lost updates and split-brain presentation become likely.

---

## 48. Single-writer where possible

A useful pattern is many readers, one authoritative writer, plus a defined command boundary for changes. Not every preference needs such strict centralization, but high-risk operations often do.

---

## 49. Commission-storage writes

Serializing writes through background ownership protects exam/commission snapshots from concurrent read-modify-write losses.

---

## 50. Where one writer is impractical

Users can change ordinary settings from popup and floating menu. Shared storage, change notifications and consistent normalization are more suitable than inventing an exclusive UI owner for every checkbox.

---

# Part XI — Messaging as a protocol

## 51. Messages are not ordinary remote function calls

chrome.runtime.sendMessage crosses an execution-context and lifecycle boundary. The receiver can be absent, restarted, busy or operating on newer state than the sender expects.

**Historical code or diagram:**

```js
chrome.runtime.sendMessage(...)
```

---

## 52. Messages need contracts

An operation command should have an explicit type, accepted fields, identifier, response meaning, error behavior and—when relevant—correlation with later status events.

---

## 53. Accepted is not completed

A response acknowledging START means the request was received or accepted; a long-running export may still be working. This resembles HTTP 202 rather than a completed synchronous function return.

---

## 54. Current protocols

PlumePilot uses string message types and conventional structured objects. They work because the scope is manageable and the contracts are understood.

---

## 55. Possible later growth

As message varieties increase, shared schemas and discriminated message shapes could validate types and make protocol evolution clearer.

---

## 56. Do not abstract prematurely

A complex internal RPC framework can exceed the problem it is meant to solve. Prefer explicit simple contracts now and strengthen only demonstrated weak boundaries.

---

# Part XII — Temporal validity after await

## 57. await changes the world

Before an await, code observes one state. While suspended, the user can navigate, storage can change and the host DOM can rerender. Resuming does not restore the old world.

**Historical code or diagram:**

```js
await something();
```

---

## 58. Revalidate after suspension

Acquire identity → await external work → check cancellation/generation/identity again → apply the result if still relevant. This protects against stale continuations.

```text
capture identity → await → recheck identity → guarded side effect
```

---

## 59. Compare before side effect

Before clicking a lesson or advancing playback, compare the current rendered target and active operation with the identity captured before the wait.

---

## 60. Backend analogy: optimistic concurrency

A database update may require version X still to be current before committing. In browser automation, a generation token or selected lesson identity serves a similar precondition.

---

## 61. Browser version tokens

“Version” can mean an operation generation, DOM render generation, selected lesson identity or current request ID rather than a formal database version number.

---

# Part XIII — Generation tokens

## 62. Discovery generations

A first-incomplete search increments a generation marker so results from an older search can be identified as stale and ignored.

---

## 63. The generation-token pattern

Store generation on start; await asynchronously; compare at resume; do not perform side effects if the generation changed.

---

## 64. Lightweight cancellation

A generation token does not physically abort every pending Promise. It prevents obsolete results from taking action once they complete.

---

# Part XIV — Functional core and imperative shell

## 65. Functional core and imperative shell

Separate pure decisions—candidate priority, identity matching, effective policy, presentation summaries—from imperative browser effects such as DOM clicks, storage writes and network requests.

---

## 66. An existing pure presentation function

autoplayPresentation() derives a view model from input settings without reading DOM or storage. This is an already practical example of a testable functional core.

---

## 67. Route mapping as logic

resolve-target or route-mapping decisions can often be tested as transformations of explicit objects, even if their inputs originated in the LMS DOM.

---

## 68. The imperative shell

Navigating chapters, focusing controls, sending messages and updating persistent state remain browser side effects that should be triggered by validated decisions.

---

## 69. Why this separation helps

Pure rules support fast deterministic tests and clearer invariants. Effects remain concentrated in adapters where lifecycle and error handling can be managed.

---

# Part XV — State machines

## 70. Behavior with history requires state

Autoplay cannot always be represented as one independent function call. What happens next depends on what is playing, waiting, completed, cancelled or superseded.

---

## 71. Symptoms of an implicit state machine

Several flags tracking autoplay, recovery, tests and pending operation often mean a state machine already exists, even if nobody named it.

---

## 72. Reason explicitly about transitions

Ask which event is legal in each state, which guard it requires, which action follows and what must happen on cancel or timeout.

---

## 73. Distributed state vectors

The actual state may be a tuple of operation record, playback phase, current lesson, test policy and cancellation state rather than one enum value.

---

## 74. State explosion

Independent Booleans create many combinations, some impossible or contradictory. Derive redundant values where possible and constrain transitions.

---

## 75. Future state-machine improvement

Where a workflow keeps growing, a reducer, explicit transition table or statechart may reduce illegal combinations. Introducing one everywhere today would be unnecessary complexity.

---

# Part XVI — Idempotence and event identity

## 76. Duplicate events are ordinary

Retries, listeners, reconnections and cross-context notifications can deliver the same logical event more than once. Handle that possibility deliberately.

---

## 77. Deduplication versus idempotence

Deduplication suppresses repeat processing of one event. **Idempotence** guarantees repeating the same operation leaves the same final result. They are related but distinct guarantees.

---

## 78. Operation identifiers

An operationId allows handlers to determine whether an acknowledgement, progress event or completion belongs to the currently relevant job.

---

## 79. Remembering sound events

Notification sounds and achievement events have bounded recent-event memory to reduce duplicate effects across replays.

---

## 80. Design for repeated messages

Even if the transport is simple, ask what happens on duplicated, late or out-of-order events. Event identity and idempotent handling often provide inexpensive resilience.

---
