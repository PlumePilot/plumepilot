# PlumePilot — Changelog

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

## Improved in 2.25.2: contextual Objective animation and broader pixel typography

- Moves the reviewed arrow-and-target scene from the floating launcher to the left side of **Completa tutti gli Obiettivi** in both the popup and floating menu.
- Starts the scene only after a genuine Objective-completion start is accepted; stop, disabled and rejected actions do not animate.
- Keeps the 96×32 artwork at native pixel scale, reserves a responsive label area and exposes reusable Gaming action-art classes for the future test and collection sprites.
- Expands Pixelify Sans across Gaming navigation, headings, compact settings and action labels while keeping long descriptions, detailed statuses, exam content and notifications in the system font.
- Preserves reduced-motion behavior, Standard styling and every underlying automation command unchanged.

## New in 2.25.1: Gaming launcher arrow scene and pixel typography

- Initially introduced the reviewed 11-frame, 96×32 pixel arrow-and-target scene; its final contextual placement is corrected in `2.25.2`.
- Plays the scene at its authored 12 FPS cadence, briefly holds the impact frame, and automatically mirrors it toward the viewport interior.
- Keeps panel opening immediate, ignores launcher drags, and disables the decorative sequence when reduced motion is requested.
- Bundles a compact local subset of Pixelify Sans under the SIL Open Font License and applies it only to short Gaming headings, values and controls.
- Adds about 47 KB of uncompressed local assets before ZIP compression and makes no network request at runtime.

## New in 2.25.0: first Gaming visual-style increment

- Adds a persistent **Standard / Gaming** visual-style preference, independent from **System / Light / Dark** colour themes and defaulting safely to Standard.
- Introduces normalized, compact pixel-art assets for the StudyWing mascot and modular EXP-style progress frame.
- Uses a sunglasses mascot with a light daytime launcher and a candle mascot with a dark nighttime launcher.
- Animates the mascot's five-frame idle sequence once on hover and at randomized 25–45 second intervals only while the Gaming launcher is visible and motion is allowed.
- Replaces the popup and floating-menu progress-card treatment with a responsive pixel frame, decorative tiled fill and ten logical CSS notches while preserving the exact percentage and 70% marker.
- Gives the optional edge overlay the same ten-notch Gaming treatment without altering its horizontal/vertical progress logic.
- Keeps all automation, progress mathematics, operation coordination and Pegaso-owned pages unchanged.
- Leaves the planned arrow-flight/target choreography and optional pixel font for the following reviewed asset increment.

## Improved in 2.24.3: responsive floating launcher

- Scales the floating launcher to `42px`, `46px`, and `50px` with the small, medium, and large menu preferences.
- Scales the commission exclamation badge proportionally to `20px`, `23px`, and `26px`, including its text and spacing.
- Recalculates drag boundaries and edge anchoring whenever the launcher size or browser viewport changes.
- Preserves the saved relative position along the selected edge while keeping the launcher and protruding badge inside an `18px` safety margin.
- Repositions an open floating panel immediately after a size change.

## Improved in 2.24.2: consistent readable-text scaling

- Audits dynamic and long-form text in both the popup and floating menu.
- Scales exam titles through `11px`, `12px`, and `13px` for small, medium, and large menus.
- Scales exam metadata, commission verdicts, loaded-outcome headings, empty states, progress messages, and submenu labels through `10px`, `11px`, and `12px`.
- Normalizes expanded information, setting hints, and action-status messages through `11px`, `12px`, and `13px` in the popup.
- Keeps badges, counters, timestamps, chevrons, and other compact interface labels fixed.

## Fixed in 2.24.1: equal-width floating tabs

- Makes the floating-menu tab bar use all available horizontal space.
- Gives one visible tab the full width, two tabs equal halves, and three tabs equal thirds.
- Removes the empty third column that appeared when the course tab was unavailable on commission-only pages.

## New in 2.24.0: floating-menu preferences

- Adds a third **Preferenze** tab to the floating menu.
- Lets users change the shared StudyWing theme, menu size, and playback-error recovery behavior without opening the extension popup.
- Applies theme and size changes immediately and keeps all controls synchronized through the existing stored preferences.
- Supports mouse and keyboard navigation across the three floating-menu tabs.
- Keeps the existing hide-menu action and the popup-only Information section unchanged.

## Improved in 2.23.6: readable message scaling

- Scales long-form messages with the selected menu size instead of changing only the available width.
- Uses `10px`, `11px`, and `12px` for small, medium, and large commission motivations and empty-state messages in the popup.
- Applies the same scale to commission explanations, rejection motivations, operation status text, and the last StudyWing notification in the floating menu.
- Collapses long rejection motivations to three lines and lets users expand or reduce them with a click or keyboard action.
- Leaves badges, counters, timestamps, and other compact decorative labels unchanged.

## Improved in 2.23.5: loaded exam outcomes

- Keeps every exam whose result is not yet `CARICATO-*` in the primary commission list, regardless of whether the commission is pending, accepted, or rejected.
- Moves every `CARICATO-*` exam into the **Esiti caricati** submenu, independently from the commission verdict.
- Separates loaded outcomes into **Superati**, **Non superati**, and a fallback group for future unknown result suffixes.
- Preserves the commission verdict and rejection motivation on every loaded-result card.
- Treats a transition to `CARICATO-*` as a significant notification even if the commission is still pending.

## Improved in 2.23.4: clearer commission notification indicator

- Moves the floating-menu exclamation badge slightly inward so it remains fully visible near viewport edges.
- Makes the commission alert vibration easier to notice.
- Replays the vibration when an unread exam changes state, even if that exam was already marked as unread.
- Continues to honor the operating system's reduced-motion accessibility preference.

## Fixed in 2.23.3: structured commission rejection details

