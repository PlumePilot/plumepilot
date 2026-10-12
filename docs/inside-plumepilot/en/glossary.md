# Glossary — Inside PlumePilot

This glossary follows the terminology and examples used throughout the book. Definitions describe how each concept appears in the PlumePilot case study.

---

## Adapter
A component that translates between two different interfaces or environments. `bridge.js` partly serves this role between the WebExtension runtime and the page's `MAIN` world.

## Background script / service worker
Extension code handling events and responsibilities that do not depend on the lifetime of a single page or UI. Chromium Manifest V3 uses an extension service worker; Firefox uses a compatible WebExtensions model with configuration differences.

## Boundary
A separation between components that do not directly share a runtime, privileges or state. Crossing it often requires a contract such as a message, API, event or serialized representation.

## Content script
An extension script associated with a webpage. It can interact with the DOM and has different isolation and capabilities depending on its execution world.

## Execution context / execution world
The JavaScript environment in which code executes. It determines global scope, available APIs, isolation and the relationship with the host page.

## Graceful degradation
Continuing to provide useful functionality when the preferred capability or path is unavailable, using a less capable or less efficient fallback rather than failing altogether.

## Idempotence
A property of an operation that can be repeated without producing additional unintended effects beyond its expected result.

## ISOLATED world
The execution world typically used by content scripts. It shares the DOM with the page but has a separate JavaScript global scope and access to the content script's permitted extension APIs.

## Lease
Temporary ownership of a resource, identified by an owner and an expiry. Unlike an indefinite lock, a lease can recover when the owner disappears; PlumePilot uses this concept to prevent concurrent exam-commission checks.

## MAIN world
The execution world shared with the host page's JavaScript. Useful for observing or interacting with the page runtime, but without the content script's isolation.

## Message passing
Communication through messages instead of direct function calls within the same scope. PlumePilot uses both WebExtension messaging and `window.postMessage`.

## Race condition
A condition where the result depends on the timing and order of concurrent operations. The bug may appear or disappear depending on scheduling.

## Source of truth
The system or representation with final authority over a piece of data. Caches, snapshots, indexes and UI views may copy or derive it without becoming authoritative themselves.

## State machine
A model where a system occupies one of a defined set of states and moves between them through events or transitions. Autoplay can be analyzed using this model.

## Command
A message expressing an intention for another component to perform an action. `PEGASO_START_EXPORT` is one example.

## Correlation ID
An identifier that associates requests, progress updates and events belonging to the same workflow. PlumePilot uses `operationId` during exports.

## Deduplication
Recognizing a request or event that has already been processed and preventing duplicate effects.

## Dispatcher
A component that receives messages and routes them to different handlers according to a discriminator, such as `message.type`.

## Event
A fact or signal that has already occurred and can trigger a transition, such as completion of a collection or a progress update.

## Eventual consistency
A model in which components may temporarily hold different snapshots of state but converge through subsequent updates.

## Fire-and-forget
Sending a message and continuing without waiting for an application-level reply.

## Handshake
An initial exchange by which two components check or synchronize state. After registering its listener, `content.js` explicitly requests the current autoplay state so it does not depend on a startup event it may have missed.

## Protocol
The set of messages, payloads, rules and expectations enabling separate components to communicate coherently.

## Query
A message whose main purpose is to retrieve information rather than request a state change.

## Request/response
A pattern in which a sender makes a request and awaits its corresponding response before considering the interaction complete.

## Snapshot
A representation of known state at a particular moment. It can initialize a new subscriber before incremental updates arrive.

## DOM adapter
A layer translating host-page markup and behavior into more stable extension-domain operations, such as `getChapters()` or `openChapter(identity)`.

## DOM snapshot
A record of DOM state at one moment. Collections returned by `querySelectorAll()` are static: subsequent page mutations do not automatically update their membership.

## Event delegation
Handling events on a stable ancestor and using the event target to identify which dynamic descendant was involved. Useful when child nodes are frequently created and destroyed.

