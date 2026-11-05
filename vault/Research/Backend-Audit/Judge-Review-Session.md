---
type: session
status: complete
owner: mukul
updated: 2026-11-05
summary: "Judge advice, explicit gap acceptance and readiness deadline repair."
---

[P] Requested: route negative or unavailable judgments to review, record explicit acceptance, calibrate human-only steps, and raise readiness timeout to 15 seconds.

[E] Tools: local shell, ripgrep, Git read-only inspection, Python 3 for local edits and patch editing. Validation used the existing Node 26.0.0 runtime, TypeScript 7.0.2 and Vite 8.3.5, provided by their respective public projects. No new dependency, dataset, outside service or live model call was used. Synthetic fixtures only.

[E] Friction: vault writes and its tool ledger helper are outside permitted access. This checkout holds the session and disclosure note for transfer by the owner. Native ps, sandbox-exec and Chrome execution are unavailable in this sandbox. The external overseer owns native suite execution.

[E] Prior work: current source has judge repairs and immutable verification records, but final NOT verdicts still fail the run. Existing automatic test, browser, cleanup and source identity gates are retained.

[E] Done: negative and unavailable judgments now reach review after passing automatic checks. Each approval needs fresh explicit acceptance of non-satisfactory judgment gaps. The approval and exported review.json retain those gaps, and DELIVERY.md describes the acceptance. Human-only steps are separate from build gaps. The production readiness budget is 15 seconds.

[E] Verified: both TypeScript targets, the production UI build, script syntax and diff whitespace checks pass. Across the selected regression files, 204 distinct tests passed, eight clean-runtime checks failed in this environment, and one native process test skipped. The eight failures occur when clean-runtime preparation uses the only writable temporary location under the repository and finds an ambient node_modules ancestor. The guard and assertions are unchanged. An intermediate test-fixture regression that modified an issued report was corrected; the receipt and redaction tests pass with the original assertions.

[E] Boundaries: synthetic orchestration tests replace model sessions, readiness probes and process discovery. They prove state transitions and approval records, not native readiness, process cleanup, browser journeys or live judgment quality. No Chrome smoke or full native suite was run here. The npm build wrapper exited early; the direct Node entrypoints compiled both targets and built the UI successfully.

[R] Next: the overseer runs the native suite and scripts/smoke-quality.mjs outside the sandbox. The smoke script now covers gap visibility, explicit acceptance, change-request prefilling, human steps, Home's existing Needs review label and consent reset. Transfer this note to the vault and update Team/Now.md from a permitted session.

[E] Frontend changes: only src/ReviewFlow.tsx changed. Every added or replaced final line is listed below. The replaced original lines were 4, 73 and 82; all other listed lines are additions. Home already uses Needs review and obtains Review build from the corrected shared journey state.

| Final line | Change |
| --- | --- |
| 4 | Import judge acceptance and gap helpers. |
| 43 | Hold fresh consent in component state. |
| 50 | Determine whether gap acceptance is required. |
| 51 | Read gaps or the missing-judgment explanation. |
| 52 | Read steps for a person. |
| 53 | Bind consent to this run, evidence, judgment and approval. |
| 54 | Check that consent matches that identity. |
| 79 | Continue the existing inspection requirement into the new gate. |
| 80 | Require explicit gap acceptance before approval. |
| 89 | Pass the explicit acceptance flag through the bridge. |
| 108 | Open the independent-check section using an existing class. |
| 109 | Display the gap count. |
| 110 | Display every requirement, evidence and fix as text. |
| 111 | Display the required acceptance checkbox. |
| 112 | Prefill the existing change-request notes from gaps. |
| 113 | Close the independent-check section. |
| 114 | Display steps for a person. |

COMMIT: Route judge gaps to explicit human review
