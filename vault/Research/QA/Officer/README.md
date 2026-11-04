---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Factory and corrected CLI receipt review, frozen four-request keys and unperformed human acceptance/trial."
---

# Synthetic pilot answer keys

## Bottom line

[R] Use [[Research/QA/Officer/Acceptance-11]] with [[Research/QA/Officer/11-Training-Golden]] for the current four-request training draft. Every example value, person identifier, role, device, room, message and record is synthetic. [E, captured evidence] [[Research/QA/Officer/Acceptance-Review-Run1]] reviews factory receipt `edf3150f` (33 PASS, 1 clock FAIL, 14 NOT CHECKED) and corrected CLI receipt `af6357a9` (28 PASS, 18 NOT CHECKED). Both support bounded numeric and fresh offline import results; neither has complete acceptance. [R] Factory remains primary, CLI backup. Main owns runtime and final acceptance. The 0800 oracle is unchanged; human decision and trial remain NOT RUN.

## Current directive and acceptance

[E, captured DOM, screenshots, downloads and staged guides] The current review retains the factory clock mismatch against the key and its contradictory exhausted-state prose, distinguishes inconsistent-envelope rejection from approval of changed input, and preserves unsupported CLI G08/G09/G11/V14. Both lack a separate readable-summary export. Main's [[Research/QA/Acceptance/Review-Candidates]] identifies clock/summary differences from the narrower build briefs; no scope waiver or key change is made here. The review matrix gives main only residual browser steps and leaves source/audit/fielding limits explicit. Local handoffs: [[Research/QA/Officer/Sprint/Acceptance-Review-Run1]] and [[Research/QA/Officer/Sessions/2026-11-04-acceptance-review-run1]].

[E, direct task, 2026-11-04] Added [[Research/QA/Officer/Trial-Protocol]] and [[Research/QA/Officer/Burden-Claim]] for Thursday morning. [R] Use the protocol with an accepted task artifact and one consenting participant; preserve an untimed baseline as ESTIMATE. The one-page landscape print companion is [Trial-Protocol.pdf](Trial-Protocol.pdf). [E] No trial or burden reduction was measured during preparation. Public Navy/GAO sources provide context only. Local disclosure and session handoffs: [[Research/QA/Officer/Sprint/Trial-Preparation]] and [[Research/QA/Officer/Sessions/2026-11-04-trial-preparation]].

[E, current directive and relay reads, 2026-11-04] [[Ops/Directors/Directive-qa]] names mvp `d0f4c69` and main `8db53c3`. Earlier `631849f` evidence is historical; neither generated candidate is attributed to shipped d0f4c69 behavior. [R] Show the actual delivered task first. Historical three-interface mappings below do not authorize removed routes or additional pilot work. Preserve IDs 12 and 36 as backlog. The two-request S cases remain supplementary.

| Current note | Verdict and next owner |
| --- | --- |
| [[Research/QA/Officer/Acceptance-Review-Run1]] | [E] Existing captured evidence reviewed; factory primary and CLI backup remain incomplete. [R] Main owns residual browser proof; human acceptance remains unperformed. |
| [[Research/QA/Officer/11-Training-Golden]] | [E] Existing key complete; no numerical correction needed after independent recalculation. Shared and public to builders, not a protected holdout. |
| [[Research/QA/Officer/Acceptance-11]] | [E] Base/fresh assignments, both 120-minute totals, rest and negative controls agree with the plan. [R] Main QA lead fills the blank actual-app, export, review, guide, recovery, disconnected-launch, digest and human-decision records. |
| [[Research/QA/Officer/12-Timeline-Golden]] and [[Research/QA/Officer/36-Paperless-Golden]] | [R] Completed backlog, no expansion or new runtime task this round. |

