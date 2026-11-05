# Primary deferrals

**UC12-1**, “A parser that takes raw formatted military text (USMTF format), extracts frequency plans, crypto change-over windows, and flight quarters event times, and plots them on a consolidated visual timeline.” **real-data:** authorized authentic USMTF messages with validated event/field answers are absent; this run is synthetic-only. Real-format accuracy/conformance is withheld. The complete named transformation is demonstrated using the preserved invented mock OPTASK fixtures. This requirement remains unverified.

# OPTASK daily schedule

A local prototype for watchstanders and shipboard leaders to inspect fictional tasking, review original evidence and export a reviewed UTC day. **Synthetic, not validated against the real USMTF format.** No operational actions or transmissions occur.

## Start

Use Node.js 22.19 or newer and a modern browser. No dependency installation, model, credentials or environment configuration is needed. From the application directory:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open `http://127.0.0.1:3000/`. Keep that service running; do not open the HTML using `file://`. Internet access is unnecessary, but new parsing and review saves require the local service. Stop with Ctrl+C. The host assigns its own loopback port during evaluation.

## Review a daily schedule

1. In **Synthetic scenario**, select **S01 · Dense daily three-category extraction** and choose **Load synthetic sample**. The exact intake source is embedded in the page; it is not fetched from a local fixture file.
2. Choose **Parse message**. Expect `4 events; 4 on 2026-11-05 UTC; 0 review issues.` All four candidates still await human review.
3. Inspect the shared 00:00 to 24:00 UTC timeline and its equivalent category summaries/list. FP-A lasts the full day at 123.45 MHz; CW-A runs 06:00 to 06:20; FQ-A runs 06:10 to 07:00; FQ-B is a point at 18:30. Each timeline record has its own row to preserve overlaps. Narrow screens can scroll the timeline horizontally.
4. Select the FP-A event in **Events & source evidence**, then **MHZ**. The exact source value is `123.450`, at `DOC-DENSE · UTF-16 [20420, 20427)`.
5. Check **I reviewed the source evidence and inclusion choices.** Choose **Save reviewed schedule**. Expect `Saved locally: 4 included, 0 excluded.` This is a local review, without operational authority.
6. Choose **Export saved JSON** to download `synthetic-schedule.json`. It contains the disclosure, exact request/original documents, explicit decisions and computed result including normalized values and source spans. Reload retains the saved snapshot.

Use S02 to combine messages: eight events remain inspectable, seven intersect the chosen day. FP-B displays 00:00 to 01:00 but retains its actual 120-minute duration; FQ-C displays 23:40 to 24:00 while retaining 45 minutes. S03 demonstrates a different fictional ship. **Ship filter (blank = all)** matches UNIT exactly. Change **Selected UTC day** and reparse to view another explicit day; the system clock is never used for missing dates.

## Correct or compare sources

1. S07 demonstrates a missing timestamp zone. Parse it and inspect `S07 · line 5 · MISSING_ZONE`. **Inspect source** selects the original offending line.
2. Correct START from `2026-11-05T10:00` to `2026-11-05T10:00Z` in **Original raw text**. Reparse to obtain CW-R at 10:00 to 10:15 UTC. Previous source versions are available in **Previous source drafts**.
3. S05 retains both FQ-B revisions, showing 18:30 and 19:00 UTC. In **Include revision**, choose the intended version, acknowledge review and save. Choosing revision 1 yields four included and one excluded event. Excluded evidence stays in the list/export.
4. Edit original text, document ID, day or ship as needed. Changes are draft-only and disable export. **Save reviewed schedule** rejects unparsed changes. **Discard draft** restores the saved source/request/result, or the last parsed source when there is no saved snapshot.
5. To load another sample while raw changes are pending, deliberately choose **Discard draft & load sample**, or **Keep draft**, reparse and save first. **Active document**, **Add document** and **Remove document** manage the batch. Preserve distinct IDs for distinct source texts; conflicting content under the same ID requires correction.

Native controls support Tab/Shift+Tab and keyboard activation with visible focus. Source/event selections are buttons. Parse/save operations temporarily disable editing to preserve their exact request.

## Input, storage and limitations

Only the invented ordered headers, FREQPLAN, CRYPTO, FLIGHTQ and inert REMARK records documented in [data/README.md](data/README.md) are supported. All twelve supplied scenarios are available. There is no generic prose extraction, real USMTF compliance, OCR/handwriting recognition or model inference. Explicit minute timestamps and zones are required. Uncertain or unsupported lines produce diagnostics and block reviewed save. Equal/backward interval endpoints are rejected. Revisions never supersede automatically. UTC-day clipping only changes display, never source times or duration.

The browser stores drafts, original history and committed review snapshots separately in localStorage for this origin. Ordinary input autosaves only the draft. A deliberate review save commits the schedule; reload restores unsaved changes separately. Storage is local, unencrypted and profile/port-specific. Browser data clearing deletes local work; export first. Storage errors appear visibly and current in-memory work remains. **Discard draft** discards only pending work; browser site-data controls clear all local state.

**Local-only mode** confirms the application's same-origin-only network policy. The service enforces CSP for all modes; no external requests or remote assets are used. This checkbox is not proof of operating-system network isolation. If parsing cannot reach the service, start it at the same address/port and retry. Saved in-memory content remains readable; only a current saved snapshot can export. For `EMPTY_INPUT`, enter a message or load a sample. For other errors, correct the ID/date/ship or source line and reparse. Inspect **About & limitations** for attribution and boundaries.

No operational sponsor, government hosting/device approval, authentication, real-data validation, integration, encryption or deployment is established. Owner approval is required before delivery/deployment. Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/12

## Developer checks

Using the app requires Node and the browser; running application tests separately requires Node's built-in test runner:

```sh
node --test core.test.mjs transport.test.mjs
```

The tests call the same `compute()` used by `/api/invoke` and exercise the real HTTP service. No packages need installing. [verification.md](verification.md) distinguishes local test/visual observations from pending host evaluation. [path-to-fleet.md](path-to-fleet.md) lists ownership, authorization and real-format validation prerequisites. Foundation version/provenance is retained in FOUNDATION.md and foundation-lock.json; no additional dependencies were introduced.
