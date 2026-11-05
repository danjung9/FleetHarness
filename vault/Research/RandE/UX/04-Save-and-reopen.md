---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Proposal for Dan to distinguish application download, draft-data saving and tested offline behavior."
---

# 04: Save a draft and prove it reopens

## Bottom line

[R] Give the officer Save draft and Open saved draft, with a readable summary for review. [E] Standalone application download already exists at 50fcaea. [R] Build on it and prove that the person's data survives close and reopen. [R] Describe the exact tested offline functions; a local save is not synchronization.

## User's problem

[A] The officer may assume downloading the app also saves its current schedule, or that a saved browser draft will appear in another interface. An interruption then creates uncertainty or repeated entry.

## Exactly what they see and click

[R] In the training app, show Draft version 2 and the current review state. Clicking Save draft opens the ordinary file-save/download interaction for a versioned data file. Clicking Open saved draft opens a file picker, then shows a summary of the incoming four requests before Use this draft. Invalid files leave the current work untouched.

[R] Offer Save readable summary separately, with synthetic/draft status, supplied limits and review state printed on it. Use File prepared until the platform confirms a completed write; an ordinary browser download trigger cannot prove the user kept the file.

[R] In the factory, retain the existing standalone download, with plain help explaining that it saves the application for this computer. Keep source/evidence export secondary. After installation and testing, a capability note may say Checked offline: edit, check, save and reopen, followed by artifact version and check date. If not tested, say Offline use not checked. Show No synchronization configured rather than a green cloud icon.

## How we would know it worked

[R] On the delivered artifact, disable network before cold launch, edit a fresh case, check, review, save, close, relaunch and import. Compare all inputs, outputs and review revision. Test invalid-file rejection and an unavailable storage location. Also record target OS, packaging prerequisites and first-install behavior. Test results must identify the exact final bytes.

## Build size

[A] Small to medium: 1 to 2 person-hours for local data save/import and plain status in an existing task app, including round-trip checks. Existing packaging failures, cross-platform delivery and operating-system approval are outside that estimate. [R] Thursday rank 4, required for the proposed delivered task; after-event rank 1 for interruption/offline reliability.

## Backend needs

[R] Versioned draft schema, stable task IDs, validation before replacement, result revision and a persisted review reference. No server is required for Thursday. Keep drafts separate from executable packaging. [E] The existing download path packages for the host platform/architecture and may download a runtime on first packaging. [R] Prepare the package in advance, test the intended endpoint and preserve evidence of accepted bytes. Reconnect conflict resolution is later work, not a hidden promise.

## Dan's frontend

[R] Yes, proposal for Dan in the generated app and shared ExecutableDownload text if he agrees. Reuse current file controls and styles. No new installer, publishing flow or storage migration proposed for Thursday.

## Sources

- [E] 50fcaea: src/ExecutableDownload.tsx, electron/executable.ts, electron/main.ts and the separate browser API stores.
- [V] Offline prerequisites and limits: https://support.google.com/appsheet/answer/10107724?hl=en
- [R] [[Research/Plan/Plan]], [[Research/Naval-User/Simplicity-Requirements]].

