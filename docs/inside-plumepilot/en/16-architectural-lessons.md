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

# Part XVII — Snapshot and event convergence

## 81. Snapshots and events together

A UI should subscribe to change notifications but also read the current operation snapshot when it starts. Events tell an already-open interface what changed; snapshots let a newly opened interface reconstruct the latest state.

---

## 82. Why event-only is fragile

A popup opened after an export-completed notification cannot recover the state from an event that it never observed. The component lifecycle is shorter than the workflow lifecycle.

---

## 83. Why snapshot-only is expensive

Polling extension storage repeatedly wastes work and introduces latency. With events available, the UI can react promptly instead of constantly requesting the whole state.

---

## 84. The combined approach

Read a snapshot on initialization; subscribe to updates; reconcile events against current identity. This is robust under popup reopening and independent floating-menu lifecycles.

```text
read state snapshot → subscribe to events → reconcile by operation ID
```

---

## 85. Two views converge asynchronously

Popup and floating menu may show slightly different values for a brief period. The goal is not perfectly simultaneous updates but convergence on one authoritative persisted value.

---

## 86. chrome.storage.onChanged as reactive channel

Changes to extension storage notify interested contexts. This becomes a lightweight reactive propagation mechanism without introducing a shared UI process or full state-management framework.

---

# Part XVIII — Semantically fresh caches

## 87. What a cache promises

A cache says “I have evidence previously obtained for this identity with a particular freshness contract,” not “I hold eternal truth.”

---

## 88. A complete cache entry

Store content with the relevant identity, timestamp, source, partial/completion status and any schema or confidence metadata needed for reuse. The raw value alone is often insufficient.

---

## 89. Semantic freshness

A previously established completed activity may remain useful longer than a “video currently playing” observation. TTL alone cannot describe the different staleness semantics of all fields.

---

## 90. Monotonic information

Within a stable activity identity, completion normally progresses from unfinished to finished, not backward. Such monotonicity may allow a stronger fact to survive a weaker older response.

---

## 91. Merging cache observations

When identity is unchanged, combine compatible evidence without downgrading a known completed result merely because a partial response omitted it.

---

## 92. Identity before monotonicity

Never merge “complete” from one route with “incomplete” from another route only because both happen to have the same display order. Monotonicity rules are valid **after** entity identity is established.

---

# Part XIX — Bounded growth

## 93. An unbounded cache is a logical leak

A perfectly functioning garbage collector cannot reclaim objects deliberately held forever by a Map. Capacity and lifetime rules are required for long-lived caches.

---

## 94. pageLessonSnapshots has a limit

The MAIN-world interception cache caps retained lesson snapshots at 50 entries. Bounded insertion-order eviction is simple, predictable and often sufficient.

---

## 95. Notification event memory is bounded

Short-lived event deduplication uses a limited history or time window rather than indefinitely remembering every sound or achievement.

---

## 96. Every cache needs four answers

Who owns it? Which identity does a key represent? When does an entry expire or become invalid? What maximum amount of state may remain resident?

---

# Part XX — Cooperative cancellation

## 97. A Cancel button is not cancellation

Hiding an interface or acknowledging a click does not stop requests, rendering, and packaging. Cancellation must be respected by the actual workflow stages.

---

## 98. Cooperative cancellation

JavaScript does not terminate arbitrary work on command. Long-running code checks an AbortSignal, propagates it into abortable APIs and yields between expensive stages.

---

## 99. Cancellation latency

A signal checked only once every thirty seconds offers poor practical cancellation. Processing units and checks should keep the time between user request and work stopping acceptably small.

---

# Part XXI — Resource ownership

## 100. Allocation implies cleanup ownership

For canvases, PDF.js page objects, event listeners, Object URLs and large buffers, define which stage acquires the resource and which stage is responsible for releasing or invalidating it.

---

## 101. A resource lifecycle

The general lifecycle is acquire → use → transfer ownership or release, with cleanup on success, failure and cancellation. finally blocks are part of algorithm correctness.

---

## 102. Document generation peaks

A 30 MB final EPUB may require much more RAM during conversion because PDF buffers, parsed pages, canvases, images and ZIP data coexist.

---

## 103. Working-set reasoning

Peak memory reflects concurrently live representations. Reducing overlapping lifetimes can be more effective than reducing final archive bytes.

---

## 104. Memory-aware architecture

Sequential conversion, bounded canvas dimensions, banded image processing, asset deduplication and prompt buffer release are architectural choices, not isolated micro-optimizations.

---

# Part XXII — Concurrency and backpressure

## 105. More concurrency is not always better

Promise.all over a large PDF collection might reduce wall-clock time yet multiply active documents, canvas buffers, requests and peak memory.

