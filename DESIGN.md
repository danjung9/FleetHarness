---
name: FleetHarness
description: An inspectable desktop software factory with navy navigation and warm paper work surfaces.
colors:
  ink: "#19283a"
  muted: "#626c72"
  paper: "#f7f5ef"
  ground: "#ebe9e2"
  line: "#d2d0c9"
  orange: "#d94c26"
  blue: "#315d8d"
  green: "#32705a"
  deep: "#102437"
  white: "#fff"
  panel: "#f3f1eb"
  sheet: "#fbfaf6"
  field: "#fcfbf7"
  badge-neutral: "#e3e4df"
  badge-neutral-ink: "#4b565d"
  complete: "#dceae3"
  complete-ink: "#286348"
  active: "#f6d9ce"
  active-ink: "#9e361a"
  failed: "#f3d8d3"
  failed-ink: "#9b3022"
  review: "#f2e5b8"
  review-ink: "#71550b"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  field:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  log:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  stage: "3px"
  control: "5px"
  action: "6px"
  project: "8px"
  dialog: "10px"
  badge: "20px"
spacing:
  compact: "8px"
  control: "12px"
  panel: "16px"
  section: "20px"
  group: "24px"
  dialog: "26px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 13px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 13px"
    height: "36px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "32px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    padding: "10px 0"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    width: "100%"
  navigation:
    backgroundColor: "{colors.deep}"
    padding: "49px 12px 14px"
    width: "228px"
  badge:
    backgroundColor: "{colors.badge-neutral}"
    textColor: "{colors.badge-neutral-ink}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  factory-sheet:
    backgroundColor: "{colors.paper}"
  stage:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stage}"
    padding: "11px 10px 9px"
    height: "104px"
---

# Design System: FleetHarness

## Overview

**Creative North Star: "Inspectable software factory"**

FleetHarness is a dense, practical desktop workspace. A deep navy navigation rail frames warm paper surfaces for plans, requirements, logs, source, and evidence. Thin boundaries and compact controls organize the work; orange marks attention and selection without replacing the navy action hierarchy.

The interface makes agent work inspectable. Manrope establishes hierarchy, DM Sans carries instructions and interaction, and IBM Plex Mono distinguishes recorded execution data. The visual language supports the direct, credible voice in PRODUCT.md and keeps generated, tested, reviewed, and delivered states visibly distinct.

**Key Characteristics:**
- Persistent navy navigation and warm paper work surfaces.
- Compact controls, thin borders, and flat work areas.
- Orange selection and focus, with explicit semantic status colors.
- Separate typography for headings, interface text, and execution records.
- Desktop panels that resize and scroll within the application window.

This is a scan of the implemented system in `src/styles.css`, `src/App.tsx`, and the font imports in `src/main.tsx`; window dimensions come from `electron/main.ts`. The recorded review artifacts are `output/playwright/factory-desktop.png`, `factory-minimum.png`, `development-desktop.png`, and `evidence-desktop.png`. It preserves the incumbent world rather than establishing a new visual direction.

## Colors

The palette pairs dark blue structure with warm off-white materials, a restrained orange attention color, and semantic state tints. Frontmatter values are normative; the sidecar's synthesized tonal ramps are swatch previews, not additional application tokens.

### Primary

- **Orange:** Keyboard focus, selected graph stages, active graph connections, and active-stage cues.
- **Ink:** Primary action fills, headings, and interface text. Primary buttons remain navy.

### Secondary

- **Blue:** Text actions, artifact identifiers, and supporting operational icons.
- **Green:** Successful evidence, approval cues, and supporting review icons.
- **Complete / Complete Ink:** Completed, approved, and delivered status badges.
- **Active / Active Ink:** Running and active status badges.
- **Review / Review Ink:** Work awaiting human review.
- **Failed / Failed Ink:** Failed status and error output.

### Neutral

- **Deep:** Persistent rail and transient notification backgrounds.
- **Ground:** Workspace background behind the paper surfaces.
- **Paper:** Work sheets, lists, transcripts, and secondary controls.
- **Panel:** Inspectors and the activity/review panels surrounding the preview.
- **Sheet:** Graph stages and artifact links.
- **Field:** Text inputs and textareas.
- **White:** Primary-button text, hover surfaces, and generated-app preview background.
- **Muted:** Supporting descriptions, timestamps, and secondary metadata.
- **Line:** Panel boundaries, row dividers, and low-emphasis borders.
- **Badge Neutral / Badge Neutral Ink:** Queued, stopped, draft, and other neutral statuses.

**The Status Has a Label Rule.** Pair each status tint with the implemented text label and SVG icon; color is supporting evidence, not the only state indicator.

## Typography

**Display Font:** Manrope, with a sans-serif fallback.
**Body Font:** DM Sans, with a sans-serif fallback.
**Label/Mono Font:** IBM Plex Mono, with a monospace fallback, for execution data.

The pairing gives compact operational screens a clear hierarchy without making ordinary instructions resemble a terminal. Fonts are bundled locally. Manrope weights 600 and 700, DM Sans weights 400–700, and IBM Plex Mono weights 400–600 are imported.

### Hierarchy

- **Display:** Page titles use the display token.
- **Headline:** The persistent challenge title uses the headline token; it contracts to (21px) at the narrow desktop breakpoint. Dialog titles also use (23px), with their own slightly tighter tracking.
- **Title:** Section headings use the title token, with contextual (14–16px) headings inside dense panels and sheets.
- **Body:** Page descriptions use the body token; instructions and checklist text also use (12px). Page introductions are limited to (76ch), while empty-state text is limited to (52ch).
- **Label:** Actions and field labels use the label token. Field text uses its own normal-weight token.
- **Log:** Tool output, test output, paths, and source use the log family. Human-readable agent messages return to DM Sans.

