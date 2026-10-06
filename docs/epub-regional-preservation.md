# Regional EPUB preservation for 2.35.1

Approved regional preservation from PR #40 is integrated into the 2.35.1 release branch. The installed manifest and browser-specific Novità are now prepared for 2.35.1; store submission is handled separately.

## Behavior and limits

On 2 October the author approved the result for release 2.35.1 and authorized
merging PR #40 into `fix/autoplay-collapsed-followups`. Both EPUB export entry
points now select regional preservation by default. Appending
`&epubRegional=0` to the builder URL (preserve its job parameter) selects the
older page strategy for diagnosis; `epubRegional=1` remains accepted. The
programmatic API still accepts `{ regionalPreservation: true/false }`.
There is no new persistent preference or user-facing option.

Eligible portrait pages are rendered once at the existing resolution and pixel
limits. Text boxes, image transforms and PDF.js 5.6 bounded vector paths are
mapped into the displayed raster coordinates. Completely blank horizontal
bands at least two body-line heights apart propose initial regions. Smaller
blank gaps may add cuts immediately next to ordinary prose rows; gaps between
formula/label rows are not refined. Cuts intersecting
text or connected graphic bounds are removed; stroke widths/miter joins are
included conservatively. Crops retain full page width rather than risking
horizontal clipping. Ordinary regions become XHTML only if every dark pixel
lies inside extracted text boxes and the existing math/table/column/text
coverage checks allow reflow. Other regions remain images. Reading order is
vertical; each item belongs to one region. Blank margins add no empty assets.

Textual mathematical characters retain their exact Unicode values. The
experiment wraps supported runs in a dedicated font span and embeds one
440,520-byte PlumePilot Math font, derived from pinned STIX Two Math under
OFL 1.1, plus its license. Books without such runs carry neither asset. Actual
glyph coverage is checked; unsupported math, replacement characters and
private-use codes retain raster fallback. A narrow detector also preserves
simple horizontal-rule fractions that the existing classifier can miss.
It requires short text above and below the rule, avoiding a general
small-vector fallback that would rasterize ordinary prose pages.

Final encoded images are reused within one export when their SHA-256,
media type and extension match. All referring chapters use one canonical
manifest asset. The registry retains only metadata, and packaging releases
each page's redundant byte references after ZIP registration. JSZip still
owns the stored encoded assets and final buffers; this is not a streaming ZIP.

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

## Visible linked chapter index

The PDF course export's interactive index is generated from the same section
and chapter metadata that the EPUB already uses for `nav.xhtml` and NCX.
The EPUB now includes its existing navigation document in reading order,
immediately after the cover. The cover links to that index, and each chapter
has a return link. Section links open their first included chapter; chapter
links open the corresponding XHTML file. Failed materials produce no index
entries. This applies to both default and regional exports.

No PDF is rendered again and no extra index image or separate index document
is generated. Existing chapter grouping, order, titles and reader menu remain
the same. The change is a few XHTML links and one spine reference. It carries
the generated course chapter index into the EPUB; arbitrary embedded PDF
annotations, PDF bookmark destinations and within-page links are not imported.

Navigation was checked on actual default/regional exports with two sections,
three public-fixture chapters and one intentionally failed material: reading
order, escaped titles, every forward/return destination and failure omission
pass. Both books and the updated RelIns sample pass EPUBCheck 5.3.0 with no
errors/warnings. RelIns's new EPUB differs by 68 bytes (including ordinary
UUID/ZIP metadata variation); every image/font asset is byte-identical.

## Same-input results — first increment, 1 October

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
assets (50 versus 30); asset deduplication was not implemented in that run. The course run
is about 4.5% slower in this harness because regional raster analysis adds
work. This is a measured tradeoff, not a speed or memory improvement claim.
Repeated assets were stored with unique names, without reuse.
The historical summary is committed as
`docs/epub-regional-evidence/study-results.json`; the study PDFs and derived
study rasters/EPUBs remain private. Committed example crops come only from
the original public fixture.

