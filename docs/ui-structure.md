# Generated application structure

New browser and service builds plan their screens before placing feature controls. The output can contain multiple HTML pages, service routes, or client-side views. A focused single-screen tool remains valid when its task justifies it; there is no minimum page count.

## Planning

The planner writes `ux-spec.json` version 2 and a compact screen map and layout sketch in `plan.md`. It chooses a task-based pattern: `single-task`, `steps`, `list-detail`, or `workspace`. The choice has a rationale, an entry screen, navigation transitions, and a description of persistent elements. Each screen declares:

- A stable ID, name, purpose and primary action.
- An exact application route and a unique CSS selector for its content root.
- The main/supporting regions and their order and emphasis.
- Secondary content and how users reveal it, or an explicit statement that there is none.
- Its narrow-screen arrangement.

For example, a scheduling application can put the calendar and conflict resolution on **Schedule**, people and equipment on **Resources**, and generation settings in a focused **Generate schedule** flow. A list and its selected detail can share one screen. Shared navigation lives outside the individual screen roots, and inactive screens are hidden or unmounted.

The implementation agent establishes navigation and screen layout first, then completes the domain interactions using the evaluated computational core. The starter's generic JSON input/result form is an example of transport, not a required layout. Every additional page and asset belongs in the frozen runtime file manifest; service applications explicitly serve their routes. Static browser packages use relative links and assets so navigation works beneath the host preview mount as well as in the exported application.

## Executable screen checks

Regular browser journeys begin with `{"action":"expectScreen","screenId":"schedule"}` for the declared entry screen. After navigation, another `expectScreen` checks the destination. Across the journeys, every planned screen must be covered, and a change of screen requires an application interaction. Planning fails before implementation if these checks are missing or reference unknown screens.

Both the development browser and independent verification execute the same host-owned assertion. It checks the exact route, one visible root for the active screen, and hidden or absent roots for every other declared screen. A layout with all planned screens stacked visibly therefore fails. Duplicate screen roots, incorrect query strings/fragments, and stale active screens also fail. `expectHidden` is available for secondary disclosures. These assertions supplement literal task results and meaningful recovery checks; they cannot replace them.

Routes omit the host's temporary prefix. Static packages begin at `/index.html`; service applications begin at `/`. Further routes can be separate documents such as `/resources.html`, service paths, or hash views. The ordinary runtime supplies its trusted static mount to the browser checker. The isolated browser runtime obtains its lease and redirects to `/index.html`; isolated services retain `/`.

Browser journeys run at desktop and narrow widths. Include return navigation, reload, and assertions about saved or unfinished work when they determine task success. Visual review additionally inspects the hierarchy, grouping, secondary disclosure and intermediate screens. Structural checks validate the declared screen roots, not the quality of the planner's grouping or the visual design of arbitrary content outside those roots.

## Architecture experiments and compatibility

Shared experiment behavior stays independent of the candidate's screens and routing. New browser candidates write execution-contract version 2 with their structure and screen map. A binding may append a `screenId` assertion after its shared action or observation. The host adds the entry-screen check and compiles these into `expectScreen` steps, preserving the shared values, expected outcomes and action order. Candidate screen checks can strengthen those expectations, not replace them.

CLI builds retain their version 1 UX descriptions and require no browser screen map. Previously frozen version 1 regular and candidate contracts remain readable and retain their original checks and serialized identity. Resuming an existing build does not redesign its interface; start a new build to apply the new planning requirement.

## Validation

`npm run check` includes the schema, planning-loader, experiment compiler, compatibility and real-browser regressions. Focused files are `ux-structure-contract.test.mjs`, `quality-ux-planning.test.mjs`, `experiment-ux-structure.test.mjs` and `browser-ux-structure.test.mjs`. Browser fixtures exercise separate pages and hash views, return navigation, preserved input, reloads, duplicate roots, incorrect routes and the all-screens-visible failure at both viewport sizes, including the isolated browser runtime. These deterministic fixtures do not measure hosted-model design quality.
