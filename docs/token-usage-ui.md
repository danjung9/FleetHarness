# Token usage interface

This is an ordinary extension of the existing AppYard workspace. It exposes recorded consumption beside the model selector, then lets users inspect how saved projects contribute to the total. The direction contract is in [the surface brief](../.impeccable/surfaces/src-tokenusage-tsx.md); storage and accounting behavior are documented separately in [token usage](token-usage.md).

## Pattern and behavior

- The compact toolbar button shows a rounded total. Its accessible name includes the exact count; opening the panel also reveals the exact total.
- The nonmodal panel identifies its scope as saved projects on this device. A labeled input/output bar shows the composition of recorded tokens. Each project row shows an exact count and a proportional share of the workspace total, ordered from largest to smallest, with titles breaking ties.
- Expanding a project exposes input, output and cached-input counts, plus available current-run and project-lead subtotals. Cached input is included in input, so it is indented rather than presented as another additive category. The subtotals describe different scopes and may overlap.
- Archived projects retain an explicit label and remain included. Missing usage reads “Not recorded”; a provider-reported zero reads “0”. Pending sessions have a separate explanation, and the empty state says when counts will appear.
- The footer explains that previous builds and cached tokens are included, earlier activity may be missing, and these counts are separate from provider billing or plan limits. The bars compare recorded usage; they do not imply a budget or allowance.
- Native popover and disclosure controls provide keyboard access. Escape or the close button dismisses the panel and restores focus to the trigger; the popover also supports outside-click dismissal. Chart labels and written counts convey the information independently of color.

## Visual fit and layout

The implementation in [TokenUsage.tsx](../src/TokenUsage.tsx) and [token-usage.css](../src/token-usage.css) uses the current charcoal surfaces, ivory text, peach accent and green supporting color from [styles.css](../src/styles.css). DM Sans, tabular numerals, thin dividers, compact controls and the existing focus treatment preserve the workspace language. No shared system tokens or raster assets were added.

The panel is anchored below the trigger, limited to 420px wide and inset at least 12px from the viewport edges. It scrolls internally when height is constrained. At widths of 800px or less, padding reduces to 18px; the narrow desktop toolbar also reduces the model selector width to preserve room for the new control. Project titles wrap and numeric columns remain aligned.

## Verification evidence

The finish review disposition is **SHIP**, with no material issues. All five captures were visually reviewed against the current implementation on November 5, 2026:

| Capture | Viewport | Evidence |
| --- | --- | --- |
| [Desktop](../output/playwright/token-usage/desktop.png) | 1512×982 | Live-updated total, labeled composition, expanded project detail, archived and unknown rows. |
| [Minimum desktop](../output/playwright/token-usage/minimum.png) | 1120×720 | Toolbar fit, anchored panel and bounded vertical scrolling. |
| [Mobile browser](../output/playwright/token-usage/mobile.png) | 390×844 | Panel remains within the viewport; rows and details remain legible. |
| [Empty](../output/playwright/token-usage/empty.png) | 1512×982 | Empty-state explanation and coverage footer, with no project rows. |
| [Unreported](../output/playwright/token-usage/unreported.png) | 1512×982 | Unknown counts and a pending-session explanation remain distinct from zero. |

The passing [smoke script](../scripts/smoke-token-usage.mjs) checks exact totals, state-driven updates, cached/input/output breakdowns, project shares and ordering, archived projects, unknown and zero states, keyboard opening and focus restoration, viewport containment, horizontal overflow and browser runtime errors. It also verifies that the footer can be scrolled into view. The captures use synthetic usage fixtures and document interface behavior; they do not represent measured provider activity.

## Existing documentation drift

Root [DESIGN.md](../DESIGN.md) still contains historical navy, cool-white and gold tokens and guidance, despite its later Home note acknowledging the current charcoal, ivory and peach interface. The [design sidecar](../.impeccable/design.json) also retains historical color metadata and synthesized ramps that do not match the current stylesheet. Both files are preserved during this local extension. This record describes the implemented surface without refreshing or replacing the shared design specification.