## Same-input results — follow-up, 2 October

The same four-document corpus, renderer, raster resolution and encoding
settings were compared again. File sizes below are bytes, not RAM. The
previous experimental converter was run independently on the same input;
its timings are not compared to the fresh consecutive default/candidate run.

| Export | Default EPUB | Previous regional EPUB | Updated regional EPUB |
| --- | ---: | ---: | ---: |
| Four documents, 86 pages | 19,969,804 | 18,323,608 | 14,496,472 |
| RelIns, 19 pages | 7,777,836 | 6,131,548 (historical) | 3,841,965 |
| Termini, 15 pages | 4,513,200 | Essentially unchanged | 4,513,204 |

The combined export is 20.9% smaller than the previous experiment and 27.4%
smaller than the default. RelIns improves approximately 37.3% further;
its tighter safe cuts yield more prose outside images. The individual run
uses readable chapter/title metadata, accounting for a few bytes versus
historical metadata. Other study documents retain their existing page strategy,
including all 12 ordinary text pages in IntProSof. No additional reduction is
promised for a different book or the user's 190-to-140 MB export.

The candidate has 14 regional pages and 135 image uses but only 133 stored
images. Two identical covers save 1,537,174 encoded bytes across chapters.
Stored image bytes fall from 15,628,070 to 14,090,896 before ZIP compression;
the font is embedded once. A repeated public-fixture export separately
verifies 22 image uses share 11 assets. The registry is export-local.

The fresh four-document run took 19,438 ms default / 19,415 ms candidate.
These single harness runs establish no speed improvement or browser-memory
claim. A sanitized numeric summary is in
`docs/epub-regional-evidence/follow-up-results.json`.

## Validation and public fixtures

`tests/fixtures/make-epub-regions.py` reproduces twelve original public pages:
prose, isolated diagram, fraction/exponent, wide merged table, positioned
scripts, landscape slide, image-only scan, rotation, crop offset, a tight
inline formula, a tight horizontal-rule fraction, and Unicode math letters. Their
source and generated PDF contain no third-party study material. Regenerate
fixture EPUB/JSON evidence with the harness commands below.

- 28 Node suites and syntax/diff checks pass; font coverage/name/license and
  pinned checksums match.
- Actual fixture EPUB XML parses; images decode; manifest IDs/assets are valid;
  prose appears once and in order; nav/NCX targets and fallback rasters match.
- Fixture crops match complete baseline pixels exactly. Known fraction
  numerator/rule/denominator and the entire merged table fit inside one crop.
- All 58 lossless study crops and six public fixture crops match complete
  source rasters exactly. The tight fraction stays inside one crop and the
  Unicode letters remain unchanged inside math-font spans. The earlier
  increment's representative crops were visually inspected; current pixel
  and structural checks do not replace a full reader review.
- Cancellation during regional encoding releases tracked temporary canvases;
  a subsequent export succeeds in the renderer harness.
- EPUBCheck 5.3.0 reports no errors/warnings for the latest fixture and
  combined study candidates. Earlier individual study candidates also passed.
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
Set `EPUB_BENCH_REFERENCES=1` in the Node harness to render full source images
for candidate regional pages after measurements. These references allow
validation of newly protected formulas that the default exported as text.
`EPUB_BENCH_MODES=regional` selects a single path and
`EPUB_BENCH_CORE_FILE=/path/to/previous-core.mjs` compares a saved converter.

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

## Remaining gates

Browser installation here failed with a truncated download; no Chromium,
Edge or Firefox run is claimed. Do not enable regions by default until the
same-input browser baseline/candidate, inactive tabs, download retries,
cancellation, full-course export and Flo's Kindle/phone review pass. Real
browser process memory remains unmeasured: JS heap/canvas bounds would not
prove peak RAM. JSZip still retains encoded assets and final package buffers.

Further resource/buffer lifetime work and limited semantic HTML tables remain
optional follow-ups.
Broader rotation/crop support and masked/transformed groups require their own
geometric fixtures and validation before expanding eligibility.
