# Agent browser sessions

Build, verification and repair agents receive `fleet_browser` on both Pi and Codex. It opens the application's frozen browser or service runtime contract from a clean copy of the current workspace. Agents can interact, inspect the result, edit source with their workspace tools, and call `open` again to try the revised application.

The session stays open between actions, retaining the current page and browser storage. `open` starts a fresh runtime and browser context, resetting that state. Each agent stage owns its session; finishing, stopping or timing out the stage closes the browser, runtime and proxy. CLI applications do not have a browser preview.

Agents and generated code run with full host access and no operating-system sandbox. The browser, service and skill launcher inherit the run process marker. Stop and terminal run cleanup sweep marked descendants, including detached processes that outlive their launcher; a run cannot finish successfully until cleanup is confirmed. The evidence tool's request restrictions below scope its captures. They do not restrict the agent's shell tools or self-hosted browsers.

| Action | Fields | Behavior |
| --- | --- | --- |
| `open` | Optional `viewport`: `desktop` or `narrow` | Prepare the latest declared files and open the host-provided application URL. |
| `flow` | None | Inspect the host-recorded Playwright UI/UX graph: observed states, actual manual transitions and unexplored controls. Does not navigate or replay scripted steps. |
| `journey` | `journeyId`, optional `viewport` | Run one frozen acceptance journey against a fresh copy of the current app, then return its screenshot, completed step count, assertions and browser errors. Available IDs and titles appear in observations. |
| `click` | `selector` | Click a CSS target. |
| `type` | `selector`, `text` | Replace the contents of an input or textarea. |
| `press` | `selector`, `key` | Send a key such as `Enter`, `Tab` or `ControlOrMeta+A`. |
| `select` | `selector`, `value` | Choose an option in a native select element. |
| `scroll` | Optional `deltaY` | Scroll vertically; defaults to 600 pixels. |
| `screenshot` | Optional `viewport` | Inspect the current state, optionally changing viewport size. |
| `close` | None | Release the preview; another `open` is allowed within this stage. |

For example, an agent can use these consecutive calls:

```json
{"action":"open","viewport":"desktop"}
{"action":"type","selector":"#message","text":"TASK: inspect pump"}
{"action":"click","selector":"#parse"}
{"action":"screenshot","viewport":"narrow"}
```

To check a planned workflow, use its ID from `acceptance-plan.json` or the tool's returned `journeys` list:

```json
{"action":"journey","journeyId":"save-task","viewport":"desktop"}
{"action":"journey","journeyId":"save-task","viewport":"narrow"}
```

`journey` executes the host-frozen clicks, input, keyboard actions, reloads and expected results. The agent cannot supply replacement steps or weaken assertions. Each invocation starts fresh so workflows do not accidentally depend on an earlier journey's state. The final screenshot has a host `captureId` even when a step fails, allowing `fleet_visual_review` to record the defect before the agent fixes it. The agent can still use manual actions to explore intermediate screens and edge cases. Expected downloads are read in memory with a size/time bound only during their planned assertion; ordinary downloads remain blocked.

Version 2 UX journeys also contain `expectScreen` checks. These read the frozen screen map and verify the exact route, one visible active screen root, and hidden or absent roots for every other planned screen. `expectHidden` checks optional content. Real links can navigate between separate HTML pages or service routes; client-side views are also supported. Route checks account for the trusted static preview mount, which never belongs in application-authored routes. These checks run identically in development and independent verification. See [generated application structure](ui-structure.md).

Every successful page observation includes an actual PNG image in the tool result, plus JSON containing the URL, screenshot path, visible page text, controls with CSS selectors, recent console messages and page/request errors. A failed action attempts to capture the current page too, so the agent can inspect what went wrong. Capture failures are returned explicitly. `flow` returns a compact graph without taking another screenshot; `close` returns only its status.

Use these observations to determine the actual flow of the interface: open separately at each width, inspect the screen, choose a visible control from the latest observation, and inspect what changes. The host records manual exploration as a source-bound graph. A fresh entry observation, an effective control activation and visits to the required screens are mandatory at both widths. The first primary checkpoint checks its screens; final build, verification and repair completion check all planned screens. Frozen journey replay, input echo and unchanged screenshots cannot satisfy exploration. `flow` helps identify untried controls and dead ends, but cannot establish that every possible state has been explored. Fix implementation defects and reopen after source changes; earlier flow evidence then becomes stale. Expected outcomes remain frozen and independently tested.

The complete graph is saved beside its screenshots in `.browser-observations/<session>/flow.json`; that editable file is diagnostic output. Gates use the host's session ledger and revalidate screenshot bytes along the observed path. The early workflow report also retains the graph in its private host snapshot. For a delayed task result, take another screenshot after the result appears; the host can connect it to a recent successful activation. Failed or unobserved controls cannot supply a path to a later screen.

Pi receives image content directly; Codex receives the equivalent `inputImage` content through its dynamic-tool protocol. The selected model must support image input to inspect pixels. Browser/service stages reject Pi models without declared image input, since its provider adapters otherwise omit image content. Choose an image-capable model and resume the phase; CLI stages are exempt. Codex image-input rejection fails the stage through its normal tool transport. Local mock-provider tests exercise both real SDK transports to check that PNG data and console text reach the next model request; they do not measure a hosted model's visual reasoning.