---

## 106. Pacing is backpressure

Delays between API calls limit bursts and protect the external LMS and local browser from uncontrolled request fan-out.

---

## 107. Possible future concurrency limiter

For some workloads a bounded worker pool may regulate simultaneous requests more precisely than fixed delays. Add one only when measurements justify its complexity.

---

# Part XXIII — Graceful degradation

## 108. Robust features may use different paths

The same user-facing capability may need different adapters or fallbacks. Consistent behavior is more important than identical internal function calls everywhere.

---

## 109. EPUB quality fallback

Text-first conversion, hybrid regions and full visual rendering form a controlled escalation in rendering cost and fidelity.

---

## 110. Materials export fallback

If a high-quality transformation cannot preserve essential information, a safer visual representation can protect document usefulness instead of silently dropping content.

---

## 111. Graceful degradation is not silent corruption

A fallback should produce a valid, understandable result—or report why it cannot. Hiding lost formulas or pretending an export succeeded violates the user contract.

---

# Part XXIV — Semantic parity across runtimes

## 112. Cross-browser semantic parity

Chrome and Edge may use Offscreen API audio; Firefox can use tab messaging. Different mechanisms preserve the same notification goal.

---

## 113. UI semantic parity

Popup and floating menu use different DOM roots and lifecycles, yet should agree on settings, operation availability and effective autoplay policy.

---

## 114. What semantic parity means

Do not force identical HTML trees and lifecycle management. Require both surfaces to satisfy the same meaningful product invariants.

---

# Part XXV — Sharing UI meaning rather than markup

## 115. The 2.35.2 redesign choice

The project did not replace popup and floating menu with one massive shared component. It extracted common presentation rules and retained separate controllers.

---

## 116. Why separate controllers?

The popup is an extension page; the floating panel is embedded in the LMS in Shadow DOM. Scroll geometry, initialization, and focus behavior differ.

---

## 117. What is actually shared?

Autoplay policy summaries, layout normalization, groups, accessibility helpers, typography tokens and other stable rules of meaning.

---

## 118. The rule

**Share stable semantics without forcibly merging surfaces whose lifecycles differ.** Duplicated small DOM wiring can be less harmful than one tangled universal renderer.

---

# Part XXVI — Derived presentation state

## 119. Do not render raw state blindly

Saved preferences and effective runtime behavior can diverge under policy overrides. The UI needs a deliberate interpretation of state, not a direct text label copied from a storage key.

---

## 120. A presentation function

autoplayPresentation() computes summary, testOverride and stopHint from policy inputs. This is an inexpensive shared view model.

---

## 121. Why it matters

Separate popup and floating-menu controllers consume the same interpretation, avoiding two manually maintained rule sets.

---

## 122. Not everything needs persistence

A derived summary can be computed from saved preferences instead of stored as a second independent value.

---

## 123. Duplicate state creates drift

If both enabled and a separately stored “enabledLabel” change independently, one may become stale. Keep one authoritative representation and derive the rest.

---

# Part XXVII — Architectural invariants

## 124. An invariant is a strong sentence

Examples: no ambiguous chapter is clicked; an active export retains a reachable cancellation control; a cancelled EPUB export does not continue expensive work; no unknown vendor transform silently succeeds.

---

## 125. An invariant is better than one patch

A patch says “add a condition after this bug.” An invariant says which behavior must remain true even if the implementation changes.

---

## 126. Tests are executable invariants

Chapter 14 showed how reproductions become assertions. This is an important step from reactive bug fixing to explicit architectural guarantees.

---

# Part XXVIII — Build artifacts are part of the program

## 127. Repository source is not the installed product

An extension runs from a target-specific ZIP, with its own manifest, included files and adapted vendor bundles.

---

## 128. The build belongs to the architecture

Browser specialization, locale inclusion, packaging, pinned vendor transforms, validation and checksums change what users install. They are part of program correctness.

---

## 129. Testing only the source tree is insufficient

A missing stylesheet or invalid Firefox manifest can leave all pure function tests green. The final artifact must be inspected and exercised.

---

# Part XXIX — A build as a compiler

## 130. Build front end

The release pipeline reads shared source, vendor dependencies, manifest definitions and release inputs as its initial representation.

---

## 131. Target lowering

Each browser target receives manifest adjustments, permissions, resource selection and documented compatibility transforms.

---

## 132. Code generation

The builder emits runtime ZIP archives and the Firefox source-review archive.

---

## 133. Verification

The validator inspects the generated artifact for required files, manifest contracts, restricted patterns and checksums. The build resembles a small compiler with validation.

---

# Part XXX — Runtime versus release error behavior

## 134. Runtime workflow fallback

