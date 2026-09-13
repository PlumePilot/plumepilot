# Course notes export — draft specification

## Status and baseline

Implementation pending. This branch starts from integration/next-release at 79ee491252355a6b7cf6c5b9088b99b428d97706. The user confirmed the integration tests in the current conversation; individual browsers were not restated in that confirmation. Main remains frozen during publication. This document does not declare a new stable release.

Work order: course notes export, notification sounds, customizable floating menu. Each feature has its own draft PR targeting integration/next-release. Simulation export is dropped; other universities are deferred.

## Scope

Explicit user-requested export of notes for one course. Produce a navigable PDF and self-contained editable HTML, grouped by original section, chapter and video. Include videos with notes by default. Preserve tracking_time as source metadata, but do not label its unit until verified. HTML edits affect only the exported copy; no writes to Pegaso. Downloading the edited HTML must preserve changes, Unicode and the selected theme without external runtime dependencies.

## Observed API contract

POST https://lms-api.prod.pegaso.multiversity.click/student/video-lessons/getNotes

Request fields: course_code and lp_item_id from a detailed-lesson item whose contentType is video. Do not substitute id, lessonId, lp_id or display_order. The supplied successful response has code: 200 and data: an array of notes. A note contains id, body (HTML), course_code, lp_item_id, tracking_time, created_at, updated_at, deleted_at and personal identifiers that are unnecessary for export.

Only one successful nonempty response has been observed. Empty responses, multiple notes, pagination, tracking_time units and rich-text variants remain to be verified. HTTP POST alone does not imply mutation; this endpoint is observed as retrieval, with no create/update/delete endpoint in scope.

## Collection design

- Reuse the authenticated page-memory API layer; never persist or forward credentials.
- Build a complete ordered course outline using stable master route identities and section metadata. Preserve repeated/sparse display numbers correctly.
- Reuse compatible detailed chapter snapshots for video enumeration; obtain missing complete metadata through bounded requests.
- In the absence of an observed notes-presence index, budget one getNotes request per video. Do not infer absence from missing metadata.
- Retrieve fresh notes for each explicit collection; do not silently reuse stale editable content.
- Use bounded sequential pacing, timeout/retry handling, cancellation and the shared operation coordinator. No startup scan or polling.
- Separate successfully empty responses from unavailable/invalid responses. Report missing chapters/videos and partial exports visibly.
- Validate response shape and course/video identity. Retain note identity within its course/video scope; handle duplicates deterministically and exclude deleted notes.
- Preserve original outline order independently of retries. Preserve note order until timestamp semantics are confirmed.

## Data and rendering

Discard user_id and official_code before crossing the page bridge. Retain only bounded export-relevant note data. Convert body into an allowlisted inert rich-text model preserving paragraphs, lists and basic emphasis; never inject raw API HTML or execute it. Block scripts, handlers and active URLs. Do not fetch embedded remote resources implicitly. Use synthetic fixtures without personal identifiers, credentials or real note text.

Keep notes in transient collection/builder state only, with existing temporary-job cleanup and bounded payloads. Closing/reloading the source or builder must follow explicit operation ownership rules and never leave a stale lock. A builder failure must not destroy the user's original Pegaso notes.

Provide an explicit explanation that edits in exported HTML do not synchronize to Pegaso. Preserve notes when navigating, changing theme and downloading the updated file. Do not promise that browser refresh or closing the HTML saves unsaved edits. PDF output must preserve Unicode and offer chapter/video navigation.

## UI and integration

Add one course-notes collection action in both activity interfaces, with start/cancel/status behavior and no duplicated state ownership. Reuse existing notification and builder conventions. Keep cancellation reachable irrespective of selected tab. Integrate Standard/Gaming, Light/Dark/System and S/M/L layouts.

Add a one-time Gaming achievement after the first nonempty usable output is successfully generated, through the serialized background claim path. Proposed ID: export-course-notes. EXP value remains to be selected together with the other two planned achievements before implementation is finalized; preserve existing balances and the 500 EXP cap. Failed, empty or cancelled runs award nothing.

## Acceptance gates

- Empty video, multiple notes, deleted note, malformed response and partial failure fixtures.
- Confirm tracking_time with a known timestamp and check pagination behavior before claiming complete retrieval.
- Multiple sections, repeated chapter labels and stable video association.
- Fresh export reflects note edits; errors never masquerade as empty notes.
- Cancellation during waits/requests; reload/closure and operation-lock recovery.
- Sanitization against script/event-handler/URL injection and oversized inputs.
- PDF Unicode, lists, long notes and navigation; HTML offline editing, download/reopen, themes and safe serialization.
- No personal identifier or credential leakage; no new remote code or unneeded permissions.
- Existing export regressions plus deterministic Chrome/Firefox/Edge build validation.
- Manual browser testing before integration. Update privacy/reviewer documentation to describe local note processing for the future release.

## Follow-up features

Notification sounds: opt-in local clips, preview/volume, meaningful terminal events, cross-tab deduplication, bounded audio lifetime and a browser-specific playback spike before choosing permissions.

Customizable menu: reorder/show/hide whole blocks, keyboard alternatives and reset. Pause, active-operation cancellation and preference access remain reachable. Version layout state; hide does not disable functionality.

Neither follow-up is implemented or included in this PR.
