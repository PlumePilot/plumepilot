# 06 — State, cache, and storage

## Where the truth lives

In the preceding chapters we studied the DOM, APIs, messaging, and asynchrony. We can now ask a deceptively simple question:

> **When PlumePilot says it knows something, where is that information stored?**

There is no single answer. A user preference such as the theme may remain useful for months. An API response may be useful for five minutes. An in-flight Promise belongs to one script instance. A cancelled export should no longer block future work, even if the popup that started it has disappeared.

The real architectural problem is not merely:

```text
store data
```

but:

```text
what to store
    +
where to store it
    +
how long it must live
    +
who is allowed to change it
    +
when to stop trusting it
```

---

# Part I — State is not one thing

## 1. A useful taxonomy

We can distinguish at least six categories in PlumePilot:

| Category | Example | Typical lifetime | Survive a reload? |
|---|---|---|---|
| Ephemeral state | `busy`, `pendingTurboApiRequests` | Script instance | No |
| In-memory cache | `lessonApiCache` | Page lifetime | No |
| Per-tab recovery | `sessionStorage` | Tab/page session | Yes, as needed |
| User preferences | `enabled`, `stopAtTests` | Browser sessions | Yes |
| Coordination state | `pegasoActiveOperation` | Until job releases/expires | Yes |
| Temporary handoff | `pegasoExportJob:<jobId>` | Producer → consumer | Until consumed |

These categories differ in ownership, durability, scope, and the cost of losing them.

---

## 2. Lifetime is an architectural requirement

Consider four facts:

```text
A. The popup is in Gaming mode.
B. A course-material export is running.
C. A lesson API response was read 30 seconds ago.
D. The page is recovering from a session conflict after a reload.
```

When the popup closes, the preference and the export state must still be recoverable. The lesson cache and the page's recovery state do not depend on the popup in the first place.

After a course-page reload, the API cache can be discarded, but the session-conflict recovery needs to survive long enough to finish. After a browser restart, the user's preferences should remain; a stale operation record should be *reconciled*, not blindly assumed alive.

This is why one global variable—or one indiscriminate database—would be conceptually weak.

---

# Part II — Volatile state: variables and `Map`

## 3. The cheapest state is the state we can afford to lose

Near the beginning of `content.js`, the code maintains structures such as:

```js
const pendingTurboApiRequests = new Map();
const lessonApiCache = new Map();
const courseProgressChapters = new Map();
const pendingLessonVerificationAttempts = new Map();
const materialLinkCache = new Map();
const materialOutlineCache = new Map();
const testSourceCache = new Map();
```

Source: `content.js`, approximately lines 131–137 in the historical snapshot.

These are JavaScript objects owned by the current script instance, not persistent databases. A page reload destroys them.

That is not automatically a problem. Sometimes it is the best possible invalidation policy.

---

## 4. Rebuildable cache versus indispensable state

Consider:

```js
const lessonApiCache = new Map();
```

If the cache disappears, PlumePilot may need to repeat API requests. That is less efficient, but it need not corrupt the workflow. This is a **rebuildable optimization**.

Compare a preference such as:

```text
autoplayStopAt70Enabled = true
```

If the user explicitly selected it, losing it on reload would be a bug.

The question is not simply whether information is valuable, but **what happens if it vanishes**.

---

## 5. A practical question: what if this value disappeared now?

Four useful answers:

### A. The program could recompute it

It is probably a cache or derived state.

### B. The user would lose a decision

It probably needs persistence.

### C. The program might perform a dangerous operation twice

It is probably operational or coordination state.

### D. A recovery could repeat indefinitely

It may need narrowly scoped persistence across reloads.

This mental model helps choose storage *before* choosing an API.

---

# Part III — `chrome.storage.local`

## 6. Why not simply use `localStorage`?

PlumePilot declares the WebExtension storage permission:

```json
"permissions": [
  "storage"
]
```

and uses:

```js
chrome.storage.local
```

Unlike ordinary page-specific Web Storage, extension storage provides a shared extension API accessible across its permitted contexts, including short-lived popup and background components.

This matters because **popup JavaScript variables disappear when the popup closes**, and an MV3 background service worker may be stopped and restarted.

---

## 7. Storage as a common point between contexts

Recall:

```text
popup
background
bridge
floating menu
builder
```

These contexts do not share one mutable JavaScript global.

But several can read the same extension storage:

```text
popup
   │ writes enabled=false
   ▼
chrome.storage.local
   │
   └─ storage.onChanged → bridge
                              │
                              ▼
                          MAIN world
```

Storage is therefore more than a settings folder. In some flows, it is also part of the synchronization architecture.

---

# Part IV — The popup's lifecycle

## 8. Popup cold start

When the popup opens, `popup.js` reads a broad configuration snapshot:

