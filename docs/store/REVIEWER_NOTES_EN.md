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

The attached `plumepilot-v2.32.9-source.zip` contains readable first-party source and `AMO_SOURCE_README.md`. Recommended environment: Ubuntu 24.04 LTS and Node.js 24.x. No npm install or network access is required.

```bash
node scripts/build-release.mjs
node scripts/validate-release.mjs
```

Expected Firefox package SHA-256: `22b0cd7e281bec6395e742b6cef570e8d48a03da6b6d85c8a3f38f35eed2e97f`

## Third-party libraries

The runtime package contains these unmodified official releases:

- pdf-lib 1.17.1 — <https://registry.npmjs.org/pdf-lib/-/pdf-lib-1.17.1.tgz> — readable source: <https://github.com/Hopding/pdf-lib/tree/v1.17.1>
- @pdf-lib/fontkit 1.1.1 — <https://registry.npmjs.org/@pdf-lib/fontkit/-/fontkit-1.1.1.tgz> — readable source: <https://github.com/Hopding/fontkit>
- PDF.js 5.6.205 — <https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-5.6.205.tgz> — readable source: <https://github.com/mozilla/pdf.js/tree/v5.6.205>
- JSZip 3.10.1 — <https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz> — readable source: <https://github.com/Stuk/jszip/tree/v3.10.1>

Exact paths, licenses, and SHA-256 values are recorded in `THIRD_PARTY_NOTICES.md`. Each bundled file was compared byte for byte with the corresponding file extracted from the official npm archive and matched.

The AMO linter reports 14 warnings and no errors for this package: 12 `Function`, `eval`, or dynamic-import warnings originate exclusively from the unmodified upstream vendor releases; the remaining two flag `shadow.innerHTML` assignments in `floating-menu.js`. Both assignments create closed Shadow DOM interfaces from extension-owned static markup and interpolate only URLs returned by `chrome.runtime.getURL()` for packaged images and the packaged font. No website content or user input reaches those assignments. The extension does not use any of these constructs to download or execute remote code.

The linter can heuristically classify `popup.js` as minified; it is readable first-party source and is not transformed during the build.

## Optional reviewer video

- Private/unlisted URL: `[VIDEO URL]`
- Recording date: `[DATE]`
- Version shown: `[VERSION]`

The video is supplementary; the DEMO credentials above are the primary review path.
