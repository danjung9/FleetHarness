---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A fixed-schema synthetic CSV import is the first connector to build and verify."
---

# CSV import

## Bottom line

[R] Rank fixed-schema CSV first for Thursday. [R] It can put an officer's structured task into a reviewable draft without account setup, consent or network access. [R] Start with one documented template and reject unclear rows. [E] This research has not implemented or executed a CSV importer in FleetHarness.

## How it works

[V] RFC 4180 documents a common CSV format, including headers and quoted fields containing commas, quotes or newlines. It is informational, not a guarantee that every spreadsheet export uses the same dialect. https://www.rfc-editor.org/info/rfc4180/ [R] Parse with a reviewed CSV parser rather than splitting text on commas. Start with a declared UTF-8, comma-separated format; explicitly handle a byte-order mark and reject unsupported delimiters.

[R] For the training draft, use an explicit request table and separate synthetic people/resource tables if needed. A proposed request schema is `request_id,person_id,room_id,start,end,timezone,qualification_code`. Freeze the exact app schema before implementation. IDs are invented tokens, not real personnel names. Validate required columns, allowed identifiers, dates, duration, duplicates and limits before changing saved state.

[R] Put parsing and task validation in the delivered app when the inputs are task data. Do not inject an entire roster into the software-building prompt to implement a local checker. Show how many rows were read, accepted and rejected, with row-specific errors and a source snapshot timestamp. No silent column guessing or dropped rows.

## What the user sees

[R] "Download example", "Choose CSV", a small preview table, plain errors and "Use these rows". For the event, show a persistent synthetic-data label. Cancel leaves the prior draft unchanged. Save/reopen should preserve accepted values and source provenance. A changed import clears any previous review decision.

## Navy approvals and event rule 4

[R] No OAuth approval is needed for a local file selection, but production deployment, permitted file-transfer paths and data processing still need the owner/security review in [[Research/RandE/Connectors/README]]. Do not instruct people to export real government rosters into an event machine.

[V] Spreadsheet software may interpret formula-like CSV cells as executable formulas, creating risks on export and reopen. https://community.owasp.org/attacks/CSV_Injection [R] Treat cells as inert text, avoid formula evaluation and reject formula-like text in the event's identifier fields. Review output handling separately; quoting alone is not a universal spreadsheet-safety guarantee. Show that prompt-like cell content cannot grant tool authority.

[R] Rule 4 risk comes from the data, including hidden identifiers or sensitive scheduling patterns, even in a small file. Only use a file created from scratch with invented data. Keep errors and logs free of unneeded row content.

## Thursday and post-event

[R] Thursday acceptance: import a four-request synthetic template; change a time and show the actual new result; reject a duplicate ID and an invalid date; handle a quoted comma; cancel an import; save and reopen with network disabled. Also reject an oversized file and a formula-like identifier. Record these as passes only after the delivered artifact is exercised.

[R] Post-event: confirm the actual user's export format, add only needed mappings, and define schema versions and migration. Manual transfer and reimport remain snapshots, not synchronization.

## Build size and evidence

[A] Estimate: 4 to 8 engineer-hours for one fixed schema, preview, validation and meaningful acceptance checks if the task app already has editable state; 1 to 2 more days for reusable field mapping and multiple dialects. These are planning estimates, not measured results. No parser library was installed or selected here.

## Sources

- [V] https://www.rfc-editor.org/info/rfc4180/
- [V] https://community.owasp.org/attacks/CSV_Injection
- [E] [[Research/Plan/Plan]] supplies the proposed four-request synthetic task and acceptance direction.

