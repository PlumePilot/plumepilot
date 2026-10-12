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

## Orthogonal state
Independent state dimensions active simultaneously, represented in a statechart as parallel regions.

## Fail closed
A conservative approach that blocks or limits a transition under significant uncertainty rather than assuming a favorable condition.

## Invariant
A property that must remain true across all relevant system states and transitions.

## Transition coverage
Coverage of meaningful state-machine transitions, including guards and negative paths, rather than merely executing their source lines.

## Search space
The set of candidates an algorithm may need to inspect. Reducing it can dramatically cut expensive work even when asymptotic complexity remains linear.

## Heuristic
A signal or rule directing a search toward promising candidates without independently guaranteeing the final answer.

## Index
A compact representation for locating data or candidates without reading every complete record. An index is not necessarily the source of truth.

## Candidate ordering
Choosing the order in which potential results are checked. It can reduce average cost while retaining all verifiable candidates.

## Stable partition
Grouping items while preserving their original relative order within each group. In PlumePilot's bookmark search, chapters suspected to be below 100% move first without being sorted by percentage.

## Short-circuit
Stopping a search or evaluation early once the necessary result has been determined.

## Progressive refinement
Starting with cheap, coarse information and escalating to more expensive and precise sources only when necessary.

## Targeted fallback
Applying a fallback to the specific uncertain candidate, preserving earlier work rather than restarting the entire workflow.

## False positive
A result incorrectly classified as belonging to the sought category.

## False negative
A result incorrectly excluded from the sought category. When finding the first incomplete activity, it can cause genuinely pending work to be skipped.

## Ternary knowledge
Representing three epistemic values such as `complete`, `incomplete` and `unknown` instead of converting missing knowledge into false certainty.

## Evidence precedence
Rules deciding which source prevails when observations differ in reliability, completeness or freshness.

## Generation token
A counter or version associated with an asynchronous operation. A stale continuation refrains from acting when its token no longer matches the current one.

## Precision / Recall
Information-retrieval concepts: precision measures how many selected candidates are relevant; recall measures how well the search avoids missing genuinely relevant candidates.

## ArrayBuffer
A raw binary-memory block used by Web APIs. It does not assign meaning to bytes; typed views such as `Uint8Array` interpret them.

## Uint8Array
A JavaScript typed array whose elements are unsigned eight-bit integers, useful for binary files, compressed images, PDFs and archives.

## Blob (Web API)
A Web API object representing immutable file-like binary data. It can carry a MIME type and be exposed through an Object URL for local display or download.

## Object URL
An opaque URL created by `URL.createObjectURL()` to expose a `Blob` or compatible object. Revoke it when no longer needed so the resource is not retained unnecessarily.

## MIME type
A content-type identifier such as `application/pdf`, `text/html` or `application/epub+zip` indicating how to interpret a resource.

## Data serialization
Converting a structure into transferable or persistent form, such as JavaScript objects to JSON or a PDF/EPUB model to final bytes.

## Rasterization
Converting vector or descriptive content into a pixel grid. PlumePilot uses PDF.js canvas rendering when visual fidelity is safer than reflow.

## Reflow
Content dynamically adapting to screen size, font and reader preferences. Typical of reflowable EPUB, unlike fixed-coordinate PDF layout.

## Fixed layout
A representation with mostly predefined element position and geometry, as in ordinary PDF pages.

## Lossless / lossy transformation
Lossless conversion preserves relevant information; lossy conversion may discard or reinterpret it. PDF merging is close to lossless, while PDF-to-EPUB necessarily makes interpretive choices.

## Intermediate Representation (IR)
A representation between a pipeline's input and final output. An explicit IR separates parsing, transformation and serialization for better testing and maintenance.

## Content-addressable storage
Identifying an asset by its content, typically through a cryptographic digest. PlumePilot's EPUB generator uses SHA-256 to recognize and reuse identical images.

