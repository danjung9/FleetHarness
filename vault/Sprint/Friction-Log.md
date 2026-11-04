---
type: log
status: active
owner: mukul
updated: 2026-11-04
summary: "Rule 10 log of barriers met during the sprint."
---

# Friction log

Rule 10 requires recording barriers [P]. These also feed the Barrier Removal score and the friction ROI. Log them when they happen, because they are hard to reconstruct later.

Type is one of: policy, data, authority, infrastructure, acquisition, technical.

| When | Type | Barrier | Responsible organization | Recommended action |
| --- | --- | --- | --- | --- |
| 2026-11-04 11:32 AM EST | technical | [E] Requested local bridge status command exited 1 with PermissionError when appending to its inbox outside writable roots | Local environment | Mukul can run the command directly or configure an approved writable bridge location |
| 2026-11-04 11:32 AM EST | technical | [E] Vault checker reported two broken links in Research/FleetHarness/README.md | Local project | Recheck the Gaps-and-Questions and Officer-Reframe link targets during research work |
| 2026-11-04, delta review | technical | [E] Broad combined source/note reads exceeded output limits; narrowed reads recovered relevant sections. Runtime validation was assigned to the main session and was not duplicated. | Local review tooling | Keep reads pinned to commit objects, bound output, and attach the main session's fresh results to the delta review |
| 2026-11-04, QA preparation | technical | [E] QA checkout advanced from 0f175a8 to 50fcaea during static review. Repository programs were not run. | Local coordination | Pin reads to Git objects and keep the execution checkout stable for each approved test cycle |
| 2026-11-04, QA preparation | technical | [E] Two draft newline findings resulted from misreading JSON-escaped tool output. A source-byte check disproved them before handoff. | Local review process | Remove the false findings and require raw-byte or language-semantics checks before reporting escaping defects |
| 2026-11-04, QA preparation | authority | [E] Main-session handoff reserves desktop/browser execution approval to Mukul; the stopped UI sandbox experiment remains outside the task. No new launch attempt was made. | Local execution boundary | Present exact reviewed fixture commands for approval; keep live generation and owner credential configuration separate |
| 2026-11-04, QA preparation | infrastructure | [E] Moving QA clone lacked Electron; its loader would auto-install on import. Main provided stable qa-lead with Electron already installed, confirmed by path checks. | Local runner | Use qa-lead for GUI tests, preflight the existing binary, and do not trigger installer fallback |
| 2026-11-04, GUI QA batch | infrastructure | [E] All three interfaces built, but the first phase fixture exited 13 before startup. A single minimal diagnostic confirmed `listen EPERM` binding 127.0.0.1 in the sandbox. | Execution environment | GUI batch is blocked before application assertions. Record the boundary; do not retry via another tool or agent to evade it. See [[Research/QA/Results-50fcaea]] |
