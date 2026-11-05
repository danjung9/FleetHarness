---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Dated rules and rubric assessment, submission gaps, dependency licenses and a tool-ledger handoff."
---

# Rules fit and truthful claims

## Bottom line

[E] The source supports a concrete claim of an implemented prototype-generation and reviewed-export workflow at `mvp`, `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`. [E] It does not establish measured officer benefit, hosted-model success, operational fielding or completion of the 34 catalog cases. [E] Human delivery review, monitoring and cancellation have implementation, while command permissions, domain approval and containment remain weaker than an autonomous-governance claim would imply. [R] Submit one tested user workflow with the factory's evidence, reconcile tooling and prior work, and disclose every remaining integration and authority gap.

## Assessment boundary

[P] Rules and weights below come from the November 4 captured summaries in [[Event/Rules]], [[Event/Judging]] and [[Sprint/Submission-Checklist]], as directed by [[Research/00-Brief]]. [E] The live portal form, current eligibility interpretation and acceptance of a challenge subset were not checked here. Source was read in `/Users/mukul/Documents/CDAO/FleetHarness`; no app, install, test, model call or credential was used in this review. Static implementation findings are not compliance certification.

[E] The final clone HEAD was `0f175a8`, after an observed advance during review. This assessment and all 497 dependency rows remain pinned to the requested `f72c5dc`, with critical source and lockfile checks against Git objects. Later commits are outside this assessment.

## Requested rules

| Rule [P] | What the code supports [E] | Remaining gap and honest statement [R] |
| --- | --- | --- |
| 2: identify a real user, current job and measured burden | Intake prompts for context and criteria; catalog entries name problems. No burden-measurement instrumentation, observed baseline or officer trial appears in the reviewed material. | Name two users if claiming both products: a technical builder/mission sponsor for the factory, and the officer using the delivered app. Measure engineering effort separately from officer task effort. Today: intended burden reduction, benefit unmeasured. |
| 3: observable build and evidence | Pi sessions, files, host tests, repair, preview and export are implemented. Tests and smoke scripts exercise meaningful boundaries using injected sessions or a local scripted provider. | Attach the other reviewer's exact test results and one hosted-provider run against an identified artifact. Show an altered input, a failure and the real result. Today: implemented pipeline and test definitions; this seat has not observed a successful run. |
| 5: permitted resources and full disclosure | `package.json` and `package-lock.json` pin tools; catalog and fixtures record source/synthetic scope; project state records provider/model per run. | Complete the central ledger with actual model IDs, external endpoints, fixture provenance, dependencies and research tools. Provider support is not proof of event-account access or approval. Include the dependency inventory below, distinguishing locked from actually used. |
| 6: human authority, prohibited actions, monitoring, escalation and stop | Approval/export handlers recheck passing evidence and source hashes. Logs, errors, stage limits, stop and quit cleanup are implemented. Original desktop explains shell access before starting. | Agents can execute shell commands before delivery review. Prohibitions are prompts, not OS restrictions; all domain tools are exposed despite recipe selection. Studio omits the original pre-run disclosure. No authenticated domain approver or accountable escalation owner is installed. Claim supervised local prototype review, not enforced least privilege or operational approval. |
| 7: disclose prior work | The repository provides a fixed revision, third-party dependency declarations and existing team code/research. | A commit on November 4 does not prove every contribution originated during the event. Have contributors identify earlier code, prompts, assets, borrowed material and event changes; retain the reference revision and history. No pre-event/event split is established by this seat. |
| 9: Fleet constraints | Local state, locally bundled fonts, self-contained HTML target, loopback previews and deterministic toolkit functions support a disconnected-delivery design. mac arm64 packaging is configured. | Hosted generation needs connectivity. There is no verified multi-device transport, government identity, approved device install, field security hardening or sustainment owner. Test exported-app cold start/edit/save/reopen/export without external networking. Describe exact tested hardware; do not generalize Electron's portability into proven shipboard installation. |

[E] Supporting source: `electron/main.ts`, `electron/pi-backend.ts`, `electron/agent-runner.ts`, `electron/verification.ts`, `electron/storage.ts`, `electron/preview.ts`, `harness/`, `src/App.tsx`, `src/studio/Studio.tsx`, `package.json` and `tests/`. Detailed traces are in [[Research/FleetHarness-MVP/What-Exists]].

[P] Rule 4 additionally limits data. [E] The prepared packet and prompts specify synthetic inputs, but intake does not classify or redact arbitrary text. Logs include tool arguments/results, and the artifact copier has no general secret scan. [R] Use only reviewed synthetic fixtures and public sources; inspect prompts, logs, screenshots and exports before submission. The selected provider receives model context, so local UI/storage must not be described as local-only generation.

## Five judging criteria

| Criterion and weight [P] | Honest evidence today [E] | Evidence still needed [R] |
| --- | --- | --- |
| Warfighting and deckplate impact, 30% | The catalog describes submitted needs, and the software implements a development process. No measured user burden reduction is established. | One officer completes the intended task on matched synthetic inputs. Include preparation, corrections, review and downstream re-entry. If only teammates participate, report an internal synthetic trial. Never equate generation speed with deckplate hours saved. |
| Speed to Fleet, 20% | Standalone HTML is the delivery target, and a local desktop package is configured. | Prove the delivered workflow offline from cold start, then save/reopen/export; record prerequisites, OS/architecture, install authority, security gaps and accepting owners. Factory and runtime connectivity must be described separately. |
| Fleet scalability, 20% | Ten reusable recipes and a 34-entry catalog are concrete reusable structure. | Repeat on a genuinely distinct scoped app and independent inputs before claiming cross-domain factory capability. Counts of cases or copied project folders are not adoption or Fleet-scale evidence. |
| Barrier removal, 15% | One host links requirements, context, stages, tests, repair and delivery. | Record setup failures, key/model friction, integration gaps and total person-minutes. Compare with a supervised ordinary coding workflow only if a fair trial is possible. Catalogue the bottlenecks still outside the app. |
| Judges' discretion, 15% | Two interfaces, live event/design views and concrete review/verification plumbing exist in source. | Demonstrate real hosted output, a meaningful negative case, stop, honest limitations and a noncoding user's result. UI polish and scripted-provider success alone cannot establish this. |

[R] Do not reuse the council's conditional numerical scores as scores for this branch. Their proposed apps and unperformed trials differ from this implemented factory.

## Submission checklist audit

[E] Status here means supported, partly supported or missing from reviewed evidence. No row certifies the contents of a future generated package or an unseen submission.