## Hierarchy of evidence
An ordering of confidence among sources describing the same state. PlumePilot may prioritize an exact API value over a DOM baseline or heuristic.

## Logical identity
The identity of a domain entity independent of the particular DOM object representing it at a given moment.

## MutationObserver
A Web API reporting changes in the DOM tree. PlumePilot uses it as a signal that relevant elements such as the video player may have appeared or changed.

## Polling
Repeatedly checking a condition at intervals until it succeeds or a deadline expires. `waitFor()` follows this pattern.

## Precondition recovery
Trying to restore a required condition before continuing, such as reopening a closed chapter before looking for its activities.

## Readiness condition
An observable condition indicating that a component or state is genuinely ready, preferable where possible to an arbitrary delay.

## Resolve late
Preserving a stable identity and resolving the concrete reference as close as possible to its use, reducing reliance on stale references.

## Selector contract
An implicit dependency on host-page structure, attributes or CSS classes used to locate meaningful elements.

## Stale DOM reference
A previously obtained node reference whose node has been removed, replaced or no longer represents the current UI state.

## API adapter
A component translating an external API into a more stable internal interface, hiding details such as URLs, authentication, parsing and raw response formats.

## Anti-corruption layer
A layer protecting the application's internal model from the conventions and structures of an external system by translating them into local domain concepts.

## Asymmetric error cost
A situation where different kinds of error have different consequences. An algorithm may therefore prefer uncertainty over a particularly costly false positive.

## Bearer token
A credential commonly sent in an HTTP `Authorization: Bearer ...` header. The server determines the privileges associated with that credential.

## Boundary normalization
Validating and transforming data as it crosses from an external system into the application's internal model.

## Bounded cache
A cache with an explicit limit on retained entry count or size, preventing unlimited memory growth.

## Cache hit
A lookup where a key exists and its entry is usable for the current request. This book distinguishes a physical hit from a **semantic hit**, where freshness, completeness and identity justify reuse.

## Cache miss
A lookup with no usable cache entry. It can occur even when a key exists but its entry is stale, partial or semantically incompatible.

## Composite key
A key combining several identity components. `courseCode:lessonNumber` prevents lesson `3` in different courses from colliding in one cache entry.

## Eviction
Deliberately removing cache entries, often to enforce a capacity limit. Unlike invalidation, an entry may remain valid but be evicted because the cache is full.

## LRU cache
A **Least Recently Used** policy evicting the least recently accessed entry when capacity is exceeded. LRU addresses capacity, not freshness.

## Read model
Data organized for efficient application reads. `lessonApiCache` retains a normalized model useful to PlumePilot instead of raw API JSON.

## Semantic freshness
Whether data is valid based on its meaning as well as its age. A stale pending test may need refreshing, while already confirmed monotonic completion may remain reusable.

## Credential minimization
Making a credential accessible to as few components as possible and for no longer than reasonably necessary.

## Defensive integration
Integrating with an external system while anticipating schema changes, partial data and failures, using validation, fallbacks and explicit error categories.

## Monotonic state
State that may advance but should not regress under domain rules. Confirmed completed progress is often treated as monotonic in PlumePilot.

## Passive caching
Reusing data observed in requests the host application would make anyway, avoiding duplicate requests where possible.

## Pacing
Intentionally spreading requests over time to prevent excessive bursts; unlike a retry, this regulates ordinary operation.

## Reconciliation
Aligning two representations of the same domain, such as the visible course structure and an API course index.

## Semantic retry
Retrying when a technically successful response does not yet contain enough meaningful information to continue.

## TTL
**Time to live:** the interval after which cached data is considered too old for particular purposes.

## Event loop
Runtime machinery coordinating tasks, microtasks, events and asynchronous completions, determining when JavaScript continues.

## Run-to-completion
A synchronous JavaScript job finishes before another job runs in the same agent. It does not make a workflow containing `await` atomic.

## Call stack
The stack of currently active JavaScript execution contexts. When empty, the runtime can process queued microtasks and other event-loop work.

