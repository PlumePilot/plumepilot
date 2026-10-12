# 04 — APIs and reverse engineering

## Understanding the platform by observing its traffic

So far we have studied PlumePilot from the outside in: extension components, messages, and the DOM of a dynamic web application.

But a modern web application does not live in the DOM alone. The interface is often the visible result of requests made to a backend. Understanding those requests lets us work with more structured data, avoid unnecessary UI navigation, and discover identifiers that the rendered page does not expose clearly.

In this chapter, we will study a real integration technique: observing the host application's network interactions, mapping the responses into a small internal model, and safely reusing the authenticated context already established by the application.

This is not a guide to bypassing authentication or accessing somebody else's data. PlumePilot works inside the user's existing authenticated browser session, and the architectural questions are about **boundaries, validation, credentials, failure handling, and resilience**.

---

# Part I — A web application is also an HTTP client

## 1. Looking beyond the DOM

Chapter 03 taught us that the DOM is a temporary representation of application state. Add another layer to the model:

§§§text
backend
   ↓
API response
   ↓
frontend state
   ↓
DOM
§§§

When a sidebar shows §80%§, we may be looking at a value that the frontend received from an API, transformed, stored internally, and finally rendered as text.

The DOM is often the **last link in the chain**, not the first.

For some tasks, obtaining structured data closer to the source can be faster, more complete, less dependent on CSS, and easier to correlate with stable identifiers. That does **not** mean an API response is automatically authoritative for every decision. We will return to this distinction repeatedly.

---

## 2. A public API is not the same as a frontend API

When developers talk about an API, they often imagine a documented interface:

§§§text
GET /v1/users
Authorization: Bearer ...
§§§

with SDKs, versioning, and explicit compatibility promises.

But almost every web application also uses HTTP interfaces intended primarily for **its own frontend**. The browser must ask:

§§§text
Which course modules exist?
What is the progress percentage?
Which activities belong to a lesson?
Where can the course material be retrieved?
Which exams have been completed?
§§§

These requests may be ordinary HTTP+JSON even if the endpoints are not advertised as a third-party integration API.

§§§text
Multiversity frontend
       │ HTTP + JSON
       ▼
Multiversity backend
§§§

PlumePilot already runs in that browser environment. It can observe selected parts of this conversation without inventing a separate login flow.

---

# Part II — Why §commission-interceptor.js§ runs in the MAIN world

## 3. The architectural problem

The manifest loads §commission-interceptor.js§ using:

§§§json
"world": "MAIN"
§§§

Why? To observe §window.fetch§ as used by the webpage's own JavaScript, our code must run in the **same JavaScript execution world** as that page.

An isolated content script can share the DOM without necessarily seeing the same modified JavaScript objects. Therefore PlumePilot uses the §MAIN§ world as its observation point for the host runtime.

Source: [§manifest.json§](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/manifest.json).

---

## 4. The supported API origins

Near the top of §commission-interceptor.js§:

§§§js
const PLATFORM_API_ORIGINS = Object.freeze([
  ["pegaso", "pegaso.multiversity.click", "https://lms-api.prod.pegaso.multiversity.click"],
  ["mercatorum", "mercatorum.multiversity.click", "https://lms-api.prod.mercatorum.multiversity.click"],
  ["utsr", "utsr.multiversity.click", "https://lms-api.prod.utsr.multiversity.click"],
]);
§§§

Source: [§commission-interceptor.js§ L21–L25](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L21-L25).

This is more than a configuration table. It defines an **explicit observation boundary**:

§§§text
Pegaso page      → Pegaso API
Mercatorum page  → Mercatorum API
UTSR page        → UTSR API
§§§

The interceptor does **not** say "inspect every Authorization header in the browser." It selects requests for the current platform's expected API origin.

This is a practical expression of *least privilege* and scope minimization.

---

# Part III — Observing §fetch()§ without breaking the page

## 5. Preserve the original implementation

PlumePilot saves the original function before installing its wrapper:

§§§js
const originalFetch = window.fetch;

window.fetch = function studyWingFetch(input, init) {
  // PlumePilot observation
  const promise = originalFetch.call(this, input, init);
  // Observe the response without replacing its behavior
  return promise;
};
§§§

Source: [§commission-interceptor.js§ L708–L720](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L708-L720).

