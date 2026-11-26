# 00 — Introduction: from problem to product

## Why study PlumePilot?

Many programming courses teach a concept through examples deliberately designed to be simple:

```js
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users));
```

`fetch('/api/users')` starts an HTTP request to the users [**API**](glossary.md#api), the interface the browser uses to ask the server for that data. It immediately returns a [**Promise**](glossary.md#promise), an object representing the operation's outcome. The browser can handle other events while waiting for the response.

Each `.then()` takes a **callback**, a function to run when the preceding step succeeds. The first callback uses `response.json()` to read the response body and interpret it as **JSON**, a text format for structured data. This read returns another Promise. The second callback receives the resulting data and logs it to the console. A network or reading error propagates down the chain as a Promise rejection.

The example is useful for learning `fetch`, but it removes almost every problem that makes real-world software interesting:

- who decides when the request should run?
- what happens if the page changes in the meantime?
- where do we store the result?
- how much can we trust the data we received?
- what happens if two parts of the application start the same operation?
- how do we communicate the result to a user interface (**UI**) that lives in another context?
- what happens in Firefox if an API used in Chrome is not available in the same way?

PlumePilot grew out of the need to work with an **LMS** (*Learning Management System*), the online platform that hosts courses and activities. It helps you move through activities, organize materials, create offline quizzes, generate PDF and EPUB documents, and check exam status across three browsers.

That makes the project a useful laboratory: the concepts are not artificially added to the explanation. They are already there because the problem made them necessary.

---

## From a useful script to a small software system

At first, it is natural to think of a browser extension as “JavaScript running on top of a web page.”

That description quickly stops being sufficient.

The current PlumePilot includes, among other things:

- a **popup**, the page that opens when you click the extension icon
- a **background** component that coordinates events and operations even when the popup is closed. In the Chrome and Edge examples, it runs as a **service worker**, a script the browser can start in response to events
- several **content scripts**, programs that run in association with a course page
- a **bridge** that relays messages between the extension and page execution environments
- **persistent storage** for data such as the theme that should survive closing the popup or restarting the browser
- coordination of long-running operations
- separate generators for PDF, EPUB, and quizzes
- a floating menu injected into supported pages
- compatibility with Chrome, Edge, and Firefox
- a **build** process that prepares packages for validation before distributing a new version, or **release**.

So the first important idea is:

> **A browser extension is not necessarily a single program. It can be a collection of small programs that live in different contexts and must coordinate with one another.**

The `manifest.json` file tells the browser which pieces exist and when they should be loaded.

That will be the starting point of Chapter 1.

---

## The recurring theme: where does the truth live?

Throughout this book, we will often return to one question:

> What is our *source of truth*?

Suppose a chapter in the course UI shows `80%`.

That number may be useful for understanding that something is probably still incomplete. But is it enough to decide exactly which activity should be opened?

Not necessarily.

We may have all of these at the same time:

```text
visible DOM
    ↓
chapter percentage

API response
    ↓
lesson status

PlumePilot cache
    ↓
previously observed information
```

The [**DOM**](glossary.md#dom) is the page's tree of elements, which JavaScript can read and modify. The API can provide more structured data about those same course items. A [**cache**](glossary.md#cache) keeps previously retrieved information for reuse while it is still valid.

Each source differs in how much it costs to consult and how much we can trust its data.

One of the most interesting steps in the development of the “first incomplete activity” search was precisely to stop treating a single source as a universal answer, and instead use some information as an **index** that tells us where to verify.

One example is the [**master call**](glossary.md#master-call), our name for the HTTP request that returns a list of course modules with their progress. A module at 80% is a useful place to start checking. The module's detail is where we find which activities are incomplete.

This distinction generalizes far beyond PlumePilot:

> Information may not be reliable enough to be the final truth, while still being reliable enough to dramatically reduce the search space.

This is the kind of decision we also encounter in distributed systems, caches, search engines, and indexed databases.

---

## The second theme: time

In synchronous textbook software, one thing happens after another.

In a browser, instead:

- a page loads;
- a content script starts;
- an API response arrives;
- the user opens or closes a chapter;
- a video ends;
- the popup is closed and reopened;
- a timer expires;
- a tab reloads;
- the background may be suspended and later restarted.

Correctness therefore depends not only on **what** the code does, but also on **when** events happen.

An operation is **asynchronous** when other work can proceed while something waits for its outcome. A few concepts recur throughout the examples:

- **Promises** let us use an operation's result when it becomes available.
- **Events** signal something that happened, such as a video ending.
- A [**timeout**](glossary.md#timeout) sets a limit on how long we wait for a response.
- [**Polling**](glossary.md#polling) checks something repeatedly at intervals, for example whether a row has appeared on the page.
- A [**lease**](glossary.md#lease) grants temporary ownership of an operation.
- **Operation serialization** imposes an execution order when several components need to update the same state.
- A [**race condition**](glossary.md#race-condition) is a fault that only appears under certain event orders.
- **Cancellation** signals that an operation should stop.
- [**Idempotence**](glossary.md#idempotence) means that repeating an operation has the same intended effect.

The [**exam commission monitor**](glossary.md#exam-commission-monitor) checks the status of exams under evaluation. Before checking, `bridge.js` asks the background for a lease. If granted, the `leaseId` identifies that lease. The bridge runs the check and releases the lease so that two open tabs do not need to perform the same check simultaneously.

That is not bureaucracy. It is concurrent coordination.

---

## The third theme: boundaries

PlumePilot simultaneously lives next to three systems:

```text
┌────────────────────┐
│ Browser / Extension│
│ API                │
└─────────┬──────────┘
          │
          │
┌─────────▼──────────┐
│ PlumePilot         │
└─────────┬──────────┘
          │
          │
┌─────────▼──────────┐
│ Multiversity       │
│ page + services    │
└────────────────────┘
```

Each boundary introduces different rules.

Page code can access the page's JavaScript objects, but not automatically the extension's privileged APIs. An isolated content script can use extension APIs, but it does not share the same JavaScript scope as the page. The background can coordinate the extension, but it cannot directly manipulate a tab's DOM.

Many of PlumePilot's architectural choices are consequences of these boundaries.

---

## A useful analogy for backend developers

Without taking the analogy too literally, you can initially think of some components like this:

```text
Popup / Floating UI
        ↓
   presentation
        ↓
Bridge / messaging
        ↓
 application boundary
        ↓
Background coordinator
        ↓
 state / orchestration
```

And the Multiversity page can be seen simultaneously as:

- an external UI that we observe and modify;
- an API client whose behavior we can understand by observing it;
- a source of events;
- a separate JavaScript environment.

The analogy with a service-oriented backend is not perfect, but it is useful: instead of direct function calls between every component, we often have messages and contracts.

---

## What “finished” means for this book

Software is never permanently static. Browsers, platforms, and requirements change.

For us, “PlumePilot is finished” means something more practical:

- the product has a mature functional scope;
- the main architectural decisions are observable;
- there is enough history of bugs, regressions, and improvements;
- we can study the system without constantly chasing a new foundational feature.

That makes it possible to move from **building** the project to **understanding it systematically**.

---

## How we will use the code

We will not comment on thousands of lines in order.

We will start from questions instead.

For example:

> What happens when I click the PlumePilot icon?

or:

> How can PlumePilot communicate with a function that exists in the page's JavaScript context?

or:

> Why can a progress percentage speed up a search even though it is not 100% reliable?

Only then will we inspect the code needed to answer the question.

This is much closer to the way we actually read an unfamiliar real-world codebase.

---

## Concepts to carry forward

**Source of truth**  
The source we consider authoritative for a state or decision.

**Boundary**  
The border between two components or runtimes that cannot directly share everything.

**Message passing**  
Communication through messages instead of function calls within the same context.

**Race condition**  
An error or unexpected behavior that depends on the timing or ordering of concurrent operations.

**Idempotency**  
A property whereby repeating an operation does not cause additional unwanted effects.

**Graceful degradation**  
The ability to keep working, perhaps with reduced functionality, when a capability is unavailable.

We will meet these concepts again in the code, not only in the glossary.

---

## Before continuing

Keep one new question in mind:

> If `popup.js`, `background.js`, `bridge.js`, and `content.js` are all JavaScript, why couldn't PlumePilot simply put everything into one file?

Chapter 1 starts from the answer.

---

[← Contents](index.md) · [01 — Anatomy of PlumePilot →](01-anatomy-of-an-extension.md)