| Checklist item [P] | Status and required closeout [E/R] |
| --- | --- |
| Named user | [E] Broad builder/sponsor and officer intent; no validated participant workflow. [R] Pick one billet/job and identify the factory operator separately. |
| Problem | [E] Catalog/briefs describe problems. [R] Freeze the specific demonstrated slice and exclusions. |
| Current process | [E] Council baselines are hypotheses, not observations. [R] Obtain a permitted fictional walkthrough or label a manual reference exercise. |
| Measured burden | [E] Not established. [R] Preserve raw matched trial times and errors, or say unmeasured. |
| Category | [E] Catalog families differ from the rules' three categories. [R] Confirm the live form and subset eligibility. Do not treat recipe categories as entry categories. |
| OSW ROI and evidence | [E] No fixed ROI selection in code. [R] Use delivery-friction or digital-workforce learning only with observed evidence and an agreed submission choice. |
| Observable prototype/test | [E] Concrete source and test definitions. [R] Attach executed results, runnable artifact and exact revision. |
| Permitted data | [E] Synthetic fixtures and restrictions exist. [R] Review the actual demo inputs, prompts, logs and exports. |
| Cybersecurity | [E] Renderer/preview controls and protected host key storage; coding/test execution remains host code. [R] State the boundary and run under technical supervision on a prepared synthetic-data machine. |
| Portability and shipboard limits | [E] mac arm64 target, no verified government install. [R] Record target device, prerequisites, package size/resource use and outstanding permissions. |
| Connectivity/disconnected use | [E] Local primitives and HTML target; no complete sync transport. [R] Demonstrate actual exported app offline and clarify universal sync language cited by council. |
| Sustainment | [E] A path-to-fleet document is required by the generation prompt, but its adequacy/owner acceptance is not checked. [R] Name the maintainer and update/rollback/backup route. |
| Allowed actions | [E] Read/write/edit/bash and all seven domain tools are enabled. [R] Make this visible to the technical operator. |
| Prohibited actions | [E] Credential/unrelated-file access and publishing are prohibited in prompts. [R] Do not call that enforced isolation; supply no operational integrations. |
| Human approval | [E] Passing-source-bound local delivery review exists. [R] Demonstrate blocked premature/stale export and a reviewer note; keep domain acceptance separate. |
| Logging and monitoring | [E] Bounded UI logs, saved state and Pi session storage exist. [R] Preserve complete demo evidence separately; no tamper-proof claim. |
| Escalation | [E] Failures stop promotion and display an error. [R] Assign actual technical and mission escalation roles; both remain unconfirmed here. |
| Shutdown | [E] Stop/quit/cancellation code and tests exist. [R] Attach execution evidence, explain macOS window-close behavior and preserve interrupted work. |
| Tools/models/data/services | [E] Inventory below; central ledger not edited. [R] Reconcile actual usage and model IDs using the authorized ledger process. |
| Prior work | [E] Existing branch and council research are inputs. [R] Contributors identify event changes and earlier work in the central log. |
| Ownership/restrictions | [E] Root `package.json` has no license field and no tracked root license file was found. [R] Team confirms contribution rights and third-party notices before public distribution. This is a metadata finding, not a legal clearance. |
| Friction | [E] Provider access, meaningful verification, technical onboarding and fielding gaps are identified here. [R] Transfer to the central friction log with responsible roles and next checks. |
| Mission owner | [E] Not confirmed. [R] Obtain an accepting user/owner, or mark unassigned. |
| Technical owner | [E] Not confirmed. [R] Obtain maintainer acceptance, rather than inventing a name. |
| Next experiment | [R] One real-provider factory run, independent acceptance of one generated workflow, then an uncoached task/offline trial. |
| Required resources | [R] Key owner, technical reviewer, domain reviewer, prepared permitted laptop, synthetic answer key and submission access. Availability is not confirmed by this report. |
| 30 days | [R] Validate the current process, owners, task correctness and net benefit; stop or revise if benefit is absent. |
| 60 days | [R] Validate target-device packaging, data handling, identity, backup/update/rollback and permitted integration in an approved test environment. |
| 90 days | [R] Seek an authorized limited pilot only if prior gates pass; measure sustainment and decide continue, integrate, revise or stop. |
| Five rubric claims | [E] Mapped above. [R] Lead with an observed task outcome, label reach/fielding limits and demonstrate a clean failure/control path. |
| Mission result, not sales pitch | [R] Open the delivered user task before showing the factory. Avoid superiority claims about untested alternatives. |
| Actual portal submission | [E] Current form, attachments, category, team access and receipt are not verified. [R] Prepare and review a concrete package, then an authorized human submits with a buffer before November 5 at 2:00 PM EST. |

## Main dependencies and licenses

[E] Versions/licenses below were read from this commit's `package.json` and `package-lock.json`, not inferred from current releases or an installed runtime. No `node_modules` package metadata was available in the inspected paths. The lock contains 497 non-root package records, including platform/optional/development packages. Locked does not mean installed, invoked or connected to an outside service.

| Dependency/tool | Pinned version | Recorded license | Use/provider [E] |
| --- | --- | --- | --- |
| `@earendil-works/pi-coding-agent` | 1.5.0 | MIT | Embedded coding engine, Earendil Works. |
| `react`, `react-dom` | 19.3.1 each | MIT | Interface/view runtime, React project. |
| `typebox` | 1.3.27 | MIT | Tool schemas and validation, TypeBox project. |
| `lucide-react` | 1.68.0 | ISC | UI icons, Lucide contributors; upstream license also identifies Feather-origin portions. |
| `@fontsource/dm-sans` | 5.3.0 | OFL-1.1 | Local font package, Fontsource and underlying font creators. |
| `@fontsource/ibm-plex-mono` | 5.3.0 | OFL-1.1 | Local font package, Fontsource and underlying font creators. |
| `@fontsource/manrope` | 5.3.0 | OFL-1.1 | Local font package, Fontsource and underlying font creators. |
| Bundled DM Serif Display TTF files | Version not recorded here | SIL OFL 1.1 text bundled | Studio typography, `src/studio/fonts/`; precise binary provenance not independently verified. |
| `electron` | 45.2.2 | MIT | Desktop host, Electron project; bundled Chromium/Node third-party notices need separate retention. |
| `electron-builder` | 26.18.0 | MIT | Packaging, electron-builder project. |
| `vite` | 8.3.5 | MIT | Build/dev server, Vite project. |
| `@vitejs/plugin-react` | 6.2.1 | MIT | React build integration, Vite project. |
| `typescript` | 7.0.2 | Apache-2.0 | Compilation, Microsoft/TypeScript project. |
| `playwright` | 1.64.1 | Apache-2.0 | Browser/Electron smoke automation, Microsoft/Playwright project. Actual browser binary/version must be disclosed by the test runner. |
| `concurrently` | 10.0.6 | MIT | Parallel local dev processes, concurrently project. |
| `cross-env` | 10.1.0 | MIT | Cross-platform dev environment, cross-env project. |
| `wait-on` | 9.5.1 | MIT | Dev readiness checks, wait-on project. |
| `@types/node` | 26.6.6 | MIT | Node type definitions, DefinitelyTyped. |
| `@types/react`, `@types/react-dom` | 19.3.0 each | MIT | React type definitions, DefinitelyTyped. |

[E] The lock also pins Pi's `pi-ai`, `pi-agent-core`, `pi-codemode`, `pi-mcp`, `pi-schema`, `pi-telemetry` and `pi-tui` at 1.5.0, all recorded MIT. Provider SDK entries include `openai` 7.19.0 (Apache-2.0), `@anthropic-ai/sdk` 0.129.0 (MIT), `@google/genai` 2.21.0 (Apache-2.0), and `@aws-sdk/client-bedrock-runtime` 3.1127.0 (Apache-2.0). Their presence does not establish use of those providers, MCP endpoints or telemetry services in a run.

