# Fonti e riferimenti

Questa pagina raccoglie fonti primarie o particolarmente autorevoli usate come approfondimento nel libro.

## Browser extensions / WebExtensions

- MDN — Anatomy of an extension  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension

- MDN — Content scripts  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts

- MDN — `content_scripts` manifest key  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts

- MDN — `background` manifest key  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background

- Chrome for Developers — Extensions documentation  
  https://developer.chrome.com/docs/extensions/

- Chrome for Developers — `chrome.scripting`  
  https://developer.chrome.com/docs/extensions/reference/api/scripting

- Chrome for Developers — Manifest V3 overview  
  https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3

## Progetto studiato

- PlumePilot repository  
  https://github.com/PlumePilot/plumepilot

- Snapshot iniziale del libro  
  https://github.com/PlumePilot/plumepilot/commit/a8007425f81792e7570516dbdf1e7fb2cbda4d53

Le fonti verranno ampliate capitolo per capitolo (DOM, Fetch/API, storage, EPUB, performance, Git e release engineering).

## Messaging e comunicazione tra contesti

- Chrome for Developers — Message passing  
  https://developer.chrome.com/docs/extensions/develop/concepts/messaging

- Chrome for Developers — Tabs API (`tabs.sendMessage`)  
  https://developer.chrome.com/docs/extensions/reference/api/tabs

- MDN — `runtime.sendMessage()`  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/sendMessage

- MDN — `runtime.onMessage`  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage

- MDN — `Window.postMessage()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

- Chrome for Developers — `ExecutionWorld`  
  https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld


## DOM e pagine dinamiche

- MDN — `Document.querySelector()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector

- MDN — `Document.querySelectorAll()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll

- MDN — Selection and traversal on the DOM tree  
  https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Selection_and_traversal_on_the_DOM_tree

- MDN — `Element.closest()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Element/closest

- MDN — `MutationObserver`  
  https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

- MDN — `Element.getBoundingClientRect()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

- MDN — Microtask guide / event loop  
  https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide


## API, HTTP e reverse engineering del client

- MDN — Fetch API  
  https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API

- MDN — `Response.clone()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Response/clone

- MDN — `Headers`  
  https://developer.mozilla.org/en-US/docs/Web/API/Headers

- MDN — `Authorization` HTTP header  
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Authorization

- MDN — `AbortController`  
  https://developer.mozilla.org/en-US/docs/Web/API/AbortController

- MDN — `XMLHttpRequest`  
  https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest

- MDN — `XMLHttpRequest.setRequestHeader()`  
  https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader

- Chrome for Developers — `ExecutionWorld`  
  https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld


## Asincronia JavaScript ed event loop

- MDN — JavaScript execution model  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model

- MDN — Using microtasks in JavaScript  
  https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide

- MDN — In depth: Microtasks and the JavaScript runtime environment  
  https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth

- MDN — Using promises  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises

- MDN — `async function`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function

- MDN — `await`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await

- MDN — `setTimeout()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout

- MDN — `AbortController`  
  https://developer.mozilla.org/en-US/docs/Web/API/AbortController

- MDN — `AbortSignal`  
  https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

- MDN — `Promise.all()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all

