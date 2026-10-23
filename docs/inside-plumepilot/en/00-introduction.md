# 00 — Introduction: from problem to product

## Why study PlumePilot?

Many programming courses teach a concept through examples deliberately designed to be simple:

```js
fetch('/api/users')
  .then(response => response.json())
  .then(users => console.log(users));
```

The example is useful for learning `fetch`, but it removes almost every problem that makes real-world software interesting:

- who decides when the request should run?
- what happens if the page changes in the meantime?
- where do we store the result?
- how much can we trust the data we received?
- what happens if two parts of the application start the same operation?
- how do we communicate the result to a UI that lives in another context?
- what happens in Firefox if an API used in Chrome is not available in the same way?

PlumePilot contains all of these questions because it was not created as a teaching exercise. It grew out of concrete problems: moving through course activities, organizing study materials, creating quizzes that can be used offline, generating PDF and EPUB documents, observing changes in exam status, and providing all of this across three different browsers.

That makes the project a useful laboratory: the concepts are not artificially added to the explanation. They are already there because the problem made them necessary.

---

## From a useful script to a small software system

At first, it is natural to think of a browser extension as “JavaScript running on top of a web page.”

That description quickly stops being sufficient.

The current PlumePilot includes, among other things:

- an extension popup;
- a background/service worker;
- several groups of content scripts loaded at different times and in different contexts;
- a bridge between the extension runtime and the page runtime;
- persistent storage;
- coordination of long-running operations;
- separate generators for PDF, EPUB, and quizzes;
- a floating menu injected into supported pages;
- compatibility with Chrome, Edge, and Firefox;
- a release build and validation process.

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

Three different sources, with different costs and different levels of reliability.

One of the most interesting steps in the development of the “first incomplete activity” search was precisely to stop treating a single source as a universal answer, and instead use some information as an **index** that tells us where to verify.

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

That is why we will talk frequently about:

- Promises;
- events;
- timeouts;
- polling;
- leases;
- serialization;
- race conditions;
- cancellation;
- idempotency.

The exam commission monitor is a good example. In the real code, `bridge.js` does not simply say “check the commission”: it first asks the background for the temporary right to run the check, receives a `leaseId`, performs the operation, and finally releases the lease.

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
