# Experimental regional EPUB preservation

Based on future 2.35.1 draft PR #39, `fix/autoplay-collapsed-followups`
at `ceedf31db535a2e6539ed8ad4492b84179b5e548`. This separate feature branch
implements the first increment of the 1 October improvement plan. The installed
manifest remains 2.35.0; no release number or store submission is changed.

## Behavior and limits

The stable text/visual page strategy remains the default. The experiment is
selected through `buildCourseEpub(..., { regionalPreservation: true })`, or by
appending `&epubRegional=1` to the existing materials chooser URL (preserve its
job parameter) before selecting EPUB. The legacy EPUB builder also recognizes
this developer trial parameter. There is no new persistent preference.

Eligible portrait pages are rendered once at the existing resolution and pixel
limits. Text boxes, image transforms and PDF.js 5.6 bounded vector paths are
mapped into the displayed raster coordinates. Completely blank horizontal
bands at least two body-line heights apart propose regions. Cuts intersecting
text or connected graphic bounds are removed; stroke widths/miter joins are
included conservatively. Crops retain full page width rather than risking
horizontal clipping. Ordinary regions become XHTML only if every dark pixel
lies inside extracted text boxes and the existing math/table/column/text
coverage checks allow reflow. Other regions remain images. Reading order is
vertical; each item belongs to one region. Blank margins add no empty assets.

Save/restore, nested forms and unmasked groups with identity matrices are
tracked. Unknown geometry, shading, soft masks, knockout/transformed groups,
rotated text, nonzero page rotation/crop offsets, parallel columns and
whole-page classifications retain the existing fallback. Pages without enough
meaningful extracted text cannot benefit and bypass regional raster analysis.
When analysis finds no reliable mixed layout, its already rendered canvas is
reused for the stable splitter. Temporary canvases are released on exceptions
and cancellation as well as success.

This is conservative visual preservation, not equation recognition, OCR,
MathML, semantic table reconstruction or a general layout engine. Existing
classifier limitations still apply, including short grids not recognized as
visual pages. Source PDF links and clickable footnotes are not newly
implemented; existing chapter/section nav and NCX destinations are retained.
PNG/JPEG encoding quality, print-intent rendering, download retries, material
ordering, operation locking and final-package cancellation policy remain.

## Same-input results

Bundled PDF.js 5.6.205 and JSZip, Node 24.19 with native canvas. Both comparison
paths use the original page converter plus the two shared packaging repairs
below; only the candidate enables regions. These are fresh renderer-harness
comparisons, not browser performance or peak-memory measurements. Timings are
single runs, baseline followed by candidate; caching and run variance matter.
Small differences of a few bytes on unchanged documents come from UUID/ZIP
metadata. The university PDFs and derived images/EPUBs are private and absent
from the public repository and store packages.

| Input | Pages | EPUB bytes baseline / regional | Images baseline / regional | Regional pages | Time ms baseline / regional |
| --- | ---: | ---: | ---: | ---: | ---: |
| IntProSof_Pegaso.pdf | 24 | 4,789,255 / 4,789,255 | 18 / 18 | 0 | 2372 / 2517 |
| RelIns_Pegaso.pdf | 19 | 7,777,765 / 6,131,548 | 30 / 50 | 12 | 4371 / 4771 |
| StoriaCalcolatori_Pegaso.pdf | 28 | 2,899,532 / 2,899,529 | 28 / 28 | 0 | 1605 / 1450 |
| Termini_Pegaso.pdf | 15 | 4,513,201 / 4,513,203 | 29 / 29 | 0 | 4891 / 4830 |
| Four documents together | 86 | 19,969,796 / 18,323,610 | 105 / 125 | 12 | 13619 / 14237 |

RelIns improves about 21.2%; the combined export improves about 8.2%.
The other three documents gain essentially nothing: outlined/scanned text,
slides and uncertain layouts stay visual. RelIns has more, smaller image
assets (50 versus 30); asset deduplication is not implemented. The course run
is about 4.5% slower in this harness because regional raster analysis adds
work. This is a measured tradeoff, not a speed or memory improvement claim.
Repeated assets are currently stored with unique names, without reuse.
The earlier private `epub-regional-evidence/study-results.json` is not committed
to this repository; the table above records that run, rather than promising
that its private evidence directory is available in a fresh checkout.

## Validation and public fixtures

`tests/fixtures/make-epub-regions.py` reproduces nine original public pages:
prose, isolated diagram, fraction/exponent, wide merged table, positioned
scripts, landscape slide, image-only scan, rotation and crop offset. Their
source and generated PDF contain no third-party study material. Regenerate
fixture EPUB/JSON evidence with the harness commands below.

