Warning: truncated output (original token count: 25454)
Total output lines: 1276

# PlumePilot — Changelog

## Fixed in 2.32.7: Gaming-only EXP feedback and fixed floating tabs

- Accepts Pegaso master indexes that explicitly use `folder_id: 0` for an ungrouped lesson, while still rejecting missing, negative or duplicate composite chapter identities.
- Rejects every generic Traguardo claim centrally while the visual style is Standard, preventing EXP, completion state and Gaming-only messages from leaking into Standard mode.
- Keeps chapter-video observations resolved in Standard without awarding or recovering EXP later, preserving the existing non-retroactive rule.
- Rechecks the active visual style before rendering asynchronous Traguardi feedback in the popup, floating menu, course page and export builders.
- Moves the floating menu tabs outside its scrollable body so the header and primary navigation remain visible while only the selected content scrolls.
- Preserves the existing Small, Medium and Large dimensions, dynamic tab count, keyboard navigation and Standard/Gaming styling.

## Fixed in 2.32.6: complete and correctly aligned test exports

- Identifies each chapter by its module, learning-path entry and chapter ID instead of treating the visible number as globally unique.
- Preserves the authoritative master-index order even when module numbering restarts or uses sparse, non-sequential values.
- Recovers chapters missing from a transient page outline and keeps their question groups aligned with the correct chapter.
- Validates the lesson title returned by the detailed API before accepting questions, preventing cached or mismatched responses from shifting later groups.
- Retains module boundaries without guessing a neighbouring module when metadata is incomplete.

## Improved in 2.32.5: aligned Gaming preference cards

- Replaces floating-menu fieldset legends with accessible headings placed fully inside each preference card.
- Matches the main menu's purple card border and gold left accent without an opaque label mask in dark mode.
- Keeps Pixelify Sans for Gaming headings and choices while retaining the more readable system font for explanatory copy.
- Preserves compact menu sizing, responsive behavior and control semantics.

## Fixed in 2.32.4: readable floating-menu preference legends

- Masks the Gaming fieldset's inner pixel line behind preference titles in the floating menu.
- Prevents the titles from appearing struck through, especially in the light theme.
- Preserves fieldset semantics, menu dimensions, theme behavior and the existing pixel frame.

## Fixed in 2.32.3: consistent action-button hover

- Gives the course-materials action the same secondary-button treatment as the other completion and export actions in the main menu.
- Makes test collection and course-material export change both background and text color on hover in the floating menu.
- Uses the same high-contrast dark-purple gradient in light and dark themes, while preserving the additional gold Gaming border feedback.
- Leaves extension behavior, permissions and supported domains unchanged.

## Changed in 2.32.2: canonical privacy publication links

- Points the in-extension Privacy link and the README to the canonical GitHub Pages policy.
- Aligns the repository and GitHub Pages privacy copies, including temporary export storage, exact service categories, browser-managed deletion wording and the Chrome Web Store Limited Use statement.
- Removes an accidentally appended obsolete privacy copy from the repository document.
- Leaves application behavior, permissions and supported Pegaso domains unchanged.

## Fixed in 2.32.1: reward markers in the floating menu

- Adds the missing 50/100-EXP reward markers to the Gaming progress bar in the floating menu.
- Mirrors the popup behavior: the next bar style appears at 50 EXP, the next launcher style at 100 EXP and the earned 50-EXP marker becomes a neutral tick.
- Keeps marker artwork, tooltips and reward-set progression synchronized between both Traguardi interfaces.

## Changed in 2.32.0: PlumePilot identity and public project baseline

- Renames the extension from StudyWing to PlumePilot across manifests, interfaces, generated PDF/EPUB/HTML materials and reviewer-facing documentation.
- Establishes `plumepilot@fabiofloris` as the permanent Firefox add-on ID before the first AMO publication.
- Adds the public project contact `plumepilot@gmail.com` and repository links for support, privacy and security reports.
- Adds repository contribution, support, security, trademark and issue-template documents.
- Keeps the existing `studywing...` storage keys and internal messaging identifiers unchanged so the data schema remains compatible in future updates.
- Because the Firefox add-on ID changes before the first AMO publication, Firefox treats v2.32.0 as a different temporary add-on: local data from pre-release builds using `studywing@fabiofloris` is not migrated automatically.
- Keeps the existing logo and mascot; this release changes the product identity without changing the established visual assets.

The entries below retain the historical StudyWing name because they describe releases published before the rename.

## Fixed in 2.31.3: Chromium floating-menu spacing

- Stops Chrome and Edge from reserving an empty scrollbar gutter on short floating-menu tabs, restoring balanced left and right spacing at every menu size.
- Keeps Firefox's existing stable gutter behavior unchanged.

## Fixed in 2.31.2: balanced spacing and responsive popup text

- Restores the popup's Chromium right padding from the obsolete 26-pixel scrollbar compensation to the balanced 18-pixel base spacing.
- Gives action buttons, secondary controls, Traguardi titles, descriptions, EXP values and section labels explicit Small, Medium and Large font scales shared by Firefox, Chrome and Edge.
- Keeps the four Gaming tabs slightly more compact only in the Small layout so their labels continue to fit safely.