- Reads `reject_motivation.motivation` when Pegaso returns the rejection reason as an object, while preserving compatibility with the earlier plain-string shape.
- Recognizes `commission: Non accettato` as a rejected commission verdict and keeps rejection precedence over conflicting vote/result fields.
- Keeps `DAVERBALIZZARE-*` records in the primary list and distinguishes their result as pending verbalization in both StudyWing menus.

## Improved in 2.23.2: popup project information

- Added the developer's name, the project's personal origin and its intended student audience to the expandable StudyWing information panel.
- Preserved the independence and local-data notices in the same compact popup section.

## Fixed in 2.23.1: preference layout and information controls

- Restored the compact arrow-only information controls throughout the popup and floating menu.
- Changed only the final StudyWing information entry into a conventional underlined link.
- Prevented the Preferences tab scrollbar from reducing the popup's effective width and clipping its right edge.

## New in 2.23.0: menu size and readability

- Added **Piccolo**, **Medio** and **Grande** menu sizes under **Preferenze → Interfaccia**.
- The preference applies immediately to both the toolbar popup and floating menu.
- Increased the minimum size of secondary text.
- Added a stable right-side gutter and horizontal overflow protection to prevent the popup edge from being clipped by its scrollbar.

## Improved in 2.22.7: expandable in-page notifications

- Limits compact bottom-right notifications to three lines and hides overflowing text.
- Shows **Mostra altro** only when the message is actually truncated.
- Expands or collapses long messages by clicking the notification or its explicit control.
- Pauses automatic fading while a notification is expanded and restarts the full timer after it is collapsed.
- Preserves expansion across progress updates belonging to the same running operation, while new terminal notifications start collapsed.
- Keeps the close button independent from expansion.

## Improved in 2.22.6: persistent last message and gradual fade

- Keeps **Ultimo messaggio** in extension storage until the user removes it or a newer terminal message replaces it.
- Restores the latest message after StudyWing or Pegaso reloads the page, including guarded automatic playback recovery.
- Extends the opacity transition from 650 ms to 2.5 seconds so the disappearance is clearly gradual without increasing the time before fading begins.
- Keeps hover recovery active throughout the longer fade and restarts the full visibility timer when the pointer leaves.

## New in 2.22.5: manageable in-page notifications

- Unifies StudyWing's bottom-right progress, completion, warning and error messages.
- Adds an explicit close button to every StudyWing notification.
- Fades terminal messages automatically; hovering pauses the timer and restarts it after the pointer leaves.
- Keeps a progress notification hidden for the remainder of its operation without interrupting the operation itself.
- Shows the terminal result as a new notification even when the operation's progress was hidden.
- Keeps the latest terminal message in the floating menu with two-line truncation, click-to-expand behavior and explicit permanent removal.
- Routes the optional 70% course milestone through the same notification behavior.

## Fixed in 2.22.4: test-collection status message lifetime

- Removes the successful test-collection message five seconds after opening the export builder, matching PDF/EPUB collection behavior.
- Removes cancellation notices after five seconds and error notices after fifteen seconds.
- Protects a newer export status from being removed by an older message's delayed timer.

## Improved in 2.22.3: visible chapter score in offline quizzes

- Shows the verified chapter result beside **Ricomincia capitolo** as `Risultato capitolo: corrette / domande`.
- Restores the visible result when returning to an already verified chapter.
- Clears the chapter result together with the answers when **Ricomincia capitolo** is used.
- Keeps the existing aggregate verified-answer score in the chapter sidebar.

## Fixed in 2.22.2: progress in courses with repeated chapter numbers

- Identifies detailed chapter snapshots through the unique `lp_id` and paragraph `id` route instead of `display_order` alone.
- Prevents chapters in different sections with the same visible number from overwriting one another in the live-progress model.
- Requires the complete, unique master-index identity set before replacing Pegaso's DOM percentage with an exact local calculation.
- Rejects a local full-course result that would make the authoritative percentage already shown by Pegaso go backwards.
- Matches visual chapters to master-index routes by chapter title before falling back to visible order, preserving batch collection across sections that restart their numbering.

## Fixed in 2.22.1: image-based test questions

- Recognizes sanitized image references embedded in question or answer HTML without executing arbitrary response markup.
- Decodes HTML entities in question metadata, such as `Continuit&#224;` → `Continuità`.
- Downloads only supported JPEG/PNG assets from the observed Pegaso S3 host or an already-supported CloudFront host.
- Validates image signatures instead of trusting the S3 `application/octet-stream` response type.
- Embeds question images directly into the navigable PDF and as data URLs inside the standalone HTML quiz, keeping both outputs self-contained.
- Reuses each downloaded image across both output formats while the builder remains open.
- Keeps the surrounding question available with an explicit placeholder when one image cannot be downloaded.

## New in 2.22.0: exportable self-assessment test collection

- Adds **Crea raccolta test del corso** under **Attività**, after the existing batch test and Obiettivi actions.
- Reads every available terminal self-assessment test through Pegaso's authenticated API without completing or altering it.
- Reuses the session lesson cache and preserves visible section/chapter order while keeping `id`, `lp_item_id`, `lp_id` and `testImported` semantically distinct.
- Opens one builder from which the student can download both a Unicode PDF and a standalone offline HTML quiz without repeating collection.
- Creates a navigable PDF with separate **Domande** and **Soluzioni** bookmark trees, end-of-file solutions, and bidirectional chapter links.
- Embeds subsetted Liberation Sans fonts so accents, Greek letters and mathematical symbols remain available.
- Creates a responsive HTML quiz with chapter navigation, optional question/answer shuffling, answer checking, scoring, solution display and reset.
- Keeps collection cancellable, session-cached and mutually exclusive with the existing long-running StudyWing operations.
- Reports unavailable/empty tests without discarding successfully collected chapters.