## Working set
Resources that must remain simultaneously live during processing. Their size affects memory pressure more directly than the final file size alone.

## Peak memory
Maximum memory usage reached during a pipeline, potentially much greater than the resulting file's size.

## Ownership
A model defining which component is responsible for a resource and when it may release it. Useful in JavaScript for buffers, canvases, temporary URLs, listeners and binary assets.

## Cooperative scheduling
A long-running task periodically yields to the event loop so the browser can update its UI, process events or react to cancellation.

## Partial success
A batch produces a useful artifact despite recording failures in some items rather than imposing all-or-nothing completion.

## Golden file
A reference artifact used to compare generated output in tests. Checking structure and semantics is often preferable to comparing exact bytes.

## Editing host
An editable element, typically `contenteditable`, that the browser treats as the root of an editing region. It handles input and the caret without providing a high-level document model.

## Selection
The user's current selection in a document. It may cover a content range or be collapsed to one insertion point, the caret.

## Range
A structural DOM interval defined by start and end points, each with a container and offset. It can be cloned, extracted, collapsed or used to insert nodes.

## Caret
The text insertion-position indicator. In Selection APIs it can be modeled as a collapsed selection with identical start and end.

## Collapsed selection
A Selection or Range whose start and end coincide. It still identifies a precise insertion point even though no text is selected.

## DocumentFragment
A lightweight DOM container holding nodes outside the displayed document. `Range.extractContents()` returns a `DocumentFragment` containing extracted nodes.

## Tree rewriting
Structurally transforming a tree, such as splitting a highlighted wrapper into segments or moving an item out of a checklist while retaining node order.

## DOM normalization
An editing cleanup step restoring invariants after a change, correcting structures the browser accepts but the application does not consider semantically valid.

## Structural guard
A condition preventing a transformation when the affected structure cannot be safely changed, such as a selection spanning incompatible blocks.

## Rich-text mark
An inline annotation such as bold, italic, highlight, superscript or study mask.

## Rich-text block
A block-level structural element such as a paragraph, list item or callout, whose semantics span more than an inline text run.

## Sanitization allowlist
Reconstructing accepted content using only explicitly permitted tags, attributes and values rather than trying to enumerate everything forbidden.

## Undo history
The sequence of editorial actions allowing changes to be undone and redone. Native browser editing and custom DOM manipulation can affect this history differently.

## Transaction model
Representing an edit as an atomic operation on a document model, with prior state, transformation and resulting state; common in more structured rich-text editors.

## Document model
A UI-independent logical representation of rich content comprising blocks, text, marks and attributes. In advanced editors, the DOM can be a projection of this model rather than the model itself.

## Editing normalization loop
The pattern `inspect → mutate → inspect/normalize` when a browser editing command produces valid DOM that does not satisfy the application's semantic rules.

## Presentation layer
A layer translating application state and rules into UI-ready information without owning the domain. PlumePilot's `menu-ux.js` shares presentation rules while individual controllers retain storage and operation responsibilities.

## Derived state
Information calculated from other state instead of persisted independently. The autoplay summary derives from skip-completed settings, test behavior, chapter limits and the 70% threshold.

## View model
Data prepared for a particular view, reducing rules the renderer must reconstruct and forming a possible boundary between domain and presentation.

## Progressive disclosure
An interaction pattern keeping frequent actions immediately visible while placing secondary details and configuration behind explicit navigation or expansion.

## Roving tabindex
Focus management where one item in a group has `tabIndex=0` and the others `-1`, with arrow keys handling internal navigation. Common in accessible tablists.

## Focus restoration
Deliberately returning focus to the opener when a view, dialog or panel closes, preserving predictable keyboard navigation.

## UI invariant
A property that must remain true across rendering and preferences; for example, a running operation must retain a reachable cancellation control.

## Design token
A shared semantic value for color, size, spacing, typography or another visual role. CSS properties `--ux-*` allow matching role scales across popup and floating menu.