This technique is called *wrapping*, *instrumentation*, or—less formally—*monkey patching*:

§§§text
page calls fetch()
        ↓
PlumePilot wrapper
        ↓
original fetch()
        ↓
network
§§§

The wrapper observes an existing operation without replacing the host application's underlying request mechanism.

---

## 6. Preserve the observable contract

The wrapper returns:

§§§js
return promise;
§§§

This is essential. If the frontend writes:

§§§js
const response = await fetch(url);
§§§

and our wrapper unexpectedly returns §undefined§ instead of the original Promise, the host application can break.

Instrumentation should preserve, as far as possible, the function's observable contract:

§§§text
accepted arguments
appropriate this receiver
return value
errors from the original operation
§§§

Observing someone else's application must be as non-invasive as practical.

---

## 7. Why §call(this, ...)§?

The wrapper invokes:

§§§js
originalFetch.call(this, input, init);
§§§

rather than simply:

§§§js
originalFetch(input, init);
§§§

In this particular case, §window.fetch§ does not normally depend on a complex application-specific receiver. Nevertheless, preserving the receiver makes the wrapper more faithful to the original call.

It is a useful habit when decorating APIs that our code does not own.

---

# Part IV — Read a response without consuming it

## 8. A §Response§ body is a stream, not infinitely reusable data

The Fetch API exposes response bodies as streams. If PlumePilot did this in the wrapper:

§§§js
const body = await response.json();
§§§

it might consume the body before the host frontend tries to parse it:

§§§js
await response.json();
§§§

PlumePilot avoids that interference:

§§§js
const body = await response.clone().json();
§§§

Source: [§commission-interceptor.js§ L688–L705](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L688-L705).

Conceptually:

§§§text
original Response ─────► Multiversity frontend

cloned Response ───────► PlumePilot observer
§§§

The original response remains available to its intended consumer.

---

## 9. Cloning is not free

§Response.clone()§ is convenient, but there are memory and buffering implications. When two consumers read a streamed response at different speeds, the browser may need to buffer data.

The JSON payloads observed in these PlumePilot flows are considerably smaller than whole PDFs, making the trade-off reasonable here. But we will revisit this broader principle in the performance chapter:

> **A convenient API may hide implicit copies and buffers.**

---

# Part V — Why intercept XMLHttpRequest as well?

## 10. A web application may use more than §fetch()§

The host frontend may contain:

§§§text
fetch()
XMLHttpRequest
libraries built on either API
older and newer components side by side
§§§

PlumePilot therefore instruments §XMLHttpRequest§ too:

§§§js
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;
const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
§§§

Source: [§commission-interceptor.js§ L723–L725](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L723-L725).

---

## 11. Reconstructing an XHR request

XHR exposes different request properties at different steps.

The URL is set during:

§§§js
xhr.open(method, url);
§§§

An authentication header may be supplied later:

§§§js
xhr.setRequestHeader("Authorization", value);
§§§

The interceptor temporarily remembers the URL:

§§§js
this.__studyWingRequestUrl = url;
§§§

It can then associate an observed authorization header with the particular request and API origin.

This is a small example of **correlation state**: information observed at separate moments is combined into one meaningful request context.

---

# Part VI — Existing authentication

## 12. The Bearer token

Authenticated platform requests may carry an HTTP Authorization header:

§§§js
const authorization = new Headers(headers)
  .get("authorization")
  ?.trim();

if (/^Bearer\s+\S+$/i.test(authorization || "")) {
  bearerToken = authorization;
}
§§§

Source: [§commission-interceptor.js§ L73–L83](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L73-L83).

§§§text
Authorization: Bearer <token>
§§§

means, broadly, "this request presents a credential that the server can verify."

A bearer token is not necessarily the user's password. In this case, it is a session/access credential already obtained by the official frontend through the platform's normal authentication process.

---

## 13. Authentication versus authorization

These terms are related but distinct:

§§§text
Authentication: "Who are you?"
Authorization:  "What are you permitted to do?"
§§§

A bearer credential lets the server relate an API request to a session and its permissions.

PlumePilot does not acquire new privileges. It operates within the context of the user already authenticated in the browser.

---

## 14. Where does PlumePilot keep the token?

In §commission-interceptor.js§:

§§§js
let bearerToken = null;
§§§

