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

The intended outputs are:

- `Inside-PlumePilot.html` — Italian
- `Inside-PlumePilot-en.html` — English

Both are generated artifacts. Markdown remains the source of truth.
