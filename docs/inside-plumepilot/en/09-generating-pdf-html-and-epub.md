# 09 — Generating PDF, HTML, and EPUB in the browser

## Pipelines, binary data, transformation, and memory

PlumePilot does more than read a web page and automate a few interactions. It also takes information collected from the platform and transforms it into **new documents** that must be valid, downloadable, and usable outside the browser.

This is an important change of role.

Until now, our systems mostly looked like:

```text
page / API
    ↓
PlumePilot
    ↓
decision / navigation / state
```

Document generation introduces a different pipeline:

```text
page / API
    ↓
collect data and URLs
    ↓
normalize
    ↓
transform
    ↓
serialize
    ↓
binary or text file
    ↓
local download
```

It has three main forms:

```text
Course materials → PDF
Course materials → EPUB
Tests            → PDF / offline HTML
```

Each solves a different problem:

- **PDF** mainly preserves the original document faithfully.
- **Offline HTML** turns structured data into a small self-contained application.
- **EPUB** attempts to reinterpret a fixed-page document as an ebook that adapts to the reader's screen.

The third task is by far the hardest.

---

# Part I — Separate collection from building

## 1. Two phases that must not be confused

When a user requests course materials, PlumePilot does not immediately generate the file.

First it needs a representation of the materials:

```text
course
  ↓
sections
  ↓
chapters
  ↓
material URLs
  ↓
material[]
```

Only then can the document-building phase begin.

This separation is architecturally important:

```text
COLLECTION                         BUILD

Multiversity                      builder page
    ↓                                 ↓
content.js                        pdf-core.js
    ↓                             epub-core.mjs
material descriptors                  ↓
    ↓                             final bytes
background.js                         ↓
    ↓                              download
builder job
```

The collector knows about the course, sections, chapter order, material URLs, and collection failures.

The builder should primarily be concerned with downloading resources, transforming them, laying them out, serializing them, and producing the finished file.

### Backend analogy

It resembles:

```text
query / data acquisition
         ↓
normalized DTO
         ↓
report generator
```

The generator should not need to understand the LMS page's DOM.

---

## 2. The builder as a separate process

Chapter 02 showed that the background stores a job payload in `chrome.storage.local` and opens a dedicated builder page whose URL carries only a small `jobId`.

Conceptually:

```text
background
   │
   ├── storage["pegasoExportJob:abc123"] = large payload
   │
   └── opens materials-builder.html?job=abc123
                              │
                              ↓
                       builder reads job
```

This avoids huge URLs and repeatedly serializing large structures in messages.

The builder has its own page with a progress bar, PDF/EPUB buttons, cancellation, error messages, and a lifetime independent of the popup.

The popup can close without necessarily destroying document generation.

---

# Part II — The browser's binary building blocks

## 3. `ArrayBuffer`, `Uint8Array`, and `Blob`

Ordinary JavaScript application code often deals with strings and objects. PDFs and EPUBs are **sequences of bytes**.

Three browser types therefore appear throughout the code:

```text
ArrayBuffer
Uint8Array
Blob
```

For example, `pdf-core.js` contains:

```js
const bytes = new Uint8Array(await response.arrayBuffer());
```

The flow is:

```text
HTTP response
     ↓
ArrayBuffer
     ↓
Uint8Array
     ↓
PDF / EPUB library
```

### `ArrayBuffer`

A raw block of binary memory. By itself, it does not define characters, numbers, or pixels.

### `Uint8Array`

A **typed view** over unsigned 8-bit values. Each element represents:

```text
0 … 255
```

It is a natural representation for binary files because their fundamental unit is the byte.

### `Blob`

An immutable binary object that the browser can treat as file-like data. PlumePilot may ultimately produce:

```js
new Blob([bytes], { type: "application/pdf" })
```

or:

```js
new Blob([bytes], { type: "application/epub+zip" })
```

The MIME type tells the browser what kind of resource is being produced.

