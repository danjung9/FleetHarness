
## 17:50 report

Six findings remain after reviewing all five specified incoming revisions. No product code changed. [Report and reproduction details](~/Documents/CDAO/fh-org/astra-a3/audit/pipeline-results.md).

1. **High: repair can weaken failing tests into a pass.** [electron/pi-backend.ts:399](~/Documents/CDAO/fh-org/dev-1/electron/pi-backend.ts:399), dev-1 `28aeff9`. Original test contents are not preserved; changes only produce warnings. The reproduction left broken addition code unchanged, changed its expected answer, and obtained a passing Node report using the incoming real reporter. The judge sees the modified tests. **Fix:** preserve and rerun immutable baseline tests against repaired code; require explicit contract revision for expectation changes.

2. **High: exported evidence can differ from what was verified and approved.** [electron/storage.ts:86](~/Documents/CDAO/fh-org/dev-1/electron/storage.ts:86). Reports and approval records are excluded from hashing but copied from the workspace. Changing a report from 1/1 to 999/999 and replacing review feedback left the verified hash unchanged; export succeeded. **Fix:** retain authoritative evidence outside the generated workspace, bind approval to it, and export that snapshot.

3. **High: a successful source export can lack `index.html`.** [electron/source-export.ts:28](~/Documents/CDAO/fh-org/astra-a3/electron/source-export.ts:28). Verification accepts internal symlinks, while export skips them. An `index.html -> app.html` fixture exported successfully with matching hashes but no entry point. **Fix:** require a regular entry-point file before verification and export, or consistently materialize and hash internal links.

4. **High: prose-only requirements disappear from coverage.** [harness/planner.ts:37](~/Documents/CDAO/fh-org/dev-5/harness/planner.ts:37), dev-5 `81a664f`. Description text never enters the acceptance inventory. A synthetic CSV-totaling brief produced only recipe criteria. Saved R1 ID 16 likewise reports `requirementsMet: true` for three recipe checks despite omitted narrative obligations. **Fix:** freeze source-linked description obligations and keep coverage incomplete until they have evidence. The deferral patch cannot protect missing IDs.

5. **High: valid final judge JSON becomes a false `NOT` after commentary.** [electron/independent-judge.ts:121](~/Documents/CDAO/fh-org/dev-4/electron/independent-judge.ts:121), dev-4 `680f302`. The adapter concatenates every message delta and ignores completed final-message bodies. Synthetic commentary followed by valid `SATISFACTORY` JSON triggered `NOT` and two repairs; final JSON alone passed. **Fix:** parse the completed final-answer item separately. Route evaluator failures to evaluator retry, not application repair.

6. **Medium: exported test instructions require an undisclosed host environment.** [electron/main.ts:128](~/Documents/CDAO/fh-org/astra-a3/electron/main.ts:128). DELIVERY.md says to install Node, then supplies `codex sandbox -P fleet-build ...`. Source tracing shows the command also omits production permission overrides and runtime setup. **Fix:** provide a portable Node test command and record the full sandbox invocation separately as provenance.

The two largest concrete waste multipliers found:

- **Judge failures:** the reproduction caused four unnecessary model sessions and two extra verification passes. Each session has a configured 30-minute deadline. These are fixture call counts and code limits, not measured live-model costs.
- **Repeated downloads:** R1 ID 37 checks two unchanged files through 18 downloads per viewport: 36 captures instead of four. Its saved log reports eleventh-download timeouts and a repair adding delays. Support multiple assertions against one captured file.

Five targeted reproductions fail for these defects; seven controls pass. Direct TypeScript compilation passed. [Tests](~/Documents/CDAO/fh-org/astra-a3/tests/audit/pipeline-results.test.mjs) and [receipt](~/Documents/CDAO/fh-org/astra-a3/audit/pipeline-results.tap) are retained.

Could not run native process sweeping, sandbox containment, Chrome journeys, packaged-app launch, the full suite, or the integrated pipeline. Node assertion tests substituted the sandbox launcher; judge parsing used synthetic notifications. No live model calls occurred.

VERDICT: NOT DONE