## Improved in 2.21.2: compact autoplay hierarchy in the popup

- Keeps only the master **Avanzamento automatico** switch immediately visible in the popup's Autoplay card.
- Groups first-incomplete search, test behavior, and session limits inside a collapsed **Opzioni autoplay** submenu.
- Places the session-limit toggle, stepper, progress, resume action, and explanation inside a nested **Limite sessione autoplay** submenu.
- Shows the selected test behavior and active limit in the outer summary.
- Shows the limit state and current chapter count in the nested summary without requiring either submenu to remain open.

## Improved in 2.21.1: compact progress controls

- Groups the on-screen bar, position, and 70% advice settings inside a collapsed **Opzioni progresso** submenu.
- Applies the same compact layout to the popup and floating **Corso** interfaces.
- Keeps the current configuration visible in the submenu summary, such as **Barra sotto · avviso 70%**.
- Leaves the live percentage, progress bar, and optional 70% marker immediately visible without opening the submenu.

## New in 2.21.0: on-screen progress and the 70% milestone

- Adds an optional course-progress overlay that remains available even when the floating menu is disabled.
- Lets the user place the thin progress bar at the top, bottom, left, or right edge of the lesson page.
- Mirrors the overlay and position controls in the **Corso** tab of both the popup and floating menu.
- Adds an independent **Avvisami al raggiungimento del 70%** setting for the exam-booking milestone.
- Shows a visible 70% marker in the Corso progress cards and, when enabled, in the on-screen bar.
- Displays a StudyWing in-page message when a course reaches 70%, without using browser notifications.
- Coordinates the milestone across tabs and records it once per course so reloads and other open tabs do not repeat the message.
- Silently records the milestone when the advice is enabled on a course that is already at or above 70%.

## New in 2.20.0: live course progress

- Adds a live course-progress card at the top of **Corso** in both the popup and floating menu.
- Starts from the percentage already rendered by Pegaso, without scanning every detailed chapter API at startup.
- Reuses complete chapter responses that Pegaso or StudyWing already obtained and gives every chapter equal weight; within each chapter, Obiettivi, videos, and tests share the weight equally while the handout is excluded.
- Tracks only increases observed after a complete chapter snapshot, preventing first-seen completed activities from being counted twice.
- Keeps fractional progress internally and updates the visible integer only when the next whole percentage is reached, matching Pegaso's truncation behavior.
- Upgrades to an exact full-course calculation when a batch operation has collected complete data for every chapter.
- Keeps progress course-scoped and session-local, then rebases from Pegaso's displayed percentage after a page reload.

## Fixed in 2.19.3: course-scoped limit status and completed Obiettivi

- Keeps autoplay-limit availability and progress scoped to the current course instead of sharing one last-writer status across all Pegaso tabs.
- Lets the floating menu request and receive limit status directly from its own lesson page, while retaining per-course stored status as a fallback.
- Prevents another open course tab or a previous course route from disabling an already loaded course's limit controls.
- Skips **Obiettivi** whenever detailed API data reports them at 100%, even when every video in the chapter is still at 0%.
- Preserves the cautious visual fallback when detailed API data is unavailable or incomplete, and still opens genuinely pending Obiettivi.

## Fixed in 2.19.2: detailed API routing across non-consecutive course IDs

- Keeps `display_order` as the visible chapter and cache identity.
- Builds detailed lesson requests from the same master-index row using `lp_id` for `video-lesson/{lp_id}` and `id` for `paragraphs/{id}`.
- Prevents a gap in Pegaso's internal IDs from pairing one visible chapter with the preceding chapter's API response and skipping unfinished work.
- Applies the corrected route consistently to autoplay discovery, automatic test checks, Turbo Test, batch Obiettivi, and PDF/EPUB material collection.
- Retains `previous_item_id` and `next_item_id` in normalized playback metadata for correct within-chapter activity diagnostics; cross-chapter selection remains driven by the master index.

## Fixed in 2.19.1: one count per chapter

- Uses the stable visible lesson number as the session counter identity instead of Pegaso's mutable rendered chapter label.
- Prevents multiple unfinished videos in the same chapter from consuming multiple chapter slots when Pegaso refreshes its progress UI between videos.

## New in 2.19.0: bounded autoplay sessions

- Adds an optional per-course autoplay chapter limit under **Corso**, disabled by default.
- Calculates the selectable maximum as half of the course, rounded down to the nearest multiple of five (with exact values below five).
- Counts a chapter only after StudyWing finishes its last video and any enabled automatic terminal-test completion.
- Preserves progress across pauses and page reloads, and stops before opening the following chapter.
- Requires the explicit **Riprendi per altri N capitoli** action to begin another block after the limit is reached.
- Temporarily treats the saved **Fermati** test mode as **Ignora e continua** while the limit is active, without overwriting the saved preference; automatic test completion remains active when selected.
- Mirrors the setting, stepper, progress, and resume action in the popup and floating menu.

## Improved in 2.18.8: commission notifications on the Pegaso home page

- Shows the floating launcher on recognized logged-in Pegaso home/dashboard routes whenever commission monitoring is enabled.
- Exposes only the **Esami** tab on the home page, matching the commission-only behavior of `/exam-online`; course actions remain unavailable.
- Keeps the launcher closed and unobtrusive while making new commission badges and animation visible immediately after login.
- Does not show the launcher on login forms or unrelated Pegaso pages.
- Reacts to history/hash route changes without issuing additional commission API requests.

## Improved in 2.18.7: tabbed floating menu

