---
name: "FleetHarness Field Workspace · UI version 3"
description: "A calm, compact workspace for describing a field problem, trying a tool, and reviewing the result."
colors:
  primary: "#275ac3"
  primary-hover: "#19489f"
  selected-surface: "#edf3fe"
  nav-selected-surface: "#e3ebfb"
  nav-selected-ink: "#214fba"
  paper: "#fff"
  slate-rail: "#f4f6fa"
  ground: "#f5f7fa"
  ink: "#202d3e"
  muted: "#5b6779"
  line: "#dfe5ed"
  field-line: "#c7d1df"
  button-line: "#ced7e4"
  button-ink: "#34445b"
  button-hover: "#f0f4fa"
  support-surface: "#f7f9fc"
  starter-surface: "#dfe9fb"
  starter-ink: "#315d9c"
  status-neutral: "#5a697d"
  status-active: "#275bb5"
  status-review: "#93601e"
  status-complete: "#28734e"
  status-failed: "#ab4534"
typography:
  headline:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  detail-title:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  row-title:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
  detail-body:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  row-summary:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  status:
    fontFamily: "'DM Sans', sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
  identifier:
    fontFamily: "'IBM Plex Mono', monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  tag: "3px"
  small: "4px"
  control: "6px"
  support: "8px"
  split: "9px"
  circle: "50%"
spacing:
  tight: "4px"
  inline: "8px"
  control-gap: "10px"
  small: "12px"
  medium: "16px"
  section: "24px"
  page: "30px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.button-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
  button-secondary-hover:
    backgroundColor: "{colors.button-hover}"
  search:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.nav-selected-surface}"
    textColor: "{colors.nav-selected-ink}"
    rounded: "{rounded.control}"
    padding: "11px 10px"
  starter-tag:
    backgroundColor: "{colors.starter-surface}"
    textColor: "{colors.starter-ink}"
    rounded: "{rounded.tag}"
    padding: "1px 5px"
  support-card:
    backgroundColor: "{colors.support-surface}"
    rounded: "{rounded.support}"
    padding: "23px"
  challenge-row-selected:
    backgroundColor: "{colors.selected-surface}"
    textColor: "{colors.ink}"
    padding: "19px 17px"
  workspace-tab-selected:
    textColor: "{colors.primary}"
    padding: "12px 2px 15px"
  status:
    textColor: "{colors.status-neutral}"
    typography: "{typography.status}"
  next-action:
    rounded: "{rounded.support}"
    padding: "21px 24px"
---

# Design System: FleetHarness Field Workspace · UI version 3

## Overview

**Creative North Star: "The Field Workspace"**

The Field Workspace gives frontline personnel a calm place to describe a problem and judge a resulting tool. Cool white work surfaces sit beside a pale slate rail; ink text, restrained cobalt actions, divided rows, and aligned columns make a dense interface readable. The tone is practical and direct.

This record describes the implemented V3 world only. Plain-language requests, progress, trying the tool, and review lead the interface. Technical output remains available through disclosure. It does not change the original Desktop or Studio identities.

**Key Characteristics:**

- Cool white surfaces and a pale slate navigation rail.
- Compact divided lists with adjacent detail on desktop.
- DM Sans for the interface; IBM Plex Mono for identifiers and technical output.
- Restrained cobalt for actions, selection, and keyboard focus.
- Visible text and icons accompany status color.

This is a scan of the completed implementation, dated 2026-11-04. Scope is `src/workbench/` and this documentation directory. Sources are `workbench.css` (including its final readability overrides), `main.tsx`, `Workbench.tsx`, `BriefEditor.tsx`, `BuildWorkspace.tsx`, and `ui.tsx`. Desktop, request, and mobile captures in `output/playwright/workbench/` corroborate the rendered hierarchy. The adjacent [PRODUCT.md](PRODUCT.md) supplies the audience; [the direction contract](../workbench-direction.md) supplies the chosen world. Frontmatter tokens are normative; the [sidecar](.impeccable/design.json) adds interaction and responsive details.