## Fixed in 2.31.1: consistent popup scrolling

- Keeps the StudyWing header and primary tabs visible while the popup content scrolls in every browser and visual style.
- Gives Traguardi a fixed summary, an independently scrollable content area and a separate opaque EXP/reset footer, preventing labels, progress artwork and controls from overlapping.
- Removes the Gaming `100vh` minimum that prevented Firefox from shrinking the popup after returning from a taller tab.
- Stops Chromium's reserved scrollbar gutter from pulling the fixed Gaming frame toward controls on non-scrollable tabs.

## New in 2.31.0: publication foundations

- Establishes `studywing@fabiofloris` as the permanent Firefox add-on ID.
- Uses Firefox's built-in data-collection consent declarations for authentication information, website content and website activity, with Firefox 140 as the minimum supported version.
- Adds a reproducible release builder that creates dedicated Chrome, Firefox and Edge ZIP packages with `manifest.json` at the archive root.
- Gives Chromium and Firefox their native background-manifest configuration instead of shipping both alternatives in the same store package.
- Shortens the manifest description to the Chromium limit and validates it automatically.
- Replaces browser-specific PDF and EPUB signatures with a neutral StudyWing signature.
- Disables routine diagnostic logging by default while preserving sanitized warnings and errors.
- Adds the GPL-3.0-only project license, third-party notices, a public-facing README and a privacy-policy draft.
- Moves the cumulative release history from README to this changelog.
- Keeps the floating menu enabled by default and completes its 10-EXP achievement together with the 30-EXP Autoplay achievement when Gaming mode is activated, for a one-time 40-EXP starting total.

## Improved in 2.30.4: verified lesson completion and real EXP feedback

- Keeps a lesson-completion candidate pending when StudyWing observes the final chapter but Pegaso still reports a rounded value such as 99.95%.
- Rechecks only that pending candidate against Pegaso's authoritative course index after reload; the 100-EXP achievement is awarded when every chapter in the lesson is confirmed at 100%, without granting old lessons retroactively.
- Clears any pending lesson-confirmation candidate together with Traguardi and EXP during the isolated reset.
- Restores the pixel-art `+N EXP` rise-and-fade effect using only EXP actually accepted by the achievement system.
- Starts the effect beside the on-screen percentage and delays the bottom-right success notification until the animation finishes; with no visible progress bar or reduced motion enabled, the notification remains immediate.
- Combines simultaneous chapter and achievement EXP into one visual feedback and one detailed notification.

## Fixed in 2.30.3: full-lesson achievement and dark mascot idle

- Corrects “Sapere è potere!” so it is awarded only when every chapter belonging to the same lesson reaches 100%, rather than when one chapter is completed.
- Raises the achievement reward from 50 EXP to 100 EXP to reflect the broader completion requirement.
- Keeps the chapter-video bonus separate: its accepted `+N EXP` appears in the standard StudyWing success notification at the bottom-right of the course page.
- Replaces the dark-theme idle mascot sprite and slows its five-frame cycle from 6 fps to 5 fps.

## Changed in 2.30.2: chapter video completion EXP

- Replaces fractional percentage-derived video EXP with a chapter-completion bonus that is easier to understand and verify.
- Establishes the first complete video list observed for each course chapter as its baseline.
- Awards 1 EXP for every video in the chapter when its remaining incomplete videos all reach 100% while Gaming mode is active.
- Gives no retroactive reward to chapters already complete at baseline and resolves chapters completed while Gaming mode is inactive without recovering their EXP later.
- Stores one completion record per stable course/chapter identity to prevent duplicate rewards across reloads and tabs.
- Preserves total EXP already earned with earlier StudyWing versions while migrating the progress registry to state version 2.
- Shows the terminal notification **Video del capitolo completati: +N EXP** and retains the 500-EXP cap.

## Fixed in 2.30.1: floating-menu readability and Edge instructions

- Increases the progress-option labels, position choices, summary, and explanatory note when the floating menu is set to **Grande**.
- Makes the Microsoft Edge installation instructions independent of the StudyWing version number.

## New in 2.30.0: final gaming and menu refinements

- The header status can now pause or reactivate StudyWing with a click and has a subtle hover preview.
- Achievement titles now use a more distinctive gaming style.
- Added “Sapere è potere!”: complete every chapter in a lesson at 100% in Gaming mode to earn 100 EXP (corrected in 2.30.3).
- Removed the unnecessary empty space below the Achievements tab footer.
- Applied the Chromium popup right-edge compensation consistently to every tab.
- Kept the playback-recovery sprite inside its floating-menu fieldset.

## Fixed in 2.29.1: reward visuals

- Enlarges unlocked cosmetic frames inside the existing floating-launcher hitbox, while preserving the commission badge geometry.
- Keeps the mascot slightly inset so it remains readable inside the larger frame at every launcher size.
- Shows the thematic 50% reward emblem only while it is still the next unlock.
- Replaces an already-earned 50% emblem with a neutral threshold tick, preventing icons from another reward set from appearing to contaminate the active bar style.
- Keeps the 100% launcher emblem visible until the next level reward is earned.

## New in 2.29.0: cosmetic rewards and collection

