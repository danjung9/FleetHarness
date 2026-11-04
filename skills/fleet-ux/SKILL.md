---
name: fleet-ux
description: Plan, build and verify usable task flows for generated AppYard applications, with observable browser outcomes and recovery behavior.
---

# Usable task flows

Read `.fleet/quality-contract.md` for the exact `acceptance-plan.json` and `ux-spec.json` formats. Follow the current phase: planning defines these contracts; building and repair implement them without changing their frozen expectations.

During planning, identify the audience, primary task and recognizable success outcome. Define each screen's purpose and primary action, plus empty, loading, error and success states, persistence, recovery and keyboard behavior. Choose stable CSS selectors for actions and assertions before implementation. Plan intentional primary and recovery journeys with literal expected outcomes, not arbitrary JavaScript or values copied from a later implementation. Include persistence or review boundaries in a journey when they determine task success.

Build a complete interactive workflow, not a static mockup. Make the next action and current status clear; use familiar task language and readable results. Keep technical IDs, raw JSON and diagnostic simulations secondary unless the audience needs them for its task. Use labeled native controls, visible keyboard focus and layouts usable at desktop and narrow widths. Explain why an action is unavailable and how to proceed.

Preserve unfinished work across ordinary interactions. When a flow includes review or submission, make saved versus unsaved content explicit and require a deliberate save or discard before approving different committed content. When conflicts must be resolved, show the competing values and let the user select or edit the result before confirming; preserving revision IDs alone does not make a conflict review usable.

The host executes the frozen browser journeys and returns results, screenshots and traces in its test report. Agents initially have no dedicated browser tool: do not claim visual inspection or screenshots you could not access. Use returned evidence to repair the smallest responsible implementation within the shared one-repair budget. Browser checks establish specified interactions; human review still assesses clarity, usefulness and fit for the intended users.