- Splits the floating menu into compact **Corso** and **Esami** tabs so exam cards no longer extend the course controls vertically.
- Keeps **Corso** as the default tab on lesson pages and shows the unread commission count directly on **Esami**.
- Opens only **Esami** on the online-exams page and makes course actions unavailable there.
- Clears internal commission notifications only when the user actually opens the **Esami** tab, rather than when the floating menu opens on **Corso**.
- Supports mouse and keyboard tab navigation and keeps the single available tab full width.

## Fixed in 2.18.6: use the API's loaded result as the confirmation discriminator

- Uses the combination `commission: Accettato` plus `result: CARICATO-*` for the collapsed **Accettati e confermati** submenu.
- Keeps an accepted exam with a missing result in the primary list until the API reports that its outcome has been loaded.
- No longer depends on the unavailable `CONFERMATO-*` result value.

## Fixed in 2.18.5: accepted exams remain visible until student confirmation

- Keeps `commission: Accettato` exams in the primary list while their result is still `CARICATO-*`, so the commission decision remains immediately visible.
- Moves an exam into the collapsed **Accettati e confermati** submenu only when `commission` is accepted and `result` begins with `CONFERMATO-` at the same time.
- Keeps rejected and unknown states visible because they may still require attention.

## Fixed in 2.18.4: accepted exams are grouped with confirmed exams

- Keeps only pending, rejected, and unknown commission records in the primary list.
- Moves both `commission: Accettato` records and `result: CONFERMATO-*` records into the collapsed **Accettati o confermati** submenu.
- Applies the same grouping in the popup and floating menu, regardless of whether the accepted exam was passed or failed.

## Improved in 2.18.3: clearer commission lists and complete cache deletion

- Keeps pending, accepted-but-not-confirmed, rejected, and unknown commission records visible in the main list.
- Moves every `CONFERMATO-*` record into a collapsed **Esami già confermati** submenu in both the popup and floating menu.
- Shows the confirmed-exam count on the submenu and preserves unread highlighting when applicable.
- Sorts both the active and confirmed groups with unread changes first and then by most recent exam date.
- Extends **Cancella dati degli esami** to invalidate the temporary exam-response cache in every open Pegaso tab before deleting the persistent snapshots.
- Forces the next enabled commission check to use a newly captured or newly requested API response instead of repopulating storage from stale page memory.
- Keeps the authenticated Bearer value in page memory only; clearing exam data neither persists nor exposes it.

## Improved in 2.18.2: automatic commission checks

- Checks the online-exam commission endpoint when a visible Pegaso page opens and the stored result is older than ten minutes.
- Repeats the check every ten minutes while at least one Pegaso tab remains visible and checks again when a stale tab returns to the foreground.
- Coordinates visible Pegaso tabs through a short-lived browser-local lease so only one tab performs a due request.
- Reuses a fresh online-exams response already produced by Pegaso instead of issuing a duplicate request.
- Waits for the page to expose its authenticated API session in memory before making a StudyWing request.
- Keeps the Bearer authorization header only in the page-world interceptor's memory and never writes it to extension storage or sends it through StudyWing messages.
- Cancels a pending or active commission request when monitoring is disabled and bounds requests with the existing API timeout.
- Clears an expired or rejected in-memory authorization value and waits for fresh authenticated Pegaso traffic before retrying.
- Keeps all notifications inside StudyWing and adds no browser notification permission.

## Improved in 2.18.1: commission states and internal notifications

- Classifies online exams as **In attesa**, **Accettato**, **Rifiutato**, **Confermato**, or **Da verificare** by combining `commission`, `result`, and `reject_motivation` instead of relying on one API field.
- Hides records whose result begins with `CONFERMATO-`, while keeping a confirmed record temporarily visible if it still has an unread earlier update.
- Treats a non-empty rejection motivation or an explicit rejection label as rejected and leaves unknown future states visible without guessing their meaning.
- Compares normalized commission state, result, rejection motivation, vote, and status to detect meaningful changes.
- Avoids alerts for the first baseline, newly observed pending exams, and transitions to `CONFERMATO-*`.
- Migrates the preliminary v2.18.0 commission snapshots without marking unchanged records as new.
- Adds the stored commission details and unread-update badge to the popup's **Attività** tab.
- Shows commission details in the floating menu on course pages as well as the online-exams page.
- Keeps notifications entirely inside StudyWing and does not store authentication tokens, cookies, or authorization headers.
- Does not yet add autonomous periodic checks; v2.18.1 still updates commission data when Pegaso's online-exams response is captured.

## New in 2.18.0: light, dark, and system themes

- Adds **Tema** under **Preferenze → Interfaccia** with **Sistema**, **Chiaro**, and **Scuro** choices.
- Uses **Sistema** by default and follows the browser or operating-system color preference, including changes made while StudyWing is open.
- Applies the selected theme to the popup, floating menu, PDF builder, and EPUB builder.
- Keeps Pegaso pages and dialogs unchanged: the theme affects only StudyWing's own interface.
- Preserves the existing light palette and introduces a deep-plum dark palette with accessible purple and gold accents.

## New in 2.17.0: configurable recovery for known playback errors

- Adds **Errori di riproduzione** under **Preferenze → Comportamento** with two mutually exclusive choices.
- Keeps **Tenta il ripristino automatico** as the default, preserving the one-time recovery behavior from v2.16.2.
- Adds **Lascia aperto l’avviso** for users who prefer to confirm recognized UniPegaso playback dialogs manually.
- Applies the preference only to the known session-conflict and viewing-validation messages; unrelated Pegaso dialogs remain untouched.
- Keeps the two recovery guards independent and always leaves a repeated protected error visible to prevent reload loops.
- Rechecks the preference immediately before the delayed automatic confirmation, so changing to manual mode cannot leave a pending StudyWing click behind.

## Redesigned in 2.16.2: popup organization with tabs