The token is held in the interceptor's in-memory closure—not written into:

§§§text
chrome.storage.local
PlumePilot localStorage
window.postMessage payloads
application logs
a PlumePilot server
§§§

Instead of asking another component to handle:

§§§js
{ token: "..." }
§§§

the rest of the extension requests a capability:

§§§js
{
  action: "lesson",
  courseCode,
  lessonNumber,
  // ...
}
§§§

The interceptor uses its credential internally and returns **normalized domain data**, not the secret itself.

---

## 15. Secret containment

The intended architecture is:

§§§text
content.js
    │ "Give me the data for lesson 5"
    ▼
commission-interceptor.js
    │ temporarily owns the Bearer token
    ▼
Multiversity API
§§§

A riskier design would distribute the credential through:

§§§text
interceptor → content.js → bridge → background → storage
§§§

Every additional component could accidentally log, serialize, persist, or forward it.

Minimizing the number of places where credentials can appear is **secret containment**, or **credential minimization**.

---

# Part VII — Do not intercept everything

## 16. Check the origin before looking at Authorization

The interceptor includes:

§§§js
function isCurrentPlatformApiUrl(value) {
  try {
    return new URL(String(value), window.location.href).origin === API_ORIGIN;
  } catch {
    return false;
  }
}
§§§

Source: [§commission-interceptor.js§ L52–L58](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L52-L58).

The check precedes credential capture:

§§§text
an arbitrary request
      ↓
is its origin the current platform API?
      ├── no  → ignore
      └── yes → possibly inspect Authorization
§§§

This simple check is an important boundary.

---

## 17. An allowlist instead of blanket observation

The strategy is an **allowlist**:

§§§text
these supported platform hosts
this platform's API origin
these relevant routes
§§§

rather than "intercept everything and decide what to do later."

Narrow scope makes it easier to understand what can be observed, where data may flow, and which assumptions we need to test.

---

# Part VIII — The first essential endpoint: the course index

## 18. The endpoint we call the "master call"

One of the most important endpoints is constructed as follows:

§§§js
url = `${API_ORIGIN}/student/course/${encodeURIComponent(courseCode)}/video-lessons/0`;
§§§

Source: [§commission-interceptor.js§ L453–L455](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L453-L455).

During development, we often called this the **master call**. That is our project terminology, not necessarily the platform's official endpoint name.

It yields a synthetic overview of course modules and their progress:

§§§text
course
 ├── module A   100%
 ├── module B   100%
 ├── module C    80%
 ├── module D     0%
 └── module E   100%
§§§

Such an index is extremely useful for prioritizing subsequent work.

---

## 19. From a raw payload to an internal model

PlumePilot does not pass raw backend JSON directly throughout the extension. It normalizes the response into a smaller structure:

§§§js
return {
  displayOrder,
  masterOrder,
  folderId,
  id,
  lpId,
  title,
  percentage,
};
§§§

Source: [§commission-interceptor.js§ L99–L120](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L99-L120).

Backend developers may recognize this as DTO mapping, an adapter, an anti-corruption layer, or a normalization boundary. Other components no longer need to know every detail of the external payload.

---

## 20. Why normalize?

Suppose the backend returns:

§§§json
{
  "display_order": "5",
  "percentage": "80",
  "lp_id": 123
}
§§§

The internal logic would rather receive:

§§§js
{
  displayOrder: 5,
  percentage: 80,
  lpId: 123
}
§§§

with basic assumptions already checked.

§§§text
external schema
       ↓
validation + normalization
       ↓
internal schema
§§§

The complexity is moved to a clearly identified boundary.

---

# Part IX — Identifiers: the detail that changes everything

## 21. §displayOrder§ is not enough

The master response includes several identifiers:

§§§text
displayOrder
masterOrder
folderId
id
lpId
§§§

The number visible to a student need not be a globally unique identifier.

A course might have:

§§§text
Section A
1 - Introduction
2 - Concepts

Section B
1 - Introduction
2 - Examples
§§§

"Chapter 1" does not necessarily identify one specific entity across the entire course.

---

## 22. The crucial comment in §playbackCourseRouteMap()§

The code contains:

§§§js
// A matching course-wide order is stronger than a display_order, which
// can restart at 1 in each folder. Use it only when every title agrees.
§§§

