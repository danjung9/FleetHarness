---
type: evidence
status: complete
owner: mukul
updated: 2026-11-04
summary: "Challenge 20 judgment evidence, artifact identity, tool disclosure and transfer needs."
---

# Challenge 20 review record

[E] [[Research/QA/Officer/JUDGE-R1-id20-contact-brief]] records NOT. Requirements were read first, followed by all requested files and three screenshots, actual test source, scope, final/first-open receipts and supplied manifest. This is a source and retained-evidence review, not fresh application execution or human acceptance. Later QA direction governs over the older one-artifact plan.

[E, index.html] The usable sample demonstrates exact identity lookup, ambiguity resolution, eligible flag retrieval, stale evidence, missing facts and source inspection. Four identities have predefined identifiers, and no source span supports the displayed IMO/MMSI values. Only registry flag spans can produce facts in the shipped corpus. AIS and sanctions fixtures have empty span lists. There is no feed ingestion or user source-import path. Synthetic data is appropriate for this task; omitting the evidence workflow itself is the defect. Citation buttons and source inspection are hidden during printing, so that output loses the inspection route. Single-page print fit remains unverified.

[E, static source] Citation validation checks matching reference metadata and exact text offsets, but does not establish that a stored value follows from the cited text. The tests reject a changed reference value against unchanged stored metadata; they do not test a stored value that contradicts otherwise valid source text. This is a static coverage gap, not a reproduced runtime failure.

[E, app.test.cjs] Ten registered tests load the actual inline contact-core and assert outputs. They cover exclusion, citation corruption, Unicode, identity ambiguity, stale/missing evidence, date boundaries, conflicts, incomplete provenance and unauthorized candidate selection. These are substantive application checks. The saved report records ten passes and eight journey/viewport passes, with zero failures. UC20-1, UC20-2 and RET-03 remain unverified; requirementsMet is false. The frozen acceptance plan explicitly defers both original requirements. Recipe passes cannot establish full challenge completion.

[E, verification.md] Reported history preserves seven initial passes, then two failures among ten tests, then ten passes after one repair for impossible dates and incomplete provenance. An earlier authored Unicode-length expectation was corrected from 39 to 41. No new rerun was performed here. The guide's pending-browser wording predates the later host receipt. first-open.json records three clicks without errors and no external requests, but does not identify a complete disconnected workflow. final.json reports nine benchmark minutes; final.json.report equals test-report.json.

[E, local SHA-256 comparison] The exact 37 reviewed files are inventoried in [.tmp/id20-review-manifest.json](../.tmp/id20-review-manifest.json). index.html is 16,216 bytes with SHA-256 93ff75eb37f7c25321cf1b19b0efa3a71c2fb4aa021049ff38bd328e539403f7. The supplied 30-entry manifest matches 25 files, including app, tests, acceptance plan, report and all sixteen journey evidence files. README.md, requirements.md, research.md, test-matrix.md and verification.md differ. The cause is not established; judgment uses the supplied requirements as directed. Main owns provenance reconciliation. Reported sourceHash and contractHash are recorded separately from local file hashes. Supplied mvp 1d9eeee does not establish this generated artifact's source revision.

[E, one retained trace header] Chromium, Chrome channel, Darwin and Playwright 1.64.1 are recorded. All sixteen referenced captures/traces exist; traces were not replayed. Exact browser/OS versions and checker revision remain unverified. No repository program, generated test, browser, provider call or outside service was launched.

| Tool or source [E] | Type | Use | Provider and version |
| --- | --- | --- | --- |
| Command orchestration and file patch tools | Local tools | Read evidence and write local records | Workspace runtime, version not exposed |
| Local image viewer | Local tool | Inspect three requested screenshots | Workspace runtime, version not exposed |
| zsh, ripgrep and text readers | Local tools | Scoped discovery and reads | Installed environment and upstream projects; versions not queried |
| Python standard library | Local validation | Receipt comparison, SHA-256 inventory, trace header and note checks | Python Software Foundation, 3.9.6 |
| Round 1 challenge 20 app, synthetic corpus and receipts | Prior work and dataset | Assigned independent judgment | Existing benchmark artifacts, exact local identities inventoried |

[E] Friction: broad reads were truncated and decisive portions reread narrowly. Python's launcher emitted temporary-cache permission warnings but completed. Central Sprint/Sessions/Team/Now writes are outside the allowed folder and tools/fh.py is denied, so the prescribed central ledger command was not attempted. These local records preserve the transfer obligation. No main bridge tool was available and no outward message was sent.

[R] Main transfers disclosure, friction, prior-work and session/status records to the central vault and retains scoreboard ownership. Use the existing factory failure route to require independent complete-task acceptance on synthetic evidence. No new browser run is needed to establish these omissions. Future acceptance must bind to reconciled artifact identities; human acceptance remains separate.

[E] Completion: both relays reread; Windows 4c49e85 changes test fixtures, with no new challenge 20 result. The final judgment has 245 words including frontmatter after the length check caught two oversized drafts. Required lines and five note checks pass; all 37 reviewed files remain unchanged. This review is complete.
