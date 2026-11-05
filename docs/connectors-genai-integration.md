Connectors and GenAI.mil integration, 2026-11-05

Applied the connector merge over 9a54042 and the 12-file GenAI.mil delta from astra-c5 commit 10034ee against refs/f/combined. The working tree has no conflict markers. Repository metadata is unchanged, so tests/codex.test.mjs remains unmerged in the index until the overseer stages it.

Both connector selection and GenAI.mil use the existing backend lifecycle. Main-process startup initializes both services and passes both into FleetBackend. GenAI.mil adds encrypted configuration, model discovery, a Pi Chat Completions transport, validated unlock links, retry explanations, IPC, frontend tabs and the incoming model-selector smoke changes. ChatGPT and API-key sign-in remain separate existing routes. No live service or model request was made.

GenAI.mil saves use atomicHostWrite. Redaction combines the incoming credentialStatus exception with the filename-keyed repair-baseline exception from 9a54042. Actual credential values remain redacted everywhere. Connector and provider errors now have explicit plain-error mappings, with the error inventory extended and all coverage assertions retained.

The process sweep, verification, judge, storage and quality implementations are unchanged from 9a54042. Existing preflight, preview-start cancellation, verified-source binding, guarded resume, cleanup and approval gates remain. No execution sandbox was introduced.

Observed validation:

- node node_modules/typescript/bin/tsc --noEmit: passed.
- node node_modules/typescript/bin/tsc -p electron/tsconfig.json: passed.
- node node_modules/typescript/bin/tsc -p harness/tsconfig.json: passed.
- tests/connectors-core.test.mjs: 36 passed.
- tests/genai-mil.test.mjs: 20 passed, including the new combined IPC regression.
- tests/codex.test.mjs: 26 passed, excluding the complete browser and CLI workflows that require unavailable native paths.
- tests/codex-key.test.mjs: 7 passed.
- tests/plain-errors.test.mjs: 16 passed.
- tests/secrets.test.mjs: 10 passed.
- tests/lifecycle.test.mjs: 27 passed, excluding native orphan discovery.
- tests/smoke-fixture-contract.test.mjs: 5 passed.
- Eight edited smoke scripts passed node --check. git diff --check passed.

This is 147 distinct passing tests. Temporary test files stayed in this checkout. Receipts are in .tmp/connectors-genai-tests.log, .tmp/connectors-codex-tests.log, .tmp/genai-followup-tests.log, .tmp/genai-lifecycle-tests.log and .tmp/genai-smoke-contract-tests.log.

Test and smoke adaptations, with no weakened assertions:

- tests/codex.test.mjs keeps the existing 90-second workflow deadline and incoming explanatory comment. Neither workflow assertion changed.
- tests/codex-key.test.mjs resolves the newly imported tab component and selects the API key tab before exercising the original password, button, clearing, success and rejection assertions.
- tests/helpers/main-harness.mjs exposes the actual connector IPC registration and GenAI.mil identifiers, plus injectable startup services. Lifecycle assertions are unchanged. The combined IPC regression uses the real connector service, GenAI.mil provider and main handlers with synthetic encryption and model responses.
- tests/plain-errors.test.mjs refreshes reviewed producer signatures and includes the new imported modules. Unknown-error and mutation rejection assertions are unchanged.
- scripts/smoke-model-selector.mjs retains the incoming four-tab assertions and updates the active-work refusal to the exact current message.
- scripts/smoke-chatgpt.mjs changes selected-radio assertions to equivalent selected-tab assertions, preserves disabled controls and checks both additional tabs. Keyboard navigation now checks all four tabs. Its heading and refusal text match the current account UI and API-key route.
- scripts/smoke-connectors.mjs, smoke-brief-data.mjs, smoke-conversation.mjs, smoke-electron.mjs, smoke-journey.mjs and smoke-system-design.mjs select the Other providers tab instead of the removed Pi radio control. Their assertions are unchanged.

Frontend files ModelSettings.tsx, GenAiMilTab.tsx and model-settings.css match astra-c5 exactly. Connector frontend changes remain as merged. No additional frontend lines were changed.

Not run here: native ps discovery, Chrome/Electron GUI smokes, the two complete Codex workflows, native orphan cleanup and OS keychain checks. The restricted sandbox blocks those paths. Synthetic encryption, fake HTTP/model responses and injected Electron transport do not prove native keychain, browser or live-service behavior. The overseer must run these checks outside the sandbox. No dependencies are missing for the checks run here.