[R] Current result statuses follow the directive: PASS only for an observed match, FAIL for an observed mismatch, NOT RUN when unperformed, BLOCKED for an actual execution barrier, NOT IMPLEMENTED for an established absence and NOT CHECKED for unresolved evidence. This supersedes the older UNSUPPORTED wording below. The historical 128-pass gate is attributed test evidence, not acceptance of the delivered task. Current gate reconciliation belongs to qa-runner.

## Earlier coordination and scope

[E] Before work, read [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]] and [[Research/QA/Static-Findings]]. The QA plan, required relay files, QA director directive and reports were absent initially. On the coordination recheck at 2026-11-04T19:41:16Z, the plan, both relay files and reports were available and were read. The director directive remained absent. A subsequent pre-completion relay reread announced `631849f`; the analysis file still described `50fcaea`. No reviewer agreement is inferred from file availability.

[R] [[Research/QA/Test-Plan]] owns execution, its M/S/O/C scenario families, common gates and result format. The mappings below refer to its `50fcaea` original/Studio/Workbench matrix. [E, latest relay and pinned diff] Commit `631849f638614735a89a555d487d6b3c777c52e3` subsequently unifies the UI and removes separate Studio/Workbench entry points and scripts. The domain helpers, catalog, recipes and fixtures used for these keys are unchanged. [R] Retain the answer keys and M/S/O family ownership, but have the QA lead rebase navigation to the unified interface. Do not run removed interface commands or report three current interfaces. These notes make no claim about the new UI's runtime behavior.

[R] Do not repeat an equivalent boundary test as a new coverage count merely because it has another case ID. Interface defects, consent, Stop, guide accuracy, review invalidation, source export and packaged-app cold launch/recovery remain with the main plan.

| Note | Main QA mapping and distinct contribution [R] |
| --- | --- |
| [[Research/QA/Officer/11-Training-Golden]] | S-O, S-S and S-W: detailed four-request submission fixture from Plan.md, not a replacement for QA's two-request S1 smoke fixture. The four-request answer is unique; S1 permits either valid ordering. Shared infeasible, rest, qualification and budget checks need one recorded execution per applicable input/interface. |
| [[Research/QA/Officer/12-Timeline-Golden]] | M-O, M-S and M-W: adds all three published content categories, exact source offsets and a cross-midnight display. G02 through G09 give concrete variants for overlapping M2 boundary coverage; they do not replace M1's TASK parsing or accented-text and inert-input checks. |
| [[Research/QA/Officer/36-Paperless-Golden]] | O-O, O-S and O-W: supplies recognizable forms and exact requisition values for O1/O2, plus the published tasking/filing track. O3 byte-budget coverage stays solely in the main plan. Reconciliation steps instantiate its existing conflict/replay checks. |

[R] ID 11 remains the proposed Thursday submission slice. The other notes do not recommend expanding submission scope. The lead must record which input revision was used; never combine the two-request S1 input with the four-request expected output.

[E] Source inspection uses Git object `50fcaea1e86028503ae66bd2f17287093ad30cbe` from `~/Documents/CDAO/FleetHarness`. Local `HEAD` and `mvp` initially resolved to `0f175a8`, then advanced to `50fcaea` during work. All relevant reads used explicit `git show 50fcaea:path`; no branch update was performed by this work. A read-only diff confirms the inspected domain helpers, catalog, recipes and fixtures did not change between these commits.

[E, received reports] The relay describes Workbench, executable delivery and app-first guide changes. `org/reports/mvp-gate.md` reports 128 passing checks and zero failures. [[Research/QA/Runner/Harness-Coverage]] separately reports 403/410 additional checks passing and seven verification/export failures, plus 39/39 harness checks. These reported suites cover different expectations; they are not generated-app acceptance and are not runs performed here. Reuse their evidence rather than rerunning helpers for these notes.

## How to judge an example