[E] Lockfile licenses also include BSD, ISC, BlueOak, MPL, Python, Unlicense, WTFPL and alternative expressions. The tree is not exclusively MIT. [R] Preserve the lock and applicable license texts/notices with the release; inspect the packaged dependency closure and generated-app content separately. A complete locked inventory follows below so the disclosure owner can reconcile it without guessing. [V] Upstream primary license pages corroborate Pi's MIT, TypeBox's MIT and Lucide's ISC declarations: https://github.com/earendil-works/pi/blob/main/LICENSE, https://github.com/sinclairzx81/typebox/blob/main/license and https://github.com/lucide-icons/lucide/blob/main/LICENSE.

## Tool-ledger handoff

[E] This assignment restricts writes to this folder. The prescribed `python3 tools/fh.py tool NAME TYPE USE PROVIDER` would write the central Sprint ledger outside it, so it was not invoked here. [R] An authorized coordinating session should reconcile the following through that command, preserving actual versions and distinguishing evaluated, locked, installed and used. No keys, credential links or credential-file contents belong in the ledger.

| Entry | Type/use to disclose | Provider/version evidence |
| --- | --- | --- |
| [E] FleetHarness branch and source | Prior team software reviewed; catalog, recipes, skills, deterministic tools, UI, verification and tests | Team repo at the full commit above. Contribution dates require contributor/history review. |
| [E] All direct dependencies above and complete locked inventory below | Development/runtime libraries and assets | Exact locked versions/licenses; actual execution not observed by this seat. |
| [E] Synthetic fixtures and scripted provider | Test datasets and deterministic model substitute | `harness/fixtures.ts`, `scripts/mock-provider.mjs`, inline test fixtures and smoke scripts. Record them as synthetic and disclose when they produce a demo. |
| [E] Norfolk catalog snapshot | Source dataset, interpreted challenge metadata | Captured November 4, 2026 per `harness/catalog.ts`; event portal; no fresh authenticated refresh here. |
| [E] Council/vault research and existing docs | Prior analysis and requirements inputs | Assigned Officer, Builder and Judge decisions, brief and captured event notes. |
| [A] Real model/provider/endpoint | Actual factory generation and repair usage | Run's `Project.model`, session metadata and key owner's account confirmation. No real inference was performed here. Do not infer the model from a prior coding session. |
| [A] Browser/OS/Node/package signer | Execution/test/distribution prerequisites | Reviewer must record actual runtime versions, target architecture, browser channel and signing status. `docs/desktop.md` assertions are not measurements. |
| [E] Local shell, Git, rg, cat, sed and Python 3 standard library | Read-only source inspection, lockfile inventory and document checks | Session/local system tooling; exact binary versions not captured. No repository program executed. |
| [E] Web search/retrieval and public documentation | Read-only provider/API/license research | Session web service; Pi, official API docs and upstream license pages listed in Sources. No authenticated interaction. |
| [E] Official API documentation lookup workflow | Local documentation skill used for the event-key compatibility question | Local `openai-docs/SKILL.md`; version not recorded. It directed primary-documentation lookup, not an API request. |
| [E] Clock and local patch/file-writing tools | Bound review time and produce these notes | Session tooling; implementation versions not exposed. |
| [A] Research-session model identity | Required disclosure from the runtime record | Not independently exposed as an exact model ID to this seat. Reconcile from the session record through the team's disclosure process. |

[E] OR-Tools, PouchDB/CouchDB, Tika, Tesseract, SQLite FTS5, OPA, OpenSCAP, NetworkX, Power Apps, SWE-AF, SuperPlane, Symphony, Aperant and startups.rip appear as candidate/design references in the assigned materials. They were not installed or invoked by this review. [R] List an actual evaluation as research when it occurs; do not present candidate URLs as runtime dependencies, licenses reviewed at exact versions or completed integrations. Disclose any later generated app's additional dependencies independently of this factory inventory.

## Complete locked dependency inventory

[E] The following records were read directly from the Git object `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e:package-lock.json`, rather than the moving working tree. Development and optional flags are lockfile metadata, not evidence that a package was installed, invoked or used as an outside service. Every row is observed metadata [E]; underlying publishers/maintainers are identified by the package names and lockfile records. Reconcile actual use before entering the central ledger.

<details>
<summary>497 locked package records, versions, licenses and scope</summary>