- MDN — `Promise.allSettled()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled


## Stato, cache e storage

- Chrome for Developers — `chrome.storage`  
  https://developer.chrome.com/docs/extensions/reference/api/storage

- Chrome for Developers — Manifest V3 migration checklist  
  https://developer.chrome.com/docs/extensions/develop/migrate/checklist

- Chrome for Developers — Manifest V3 known issues / service worker lifecycle  
  https://developer.chrome.com/docs/extensions/develop/migrate/known-issues

- MDN — WebExtensions `storage` API  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage

- MDN — `storage.local`  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local

- MDN — `storage.onChanged`  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/onChanged

- MDN — `Window.sessionStorage`  
  https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage

- MDN — Using the Web Storage API  
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API


### Strutture dati e cache

- MDN — `Map`
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

- MDN — Keyed collections
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Keyed_collections

- MDN — `WeakMap`
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap

- MDN — JavaScript memory management
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management

- MDN — IndexedDB API
  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API


## State machine e statechart

- Stately — What are state machines and statecharts?  
  https://stately.ai/docs/state-machines-and-statecharts

- Stately — States and transitions  
  https://stately.ai/docs/editor-states-and-transitions

- Stately — Events and transitions  
  https://stately.ai/docs/transitions

- Stately — Guards  
  https://stately.ai/docs/guards

- Stately — XState documentation  
  https://stately.ai/docs

- Object Management Group — UML specification  
  https://www.omg.org/spec/UML/

- Object Management Group — Precise Semantics of UML State Machines  
  https://www.omg.org/spec/PSSM/1.0


## Ricerca della prima attività incompleta

- MDN — `Array.prototype.find()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find

- MDN — `Array.prototype.filter()`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter

- MDN — `Map`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

- PostgreSQL Documentation — Indexes  
  https://www.postgresql.org/docs/current/indexes.html

- PostgreSQL Documentation — Using `EXPLAIN`  
  https://www.postgresql.org/docs/current/using-explain.html

## Generazione PDF, HTML ed EPUB

- MDN — File API  
  https://developer.mozilla.org/en-US/docs/Web/API/File_API

- MDN — Blob URLs  
  https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob

- MDN — `URL.revokeObjectURL()`  
  https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static

- MDN — `Uint8Array`  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array

- MDN — `HTMLCanvasElement.toBlob()`  
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

- MDN — `AbortController`  
  https://developer.mozilla.org/en-US/docs/Web/API/AbortController

- W3C — EPUB 3.3  
  https://www.w3.org/TR/epub-33/

- W3C — EPUB 3 Overview  
  https://www.w3.org/TR/epub-overview-33/

- Mozilla — PDF.js  
  https://mozilla.github.io/pdf.js/

- pdf-lib documentation  
  https://pdf-lib.js.org/

- JSZip documentation  
  https://stuk.github.io/jszip/


## Rich-text editing nel browser

- WHATWG HTML Standard — `contenteditable` e editing hosts  
  https://html.spec.whatwg.org/multipage/interaction.html#contenteditable

- MDN — `contenteditable`  
  https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable

- W3C — Selection API  
  https://www.w3.org/TR/selection-api/

- MDN — Selection API  
  https://developer.mozilla.org/en-US/docs/Web/API/Selection

- MDN — `Range`  
  https://developer.mozilla.org/en-US/docs/Web/API/Range

- MDN — `Range.extractContents()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Range/extractContents

- MDN — `Range.insertNode()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Range/insertNode

- MDN — `beforeinput`  
  https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event

- W3C — Input Events Level 2  
  https://www.w3.org/TR/input-events-2/

- MDN — `Document.execCommand()` (deprecated)  
  https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand

## UI, Shadow DOM e sincronizzazione

- MDN — `Element.attachShadow()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow

- MDN — `ShadowRoot.mode`  
  https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode

- W3C WAI-ARIA Authoring Practices — Tabs Pattern  
  https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

- W3C WAI-ARIA Authoring Practices — Tabs with Manual Activation  
  https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-manual/

- Chrome for Developers — `chrome.storage` e `storage.onChanged`  
  https://developer.chrome.com/docs/extensions/reference/api/storage

- MDN — CSS Font Loading API  
  https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API

- MDN — `FontFace`  
  https://developer.mozilla.org/en-US/docs/Web/API/FontFace

- MDN — `Document.fonts`  
  https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts

## Performance, memoria e scheduling

- MDN — `Performance.now()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Performance/now

- MDN — `Performance.measure()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure

- MDN — `MutationObserver`  
  https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

- MDN — `MutationObserver.observe()`  
  https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe

- MDN — `MessageChannel`  
  https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel

- MDN — `CanvasRenderingContext2D.getImageData()`  
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData

- MDN — `Performance.measureUserAgentSpecificMemory()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory

- MDN — `performance.memory` (non standard e deprecata)  
  https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory

- MDN — `requestIdleCallback()`  
  https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback

- Chrome for Developers — DevTools  
  https://developer.chrome.com/docs/devtools/



## Cross-browser WebExtensions, packaging e store review

- MDN — `background` in `manifest.json` e differenze Chrome/Firefox  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background

- Chrome for Developers — Manifest V3 migration checklist  
  https://developer.chrome.com/docs/extensions/develop/migrate/checklist

- Chrome for Developers — Offscreen API  
  https://developer.chrome.com/docs/extensions/reference/api/offscreen

- MDN — `browser_specific_settings`  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings

- MDN — Your first WebExtension  
  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension

- Firefox Extension Workshop — Add-on Policies  
  https://extensionworkshop.com/documentation/publish/add-on-policies/

- Firefox Extension Workshop — Source code submission  
  https://extensionworkshop.com/documentation/publish/source-code-submission/

- Firefox Extension Workshop — Third Party Library Usage  
  https://extensionworkshop.com/documentation/publish/third-party-library-usage/

- Firefox Extension Workshop — Submitting an add-on  
  https://extensionworkshop.com/documentation/publish/submitting-an-add-on/

- Firefox Extension Workshop — `web-ext` command reference  
  https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

- Chrome Web Store — Program Policies  
  https://developer.chrome.com/docs/webstore/program-policies/policies

- Chrome Web Store — Code Readability Requirements  
  https://developer.chrome.com/docs/webstore/program-policies/code-readability


## Debug, test e regressioni

- Node.js — `node:assert`
  https://nodejs.org/api/assert.html

- Node.js — `node:vm`
  https://nodejs.org/api/vm.html

- Chrome for Developers — End-to-end testing for Chrome Extensions
  https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing

- Chrome for Developers — Test Chrome Extensions with Puppeteer
  https://developer.chrome.com/docs/extensions/how-to/test/puppeteer

- Chrome for Developers — Test service worker termination with Puppeteer
  https://developer.chrome.com/docs/extensions/how-to/test/test-serviceworker-termination-with-puppeteer

- Chrome for Developers — Extension service workers
  https://developer.chrome.com/docs/extensions/develop/concepts/service-workers

- Playwright — Running and debugging tests
  https://playwright.dev/docs/running-tests

- Playwright — Projects / multi-browser configuration
  https://playwright.dev/docs/test-projects

- Firefox Extension Workshop — Getting started with `web-ext`
  https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/


## Git, pull request e release engineering

- Pro Git — Git Objects  
  https://git-scm.com/book/en/v2/Git-Internals-Git-Objects

- Pro Git — Git References  
  https://git-scm.com/book/en/v2/Git-Internals-Git-References

- Pro Git — Basic Branching and Merging  
  https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging

- Pro Git — Rebasing  
  https://git-scm.com/book/en/v2/Git-Branching-Rebasing

- Pro Git — Tagging  
  https://git-scm.com/book/en/v2/Git-Basics-Tagging

- GitHub Docs — Pull requests  
  https://docs.github.com/en/pull-requests

- GitHub Docs — About pull request merges  
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges

- GitHub Docs — Configuring commit squashing for pull requests  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests

- GitHub Docs — About releases  
  https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

- Semantic Versioning 2.0.0  
  https://semver.org/


## Lezioni architetturali

- Microsoft Azure Architecture Center — Anti-corruption Layer pattern  
  https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer

- AWS Prescriptive Guidance — Architectural Decision Records  
  https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html

- MDN — AbortController  
  https://developer.mozilla.org/en-US/docs/Web/API/AbortController

- MDN — Web Storage API  
  https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API

## Retrospettiva e refactoring incrementale

- Martin Fowler — Strangler Fig
  https://martinfowler.com/bliki/StranglerFigApplication.html

- TypeScript Handbook — Type Checking JavaScript Files
  https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html

---

[← Indice](index.md)