Source: [§content.js§ L2900–L2914](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L2900-L2914).

This is an important data-modeling lesson:

> **A value that looks like an ID may only be a local label.**

Before adopting a field as identity, determine its uniqueness scope.

---

## 23. Composite identity

For tests, PlumePilot uses:

§§§js
function testRouteKey(route) {
  return [route.folderId, route.lpId, route.id].join(":");
}
§§§

Source: [§content.js§ L2925–L2928](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L2925-L2928).

This is a straightforward **composite identity**. When a single field is not reliable enough, combining several fields may identify the intended resource more accurately.

---

# Part X — The detail request

## 24. From the index to module contents

The master call tells us a lot, but not everything. To retrieve a specific lesson's contents, PlumePilot constructs a path like:

§§§text
/student/course/{courseCode}/video-lesson/{lpId}/paragraphs/{paragraphId}
§§§

Source: [§commission-interceptor.js§ L456–L466](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L456-L466).

The detail response may allow us to reconstruct objectives, videos, progress, final tests, and downloadable materials.

---

## 25. Normalize lesson details too

The interceptor reduces lesson data to:

§§§js
return {
  dataAvailable,
  objective,
  test,
  material,
  playbackItems,
  playbackDataComplete,
  progressItems,
  progressDataComplete,
};
§§§

Source: [§commission-interceptor.js§ L384–L397](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L384-L397).

The rest of the application can reason about PlumePilot concepts rather than raw, potentially inconsistent external JSON.

---

# Part XI — A miniature RPC built on §postMessage§

## 26. §content.js§ does not need the token

To request API data, §content.js§ uses:

§§§js
function turboApiRequest(action, payload = {}) {
  return new Promise((resolve) => {
    const requestId = `studywing-${Date.now()}-${++turboApiRequestSequence}`;
    // ...
    window.postMessage({
      type: TURBO_API_REQUEST,
      requestId,
      action,
      ...payload,
    }, "*");
  });
}
§§§

Source: [§content.js§ L4904–L4923](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L4904-L4923).

To the caller, the message protocol behaves like an asynchronous function:

§§§js
const response = await turboApiRequest("lesson", {
  courseCode,
  lessonNumber,
});
§§§

Conceptually, this is a small **local RPC**: remote procedure call over a message boundary.

---

## 27. Request IDs

A §requestId§ allows responses to arrive in a different order from requests:

§§§text
request A ──────────────────┐
request B ───────────┐      │
                     │      │
response B ◄─────────┘      │
response A ◄────────────────┘
§§§

Chapter 02 called this a **correlation ID**. Here we see it in a practical API bridge.

---

## 28. Pending requests map

§content.js§ maintains:

§§§js
const pendingTurboApiRequests = new Map();
§§§

Conceptually, it stores:

§§§text
requestId → resolve callback + timeout
§§§

When §STUDYWING_TURBO_API_RESPONSE§ arrives, the listener finds the corresponding ID, clears its timeout, and resolves the right Promise.

The same pattern appears in many real RPC systems.

---

## 29. Application-level timeouts

Requests also have a timeout:

§§§js
setTimeout(() => {
  pendingTurboApiRequests.delete(requestId);
  resolve({ ok: false, error: "RESPONSE_TIMEOUT" });
}, TURBO_API_RESPONSE_TIMEOUT_MS);
§§§

Without it, a caller could wait forever if a message is lost, the interceptor fails to respond, a network request hangs, or a context changes.

A serious asynchronous protocol needs not just a success path, but explicit **failure semantics**.

---

# Part XII — The API dispatcher in the MAIN world

## 30. Actions rather than endpoint URLs at the call site

The interceptor accepts actions such as:

§§§text
outline
lesson
complete
test-source
§§§

And dispatches internally:

§§§js
if (message.action === "outline") { /* ... */ }
else if (message.action === "lesson") { /* ... */ }
else if (message.action === "complete") { /* ... */ }
else if (message.action === "test-source") { /* ... */ }
§§§

Source: [§commission-interceptor.js§ L433–L498](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L433-L498).

Thus §content.js§ only needs to know "I want lesson data," not the exact URL template, headers, or parsing rules.

---

## 31. The API adapter

We can view §commission-interceptor.js§ as an **API adapter** exposing:

§§§text
outline(courseCode)
lesson(courseCode, route)
complete(activity)
testSource(test)
§§§