## Colors

The palette is cool and restrained: cobalt identifies what can be acted on, while white and slate carry sustained reading. Sidecar tonal ramps are generated preview metadata; they are not additional shipping color tokens.

### Primary

- **Working Cobalt** (`primary`): primary buttons, links, active tabs, selected-row indicator, and keyboard focus. Its deeper hover token belongs to primary actions.
- **Selection Blue** (`selected-surface`): the desktop selected challenge. Navigation uses the slightly stronger `nav-selected-surface` with its own ink token.
- **Starter Blue** (`starter-surface` / `starter-ink`): small catalog tags, subordinate to the task title.

### Neutral

- **Cool White** (`paper`): main canvas, fields, and ordinary buttons.
- **Pale Slate** (`slate-rail`, `ground`, `support-surface`): navigation and supporting information. Slight local tints in the implementation distinguish the editor aside and delivery note without creating a second accent family.
- **Field Ink** (`ink`): headings and primary reading. **Slate Text** (`muted`) supports explanations and metadata.
- **Dividers and controls** (`line`, `field-line`, `button-line`): separate rows and define interactive surfaces without elevation.

### Functional states

`status-neutral` covers draft, stopped, and queued; `status-active` covers running and active; `status-review` is amber; `status-complete` is green; `status-failed` is red. These are semantic state colors, not additional brand accents. Review and approved banners also use pale amber and green backgrounds, respectively; their exact pairs are captured in the sidecar component.

**The Action Accent Rule.** Use cobalt to identify an action, selection, or focus state. Keep broad work surfaces white or pale slate.

**The Labeled State Rule.** Pair state color with readable words and a recognizable icon; a colored dot alone does not carry the state.

## Typography

**Interface font:** DM Sans, with sans-serif fallback. Local font imports supply weights 400, 500, 600, and 700. **Technical font:** IBM Plex Mono, with monospace fallback, imported at weight 400.

Use the frontmatter roles rather than a fabricated geometric scale. The implemented hierarchy is compact: page headline, detail title, section title, row title, body, label, and identifier. Headings use balanced wrapping; long task names and technical paths wrap rather than force horizontal overflow.

- **Headline:** ordinary page title; at medium widths it becomes 25px, and mobile catalog headings become 26px. Build titles use 25px on desktop and 24px on mobile.
- **Detail title:** the selected challenge, reduced to 21px at the medium breakpoint and restored to 23px in the mobile drill-in.
- **Section title:** supporting headings. The request editor’s field labels are 15px semibold; smaller task section headings are 13px, or 14px on mobile.
- **Row title / summary:** the final stylesheet overrides establish 14px semibold task titles and 12px regular summaries on every width. Metadata is 12px on desktop and 11px on mobile. These override earlier smaller declarations.
- **Body / detail body:** ordinary explanatory copy uses the body role; the main challenge description uses the more open detail-body leading. Descriptions generally cap at 65–70 characters per line.
- **Label / status / identifier:** compact control and supporting roles. Footers, some utility labels, and starter tags use 10–11px; this is a secondary-information exception, not a body-copy scale.

**The Plain Task Rule.** Use sentence-case task language in the main workflow. Reserve monospace for identifiers, file paths, code, and execution output.

## Layout

The desktop shell is a full-height grid (`100dvh`) with a 220px rail and a flexible content region. Content has a 58px top bar, independently scrolling main region, and 32px footer. Standard pages use 30px padding and a 1500px maximum width; the catalog fills its region with 30px top/side and 24px bottom padding. These are observed dimensions and agree with the scoped direction contract.

The catalog splits list and detail at a 1.05:1 ratio inside one bordered container. The list and detail body scroll independently. Rows have a 113px minimum height and generous vertical padding; their title, metadata, summary, and trailing chevron align consistently. Detail content uses 27px padding. A footer stays attached to the detail pane. At desktop widths, changing the selected row updates the adjacent pane while retaining keyboard focus on the selected control.