**The Three Voices Rule.** Use Manrope for hierarchy, DM Sans for interaction and explanation, and IBM Plex Mono for execution records and identifiers.

## Layout

The target is an Electron desktop window, initially (1512×982px) with a minimum of (1120×720px). The body fills the viewport and does not scroll; each work area manages its own overflow. There is no implemented mobile layout.

The shell pairs a fixed rail (228px) with a flexible workspace. A top bar (60px) and optional challenge header sit above the active work area. Page views use (30px 34px 40px) padding. Forms remain bounded, including the requirements form (850px maximum), and long paths or logs wrap inside their panels.

The factory combines a flexible graph sheet, an evidence strip, and a stage inspector (300px). Development places a flexible app preview between an activity panel (260px) and review panel (250px). Evidence uses two columns for review; artifacts use a file list beside a source viewer. These are existing surface compositions, not mandatory templates for every future screen.

At viewport widths of (1280px) or less, the rail becomes (210px), the factory inspector (260px), and the Development side panels (225px) and (215px). Search collapses to an icon, one run fact is hidden, and padding tightens. At heights of (800px) or less, headers, stage cards, navigation rows, and gaps contract while panels retain scrolling. The spacing tokens capture recurring values; the source does not enforce a single mathematical spacing scale.

## Elevation & Depth

Work surfaces are flat and separated by warm tonal changes and thin borders. Shadows identify transient layers: the modal floats above a dark backdrop and the toast floats above the workspace. Graph texture is a faint square grid, not a raised-card effect.

### Shadow Vocabulary

- **Dialog:** `0 24px 70px rgba(10,24,36,.26)` for modal separation.
- **Toast:** `0 8px 24px rgba(10,24,36,.18)` for transient feedback.

**The Transient Elevation Rule.** Preserve flat work panels; reserve the existing shadow treatments for dialogs and notifications.

## Shapes

Large work sheets and list surfaces have square corners. Graph stages have a slight curve, ordinary fields and icon controls a small curve, and primary/secondary buttons a slightly softer curve. Project selection and dialogs use the larger recorded radii; status badges are pills. These distinctions are deliberate parts of the incumbent hierarchy, not one universal card radius.

Borders are generally (1px). SVG icons provide consistent line-based symbols; the FleetHarness mark is a custom SVG. A circular state icon inside a rectangular graph stage connects node status to the badge vocabulary.

## Components

### Buttons

Compact, explicit actions use an inline icon and text with an (8px) gap. Primary and secondary variants share the action radius, (36px) height, and label typography. Primary hover changes to `#2c4357`; secondary hover becomes white. Icon buttons are (32×32px), while text actions are blue with no surface fill. Disabled buttons use opacity (.48) and a blocked cursor.

Keyboard focus uses an orange (2px) outline with a (3px) offset across buttons, inputs, textareas, selects, and disclosures. The implementation does not add animated button transitions.

### Chips

Status badges combine a compact SVG, a short state label, and the appropriate semantic tint. They are informational, not filter controls. Intake template choices are separate small bordered buttons whose selected state is ink with white text.

### Cards / Containers

Paper sheets and bordered output areas supply the main surface structure. Lists use row dividers instead of separate elevated cards. Inspectors use the panel tone, with shared dividers and compact internal groups. The factory sheet has a header, graph area, and monospaced footer; its exact graph arrangement belongs to the Factory screen.

### Inputs / Fields

Fields use the field background, control radius, a `#b9bdb8` border, and the field typography token. Labels sit above the control, with supporting hints in muted DM Sans. The orange caret and shared focus outline connect forms to the rest of the interface. Textareas resize vertically within the implemented (80–340px) bounds; checkbox accent uses ink. Validation messages sit beside the affected form rather than introducing a separate visual language.

### Navigation

The rail uses a deep background, muted blue-gray inactive text, and line icons. Rows are (39px) tall by default. Hover adds a slightly lighter navy surface and white text; active navigation uses warm paper with dark text. The rail remains present at the minimum desktop width. The project picker and backend connection status remain distinct from navigation rows.

### Factory Stages

Each selectable stage is a compact rectangular button with a number, circular SVG status icon, Manrope title, supporting detail, and written status. Selection adds the shared orange outline independently of execution state. Complete, active, review, and failed states alter borders and icon treatments; active and review also tint the surface. Connectors are thin gray paths, with a dashed repair route. The active repair route uses an (8s linear infinite) dash animation. Reduced-motion preference disables animation and transitions.

### Execution Records and Feedback

Logs use divided rows, monospaced metadata, wrapping output, and red error text. Test output uses a bordered disclosure with the command separated from output. Empty states explain what appears next and connect to an available action. Success feedback uses a navy toast with an icon; errors use an inline warm-tinted banner and explicit text. Exported locations remain visible as wrapping monospaced paths.

## Do's and Don'ts

### Do:

- **Do** keep the navy rail and warm paper surfaces when extending this desktop workspace.
- **Do** pair status color with a written state and the established SVG icon treatment.
- **Do** use the three font roles consistently and preserve visible orange keyboard focus.
- **Do** keep long source, logs, and file paths readable through panel scrolling and text wrapping.
- **Do** preserve reduced-motion support for the animated graph connection.

### Don't:

- **Don't** replace the navy primary-action treatment with orange merely because orange is the attention color.
- **Don't** apply dialog or toast shadows to ordinary work sheets and list rows.
- **Don't** turn one screen's graph or column arrangement into a mandatory layout for every surface.
- **Don't** use a successful test tint to imply human approval or operational readiness.

Existing compact graph and metadata text reaches (8–10px), and uppercase section labels occur in the source. These are recorded implementation details, not a recommended minimum type size or permission to add decorative kickers. They have not been repaired or generalized during this preservation handoff.
