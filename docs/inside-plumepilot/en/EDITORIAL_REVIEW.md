# English edition — editorial review checklist

**Status:** in progress. **Do not merge PR #44 yet.**

The canonical source is the Italian Markdown under `docs/inside-plumepilot/`. The English drafts live in `docs/inside-plumepilot/en/`. The book follows three historical snapshots; source paths and commit identifiers must remain accurate.

## Fifth pass — part-level hierarchy audit (13 October 2026)

The Italian edition uses many Roman-numeral `# Parte ...` dividers. A direct audit (ignoring fenced code blocks) found:

| Chapter | Italian part headings | English before this pass | Numbered sections (IT = EN) |
|---|---:|---:|---:|
| 14 | 158 | 7 | 303 |
| 15 | 202 | 99 | 380 |
| 16 | 123 | 75 | 316 |

- [x] Chapter 14: restored English headings for Parts I–XXVI and XXVII–LVIII in two commits, leaving the 303 numbered subsections unchanged; **63 of 158** part headings now exist.
- [ ] Chapter 14: restore Parts LIX–CLV, checking the placement and wording against the Italian original (Parts CLVI–CLVIII already existed).
- [ ] Chapters 15–16: reconcile Roman numerals and section boundaries, including duplicates and consolidated headings.
- [ ] Verify content fidelity independently: headings alone are not a substitute for translated examples, diagrams and explanations.
- [ ] Offline reader build, link/anchor audit, browser smoke testing and final sign-off remain outstanding.

**Do not merge PR #44 yet.**

---

## Verified during first review pass

- [x] English drafts for chapters **00–17** exist, and each has the same sequence of numbered `##` sections as its Italian counterpart.
- [x] All 18 chapter rows in the English table of contents point to English Markdown files.
- [x] Previous / contents / next links in the 18 English chapters resolve to known book files; no mismatched relative chapter target was detected.
- [x] General **glossary.md** translated: **250 / 250** entries, preserving order and technical identifiers.
- [x] **SOURCES.md** translated: 18 subject sections and **142 original external URLs**, kept in their original order.
- [x] English index links to the glossary and references, no longer incorrectly claiming that chapters are still missing.
- [x] PR remains **Draft**; Italian files on main and extension packages are unchanged.

## Fidelity pass — corrections already committed (12 October 2026)

- [x] **Chapter 02, section 11:** restored the actual `runtimeMessage()` implementation from the 2.35.1 snapshot. `chrome.runtime.lastError` becomes a resolved application value (`{ accepted: false, reason }`), **not** a rejected Promise. Restored the callback/PROMISE translation diagram and real `PEGASO_START_EXPORT` example.
- [x] **Chapter 02, sections 24 and 28:** restored the concrete `sendResponse({ accepted: true, duplicate: false })` acknowledgement and the `response === undefined` runtime-error example. Other discrepancies checked in chapter 02 included translated diagram labels, comments, and examples combined into one block.
- [x] **Chapter 03, section 28:** restored the unsafe stale-DOM-reference example to explain why using a node across `await` without revalidation is dangerous.
- [x] **Chapter 04, section 59:** restored the authenticated `originalFetch.call` example, including credentials and abort signal.
- [x] **Chapter 05, section 42:** restored cancellation registry cleanup (`turboControllers.clear()`).
- [x] **Chapter 06:** restored a course-scoped storage-key example, the lesson-cache composite key function, monotonic progress-item merge, `WeakMap` counterexample, numeric key normalization, lease-expiry guards, conflicting route-key guards, negative-cache preservation guard, and cached-outline fingerprint check.
- [x] After these updates, numbered sections **02–06** still match the Italian source, all five Markdown files have balanced fences, and each preserves the index navigation link.

**Remaining:** these are targeted corrections, **not full editorial sign-off**. Across 02–06, 125+ source technical snippets still fail an exact-string comparison with the current English snippets. Some only differ by translated code comments or because separate examples were combined; other examples or explanatory `text` diagrams may genuinely be absent. Inspect each discrepancy in context. Do not automatically paste all source blocks, which would introduce duplicates and untranslated Italian annotations.

---

## Second editorial pass — verified findings

