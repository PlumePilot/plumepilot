# Inside PlumePilot — Translation policy

## Canonical edition

The Italian Markdown files in `docs/inside-plumepilot/` are the canonical editorial source.

The English files in `docs/inside-plumepilot/en/` translate the same technical snapshots. They are not a separate fork of the book.

## Stable public URLs

- Italian / default: `/plumepilot/inside-plumepilot/`
- English: `/plumepilot/inside-plumepilot/en/`

The extension and existing public links continue to point to the default landing. Language selection happens inside the documentation site, so adding or updating a translation does not require an extension release.

## Synchronization rule

1. Update and stabilize the Italian source.
2. Translate the corresponding English chapter.
3. Preserve code blocks, identifiers, paths, commit SHAs, and API names.
4. Update English navigation.
5. Validate relative links.
6. Rebuild the matching offline HTML edition.

## Translation status

Do not merge an English landing that advertises chapters which are not yet available. Work may remain on a draft PR until the full edition passes link and navigation checks.

## Offline editions

The generated single-file readers are:

- `Inside-PlumePilot.html` — Italian (existing filename and default CLI behavior preserved)
- `Inside-PlumePilot-en.html` — English

Both live in `docs/inside-plumepilot/`, have localized navigation and search controls, and remain self-contained. They store their reading position under different `localStorage` keys. The Markdown chapters remain the source of truth.

Regenerate with Node.js and Pandoc from the repository root:

```bash
node scripts/build-inside-plumepilot.mjs --lang it
node scripts/build-inside-plumepilot.mjs --lang en
node scripts/check-inside-plumepilot.mjs
```

The English reader is linked from `en/index.md`. The original Italian landing and public URL remain unchanged.

## Publication quality gate

Build and structural checks are only part of the release decision. Verify chapter-level fidelity with the Italian source, internal links and browser behavior before marking the documentation pull request ready for review. Chrome smoke tests are automated for the candidate; Firefox and Edge require separate verification if full browser coverage is desired.
