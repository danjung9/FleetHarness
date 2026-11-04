# Primary deferrals

None for the scoped synthetic demonstration. Synthetic, not validated against the real format. Actual USMTF conformance and operational accuracy remain unverified.

# OPTASK synthetic schedule

An offline prototype for watchstanders and shipboard leaders to evaluate extraction of frequency plans, crypto change-over windows and flight quarters. Use invented text only. It provides source inspection, deliberate review, a UTC schedule and JSON export.

Open [index.html](index.html) directly in a modern browser. No installation, server, Node runtime or network connection is needed to use the app.

1. Choose **Load synthetic sample**, then **Parse message**. Expect “3 events extracted; 0 issues; review required.”
2. Choose **Inspect source** beside a record. Select a **Source field** to see its unchanged text, normalized value and zero-based, end-exclusive UTF-16 offsets. The highlighted excerpt is from the committed source, even if a new draft is pending.
3. Check the source and mapping acknowledgement, then choose **Confirm review and save**.
4. The November 4 schedule shows Frequency plan F1 at 08:00 to 12:00 UTC (251.5 MHz), Crypto change-over C1 at 09:30 to 09:45 (KEY-DEMO-A), and Flight quarters A1 at 23:30 to 24:00, continuing next day. These values are fictitious.
5. Set **UTC day** to 2026-11-05 and choose **Show day** to see A1 at 00:00 to 00:30, continued from the previous day. Two reviewed events are outside that day. Its full interval remains 60 minutes.
6. Choose **Export reviewed schedule** to download `optask-YYYY-MM-DD.json`. It includes the synthetic disclosure, source history, all event fields and spans, full UTC intervals and clipped daily portions.
7. To correct a field, edit **Raw synthetic message**, then parse and review again. Previous source revisions remain available under **Source revision history**. **Discard source edits** restores the latest parsed source. Editing blocks review and export until reparsing and deliberate review.
8. Choose **Run synthetic comparison** for the separately planning-authored key. Expected: 3 matched events, 100% event precision/recall, zero field/time/span discrepancies; two non-event lines yield zero events and one unsupported warning. Inspect the key and actual output before acknowledging and choosing **Save comparison review**. This local acknowledgement is not independent human or SME validation.

The initial schedule date is fixed to 2026-11-04 for reproducibility. Source inspection, day changes and comparison preserve unfinished edits. Reload restores the parsed revision, review status, selected day and separate source draft where browser storage works.

## Input and recovery

Use the invented `synthetic-optask/v1` plain-text grammar displayed under **Invented grammar and input rules**:

```text
FREQ/id/start/end/owner/value/unit/description//
CRYPTO/id/start/end/owner/demoLabel/description//
FLIGHT/id/start/end/owner/description//
NOTE/text//
```

One record per LF or CRLF line. Empty lines are allowed. Fields cannot contain slashes or newlines. IDs must start with a letter and contain only letters, digits, underscores or hyphens; duplicate groups are unresolved. Dates require complete calendar dates, minutes and an explicit Z or ±HH:mm timezone, within years 1900 to 2099. Offsets are bounded to ±14:00. End must follow start; no dates or zones are guessed. Frequency accepts finite positive decimals and kHz/MHz; crypto accepts fictitious KEY-DEMO-* tokens. Input is limited to 200,000 UTF-16 units.

Issues identify the line to correct. Correct or remove unsupported lines and reparse; unresolved issues block review. Invalid records remain inspectable. NOTE is an intentional non-event. Scans, handwriting, real USMTF syntax and generic EVENT/TASK records are unsupported.

Work is stored only in this browser under `synthetic-optask-v1`; there is no server synchronization or storage security claim. If localStorage is unavailable, the app states session-only storage; export reviewed work before closing. For corrupt saved JSON, **Storage recovery** lets you export the unreadable bytes, then explicitly **Replace saved workspace** with the current workspace. Corrupt bytes are preserved until replacement. There is no automatic destructive reset.

All controls use native keyboard interaction with visible focus. Use Tab to navigate, Space for checkboxes and Enter/Space for buttons. The timeline also has textual interval entries; color is supplementary.

## Developer checks and evidence

Node is only required to run developer tests (tested locally with the installed Node runtime; use a modern Node supporting node:test and Array.at):

```sh
node --test core.test.cjs
```

The tests exercise `core.js` and the actual inline core extracted from `index.html`, including full behavioral equivalence. No package dependencies or external code packages are used. Keep the inline core identical to `core.js` when changing application logic and rerun tests.

Verification-phase Node result: 27 passed, 0 failed, 0 skipped. Browser journeys, disconnected-runtime behavior, file-origin persistence/downloads, visual layout and human review await host verification. No operational integration, authentication, real-format validation, OCR or approved government-device installation is supplied.

See [verification.md](verification.md) for evidence boundaries and [path-to-fleet.md](path-to-fleet.md) for the owner handoff.