- Adds the compact **Ricompense** collection to Traguardi in both the popup and floating menu.
- Unlocks coordinated bar/launcher rewards at every 50/100 EXP threshold: Pergamena, Tomo, Natura, Sci‑Fi and Demoniaco.
- Keeps Arcane Wing available as the default Gaming set.
- Shows Locked, Unlocked, Apply and In use states and lets bar and launcher cosmetics be selected independently.
- Applies the selected modular bar to course progress and achievement progress in both interfaces; edge overlays use a coordinated horizontal/vertical palette.
- Overlays the selected native 32×32 launcher frame without changing the mascot identity or commission badge geometry.
- Replaces generic 50%/100% markers with the approved reward emblems for the next set.
- Derives unlock ownership from authoritative total EXP, safely falling back to Arcane Wing for missing, invalid or still-locked IDs.
- Includes combined one-time unlock/level notifications and restores default cosmetics during the isolated achievement reset.
- Credits eligible secondary setting discoveries when they are activated from the floating menu as well as the popup.
- Adds 35 validated native-resolution reward PNGs and no new network request or permission.

## New in 2.28.0: video-derived EXP

- Awards 1 EXP for each full percentage point of course contribution produced exclusively by video progress.
- Establishes the first observed percentage of every video as a zero-EXP baseline, preventing retroactive rewards.
- Stores fractional contribution until it reaches a whole EXP and retains deterministic six-decimal precision.
- Uses stable course route and activity identities plus a serialized background queue to prevent duplicate credit across tabs and reloads.
- Updates video high-water marks while Standard is active without awarding or later recovering that progress.
- Excludes Test, Obiettivi and Dispense activity deltas from repeatable EXP.
- Bounds the persistent video registry, retaining the 1,500 most recently observed activities after the 2,000-entry threshold.
- Shows a StudyWing notification only when accumulated video contribution produces at least 1 real EXP.

The four-tab popup alignment fix documented below is included in this candidate.

## Fixed in 2.27.2: four-tab popup alignment

- Keeps Corso, Attività, Traguardi and Preferenze on one row while Gaming is active.
- Divides the available popup width into four equal columns and prevents tab labels from wrapping.
- Uses slightly tighter text and horizontal padding only in the Small Gaming layout.
- Preserves the existing three-column Standard layout and Medium/Large typography.

## Improved in 2.27.1: terminal achievements and visible feedback

- Shows an immediate StudyWing achievement notification with the awarded EXP and any crossed reward/level threshold.
- Credits automatic Tests and Obiettivi after a successful complete scan, including the valid “already all completed/green” result.
- Excludes cancelled runs, unavailable course structures and terminal runs containing failures.
- Credits the first-incomplete bookmark only after a valid target video is actually opened.
- Credits test collections and course materials only after a usable PDF, EPUB or interactive HTML file is generated and downloaded.
- Keeps every award idempotent across repeated actions, reloads and multiple tabs.

## New in 2.27.0: Achievements foundation

- Adds the Gaming-only **Traguardi** tab to the popup and floating menu.
- Introduces local, versioned EXP state with serialized one-time achievement claims shared across tabs.
- Includes the approved 11-item discovery catalogue, 100-EXP levels, a visible 50% milestone and a temporary visible cap at Level 6 / 500 EXP.
- Credits Autoplay onboarding, the progress overlay, 70% advice, a valid Autoplay session limit, commission monitoring and the first real floating-menu opening only once.
- Removes the former decorative course-progress `+N EXP`; EXP now appears only after an accepted claim.
- Adds an isolated, confirmed reset that does not alter StudyWing preferences, exam data or course caches.
- Keeps Standard mode free of the Traguardi UI and pauses all new claims while preserving existing state.

This is the first candidate increment. Terminal operation achievements, video-derived EXP and selectable cosmetic rewards remain for the next increments.

## Fixed in 2.26.10: inactive EPUB rendering and immediate cancellation

- Reserves a three-pixel inner safe area between the floating-menu scroll body and its Gaming frame so the final control cannot paint over the perimeter.
- Runs PDF.js canvas conversion with print rendering intent, which avoids the display renderer's `requestAnimationFrame` dependency when the open builder tab becomes inactive.
- Destroys the active PDF.js loading/document task as soon as EPUB cancellation is requested, interrupting text/operator extraction as well as downloads and page rendering.
- Retains the `v2.26.9` cross-browser message-task yields, tab-owner reconciliation and safe operation release.

## Fixed in 2.26.9: floating scroll containment and resilient EPUB lifecycle

- Keeps the floating-menu header outside the scrollable body so its mascot and text cannot pass beneath the Gaming perimeter.
- Replaces zero-delay timer yields during EPUB conversion with cross-browser message-task yields, avoiding background-tab timer clamping while preserving responsive cancellation.
- Releases an active PDF/EPUB build explicitly when its builder page exits and serializes authoritative cleanup when its owner tab closes.
- Reconciles orphaned operation locks on activation, startup, operation lookup and the next acquire attempt, immediately restoring disabled StudyWing controls.
- Keeps conversion local and requires the builder tab to remain open; closing it cancels work safely instead of attempting browser-specific background execution.