---

## 4. From memory to download: Object URLs

A `Blob` is a JavaScript object. An HTML `<a>` element expects a URL.

The bridge between them is:

```js
URL.createObjectURL(blob)
```

The material builder uses this pattern:

```js
function download(bytes, filename, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
```

The browser creates an opaque URL resembling:

```text
blob:chrome-extension://.../uuid
```

which refers to data managed by the browser:

```text
Uint8Array
    ↓
Blob
    ↓
Object URL
    ↓
<a download>
    ↓
file on the user's computer
```

### Why `revokeObjectURL()`?

As long as the Object URL remains active, the browser needs to keep the referenced Blob available.

PlumePilot revokes it after a short delay—not immediately—to allow the download to start. This is a small, concrete example of **resource-lifetime management**.

---

# Part III — Generating the merged course PDF

## 5. PDF: compose rather than convert

Generating a combined PDF is conceptually much simpler than generating EPUB.

The source materials are already PDF documents. We do not need to reinterpret their content:

```text
Chapter 1 PDF ─┐
Chapter 2 PDF ─┼──→ combined PDFDocument
Chapter 3 PDF ─┘
```

The main function in `pdf-core.js` is:

```js
async function buildCoursePdf(
  courseTitle,
  materials,
  onProgress = () => {},
  fetchImpl = globalThis.fetch,
)
```

First we create the destination document:

```js
const document = await PDFDocument.create();
```

Then for each material:

```js
const response = await fetchImpl(material.url);
const bytes = new Uint8Array(await response.arrayBuffer());
const source = await PDFDocument.load(bytes, {
  ignoreEncryption: true,
  updateMetadata: false,
});
```

We now have two documents:

```text
source   → PDF for one chapter

document → combined PDF being built
```

---

## 6. Copying pages

The core of composition is:

```js
const sourceIndices = source.getPageIndices();
const copiedPages = await document.copyPages(source, sourceIndices);
```

Then:

```js
for (const copiedPage of copiedPages) {
  const addedPage = document.addPage(copiedPage);
  firstPage ||= addedPage;
}
```

The algorithm is almost literal:

```text
for each PDF:
    download
    open
    copy every page
    append pages in order
```

Its enormous advantage is that **we are not reconstructing PDF layout**.

Equations, graphics, fonts, tables, and page geometry remain those of the source document. The visual-fidelity problem is comparatively small.

---

## 7. Adding structure to an existing document

PlumePilot does not merely concatenate pages.

During copying it retains chapter metadata:

```js
included.push({
  chapter: material.chapter,
  chapterTitle: material.chapterTitle,
  section: material.section,
  firstPage,
  pageCount: copiedPages.length,
});
```

The key property is `firstPage`.

Once we know each chapter's first page, we can build an interactive contents page, internal links, and PDF bookmarks/outlines:

```js
addInteractiveIndex(document, courseTitle, included, regular, bold);
addBookmarks(document, included);
```

The pipeline becomes:

```text
original PDFs
     ↓
merge pages
     ↓
chapter → first page mapping
     ↓
contents + bookmarks
     ↓
serialization
```

---

## 8. Serializing the PDF

While manipulating `PDFDocument`, we have a JavaScript representation of a document.

To produce the actual file:

```js
const bytes = await document.save({
  addDefaultPage: false,
  useObjectStreams: true,
});
```

Now:

```text
PDFDocument
    ↓ save()
Uint8Array
```

The remaining step is the Blob-based download discussed earlier.

---

## 9. Partial success

One damaged source PDF should not necessarily destroy the entire export.

The loop records both successes and failures:

```js
try {
  ...
  included.push(...);
} catch (error) {
  failures.push(...);
}
```

The whole operation fails only when no material could be included:

```js
if (!included.length) {
  throw new Error(
    "Non è stato possibile scaricare e unire nessuna dispensa.",
  );
}
```