Screenshots are saved under `.browser-observations/<session>/`. Activity logs retain the text and image metadata without duplicating base64 payloads. These files are development observations: they cannot be declared as application runtime files, and tests under this directory do not count as application tests. Independent acceptance verification still runs its own clean runtime and frozen journeys, saving its evidence under `.quality-evidence/`.

Frozen regular journeys may include `expectHttpError` to click a control and verify one intentional HTTP rejection, for example `{"action":"expectHttpError","selector":"#save","path":"/api/tasks","method":"POST","status":422}`. The response must come from a new same-origin fetch/XHR matching the exact path/query, method and 400–499 status. The host attributes Chromium's resource diagnostic to the observed request; other errors remain failures. Follow this step with the visible error, a correction/retry and a literal success assertion. Agents cannot add HTTP exemptions through interactive tool arguments, and an ordinary `click` grants none.

## Required visual review

New and resumed browser/service builds cannot finish implementation, verification or repair without a recorded visual review loop. Each session must:

1. Capture the app at desktop and narrow widths and inspect both images against the frozen UX and acceptance contracts.
2. Call `fleet_visual_review` for each `captureId`, recording concrete `expected` and `observed` descriptions, `findings` (defect descriptions), and `resolutions` (initially empty).
3. Run every frozen primary and recovery journey with `journey` at both widths. Inspect each returned image and record its comparison with `fleet_visual_review`, including failed runs.
4. Fix failed steps, browser errors and recorded findings, then rerun and review. Resolve each finding ID with a description of the actual source change; workflow findings require the same journey and width. Even an initially clean screen needs a fresh capture and recheck.
5. Before finishing, rerun and review all journeys against the final source. Every source edit invalidates older workflow evidence. An untouched-page screenshot, a failed/unreviewed workflow, or an agent's claim of success cannot satisfy this gate.

The host creates capture and finding IDs. It binds screenshots to the runtime files that were actually opened, validates their saved PNG bytes, preserves unresolved findings across resume, and rejects old-session captures, reused capture IDs, stale source and incomplete reviews. Browser console errors, page/request failures and journey layout overflow are retained separately from agent-authored findings and block final evidence. A later failed run invalidates a previous successful review of that workflow. Verification performs its own loop; a builder's pass cannot substitute. CLI applications are exempt.

When a session finishes with incomplete visual checks, the host sends the exact failures and open findings back for up to three follow-up turns. Further turns require source changes or new host captures, comparisons or resolutions; no-progress loops stop. Inactivity, any explicitly configured deadline, cancellation and separate bounded functional repair allowances for independent core, primary-workflow and final verification remain in effect. Ordinary missing artifacts retain one completion attempt. This bounds unattended runs without stopping useful visual work after a single follow-up.

Open **Review → Visual review** to inspect initial/recheck images, observations, findings and resolutions, including while a build is running or blocked. **Activity → Tools** also records Browser and Visual review calls, including workflow results. A private host checkpoint retains authoritative evidence; the host exports version 2 `visual-review.json` with the source and includes it in quality reports. Agent-written files cannot substitute for this ledger. Version 1 visual reports remain readable; resuming creates a fresh session requiring workflow evidence.

This enforces capture provenance, recorded comparisons and follow-through. The expected/observed descriptions are agent judgments; the host does not independently establish the quality of visual reasoning or pixel-perfect agreement with a reference design.

`npm run test:visual-review` checks the ledger gates and the live evidence viewer, including missing/stale/tampered screenshots, initial/recheck display, recorded fixes, keyboard image expansion, image-read failures and safe desktop image loading. These are explicitly labeled deterministic fixtures. `npm test` additionally exercises the build/verify completion gates, bounded completion attempts, repair, resume and both agent transports.

The host selects the application URL and owns the browser process. The tool accepts no arbitrary URL, JavaScript, browser launch options, file upload or screenshot output path. Requests are restricted to the prepared loopback origin through browser routing and a host proxy, including redirect hops. External requests, WebSockets, popups and unexpected downloads are blocked, and dialogs are dismissed. Applications needing external assets or WebSockets must account for these preview limitations. The app's own service process retains the existing runtime execution policy; browser request restrictions do not sandbox generated server code.

Each browser tool call defaults to a ten-minute deadline, with five-second interaction limits and a separate two-minute runtime preparation limit and a shared thirty-second browser startup budget, all bounded by the owning stage. Time spent editing between calls no longer exhausts the browser lifetime. A timed-out operation releases its runtime; a new `open` or `journey` can recover within the remaining stage budget. Images are limited to 8 MB each, 100 captures and 128 MB total per stage. Desktop screenshots use 1280×800 pixels; narrow screenshots use 390×844 pixels. Screenshots cover the viewport, so use `scroll` to inspect longer pages.

The tool uses installed Playwright Chromium, falling back to installed Google Chrome. In a source checkout, `npm run setup:browser` installs Chromium. Packaged users need Google Chrome. Builds do not download browsers automatically; a missing installation produces an actionable tool error.