## Improved in 2.26.8: Phase 1 finishing feedback

- Adds an event-driven five-frame pixel alert to the floating launcher when unseen commission updates arrive.
- Shows a lightweight `+N EXP` pixel label when the active Gaming progress overlay increases by whole percentage points.
- Adds balanced horizontal spacing to the floating autoplay-options row.
- Keeps first render, course changes, unchanged percentages, Standard style and reduced-motion mode free of decorative playback.

## Fixed in 2.26.7: content masking beneath the fixed Gaming frame

- Adds an eight-pixel, theme-aware viewport mask beneath the fixed popup border and above the scrolling content.
- Hides headings, icons and cards as soon as they pass beyond the inner pixel-frame boundary instead of letting them remain visible behind its translucent lines.
- Keeps the frame itself on the top layer and leaves scrolling, scrollbar input, layout dimensions and Standard style unchanged.

## Fixed in 2.26.6: safe space inside the fixed popup frame

- Reserves an additional eight pixels on the right only when a Chromium browser displays the taller **Corso** tab, matching its popup gutter overlap without changing Firefox spacing.
- Keeps progress artwork, chevrons, checkboxes, labels and card borders clear of the decorative viewport overlay.
- Leaves other popup tabs, Firefox, the popup width, fixed outer frame, other visual styles and floating menu unchanged.

## Fixed in 2.26.5: scroll-independent matching menu frames

- Moves the Gaming popup perimeter from the scrollable content container to a fixed, pointer-transparent viewport overlay.
- Keeps all four sides visible when the taller **Corso** tab activates popup scrolling or a reserved scrollbar gutter.
- Gives the floating panel the same outer outline, purple inner line and pale pixel highlight used by the popup.
- Adds no layout space, image asset, JavaScript work or interactive overlay; internal content dimensions and scrolling behavior remain unchanged.

## Fixed in 2.26.4: fully visible Gaming popup frame

- Insets the main Gaming popup perimeter by two pixels on every side so the right edge cannot be clipped by the browser viewport or reserved scrollbar gutter.
- Uses explicit border-box-compatible width and height calculations without changing the internal layout, menu-size preferences or floating panel.

## Improved in 2.26.3: Gaming pixel-frame polish

## Improved in 2.26.3: Gaming pixel-frame polish

- Gives the Gaming popup and floating panel crisp two-level pixel perimeters with square corners and hard offset shadows.
- Applies the same restrained frame language to tabs, progress cards, preference groups, contextual action buttons, exam cards, notifications and important compact controls.
- Uses gold inner accents for selected and hovered states while keeping disabled and running controls semantically distinct.
- Preserves unclipped keyboard focus outlines by avoiding `clip-path` on interactive elements.
- Adds no bitmap, SVG, font or JavaScript asset: the treatment is static CSS and causes no idle work or runtime request.
- Leaves Standard style, menu-size behavior, animation rules, reduced motion and all StudyWing functionality unchanged.

## New in 2.26.2: animated Gaming controls

- Adds three new six-frame pixel animations for **Autoplay**, **Errori di riproduzione**, and **Menu fluttuante**, preserving the exact StudyWing mascot and palette used by the existing action sprites.
- Adds the supplied six-frame commission-check animation beside **Controlla stato commissione**, normalized as `action-commission-check.png`.
- Shows the relevant artwork in the popup and, where that control exists, in the floating menu; Standard style remains visually unchanged.
- Plays a relaxed loop only while the related control is hovered or keyboard-focused, and plays one authoritative cycle when Autoplay, the floating menu, or commission checking is enabled, or when the playback-recovery mode changes.
- Keeps disabled/off transitions static, honors reduced motion, uses CSS sprite stepping without timers or extra runtime requests, and adds under 6 KB of production PNG assets before ZIP compression.

## Improved in 2.26.1: Arcane Wing EXP bar and action previews

- Replaces the provisional Gaming progress treatment with the compact **Arcane Wing** design: obsidian frame, StudyWing-purple energy, gold progress tip, ten rune-like divisions, a gold 70% marker and a central percentage plaque.
- Uses four tiny, repeatable native-resolution pixel assets so popup and floating-menu bars remain responsive without stretching or adding runtime requests.
- Gives the optional edge overlay a matching obsidian, purple-energy and gold-marker treatment while preserving horizontal and vertical placement.
- Previews each contextual action sprite in a relaxed loop while its enabled button is hovered or keyboard-focused, including a final-frame pause between repetitions.
- Keeps accepted-click playback immediate and authoritative; running, stopping, disabled, Standard-style and reduced-motion states do not run the preview loop.

## New in 2.26.0: contextual action sprites and one-time material collection

- Adds the reviewed Gaming sprites beside all four contextual actions in both the popup and floating menu: automatic tests, Objectives, test collection, and course materials.
- Keeps every sprite static until its real action start is accepted, preserves a static first frame for reduced-motion users, and switches playback to native pixel `steps()` timing with fixed top alignment to remove interpolation and label-reflow jitter.
- Replaces the separate PDF and EPUB collection buttons with one **Esporta dispense del corso** action.
- Collects course-material URLs once, then opens a dedicated chooser where PDF and EPUB can be generated and downloaded sequentially without collecting the course again.
- Generates only the requested format, releases temporary output bytes immediately after download, and keeps PDF and EPUB conversion isolated so one format does not increase the other format’s runtime cost.
- Retains the previous standalone PDF and EPUB builders for compatibility while routing new StudyWing actions through the unified chooser.