## DOM protocol
A stable convention of attributes, roles or structure connecting markup to behavior across renderers. The `data-ux-*` and `data-menu-*` attributes form a small internal protocol in version 2.35.2.

## Reactive synchronization
Changes in a shared source trigger notifications and targeted view updates. PlumePilot uses `chrome.storage.onChanged` to coordinate popup and floating menu without direct messaging between them.

## Constrained customization
Customization subject to product invariants. Users may reorder and show/hide actions within semantic groups without erasing the group hierarchy or active-work cancellation route.

## Shadow DOM
An encapsulated DOM subtree attached to a host. It isolates mainly structure and styles from the surrounding document; it is not a security sandbox. PlumePilot's floating panel uses a closed `ShadowRoot`.

## Hot path
An execution path called frequently or responsible for a large share of total cost, established through measurement rather than intuition alone.

## Fast path
An optimized route for common or easily identified cases that avoids more expensive operations. Text reflow is an EPUB fast path compared with visual rendering.

## Slow path
A more expensive route used when a fast path cannot ensure sufficient correctness or quality, such as visual fallback, retry or detailed verification.

## Coalescing
Combining nearby signals into fewer processing steps. Several DOM mutations might require only one later rescan.

## In-flight deduplication
Sharing one pending asynchronous operation among equivalent consumers. Caching a Promise lets simultaneous requests for the same resource use one fetch.

## Bounded growth
A data structure with an explicit or context-lifetime limit on retained entries or total volume, preventing unbounded accumulation.

## Admission control
Deciding whether and how to start an expensive operation before allocating resources. `visualRenderScale()` caps canvas dimensions and pixels before rasterization.

## Data locality
Keeping state and caches close to the component consuming and owning them to reduce transfers and ambiguous ownership across contexts.

## Cancellation latency
Elapsed time between requesting cancellation and the expensive work actually stopping. It depends on cancellation-point frequency and whether lower-level operations support aborting.

## Cost-based optimization
Ordering operations by real-world cost rather than only iteration count. Prioritizing likely incomplete chapters saves detail calls and DOM transitions while asymptotic complexity may remain linear.

## Resource invariant
A testable lifetime property, such as shrinking a temporary canvas after encoding or keeping a cache below its configured limit.

## Working-set control
Limiting how many memory-intensive resources remain live at the same time. Sequential EPUB conversion trades concurrency for a lower memory peak.

## Perceived latency
How long a task seems to take, influenced by progress, responsiveness, feedback and cancellation as well as elapsed wall time.

## Runtime compatibility
Ability of code to run correctly under a browser engine and its available APIs, distinct from whether a package can be distributed through its store.

## Distribution compatibility
Compliance of a packaged artifact with the target store's manifest, metadata, localization, packaging and submission requirements.

## Manifest compatibility
Validity of `manifest.json` under a target's extension model, such as Chromium's `background.service_worker` versus PlumePilot Firefox's `background.scripts`.

## Policy compatibility
Compliance with a store's review and distribution policies. A program can run correctly and still fail policy review.

## Build-time specialization
Generating different artifacts from one source tree by resolving known manifest, permission, locale or runtime-adapter differences during the build.

## Capability detection
Checking the existence of a specific feature, such as `chrome.offscreen?.createDocument`, instead of inferring support from a browser's brand or user-agent string.

## Compatibility adapter
A component translating one domain capability into APIs or mechanisms available in a particular environment without exposing those differences to callers.

## Semantic parity
Equivalent observable behavior across targets even when internal implementations differ. Chrome may use offscreen audio while Firefox uses a content tab with the same sound-notification semantics.

## Divergence budget
The maintenance cost of browser-specific differences. Every specialized branch or artifact expands the test, comprehension and release matrix.

## Deterministic build
A build producing identical output for the same inputs and controlled environment. Fixed ZIP timestamps and stable entry ordering reduce nondeterminism.