## Task
A unit scheduled by the event loop, such as a user event or timer callback.

## Microtask
Work run after the current task and before the next task. Promise continuations and `MutationObserver` callbacks use the microtask mechanism.

## Promise
An object representing a future outcome that moves from pending to fulfilled or rejected.

## Concurrency
Several operations are in flight during the same time interval, even when their JavaScript executes on only one thread.

## Parallelism
Truly simultaneous execution of several operations by separate execution resources.

## Critical section
A logical region accessing shared state that must be protected against incompatible interleavings.

## Operation serialization
Forcing concurrent operations to run in sequence. PlumePilot uses Promise queues to guard certain read-modify-write critical sections.

## Reentrancy
A workflow being invoked again before its previous invocation finishes. A local `busy` flag can serve as a reentrancy guard.

## Cooperative cancellation
Cancellation in which the workflow checks a flag or signal periodically and voluntarily stops at safe points.

## AbortController
A Web API producing an `AbortSignal` to communicate cancellation to compatible operations, such as `fetch()` or the EPUB builder.

## Timeout
An application deadline after which waiting is no longer acceptable. It is not synonymous with a delay, retry or cancellation.

## Backpressure
Slowing or limiting the producer when a later stage or external resource cannot consume work quickly enough. Pacing, sequential pipelines and bounded concurrency can provide backpressure.

## Safety
A guarantee that prohibited states or transitions never occur—for example, two incompatible global operations running simultaneously.

## Liveness
A guarantee that the system can continue to make progress instead of becoming stuck forever—for example, releasing an operation whose owner disappeared.

## Ephemeral state
State tied to one JavaScript instance that can be reconstructed without semantic loss after the instance ends.

## Durable state
State kept in storage outliving the context using it, so it can be recovered after reloads or runtime recreation.

## Lifetime matching
Choosing storage whose lifetime matches the actual need for the data, avoiding both premature loss and excessive persistence.

## Stored intent
Persisted configuration expressing a user's choice, even when runtime constraints temporarily require different effective behavior.

## Effective state
The state actually enforced by the runtime after combining preferences, constraints and current context.

## Orphan state
Persisted state referring to an owner or workflow that no longer exists and needs reconciliation or removal.

## Negative caching
Temporarily retaining failed or negative results to avoid redundant attempts or preserve diagnostic information.

## Cache fingerprint
A signature derived from meaningful inputs to determine whether a structural cache remains compatible with the current state.

## Event-driven invalidation
Invalidating a cache when a concrete event proves the data is no longer valid, instead of relying only on age.

## Data provenance
Information about where a value came from and how authoritative or complete its source was.

## Rebase (state/cache)
Realigning derived state with a new authoritative baseline and clearing or recomputing local deltas to prevent double counting.

## Durable handoff
Passing a payload between independently lived producer and consumer contexts through storage that survives until the consumer is created.

## Lazy migration
Migrating persistent values gradually as they are read or rewritten, rather than running a full conversion up front.

## Schema migration
Reading, normalizing or transforming data stored under an older schema into the current software version's expected format.

## Finite State Machine (FSM)
A behavior model with a finite set of states and transitions, usually triggered by events.

## State
A system's current mode determining which events and behaviors are valid at that moment.

## Transition
A move from one state to another in response to an event and any applicable guards.

## Guard
A condition that must be true for a state transition to be enabled.

## Action / Effect
A side effect associated with a transition, such as a click, HTTP request, storage write or notification.

## Extended state / Context
Data associated with a state machine that influences behavior without requiring every value to become a separate finite state.

## Delayed transition
A transition scheduled after a delay, allowed only if its guards and context are still valid when it runs.

## State history
Information about a previous state or context retained to resume an interrupted workflow correctly.

## State explosion
Combinatorial growth in the number of states when independent properties are flattened into one finite-state machine.

## Hierarchical state
A state containing substates, allowing complex workflows without flattening every detail onto one level.
