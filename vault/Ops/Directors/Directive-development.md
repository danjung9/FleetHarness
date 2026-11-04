---
type: directive
status: active
owner: mukul
updated: 2026-11-04
summary: "Gate code work, preserve the current interface and isolate one source-export correction."
---

# Development instructions

[R] This replaces prior development instructions. Work toward one accepted four-request synthetic training draft from [[Research/Plan/Plan]]. A functioning checker is the fallback. Do not expand to other pilots, connectors, recurrence, departmental negotiation, sync or new frameworks.

## Baseline and permission

- [E, snapshot-7.md] Code-writing seats are disabled. [R] The task file is a queue, not permission to begin. Only the overseer can enable code seats. No repository execution or edits before that gate.
- [E, relay] Target 631849f removes Studio/Workbench and retains one Home-to-Flow interface. Backend delivery and orchestration files are unchanged from 50fcaea. Local HEAD may be older. [R] Read both relay files before and after work. Use the assigned checkout; ask the coordinator to update it if needed. Do not restore deleted renderers, pull, reset, rebase, commit or push.
- [R] Protect Dan's src/, studio/, workbench/, index.html, CSS and Workbench configuration/scripts. No frontend change is allocated here. Any indispensable new control needs a separate narrow assignment and the charter's FRONTEND explanation.
- [R] Treat electron/main.ts, executable.ts, package-worker.ts, pi-backend.ts, storage.ts, preload, shared/types.ts, harness/phases.ts and package manifests as shared changes. Before touching an overlap, check the latest relay and obtain the overseer's ownership decision if another editor is active. Do not undo teammate work.

## Current work allocation

[R] dev-1, after enablement: own only ordinary source export in electron/main.ts. Extract a small electron/source-export.ts helper and tests/source-export.test.mjs if needed. At 50fcaea, assertVerified runs before the destination dialog, then the live workspace is copied. [E, Research/QA/Runner/Harness-Coverage] BUG-E1/E2 now have targeted-function reproductions at that revision; native dialog behavior remains unverified. Reuse those cases before building another harness. [E, Sprint/Quality-Meeting-7 and corrected Static-Findings] The newline separators are valid. Cancel the older queued newline repair; it was based on a source-reading error.

[R] First confirm the existing changed-source export reproducer against the assigned revision. Then make delivery fail closed or copy exactly the reviewed source bytes, with a matching digest. A second hash check before a mutable copy alone is insufficient. Never mark delivery successful after a failed validation. Preserve destination restrictions, cancellation, human approval and Dan's executable path. No package dependency or frontend change.

[R] Limit investigation and implementation to 45 active minutes after enablement. If the fix needs broader architecture, stop and return the reproducer plus the smallest design. It must not delay the accepted artifact. Until a fix is accepted, terminate generation, independently inspect the final copied app, record its digest and describe this as a manual control.

[R] dev-2, dev-3 and agentic-builder have no development task now. Do not duplicate dev-1, QA or Dan's packaging work. The next allocation depends on a real candidate or a reproduced blocking defect; ask for a concrete permitted artifact path before assigning generated-app edits.

[R] Return the broad snapshot/store/type changes proposed in [[Research/Agentic/04-Tested-Delivery]] for later work. Its estimate exceeds this task's timebox. Dev-1 may return a reproducer without implementation if exact-byte delivery cannot be repaired narrowly. New UX and Ideas cards are proposals, not an implementation queue: defer preserving settled events, new timelines and version branching. Optional equivalent-input and reviewer-understanding checks belong with Quality after required acceptance.

## Evidence required to finish

[R] Exercise unchanged approved export, cancellation, mutation while the dialog is open, mutation during copying, failed validation and concurrent start/update. Any successful delivery must contain the reviewed bytes; otherwise it must reject without a delivered status. Report the base commit, changed files, commands, exit codes and remaining gaps.

[R] After a patch, run the relevant direct compiler and test commands from the charter. Start with node node_modules/typescript/bin/tsc -p electron/tsconfig.json and node --test tests/source-export.test.mjs tests/executable.test.mjs. If shared IPC/storage changed, run node --test tests/*.test.mjs once. The runner owns Electron/browser smoke outside this sandbox. Request a source-export smoke from Quality with exact steps; do not imply unit tests exercised the UI.

[E, mvp-gate.md and log] Current baseline is 89 main and 39 harness tests passing at 631849f. [[Research/QA/Runner/Harness-Coverage]] separately reports seven failing verification/export scenarios at 50fcaea. [R] Do not combine counts or infer those failures were fixed. Reconcile source identity with Quality. Keep broader hash/test-gate fixes outside this slice unless the overseer reallocates them. Manual acceptance must independently check final bytes and a per-file manifest, not trust the existing source hash or test count alone. Keep Dan's UI defects as reproduction reports for his ownership.

## Questions and controls

[E, feed-7.md] No development QUESTIONS were present. [R] Current decisions: code remains gated; source export and executable packaging are different paths; manual final-byte acceptance is allowed for this demonstration; general isolation work is deferred, not claimed complete.

[R] Use only synthetic/public inputs. Never enter credentials, publish, contact anyone, change official systems or imply operational approval. Human review gates the task contract, charged build, final artifact and submission. Monitor one run, elapsed time, tests and output changes. Failed checks, ambiguous constraints or failed Stop require escalation to the overseer; a live build requires a tested environment-level shutdown. Keep reports bounded to finished evidence and the next decision.