The request editor uses flexible fields plus a 290px supporting column, a 60px gap, and an 1100px maximum width. Its aside is sticky 24px from the top. Build overview and review use narrower supporting columns (265px and 300px) with 55px and 45px gaps. The check summary and next-action banner support the primary task rather than compete with it.

Responsive behavior is explicit:

- **At 1600px and above:** catalog padding becomes 35px 40px 28px, the split becomes 1.08:1, detail padding becomes 34px, and row padding becomes 22px.
- **At 1200px and below:** the rail is 196px; page padding is 24px; detail padding is 23px; editor, overview, and review columns/gaps tighten.
- **From 761px through 1000px:** the rail is 70px and main navigation becomes icon-only. Persistent accessible names retain the brand, destinations, and counts; this is not permission to remove control labels from the accessibility tree.
- **At 760px and below:** the shell becomes a document-flow page with a horizontal navigation strip. Content padding is 24px 18px. Search spans both filter columns. The catalog shows the list first, then an explicit detail view; the heading, counts, and filters are hidden while inspecting a challenge. “All challenges” returns to the list. The detail view has 20px padding and no selection stripe. Forms and supporting columns stack; sticky asides become static; progress becomes a two-column list. Tabs can scroll horizontally; the preview is 530px high, compared with 580px on desktop.

The spacing tokens capture recurring small gaps and page rhythm; local layout measurements remain component-specific. Do not force the existing 13px, 17px, 23px, or 27px measurements onto an invented base grid.

## Elevation & Depth

The workspace is flat at rest. Pale surfaces, one-pixel dividers, and active-state color establish hierarchy. Ordinary buttons, catalog panels, and supporting cards do not cast shadows. The active tab uses an inset two-pixel bottom line, which is an indicator rather than elevation. Keyboard focus uses a two-pixel cobalt outline with a three-pixel offset; the search wrapper uses a two-pixel offset.

The single floating surface is the confirmation toast: `0 6px 23px #1b2f5326`. Its dark background and shadow separate a temporary message from the page; it disappears after five seconds and can be dismissed.

**The Flat Workspace Rule.** Use borders and tonal changes for working surfaces. Reserve the diffuse floating shadow for transient notifications.

## Shapes

The dominant control shape is a softly rounded rectangle. Buttons, fields, search, and navigation share the control radius. Small tags use the tag radius; requirement counters and icon buttons use the small radius; supporting cards and toasts use the support radius. The catalog’s combined frame uses the split radius. Rows meet directly at square internal boundaries, with no card gaps. Numbered workflow markers and status dots are circles.

Borders are normally one pixel. The selected desktop challenge carries a one-pixel cobalt line on its left edge plus a pale fill. This is a selection indicator, not a general decorative motif. Icons are simple stroked inline SVGs, generally 13–18px in controls; the brand mark is an inline geometric SVG. No shipping raster assets were introduced.

## Components

### Buttons

Compact, explicit actions. Primary and secondary tokens share a 37px minimum height, the control radius, a one-pixel border, and an eight-pixel icon gap. Primary fills use cobalt; secondary actions use white, slate ink, and the button border. Hover changes the fill/border without movement. Pressed filter buttons use a pale blue fill and stronger blue border/text. Disabled buttons use 0.48 opacity and `not-allowed` cursor. Full-width buttons are used in the request aside. All buttons inherit the visible focus treatment.

### Inputs / Fields

White fields use the field border, control radius, 10px 12px padding, 13px text, and 1.5 line-height. Textareas resize vertically, with a 100px minimum and 600px maximum height. Labels and short explanatory copy stay outside the field. Required fields retain native validation; a request error also appears as a focusable alert. Locked request fields use native disabled behavior while creation is running; there is no separate invented visual disabled token.

Search is a bordered wrapper with a 39px minimum height and inset icon. The inner input has no border or separate rounded box. A focus-within outline encloses the whole search control. The slash shortcut focuses it outside editable controls. A clear button replaces the shortcut hint when text is present.