The Italian error string is preserved from the historical code snapshot.

This distinguishes:

```text
total failure
vs.
partial success
```

If 24 of 25 materials are usable, a document containing 24 chapters plus a clear failure report for the remaining one may be much more useful.

### Backend analogy

It resembles a batch job collecting:

```text
successes[]
failures[]
```

rather than enforcing all-or-nothing behavior on work where a partial result has genuine value.

---

# Part IV — Generating the quiz PDF

## 10. When there are no PDFs to merge

Self-assessment tests are different.

Questions arrive as structured data:

```text
chapter
questions[]
    question
    answers[]
    correctPosition
    images[]
```

There is no source PDF to concatenate. We must construct the layout.

`test-builder.js` creates:

```js
const documentPdf = await PDFLib.PDFDocument.create();
```

It loads bundled Unicode fonts and manually draws titles, questions, answers, images, solutions, internal links, bookmarks, and page numbers.

This pipeline resembles a **report renderer**.

---

## 11. Text layout: the invisible problem

Drawing text in a PDF is not simply:

```js
drawText(longString)
```

We need to know where each line should end.

The builder's `wrap()` function measures candidate text using the font:

```js
font.widthOfTextAtSize(candidate, size)
```

Conceptually:

```text
next word
     ↓
does line exceed width?
  ┌───────┴───────┐
 no              yes
  ↓               ↓
append         end line
               new line
```

This, too, is an algorithm.

HTML layout is normally handled by the browser. A programmatically generated PDF often makes us responsible for those layout decisions.

---

## 12. Images: caching and binary validation

Quiz questions may contain images.

`test-builder.js` uses:

```js
const imageCache = new Map();
```

`loadImageAsset(image)` caches the **download Promise itself**:

```js
if (imageCache.has(url)) return imageCache.get(url);

const request = (async () => {
  ...
})();

imageCache.set(url, request);
return request;
```

This is notable: the cache deduplicates **concurrent requests**, not just completed results.

If two questions request the same image while the first download is still pending:

```text
request A ──────┐
                ├── same Promise
request B ──────┘
```

There is no second Fetch call.

### Validate content, not just file extensions

The builder also checks byte signatures:

```js
const jpeg =
  bytes[0] === 0xff &&
  bytes[1] === 0xd8 &&
  bytes[2] === 0xff;
```

It recognizes JPEG and PNG signatures rather than trusting an `image.jpg` suffix or the server's stated MIME type alone.

This is **controlled content sniffing**. Images are also limited to 8 MiB, helping with both reliability and memory control.

---

# Part V — HTML: turning data into a small application

## 13. The quiz HTML is not a static document

PlumePilot's generated HTML contains markup, CSS, JavaScript, test data, images, note state, an editor, filters, and answer-checking logic.

It is better understood as:

> **A self-contained web application distributed in a single file.**

The builder exposes:

```js
async function interactiveHtml()
```

---

## 14. Making images work offline

If an HTML export contains:

```html
<img src="https://server.example/image.png">
```

it does not truly work offline.

The builder therefore downloads each image and converts it to a Data URL:

```text
https://.../image.png
      ↓ fetch
Uint8Array
      ↓ base64
data:image/png;base64,...
```

The data is embedded directly into the exported file, removing the external dependency.

### Trade-off

Base64 makes the file self-contained, but expands binary data in its textual representation.

Roughly:

```text
3 binary bytes → 4 Base64 characters
```

This generally adds about one third to the encoded payload before other overhead.

It is the familiar trade-off between **portability** and **size**.

---

## 15. Serializing data inside JavaScript

The builder constructs a JSON payload:

```js
const payload = JSON.stringify({
  courseTitle: job.courseTitle,
  annotatedFilename: ...,
  tests,
})
```

then applies further escaping:

```js
.replace(/</g, "\\u003c")
.replace(/\u2028/g, "\\u2028")
.replace(/\u2029/g, "\\u2029");
```