[R] The checker reads the synthetic input and expected result before opening the candidate. Enter the input in the actual app, compare every required value on screen and in any claimed saved/exported result, then try the named changed-input case. Equivalent wording is acceptable where a note specifies meaning; numbers, identifiers, dates, source spans and record membership must match exactly. Use the main plan's statuses: a missing capability is UNSUPPORTED, an exercised wrong answer is FAIL, an unperformed check is NOT RUN, and a dependency or approval preventing execution is BLOCKED. Only an observed matching result is PASS; scripted-fixture evidence remains labeled FIXTURE.

[R] Record case ID, actual outcome, final artifact digest, browser/device version, timestamp and human review decision in the main QA evidence. These notes are visible in the shared vault and are not secret holdouts. The evaluator must retain any additional undisclosed cases outside the builder's read/write authority. The author of a candidate must not change this answer key to match its output.

## Local disclosure and session handoff

[E] Writes are limited to this folder. The central `Sprint/`, `Sessions/` and `Team/Now.md` locations are outside that boundary, so their updates and the central ledger command are pending an authorized main-session handoff. No central log update is claimed. The following records preserve the tools, friction and prior work locally as they occur.

### Current acceptance session, 2026-11-04

[E] Asked: finish the current key and independently check the four-request contract within 15 active minutes, then supply acceptance expectations and blank runtime records. Done: retained the completed key, wrote Acceptance-11.md and updated this index. Verification: manual interval, membership, qualification, window and minutes proofs, corroborated by an independent inline Python calculation using only the linked synthetic input and the standard library. No candidate scheduler, repository program, browser, provider or model run was started. No new pilot, worker, source edit, message or outward action was performed.

[E] The calculation produced unique base and fresh-edit answers; impossible, rest-short, 119-minute, qualification and unavailable-window cases had no feasible complete assignment. Duplicate/malformed inputs were invalid. The 1499/1500 operating boundary and all three wrong-output controls agreed with the key. P01 rest is 30 minutes in both valid drafts; P02 rest is 1380; each person totals 120. The budget result remains a specified runtime expectation, supported by the known feasible witness rather than a measured search run.

| Tool/source used this session [E] | Type | Use | Provider |
| --- | --- | --- | --- |
| Workspace command and patch tools, version not exposed | Local tools | Read assigned notes and write/check two local documents | Workspace runtime |
| zsh and installed text readers, versions not recorded; ripgrep 15.2.0 from prior inventory | Shell/search | Read assigned evidence and locate scoped notes | Installed environment and upstream projects |
| Python 3.9.6 standard library | Local calculation | Independent constraint enumeration, document hash and note consistency checks | Python Software Foundation, installed distribution |
| UTC clock tool, version not exposed | Session tool | Bound acceptance work to the allotted 15 active minutes | Workspace runtime |
| Existing four-request key, Plan, Findings, directive and relay/report records | Prior work and synthetic dataset | Freeze expectations and distinguish current target from older test/interface evidence | Existing team notes and synthetic specification |

[E] Friction: broad document output was truncated, so decisive portions were read separately. The installed Python launcher reported denied temporary cache writes, but the calculation exited 0 and returned its complete results. Central ledger/session/status writes remain outside this folder's authority. The exact writing-session model identifier is not exposed in this record; an authorized owner must reconcile it from runtime metadata rather than infer it from an earlier test. No new library or outside service was added.

[R] Pending authorized handoff: transfer these tool, friction and prior-work records into the central Sprint logs using the prescribed `fh.py tool` workflow, add the session note and update Team/Now. Main QA lead should use Acceptance-11.md for actual runtime observations and final-byte review; no acceptance decision is recorded here.

[E, local document checks and relay reread] Work began with the relay read at 2026-11-04 19:46 UTC. Both relay files were reread after substantive work at 2026-11-04 19:50:59 UTC and still identify 631849f and the single interface. The acceptance work finished within the 15-active-minute limit. Frontmatter, known links and house-style checks passed for both changed notes. All 26 required/conditional runtime rows have an expected outcome and evidence requirement, blank actual/evidence/decision cells and NOT RUN status. The two operating-window boundary outcomes have separate result rows. No second fixture JSON was copied, and the linked key's hash is unchanged.