### Navigation

The rail has a persistent brand, local workspace context, three primary destinations with counts, and secondary connection/source controls. Active navigation uses a pale blue fill and blue text; hover uses a quiet slate-blue fill. Links are at least 42px high on desktop. Mobile navigation becomes a horizontal strip with 39px minimum height and 11px labels. Compact desktop visible labels hide, while accessible names on the brand and primary destinations remain. The top-bar connection control provides a route to settings at all widths.

### Chips and status

Starter tags are small tinted rectangles with 10px text; they label a challenge’s suitability as a starting point and do not act as buttons. Status labels combine an SVG icon, text, and semantic color: “Creating tool,” “Ready to try,” “Needs help,” “Approved,” and “Downloaded.” The UI never makes the state depend solely on the dot or tint.

### Cards / Containers

The shared catalog container groups two working regions; its border and split radius define the boundary. Supporting cards are pale, softly rounded, and flat. The automated-checks card uses 23px padding; the editor aside uses 25px. Avoid treating these slightly different component dimensions as interchangeable tokens. Request and build content remain on the white page instead of being wrapped in nested cards.

### Challenge row and detail

A row is a full-width button with `aria-pressed`, its source identifier, domain, optional starter tag, plain-language title, truncated summary, and chevron. Hover adds a faint tint. Selection uses the pale selection surface and one-pixel line on desktop. A one-line summary becomes two lines on mobile. The adjacent pane presents the full description, “Make this my problem,” numbered requirements, needed inputs, and a collapsed “How this could work” disclosure. Mobile shows the detail as a deliberate drill-in.

### Progress, tabs, and review

A next-action banner changes its heading and action with the tool state; review uses amber and approved/downloaded uses green. The progress list uses numbered circles, connected by a thin rule on desktop; completed steps replace the number with a check. Active steps use cobalt and `aria-current="step"`.

The main tab sequence is “Your request,” “Try your tool,” “Review & download,” and “Technical details.” Tabs have no filled pill background; the selected one is blue, semibold, and underlined. Arrow keys move between tabs, and Home/End move to the first/last tab. The associated focusable panel is labeled by its active tab. Logs, files, system design, and build stages are secondary controls inside Technical details.

Review presents requirements beside automated-check evidence. Approval stays unavailable until checks pass, the user supplies review text, and the confirmation checkbox is checked. The visual green state means a reviewed prototype, not certification. Shared executable-delivery components are outside this visual record’s implementation boundary.

### Feedback and motion

Errors use a pale red alert surface, readable red text, and `role="alert"`; feedback toasts use `role="status"` and a labeled dismiss control. Loading placeholders are static pale bars. The only general motion is a 160ms ease-out transition of button background and text color. Reduced-motion preference disables animations, transitions, and smooth scrolling. There is no decorative entrance animation.

## Do's and Don'ts

### Do:

- Do preserve visible focus, accessible control names, and text alongside status icons.
- Do keep task copy readable using the final type overrides: row titles are 14px; row summaries and desktop row metadata are 12px.
- Do use the adjacent detail pattern on desktop and an explicit drill-in with a return control on mobile.
- Do keep request, creation, trial, and review actions prominent while technical information remains secondary.
- Do use inline SVG icons and the existing geometric brand mark; the V3 interface ships no raster imagery.
- Do preserve the original Desktop and Studio interfaces and their separate design records.

### Don't:

- Don’t make status depend on color alone or remove accessible names when compact navigation hides visible labels.
- Don’t replace the working list with decorative cards, a promotional hero, or ornamental imagery.
- Don’t use monospace for primary task titles or ordinary instructions.
- Don’t apply the toast shadow to ordinary panels or turn the one-pixel selection indicator into a decorative accent stripe.
- Don’t treat small footer, identifier, or tag typography as the default for instructions or required task information.
- Don’t infer operational readiness from a green check or an approved prototype state.
