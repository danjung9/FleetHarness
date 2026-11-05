---
name: fleet-ux
description: Plan, build and verify usable task flows for generated AppYard applications, with observable browser outcomes and recovery behavior.
---

# Usable task flows

Read `.fleet/quality-contract.md` for the exact `acceptance-plan.json` and `ux-spec.json` formats. Follow the current phase: planning defines these contracts; building and repair implement them without changing their frozen expectations.

During planning, identify the audience, primary task and recognizable success outcome. Define each screen's purpose and primary action, plus empty, loading, error and success states, persistence, recovery and keyboard behavior. Choose stable CSS selectors for actions and assertions before implementation. Plan intentional primary and recovery journeys with literal expected outcomes, not arbitrary JavaScript or values copied from a later implementation. Include persistence or review boundaries in a journey when they determine task success.

Build a complete interactive workflow, not a static mockup. Make the next action and current status clear; use familiar task language and readable results. Keep technical IDs, raw JSON and diagnostic simulations secondary unless the audience needs them for its task. Use labeled native controls, visible keyboard focus and layouts usable at desktop and narrow widths. Explain why an action is unavailable and how to proceed.

Preserve unfinished work across ordinary interactions. When a flow includes review or submission, make saved versus unsaved content explicit and require a deliberate save or discard before approving different committed content. When conflicts must be resolved, show the competing values and let the user select or edit the result before confirming; preserving revision IDs alone does not make a conflict review usable.

During build and verification, use `fleet_browser` to open the declared app, inspect the actual screenshot and returned controls, and click/type through the primary and recovery workflows. Inspect desktop and narrow viewports and console errors. Edit source with workspace tools, then call `open` again to refresh the runtime. Each action returns an image and page observations; an image-capable model is required for visual inspection. CLI applications have no browser preview. Do not claim visual checks when images are unavailable.

For browser/service apps, this loop is mandatory. Record an initial review at **both** widths with `fleet_visual_review`: use the returned `captureId`, describe `expected` behavior from the frozen UX/acceptance contract and `observed` results from the actual image, list `findings`, and supply `resolutions` (empty initially). Record both initial reviews before fixing the source. Fix findings, reopen the app, capture both widths again and record rechecks, explicitly resolving each returned finding ID with its `change`. Even a clean initial review needs a fresh capture and recheck at each width. A finding can only be resolved with a later capture of changed runtime files at its viewport. Every build, verify and repair session must complete its own loop; earlier sessions and screenshots of stale source cannot satisfy it. Missing, stale or modified captures and unresolved findings block completion. The host saves `visual-review.json`; do not author or alter it. Stay within the existing stage and repair budget.

The host separately executes the frozen browser journeys and returns results, screenshots and traces in its test report. Interactive observations under `.browser-observations/` help development; they do not replace independent acceptance evidence. Use returned evidence to repair the smallest responsible implementation within the shared one-repair budget. Browser checks establish specified interactions; human review still assesses clarity, usefulness and fit for the intended users.

## Sailor bar

The person does not code. Every primary workflow must be completable through visible controls, with the sample data loaded or one obvious button away. Do not make them edit JSON, use a terminal, or convert units or times by hand. Show dates, times and quantities the way the person would say them, for example Tue 0900, never minute offsets, epoch numbers or internal IDs. Anything the person must change to do the task, such as a roster, a rule or an input record, gets a form. Give outputs a person can use directly: a readable screen, a printable page or CSV. JSON may be offered as an extra, never as the only form.

Put the person's main task first and make it complete without coaching, using only what is on screen. Setup, signing keys, protocol exercises and evidence belong behind a clearly labeled section, not mixed into the watchstanding controls.
