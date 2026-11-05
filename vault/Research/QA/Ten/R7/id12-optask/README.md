# Primary deferrals

None within the frozen synthetic prototype scope. Actual USMTF conformance, operational accuracy and real-system integration remain unverified.

# Synthetic OPTASK review: user guide

## What this application does

**OPTASK review & daily schedule** helps watchstanders and shipboard leaders explore fictional tasking. Paste invented SYN-OPTASK/1 text to extract frequency plans, crypto change-over windows and flight quarters event times, inspect their source evidence, and produce a reviewed UTC daily schedule.

**Synthetic, not validated against the real USMTF format.** All prepared samples are fictional, preserved from [data/synthetic-data.json](data/synthetic-data.json), with provenance and assumptions in [data/README.md](data/README.md). No real records were supplied. Change-over identifiers are demonstration labels, never cryptographic keys.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12

## Prerequisites and startup

The machine hosting the application needs Node.js **22.19 or newer**. Users need a modern browser with JavaScript, fetch, localStorage and download support. A user opening an already-running service needs only the browser; the person starting the service needs Node.

There are no third-party packages to install: **do not run an installation command**. No model, API key, account or model environment settings are required. From the application directory, run:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open **http://127.0.0.1:3000/**. The terminal stays open while serving the application. Press **Ctrl+C** in that terminal to stop it. The startup command above uses POSIX shell syntax; PowerShell users can run:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
node server.mjs
```

The browser loads its interface and sample inputs from the local service. No external assets, model calls or APIs are required. Fresh parsing and downloading still require the local service to be running and reachable; opening the HTML with file:// or stopping the service does not provide browser-only computation.

## First walkthrough: all three event categories

1. In **Message draft**, use **Synthetic sample** to select **All categories with overlap and ship attribution**. Click **Load sample**. If a draft already exists, click **Discard and continue** to replace it, or **Cancel** to preserve it.
2. The sample sets **Schedule date · UTC** to **2026-11-06** and **Fictional ship · exact match** to **FSV LANTERN**. Leave those values unchanged.
3. Click **Parse message**. Wait for **4 extracted; 3 scheduled; 0 unresolved.** The line count is **9 lines**.
4. Read **Daily schedule**, its 00:00 to 24:00 UTC timeline, the category summaries and **Agenda & source evidence**. Expected selected-ship results are:

   | Output | Expected result |
   | --- | --- |
   | Frequency plans | F01 · Training voice · TRAIN-A · C01 · 123.450 MHz · 06:00 to 12:00 UTC |
   | Crypto change-over windows | C01 · Fictional change-over · DEMO-ONLY-C01 · 08:15 to 08:30 UTC |
   | Flight quarters event times | Q01 · Flight quarters · 09:00 UTC |
   | Chronological order | F01, C01, Q01 |

5. Click **Inspect source** beneath **Training voice · F01**. The evidence panel shows every source field and its original line. Frequency evidence reads **123.450 | UTF-16 201 to 208 | line 5**. Offsets are JavaScript string positions, not byte positions.
6. Expand **1 other-ship or out-of-day extracted events** to inspect Q02 for FSV PEBBLE. It remains extracted but is absent from FSV LANTERN's schedule.

The timeline keeps overlapping events on separate rows. Flight quarters is a point with no invented duration. On a narrow screen, scroll the timeline horizontally to see later hours, or read the equivalent agenda below it.

## Parse your own synthetic text or change the schedule

1. Paste your invented formatted message into **Raw message text**. Expand **Input grammar & mapping** for a short reference; the complete invented grammar is also documented in [data/README.md](data/README.md).
2. Enter the UTC day in **Schedule date · UTC** and the exact source SHIP value in **Fictional ship · exact match**. Ship matching includes spaces and case.
3. Click **Parse message**. Review the extracted/scheduled/unresolved counts. Changing text, date or ship immediately invalidates any earlier review; previous visible results are marked stale until parsing completes.
4. Inspect **Unresolved items** and source evidence before accepting the snapshot. Edit corrections in **Raw message text**, then parse again. There is no separate field-editing form.

To reproduce midnight behavior, load **Explicit midnight and equivalent instants** and parse. Expected order is **F02, Q03, Q04, C02**. F02 displays **00:00 to 01:30 UTC | continues from previous day**; C02 displays **23:50 to 24:00 UTC | continues into next day**. Q03 and Q04 both occur at **00:00 UTC**. The next-midnight Q05 remains extracted but is excluded from that day's schedule.

For the large prepared example, load **320-line tasking with 314 remark non-events** and parse. Expect **320 lines**, **3 extracted; 3 scheduled; 0 unresolved.**, and chronological order **F90, C90, Q90**.

## Correct an unresolved message

1. Select **Missing Zone** under **Synthetic sample**, click **Load sample**, and confirm **Discard and continue** if prompted.
2. Click **Parse message**. Expect **0 extracted; 0 scheduled; 1 unresolved.**, with **MISSING_TIMEZONE** under **Unresolved items**. The original draft remains available.
3. In **Raw message text**, change the ending timestamp from `AT=2026-11-06T10:00:00//` to `AT=2026-11-06T10:00:00Z//`.
4. Click **Parse message** again. **Flight quarters event times** now reads **Q10 | Needs zone | 10:00 UTC**, and unresolved codes read **None**.