- Organizes the toolbar popup into three user-facing areas: **Corso**, **Attività**, and **Preferenze**.
- Keeps autoplay, the first-incomplete bookmark, test-boundary behavior, and PDF/EPUB creation together under **Corso**.
- Groups batch test completion, batch Obiettivi completion, and online-exam commission tools under **Attività**.
- Moves the floating-menu preference and extension information under **Preferenze**.
- Shows a compact global operation notice while a long-running task is active and opens the relevant tab when selected.
- Preserves the existing settings, control IDs, defaults, operation lock, cancellation flows, and course automation behavior.

## Fixed in 2.16.1: Turbo Test cache handoff after long Obiettivi batches

- Lets batch operations reuse the complete session lesson snapshot even when a large preceding batch took longer than the normal five-minute mutable-data freshness window.
- Prevents Turbo Test from repeating detailed GET requests for chapters already read by **Completa tutti gli Obiettivi**.
- Treats `LESSON_DATA_INCOMPLETE` as an individual module failure and continues in API mode instead of opening every chapter through the visual fallback.
- Keeps the full visual fallback only for a genuinely unavailable authenticated API path, such as `AUTH_UNAVAILABLE`, or when the course outline itself cannot be obtained.
- Preserves the five-minute refresh rule for normal playback/discovery consumers, where stale incomplete percentages could otherwise affect navigation decisions.

## New in 2.16.0: batch completion of Obiettivi and shared lesson cache

- Adds **Completa tutti gli Obiettivi** to the popup and floating menu, with safe cancellation and a final per-course summary.
- Completes only pending `intro` items through Pegaso's authenticated `completeTestIntro` endpoint and never repeats an Obiettivo already confirmed at `100%` in the session cache.
- Keeps this batch API-only: individual failures are reported and the scan continues without opening every chapter or shortening the protected Obiettivi delay used by normal autoplay.
- Expands the session-only lesson cache so one detailed module response can be reused for Obiettivi, videos, the terminal test, and a valid Dispensa link.
- Keeps confirmed completions and valid material links reusable for the page session, while refreshing incomplete mutable activity data after five minutes.
- Preserves the dedicated material cache for export order, section metadata, retry state, cancellation recovery, and builder-failure invalidation.
- Uses the master index to map every visible `display_order` to its real `lp_id` in the Obiettivi batch, Turbo Test, and API material collection, falling back to the visible number only when no valid real ID is available.
- Invalidates the cached master completion index after a batch changes activities, preventing the first-incomplete bookmark from reusing a stale percentage snapshot.
- Treats Obiettivi completion as a globally coordinated long-running operation, mutually exclusive with Turbo Test, PDF, and EPUB generation and safely released after a course-page reload.

## Changed in 2.15.3: master-index-first bookmark discovery

- Uses the master course index as the authoritative source for the bookmark action.
- Selects the first entry whose `percentage` is below 100 and maps it directly to the visible chapter through `display_order`.
- Opens that exact chapter for visual inspection of Obiettivi, videos, and tests according to the selected preferences.
- Avoids detailed lesson calls when choosing the bookmark target, while retaining them as a fallback if the master index is incomplete.
- Reuses the selected entry's `lp_id` only when detailed test metadata is needed for automatic test completion.
- Logs `display_order`, `lp_id`, percentage, API title, visible chapter, and title-match status for diagnostics.

## Fixed in 2.15.2: non-consecutive Pegaso lesson IDs

- Maps each visible chapter through both `display_order` and its real `lp_id` from the course index.
- Builds detailed lesson requests as `video-lesson/{lp_id}/paragraphs/{display_order}` instead of assuming both numbers are identical.
- Prevents an incomplete chapter from being misread as the adjacent chapter when Pegaso's internal IDs contain gaps.

## Fixed in 2.15.1: direct verification of the first incomplete candidate

- When a below-100% module lacks test metadata, opens that exact module directly for visual verification.
- Prevents the generic fallback from restarting discovery at chapter 1 and reopening completed chapters.
- If visual verification finds the candidate complete, continues from the following module without rescanning earlier chapters.

## Redesigned in 2.15.0: first-incomplete activity bookmark

- Replaces the persistent **Inizia dalla prima attività incompleta** checkbox with a one-shot **Trova prima attività incompleta** button in both StudyWing menus.
- Leaves Pegaso's normal last-watched-video restoration untouched on page load and when autoplay is enabled.
- Searches from the beginning of the course only after the user presses the bookmark button.
- Reuses the course completion index to skip 100% modules and verifies only incomplete candidates.
- Applies the selected test behavior during bookmark discovery: ignore pending tests, stop at them, or complete them automatically.
- Opens the first incomplete Obiettivi/video without calling `video.play()` or simulating Pegaso's Play control.
- Removes the discovery message immediately after the target video is selected.
- Prevents duplicate bookmark searches and blocks the action while another StudyWing course operation is active.
- Removes the obsolete stored `startFromFirstIncomplete` preference during the update.

## Fixed in 2.14.9: API-confirmed test targets during smart resume

- Treats an API-confirmed pending test as a test target rather than continuing into visual video discovery.
- Completes test-only targets directly through the authenticated API without opening their chapters.
- Opens only the selected chapter if direct test completion needs the existing visual fallback.
- Continues discovery from the following module after a successful automatic test completion.
- Ignores transient lesson rows without a title so they cannot be misclassified as 0% videos.

## Fixed in 2.14.8: Pegaso Play-control fallback and notice cleanup

- If the browser rejects direct playback, StudyWing tries the visible Play control in the active Pegaso player.
- Verifies that the selected video actually started before considering the fallback successful.
- Keeps the manual Play notice only when both automatic attempts fail.
- Removes that notice immediately when the video emits `play` or `playing`, including after a manual click.

