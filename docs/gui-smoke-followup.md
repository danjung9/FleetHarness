GUI smoke follow-up for d6f8750, 2026-11-05

All five reported failures were traced to fixture or script assumptions. No production code, frontend lines, contract rules or cleanup gates changed.

- smoke-brief-data: fixture defect. With the optional criteria field empty, the first acceptance ID is WFL-01, a deferred workflow recipe outcome. solutionFixture attached the required parser capability to that first ID. The production contract loader correctly rejected it: "Required capability parse must be implemented and mapped by criterion WFL-01; core capabilities cannot be deferred." The fixture now selects an implemented parser obligation, which is SUMMARYcustom-1 for this brief. Deferred recipe outcomes remain deferred. The same brief is shared with a regression that calls the real local fixture HTTP server, parses its output with the production contract loader and runs all four reference cases through the delivered evaluator. Removing the delivered parser still fails evaluation. GUI failure diagnostics now include the last 20 activity entries.
- smoke-conversation: asynchronous observation race. The backend publishes stopped before its enclosing proposal handler finishes recording applied. The script now waits for both the stopped run and that exact applied proposal. The existing applied, cancelled-question and rejected-late-answer assertions remain. A controlled-delay test of the actual main IPC handler confirms the intermediate proposed state, prevents duplicate application, and verifies that both final states persist after Stop resolves.
- smoke-electron: stale error expectation. A person with no connected account must connect first. The smoke now expects the existing exact preflight connection message rather than "Choose a model". Product messaging is unchanged. The missing-account and disconnected-account entry tests both pass.
- smoke-journey: stale rail inventory after Connectors landed. The check now requires exactly five utility controls, including exactly one Connectors control. It explicitly requires zero System design controls as well as retaining the absent system-design view assertion. The four milestone controls remain unchanged.
- smoke-phases: stale role assumption. The synthetic-data specialist shares the intake stage but has its own tool contract; it does not receive fleet_get_challenge. Every request is now checked against its assigned role. Intake still requires fleet_get_challenge, build and verification still require the message validation tool, and scheduling tools remain excluded. The judge is checked for exactly judge_read. All five stages, the synthetic specialist and the judge must occur in order. Mutation tests prove that missing or extra tools and omitted specialist/judge requests fail these checks.

tests/codex.test.mjs now awaits async disposal in browser transport teardown, then waits for all captured child close events. Both native transport fixture families use bounded recursive-removal retries: five retries with 100 ms linear backoff. Exhausted cleanup still fails the test. No test timeout was raised and no assertion was removed or weakened.

Observed validation:

- All three requested TypeScript checks passed: frontend --noEmit, electron/tsconfig.json and harness/tsconfig.json.
- tests/smoke-fixture-contract.test.mjs: 7 passed.
- tests/lifecycle.test.mjs excluding native orphan discovery: 28 passed.
- tests/codex.test.mjs excluding complete browser and CLI workflows: 26 passed.
- Selected account-preflight and shared browser/CLI fixture tests: 4 passed.
- Eight changed script files passed node --check. git diff --check passed.

Total: 65 focused tests passed. Logs are .tmp/gui-fixture-tests.log, .tmp/gui-lifecycle-tests.log, .tmp/gui-codex-tests.log and .tmp/gui-preflight-quality-tests.log.

The five native scripts were not run here. Chrome/Electron and native process discovery are blocked in this sandbox. The overseer must rerun them and the complete suite outside it. Synthetic HTTP, lifecycle probes and local contract checks do not establish native GUI success. No live model calls, credential reads, Git writes or writes outside this clone were made.
