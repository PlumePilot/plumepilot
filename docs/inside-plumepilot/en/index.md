# Inside PlumePilot

## Anatomy of a real browser extension

**JavaScript, WebExtensions, DOM, APIs, asynchrony, and software engineering through a real project.**

[🇮🇹 Italiano](../) · **🇬🇧 English**

> This book uses PlumePilot as a case study. The goal is not only to understand *what the code does*, but to learn how to recognize reusable problems, concepts, and architectural decisions in other software projects.

The English edition mirrors the Italian canonical edition and preserves the same technical snapshots and chapter structure.

[Start with the introduction →](00-introduction.md) · [PlumePilot repository](https://github.com/PlumePilot/plumepilot)

---

## Reference versions

The book intentionally follows the real evolution of the project instead of rewriting its history as if the final architecture had always existed.

- **Chapters 00–10:** PlumePilot 2.35.1, commit `a8007425f81792e7570516dbdf1e7fb2cbda4d53`.
- **Chapters 11–12:** 2.35.2 UI/UX candidate, commit `4d32a8c2a6cd291e4fe389bdf10fdbaf1856a8c2`.
- **Chapters 13–17:** 2.35.2 release candidate, commit `f6fcb4c29c83ba9150df0be31da04fc91dffb634`.

---

## Contents

| # | Chapter |
|---|---|
| 00 | [Introduction — From problem to product](00-introduction.md) |
| 01 | [Anatomy of PlumePilot — What happens when the extension comes to life](01-anatomy-of-an-extension.md) |
| 02 | [Contexts and messaging — Making separate worlds communicate](02-contexts-and-messaging.md) |
| 03 | [DOM and dynamic pages — Working inside a UI we do not control](03-dom-and-dynamic-pages.md) |
| 04 | [APIs and reverse engineering — Understanding the platform by observing its traffic](04-apis-and-reverse-engineering.md) |
| 05 | [JavaScript asynchrony — Events, Promises, timeouts, and race conditions](05-javascript-asynchrony.md) |
| 06 | [State, cache, and storage — Where the truth lives](06-state-cache-and-storage.md) |
| 07 | [Autoplay as a state machine](07-autoplay-as-a-state-machine.md) |
| 08 | [Finding the first incomplete activity — Heuristics, master calls, and fallbacks](08-finding-first-incomplete-activity.md) |
| 09 | [Generating PDF, HTML, and EPUB in the browser](09-generating-pdf-html-and-epub.md) |
| 10 | [A small rich-text editor — Selection, Range, lists, and callouts](10-small-rich-text-editor.md) |
| 11 | [UI without a framework — Popup, floating menu, and synchronization](11-ui-without-a-framework.md) |
| 12 | [Performance and memory — When the browser becomes our runtime](12-performance-and-memory.md) |
| 13 | Chrome, Edge, and Firefox — One codebase, different runtimes |
| 14 | Debugging, tests, and regressions — Turning a bug into permanent knowledge |
| 15 | Git, branches, PRs, builds, and release engineering — Software beyond the code |
| 16 | Architectural lessons — Patterns that emerged from the real project |
| 17 | What would we do differently today? — A retrospective without hindsight bias |

The remaining chapters are translated on this documentation branch before publication. The public English landing is not merged until the edition is complete.

---

## Editorial policy

The **Italian edition is the canonical editorial source**. The English edition is a faithful translation of the same technical snapshot rather than an independently evolving book.

When the Italian text changes:

```text
update Italian source
        ↓
stabilize the chapter
        ↓
update English translation
        ↓
validate links and navigation
        ↓
regenerate offline HTML editions
```

Code, identifiers, file names, commit SHAs, and API names remain unchanged unless translation is required to explain them.
