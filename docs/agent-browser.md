# Agent browser sessions

Build, verification and repair agents receive `fleet_browser` on both Pi and Codex. It opens the application's frozen browser or service runtime contract from a clean copy of the current workspace. Agents can interact, inspect the result, edit source with their workspace tools, and call `open` again to try the revised application.

The session stays open between actions, retaining the current page and browser storage. `open` starts a fresh runtime and browser context, resetting that state. Each agent stage owns its session; finishing, stopping or timing out the stage closes the browser, runtime and proxy. CLI applications do not have a browser preview.

Agents and generated code run with full host access and no operating-system sandbox. The browser, service and skill launcher inherit the run process marker. Stop and terminal run cleanup sweep marked descendants, including detached processes that outlive their launcher; a run cannot finish successfully until cleanup is confirmed. The evidence tool's request restrictions below scope its captures. They do not restrict the agent's shell tools or self-hosted browsers.

| Action | Fields | Behavior |
| --- | --- | --- |
| `open` | Optional `viewport`: `desktop` or `narrow` | Prepare the latest declared files and open the host-provided application URL. |
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

Every successful observation includes an actual PNG image in the tool result, plus JSON containing the URL, screenshot path, visible page text, controls with CSS selectors, recent console messages and page/request errors. A failed action attempts to capture the current page too, so the agent can inspect what went wrong. Capture failures are returned explicitly. `close` returns only its status.

Pi receives image content directly; Codex receives the equivalent `inputImage` content through its dynamic-tool protocol. The selected model must support image input to inspect pixels. Browser/service stages reject Pi models without declared image input, since its provider adapters otherwise omit image content. Choose an image-capable model and resume the phase; CLI stages are exempt. Codex image-input rejection fails the stage through its normal tool transport. Local mock-provider tests exercise both real SDK transports to check that PNG data and console text reach the next model request; they do not measure a hosted model's visual reasoning.

Screenshots are saved under `.browser-observations/<session>/`. Activity logs retain the text and image metadata without duplicating base64 payloads. These files are development observations: they cannot be declared as application runtime files, and tests under this directory do not count as application tests. Independent acceptance verification still runs its own clean runtime and frozen journeys, saving its evidence under `.quality-evidence/`.

## Required visual review

New and resumed browser/service builds cannot finish implementation, verification or repair without a recorded visual review loop. Each session must:

1. Capture the app at desktop and narrow widths and inspect both images against the frozen UX and acceptance contracts.
2. Call `fleet_visual_review` for each `captureId`, recording concrete `expected` and `observed` descriptions, `findings` (defect descriptions), and `resolutions` (initially empty).
3. Fix recorded findings, call `open` to load the new source, and capture both widths again.
4. Record rechecks and resolve each finding ID with a description of the actual source change. Even an initially clean screen needs a fresh capture and recheck.

The host creates capture and finding IDs. It binds screenshots to the runtime files that were actually opened, validates their saved PNG bytes, preserves unresolved findings across resume, and rejects old-session captures, reused capture IDs, stale source and incomplete reviews. Resolving a finding requires a later capture of changed runtime files at the same width. Verification performs its own loop; a builder's pass cannot substitute. CLI applications are exempt. The existing stage deadlines and completion/repair budget still apply.

Open **Review → Visual review** to inspect initial/recheck images, observations, findings and resolutions, including while a build is running or blocked. **Activity → Tools** also records Browser and Visual review calls. A private host checkpoint retains authoritative evidence; the host exports `visual-review.json` with the source and includes it in version 3 quality reports. Agent-written files cannot substitute for this ledger. Older reports remain readable and are not represented as having passed this gate.

This enforces capture provenance, recorded comparisons and follow-through. The expected/observed descriptions are agent judgments; the host does not independently establish the quality of visual reasoning or pixel-perfect agreement with a reference design.

`npm run test:visual-review` checks the ledger gates and the live evidence viewer, including missing/stale/tampered screenshots, initial/recheck display, recorded fixes, keyboard image expansion, image-read failures and safe desktop image loading. These are explicitly labeled deterministic fixtures. `npm test` additionally exercises the build/verify completion gates, bounded completion attempts, repair, resume and both agent transports.

The host selects the application URL and owns the browser process. The tool accepts no arbitrary URL, JavaScript, browser launch options, file upload or screenshot output path. Requests are restricted to the prepared loopback origin through browser routing and a host proxy, including redirect hops. External requests, WebSockets, popups and downloads are blocked, and dialogs are dismissed. Applications needing external assets or WebSockets must account for these preview limitations. The app's own service process retains the existing runtime execution policy; browser request restrictions do not sandbox generated server code.

Sessions default to ten minutes. Runtime preparation has a separate two-minute limit; browser launch, connection, context creation and initial navigation share a thirty-second startup budget. Interactions and observations each default to ten seconds. Cancellation and the owning stage deadline still bound every operation. Images are limited to 8 MB each, 100 captures and 128 MB total per stage. Desktop screenshots use 1280×800 pixels; narrow screenshots use 390×844 pixels. Screenshots cover the viewport, so use `scroll` to inspect longer pages.

The tool uses installed Playwright Chromium, falling back to installed Google Chrome. In a source checkout, `npm run setup:browser` installs Chromium. Packaged users need Google Chrome. Builds do not download browsers automatically; a missing installation produces an actionable tool error.
