# Adaptive EPUB fidelity follow-up

This change targets `integration/post-2.33.2`, starting from
`17ca22054506e1ec86c9c987abc7ae6e00373045`. It does not change the release
version or add a conversion setting, dependency, permission or network service.

## Behavior

- Preserve one automatic text/visual mode. Linear prose still becomes XHTML.
- Fall back to visual rendering for even one unresolved replacement/private-use
  character in meaningful content, and for geometrically positioned small
  superscripts/subscripts. Reuse the existing prose-footnote recognition first.
- Detect compact tables with at least three nearby aligned rows, complementing
  the existing larger multi-column detector. This is conservative detection,
  not reconstruction of HTML table cells or mathematical markup.
- Use a target width of 1800 pixels for complex math, vector graphics, rotated
  text, detected tables, outlined-text portrait pages, and dense/vector-heavy
  slides. Other visual pages retain the 1200-pixel target. Bound the base canvas
  to approximately five million pixels and an 8192-pixel maximum side.
- Keep landscape slides and image-dominant covers/scans whole. Portrait pages
  with insufficient extracted text and substantial vector drawing but no
  significant image can use the safe splitter (e.g. text converted to outlines).
- Cut only inside a continuous completely blank horizontal band (10 pixels at
  1200-pixel width, scaled with resolution). Search around the normal target,
  then forward; keep the remainder together if no safe band exists. No overlap
  or forced cut through ink. This is a pixel heuristic, not semantic detection
  of equations; blank-separated related content can still land in two blocks.
- Preserve the full source-page bounds. The former fixed 1.5% edge crop could
  remove content near slide edges.
- Keep existing PNG/JPEG selection, cancellation, print-intent rendering,
  progress, page ordering and navigation behavior.

## Verification (2026-09-22)

`node tests/epub-adaptive-fidelity.mjs` covers prose, unresolved characters,
ignored copyright footer decoration, raised/lowered math characters, prose
footnote superscripts, small tables, sparse covers versus outlined text,
whole slides and dense slide resolution, blank-band cuts, unsplittable pages,
contiguous block coverage and raster limits. It loads only the first-party
logic with a stub operator catalogue; it is not a PDF renderer test.

Separately, all 86 pages of four user-provided PDFs were classified and fully
converted before and after the change using the repository's exact bundled
PDF.js 5.6.205 and JSZip, with a local Node/canvas test harness. That harness
supplied canvas/DOM primitives, file-URL access and modern Map/Uint8Array
helpers required by the browser distribution. No runtime code was changed to
support Node. Generated XML parsed successfully and every embedded raster
decoded successfully. Representative equation, table and slide output images
were visually inspected against the source PDFs.

| Local sample | Pages | Reflow pages before/after | Image blocks before/after | EPUB bytes before/after |
| --- | ---: | ---: | ---: | ---: |
| RelIns_Pegaso.pdf | 19 | 3 / 3 | 31 / 30 | 5,705,471 / 7,777,697 |
| Termini_Pegaso.pdf | 15 | 0 / 0 | 15 / 29 | 3,150,486 / 4,513,132 |
| IntProSof_Pegaso.pdf | 24 | 12 / 12 | 19 / 18 | 4,575,693 / 4,789,204 |
| StoriaCalcolatori_Pegaso.pdf | 28 | 0 / 0 | 28 / 28 | 2,552,756 / 2,899,492 |

The text-versus-visual page choices did not change for these samples; the
existing classifier already protects their complex content. New safeguards
cover isolated failures reproduced by synthetic regression cases. Improvements
here are primarily raster detail, full-edge preservation and safer splitting.

Termini's cover stays whole; its 14 outlined portrait pages each produce two
blocks. RelIns page 10 and IntProSof page 7 retain their tables without a forced
cut. StoriaCalcolatori page 11 renders as a complete 1800 by 1013 image.
IntProSof pages 3, 4, 5, 9, 10, 11, 13, 16, 18, 21, 23 and 24 remain reflowable.
Page numbers here refer to PDF file pages, including covers.

Sample EPUBs are approximately 5–43% larger. This is an intentional sharpness
trade-off; image memory and long-course output size still need real-device
assessment. The five-million-pixel bound applies per base canvas, not to all
images retained by ZIP assembly. Timings from this harness are not browser
performance measurements. PDF.js font warnings also occurred in the baseline.
User course PDFs and derived content are not included in the repository.

## Manual gate before merge

The browser download in the test environment failed, so this is not claimed as
a Firefox/Chrome/Edge or e-reader validation. Keep the PR draft until:

- Convert the four PDFs through PlumePilot in Firefox, Chrome and Edge,
  including conversion in an inactive builder tab and cancellation.
- Open results in the user's phone reader and desktop reader; check readable
  formula details, whole tables/slides, navigation and image pagination.
- Check normal prose and footnotes remain comfortable with a larger reader
  font; check the added image size on one representative full course.

The automatic splitter cannot reconstruct semantic relationships, and these
changes deliberately do not add OCR, MathML or mixed text/image region layout.