```js
chrome.storage.local.get(
  {
    enabled: true,
    stopAtTests: false,
    autoCompleteTests: false,
    autoplaySkipCompletedVideos: false,
    autoplayChapterLimitEnabled: false,
    autoplayChapterLimits: {},
    autoplayChapterLimitSessions: {},
    autoplayChapterLimitStatuses: {},
    // ...
  },
  (result) => {
    // Render current UI state
  },
);
```

Source: `popup.js`, approximately lines 1308–1374.

```text
popup opens
   ↓
reads persisted snapshot
   ↓
initial render
```

The popup never assumes that an older instance is still alive. Every opening reconstructs the view from current state.

---

## 9. Initial snapshot plus incremental updates

The popup also observes later storage changes:

```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.pegasoActiveOperation) {
    renderOperation(changes.pegasoActiveOperation.newValue || null);
  }

  if (changes.enabled) {
    // Update the UI
  }
});
```

Source: `popup.js`, approximately line 1410 onward.

The pattern is familiar from Chapter 02:

```text
1. Read current snapshot.
2. Render.
3. Subscribe to subsequent changes.
```

Events alone are insufficient: a popup that opens after a change needs the current value, not an event that was emitted before it existed.

---

# Part V — Stored intent versus effective state

## 10. A saved preference is not always the active configuration

In `bridge.js`, `readAndSendState()` reads `stopAtTests` and `autoCompleteTests`.

The runtime derives:

```js
const autoEnabled = result.autoCompleteTests === true;

const stopEnabled =
  result.stopAtTests !== false && !autoEnabled;
```

The original code comment explains:

```js
// Keep the user's stop-at-tests preference in storage, but make it
// inactive at runtime while automatic test completion is enabled.
```

This separates two ideas:

### Stored intent

What the user chose. The preference remains saved even while another feature temporarily supersedes it.

### Effective state

What the runtime can actually enable given the entire configuration.

The app should not erase a user's preference just because it cannot apply that preference at the present moment.

---

# Part VI — Scoped preferences and composite keys

## 11. A session chapter limit is not a global number

PlumePilot supports several platforms and courses. A setting such as:

```text
autoplay limit = 5 chapters
```

might mean five chapters for *every* course or five for *one particular course*.

For several settings, PlumePilot chooses course-scoped behavior. The popup constructs composite keys combining the platform and course, so two courses with the same code on different platforms do not collide.

---

## 12. Scope is part of identity

A general principle:

> **The identity of a stored value includes its scope.**

Knowing:

```text
courseCode = ABC123
```

may not be enough if that code is not unique across platforms. We need:

```text
(platformId, courseCode)
```

This is the same idea as a database composite primary key:

```sql
PRIMARY KEY (tenant_id, user_id)
```

or a distributed cache key scoped by tenant and resource.

A string such as `pegaso:ABC123` is just one way to serialize a composite identity.

---

## 13. A real small-scale migration

`popup.js` also understands an earlier key format:

```js
function courseScopedValue(map, courseCode, platformId = "pegaso") {
  const key = courseStorageKey(courseCode, platformId);
  if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  return platformId === "pegaso" ? map[courseCode] : undefined;
}
```

It first looks for the new key:

```text
pegaso:ABC123
```

but recognizes the old Pegaso-only key:

```text
ABC123
```

During subsequent writes, legacy entries are progressively retired.

This is **lazy migration**: support older data when reading, then write the new representation without requiring a one-time global migration step.

---

# Part VII — Background state and Manifest V3

## 14. The Manifest V3 background problem

Chromium uses:

```json
"background": {
  "service_worker": "background.js"
}
```

An extension service worker is **not a permanently running backend process**. The browser may start it when needed and terminate it when idle.

`background.js` contains in-memory Promise queues such as:

```js
let operationQueue = Promise.resolve();
let builderQueue = Promise.resolve();
let commissionQueue = Promise.resolve();
```

Those queues coordinate work within the current worker instance. They are not, by themselves, durable records of which user operations remain active.

---

## 15. `pegasoActiveOperation`: persisted operational state

The background defines:

```js
const OPERATION_KEY = "pegasoActiveOperation";
const MAX_OPERATION_AGE_MS = 2 * 60 * 60 * 1000;
```

An acquired operation is recorded with details such as:

```js
const operation = {
  id: crypto.randomUUID(),
  kind,
  phase: batch ? "running" : "collecting",
  message,
  startedAt: Date.now(),
  sourceTabId,
};

await storageSet({ [OPERATION_KEY]: operation });
```

This is not a preference. It is a **coordination record**, describing what is running, who owns it, which phase it is in, and when it started.

---

## 16. Why not `let activeOperation`?

Imagine:

```js
let activeOperation = null;
```

Then:

```text
1. EPUB export begins.
2. activeOperation is set.
3. The service worker is stopped and later recreated.
4. activeOperation becomes null again.
5. A second incompatible operation starts.
```

Persisting the coordination record allows a fresh worker instance to reconstruct its knowledge.

The backend analogy:

```text
process memory ≠ durable state
```

A server can restart; a container can be replaced; a worker can die. Important coordination information cannot rely solely on process globals.

---

## 17. Persistence does not mean immortality

A persisted operation introduces a different danger: what if the owner never releases it?

```text
pegasoActiveOperation = "export still running"
```

could remain forever even after its process or tab vanished.

PlumePilot imposes an age limit:

```js
async function currentOperation() {
  const operation = await storageGet(OPERATION_KEY);

  if (
    operation &&
    Date.now() - operation.startedAt > MAX_OPERATION_AGE_MS
  ) {
    await storageRemove(OPERATION_KEY);
    return null;
  }

  return operation;
}
```

An operation older than two hours is treated as stale.

---

## 18. Reconciliation with the real owner

The second check is ownership:

```js
function operationOwnerTabId(operation) {
  if (
    operation.phase === "building" &&
    Number.isInteger(operation.builderTabId)
  ) {
    return operation.builderTabId;
  }

  return operation.sourceTabId;
}
```

Then:

```js
if (await tabExists(ownerTabId)) {
  return { accepted: true, released: false, operation };
}

await removeOperation(operation);
```

```text
persisted record
      ↓
check actual owner tab
      ↓
owner exists? ─ yes → keep record
      │
      no
      ▼
remove orphaned record
```

The stored record is **reconciled with reality**, not trusted blindly.

A perfectly well-formed persisted value can still be stale.

---

# Part VIII — Coordination through leases

## 19. Commission checks need more than a Boolean

To prevent several tabs from checking commission status simultaneously, PlumePilot uses a **lease**.

The background defines:

```js
const COMMISSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const COMMISSION_LEASE_MS = 45 * 1000;
```

A lease has the shape:

```js
const lease = {
  id: crypto.randomUUID(),
  platformId: normalized,
  sourceTabId,
  startedAt: now,
  expiresAt: now + COMMISSION_LEASE_MS,
};
```

It is stored in `commissionCheckLeases`, scoped per platform.

---

## 20. Lock versus lease

A lock conceptually says:

```text
this resource is occupied
```

A lease says:

```text
this resource is occupied until time T
```

That distinction matters if its owner crashes or disappears.

```text
plain lock → might remain occupied forever
lease      → eventually expires
```

PlumePilot validates not only whether a lease is expired but whether its timestamps are plausible. A wildly distant expiration timestamp is treated as invalid rather than blindly accepted.

This is **defensive state validation**.

---

## 21. Timestamps are part of the state semantics

Values such as:

```text
createdAt
startedAt
expiresAt
fetchedAt
lastAttemptAt
```

are not just audit decorations. They let the program ask:

```text
Can I still trust this value?
```

Time is part of the contract.

---

# Part IX — `sessionStorage`: survive a reload, not the whole world

## 22. A specific recovery problem calls for specific storage

Some playback recovery paths intentionally reload the host page.

An ordinary variable:

```js
let recovery = ...;
```

would vanish on reload. Putting this state in `chrome.storage.local` would make it too persistent and too global.

PlumePilot uses document `sessionStorage`:

```js
sessionStorage.setItem(
  SESSION_CONFLICT_RECOVERY_KEY,
  JSON.stringify({
    attempts: 1,
    createdAt: Date.now(),
    // ...
  }),
);
```

This gives the recovery information the right kind of scope: the current tab's page session, surviving a reload when necessary.

---

## 23. Even recovery state is validated

When read:

```js
const state = JSON.parse(raw);
const age = Date.now() - Number(state?.createdAt || 0);
```

PlumePilot rejects invalid state:

```js
if (
  state?.attempts !== 1 ||
  !Number.isFinite(age) ||
  age < 0 ||
  age > SESSION_CONFLICT_RECOVERY_MAX_AGE_MS
) {
  sessionStorage.removeItem(SESSION_CONFLICT_RECOVERY_KEY);
  return null;
}
```

Notice three safeguards: attempt count, valid timestamp, and maximum age.

Even storage with a suitably limited lifetime needs **logical expiration**.

---

## 24. Why not `chrome.storage.session`?

WebExtensions also provide:

```js
chrome.storage.session
```

which holds extension-scoped in-memory storage during a browser session.

But its lifecycle and sharing semantics are not the same as `window.sessionStorage`.

This recovery must be:

```text
specific to this tab/page session
+ survive reload
+ naturally disappear with the page session
```

Document `sessionStorage` directly matches that scope. Extension `storage.session` would introduce different access and lifecycle considerations.

---
