---
type: evidence
status: complete
owner: mukul
updated: 2026-11-04
summary: "R101 challenge 12 format substitution, test credibility and local disclosure handoff."
---

# Challenge 12 round 101 review record

[E] The assigned `Research/QA/Ten/R101/id12-optask` path does not exist. Scoped discovery found the matching challenge under `Research/QA/Ten/Exp1/R101/id12-optask`. Its requirements were read before its app. The experiment scoreboard also retains links with the missing Exp1 component. This review identifies the actual copy and does not substitute round 1 evidence.

[E] The experiment scoreboard attributes the build to mvp 1d9eeee plus disclosed scratch changes, event-login model gpt-6.1-sol, 12.6 minutes and 281527 uncached-plus-output tokens. These are recorded provenance, not a new build or proof the changes shipped. final.json identifies challenge 12, review status and 12.6 minutes; its report equals test-report.json. The host repair flag is no, while verification.md records a bounded implementation repair during verification. Those describe different stages and are not proof of contradictory retry accounting.

[E] Source and screenshots show direct extraction of all three requested categories and a real UTC timeline. The decisive missing capability is explicit in README: no actual USMTF parser. core.cjs splits lines on pipes and recognizes a fictional grammar. acceptance-plan.json, UC12-1, replaces the requested format with that grammar; test-report.json then marks the original requirement passed. Its overall requirementsMet remains false because independent human key review is unverified. Honest UI warnings do not establish format compliance.

[E] Test inspection: seven core cases run against both module and inline code, one parity case, six module workflow cases and five adversarial cases against both copies total 31 registered tests. Assertions cover literal expected values, altered inputs, invalid dates, duplicate records, evidence corruption, stale review, exports and wrong comparison answers. They are substantive. Six browser journeys at two widths give twelve reported passes. Download assertions check fragments rather than complete files; the timeline assertion checks visibility rather than bar positions. The declared journeys contain no explicit network-disable step. first-open.json records no page/console errors, external requests or narrow overflow, but alone does not establish the complete disconnected workflow. No candidate code or tests were run here.

[E] Identity: `.tmp/r101-id12-review-identity.json` inventories all 51 supplied files. All 44 manifest entries are present; 37 match and seven Markdown files differ, consistent with the manifest's normalization caveat. App, core, tests, frozen plans, report and all journey captures/traces match. Embedded core text equals core.cjs. Raw frozen output outside the permitted roots was not accessed. All three requested screenshots were visually inspected.

[E] Reused tools: local command runner and text readers for permitted evidence, image viewer for supplied screenshots, patch tool for local notes, and Python 3.9.6 standard library for JSON, hashes and document checks. Session tool versions are not exposed; Python is provided by the Python Software Foundation. No new package, service, model run or dataset was introduced. Prior work comprises the supplied generated artifacts, receipts, context, existing judgments and experiment scoreboard; no event creation date or authorship is inferred from their presence.

[E] Friction: missing assigned path, truncated combined reads and Python launcher cache warnings. Narrow reads resolved decisive text; Python completed successfully. Central Sprint/Sessions/Team/Now are outside write authority and tools/fh.py is denied. This local record stages those updates without invoking denied tooling or claiming central completion. No outward message, commit or app edit occurred.

[R] Main owns scoreboard and central-record transfer. Route this format-substitution finding through the existing factory acceptance work. Require safe synthetic content in independently checked required syntax; do not introduce operational messages or invent format authority. Human acceptance remains separate.