When an external platform is unavailable or content is uncertain, recovery or graceful fallback may be a valid runtime response.

---

## 135. Build failure should be explicit

A deterministic precondition violation—such as a vendor patch matching zero or two times—should fail the release build rather than fall back to unknown output.

---

## 136. Why these failure policies differ

At runtime, users may benefit from an alternate valid route. During packaging, silently emitting an unexpected binary undermines reproducibility and trust.

---

# Part XXXI — Observability and privacy

## 137. Log only useful evidence

A good diagnostic record answers which operation, identity, phase, expected state and observed failure were involved. Dumping all objects indiscriminately rarely helps.

---

## 138. Better diagnostics

“Candidate rejected because lesson ID differs after await” conveys more than “navigation failed.” Logs should explain a decision boundary and its reason.

---

## 139. Structured EPUB diagnostics

Capture elapsedMs, pagesText, pagesVisual, outputBytes and related metrics as structured values. Tests and benchmarks can inspect them without parsing console prose.

---

## 140. Authenticated extensions see sensitive data

Debug output can expose course content, notes, session context or credentials. Treat logs as a privacy-sensitive output, not harmless toy text.

---

## 141. Minimize diagnostic payloads

Log IDs, categories, timings and redacted safe metadata where possible—not passwords, cookies, raw authorization tokens or unnecessary personal content.

---

# Part XXXII — Boundaries around volatility

## 142. Multiversity is an external source of volatility

The LMS can alter API payloads, DOM structure, identifiers and page behavior without a simultaneous extension release.

---

## 143. Browsers evolve independently

Supported browsers differ in lifecycle, rendering, APIs and version cadence. Compatibility contracts must be checked and adapted at their own boundary.

---

## 144. Stores evolve independently

Review rules, metadata schemas, submission processes and automated validators can change even when runtime code does not.

---

## 145. Design for change at integration boundaries

Every external integration should have a documented contract, explicit failure behavior and tests for likely changes.

---

## 146. Ask how, not whether, an external system changes

It is safer to ask which assumptions are likely to vary and where those assumptions are isolated.

---

## 147. A useful response

Put volatile provider parsing in adapters, runtime capability differences in wrappers or build rules, and store-specific constraints in reproducible packaging.

---

# Part XXXIII — Containing essential complexity

## 148. Complexity cannot always be removed

PlumePilot must accommodate multiple universities, evolving LMS code, three browsers and document formats. These are essential product constraints.

---

## 149. But complexity can be contained

An adapter keeps API quirks local, a normalized identity model localizes route collisions, and one release compiler localizes manifest differences.

---

## 150. The alternative spreads exceptions

If every browser or LMS exception appears across ten modules, changing one external rule requires risky edits in many unrelated areas.

---

# Part XXXIV — Principles that generalize

## 151. Patterns compress exception handling

Instead of scattered “if Firefox,” “if Mercatorum,” and “if this chapter was just rerendered,” use stable interfaces, lifecycle rules and identity checks at well-defined boundaries.

---

## 152. A principle replaces many patches

“Revalidate identity after await” explains and prevents an entire family of DOM-race failures more effectively than dozens of isolated extra null checks.

---

## 153. That is architecture

A small vocabulary of boundaries, ownership, identity, evidence and lifetime allows us to reason about many otherwise unrelated defects.

---

# Part XXXV — Pattern map across subsystems

## 154. An emerging pattern map

Core recurring patterns: boundary translation, stable identity, evidence hierarchy, unknown state, progressive refinement, guarded effects, single-source ownership, revalidation, bounded resources, and artifact verification.

---

## 155. First-incomplete example

The search combines platform normalization, scoped identities, index-first evidence, generation tokens, fail-closed ambiguity handling, and expensive fallback only when necessary.

---

## 156. EPUB export example

The converter combines controlled input parsing, quality escalation, memory ownership, cooperative yielding, abort propagation, deduplication and output validation.

---

## 157. Popup and floating menu example

The pair illustrates shared semantics, derived view models, reactive storage synchronization, local UI lifetime and focus-preserving DOM adapters.

---

## 158. Chrome and Firefox example

Targeted build adapters provide shared domain behavior while honoring background, permission, audio, review and artifact differences.

---

# Part XXXVI — Architecture without overengineering

## 159. A hypothetical concept-oriented module map

One might group domain, adapters, workflow coordination, presentation, build, and tests more explicitly. Such a diagram is **conceptual**, not a proposal to immediately relocate every file.

---

## 160. Beware architecture astronautics

Introducing layers, protocols and frameworks solely to make diagrams tidy can add accidental complexity. The architecture must be justified by concrete maintenance or correctness benefits.

---
