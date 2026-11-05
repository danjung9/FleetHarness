# Limitations and verification notes

## Delivered behavior and scope

[E, Node development tests] The BRIEF fixture computes A at 0 to 60, B at 90 to 150, C at 0 to 60 and D at 1440 to 1500. Both people total 120 minutes over both days combined. The packet's separate scheduling fixture is also exercised against the actual solver. Search never drops or reassigns a request, changes a constraint or adds a qualification.

The core distinguishes feasible, infeasible, invalid input and search limit reached. Search is bounded feasibility over explicit starts, not optimization or proof about unlisted times. Static filtering can prove a missing qualification, missing availability or excessive combined load infeasible before exploring nodes. A reached allowance remains inconclusive. Conflict messages describe observed conflicts and are not a minimal unsatisfiable set.

A person can select another listed start from a complete draft. All selected intervals are independently checked. A conflicting selection is invalid draft input, not proof that automatic search is infeasible. Review clears on input edits, result edits, reruns, resets and import. Review is bound to current inputs and result content. No real approval, reviewer identity or source acceptance has been recorded.

The app has no automatic storage. Portable JSON contains exact inputs and draft, including errors or a search-limit result. Import recomputes search results or independently checks selected drafts before accepting them; it always clears review. No cryptographic authentication or tamper-proof provenance is claimed. The browser must actually save the download before the page is closed. Node file round trip is verified; real browser recovery is not.

## Required omissions

- Recurrence and mandatory periodicity expansion.
- SFTRM interpretation and owner-approved fatigue policy beyond supplied values.
- Departmental negotiation and agents.
- Real readiness data.
- Qualification policy beyond supplied values.
- Official-calendar writes.
- Reconnect sync. Portable files are not synchronization.

No contacting people, issuing schedules or operational-system updates. No real ships, people, units or operational records. No integrations, sign-in, encrypted storage, durable audit trail, signature, government-device installation approval or authorization to operate. Sponsor, sustainment owner and operational policy remain unresolved.

The primary result is automatic generation. The person-selected draft checker is also available, with independent interval checks; no fallback is represented as autonomous acceptance. Four required requests and fixed assigned people, rooms and required qualifications are enforced by the app contract. The generic packet solver entry point is used only by the reference-fixture development test. All browser actions use the stricter four-request contract.

## Commands actually executed

[E] Read BRIEF.md, packet/.fleet/README.md, all six packet skill files, packet.json, fixtures.json, tool-schemas.json, manifest.json and the scheduling, validation, evidence and offline toolkit source. Read the mandated vault AGENTS.md, Team/Now.md and Reference/Open-Questions.md. No file under vault Research/QA was opened. Local rg searches discovered task files and found no additional AGENTS.md under fh-org.

[E] Version/status probes:

```text
pwd
rg --files --hidden -g '!\.git/**' -g '!node_modules/**' .
rg --files --hidden -g 'AGENTS.md' ~/Documents/CDAO/fh-org
node --version
python3 --version
rg --version
git status --short
```

Node reported v26.0.0; ripgrep reported 15.2.0; Python reported 3.9.6 with blocked system temporary-cache warnings. Git status failed because this directory is not a repository and also emitted blocked temporary-cache warnings. No commit, installation, npm command, browser process, server, network request or external service call was run.

[E] Local command execution and apply_patch created only files inside this task folder. A Node built-in crypto/fs script captured per-file SHA-256 values for the unchanged packet in packet-integrity.json. No packet file was edited. The manifest's supplied aggregate hash is retained as source metadata; its original aggregation algorithm was not independently reconstructed.

[E] Build and application test commands, in execution order:

```text
node build.cjs
node build.cjs
node --test core.test.cjs
node --test core.test.cjs > development-test-results.txt
```

Both builds exited 0 and printed `Built index.html with exact core.cjs bytes.` The first build preceded a small pre-test import-validation/parser correction. The second build incorporated that correction. The first application test run exited 0: 30 tests passed, 0 failed, 0 cancelled, 0 skipped and 0 todo; reported duration 75.709375 ms. No failed application run was replaced or suppressed.