## Improved in 2.25.2: contextual Objective animation and broader pi…13454 tokens truncated…ready completed and shown as green.
- API resume discovery treats any test as an actionable boundary while the option is enabled, regardless of its percentage.
- Disabling **Fermati ai test** still resumes progression and allows completed tests to be skipped normally.

## Fixed in 2.9.2: Stop at tests before resume discovery

- Checks the current module's terminal test through both the rendered chapter and lesson API before searching later modules.
- When **Fermati ai test di fine lezione** is enabled and the current test is pending, stops immediately, focuses the test when rendered, and never starts forward resume discovery.
- Fails closed when the current test cannot be verified: progression stops safely instead of potentially skipping it.
- Makes **Fermati ai test** and automatic test completion mutually exclusive in both the popup and floating menu.
- Resolves settings retained from older versions with both options enabled by giving **Fermati ai test** priority and disabling automatic completion.
- Preserves automatic resume when the user later disables **Fermati ai test**, along with API/visual fallbacks and the real-video-end safeguard.

## New in 2.9.1: visible resume-search progress

- Shows an Italian on-page status message while StudyWing searches the lesson API for the next activity.
- Displays the current module number and chapter title during the scan.
- Confirms which Obiettivi, video, or test was found before opening the target chapter.
- Clearly reports when API discovery switches to the established visual fallback.
- Reports when no further activities remain and removes terminal messages automatically after five seconds.
- Uses the same compact bottom-right StudyWing toast style as Turbo Test and PDF/EPUB progress.

## New in 2.9.0: API resume discovery

- Finds the next unfinished Obiettivi or video from authenticated lesson metadata instead of opening every intervening chapter.
- Expands course sections only to map global API module numbers to their visible section and chapter titles, then opens only the chapter that needs attention.
- Stops API scanning at the first item whose percentage is below `100`, preserving item order from the lesson response.
- Keeps pending end-of-lesson tests actionable according to **Completa automaticamente i test** and **Fermati ai test di fine lezione**.
- Validates that the response contains the expected intro and video metadata; incomplete responses are retried and then handed to the established visual discovery fallback.
- Preserves the playback safeguard unchanged: a lesson advances when its displayed progress is `100%` **or** the loaded video has genuinely reached its real duration.
- Keeps requests sequential and paced, retains the memory-only Bearer token handling, and stops safely when autoplay is paused or another course operation starts.

## New in 2.8.0: API autoplay test completion

- Uses the authenticated lesson API to complete a pending end-of-lesson test during ordinary autoplay, without opening or rendering its questions.
- Reads the current course code and module number from the lesson URL, then submits the terminal test's real `lp_item_id` and `lp_id` to `completeTestIntro`.
- Skips tests already reported as complete and validates the API response before automatic progression continues.
- Retries incomplete lesson responses with the same bounded backoff used by PDF/EPUB collection.
- Checks that autoplay and automatic test completion are still enabled before submission and again before progression.
- Automatically uses the established answer-A visual routine if the API is unavailable or rejects the request.
- Consolidates lesson-response validation and retries across autoplay, Turbo Test, and PDF/EPUB collection while preserving all visual recovery paths.

## New in 2.7.2: compact popup

- Constrains the toolbar popup to a compact width and reduces unused spacing.
- Replaces the large information circles with small expandable chevrons.
- Keeps help descriptions collapsed by default and allows only one to be open at a time.
- Moves the active/paused state into a compact badge in the header.
- Removes empty reserved status rows while no course operation is running.
- Reads the startup-log version directly from the manifest so it cannot become stale.

## Fixed in 2.7.1

- Distinguishes a successful lesson response from an incomplete or missing `data` payload.
- Retries incomplete lesson data twice with bounded 750 ms and 1.5 second backoff without slowing successful API requests.
- Falls back to opening only the affected PDF chapters when their API data remains unavailable.
- Reinserts visually recovered dispense at their original section and index positions before starting the PDF builder.
- Keeps the full visual collector as the fallback when initial API access itself fails; an incomplete first lesson is recovered individually.

## New in 2.7.0: API PDF/EPUB collection

- Collects course handout links from the authenticated lesson API without opening every chapter.
- Expands only the course sections to preserve the original section, chapter-title, and index order.
- Reads the `contentType: "lesson"` metadata and prefers `peg_BookUrl`, falling back to `bookUrl`.
- Accepts only HTTPS PDF links hosted on CloudFront before passing them to the existing PDF and EPUB builders.
- Uses sequential, paced requests with the same memory-only Bearer handling introduced for API Turbo Test.
- Automatically uses the established visual collector if API access, course discovery, or every returned PDF link is unavailable.
- Keeps EPUB's targeted visual recovery for individual missing links instead of reopening every successful chapter.
- Leaves PDF merging and EPUB conversion unchanged, including indexes, bookmarks, multi-section ordering, and failure reporting.

