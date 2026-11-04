# Workbench · UI version 3

Mode: Operate. Audience: frontline personnel and soldiers who need software to solve their own operational problems, often working on laptops in busy shared environments. The interface must let a non-programmer describe a problem, get a usable tool, try it, and decide whether it meets their needs. Technical evidence stays available through progressive disclosure. Existing Desktop and Studio implementations are outside the write boundary.

## Direction contract

THESIS: A problem catalog with an adjacent task description gets frontline users from a real operational need to a tool they can try. The main screen is a working list, not a promotional landing page.

OWN-WORLD: Cool white work surfaces, a pale slate navigation rail, ink text, restrained cobalt actions, and green/amber/red labeled states. DM Sans carries the interface; monospace is reserved for identifiers, files, and execution output. Divided rows and aligned columns establish density.

STORY: Browse the 34 source challenges, inspect scope and dependencies, describe their situation and what success means, follow tool creation, try the application, then review and download.

FIRST VIEWPORT: A 220px left rail frames the workbench. A concise title and queue totals precede search and domain filters. The challenge list and selected challenge share the remaining viewport, with a prominent Make this my problem action in the detail pane. Mobile turns the detail pane into an explicit drill-in. Selection changes the detail pane immediately without losing list context.

FORM: Master/detail work queue, selected using the user's delegation to choose the best fit. Code-led implementation; no concept lottery or raster assets. Signature interaction: select a challenge without leaving the queue, then carry its source and plain-language requirements into a saved request.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Boundaries

Separate HTML entry, Vite config, renderer directory, browser storage, desktop data directory, and output bundle. Reuse read-only backend contracts and shared components. Add scripts without changing existing launch/build commands. The V3 design record lives under docs/workbench/ so the existing design systems remain intact.

## User-confirmed correction

The audience is frontline personnel and soldiers, not hackathon builders. Plain-language problem intake, trying the tool, and user review lead the UI. Agent logs, system architecture, files, and connection configuration are secondary details.
