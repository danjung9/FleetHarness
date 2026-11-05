---
type: review
status: ready-for-owner-run
owner: mukul
updated: 2026-11-05
summary: "Independent checks missing from the real delivery journey and a concrete follow-up for the generated morning brief."
---

[P] Main owns `~/fhten/tools/real-journey.mjs` and its native execution against Morning training brief in its dedicated synthetic profile. This review reads source and checked synthetic input snapshots only. No authentication file was opened, credential entered, build started or model called. The review acknowledgment is an automated test of a function, not a person's acceptance.

[E] The current journey is useful observational evidence but its `passed` boolean does not establish a usable delivered app. These are checker gaps, not reported product defects:

| Location in real-journey.mjs | Missing proof | Required change |
| --- | --- | --- |
| 58-67, 82, 102 | An absent or disabled download returns `offered: false` as a successful step, skips the app and can leave the whole result green. | Require an actual download for this browser candidate. Retain a plain unsupported reason separately; do not count skipped delivery as success. |
| 37-42, 93-99 | Preview and delivered app checks read body text and click the first button. Click failures are swallowed. No expected result is asserted. | Drive the actual defining workflow and compare independent source values, provenance and per-item review state. |
| 69-76 | A reused export directory's first existing child is accepted after a delay. | Use a new destination and bind its report/review and runtime payload to this project/run. Await completion instead of assuming directory creation means finished export. |
| 80, 91, 98 | Renderer errors and external requests are collected without affecting the verdict; request monitoring starts after initial launch. | Install offline controls before measured use, record early limits, and fail on observed application errors or attempted external requests. Chromium DNS rules alone do not block a generated Node service's network. |
| 100 | One close does not test reopen persistence. | Fully exit, confirm the owned process exited, reopen the same delivered bytes/profile and compare targeted saved state. Repeat after a different item or changed source. |
| 103-108 | Caught failures do not set a nonzero process exit code. | Set failure exit status so a calling runner cannot count an unsuccessful JSON receipt as success. |

[E] The new judge-NOT path also needs assertions before its positive click. In the actual review state, display the reported gaps, fill notes and the ordinary acknowledgment, and verify Approve remains disabled before the separate gap checkbox is checked. After approval/export, compare the saved `judgeGapsAccepted` and accepted gap list with that report. A SATISFACTORY candidate does not exercise this branch. The earlier six receipts have no judge-NOT case.

[E] The candidate's current solution contract declares `browser`, with no required environment settings. It therefore cannot close the new Node-service packaging gap. The existing `scripts/smoke-service-app.mjs` really packages, launches and restarts its service fixture, but starts from manufactured approval metadata. Its existence is not a new passing receipt or a real review-to-download journey.

[R] The next check follows the real download through independent delivered-app use and restart. Its frozen answers come from the checked synthetic Outlook, Outlook Calendar and data-service snapshots, not generated tests or the model's report. All three sources reuse `item-1` and `item-2`, so the decisive persistence assertion must identify an item by both source and item ID. Reviewing DEMO-104 must not mark the email or calendar item-2 reviewed.

[E] Preparation files are `Research/QA/Overnight/qa-real-delivered-app.mjs`, `morning-brief-oracle.mjs` and `morning-brief-adapter.mjs`. The explicit adapter reads the generated app's visible cards and source/review panel, drives Mark reviewed, and performs Preview source import followed by Save source import. It never reads application globals or browser storage for answers. Native execution remains with main. A new result must retain the preceding journey identity, exact archive/payload identity, literal observations, screenshots and three complete process exits. Missing inputs, an obsolete adapter or unconfirmed cleanup produce ERROR, not a product verdict.

[E] Required brief behavior is separate from supplemental offered functionality. Source-import mutation and invalidation of the old acknowledgment are checks of the generated app's explicit source-version interface and contract. They must be labeled accordingly; absence of an import feature alone is not a failure of the short public brief. The public brief requires the supplied morning information, provenance and review persistence after reopening. It does not specify a clock start of 0800 or any real account interoperability in this synthetic test.


[E] All three scripts pass syntax and pure negative controls. The oracle rejects wrong values, missing provenance, reused bare item IDs, a shared review bit and stale or mixed capacity values. Adapter controls reject wrong evidence identity and malformed synthetic imports. Harness controls reject missing rows, failed cleanup, wrong restart identity and external URL schemes. Native execution has not occurred here.

[R] Main runs this after its preceding journey has completely closed the downloaded app. The original `delivered.zip`, exactly one completed source export, matching report/review and the selected run must exist. Record the generated app's `app.getPath('userData')` as `deliveredProfile.userData` in journey.json. Alternatively pass that exact path with `--profile`. It must end in the deterministic generated-app ID for this project. This is the downloaded app profile, never the build profile `ud-connected`.

```sh
node ~/Documents/CDAO/Fleethacker-Vault/Research/QA/Overnight/qa-real-delivered-app.mjs \
  --repo ~/Documents/CDAO/fh-org/hotfix \
  --journey ~/fhten/journey/journey.json \
  --output ~/Documents/CDAO/Fleethacker-Vault/Research/QA/Overnight
```

[E] The checker does not start AppYard or another build. It unpacks the actual archive into its unique output, checks every declared runtime file against the approved source export and independently recomputes that export's source digest. The owner-supplied dedicated generated-app profile is temporarily renamed without reading its contents. An empty profile at the same native path is used for the three launches. After all owned processes exit, the test profile is retained at a unique adjacent path and the original is restored. Both paths and restoration state are recorded. Retention stays on the same filesystem so an output directory on another volume cannot strand restoration. No bundle bytes, review evidence or original profile contents are edited.

[E] The eight rows cover archive identity, six independent source records, only DEMO-104 reviewed, full exit/restart with exactly that acknowledgment, an independent calendar review, an offered source import changing capacity 12 to 7, a second full exit/restart and final offline/identity/cleanup observations. The changed calendar item must become unreviewed while DEMO-104 stays reviewed. Original source bodies remain information to display; no email instruction is executed by the checker. The observed sample date must be 2026-11-05; no 0800 requirement is added.

[E] A denying proxy and DNS flags precede native launch, and Playwright receives offline mode. Page error/request listeners attach when Playwright returns. The initial page must work without a repair reload, but unreported startup-only console errors before attachment remain outside the observer. This is a browser-app check; it makes no Node-service network-isolation claim. An overall watchdog requests shutdown, individual native and row waits are bounded, and signals preserve an ERROR outcome with owned cleanup. Unexpected selectors or identity drift are checker/evidence ERROR; failed observed behaviors are FAIL pending independent receipt review.

[R] The next separate native coverage should address the judge-NOT rejection/acceptance/exported-gap record if this real candidate does not take that branch, and actual Node-service delivery. Neither is implied by a passing browser morning brief.


[E] Handoff identity:

| File | SHA256 |
| --- | --- |
| `qa-real-delivered-app.mjs` | `694c27a4dd93bb66bb8746e42afd63ac88c5584e5c4851a5f361a4fdc78fe132` |
| `morning-brief-oracle.mjs` | `5ca64587a5bb0050f09ea1f7b7bde5b0847d537fd31d342bc1d5616af1112701` |
| `morning-brief-adapter.mjs` | `c3d55c517e4af83a8feb6e0ef2e45c44b86a4ea3f5b1ed1fad7b63c22792ddaf` |