## Reproducible build
A build an independent party can recreate from declared source and compare against the distributed output.

## Fail-closed transformation
A build transformation stopping if expected preconditions fail instead of applying a partial or ambiguous patch. `replaceExactly()` requires the upstream substring to occur exactly once.

## Source submission
An archive of readable sources, dependencies and build instructions for reviewers to reproduce and examine a generated runtime artifact.

## Artifact test
A test of the final distribution output, checking manifests, included files, checksums, permissions and packaging invariants that source tests alone cannot cover.

## Supply-chain provenance
Information tracing the origin, version, checksum and transformations of a dependency or release artifact.

## Checksum pinning
Associating an expected file with a known cryptographic digest to detect accidental or unexpected byte-level changes.

## Artifact identity
The exact-byte identity of a distributable output, usually represented by a checksum. It differs from source commit identity and human product version; one commit can generate several browser-specific artifacts.

## Release matrix
A table specifying which features, manifests, adapters, packages and checks must hold for each supported target.

## Polyfill
A substitute for a missing API attempting to reproduce its interface and semantics; unlike a fallback that achieves the goal through a different mechanism.

## Fallback adapter
An alternative mechanism used when the preferred capability is unavailable, preserving domain behavior as far as possible.

## Release compiler
A conceptual model of build tooling translating one common source tree into target-specific forms, analogous to compiler lowering and code generation.

## Executable invariant
An architectural rule expressed in a validator or test instead of left as informal knowledge. Example: a Firefox package must not include the `offscreen` permission.

## Regression test
A test preventing the recurrence of an observed bug. Ideally it asserts the violated property rather than only the accidental steps that exposed the symptom.

## Root cause
The structural cause making incorrect behavior possible, distinct from the visible symptom and contributing factors.

## Minimal reproducer
The smallest case still exhibiting the failure, narrowing debugging work and making a deterministic test easier to construct.

## Test double
A controlled substitute for a real dependency in a test; stubs, fakes, mocks and spies are different varieties.

## Failure injection
Deliberately introducing errors, timeouts, missing data or cancellation to verify recovery and fallback behavior.

## Architecture test
A test protecting structural invariants such as load order, module dependencies, manifest resources or guard precedence.

## Flaky test
A test that sometimes passes and sometimes fails under apparently identical code and inputs, often due to real timers, scheduling, network, animation or uncontrolled shared state.

## Hermetic test
A test whose external dependencies are strongly controlled, minimizing network, clock, storage and other nondeterministic inputs.

## Golden test
Comparing output with a known reference; useful for generated documents and fixtures when the golden captures meaningful properties rather than incidental noise.

## Behavioral coverage
The observable system properties a test suite really protects. High line coverage does not necessarily mean strong behavioral coverage.

## Test seam
A boundary where a dependency such as a clock, fetch function, storage adapter or DOM adapter can be replaced during testing.

## Failure oracle
The rule deciding whether an experiment or test succeeds or fails, checking the actual required property rather than an incidental detail.

## Observer effect
Behavior changes caused by the observation tool itself. For example, DevTools may keep an extension service worker alive and hide lifecycle defects.

## Executable specification
A requirement implemented as an executable test or validator that fails automatically when the property is violated.

## Test brittleness
A test failing after nonsemantic changes or internal refactors irrelevant to the behavior it was intended to protect.

## Contract drift
An external API, DOM, manifest or policy boundary changes and invalidates consumer assumptions. Contract tests aim to catch this near the boundary.

## Safety property
A property stating that something bad must never occur, such as reloading a hidden page or advancing a lesson other than the selected one.

## Liveness property
A property stating that the system must eventually make progress, such as resuming a wait when a tab becomes visible again.

## Functional core, imperative shell
A pattern separating mostly pure decisions from browser, DOM and storage side effects. The core is easier to test; the shell owns imperative actions.