### Earlier key session

| Tool or source [E] | Type | Use | Provider |
| --- | --- | --- | --- |
| Workspace command and patch tools, version not exposed | Local tools | Read assigned sources and create these notes | Workspace runtime |
| zsh, version not recorded | Shell | Run read-only commands and local document checks | Zsh project, installed environment |
| ripgrep 15.2.0 | Search | Locate assigned QA notes and code files | ripgrep project |
| Git 2.50.1 (Apple Git-155) | Source reader | Read pinned source without checkout changes | Git project, Apple distribution |
| Python 3.9.6 standard library | Local validation | Select only use cases 11, 12 and 36 from captured source; check fixture arithmetic and note structure | Python Software Foundation, installed distribution |
| Node v26.0.0 | Runtime inventory | Version query only, no repository code executed | Node.js project |
| Captured Norfolk use cases 11, 12 and 36, read 2026-11-04 | Published event source capture | Bound requirements against the selected descriptions, requirements and resources | Event portal, existing vault capture |
| FleetHarness source at `50fcaea`, UI delta to `631849f` | Prior project work | Inspect catalog, recipes and helper semantics; confirm unchanged domain contract across the final UI change | Existing team repository |
| Synthetic officer examples, revision 1 | Synthetic dataset | Exact expected results for independent application checking | Local test specification |

[E] Friction: relay/latest analysis, the QA plan and reports arrived during work; they were read before completion and the mapping above was added. A subsequent relay update announced UI unification at `631849f` while its analysis lagged; pinned source comparison confirmed the domain keys need no input changes and the old interface mappings need navigation updates. The director directive remained absent. Apple tool launchers reported denied temporary cache writes, while the source reads and version queries completed. No credentials, repository programs, installs or network services were used. [E] Prior work: ID 11 inputs originate in the existing plan; catalog, recipes, fixtures and helper code are existing team work. These notes do not recast them as newly built functionality.

[E] Asked: produce fully synthetic, independently checkable golden examples for pilots 11, 12 and 36 using the published text, plan and code. Done: one note per pilot, with input, expected results, deliberate wrong answers, source limits and main-QA mappings. Verified with a separate Python standard-library calculation: unique ID 11 base schedule and fresh/rest/budget/qualification/window variants; ID 12 timestamps, durations, ordering, overlaps, all supplied source spans and CRLF offsets; ID 36 revision membership, parents and quantity values. All four notes passed frontmatter, JSON, known-wikilink and dash checks. These checks validate the written answer keys, not an application. None of the documented application scenarios has an observed result from this work.

[R] Handoff: the main QA lead should freeze the scoped contracts, keep answer-key ownership separate from the candidate builder, run the actual delivered apps, and transfer this local disclosure/session record to the central logs through an authorized writer. No acceptance or operational approval is recorded here.

## Sources

- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11
- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12
- [P] https://cdao.hackathon.maximus.com/event/norfolk/use-cases/36
- [E] These URLs are source references from the project catalog. The existing local capture was read, not the live portal.
- [E] https://github.com/danjung9/FleetHarness/tree/50fcaea1e86028503ae66bd2f17287093ad30cbe (private project source read locally).
- [E] https://github.com/danjung9/FleetHarness/tree/631849f638614735a89a555d487d6b3c777c52e3 (final UI delta read locally; no domain-helper changes).
- [E] [[Research/00-Brief]], [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Test-Results]], [[Research/QA/Test-Plan]], [[Research/QA/Static-Findings]], [[Research/QA/Runner/Harness-Coverage]].
- [E] `~/.local/share/fleethacker-context/org/relay/LATEST.md`, `LATEST-analysis.md` and `org/reports/mvp-gate.md`, read on final coordination recheck.