## Improved in 2.14.7: course-index-assisted incomplete activity discovery

- Captures and reuses Pegaso's page-load course completion index instead of requesting details for every already-completed module.
- Skips modules reported at 100% without an additional per-module API request.
- Verifies only below-100% candidates so pending tests can still be ignored or completed according to the user's autoplay preferences.
- Uses `display_order` rather than API IDs when mapping visible chapter numbers.
- Opens the first API-unverifiable candidate directly for visual verification, then plays the first incomplete video when autoplay is enabled.
- Falls back to the existing detailed discovery if the course completion index is unavailable.

## Fixed in 2.14.6: direct fallback to the first API-unverifiable chapter

- Treats the first chapter whose lesson endpoint remains incomplete after bounded retries as the exact visual-verification target.
- Opens that chapter directly instead of restarting visual discovery from the current chapter.
- Prevents completed chapters before the unavailable response from being requested and opened repeatedly.
- Keeps the existing two retries for transient empty responses, so a temporary platform delay can still recover without opening the chapter.
- If the visually inspected chapter is complete after all, continues forward from that chapter without rescanning earlier modules.

## Fixed in 2.14.5: first-incomplete discovery after a lesson-page reload

- Waits safely for Pegaso’s asynchronously rendered course structure instead of trying to resolve a chapter from a missing active lesson row.
- Prevents an empty initial DOM from aborting the smart-resume promise before the course finishes loading.
- Uses the stable module number in the lesson URL as a fallback when Pegaso restores the video player before marking the active sidebar row.
- Extends the startup readiness window to 30 seconds and shows a visible loading status while waiting.
- Reports a clear diagnostic and stops safely if startup discovery encounters an unexpected error.

## New in 2.14.4: smart autoplay start and grouped controls

- Adds the optional **Inizia dalla prima attività incompleta** setting, disabled by default.
- When both the option and Autoplay are active, searches from the beginning of the current chapter on lesson-page load, when Autoplay is enabled, or when the option itself is enabled.
- Uses the cached course outline and sequential lesson data to skip completed chapters and videos, open pending **Obiettivi**, and select the first video below `100%`.
- Considers pending tests during the initial search only when automatic test completion is selected; otherwise it continues looking for an incomplete video even when normal playback is configured to stop at tests.
- Cancels discovery safely when Autoplay or the new option is disabled, or when another StudyWing operation starts.
- Groups dependent Autoplay preferences in the popup and keeps their saved values visible but disabled while Autoplay is paused.
- Replaces the two mutually exclusive test switches with one explicit choice: **Ignora e continua**, **Fermati**, or **Completa automaticamente**.
- Adds a compact, smoothly expandable Autoplay-options area to the floating menu with a summary of the active choices.

## Fixed in 2.14.3: autoplay resume from a completed paused video

- Treats UniPegaso's visible `100%` lesson progress as completion when autoplay is enabled again, even if the paused HTML video player is not at its end.
- Skips later videos already registered at `100%` in the current chapter and opens the first unfinished one.
- Continues with the existing next-chapter discovery when the current chapter is complete, including opening pending **Obiettivi** before its first video.
- Leaves genuinely unfinished paused videos untouched when autoplay is enabled.

## New in 2.14.2: resumable Dispense link collection

- Caches successfully collected CloudFront Dispensa links in memory for the current course-page session.
- Shares collected links between PDF and EPUB generation and resumes after a cancelled collection.
- Retries only missing or failed chapters while preserving their original course order.
- Reuses the complete course outline during the same page session; reloading or closing the page clears both caches.
- Invalidates a cached link if the PDF/EPUB builder cannot download or process it, so the next collection requests it again.

## New in 2.14.0: cancellable material collection

- Turns the active PDF or EPUB button into an interruption control while StudyWing is collecting course-material links.
- Makes cancellation available from both the extension popup and the floating menu.
- Stops pending lesson requests, retries, visual fallback waits, and recovery passes safely before opening a builder tab.
- Restores all course controls after cancellation and confirms that no file was created.

## Fixed in 2.13.9: footnote references beside dense note sections

- Estimates the main text size from character-weighted content in the central page area instead of counting every PDF text fragment equally.
- Prevents long small-print footnote lists from making normal body text look like headings.
- Restores inline references such as `contemporanea²` and `ius³` in the supplied legal-science PDF.
- Keeps numbered footnote definitions, lists, formulas, and visual pages unchanged.
- Adds a regression case reproducing the real PDF's mixture of 11 pt body text, 7 pt references, and dense 8 pt notes.

## Fixed in 2.13.8: inline footnote references in reflowable EPUB text

- Restores small raised PDF note references as semantic EPUB `<sup>` elements instead of leaving them on separate reader lines.
- Requires the number to be smaller, raised, next to the end of a word, and surrounded by a sufficiently long prose line.
- Keeps equations, numbered lists, page counters, and the numbered footnote definitions from being mistaken for inline references.
- Styles restored references at `65%` of the surrounding text while inheriting the reader's selected color and typeface.
- Does not yet create links between a reference and its footnote definition; this release intentionally covers only the conservative first step.
- Adds regression coverage for inline note references, mathematical exponents, and numbered list items.

## Fixed in 2.13.7: source page numbers in reflowable EPUB text

- Removes isolated source-PDF page counters from reflowable EPUB text before the reader repaginates it.
- Recognizes bare Arabic or Roman counters, `Pagina`/`Page` labels, `n di/of totale`, slash totals, and counters enclosed by dashes.
- Uses the counter's original PDF margin position, so years, article numbers, quantities, and other numbers in the lesson body remain intact.
- Keeps small left-aligned footnote markers above the extreme bottom margin instead of treating every isolated number as a page counter.
- Leaves the conservative reflow and visual-page quality introduced in 2.13.6 unchanged.
- Adds regression coverage for page counters, body numbers, years, and footnote markers.