Why?

Because the JSON will be inserted inside a `<script>` element. Data that is valid JSON may acquire a different meaning when embedded directly into HTML/JavaScript.

The general principle is:

> **Correct escaping depends on the context into which a value is serialized.**

There is no single universal escaping function.

---

## 16. Separating runtime from data

The quiz runtime is not manually duplicated inside the builder.

It is loaded from:

```js
const runtimeResponse = await fetch("offline-quiz-runtime.js");
const runtimeSource = await runtimeResponse.text();
```

Then embedded:

```text
HTML template
   +
CSS
   +
JSON data
   +
offline-quiz-runtime.js
   ↓
interactive-quiz.html
```

During development, the **runtime** and the **generator** remain separate responsibilities. They are combined only in the final exported artifact.

---

# Part VI — EPUB is not a PDF with a different extension

## 17. What actually is an EPUB?

An EPUB is a ZIP container with a specific structure and contracts.

In simplified form:

```text
book.epub
│
├── mimetype
│
├── META-INF/
│   └── container.xml
│
└── OEBPS/
    ├── package.opf
    ├── nav.xhtml
    ├── toc.ncx
    ├── styles/
    │   └── book.css
    ├── text/
    │   ├── title.xhtml
    │   ├── chapter-001.xhtml
    │   └── ...
    ├── images/
    │   └── ...
    └── fonts/
        └── ...
```

This structure appears in `epub-core.mjs`.

The builder creates:

```js
const zip = new globalThis.JSZip();
```

Then:

```js
zip.file("mimetype", "application/epub+zip", {
  compression: "STORE",
});
```

The EPUB container specification requires the `mimetype` file to identify the format and remain uncompressed.

---

## 18. `container.xml`: locating the package document

PlumePilot adds:

```text
META-INF/container.xml
```

which points to:

```text
OEBPS/package.opf
```

A reading system can then find the publication's primary package description:

```text
EPUB root
   ↓
container.xml
   ↓
package.opf
```

---

## 19. Manifest and spine

`package.opf` contains two especially important concepts.

### Manifest

Defines which resources belong to the publication:

```text
chapter XHTML
images
CSS
fonts
navigation document
```

Entries are built in a form such as:

```xml
<item
  id="chapter-1"
  href="text/chapter-001.xhtml"
  media-type="application/xhtml+xml"
/>
```

### Spine

Defines the primary reading order:

```xml
<itemref idref="title"/>
<itemref idref="nav"/>
<itemref idref="chapter-1"/>
<itemref idref="chapter-2"/>
```

Thus:

```text
manifest = what resources exist
spine    = in what order they are read
```

This resembles the distinction between a collection of records and an ordered workflow.

---

## 20. Navigation document and contents

PlumePilot also builds:

```text
OEBPS/nav.xhtml
```

with section and chapter navigation, and keeps a `toc.ncx` for compatibility with older reading systems.

Each chapter can include a link:

```html
<a href="../nav.xhtml#toc">Torna all'indice</a>
```

The Italian text is part of the real generated-content example. Internal links are not cosmetic: they make the book navigable.

---

# Part VII — The real problem: PDF → EPUB

## 21. Fixed layout versus reflow

This is where we reach the central difficulty.

A PDF primarily describes **how a page should appear**.

A reflowable EPUB primarily describes **structured content that the reading system may lay out again**.

They are nearly opposite models.

### PDF

```text
page 595 × 842

draw text at x=84 y=320
draw a line from A to B
place an image in this rectangle
```

### Reflowable EPUB

```html
<h1>Title</h1>
<p>Paragraph...</p>
<ul>...</ul>
```

The reader chooses font size, line width, margins, pagination, and orientation.

That makes EPUB comfortable on Kindle and other ereaders—but only when we can **reconstruct semantics** from a source format that may no longer contain them explicitly.

---