Unsupported or invalid lines never become inferred events. You can acknowledge a snapshot that still has unresolved items, but its export retains those items and their source evidence.

## Review and download

1. Parse the current draft successfully, inspect its events and source fields, and read every unresolved item.
2. Under **Local review & export**, check **I have inspected this parsed snapshot and its unresolved items.**
3. Click **Confirm local review**. The status becomes **Reviewed locally; not operational authorization.**
4. Click **Download reviewed JSON**. The browser saves **synthetic-schedule.json** using its normal download settings.

The JSON includes unchanged submitted raw text, all extracted events across ships and days, original field values, field evidence, normalized UTC times, clipped day segments, unresolved items, selected day/ship, synthetic disclaimer and `reviewed: true`. The service recomputes export through the same evaluated core used for parsing. The browser makes a local download; the app sends no operational tasking.

Any text/date/ship edit requires parsing and deliberate local review again before downloading. A downloaded JSON file is an archive; **there is no JSON import or restore control**. To reuse its message, open the file in a text/JSON viewer, copy the decoded `rawText` value into **Raw message text**, restore its selection, then parse and review again.

## Saving, reloads and reset

Draft edits, successful parses and confirmed local review save automatically in this browser's localStorage. **Saved locally · no server storage** reports a successful save. Reloading the same browser origin restores the draft and matching parsed/reviewed snapshot. There is no manual Save button, server database or cross-device synchronization. Different ports, hosts, browsers or profiles have separate storage; clearing site data removes saved work.

1. Before replacing important work, download its reviewed JSON or copy the raw draft elsewhere.
2. Click **Clear draft** to reset the message and parsed snapshot. If text exists, choose **Discard and continue** to clear it, or **Cancel** to keep it. Date and ship selection remain unchanged.
3. To replace a draft with another sample, choose it and click **Load sample**, then deliberately discard or cancel when prompted.

If storage fails, a warning replaces the saved status. The current page retains in-memory work; copy the draft or download reviewed content before closing it. Previously downloaded files are unaffected by clearing the draft or browser storage.

## Supported format and validation

The application accepts pasted plain text in **SYN-OPTASK/1 only**, with LF or CRLF line endings. It does not upload attachments, accept ordinary prose as tasking, or support the generic EVENT/TASK grammar. The first three lines must be:

```text
SYN-OPTASK/1//
MSGID/YOUR-FICTIONAL-ID//
NOTICE/SYNTHETIC-NOT-REAL-USMTF//
```

Supported sets and required field order:

```text
FREQ/ID=.../SHIP=.../LABEL=.../NET=.../CHANNEL=.../FREQUENCY=.../UNIT=MHz/START=.../END=...//
CRYPTO/ID=.../SHIP=.../LABEL=.../CHANGEOVER=.../START=.../END=...//
FLIGHT/ID=.../SHIP=.../LABEL=.../AT=...//
RMKS/Slash-free inert remarks//
```