## Git blob
A Git object storing a file's bytes without its filename; a tree associates filenames with blobs.

## Git tree
A Git object representing a directory snapshot, names and references to blobs or nested trees. Different commits may point to the same tree.

## Git commit
An immutable object referencing a tree, parent commits and metadata such as author, committer and message. Changing the parent creates a different commit even for the same tree.

## Git ref
A named, movable pointer to a Git object. A branch is typically a ref advancing to new commits.

## HEAD
The ref representing the current Git checkout. Normally points to a branch; in detached HEAD it references a commit directly.

## Merge commit
A commit with multiple parents recording integration of divergent histories without collapsing the branches' individual commits.

## Squash merge
Combining changes from several PR commits into one new commit on the base. It simplifies the mainline but changes ancestry relative to the original commits.

## Git rebase
Recreating commits on a new base. Their parent references and hashes change even if the patches remain semantically equivalent.

## Cherry-pick
Applying a selected commit's change elsewhere in history, creating a new commit.

## Revert
A new commit reversing the effects of an earlier change without removing that change from public history.

## Merge base
A common ancestor used to compare and integrate branches. Squash and rebase can change it even when some content is already logically shared.

## Tree equality
Two commits reference the same Git tree and represent identical complete tracked-file snapshots, although their parents, messages and commit identities may differ.

## Stacked PR
A pull request built on another unmerged PR's branch. It narrows incremental diffs but needs care if the base PR is squashed or rebased.

## Force-with-lease
A guarded forced remote-branch update allowed only if the remote ref still matches the expected state, reducing the risk of overwriting concurrent changes.

## Release candidate
Software considered potentially publishable and undergoing final tests, packaging and compatibility checks.

## Release provenance
The verifiable chain connecting source commit, build process, produced artifact, checksum and distribution channel.

## Deployment history
Versions actually distributed through different channels or stores, potentially differing from Git history or the sequence of GitHub Releases.

## Roll-forward
Fixing a problematic release by publishing a newer version, sometimes restoring earlier behavior, rather than trying to downgrade an update system to a superseded version.

## Evidence hierarchy
Explicit authority ordering among sources describing the same fact, distinguishing definitive, contradictory and merely suggestive signals.

## Temporal validity
Whether state remains valid over time. Data correct before an `await` may be stale when the continuation resumes.

## Revalidation
Rechecking state after an asynchronous suspension and before a side effect to avoid acting on stale information.

## Volatility boundary
A boundary containing frequently changing components such as host DOM or external APIs, protecting more stable domain logic.

## Architecture fitness function
A test or validator continuously enforcing an architectural property, such as bounded caches or the absence of prohibited capabilities in a Firefox artifact.

## Human-in-the-loop automation
Automation that supports rather than overrides the user; newer explicit manual intent takes precedence over previously scheduled automatic continuations.

## Scaling debt
A once-appropriate choice that becomes costly as the system's scale, number of features or rate of change increases; this does not make the original decision a mistake.

## Strangler refactor
Incrementally replacing responsibilities in an existing system rather than performing a total rewrite and one high-risk cutover.

## Platform adapter
A boundary translating an external platform's DOM, URLs, APIs or capabilities into a more stable interface consumed by the core.

## Repository pattern
A persistence boundary centralizing access, keys, normalization and migration so callers need not know storage details.

## In-flight coalescing
Sharing one ongoing Promise or request among callers simultaneously needing the same resource, avoiding duplicate work and cache stampedes.

## Structured diagnostics
Diagnostic events or records with explicit fields such as identity, phase, duration or fallback reason instead of only free-form log text.

## Decision reversal cost
The technical and operational cost of undoing a choice after other systems, stored data or workflows have come to depend on it.

## Wrong abstraction
An abstraction created before understanding what is genuinely common between cases, potentially adding more coupling and complexity than the duplication it sought to remove.

---

[← Contents](index.md)
