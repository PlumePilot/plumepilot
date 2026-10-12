# English edition — editorial review checklist

**Status:** in progress. **Do not merge PR #44 yet.**

The canonical source is the Italian Markdown under `docs/inside-plumepilot/`. The English drafts live in `docs/inside-plumepilot/en/`. The book follows three historical snapshots; source paths and commit identifiers must remain accurate.

## Verified during first review pass

- [x] English drafts for chapters **00–17** exist, and each has the same sequence of numbered `##` sections as its Italian counterpart.
- [x] All 18 chapter rows in the English table of contents point to English Markdown files.
- [x] Previous / contents / next links in the 18 English chapters resolve to known book files; no mismatched relative chapter target was detected.
- [x] General **glossary.md** translated: **250 / 250** entries, preserving order and technical identifiers.
- [x] **SOURCES.md** translated: 18 subject sections and **142 original external URLs**, kept in their original order.
- [x] English index links to the glossary and references, no longer incorrectly claiming that chapters are still missing.
- [x] PR remains **Draft**; Italian files on main and extension packages are unchanged.

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