- 27 Node suites and syntax/diff checks pass.
- Actual fixture EPUB XML parses; images decode; manifest IDs/assets are valid;
  prose appears once and in order; nav/NCX targets and fallback rasters match.
- Fixture crops match complete baseline pixels exactly. Known fraction
  numerator/rule/denominator and the entire merged table fit inside one crop.
- All 44 lossless RelIns crops match the corresponding full baseline raster
  pixels exactly. Representative real crops and original fixture pages were
  visually inspected. This does not replace a full reader review.
- Cancellation during regional encoding releases tracked temporary canvases;
  a subsequent export succeeds in the renderer harness.
- EPUBCheck 5.3.0 reports no errors/warnings for fixture, four individual study
  candidates and the combined candidate export.
- Chrome/Edge/Firefox/source packages build and pass repository validation.
  They are internal checks with the unchanged manifest, not store release kits.

EPUBCheck exposed two existing errors: missing CSS manifest registration and
conflicting NCX playOrder values for section/first-chapter entries sharing a
target. This branch fixes both, including ordinary default exports.

## Reproduce

The Node harness requires `@napi-rs/canvas` externally installed; the browser
harness requires Playwright and an installed Chromium executable. Set
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` to the external dependency directory in
this runtime (or adapt the loader for your environment). Runtime-only
polyfills and font/file handling stay in the harness, never the extension.

```sh
python tests/fixtures/make-epub-regions.py
NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node scripts/benchmark-epub-node.mjs
python scripts/validate-epub-fixtures.py
node scripts/benchmark-epub-regions.mjs
```

Set `EPUB_BENCH_OUTPUT` for a distinct output directory. Pass PDF paths to the
Node script for private materials, using paths outside the repository. Set
`EPUB_BENCH_CHECKS=0` for measured corpus runs to skip extra fixture-only
cancellation/repeat checks. `validate-epub-raster-regions.py OUTPUT_DIRECTORY`
checks lossless region pixels; JPEG comparisons are explicitly skipped.
The browser harness defaults to the original public fixture only.

### Resume validation with an installed browser

The browser harness now supports locally installed Chrome or Edge, so a failed
Playwright browser download does not prevent running it on another machine.
Install Playwright as local tooling (`npm install --no-save playwright`), then
run `node scripts/benchmark-epub-regions.mjs`. If there is no downloaded browser,
set `EPUB_BROWSER_CHANNEL=chrome` or `EPUB_BROWSER_CHANNEL=msedge`, or set
`EPUB_BROWSER_EXECUTABLE` to its executable path. On PowerShell, for example:

```powershell
$env:EPUB_BROWSER_CHANNEL = 'msedge'
$env:EPUB_BENCH_OUTPUT = "$PWD/epub-benchmark-output"
node scripts/benchmark-epub-regions.mjs
python scripts/validate-epub-fixtures.py "$env:EPUB_BENCH_OUTPUT"
```

Keep generated outputs outside commits. If `CODEX_PRIMARY_RUNTIME_NODE_MODULES`
is set, the harness uses that runtime's Playwright instead of local tooling.
Sandbox disabling is an explicit container-only choice via
`EPUB_BROWSER_NO_SANDBOX=1`. The harness uses an isolated HTTP page instead of
loading extension-only UI scripts; results exercise the actual converter but
do not prove installed-extension behavior, Firefox compatibility, background
tab behavior or peak browser-process RAM.

On 2 October, fresh Node/native-canvas conversion and structural/pixel fixture
validation passed, including cancellation cleanup and a repeated export.
Chromium installation failed again with `End of central directory record
signature not found` after receiving a truncated archive. Browser validation
therefore remains open; no browser performance result is claimed for this run.

## Remaining gates and next increment

Browser installation here failed with a truncated download; no Chromium,
Edge or Firefox run is claimed. Do not enable regions by default until the
same-input browser baseline/candidate, inactive tabs, download retries,
cancellation, full-course export and Flo's Kindle/phone review pass. Real
browser process memory remains unmeasured: JS heap/canvas bounds would not
prove peak RAM. JSZip still retains encoded assets and final package buffers.

The next increment is measured encoded-asset reuse and resource/buffer
lifetime work. Limited semantic HTML tables remain optional afterward.
Broader rotation/crop support and masked/transformed groups require their own
geometric fixtures and validation before expanding eligibility.