[E] After the README and handoff documents existed, the final full delivery test run also exited 0: 30 passed, 0 failed, 0 cancelled, 0 skipped and 0 todo; reported duration 84.568375 ms. Its exact output is retained in development-test-results.txt. No application source changed between these runs. Node scripts read the saved output and recorded SHA-256 for the final local deliverables. The local Markdown check found no em or en dash characters.

Tests independently audit all interval pairs and requested totals. They cover both supplied fixtures, computed edits, room/person separation, full operating and person containment, qualification absence, 29/30/31-minute rest boundaries, zero-rest half-open intervals, combined-day budget boundaries, empty start choices, invalid numeric/identity input, exact search-budget completion/exhaustion, a separate small candidate oracle, draft edits, review invalidation and all outcome file round trips.

A real JSON file was written to a unique directory under this folder's .tmp, imported after a fresh core module load, compared with exact inputs/result and then removed. Other tests reject malformed or inconsistent imports and preserve a valid alternate selected draft. The inlined browser core was compared byte for byte, executed in an isolated Node VM and compared with the module result. The UI script was compiled by Node's VM for syntax only. Static HTML checks found no external scripts, stylesheet links, runtime imports or network APIs and confirmed the restrictive network policy. Packet-file SHA-256 checks passed.

[E] Final source inventory and document checks are recorded in source-hashes.json and verification.md. These are local development records, not the host's test-report.json or an approval artifact.

## Browser was not exercised

[P, environment constraint] Chrome and Electron cannot start here. The browser was not exercised. There was no browser rendering, actual click, download, file-picker, offline session, browser reload, close/reopen recovery or accessibility test. No claim of those behaviors passing is made.

A person should perform these exact checks with the delivered index.html:

1. Disconnect the network. Double-click index.html. Expect the synthetic/draft labels, four input rows and Feasible draft. Check A 0 to 60, B 90 to 150, C 0 to 60, D 1440 to 1500 and both totals of 120. Check readability, keyboard navigation, visible focus and any browser errors. Confirm no network is needed.
2. Click Mark current draft reviewed. Expect the reviewed message. Change B's allowed starts to `120`. Expect B 120 to 180 and Not reviewed. Change B's allowed starts to `0`. Expect Infeasible over the allowed starts, all four requests still present, both requested totals still 120 and review unavailable.
3. Restore B's starts to `0, 90`. Clear B's duration. Expect Invalid input naming B duration and the blank field retained. Type `60`. Expect feasibility to recover from current inputs.
4. Expand Evaluator search allowance. Replace 50000 with `1`. Expect Search limit reached, no claim of infeasibility, all four rows and no review option. Restore `50000`.
5. With B's starts `0, 90`, select `0` in B selected draft start. Expect Invalid input: selected draft needs correction, retained rows and cleared review. Select `90`. Expect feasibility. Mark reviewed, then click Find draft again. Expect review cleared.
6. For a distinctive saved scenario, change B's allowed starts to `90, 120`, then select `120` in the draft. Mark reviewed. Click Save draft file and check that synthetic-practice-draft.json actually exists. Keep it and index.html. Close the tab or browser.
7. Still offline, reopen index.html. The supplied example should appear because there is no automatic storage. Under Import draft file choose the saved JSON and confirm replacement. Expect exact starts `90, 120`, selected B 120 to 180, all other saved inputs and Not reviewed. Inspect and mark reviewed again. This is the outstanding close/reopen recovery check.
8. Try importing a non-JSON text file and a saved-file copy with one assignment removed. Expect Import failed, the prior current draft retained and no fabricated success. Cancel a replacement confirmation and check the current draft is kept. Check that restoring the example also asks before replacing changes.
9. Check the page at a narrow width and with keyboard-only controls. Confirm table scrolling, labels and readable error/review messages. Close the page to stop. Nothing should contact people, issue a schedule or update another system.

Independent acceptance, actual human review, operational evaluation and deployment remain unverified. Source approval and export belong to the person responsible for acceptance.