- [x] **Chapter 03:** reviewed discrepancies in DOM adapters, initial NodeList caching, observer scope, percentage ambiguity, conditional rendering, and the fake page adapter; restored illustrative code and preserved all 95 numbered sections. Some source `text` diagrams were consolidated into equivalent English explanations.
- [x] **Chapter 04:** restored API wrapper failure illustration, composite lesson key, explicit `return false` fallback, and identifier validators. Source-literal differences remain where code comments and diagrams were translated or examples were combined.
- [x] **Chapter 05:** restored explanatory examples for `async`/Promises, `Promise.allSettled()`, recovery after `await`, serial-queue instances and cooperative cancellation. **Section 97's sequence diagram now matches the original**, including `serializedBuilder()` and acquisition of the builder operation.
- [x] **Historical code references:** checked the original `github.com/PlumePilot/plumepilot/blob/...` URLs chapter by chapter. **97 out of 97** references in chapters 02–05 remain identical in the English edition. No other chapter uses these exact historical blob URLs.
- [x] **Chapter 06 subsection structure:** all **24 numbered subsections (25.1–25.24)** of the extended cache data-structures chapter are present in both languages. This verifies the outline, **not** full content fidelity.
- [x] **Chapter 06 cache details:** restored the `LessonCacheEntry` field inventory, null-prototype `Object.create(null)` comparison, additional settings and platform-key examples, and an explicit explanation of the stale-versus-monotonic decision policy.
- [ ] **Chapter 06 further fidelity:** compare the remaining worked examples and visual decision sketches in subsections 25.1–25.24, in particular cache-hit scenarios and eviction alternatives, against the Italian original.
- [ ] **Chapters 11–17:** complete the side-by-side review of diagrams and worked explanations that the initial drafts compressed.
- [ ] **Offline reader:** generate and test the English HTML only after the Markdown content is stable.

**Gate:** the checks above do not authorize changing PR #44 from Draft or merging. Section headings and historical links are necessary checks but cannot prove full translation fidelity.

---

## Third editorial pass — exercise and technical-block fidelity

- [x] Checked exercise headings throughout chapters 00–17 against the Italian original. **A matching count alone is not treated as proof of equivalence.**
- [x] Chapter 17 exercises **1–8** corrected to match the original assignments. The earlier English draft had substituted different questions in exercises 5–8 (cache design, framework selection, worker transfer, release gate) for the actual prompts about **React trade-offs, changed API field names, cache abstractions, and worker performance measurements**.
- [x] Examined the full original and English prompts for chapters 07, 08, 09, 11, 12, and 14. The substantive scenarios and questions were retained. More concise prose is not itself a fidelity defect.
- [x] Verified **chapters 07–17** preserve at least the original count of fenced JavaScript/HTML/JSON/CSS/Bash/Mermaid blocks within every numbered section. Their Mermaid diagram counts also match chapter by chapter. Block counts are structural evidence only, not proof that every line is unchanged.
- [x] Restored the wider popup storage defaults and the sample platform-qualified course keys in chapter 06. Also restored the normalized lesson-cache value inventory in the extended Map case study.
- [x] The source-relative code references and Markdown fenced-code structure remained intact in the spot checks following these edits.

**Remaining gates:** inspect source-equivalent prose and text diagrams across chapters 02–06 and 11–17, especially longer explanatory sections. Complete a mechanical link/anchor pass, generate both offline HTML readers, verify them in browsers, then perform a final editorial read. **Do not merge yet.**

---

## Fourth editorial pass — restoring explanatory depth

This pass compared **numbered sections and the untyped diagram/text material inside them** across chapters 11–17. Counts of technical code fences and numbered headings alone did not detect these missing explanations.

### Corrections committed

- [x] **11 `1:** restored the full popup-versus-floating-menu illustration, common domain-state questions, distinct lifecycles, and Shadow DOM creation path.
- [x] **12 `1, `7, `25:** restored the four resource budgets (CPU, I/O, memory and responsiveness), their trade-off flows, the I/O-heavy practical cost equation, and concrete peak-memory figures. Restored the Part XI image-codec divider.
- [x] **13:** restored the browser-specific release matrix, three test layers, source-versus-runtime archive inventories, SHA-256 provenance flow, the core/adapters/build-compiler diagram, and the cross-browser layout examples. Restored the compatibility section dividers and the standalone 2.35.2 What's New rationale.
- [x] **14 `2, `45, `146, `157:** restored the **actual closed-accordion root cause** (stale DOM representation used as lesson identity) rather than the substituted chapter-index example; restored three-valued evidence, the ten-step smoke-test checklist, and the failure-category/recovery matrix.
- [x] **15 `2, `25, `61:** restored Git's blob/tree/commit/tag object model, the factual **20 commits** in PR #39 followed by a one-parent v2.35.1 squash commit, and the explanation of why a public revert is more truthful than erasing history.
- [x] **16 `1, `154, `159:** restored the diagram relating MAIN/ISOLATED worlds, background, menus and builders; restored **all 25 architectural principles** in the original order; and restored the detailed conceptual directory tree.
- [x] **17 conclusion:** restored the missing "final answer" and learning-cycle flows, plus the original concluding diagrams about authority, identity, time, boundaries and architectural learning.
- [x] The two tables previously lost or shortened have been restored: chapter 13's complete final cross-browser matrix and chapter 14's failure/recovery table.

