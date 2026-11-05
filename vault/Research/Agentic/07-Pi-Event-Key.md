---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Prove event-key inference and a harmless tool round trip through the actual Pi adapter before a build starts."
---

# A reliable Pi event-key path

## Bottom line

[R] Must if another FleetHarness build is attempted: prove one real inference and harmless tool round trip through Pi with the owner-entered event key. A configured badge, a model list or successful use in a separate coding session is not that proof. [R] Add a small provider preflight and explicit runtime configuration, preserving Dan's backend selector and phase flow. Cut automatic backend substitution, personal sign-in fallback and speculative model-catalog rewrites.

## Current evidence

[E, local source at 50fcaea] `electron/main.ts::fleet:settings` accepts a selected Pi model, calls `setRuntimeApiKey`, optionally stores an encrypted credential, and returns bootstrap state. Bootstrap reports connected when `hasConfiguredAuth` is true. `FleetBackend.start` checks a runtime model and configured auth before reserving a run; it does not make a separate capability probe first.

[E] `FleetBackend.init` creates `ModelRuntime` with `allowModelNetwork: false` and no explicit app-local auth/model paths. `tests/pi-sdk.test.mjs` demonstrates explicit temporary auth/model paths, a registered fixture provider, actual Pi SDK inference against a local fake endpoint, 503 recovery, 401 failure and stalled-response cancellation. This is source evidence of a useful test seam, not event-key entitlement or execution evidence. The fixture still makes HTTP inference requests while that flag is false, so the flag must not be described as disabling model inference networking.

[E] The current Codex adapter requires a ChatGPT account; main rejects a nonempty API key for that backend. The separate successful event-key session in [[Team/Now]] does not establish compatibility through FleetHarness's Pi model catalog. No event key was read, entered or used here. Pi is pinned to `@earendil-works/pi-coding-agent` 1.5.0 in the reviewed commit.

## Smallest change and exact files

| File | Small proposed change [R] |
| --- | --- |
| New `electron/pi-provider.ts` | Own explicit app-local runtime configuration, provider identity, credential generation counter and redacted probe outcomes. Never return key material through state or logs. |
| New `electron/provider-preflight.ts` | Short, bounded no-file-write inference and harmless pure-tool challenge using the same selected model, transport and event-key route as a build. |
| `electron/pi-backend.ts::init/start/agent` | Reuse one approved provider profile, run preflight before workspace creation, and freeze it for the run. Abort or fail before intake on error. |
| `electron/main.ts::fleet:settings/bootstrap` | Validate configuration separately from verified inference; invalidate proof on key/provider/model changes. Keep session-only default. Use existing status/error strings. |
| Existing `tests/pi-sdk.test.mjs`, new `tests/provider-preflight.test.mjs` | Extend fixture coverage for tool protocol, error classification, revocation and credential isolation. |
| New `scripts/check-pi-event.mjs`, existing `docs/desktop.md`, `docs/pipeline.md` | Optional operator-driven smoke procedure and redacted evidence template. No keys in arguments, fixtures or source; the owner enters credentials through the approved existing path. |

[R] Keep the script optional: the smallest patch invokes preflight from Start, reusing existing settings and error display. If a script cannot share the same controlled credential path without exporting secrets or adding a competing auth mechanism, omit it and test through the app. Nothing here requires a new frontend control.

## Provider configuration and probe sequence

1. [R] The owner selects Pi and enters their own event credential with remembering disabled. Freeze provider ID, model ID, API transport family and approved endpoint origin for the run. Never derive an endpoint from generated requirements or arbitrary model output. Do not migrate personal credentials.
2. [R] Explicitly isolate Pi's auth/model configuration under the application profile. The test uses `authPath`, `modelsPath`, `modelsStorePath` and `refreshOnCreate`; production should deliberately choose these rather than rely on user defaults. Verify environment-auth precedence in the pinned SDK and reject unintended ambient provider credentials. Do not inspect real personal credential stores to test this; use synthetic canaries in a disposable profile.
3. [R] Distinguish missing local catalog entry from unavailable provider model. Optional owner-authorized model discovery can help diagnose the latter. A catalog/list response does not prove generation or tool calling. If the event model is missing locally, register only one reviewed profile using the SDK's observed `registerProvider` seam, after confirming its actual transport, context/output limits and supported reasoning settings. Do not invent metadata or translate an ID into an older model silently.
4. [R] Before creating a build workspace, send a short synthetic prompt through the actual Pi session path. Require one harmless `fleet_probe_echo` tool call and a final matching response. The tool only echoes a host nonce; it cannot read files or spawn work. Verify streaming, tool arguments/results and completion. Use a proposed 30-second deadline and the run's shared attempt/token policy. The adapter's current `thinkingLevel: 'medium'` must be supported or explicitly adjusted in this provider profile, not discovered after a long build.
5. [R] Record only provider/model identifiers, profile version, transport, endpoint origin without query credentials, timestamp, elapsed time, success/error class, safe request ID if exposed and usage or unknown. Redact before errors reach bootstrap, logs, session artifacts or smoke reports. Never print request headers or raw credential-bearing errors.
6. [R] Retain successful preflight in memory for a short proposed five-minute interval, bound to the runtime credential-generation counter and exact provider profile. Invalidate on reconnect, model/endpoint change, restart, expiry or provider error. Do not hash/store the key as a cache identifier. A canceled preflight cannot start the run later.