| Package location | Locked version | Declared license | Lock scope |
| --- | --- | --- | --- |
| `node_modules/@anthropic-ai/sdk` | 0.129.0 | MIT | runtime graph |
| `node_modules/@aws-sdk/client-bedrock-runtime` | 3.1127.0 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/core` | 3.979.1 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-env` | 3.972.80 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-http` | 3.972.82 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-http/node_modules/@smithy/node-http-handler` | 4.14.1 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-ini` | 3.973.25 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-login` | 3.972.87 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-node` | 3.972.92 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-process` | 3.972.80 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-sso` | 3.973.24 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-sso/node_modules/@aws-sdk/token-providers` | 3.1161.0 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/credential-provider-web-identity` | 3.972.86 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/eventstream-handler-node` | 3.972.40 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/middleware-eventstream` | 3.972.36 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/middleware-websocket` | 3.972.62 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/nested-clients` | 3.997.54 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/nested-clients/node_modules/@smithy/node-http-handler` | 4.14.1 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/signature-v4-multi-region` | 3.996.51 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/token-providers` | 3.1127.0 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/types` | 3.975.0 | Apache-2.0 | runtime graph |
| `node_modules/@aws-sdk/xml-builder` | 3.972.42 | Apache-2.0 | runtime graph |
| `node_modules/@aws/lambda-invoke-store` | 0.3.0 | Apache-2.0 | runtime graph |
| `node_modules/@babel/runtime` | 7.29.10 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-agent-core` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-ai` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-ai/node_modules/agent-base` | 9.0.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-ai/node_modules/http-proxy-agent` | 9.1.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-ai/node_modules/https-proxy-agent` | 9.1.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-codemode` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/chalk` | 6.0.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/hosted-git-info` | 9.0.3 | ISC | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/lru-cache` | 11.5.3 | BlueOak-1.0.0 | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/minimatch` | 11.0.3 | BlueOak-1.0.0 | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/semver` | 7.8.5 | ISC | runtime graph |
| `node_modules/@earendil-works/pi-coding-agent/node_modules/undici` | 8.12.3 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-mcp` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-schema` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-telemetry` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-tui` | 1.5.0 | MIT | runtime graph |
| `node_modules/@earendil-works/pi-tui/node_modules/get-east-asian-width` | 1.6.0 | MIT | runtime graph |
| `node_modules/@electron-internal/extract-zip` | 1.0.8 | MIT | dev |
| `node_modules/@electron/asar` | 3.4.1 | MIT | dev |
| `node_modules/@electron/asar/node_modules/balanced-match` | 1.0.2 | MIT | dev |
| `node_modules/@electron/asar/node_modules/brace-expansion` | 1.1.21 | MIT | dev |
| `node_modules/@electron/asar/node_modules/minimatch` | 3.1.5 | ISC | dev |
| `node_modules/@electron/fuses` | 1.8.0 | MIT | dev |
| `node_modules/@electron/fuses/node_modules/ansi-styles` | 4.3.0 | MIT | dev |
| `node_modules/@electron/fuses/node_modules/chalk` | 4.1.2 | MIT | dev |
| `node_modules/@electron/fuses/node_modules/fs-extra` | 9.1.0 | MIT | dev |
| `node_modules/@electron/fuses/node_modules/supports-color` | 7.2.0 | MIT | dev |
| `node_modules/@electron/get` | 5.1.0 | MIT | dev |
| `node_modules/@electron/notarize` | 2.5.0 | MIT | dev |
| `node_modules/@electron/notarize/node_modules/fs-extra` | 9.1.0 | MIT | dev |
| `node_modules/@electron/osx-sign` | 1.3.3 | BSD-2-Clause | dev |
| `node_modules/@electron/osx-sign/node_modules/isbinaryfile` | 4.0.10 | MIT | dev |
| `node_modules/@electron/rebuild` | 4.2.1 | MIT | dev |
| `node_modules/@electron/universal` | 2.0.3 | MIT | dev |
| `node_modules/@electron/universal/node_modules/balanced-match` | 1.0.2 | MIT | dev |
| `node_modules/@electron/universal/node_modules/brace-expansion` | 2.1.7 | MIT | dev |
| `node_modules/@electron/universal/node_modules/fs-extra` | 11.4.1 | MIT | dev |
| `node_modules/@electron/universal/node_modules/minimatch` | 9.0.9 | ISC | dev |
| `node_modules/@electron/windows-sign` | 1.2.2 | BSD-2-Clause | dev, optional |
| `node_modules/@electron/windows-sign/node_modules/fs-extra` | 11.4.1 | MIT | dev, optional |
| `node_modules/@epic-web/invariant` | 1.0.0 | MIT | dev |
| `node_modules/@fontsource/dm-sans` | 5.3.0 | OFL-1.1 | runtime graph |
| `node_modules/@fontsource/ibm-plex-mono` | 5.3.0 | OFL-1.1 | runtime graph |
| `node_modules/@fontsource/manrope` | 5.3.0 | OFL-1.1 | runtime graph |
| `node_modules/@google/genai` | 2.21.0 | Apache-2.0 | runtime graph |
| `node_modules/@hapi/address` | 5.1.1 | BSD-3-Clause | dev |
| `node_modules/@hapi/formula` | 3.0.2 | BSD-3-Clause | dev |
| `node_modules/@hapi/hoek` | 11.0.7 | BSD-3-Clause | dev |
| `node_modules/@hapi/pinpoint` | 2.0.1 | BSD-3-Clause | dev |
| `node_modules/@hapi/tlds` | 1.1.7 | BSD-3-Clause | dev |
| `node_modules/@hapi/topo` | 6.0.2 | BSD-3-Clause | dev |
| `node_modules/@isaacs/fs-minipass` | 4.0.1 | ISC | dev |
| `node_modules/@isaacs/nonrecursive-glob-match` | 1.0.3 | BlueOak-1.0.0 | runtime graph |
| `node_modules/@malept/cross-spawn-promise` | 2.0.0 | Apache-2.0 | dev |
| `node_modules/@malept/flatpak-bundler` | 0.4.0 | MIT | dev |
| `node_modules/@malept/flatpak-bundler/node_modules/fs-extra` | 9.1.0 | MIT | dev |
| `node_modules/@noble/hashes` | 1.8.0 | MIT | dev |
| `node_modules/@oxc-project/types` | 0.156.0 | MIT | dev |
| `node_modules/@peculiar/asn1-schema` | 2.11.1 | MIT | dev |
| `node_modules/@peculiar/json-schema` | 1.1.12 | MIT | dev |
| `node_modules/@peculiar/utils` | 2.0.3 | MIT | dev |
| `node_modules/@peculiar/webcrypto` | 1.7.2 | MIT | dev |
| `node_modules/@protobufjs/aspromise` | 1.1.2 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/base64` | 1.1.2 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/codegen` | 2.0.5 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/eventemitter` | 1.1.1 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/fetch` | 1.1.1 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/float` | 1.0.2 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/path` | 1.1.2 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/pool` | 1.1.0 | BSD-3-Clause | runtime graph |
| `node_modules/@protobufjs/utf8` | 1.1.2 | BSD-3-Clause | runtime graph |
| `node_modules/@rolldown/binding-android-arm-eabi` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-android-arm64` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-darwin-arm64` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-darwin-x64` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-freebsd-x64` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-arm-gnueabihf` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-arm64-gnu` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-arm64-musl` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-ppc64-gnu` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-s390x-gnu` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-x64-gnu` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-linux-x64-musl` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-openharmony-arm64` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-win32-arm64-msvc` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/binding-win32-x64-msvc` | 1.2.16 | MIT | dev, optional |
| `node_modules/@rolldown/pluginutils` | 1.0.1 | MIT | dev |
| `node_modules/@silvia-odwyer/photon-node` | 0.3.4 | Apache-2.0 | runtime graph |
| `node_modules/@sindresorhus/is` | 4.6.0 | MIT | dev |
| `node_modules/@smithy/core` | 3.38.1 | Apache-2.0 | runtime graph |
| `node_modules/@smithy/credential-provider-imds` | 4.5.2 | Apache-2.0 | runtime graph |
| `node_modules/@smithy/fetch-http-handler` | 5.8.0 | Apache-2.0 | runtime graph |
| `node_modules/@smithy/node-http-handler` | 4.12.1 | Apache-2.0 | runtime graph |
| `node_modules/@smithy/signature-v4` | 5.7.5 | Apache-2.0 | runtime graph |
| `node_modules/@smithy/types` | 4.19.0 | Apache-2.0 | runtime graph |
| `node_modules/@stablelib/base64` | 1.0.1 | MIT | runtime graph |
| `node_modules/@standard-schema/spec` | 1.1.0 | MIT | dev |
| `node_modules/@szmarczak/http-timer` | 4.0.6 | MIT | dev |
| `node_modules/@types/cacheable-request` | 6.0.3 | MIT | dev |
| `node_modules/@types/debug` | 4.1.13 | MIT | dev |
| `node_modules/@types/fs-extra` | 9.0.13 | MIT | dev |
| `node_modules/@types/http-cache-semantics` | 4.2.0 | MIT | dev |
| `node_modules/@types/keyv` | 3.1.4 | MIT | dev |
| `node_modules/@types/ms` | 2.1.0 | MIT | dev |
| `node_modules/@types/node` | 26.6.6 | MIT | runtime graph |
| `node_modules/@types/react` | 19.3.0 | MIT | runtime graph |
| `node_modules/@types/react-dom` | 19.3.0 | MIT | dev |
| `node_modules/@types/responselike` | 1.0.3 | MIT | dev |
| `node_modules/@types/retry` | 0.12.0 | MIT | runtime graph |
| `node_modules/@typescript/typescript-aix-ppc64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-darwin-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-darwin-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-freebsd-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-freebsd-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-arm` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-loong64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-mips64el` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-ppc64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-riscv64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-s390x` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-linux-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-netbsd-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-netbsd-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-openbsd-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-openbsd-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-sunos-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-win32-arm64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@typescript/typescript-win32-x64` | 7.0.2 | Apache-2.0 | dev, optional |
| `node_modules/@vitejs/plugin-react` | 6.2.1 | MIT | dev |
| `node_modules/@xmldom/xmldom` | 0.8.15 | MIT | dev |
| `node_modules/abbrev` | 4.0.0 | ISC | dev |
| `node_modules/agent-base` | 7.1.4 | MIT | runtime graph |
| `node_modules/ajv` | 8.20.0 | MIT | dev |
| `node_modules/ansi-regex` | 6.5.0 | MIT | dev |
| `node_modules/ansi-styles` | 6.2.3 | MIT | dev |
| `node_modules/app-builder-lib` | 26.18.0 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/@electron/get` | 3.1.0 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/@electron/get/node_modules/fs-extra` | 8.1.0 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/@electron/get/node_modules/semver` | 6.3.2 | ISC | dev |
| `node_modules/app-builder-lib/node_modules/ci-info` | 4.3.1 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/env-paths` | 2.2.1 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/jsonfile` | 4.0.0 | MIT | dev |
| `node_modules/app-builder-lib/node_modules/semver` | 7.7.4 | ISC | dev |
| `node_modules/app-builder-lib/node_modules/universalify` | 0.1.2 | MIT | dev |
| `node_modules/argparse` | 2.0.1 | Python-2.0 | dev |
| `node_modules/asn1js` | 3.1.0 | BSD-3-Clause | dev |
| `node_modules/async` | 3.2.6 | MIT | dev |
| `node_modules/async-exit-hook` | 2.0.1 | MIT | dev |
| `node_modules/asynckit` | 0.4.0 | MIT | dev |
| `node_modules/at-least-node` | 1.0.0 | ISC | dev |
| `node_modules/aws4` | 1.13.2 | MIT | dev |
| `node_modules/axios` | 1.21.0 | MIT | dev |
| `node_modules/axios/node_modules/agent-base` | 6.0.2 | MIT | dev |
| `node_modules/axios/node_modules/https-proxy-agent` | 5.0.1 | MIT | dev |
| `node_modules/balanced-match` | 4.0.4 | MIT | runtime graph |
| `node_modules/base64-js` | 1.5.1 | MIT | runtime graph |
| `node_modules/bignumber.js` | 9.3.1 | MIT | runtime graph |
| `node_modules/bluebird` | 3.7.2 | MIT | dev |
| `node_modules/boolean` | 3.2.0 | MIT | dev, optional |
| `node_modules/bowser` | 2.15.0 | MIT | runtime graph |
| `node_modules/brace-expansion` | 5.0.12 | MIT | runtime graph |
| `node_modules/buffer-equal-constant-time` | 1.0.1 | BSD-3-Clause | runtime graph |
| `node_modules/buffer-from` | 1.1.2 | MIT | dev |
| `node_modules/builder-util` | 26.16.0 | MIT | dev |
| `node_modules/builder-util-runtime` | 9.7.0 | MIT | dev |
| `node_modules/builder-util/node_modules/ansi-styles` | 4.3.0 | MIT | dev |
| `node_modules/builder-util/node_modules/chalk` | 4.1.2 | MIT | dev |
| `node_modules/builder-util/node_modules/supports-color` | 7.2.0 | MIT | dev |
| `node_modules/bytestreamjs` | 2.0.1 | BSD-3-Clause | dev |
| `node_modules/cacheable-lookup` | 5.0.4 | MIT | dev |
| `node_modules/cacheable-request` | 7.0.4 | MIT | dev |
| `node_modules/call-bind-apply-helpers` | 1.0.2 | MIT | dev |
| `node_modules/chalk` | 5.6.2 | MIT | dev |
| `node_modules/chownr` | 3.0.0 | BlueOak-1.0.0 | dev |
| `node_modules/chromium-pickle-js` | 0.2.0 | MIT | dev |
| `node_modules/ci-info` | 4.4.0 | MIT | dev |
| `node_modules/cliui` | 9.0.1 | ISC | dev |
| `node_modules/clone-response` | 1.0.3 | MIT | dev |
| `node_modules/color-convert` | 2.0.1 | MIT | dev |
| `node_modules/color-name` | 1.1.4 | MIT | dev |
| `node_modules/combined-stream` | 1.0.8 | MIT | dev |
| `node_modules/commander` | 5.1.0 | MIT | dev |
| `node_modules/compare-version` | 0.1.2 | MIT | dev |
| `node_modules/concat-map` | 0.0.1 | MIT | dev |
| `node_modules/concurrently` | 10.0.6 | MIT | dev |
| `node_modules/core-util-is` | 1.0.3 | MIT | dev |
| `node_modules/cross-dirname` | 0.1.0 | MIT | dev, optional |
| `node_modules/cross-env` | 10.1.0 | MIT | dev |
| `node_modules/cross-spawn` | 7.0.6 | MIT | runtime graph |
| `node_modules/cross-spawn/node_modules/isexe` | 2.0.0 | ISC | runtime graph |
| `node_modules/cross-spawn/node_modules/which` | 2.0.2 | ISC | runtime graph |
| `node_modules/csstype` | 3.2.3 | MIT | runtime graph |
| `node_modules/data-uri-to-buffer` | 4.0.1 | MIT | runtime graph |
| `node_modules/debug` | 4.4.3 | MIT | runtime graph |
| `node_modules/decompress-response` | 6.0.0 | MIT | dev |
| `node_modules/decompress-response/node_modules/mimic-response` | 3.1.0 | MIT | dev |
| `node_modules/defer-to-connect` | 2.0.1 | MIT | dev |
| `node_modules/define-data-property` | 1.1.4 | MIT | dev, optional |
| `node_modules/define-properties` | 1.2.1 | MIT | dev, optional |
| `node_modules/delayed-stream` | 1.0.0 | MIT | dev |
| `node_modules/detect-libc` | 2.1.2 | Apache-2.0 | dev |
| `node_modules/detect-node` | 2.1.0 | MIT | dev, optional |
| `node_modules/diff` | 8.0.4 | BSD-3-Clause | runtime graph |
| `node_modules/dir-compare` | 4.2.0 | MIT | dev |
| `node_modules/dir-compare/node_modules/balanced-match` | 1.0.2 | MIT | dev |
| `node_modules/dir-compare/node_modules/brace-expansion` | 1.1.21 | MIT | dev |
| `node_modules/dir-compare/node_modules/minimatch` | 3.1.5 | ISC | dev |
| `node_modules/dmg-builder` | 26.18.0 | MIT | dev |
| `node_modules/dotenv` | 16.6.1 | BSD-2-Clause | dev |
| `node_modules/dotenv-expand` | 11.0.7 | BSD-2-Clause | dev |
| `node_modules/dunder-proto` | 1.0.1 | MIT | dev |
| `node_modules/duplexer2` | 0.1.4 | BSD-3-Clause | dev |
| `node_modules/ecdsa-sig-formatter` | 1.0.11 | Apache-2.0 | runtime graph |
| `node_modules/ejs` | 3.1.10 | Apache-2.0 | dev |
| `node_modules/electron` | 45.2.2 | MIT | dev |
| `node_modules/electron-builder` | 26.18.0 | MIT | dev |
| `node_modules/electron-builder-squirrel-windows` | 26.18.0 | MIT | dev |
| `node_modules/electron-builder/node_modules/ansi-regex` | 5.0.1 | MIT | dev |
| `node_modules/electron-builder/node_modules/ansi-styles` | 4.3.0 | MIT | dev |
| `node_modules/electron-builder/node_modules/chalk` | 4.1.2 | MIT | dev |
| `node_modules/electron-builder/node_modules/cliui` | 8.0.1 | ISC | dev |
| `node_modules/electron-builder/node_modules/emoji-regex` | 8.0.0 | MIT | dev |
| `node_modules/electron-builder/node_modules/string-width` | 4.2.3 | MIT | dev |
| `node_modules/electron-builder/node_modules/strip-ansi` | 6.0.1 | MIT | dev |
| `node_modules/electron-builder/node_modules/supports-color` | 7.2.0 | MIT | dev |
| `node_modules/electron-builder/node_modules/wrap-ansi` | 7.0.0 | MIT | dev |
| `node_modules/electron-builder/node_modules/yargs` | 17.7.3 | MIT | dev |
| `node_modules/electron-builder/node_modules/yargs-parser` | 21.1.1 | ISC | dev |
| `node_modules/electron-publish` | 26.18.0 | MIT | dev |
| `node_modules/electron-publish/node_modules/ansi-styles` | 4.3.0 | MIT | dev |
| `node_modules/electron-publish/node_modules/chalk` | 4.1.2 | MIT | dev |
| `node_modules/electron-publish/node_modules/supports-color` | 7.2.0 | MIT | dev |
| `node_modules/electron-winstaller` | 5.4.0 | MIT | dev |
| `node_modules/electron-winstaller/node_modules/fs-extra` | 7.0.1 | MIT | dev |
| `node_modules/electron-winstaller/node_modules/jsonfile` | 4.0.0 | MIT | dev |
| `node_modules/electron-winstaller/node_modules/universalify` | 0.1.2 | MIT | dev |
| `node_modules/electron/node_modules/@types/node` | 24.19.2 | MIT | dev |
| `node_modules/electron/node_modules/undici-types` | 7.24.6 | MIT | dev |
| `node_modules/emoji-regex` | 10.6.0 | MIT | dev |
| `node_modules/end-of-stream` | 1.4.5 | MIT | dev |
| `node_modules/env-paths` | 3.0.0 | MIT | dev |
| `node_modules/err-code` | 2.0.3 | MIT | dev |
| `node_modules/es-define-property` | 1.0.1 | MIT | dev |
| `node_modules/es-errors` | 1.3.0 | MIT | dev |
| `node_modules/es-object-atoms` | 1.1.2 | MIT | dev |
| `node_modules/es-set-tostringtag` | 2.1.0 | MIT | dev |
| `node_modules/es6-error` | 4.1.1 | MIT | dev, optional |
| `node_modules/escalade` | 3.2.0 | MIT | dev |
| `node_modules/escape-string-regexp` | 4.0.0 | MIT | dev, optional |
| `node_modules/exponential-backoff` | 3.1.3 | Apache-2.0 | dev |
| `node_modules/extend` | 3.0.2 | MIT | runtime graph |
| `node_modules/fast-deep-equal` | 3.1.3 | MIT | dev |
| `node_modules/fast-sha256` | 1.3.0 | Unlicense | runtime graph |
| `node_modules/fast-uri` | 3.1.9 | BSD-3-Clause | dev |
| `node_modules/fdir` | 6.5.0 | MIT | dev |
| `node_modules/fetch-blob` | 3.2.0 | MIT | runtime graph |
| `node_modules/filelist` | 1.0.6 | Apache-2.0 | dev |
| `node_modules/filelist/node_modules/balanced-match` | 1.0.2 | MIT | dev |
| `node_modules/filelist/node_modules/brace-expansion` | 2.1.7 | MIT | dev |
| `node_modules/filelist/node_modules/minimatch` | 5.1.9 | ISC | dev |
| `node_modules/follow-redirects` | 1.16.2 | MIT | dev |
| `node_modules/form-data` | 4.0.6 | MIT | dev |
| `node_modules/formdata-polyfill` | 4.0.10 | MIT | runtime graph |
| `node_modules/fs-extra` | 10.1.0 | MIT | dev |
| `node_modules/fs.realpath` | 1.0.0 | ISC | dev |
| `node_modules/fsevents` | 2.3.3 | MIT | dev, optional |
| `node_modules/function-bind` | 1.1.2 | MIT | dev |
| `node_modules/gaxios` | 7.3.1 | Apache-2.0 | runtime graph |
| `node_modules/gcp-metadata` | 8.1.2 | Apache-2.0 | runtime graph |
| `node_modules/get-caller-file` | 2.0.5 | ISC | dev |
| `node_modules/get-east-asian-width` | 1.7.0 | MIT | dev |
| `node_modules/get-intrinsic` | 1.3.0 | MIT | dev |
| `node_modules/get-proto` | 1.0.1 | MIT | dev |
| `node_modules/get-stream` | 5.2.0 | MIT | dev |
| `node_modules/glob` | 7.2.3 | ISC | dev |
| `node_modules/glob/node_modules/balanced-match` | 1.0.2 | MIT | dev |
| `node_modules/glob/node_modules/brace-expansion` | 1.1.21 | MIT | dev |
| `node_modules/glob/node_modules/minimatch` | 3.1.5 | ISC | dev |
| `node_modules/global-agent` | 3.0.0 | BSD-3-Clause | dev, optional |
| `node_modules/globalthis` | 1.0.4 | MIT | dev, optional |
| `node_modules/google-auth-library` | 10.9.1 | Apache-2.0 | runtime graph |
| `node_modules/google-logging-utils` | 1.1.3 | Apache-2.0 | runtime graph |
| `node_modules/gopd` | 1.2.0 | MIT | dev |
| `node_modules/got` | 11.8.6 | MIT | dev |
| `node_modules/graceful-fs` | 4.2.11 | ISC | runtime graph |
| `node_modules/grok-mermaid` | 0.2.3 | Apache-2.0 | runtime graph |
| `node_modules/has-flag` | 4.0.0 | MIT | dev |
| `node_modules/has-property-descriptors` | 1.0.2 | MIT | dev, optional |
| `node_modules/has-symbols` | 1.1.0 | MIT | dev |
| `node_modules/has-tostringtag` | 1.0.2 | MIT | dev |
| `node_modules/hasown` | 2.0.4 | MIT | dev |
| `node_modules/highlight.js` | 10.7.3 | BSD-3-Clause | runtime graph |
| `node_modules/hosted-git-info` | 4.1.0 | ISC | dev |
| `node_modules/http-cache-semantics` | 4.3.0 | BSD-2-Clause | dev |
| `node_modules/http-proxy-agent` | 7.0.2 | MIT | dev |
| `node_modules/http2-wrapper` | 1.0.3 | MIT | dev |
| `node_modules/https-proxy-agent` | 7.0.6 | MIT | runtime graph |
| `node_modules/ignore` | 7.0.8 | MIT | runtime graph |
| `node_modules/inflight` | 1.0.6 | ISC | dev |
| `node_modules/inherits` | 2.0.4 | ISC | dev |
| `node_modules/is-fullwidth-code-point` | 3.0.0 | MIT | dev |
| `node_modules/isarray` | 1.0.0 | MIT | dev |
| `node_modules/isbinaryfile` | 5.0.7 | MIT | dev |
| `node_modules/isexe` | 3.1.5 | BlueOak-1.0.0 | dev |
| `node_modules/jake` | 10.9.4 | Apache-2.0 | dev |
| `node_modules/jiti` | 2.7.0 | MIT | runtime graph |
| `node_modules/joi` | 18.3.2 | BSD-3-Clause | dev |
| `node_modules/js-yaml` | 4.3.2 | MIT | dev |
| `node_modules/json-bigint` | 1.0.0 | MIT | runtime graph |
| `node_modules/json-buffer` | 3.0.1 | MIT | dev |
| `node_modules/json-schema-to-ts` | 3.1.1 | MIT | runtime graph |
| `node_modules/json-schema-traverse` | 1.0.0 | MIT | dev |
| `node_modules/json-stringify-safe` | 5.0.1 | ISC | dev, optional |
| `node_modules/json5` | 2.2.3 | MIT | dev |
| `node_modules/jsonfile` | 6.2.1 | MIT | dev |
| `node_modules/jwa` | 2.0.1 | MIT | runtime graph |
| `node_modules/jws` | 4.0.1 | MIT | runtime graph |
| `node_modules/keyv` | 4.5.4 | MIT | dev |
| `node_modules/lazy-val` | 1.0.5 | MIT | dev |
| `node_modules/lightningcss` | 1.33.0 | MPL-2.0 | dev |
| `node_modules/lightningcss-android-arm64` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-darwin-arm64` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-darwin-x64` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-freebsd-x64` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-linux-arm-gnueabihf` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-linux-arm64-gnu` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-linux-arm64-musl` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-linux-x64-gnu` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-linux-x64-musl` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-win32-arm64-msvc` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lightningcss-win32-x64-msvc` | 1.33.0 | MPL-2.0 | dev, optional |
| `node_modules/lodash` | 4.18.1 | MIT | dev |
| `node_modules/long` | 5.3.2 | Apache-2.0 | runtime graph |
| `node_modules/lowercase-keys` | 2.0.0 | MIT | dev |
| `node_modules/lru-cache` | 6.0.0 | ISC | dev |
| `node_modules/lucide-react` | 1.68.0 | ISC | runtime graph |
| `node_modules/marked` | 18.0.11 | MIT | runtime graph |
| `node_modules/marked-cjk-friendly` | 0.1.2 | MIT | runtime graph |
| `node_modules/matcher` | 3.0.0 | MIT | dev, optional |
| `node_modules/math-intrinsics` | 1.1.0 | MIT | dev |
| `node_modules/mime` | 2.6.0 | MIT | dev |
| `node_modules/mime-db` | 1.52.0 | MIT | dev |
| `node_modules/mime-types` | 2.1.35 | MIT | dev |
| `node_modules/mimic-response` | 1.0.1 | MIT | dev |
| `node_modules/minimatch` | 10.2.6 | BlueOak-1.0.0 | dev |
| `node_modules/minimist` | 1.2.8 | MIT | dev |
| `node_modules/minipass` | 7.1.3 | BlueOak-1.0.0 | dev |
| `node_modules/minizlib` | 3.1.0 | MIT | dev |
| `node_modules/mkdirp` | 0.5.6 | MIT | dev |
| `node_modules/ms` | 2.1.3 | MIT | runtime graph |
| `node_modules/nanoid` | 3.3.20 | MIT | dev |
| `node_modules/node-abi` | 4.40.0 | MIT | dev |
| `node_modules/node-api-version` | 0.2.1 | MIT | dev |
| `node_modules/node-domexception` | 1.0.0 | MIT | runtime graph |
| `node_modules/node-fetch` | 3.3.2 | MIT | runtime graph |
| `node_modules/node-gyp` | 12.4.0 | MIT | dev |
| `node_modules/node-gyp/node_modules/env-paths` | 2.2.1 | MIT | dev |
| `node_modules/node-gyp/node_modules/isexe` | 4.0.0 | BlueOak-1.0.0 | dev |
| `node_modules/node-gyp/node_modules/undici` | 6.29.1 | MIT | dev |
| `node_modules/node-gyp/node_modules/which` | 6.0.1 | ISC | dev |
| `node_modules/node-int64` | 0.4.0 | MIT | dev |
| `node_modules/nopt` | 9.0.0 | ISC | dev |
| `node_modules/normalize-url` | 6.1.0 | MIT | dev |
| `node_modules/object-keys` | 1.1.1 | MIT | dev, optional |
| `node_modules/once` | 1.4.0 | ISC | dev |
| `node_modules/openai` | 7.19.0 | Apache-2.0 | runtime graph |
| `node_modules/p-cancelable` | 2.1.1 | MIT | dev |
| `node_modules/p-limit` | 3.1.0 | MIT | dev |
| `node_modules/p-retry` | 4.6.2 | MIT | runtime graph |
| `node_modules/p-retry/node_modules/retry` | 0.13.1 | MIT | runtime graph |
| `node_modules/partial-json` | 0.1.7 | MIT | runtime graph |
| `node_modules/path-is-absolute` | 1.0.1 | MIT | dev |
| `node_modules/path-key` | 3.1.1 | MIT | runtime graph |
| `node_modules/pe-library` | 0.4.1 | MIT | dev |
| `node_modules/picocolors` | 1.1.1 | ISC | dev |
| `node_modules/picomatch` | 4.0.7 | MIT | dev |
| `node_modules/pkijs` | 3.4.3 | BSD-3-Clause | dev |
| `node_modules/playwright` | 1.64.1 | Apache-2.0 | dev |
| `node_modules/playwright-core` | 1.64.1 | Apache-2.0 | dev |
| `node_modules/plist` | 3.1.0 | MIT | dev |
| `node_modules/postcss` | 8.5.32 | MIT | dev |
| `node_modules/postject` | 1.0.0-alpha.6 | MIT | dev, optional |
| `node_modules/postject/node_modules/commander` | 9.5.0 | MIT | dev, optional |
| `node_modules/proc-log` | 6.1.0 | ISC | dev |
| `node_modules/process-nextick-args` | 2.0.1 | MIT | dev |
| `node_modules/progress` | 2.0.3 | MIT | dev |
| `node_modules/promise-retry` | 2.0.1 | MIT | dev |
| `node_modules/proper-lockfile` | 4.1.2 | MIT | runtime graph |
| `node_modules/protobufjs` | 7.6.6 | BSD-3-Clause | runtime graph |
| `node_modules/proxy-agent-negotiate` | 1.1.0 | MIT | runtime graph |
| `node_modules/proxy-from-env` | 2.1.0 | MIT | dev |
| `node_modules/pump` | 3.0.4 | MIT | dev |
| `node_modules/pvtsutils` | 1.3.6 | MIT | dev |
| `node_modules/pvutils` | 1.2.0 | MIT | dev |
| `node_modules/quick-lru` | 5.1.1 | MIT | dev |
| `node_modules/quickjs-wasi` | 3.6.2 | MIT | runtime graph |
| `node_modules/react` | 19.3.1 | MIT | runtime graph |
| `node_modules/react-dom` | 19.3.1 | MIT | runtime graph |
| `node_modules/read-binary-file-arch` | 1.0.6 | MIT | dev |
| `node_modules/readable-stream` | 2.3.8 | MIT | dev |
| `node_modules/require-directory` | 2.1.1 | MIT | dev |
| `node_modules/require-from-string` | 2.0.2 | MIT | dev |
| `node_modules/resedit` | 1.7.2 | MIT | dev |
| `node_modules/resolve-alpn` | 1.2.1 | MIT | dev |
| `node_modules/responselike` | 2.0.1 | MIT | dev |
| `node_modules/retry` | 0.12.0 | MIT | runtime graph |
| `node_modules/rimraf` | 2.6.3 | ISC | dev |
| `node_modules/roarr` | 2.15.4 | BSD-3-Clause | dev, optional |
| `node_modules/rolldown` | 1.2.16 | MIT | dev |
| `node_modules/rxjs` | 7.8.2 | Apache-2.0 | dev |
| `node_modules/safe-buffer` | 5.1.2 | MIT | runtime graph |
| `node_modules/sanitize-filename` | 1.6.4 | WTFPL OR ISC | dev |
| `node_modules/sax` | 1.6.1 | BlueOak-1.0.0 | dev |
| `node_modules/scheduler` | 0.28.0 | MIT | runtime graph |
| `node_modules/semver` | 7.8.6 | ISC | dev |
| `node_modules/semver-compare` | 1.0.0 | MIT | dev, optional |
| `node_modules/serialize-error` | 7.0.1 | MIT | dev, optional |
| `node_modules/shebang-command` | 2.0.0 | MIT | runtime graph |
| `node_modules/shebang-regex` | 3.0.0 | MIT | runtime graph |
| `node_modules/shell-quote` | 1.12.0 | MIT | dev |
| `node_modules/signal-exit` | 3.0.7 | ISC | runtime graph |
| `node_modules/simple-update-notifier` | 2.0.0 | MIT | dev |
| `node_modules/source-map` | 0.6.1 | BSD-3-Clause | dev |
| `node_modules/source-map-js` | 1.2.2 | BSD-3-Clause | dev |
| `node_modules/source-map-support` | 0.5.21 | MIT | dev |
| `node_modules/sprintf-js` | 1.1.3 | BSD-3-Clause | dev, optional |
| `node_modules/standardwebhooks` | 1.1.1 | MIT | runtime graph |
| `node_modules/stat-mode` | 1.0.0 | MIT | dev |
| `node_modules/string-width` | 7.2.0 | MIT | dev |
| `node_modules/string_decoder` | 1.1.1 | MIT | dev |
| `node_modules/strip-ansi` | 7.2.0 | MIT | dev |
| `node_modules/sumchecker` | 3.0.1 | Apache-2.0 | dev |
| `node_modules/supports-color` | 10.2.2 | MIT | dev |
| `node_modules/tar` | 7.5.22 | BlueOak-1.0.0 | dev |
| `node_modules/tar/node_modules/yallist` | 5.0.0 | BlueOak-1.0.0 | dev |
| `node_modules/temp` | 0.9.4 | MIT | dev |
| `node_modules/temp-file` | 3.4.0 | MIT | dev |
| `node_modules/tiny-async-pool` | 1.3.0 | MIT | dev |
| `node_modules/tiny-async-pool/node_modules/semver` | 5.7.3 | ISC | dev |
| `node_modules/tinyglobby` | 0.2.17 | MIT | dev |
| `node_modules/tmp` | 0.2.7 | MIT | dev |
| `node_modules/tmp-promise` | 3.0.3 | MIT | dev |
| `node_modules/tree-kill` | 1.2.2 | MIT | dev |
| `node_modules/truncate-utf8-bytes` | 1.0.2 | WTFPL | dev |
| `node_modules/ts-algebra` | 2.0.0 | MIT | runtime graph |
| `node_modules/tslib` | 2.9.1 | 0BSD | runtime graph |
| `node_modules/type-fest` | 0.13.1 | (MIT OR CC0-1.0) | dev, optional |
| `node_modules/typebox` | 1.3.27 | MIT | runtime graph |
| `node_modules/typescript` | 7.0.2 | Apache-2.0 | dev |
| `node_modules/undici` | 7.30.1 | MIT | optional |
| `node_modules/undici-types` | 8.9.0 | MIT | runtime graph |
| `node_modules/universalify` | 2.0.1 | MIT | dev |
| `node_modules/unzipper` | 0.12.5 | MIT | dev |
| `node_modules/unzipper/node_modules/fs-extra` | 11.3.1 | MIT | dev |
| `node_modules/utf8-byte-length` | 1.0.5 | (WTFPL OR MIT) | dev |
| `node_modules/util-deprecate` | 1.0.2 | MIT | dev |
| `node_modules/vite` | 8.3.5 | MIT | dev |
| `node_modules/wait-on` | 9.5.1 | MIT | dev |
| `node_modules/web-streams-polyfill` | 3.3.3 | MIT | runtime graph |
| `node_modules/webcrypto-core` | 1.9.2 | MIT | dev |
| `node_modules/which` | 5.0.0 | ISC | dev |
| `node_modules/wrap-ansi` | 9.0.2 | MIT | dev |
| `node_modules/wrappy` | 1.0.2 | ISC | dev |
| `node_modules/ws` | 8.22.1 | MIT | runtime graph |
| `node_modules/xmlbuilder` | 15.1.1 | MIT | dev |
| `node_modules/y18n` | 5.0.8 | ISC | dev |
| `node_modules/yallist` | 4.0.0 | ISC | dev |
| `node_modules/yaml` | 2.9.0 | ISC | runtime graph |
| `node_modules/yargs` | 18.0.0 | MIT | dev |
| `node_modules/yargs-parser` | 22.0.0 | ISC | dev |
| `node_modules/yocto-queue` | 0.1.0 | MIT | dev |

</details>

## Sources

- [E] `/Users/mukul/Documents/CDAO/FleetHarness`, `mvp`, `f72c5dc15aa6c34d2b9080c1c0b87742230cc16e`: source files cited above, `package.json`, `package-lock.json`, `src/studio/fonts/OFL.txt`, docs and tests.
- [P] [[Event/Rules]], [[Event/Judging]], [[Sprint/Submission-Checklist]] and [[Research/00-Brief]].
- [E] [[Research/FleetHarness-MVP/What-Exists]], [[Research/Council/Officer/Decision]], [[Research/Council/Builder/Decision]] and [[Research/Council/Judge/Decision]].
- [V] https://pi.dev/docs/latest/sdk
- [V] https://pi.dev/docs/latest/models
- [V] https://pi.dev/docs/latest/providers
- [V] https://developers.openai.com/api/reference/overview
- [V] https://github.com/earendil-works/pi/blob/main/LICENSE
- [V] https://github.com/sinclairzx81/typebox/blob/main/license
- [V] https://github.com/lucide-icons/lucide/blob/main/LICENSE
- [P] Captured event source, not freshly authenticated: https://cdao.hackathon.maximus.com/event/norfolk