## Experimental in 2.13.6: conservative EPUB reflow

- Replaces the unsuccessful short-block pagination experiment from 2.13.5 with the stable visual block size used in 2.13.4.
- Lets genuinely linear PDF pages use reflowable EPUB text even when their extraction is split into many adjacent fragments.
- Detects real columns through repeated wide aligned gutters instead of treating ordinary fragmented lines as parallel columns.
- Reads both legacy and current PDF.js vector-path formats, keeping actual tables and diagrams visual without rejecting pages for harmless decorative paths.
- Ignores a single decorative rotated or unsupported glyph while retaining visual rendering for meaningful rotated text, damaged extraction, and complex mathematical notation.
- Removes UniPegaso's repeated copyright notice and page counter from reflowable text while keeping the main material intact.
- Keeps covers, landscape pages, and image-dominant pages as a single fitted visual image so they are not cut between reader pages.
- Preserves the existing image resolution and encoding quality for every page that remains visual.
- Adds regression coverage for fragmented prose, real columns, PDF.js vector paths, boilerplate removal, rotated text, and image-dominant covers.

## New in 2.13.4: hierarchical PDF and EPUB indexes

- Groups course materials under their original section in both generated formats while preserving section and chapter order.
- Adds bold section headings and indented clickable chapters to the PDF’s visible interactive index.
- Replaces the flat PDF bookmark list with expandable section bookmarks containing their chapter bookmarks.
- Adds the same section-to-chapter hierarchy to the EPUB 3 navigation document and the NCX compatibility index.
- Keeps section headings clickable so they open the first available chapter in that section.
- Falls back safely to the section embedded in the complete chapter label when older collection data lacks separate section metadata.
- Adds automated coverage for the visible PDF index, PDF bookmarks, EPUB navigation document, and NCX hierarchy.
- Leaves PDF merging and adaptive EPUB page conversion unchanged.

## Fixed in 2.13.3: real-end fallback after viewing recovery

- Preserves StudyWing's established real-video-end fallback after the one-time UniPegaso viewing-validation recovery.
- Clears the viewing-validation guard and continues when the video genuinely reaches its loaded duration even if UniPegaso leaves its visible percentage below `100%`.
- Gives priority to a returned validation dialog: when the modal is present, StudyWing leaves it open and stops instead of applying the real-end fallback.
- Keeps the guard active and stops safely when neither platform-confirmed `100%` nor the genuine end of the loaded video can be verified.

## Fixed in 2.13.2: UniPegaso viewing-validation recovery

- Detects UniPegaso's exact **Riproduzione del video non consentita** dialog that asks the user to watch the entire video at normal speed without skipping.
- Distinguishes this viewing-validation case from the existing one-lesson-at-a-time session conflict by matching their different explanatory text instead of relying on internal API `fail` codes.
- Cancels pending automatic progression and confirms UniPegaso's own **OK** recovery action once, allowing the platform to reload the current lesson from the beginning.
- Keeps a lesson-specific recovery guard until UniPegaso registers `100%` or the user changes lesson or chapter.
- Leaves a repeated validation dialog visible and stops safely instead of creating a delayed reload loop.
- Preserves the genuine-video-end fallback for ordinary lessons while requiring platform-confirmed `100%` after this recovery.
- Never changes playback speed, seeks the video, or calls the raw HTML5 `video.play()` method.

## Fixed in 2.13.1: duplicate export prevention

- Prevents reinjected page and bridge listeners from starting the same course-material collection more than once.
- Deduplicates collection requests and terminal success or failure events by operation identifier.
- Serializes builder creation and makes it idempotent, including after a background service-worker restart.
- Ignores delayed collection results after their operation has already completed or been released.
- Records whether an export was requested from the toolbar popup or floating menu for clearer diagnostics.
- Adds automated regression tests proving that duplicate bridge events are forwarded once and concurrent results open only one builder tab.
- Leaves the tested EPUB conversion core unchanged.

## Improved in 2.13.0: more faithful and resilient EPUB conversion

- Classifies PDF pages conservatively before choosing reflowable text or faithful visual rendering.
- Detects all PDF.js image-painting operations, significant image areas, multi-column layouts, vector-heavy tables and diagrams, rotated text, and complex mathematical notation.
- Automatically switches an apparently simple page to visual rendering when text extraction is empty or incomplete.
- Improves text joining, repeated line-break hyphenation, heading levels, and semantic HTML lists on genuinely reflowable pages.
- Preserves more content near page margins and adds a small overlap when a dense visual page cannot be split on an empty row.
- Uses PNG for line art and text-heavy pages while using high-quality JPEG for photographic visual blocks.
- Avoids recompressing already-compressed EPUB images and reports final package-compression progress.
- Retries transient PDF downloads twice with bounded delays and a 30-second timeout per attempt.
- Reports the current PDF page during conversion and provides a safe cancellation action before final EPUB packaging starts.
- Releases PDF and canvas resources after each document and yields between pages to keep the builder interface responsive.
- Reads the installed StudyWing version dynamically for PDF and EPUB metadata.
- Updates the visible generated-file signature to include Microsoft Edge.
- Adds automated EPUB classifier, package, text-conversion, retry, and cancellation coverage; development-only tests are excluded from the release archive.

## New in 2.12.0: pre-publication information and local data controls

- Shows the installed version dynamically in a compact Information section.
- Clarifies that StudyWing is an independent project not affiliated with Pegaso or Multiversity.
- Explains that commission data and preferences remain in the browser and are not sent to the developer.
- Adds a selective **Cancella dati degli esami** action with an explanation, confirmation, and completion status.
- Removes only commission exam records, comparison snapshots, and notification state without changing user preferences or any data on Pegaso.
- Removes the unused `activeTab` permission from the manifest.

