# PlumePilot — AMO Notes for Reviewers

Replace every bracketed placeholder immediately before submission. Store real credentials only in AMO's private reviewer field; never commit them to the repository.

## Test account

PlumePilot adds local study and course-management tools to Pegaso pages that are accessible to the signed-in user. It has no developer-operated backend and does not provide meaningful functionality outside the supported platform. A Pegaso DEMO account is therefore required for functional testing.

- Login URL: `[DEMO URL]`
- Username/student ID: `[DEMO USERNAME]`
- Password: `[DEMO PASSWORD]`
- Recommended course: `[COURSE NAME]`
- Credentials verified until: `[DATE, TIME, TIME ZONE]`

## Essential test procedure

1. Install the extension and sign in at the DEMO URL.
2. Open an accessible course.
3. Select the PlumePilot toolbar icon.
4. In **Corso**, verify course progress and the action that finds the first incomplete activity.
5. In **Attività**, inspect the Autoplay options and available course actions.
6. Select **Crea raccolta test**, then choose PDF or interactive HTML. Processing and download occur locally.
7. Select **Genera dispense del corso** and cancel the operation, or create a short PDF/EPUB if the DEMO course permits it.
8. In **Preferenze**, change the theme and menu size and verify the draggable floating menu.
9. Optionally enable **Gaming** to inspect local Achievements, EXP, and cosmetic rewards.

Automatic completion of Tests and Objectives is disabled by default and runs only after an explicit user choice. If an isolated test remains unavailable after automatic retries, the generated collection stays usable and lists it under **Test non inclusi** without shifting or renumbering later chapters.

## Network access and data handling

- `storage` stores only local preferences, operational cache/state, normalized exam-commission information, and optional local Gaming progress.
- `*.pegaso.multiversity.click` is the supported page and API environment.
- CloudFront and Amazon S3 are contacted only when the user requests materials or images needed for local exports.
- A Pegaso session token may be used temporarily in memory for HTTPS requests to the platform's own services. It is not persisted and is never sent to the developer.
- PlumePilot has no analytics, advertising, profiling, telemetry, or developer-operated data server.
- No remote JavaScript is downloaded or executed.

The Firefox manifest declares the required built-in data consent categories `authenticationInfo`, `websiteContent`, and `websiteActivity`. Firefox Desktop 140 is the minimum supported desktop version. `gecko_android.strict_min_version` is set to 142 only to keep the manifest consistent with the Android introduction of built-in data consent; this AMO submission must be listed for **Firefox Desktop only**.

Privacy policy: <https://plumepilot.github.io/plumepilot/privacy/>

## Source and reproducible build

The attached `plumepilot-v2.34.0-source.zip` contains readable first-party source and `AMO_SOURCE_README.md`. Recommended environment: Ubuntu 24.04 LTS and Node.js 24.x. No npm install or network access is required.

```bash
node scripts/build-release.mjs
node scripts/validate-release.mjs
```

Expected Firefox package SHA-256: `13abff570c415b603608483123bfd2d1fee09a6412080220b7c5f426eabbdb10`

## Third-party libraries

The source archive contains these readable official releases:

- pdf-lib 1.17.1 — <https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz> — readable source: <https://github.com/Hopding/pdf-lib/tree/v1.17.1>
- @pdf-lib/fontkit 1.1.1 — <https://registry.npmjs.org/@pdf-lib/fontkit/-/fontkit-1.1.1.tgz> — readable versioned source is included in the archive under `es/` and `lib/`; project repository: <https://github.com/Hopding/fontkit>
- PDF.js 5.6.205 — <https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-5.6.205.tgz> — readable source: <https://github.com/mozilla/pdf.js/tree/v5.6.205>
- JSZip 3.10.1 — <https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz> — readable source: <https://github.com/Stuk/jszip/tree/v3.10.1>

Exact paths, licenses, and source SHA-256 values are recorded in `THIRD_PARTY_NOTICES.md`. Each source vendor file was compared byte for byte with its official release and matched.

The build applies exact-match, fail-closed transformations only to the Firefox runtime copies. They remove the legacy JSZip string-callback evaluator, two unused fontkit eval-like fallbacks, PDF.js's optional PostScript compiler and variable fallback imports, pdf-lib's dangling source-map marker (the map is not bundled), and the unsupported Chromium offscreen-audio branch. PDF.js retains its interpreter, normal module-worker and WebAssembly paths. Chrome and Edge keep the official files unchanged. The build fails if any expected upstream fragment differs, and the validator scans the complete Firefox ZIP for eval calls, `Function` constructors, variable dynamic imports and `chrome.offscreen` references.

The two Shadow DOM templates now contain static extension-owned markup. Packaged URLs and the version string are assigned afterward through DOM text nodes and attributes; no website content or user input reaches them.

`web-ext lint 10.6.0` reports **0 errors, 0 notices, 0 warnings**, and an empty `unknownMinifiedFiles` list for the generated Firefox package.

## Optional reviewer video

- Private/unlisted URL: `[VIDEO URL]`
- Recording date: `[DATE]`
- Version shown: `[VERSION]`

The video is supplementary; the DEMO credentials above are the primary review path.
