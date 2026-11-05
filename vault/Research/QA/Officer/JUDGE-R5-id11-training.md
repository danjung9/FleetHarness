---
type: evidence
status: complete
owner: mukul
updated: 2026-11-05
summary: "R5 ID 11 remains NOT. Supplied key contradicts public ordering; host output follows it, but the sealed evaluator key is absent."
---

# R5 challenge 11 core evaluation judgment

VERDICT: NOT

WHY: [E] The automatic bar failed. `final.json:3,73-79,95-113` records failed build, queued verification/review/delivery and a null final report. The retained core report records allocation-reference passing 24/24 cases, but required audit-reference passing only 1/2, score 0.5 against threshold 1 (`.quality-evidence/core-report.json:12-26,630-645,968-974,1292-1302`). This review does not promote the artifact to satisfactory.

FIX: [R] Main/Engineering, through the existing factory owner, should add a generic pre-freeze contract-consistency regression and commission a new versioned planning/evaluation run after independently reconciling protocol, prepared key and evaluator projection. Preserve this failure and its frozen files. Do not change a fixture to match candidate output or change the runtime to violate the public protocol.

[E] This is the canonical judgment for `R5/id11-training`, workspace suffix `b6db31c5-1d50-442c-a059-e16ac77bfb5a` (`final.json:116`). It also serves any automatic judgment request for these same evidence hashes. No second judgment or candidate execution was started. Queue removal is not claimed; scheduling outside this folder remains with main.

## Evidence and scope

[E] All relative evidence citations below refer to `~/Documents/CDAO/Fleethacker-Vault/Research/QA/Ten/R5/id11-training/`. JSON was parsed as data; source and original tests were read as text. No candidate import, test execution, browser, provider call or broad application audit occurred. The comparison record is [r5-id11-comparison.json](.tmp/r5-id11-comparison.json); file identities are [r5-id11-review-identity.json](.tmp/r5-id11-review-identity.json).

[E] The benchmark attributes R5 to f2e5422 plus a scratch patch (`../../Scoreboard.md:12`). That attribution is not an exact source identity established here. The host records Node v24.22.2 and runtime filesHash `78b4edbd4cf9af72031d5a119bee59c19dde255fb458d5e13e9eab8aca31a6be` (`.quality-evidence/core-report.json:4-8`). This composite runtime identifier differs in meaning from the SHA-256 of the report file itself.

## Independent operational ordering

[E] The public protocol defines half-open execution intervals, restrictions on any overlap, and baseline diagnostics using preferred starts regardless of final feasibility. Operational entries are ordered by request input index, then window input index (`solution-contract.json:9,15`). Thus final moved allocations do not determine baseline ordering. Priority, department, window ID and chronological sorting are not alternative ordering rules.

[E] The shifted input lists requests D1 through D7 (`data/synthetic-data.json:1482-1759`). Its windows are OP1 then OP2 (`:1378-1401`). OP1 prohibits the flight-quarters family during November 9 00:00 to 10:00; OP2 prohibits the weapons-safety family during 08:00 to 10:00. Both prohibited-resource lists are empty.

| Request [E] | Preferred execution, fixed UTC-05:00 | Independent restriction result | Input citation |
| --- | --- | --- | --- |
| D3, weapons safety exercises | November 9 08:00 to 09:00, duration 60 minutes | Overlaps OP2 and matches its prohibited family; does not match OP1 | `data/synthetic-data.json:1568-1575` |
| D5, flight quarters | November 9 08:00 to 09:00, duration 60 minutes | Overlaps OP1 and matches its prohibited family; does not match OP2 | `data/synthetic-data.json:1644-1651` |
| D1, D2, D4, D6, D7 | Supplied preferred intervals | None matches a prohibited family or resource | `data/synthetic-data.json:1483-1536,1606-1613,1690-1735` |

[E] Scanning requests first therefore gives exactly `["D3:OP2","D5:OP1"]`. Scanning windows first would reverse these two entries. The baseline-week control has only OP1 and yields `["D5:OP1"]`; that case cannot distinguish the two ordering policies (`data/synthetic-data.json:392-404,803-805`). Independent timestamp arithmetic over the supplied JSON reproduces both results without using application helpers.