## New in 2.6.0: API Turbo Test

- Completes pending self-assessment tests through UniPegaso's authenticated lesson API without opening every chapter or rendering the questions.
- Expands only the course sections to determine the total module count, then reads modules sequentially through the lesson endpoint.
- Identifies the terminal `contentType: "test"` item, validates `next_item_id: 0`, and submits its real `lp_item_id` and `lp_id` to `completeTestIntro`.
- Skips tests whose API percentage is already `100` and preserves the existing completed, already-green, unavailable, and failed counters.
- Captures the Bearer authorization already used by the page, keeps it only in memory, and never stores or logs it.
- Uses sequential requests, a short pacing delay, bounded timeouts, and immediate cancellation through the existing Stop control.
- Automatically returns to the established visual Turbo Test before making changes if API access or course discovery is unavailable.
- Preserves the shared PDF/EPUB/Turbo operation lock and the 2.5.1 reload-recovery behavior.

## Fixed in 2.5.1

- Detects a source course page reload while PDF, EPUB, or turbo collection is running.
- Releases the interrupted operation lock immediately instead of leaving StudyWing controls disabled for up to two hours.
- Preserves independent PDF/EPUB builder work after collection has already completed and the builder phase has started.

## New in 2.5.0: online exam commission preview

- Adds an opt-in **Controlla lo stato della commissione** preference.
- Observes the existing `exams-list-done` response without reading, saving, or reproducing the Bearer token.
- Shows the floating StudyWing launcher automatically on the online-exams page while the check is enabled.
- Displays the subject, date, vote, pass/fail result, commission status, and any rejection motivation returned by the platform.
- Creates a silent baseline on the first check, then signals newly available or changed commission information with a brief pulse and a quest-style `!` badge.
- Marks notifications as seen when the student opens the panel while keeping the captured information available.
- Keeps confirmed-exam filtering deliberately disabled until a reliable API or page discriminator is identified.

## New in 2.4.0: perimeter positioning

- Lets users drag the floating StudyWing launcher along the four edges of the browser viewport.
- Constrains the launcher to the perimeter so it cannot be left over the middle of the course content.
- Saves the selected edge and normalized position, preserving the placement across course visits and window sizes.
- Opens the floating panel inward from the selected edge and clamps it inside the visible viewport.
- Keeps ordinary clicks distinct from drag gestures and supports both mouse and touch pointers.

## New in 2.3.0: optional floating course menu

- Adds an opt-in **Mostra il menu fluttuante nella pagina** preference, disabled by default.
- Shows a compact StudyWing wing button only on the top-level course page when course content is available.
- Expands into a Shadow DOM panel isolated from the platform's styles.
- Provides synchronized controls for automatic progression, test behavior, turbo tests, PDF creation, and EPUB creation.
- Reflects active operation progress and locking in both the floating menu and toolbar popup.
- Supports outside-click and Escape-key collapsing, plus an in-menu action to hide the floating interface immediately.

## New in 2.2.0: StudyWing

- Renames the extension to **StudyWing – Assistente per Pegaso**.
- Adds the StudyWing icon and subtitle to the popup header.
- Updates the PDF and EPUB builders, generated document metadata, and diagnostic labels with the new identity.
- Extends the indigo, purple, and gold palette to the builder pages and generated EPUB styling.
- Preserves the existing Firefox extension ID for update compatibility.

## New in 2.1.2: coordinated popup palette

- Applies the icon's indigo-to-purple gradient to the primary popup actions.
- Uses a pale lavender treatment for the secondary turbo-test action.
- Adds warm-gold information controls, help-panel accents, and keyboard focus rings.
- Coordinates headings and checkboxes with the new brand colours while preserving accessible contrast and clear disabled/running states.

## New in 2.1.1: extension icon

- Adds an original wing-shaped forward-arrow icon for the browser toolbar and extension manager.
- Includes optimized PNG assets for Firefox and Chrome at 16, 32, 48, 96, and 128 pixels.

## New in 2.1.0: Italian interface and help panels

- Translates the popup, progress messages, PDF Builder, and EPUB Builder into Italian.
- Adds accessible information buttons for turbo tests, PDF creation, and EPUB creation.
- Opens one help panel at a time and supports mouse and keyboard activation.
- Explains expected processing times, safe interaction guidance, and EPUB conversion limitations.

## Fixed in 2.0.3

- Adds a second EPUB-only recovery pass for Dispensa links missed during the first traversal.
- Fully collapses and reopens each affected section to reset UniPegaso's stale Vue rendering state.
- Retries only the missing chapters and restores recovered dispense to their original course order.
- Keeps the PDF collection path unchanged.

## Fixed in 2.0.2

- Adds paced EPUB link collection so UniPegaso has time to finish each chapter render.
- Retries a chapter up to three times when its Dispensa link is delayed or temporarily missing.
- Reopens a stalled chapter between retries instead of immediately marking its Dispensa as unavailable.
- Recovers section changes by retrying the complete section header when UniPegaso ignores the first click.
- Keeps the already stable PDF collection path unchanged.

## Fixed in 2.0.1