Keys and set names are case-sensitive. Values must be nonempty, with no slash or newline. Frequency must be a positive decimal literal in MHz. Timestamps use `YYYY-MM-DDTHH:mm:00Z` or `YYYY-MM-DDTHH:mm:00±HH:mm`, actual Gregorian dates and years 0001 to 9998, with normalized UTC dates in that same range. Date, timezone and duration are never inferred. Interval END must be strictly after START; midnight rollover must be explicit. The first valid ID is retained; later duplicates are unresolved. Remarks and instructions inside source text are inert.

Schedules use a half-open UTC day: midnight is included and the next midnight is excluded. Intervals are clipped to the day without changing their original timestamps. Other-ship and out-of-day events remain in the extraction/export. Built-in CRLF samples preserve original line endings until textarea editing; after editing, evidence refers to the exact submitted edited text.

Empty input produces **EMPTY_INPUT**. Bad headers, missing/malformed fields, invalid frequency/date, missing timezone, reversed windows, duplicates and unsupported sets receive explicit review codes. Correct the draft and parse again. The service accepts up to 1 MB of UTF-8 JSON input and limits output to 2 MB; very large messages or evidence-rich exports can exceed those transport limits.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Browser cannot open the app | Start the service, check its terminal output, and use its exact loopback URL. Keep the terminal running. |
| Port 3000 is occupied | Stop the conflicting process or choose another PORT and open that port's URL. Saved browser work will be separate at the new origin. |
| **Local service unavailable** | Restart the service at the same address and click **Try again** after a failed parse. For a failed download, retry **Download reviewed JSON** once the service is reachable. |
| Invalid date/ship selection | Enter a valid UTC day and a nonempty exact ship name, then parse again. |
| No scheduled events | Check exact ship spelling and UTC day. Inspect retained other-ship/out-of-day events and unresolved items. |
| Review or download is disabled | Finish parsing the current draft. Inspect the snapshot, check the acknowledgment and click **Confirm local review**. Edits require repeating this sequence. |
| **HEADER_INVALID** or **MALFORMED_SET** | Start from a prepared sample and preserve the three headers, field order, case and `//` terminators. |
| **Local storage unavailable** | Keep the page open, copy the draft or export reviewed content, and check browser storage permissions/capacity. |
| Draft appears lost | Return to the same hostname, port and browser profile. No server backup exists; use a prior downloaded archive if available. |

## Limitations and field validation

This is an invented-format demonstration. It has no full USMTF/OPTASK parser, OCR, handwriting recognition, real message retrieval, amendments workflow, operational transmission, authentication/CAC, encryption-at-rest guarantee, government-system connection or installation authorization. There is no timezone selector beyond UTC, event-duration inference, automatic expert approval or live operational schedule update. Use synthetic data only.

The core passed host evaluation on 14 frozen synthetic cases; that establishes bounded computational evidence, not real-format validity or operational readiness. Local review is distinct from owner approval for delivery/deployment. See [verification.md](verification.md) for tested behavior, evidence and remaining gaps, and [path-to-fleet.md](path-to-fleet.md) for operational sponsor, sustainment, security and field-validation prerequisites.

## Developer tests

These commands are for developers, separately from using the browser interface. They require Node.js 22.19+ and the source bundle, including preserved `data/` fixtures. No test packages need installation and no server needs to be started first:

```sh
node --test optask.test.mjs service.test.mjs
```

`optask.test.mjs` calls the actual shared compute entrypoint and covers complete protocol results, prepared fixtures, evidence slices, synthetic event metrics, date/offset boundaries and error precedence. `service.test.mjs` starts and closes its own ephemeral local service and checks HTTP health, actual invocation, malformed JSON handling and static assets. The browser uses that same core through POST `/api/invoke`.

Host computational evaluation, local Node tests, development browser observations, independent browser acceptance and human domain review are separate forms of evidence. Current results and limitations are recorded in [verification.md](verification.md).