| Compared source [E] | Shifted operational array | Disposition |
| --- | --- | --- |
| Public contract, independently applied | `["D3:OP2","D5:OP1"]` | Required order |
| Prepared key, `data/synthetic-data.json:1801-1804` | `["D5:OP1","D3:OP2"]` | Contradicts required order |
| Retained host output, `.quality-evidence/core-report.json:1055-1058` | `["D3:OP2","D5:OP1"]` | Conforms for this field |
| Original complete-response test, `scheduling.test.mjs:34` | `["D3:OP2","D5:OP1"]` | Asserts the public order |

[E] Static implementation inspection agrees: `compute.mjs:8-13` validates and delegates to the shared scheduler; `domain/schedule.mjs:35` iterates requests outside windows, and `:49-52` includes those baseline results in the report. This is corroborating source evidence, not execution performed by this review.

## Differences beyond the first mismatch

[E] The host names only `$.baselineOperationalViolations[0]` (`.quality-evidence/core-report.json:973`). A recursive comparison of the entire supplied expected object and entire retained shifted host output finds:

1. [E] Index 0 differs: supplied key D5:OP1; host D3:OP2.
2. [E] Index 1 also differs: supplied key D3:OP2; host D5:OP1. The same two violations are present; neither membership nor array length differs.
3. [E] The supplied expected object has `negotiationEvidence`, with two narrative witnesses ordered D3 then D2 (`data/synthetic-data.json:1962-1986`). The host instead has `negotiation`, seven structured entries in D1 through D7 order (`.quality-evidence/core-report.json:1163-1286`). These are different schemas, not interchangeable arrays. The baseline-week key has the same schema distinction with four narrative witnesses (`data/synthetic-data.json:962-1000`).

[E] There are no other differences in the 12 common top-level fields for the shifted case. The baseline control has no differences in common fields. All allocations, collision pairs, recurrence results, load maps, totals and coverage values in those common fields match exactly. This comparison checks equality to the supplied key, not the independent correctness of every scheduling result.

[E] The public report requires structured `negotiation`, including one entry per request, original proposal values, allocated counters, collision objections followed by operational objections, and explicit response/disposition rules (`solution-contract.json:6,17`). Applying those rules independently to the supplied input, collision list and allocations produces the host's seven entries exactly. In particular, D2 is reassigned to P3 at 08:00, and D3 moves to 10:00 with objections `resource:SIM:D2/D3` followed by `operation:D3:OP2` (`.quality-evidence/core-report.json:1184-1218`). No literal narrative witness is used as a result.

[E] A separate in-memory public-protocol projection, replacing the narrative witness field with those derived entries and imposing request-first operational ordering, matches the entire host report output for both audit cases. This analytical projection was saved only in the local comparison record as derived results. No frozen key was rewritten, and it is not presented as the host's sealed expected object or as a newly passing evaluation.

[E] The original test asserts complete response equality, including the operational array and D3's ordered objections (`scheduling.test.mjs:19-34`). It reads its inputs from embedded sample JSON (`:6-8`); all three embedded solverInput objects and the scenario list equal the supplied data file. The embedded copy lacks the expected-key fields, so whole-file JSON inequality is not an input discrepancy. The retained source has 30 expanded test cases, but the claim that all 30 ran and passed comes from `verification.md:25,43`; this review did not rerun them or establish their pre-repair historical hashes.

## Disposition of the generated diagnosis

[E] **Supported within the supplied evidence:** the conflict alleged in `verification.md:39-43` exists between the public ordering rule and the prepared key. The recorded host output and original test follow the public rule. No implementation ordering defect is demonstrated by this failed case. A single response cannot satisfy both opposing array orders under exact comparison.