- Rewrites the EPUB Builder storage callbacks in an explicit Firefox-compatible form.
- Fixes the syntax error that prevented the EPUB conversion from starting and left the progress bar at **Loading collected chapters…**.

## New in 2.0.0: adaptive course EPUB

- Adds **Create complete course EPUB** alongside the existing complete-course PDF action.
- Reuses the original chapter Dispensa links instead of converting the already merged PDF.
- Converts ordinary text pages to selectable, reflowable XHTML that adapts to phones, tablets, and e-readers.
- Preserves formulas, tables, slides, diagrams, rotated text, and other complex layouts as responsive visual blocks.
- Produces a standard EPUB 3 archive with navigation, an NCX compatibility index, and one chapter document per Dispensa.
- Downloads and converts everything locally in the browser; course documents are not uploaded.
- Reports individual missing or failed dispense and continues when at least one chapter can be converted.
- Uses a shared operation lock: PDF creation, EPUB creation, and turbo tests cannot overlap. Closing the source or builder tab safely releases the lock.

### Create a complete course EPUB

1. Open the UniPegaso page containing **Contenuti del Corso**.
2. Open the extension toolbar popup.
3. Click **Create complete course EPUB**.
4. Keep both the course tab and the EPUB Builder tab open until the automatic download begins.
5. Import the downloaded `.epub` into your preferred reader.

The EPUB Builder reports both the current dispensa and PDF page. You can cancel safely while downloading or converting; final archive packaging is intentionally allowed to finish once it starts.

Visual fallback pages remain responsive, but their text is intentionally not reflowed: this protects mathematical notation and complex tables from destructive conversion.

## Fixed in 1.9.1

- Prevents turbo mode from selecting answer groups left behind by the previously completed test while UniPegaso renders the next test.
- Considers only visible answer groups belonging to the fresh test render and waits for their count and content to stabilize.
- Verifies that answer A receives UniPegaso's selected state for every question instead of assuming that each click was registered.
- Retries an individual answer up to three times when Vue misses or replaces a click during rendering.
- Looks for visible **Invia** and **Ripeti** controls so hidden controls from a previous test cannot be mistaken for the current test state.
- Adds a short settling delay after the test becomes green before turbo mode opens the following chapter.
- Stops the current test safely when a fresh render or a verified selection cannot be confirmed.

## New in 1.9.0: turbo tests

- Adds **Complete all pending tests** to the toolbar popup.
- Traverses every course section and chapter in page order without playing or opening videos.
- Skips tests whose own test icon is already green.
- Opens each available pending test, selects answer A for every question, submits it, waits for **Ripeti**, and confirms that UniPegaso registers the test as green.
- Reports chapters whose tests are unavailable and continues after isolated chapter or test failures.
- Displays live section, chapter, and completion counts both in the popup and on the course page.
- Reopening the popup shows the current run and provides **Stop turbo tests**.
- Cancellation stops after the current safe step; it never interrupts a submission after **Invia** has been clicked.
- Turbo tests temporarily suspend normal video progression and cannot run at the same time as PDF or EPUB creation.
- The batch workflow does not change the saved **Automatically complete pending tests** preference.
- The batch workflow does not use page-reload recovery. A chapter that fails to render is reported and skipped safely.

### Complete every available pending test

1. Open the UniPegaso page containing **Contenuti del Corso**.
2. Open the extension toolbar popup.
3. Click **Complete all pending tests**.
4. Keep the course tab open while the extension checks every chapter.
5. Follow the live progress message on the course page or reopen the popup at any time.
6. To cancel, reopen the popup and click **Stop turbo tests**.

Tests that do not expose an **Esegui** button are counted as unavailable and left untouched. Completed green tests are never repeated.

## Fixed in 1.8.2

- Waits 5 seconds after opening a chapter's **Obiettivi** before selecting its first unfinished video.
- Prevents UniPegaso from treating the Obiettivi-to-video handoff as two overlapping lesson sessions and displaying the "only one lesson at a time" warning.

## Fixed in 1.8.1

- Advances when either the sidebar reports **100%** or the video player has genuinely reached its full duration, regardless of video length.
- Waits 5 seconds after confirmed completion before navigating, giving UniPegaso time to close the current playback session and avoiding the "only one lesson at a time" warning.

## New in 1.8.0: multi-section courses

- Supports courses divided into multiple accordion sections, such as **Analisi Matematica I**, **Analisi Matematica II**, and **Esercitazioni**.
- Treats ordinary one-section courses (for example, **Lezioni**) through the same section-aware navigation layer.
- Identifies chapters by both section and title, so numbering can safely restart from `1` in every section.
- At the end of a section, automatically opens the next section and continues from its first chapter.
- Applies completed-video skipping, pending-test detection, optional test completion, and guarded reload recovery across section boundaries.
- The complete-course PDF collector opens every section in page order, then collects every chapter's Dispensa in section/chapter order.
- Multi-section PDF index entries and bookmarks include the section name so chapters with repeated numbers remain distinguishable.

## New in 1.7.0: complete course PDF