Cross-browser build for Firefox, Chrome, and Microsoft Edge.

## Changed in 2.11.9: friendlier defaults

- Disables **Fermati ai test** by default for new users.
- Enables the floating menu by default for new users without changing existing saved preferences.
- Clarifies that the floating menu appears only on the course page containing the lesson list.

## Improved in 2.11.8: clearer descriptions

- Rewrites the help text around user-visible benefits, expected behavior, and important limitations.
- Removes technical terms such as API, cache, and fallback from the popup and floating-menu descriptions.
- Uses **Completa tutti i test** consistently in both menus while preserving the playful **Turbo test!** introduction in its help panel.

## Restored in 2.11.7: remembered Stop-at-tests preference

- Keeps the saved **Fermati ai test** preference when **Completa automaticamente i test** is enabled.
- Shows the remembered checkbox as checked but temporarily unavailable while automatic completion has priority.
- Sends mutually exclusive effective settings to the autoplay engine, so both behaviors can never run simultaneously.
- Restores **Fermati ai test** automatically when automatic completion is disabled again.

## Improved in 2.11.6: compact floating menu

- Hides the automatic-test explanation behind the same expandable control used in the main popup.
- Renames the option to **Completa automaticamente i test** for consistency between the two menus.
- Explains why **Fermati ai test** is unavailable while automatic test completion is active.
- Replaces the misleading close symbol with a minimize symbol and removes empty status spacing.

## Fixed in 2.11.5: UniPegaso session-conflict recovery

- Detects UniPegaso's exact **Riproduzione del video non consentita** / one-lesson-at-a-time dialog.
- Confirms the platform's own **OK** recovery action once, allowing UniPegaso to reload and restore the selected lesson normally.
- Keeps a short-lived recovery guard in `sessionStorage` and leaves a repeated dialog visible instead of creating a reload loop.
- Clears the guard only after the restored video remains stable for 12 seconds.
- Leaves playback to UniPegaso and never invokes the raw HTML5 `video.play()` method.

## Fixed in 2.11.4: manual Obiettivi start

- Continues automatically when the user starts a course by manually selecting **Obiettivi**, even though that page does not contain a video element.
- Waits the documented 5 seconds for UniPegaso to release the Obiettivi session, then opens the first unfinished video in the same chapter.
- Cancels the handoff if the user selects another lesson during the delay, so manual navigation is never overwritten.

## Fixed in 2.11.3: Chromium chapter recovery race

- Adds a Chromium-only settling window before opening the target chapter after a recovery reload.
- If UniPegaso marks the chapter as open but does not render its rows, closes and reopens it once after a controlled delay.
- Keeps the existing single-reload limit and stops safely if UniPegaso remains stuck.
- Leaves normal chapter transitions and Firefox timing unchanged.

## Fixed in 2.11.2: cross-browser startup version log

- Reads the extension version in `bridge.js`, where browser extension APIs are available.
- Passes the version to the page-world autoplay script through the existing settings handshake.
- Removes the invalid direct `chrome.runtime.getManifest()` call from `content.js`.
- Prevents the Firefox `chrome is not defined` and Chrome `chrome.runtime is undefined` console errors.
- Keeps the manifest as the single source of truth for startup logs and generated-file metadata.

## New in 2.11.1: generator version metadata

- Records the exact StudyWing version in generated PDF metadata.
- Records the same generator version in the EPUB package metadata.
- Keeps the visible PDF and EPUB signature clean and version-independent.

## New in 2.11.0: generated-file signature and centered launcher

- Adds a visible StudyWing signature to the opening index page of every generated PDF.
- Adds the same signature to the cover of every generated EPUB.
- Identifies StudyWing as an assistant for Pegaso available for Chrome, Firefox, and Edge while preserving the existing document creator metadata.
- Places the floating launcher at the vertical midpoint of the right edge the first time it is enabled.
- Preserves positions already chosen and saved by users.

## Fixed in 2.10.1: reliable Stop-at-tests resume

- Adds an explicit settings handshake after `content.js` starts listening, preventing the startup state sent by `bridge.js` from being lost between `document_start` and `document_idle`.
- Distinguishes initial synchronization messages from real setting changes, so the first user action is never discarded as startup initialization.
- Reliably resumes automatic progression when **Fermati ai test** changes from enabled to disabled after StudyWing stops at a test boundary.
- Preserves the saved test-boundary context, API resume discovery, memory cache, and video-end safeguards from v2.10.0.

## New in 2.10.0: memory-only API cache

- Caches confirmed completed end-of-lesson tests by course code and module number for the lifetime of the current page.
- Reuses completed entries during later Turbo Test runs, avoiding their lesson GET and completion POST requests.
- Refreshes pending, failed, unavailable, or otherwise uncertain modules on every later run instead of trusting stale data.
- Marks a test complete after either a lesson response reports `100%` or `completeTestIntro` returns a validated success.
- Preserves a confirmed completion if a later response for the same test is temporarily stale, while safely resetting when the terminal test identifiers change.
- Shares the cache across Turbo Test, autoplay, resume discovery, and PDF/EPUB lesson requests without persisting Bearer tokens or API data to browser storage.
- Reuses the already-built course outline, keeps API requests sequential, and preserves all visual fallbacks and video-end safeguards.
- Includes the automatic continuation fix when **Fermati ai test** is disabled after StudyWing stopped at a test boundary.

## Fixed in 2.9.3: Stop at every test boundary

- **Fermati ai test** now stops at every end-of-lesson test, including tests already completed and shown as green.
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