[E] **Unverified as a complete explanation of the host failure:** the sealed `evaluation-plan.json` is absent from this retained directory and its manifest. The report does not expose expected values or evaluated input bytes. `test-matrix.md:171` identifies that separate sealed plan, and the report describes a planner-defined negotiation projection (`.quality-evidence/core-report.json:635-638`). The passing baseline case, despite its raw prepared-key schema difference, also shows why the prepared expected object must not be treated as the literal full host key. Main should supply the preserved evaluation-plan identity and exact shifted input/expected object once, for comparison of every field and attribution of any further hidden mismatch. The available evidence confirms a planning/key inconsistency, but does not prove that swapping two elements would make the host gate pass or that the evaluator algorithm is defective.

[E] The generated diagnosis is therefore supported narrowly and incomplete for full host causation, rather than refuted. The retained build log additionally records unconfirmed writer shutdown (`log-tail.txt:80-82`). This ordering finding does not clear that outcome; main retains the existing shutdown/recovery procedure. Human acceptance, full-card satisfaction, delivery and remaining capabilities are outside this review.

## Minimal regression and next version

[R] Main/Engineering should route one generic regression to the existing planning/evaluation owner. Use independently authored synthetic cases whose request order, window order and lexical ID order differ; include one request violating two windows, an endpoint-only non-overlap, and an unaffected baseline control. Derive the expected diagnostics and structured negotiation from the declared protocol before candidate execution. A deliberately window-first key or narrative-witness object substituted for the report schema must fail the consistency check before freeze/build. A protocol-conformant key must pass. Preserve ordered exact assertions; do not sort arrays to conceal the conflict.

[R] Bind the reviewed protocol, input, expected projection and evaluator version to a new run identity. Retain the old failed report unchanged, keep runtime output unavailable as an oracle during key preparation, and run the unchanged automatic bar on the new version. Record all comparison differences rather than treating the first mismatch as a complete diagnosis. A later pass requires its own receipt and separate human acceptance; this report grants neither.

## File identities

[E] SHA-256 values below were measured on the retained local bytes. The contract, prepared data, host report, compute module and original test match their `MANIFEST.json` entries (`:62,66,68,86,89`). The verification note differs from its recorded raw hash `37fb47b081861b181c471cee80012a2840b26f1383d9638333b865821603a528`; the manifest warns that vault Markdown is normalized (`MANIFEST.json:2`). That warning is a possible explanation, not a verified byte-for-byte reconstruction of the raw note.

| File [E] | SHA-256 of inspected copy |
| --- | --- |
| `solution-contract.json` | `babfd1103c1400333cf8a044b643fba937290841dbbf5aef14f09a0f89fd2b1d` |
| `data/synthetic-data.json` | `2672e1271ccdbdbac6cb22c4633fd4787a7a521f67f7c75760015b5aeedc93c6` |
| `.quality-evidence/core-report.json` | `3f17a440a5167416e8010cb9de052c06f0255ce4691af8412f2d51d059bf2dff` |
| `compute.mjs` | `f10f92d98865fc1009ef365b949783ac9bad14cc53ad33e2880857e65e87e937` |
| `scheduling.test.mjs` | `821cc528e3863bf4e6c0f06af69db8ad1d0099fa3041ed1856eac5879a999dc0` |
| `verification.md` | `d2e8c9e89035d357392cb42b06a8659079445964ba43a9fcdb8ea0f9b5004d5a` |
| `domain/schedule.mjs` | `f066f80dd0dd472d0c571e6cc363f79501c2deb7ccfc04be1ef4726b979fe3d7` |
| `domain/agents.mjs` | `023c9f63649cdd137d3072ff870280cc8096495fb84ca2c93b7f52dfff05bb30` |
| `final.json` | `72989e9727b3c958c97eda116ff01daef2d422e23966ca9ef70368ca411128f2` |
| `MANIFEST.json` | `cec40f12250cb0020a6000433d98225d411cedc6c63259f3eb7073dd887c1be9` |

[E] The local identity record also covers the acceptance plan, test matrix, embedded sample, requirements and log. No raw frozen directory was accessed. The bounded review is complete; subsequent work belongs to main and the existing factory owner.