- Adds **Create complete course PDF** to the toolbar popup.
- Opens every course chapter in numeric order and collects its single **Dispensa** link.
- Downloads the dispense directly from UniPegaso's CloudFront PDF links and merges them locally in the browser.
- Adds one or more index pages at the start of the merged document.
- Every index entry is an internal PDF link that jumps to the first page of that chapter.
- Adds the same chapter list as PDF bookmarks for viewers that display an outline/sidebar.
- Uses the UniPegaso course title for the PDF metadata and generated filename.
- Displays collection progress on the course page and download/merge progress in a dedicated builder tab.
- Skips missing or failed documents and reports them in the builder instead of aborting the whole course, unless no PDF can be merged.
- Does not upload course documents: collection, merging, indexing, and download happen locally in the browser.

### Create a complete course PDF

1. Open the UniPegaso page containing **Contenuti del Corso**.
2. Open the extension toolbar popup.
3. Click **Create complete course PDF**.
4. Leave the course tab open while the extension expands the chapters and collects their Dispensa links.
5. A PDF Builder tab opens automatically and processes the collected documents.
6. The merged PDF downloads automatically when ready. The builder also provides **Download PDF again** while that tab remains open.

The time and memory required depend on the number and size of the original PDF files. Keep the PDF Builder tab open until processing finishes.

### PDF access permission

Course PDFs use different CloudFront subdomains. Version 1.7.0 therefore requests access to:

```text
https://*.cloudfront.net/*
```

This permission is used only by the extension's PDF Builder page to retrieve the Dispensa URLs collected from the current course.

## Fixed in 1.6.1

- Fixes a false positive that could classify a red pending test as green when another nested course element contained a green progress class.
- Completion is now determined exclusively from the test icon's own `path#test` fill: `#CF1D56` is pending and `#2FA33D` is completed.
- Test-row detection now requires the icon's nearest `div.border-t` to be the selected row, avoiding broader nested course containers.

## New in 1.6.0

- Adds a persistent **Automatically complete pending tests** option, disabled by default.
- Pending tests are identified by their red test icon; tests whose icon is already green are never repeated.
- When enabled, the extension opens a pending end-of-lesson test, selects answer A for every question, submits it, waits for **Ripeti**, confirms that the test becomes green, and then continues to the next chapter.
- If questions, **Invia**, **Ripeti**, or the green completion state cannot be confirmed, progression stops safely.
- Automatic completion takes priority over **Stop at end-of-lesson tests** only while the automatic-completion option is enabled.

## Previous reliability improvements

- Improves the guarded chapter-recovery flow introduced in v1.5.2.
- After an automatic recovery reload, the extension now waits for UniPegaso's course page to initialize before trying to open the next chapter.
- Adds a minimum 3-second recovery initialization delay and requires the chapter structure to remain stable for 1.5 seconds before continuing.
- Prevents the initial persisted settings synchronization from being treated as a user action. In particular, a saved **Stop at end-of-lesson tests = OFF** setting no longer triggers a false resume attempt immediately after page load.
- Keeps the single automatic recovery reload limit so a persistent UniPegaso rendering problem cannot create an infinite reload loop.

## Existing features

- Automatically advances to the next video after the current lesson is genuinely completed.
- Accepts either UniPegaso's 100% status or a genuinely ended video, then allows a 5-second session-cleanup delay before navigating.
- Automatically opens the next chapter and its **Obiettivi** section when needed.
- Skips videos and chapters already completed at 100%.
- Persistent **Automatic progression** Running / Paused toggle.
- If a video finishes while the extension is paused, enabling automatic progression again resumes navigation automatically.
- Persistent **Stop at end-of-lesson tests** option when automatic test completion is disabled:
  - **ON (default):** when an end-of-lesson test is reached, automatic navigation stops and leaves the test to the student.
  - **OFF:** the test is left untouched and the extension continues to the next chapter.
- If the extension is stopped at an end-of-lesson test and the user switches **Stop at end-of-lesson tests** from ON to OFF, automatic progression resumes.
- Does not call the raw HTML5 `video.play()` method; playback is left to UniPegaso's own player/UI.
- If a chapter opens but UniPegaso fails to render its lesson rows, the extension performs one guarded page reload and automatically retries the interrupted chapter transition.

Automatic test completion is opt-in and disabled by default.

## Included third-party libraries

- [pdf-lib](https://pdf-lib.js.org/) 1.17.1 is bundled locally under the MIT License for PDF loading, page copying, metadata, and document generation.
- [PDF.js](https://mozilla.github.io/pdf.js/) 5.6.205 is bundled locally under the Apache License 2.0 for text extraction and faithful visual rendering during EPUB creation.
- [JSZip](https://stuk.github.io/jszip/) 3.10.1 is bundled locally under the MIT License for standards-compliant EPUB packaging.
- No remotely hosted JavaScript is executed.

## Install in Firefox

1. Extract the extension ZIP.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**.
4. Select `manifest.json`.

## Install in Chrome

1. Extract the extension ZIP.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted extension folder.

## Install in Microsoft Edge

1. Extract the extension ZIP.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted extension folder containing `manifest.json`.

Use the toolbar popup to pause/resume automatic progression, control or batch-complete pending end-of-lesson tests, or create a complete indexed PDF or adaptive EPUB from the course dispense.
