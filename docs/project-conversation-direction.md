# Project conversation surface

## Direction contract

THESIS: One persistent project conversation lets the user guide builds and resolve focused research or planning questions.

OWN-WORLD: Preserve the implemented charcoal surfaces, warm orange actions, DM Sans controls, DM Serif Display headings, Lucide icons, and muted olive boundaries.

STORY: Open Project lead, discuss the brief, review a concrete action, and answer a phase question when needed. The user sees whether the build is working or waiting.

FIRST VIEWPORT: A Project lead toggle sits in the shared project toolbar. Its right-side panel contains a scrollable transcript and a fixed composer. Pending questions appear above the transcript; the build shows a visible waiting notice even with chat closed.

FORM: Extend the existing workspace with an optional nonmodal side panel. No concept seed applies to this local extension. Decisions and controls use the established component system.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Behavior and validation

This is a local extension of the existing AppYard workspace, in Operate mode. The current rendered interface and `src/styles.css` are the visual authority: charcoal surfaces, warm orange actions, DM Sans body text, DM Serif Display headings, Lucide icons, restrained borders, and existing focus tokens. No new visual identity is introduced.

The user can open one Project lead conversation from any project view and keep it across builds. The panel is optional and does not block navigation or worker execution. Wide screens reserve space for it; smaller screens use an independently scrollable side panel to preserve the underlying workspace. Escape and the close button return focus to its trigger. Drafts are scoped to the project and each question.

A research or planning question creates a visible waiting notice and a count on the collapsed trigger. Choices never submit automatically. An explicit answer button continues the current build. Chat remains a distinct input. Brief changes, stopping, and rebuilding use concrete proposed actions with visible consequences and exact before/after brief fields.

The panel includes empty, responding, cancelling, failed, disconnected, and browser preview states. Errors preserve text. Incoming text follows the transcript only while the reader is at its end; a Latest messages button lets a reader return deliberately. The composer stays available while earlier content scrolls. Browser preview explains the desktop requirement and disables model controls.

Visual QA should check the normal desktop and minimum desktop widths, the pending question, the before/after brief proposal, long messages, keyboard opening/closing, independent scrolling, disabled browser preview, and the existing workspace with the panel closed.

Finish validation (2026-11-04): the independent finish review returned **SHIP**, with no material issues and checked text contrast of 6.84:1–13.85:1. The desktop, minimum-size, question, and proposal captures in `output/playwright/conversation/` match the incumbent charcoal/orange interface. The local deterministic smoke result (`result.json`) passed with zero renderer errors, covering streamed replies, proposed actions, research/planning answers, persistence, stale-action rejection, and keyboard close/focus restoration. The conversation reuses the existing buttons, fields, typography, focus, and status colors; its panel, questions, and brief comparison remain surface-specific patterns. `DESIGN.md` and `.impeccable/design.json` are preserved: their preexisting navy/white documentation drift is outside this extension. The detector's two advisories concern the panel's 12px radius and shadow; neither establishes a new system token. No generated raster assets ship with this surface.