while encapsulating:

§§§text
exact URLs
Authorization header
credentials
JSON parsing
normalization
AbortController
HTTP errors
§§§

This is separation of concerns applied to a browser extension.

---

# Part XIII — §fetch()§ and HTTP errors

## 32. An important Fetch API detail

§fetch()§ does not automatically reject its Promise for ordinary HTTP error statuses such as §401§, §404§, or §500§. It may resolve to a §Response§ whose §ok§ property is false.

PlumePilot therefore checks both the HTTP status and application body:

§§§js
if (!response.ok || Number(body?.code) !== 200) {
  throw new Error(`API_${response.status || "INVALID_RESPONSE"}`);
}
```

Source: [`commission-interceptor.js` L420–L430](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L420-L430).

This creates a clearer failure contract for callers.

---

## 33. Transport success is not application success

A response may carry HTTP `200` while its JSON reports a domain error. An HTTP `401` response may contain perfectly valid JSON.

We must distinguish five questions:

```text
Did the network respond?
Was the HTTP status successful?
Was the response valid JSON?
Was the application status successful?
Are the required data fields actually present?
```

They are not interchangeable.

---

# Part XIV — Valid but incomplete responses

## 34. A particularly useful PlumePilot case

An API can respond successfully before all the data we need is available:

```js
function hasRequiredLessonData(response, requiredData) {
  if (response.data?.dataAvailable !== true) return false;
  if (requiredData === "material") return Boolean(response.data.material);
  if (requiredData === "test") return Boolean(response.data.test);
  if (requiredData === "objective") return Boolean(response.data.objective);
  if (requiredData === "playback") {
    return response.data.playbackDataComplete === true;
  }
  return true;
}
```

Source: [`content.js` L2414–L2423](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L2414-L2423).

A failed request is different from **a successful request whose response is not complete enough for the caller's purpose**.

---

## 35. Semantic retry

`requestLessonWithRetry()` can retry even when the request returned `ok: true`, if the necessary material, test, objective, or playback data is still incomplete.

Source: [`content.js` L2715–L2777](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L2715-L2777).

This is a **semantic retry**. It asks not only "did the request succeed?" but also:

> **Did the response provide enough information to continue?**

---

# Part XV — Retry and pacing

## 36. Do not hammer the backend

The code defines delays including:

```js
const COURSE_INDEX_RETRY_DELAYS_MS = [350, 750];
const API_LESSON_RETRY_DELAYS_MS = [750, 1500];
const API_MATERIAL_PACING_MS = 150;
const TURBO_API_PACING_MS = 350;
```

Source: [`content.js` L60–L65](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/content.js#L60-L65).

There are two distinct ideas.

### Retry delay

Wait before repeating a request that did not produce usable data.

### Pacing

Space out otherwise valid requests in a batch operation.

These solve different problems.

---

## 37. Why not use `Promise.all()` across the entire course?

We could imagine:

```js
await Promise.all(
  lessons.map((lesson) => fetchLesson(lesson))
);
```

But maximum concurrency may produce bursts of requests, complicate cancellation, amplify transient failures, increase memory and simultaneous parsing, and deviate from the pacing of the host frontend.

PlumePilot often uses sequential operations because **maximum parallelism is not automatically maximum quality**.

---

# Part XVI — `AbortController`

## 38. Explicit network timeout

In the interceptor:

```js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
```

Then:

```js
fetch(url, {
  signal: controller.signal,
  // ...
});
```

Source: [`commission-interceptor.js` L500–L529](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L500-L529).

This turns a potentially unbounded request into an operation with a deadline.

---

## 39. Cancellation is part of the protocol

`content.js` can send:

```text
STUDYWING_TURBO_API_CANCEL
```

The interceptor reacts:

```js
for (const controller of turboControllers.values()) {
  controller.abort();
}
```

Source: [`commission-interceptor.js` L792–L795](https://github.com/PlumePilot/plumepilot/blob/a8007425f81792e7570516dbdf1e7fb2cbda4d53/commission-interceptor.js#L792-L795).

Cancellation crosses several layers:

```text
user
  ↓
PlumePilot operation
  ↓
message
  ↓
AbortController
  ↓
interrupted fetch
```

Chapter 05 will study this in greater depth.

---