[V] The official API reference describes bearer credentials, secret handling and request IDs for diagnosis. It documents model listing as availability/basic model information. [R] The stronger inference/tool proof above is a design requirement, not a claim made by the model-list endpoint. Sources: https://developers.openai.com/api/reference/overview and https://developers.openai.com/api/reference/resources/models/methods/list, read 2026-11-04.

## Errors and human action

| Observation | Host response [R] |
| --- | --- |
| No local model/unsupported transport | Fail before build; technical owner verifies one supported profile. No guessed model, endpoint or quota. |
| Authentication rejected | No repeated retry; ask the owner to reconnect through existing settings. Never request the key in chat or logs. |
| Model inaccessible or permission denied | Record redacted category; owner checks event entitlement. Do not switch to personal login or another provider. |
| Quota exhausted | Stop and report operator action required; retry cannot repair entitlement. |
| Transient rate limit/server failure | At most a bounded retry within remaining wall time and attempt budget; honor a delay only if budget permits. |
| Timeout, aborted stream or malformed tool protocol | Cancel and invalidate preflight; no intake workspace or partial success badge. |
| Text succeeds but tool round trip fails | Inference works, agent capability unverified; do not call the build route ready. |

## Proof to require

[R] Extend the existing local fixture tests for good text/tool response, no tool call, malformed arguments, 401/permission/model error, transient 503, quota failure, delayed stream, retries, cancellation and stale profile. Use a synthetic secret canary and assert absence from state, stdout, logs, session JSONL and artifacts. Simulate a conflicting environment credential and prove the owner-selected runtime credential is the only one used without exposing either value.

[R] Then have the key owner perform the real probe in the approved event profile. Record commit, Pi version, selected model/provider, redacted outcome and tool round trip. Follow with one bounded tiny synthetic build and independent acceptance. These are separate gates: successful probe does not establish complete generation, artifact quality or offline app behavior. If event entitlement cannot be proved within the plan's provider timebox, use the agreed fallback and report the actual route.

## Risk and relationship to Dan's latest change

[R] Preserve `50fcaea`'s README follow-up, model selection, current SDK pin and executable download. Make failed preflight stop before any of the five agent stages, improving diagnosis without frontend changes. Dan's fixture-provider and README tests remain regression coverage; do not replace them with a live paid test in the default suite. Executable use still requires no model key; packaging and generation are different activities.

[A] A bounded preflight and fixture proof are roughly 1 to 2 hours if the selected event model already works in Pi. A single reviewed missing-model profile can add 1 to 2 hours; if transport support requires SDK migration, cut that migration for Thursday. Actual entitlement, supported event model metadata, runtime credential precedence and live cost remain unverified. The blocked documentation skill was not applied; see [[Research/Agentic/Review-Log]].

## Sources

[E, final relay reconciliation] `631849f` later consolidated the frontend. A pinned diff shows no changes from `50fcaea` in `electron/`, `harness/`, `skills/`, `shared/` or the dependency lock, so this design's backend file map remains applicable. Use the retained unified desktop path in [[Research/Agentic/Run-Readiness-50fcaea]]; do not restore removed Studio/Workbench interfaces. All implementation remains deferred pending allocation.

- [E] Local source: https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe, `electron/pi-backend.ts`, `main.ts`, `codex-session.ts`, `tests/pi-sdk.test.mjs`, `package.json`.
- [V] https://developers.openai.com/api/reference/overview
- [V] https://developers.openai.com/api/reference/resources/models/methods/list
- [E] [[Team/Now]], [[Research/Plan/Plan]], [[Research/Plan/Test-Results]].
- [R] [[Research/Agentic/03-Stop-and-Supervision]], [[Research/Agentic/06-Run-Budgets]].