### Still unresolved

- [ ] **Long-form prose fidelity:** continue reviewing detailed worked explanations and `text` diagrams throughout chapters 11–17. Recover meaningful missing examples without duplicating material already faithfully expressed in English prose.
- [ ] **Part-level navigation:** compare Roman-numeral `# Parte …` / `# Part …` headings. A structural audit showed **numerous consolidated or missing part dividers** in chapters 14–16 (including 150 in chapter 14, 105 in chapter 15 and 51 in chapter 16 before this pass). The 18 chapter numbers and all their numbered subsections still match, but the part hierarchy does not. Restore and translate section dividers where appropriate; do not automatically invent new headings or certify these chapters as finished.
- [ ] **Remaining chapter 06 cache diagrams** and examples, especially the extended `25.1–25.24` discussion.
- [ ] **Offline English HTML** and a subsequent browser smoke test for both languages.
- [ ] Final check of links, anchors, localized controls, generated artifacts and editorial continuity.

**Release gate remains CLOSED:** do not mark PR #44 ready or merge it solely based on the structural tests already passing.

---

## Structural QA after fourth pass

- [x] Chapters **11–17** retain the same numbered `## N.` headings and ordering as the Italian source; each has balanced Markdown fences.
- [x] The number of Mermaid diagrams matches the Italian source in each chapter.
- [x] Three remaining non-verbatim Mermaid blocks are **translations of labels only** (two in chapter 11, one in chapter 15); their graph/sequence structure is not missing.
- [x] All Markdown links to neighboring English chapter files, index, and other book files in chapters 11–17 resolve to known filenames.
- [x] Complete release/test matrices in chapters 13–14 were restored rather than being paraphrased only in prose.
- [ ] Reconstruct the **Part-level editorial hierarchy** of chapters 14–16 in a systematic pass, ensuring each translated heading reflects the Italian original and appears at the corresponding place in the text.
- [ ] Complete remaining prose/diagram fidelity checks and English offline reader generation and smoke testing.

---

## Important remaining editorial work

A matching heading count **does not prove equivalent content**. Several draft chapters compress explanatory code-like `text` blocks from the Italian source into prose. Some earlier chapters have fewer fenced technical examples than their originals.

| Chapter(s) | What the comparison revealed | Required action |
|---|---|---|
| 00–01 | Section structure matches; a small set of sample code text differs in 01. | Compare line by line; allow translated labels, but preserve genuine code. |
| **02–06** | Fewer fenced code examples in English than Italian (02: 69→56; 03: 84→73; 04: 73→61; 05: 93→76; 06: 99→76), as well as fewer explanatory text blocks. | **High priority:** restore missing technical examples and check all behavioral explanations and source references against the Italian edition. |
| 07–10 | Numbering and most technical examples match; some prose and text diagrams changed. | Review diagrams, exercises, illustrative scenarios and translated labels. |
| **11–17** | Numbering and most JavaScript/Mermaid examples match, but many source `text` sketches and longer worked explanations were condensed or rewritten. | **High priority:** restore source-equivalent illustrations in English, not just section headings or summaries. |
| 15 | One historical technical snippet no longer matches exactly, in the Mermaid/release diagram area. | Check the translation of the label and diagram semantics. |
| All chapters | Relative navigation exists; the first audit did not inspect every Markdown anchor or external URL live. | Check anchors, internal references, examples, terminology, source links and English consistency. |

The code-example counts are **diagnostic indicators**. They do not by themselves prove loss of a particular example: the source and translation may use different highlighting or explanatory labels. Each suspected difference needs content inspection.

## Offline edition

- [ ] Extend `scripts/build-inside-plumepilot.mjs` to build from the English files with an explicit locale and localized reader controls.
- [ ] Generate `docs/inside-plumepilot/Inside-PlumePilot-en.html` from reviewed English Markdown with Pandoc.
- [ ] Verify search, TOC, chapter navigation, glossary/sources, theme, local reading position and no remote dependencies.
- [ ] Ensure English and Italian reading positions do not collide in localStorage.
- [ ] Ensure the existing Italian build still generates the same functionality.
- [ ] Link the generated English HTML from the English index and language landing.

## Merge gates

1. Finish the chapter-level fidelity review and resolve the source-example gaps.
2. Re-run relative-link and Markdown checks and verify no stale placeholder links.
3. Build both offline HTML editions and manually smoke-test navigation/search/theme.
4. Review generated-file diffs and confirm only documentation/build artifacts changed.
5. Switch PR #44 from Draft to ready **only after** all editorial and build checks pass.

---

This checklist is an operational audit, not a substitute for reading the translated chapters. The Italian edition remains the editorial authority.
