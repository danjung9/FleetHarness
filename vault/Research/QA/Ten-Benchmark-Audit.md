---
type: audit
status: active
owner: mukul
updated: 2026-11-04
summary: "Independent checks of the ten-challenge benchmark's completion, failure routing and acceptance boundaries."
---

# Ten-challenge benchmark audit

[P, main-session confirmation at 16:04] The current mission is ten satisfactory real catalog builds without human help during generation. Main owns the benchmark at ~/fhten/tools/ten.py, with three builds at once. The acceptance-tooling thread owns Research/QA/Acceptance. This audit changes neither implementation nor benchmark files.

## Findings sent to the runtime owner

| Finding | Source evidence | Required correction |
| --- | --- | --- |
| Driver crash can leave the round waiting forever | [E] one_round breaks only when proc.poll is non-null AND output/DONE exists. A crashed process without DONE has no terminating branch. | [R] On any driver exit, account for all unfinished challenges and end the round with failure evidence. Add a whole-round deadline and stop handling. |
| Judge failures do not reliably trigger repairs | [E] one_round sends architecture tasks only when status is not review. A review result with a failed automatic bar, or a later VERDICT: NOT, has no corresponding automatic failure route. | [R] Route each failed automatic or independent check once to the existing owner with the exact run/artifact and criterion. |
| Scoreboard can stay stale after judges finish | [E] write_board runs as results arrive and when the driver completes. main waits for a changed Git revision and does not refresh judgments or stop on ten satisfactory results. | [R] Refresh judgments independently of new builds; detect completion explicitly and stop further automatic generation. |
| Automatic predicate accepts inconsistent failed execution | [E] The auto expression checks failed count and total but not exitCode, quality status or failed criteria. An isolated evaluation with exitCode 1, failed 0, one test and a passing journey returns true. | [R] Require successful execution and coherent host evidence. Keep engineering checks separate from mission acceptance and explicitly reject failed required criteria. |
| Copied evidence is not the artifact used for first-open testing | [E] score copies selected files from W to D, then launches qa-monkey on W/index.html. It records only a truncated HTML hash in the row. | [R] Freeze and identify the full runnable artifact, test that exact copy and bind the independent judgment to its full manifest. |

[E] Validation used read-only source and one isolated Boolean expression with synthetic inputs. No benchmark function, worker, application, model or browser was run. Findings were sent with the AUDIT-MANAGER prefix to the existing runtime owner.

## First actual benchmark receipt

[E, updated source at 16:07 and isolated probes] The owner changed ten.py. Nonzero test exits, failed quality status and failed criteria now reject in the automatic expression. A mocked crashed driver without DONE now terminates and records the missing result. Source adds periodic verdict refresh and routing for review/automatic failures and NOT judgments. The live loop was not invoked by these checks.

[E, remaining source findings] check_goal emits a notification but main ignores its returned count, so future revisions can still launch after ten satisfactory outcomes. watch_round lacks an explicit STOP/whole-round deadline. The copied-artifact versus original-workspace first-open distinction and truncated HTML-only hash remain. These residual items were sent to the owner; completion is not claimed.

[E, Scoreboard and R1/id12-optask files at about 16:06] One of ten has finished, one meets the current automatic bar and zero is independently satisfactory. This ID 12 build took 9.7 minutes, reports 12/12 Node tests and 8/8 browser journeys, and reports 232,070 uncached input/output tokens. A separately reported earlier ID 12 run had different counts and must not be conflated with this benchmark result.

[E, actual test-report.json] quality.status is passed but requirementsMet is false. Three criteria pass and four are unverified. The original USMTF primary requirement and complete deliverable are deferred. The demonstrated implementation is an explicit synthetic EVENT/TASK parser and UTC timeline. The host report honestly states that this does not establish USMTF extraction or domain category correctness.

[R] An independent judge must assess whether the actual primary task is satisfied; a working generic parser cannot earn full challenge completion merely by documenting the missing requirement. No operational data or policy is needed for this judgment. Keep the scope synthetic and the incomplete requirements visible.

## Ownership and open decisions

[E, main bridge] Main reports that the organization runner is draining for fixes, native verification was redirected and the next benchmark results will appear in [[Research/QA/Ten/Scoreboard]]. These reported remediation actions require fresh source/receipt verification.

[E] Commit-author instructions conflict across sessions. The user-provided instructions in this chat require Mukul; main reports a later divinedev111 instruction in its session. A single clarification is pending with Mukul. No author change is performed by this audit and no answer is assumed.
