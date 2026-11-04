# Cited Contact Brief, user guide

## Purpose and audience

Cited Contact Brief is an offline demonstration for watchstanders and human reviewers evaluating synthetic vessel evidence. Look up a contact by name, IMO or MMSI, choose an identity when a name is ambiguous, and inspect the exact source text behind a flag value.

The brief separates current facts from historical evidence and displays `UNKNOWN` for unsupported fields. All included contacts and records are synthetic. The application does not assess intent, sanctions clearance or operational decisions.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled. No installation, server, network connection or package dependencies are required. Node.js is needed only for developer tests.

1. Open [index.html](index.html) directly in your browser.
2. Find the **Find a contact** section. **Identifier type** initially shows **Vessel name**.
3. Select the **Synthetic Lumen** example button to run your first lookup, or follow the walkthrough below.

The initial screen has no brief. Nothing is saved between page loads.

## Walkthrough: look up a contact and inspect its source

1. Set **Identifier type** to **Vessel name**.
2. Enter `Synthetic Lumen` in **Identifier**.
3. Select **Look up contact**, or press Enter in the input.
4. Review these expected results:

   | Field | Expected result |
   | --- | --- |
   | Brief identity | `Synthetic Lumen, SYN-A` |
   | Current flag | `TEST-A` |
   | Destination | `UNKNOWN` |
   | Sanctions status | `UNKNOWN` |
   | Permitted flag evidence | `1 permitted result`, document `reg-a` |

5. Select **Inspect source** beneath **Current flag**. The **Source inspection** panel opens below the brief and receives keyboard focus.
6. Check the source details:

   | Detail | Expected value |
   | --- | --- |
   | Document | `reg-a` |
   | Revision | `r1` |
   | Source locator | `synthetic://registry/reg-a/r1` |
   | Source time | `2026-11-01T09:00:00Z` |
   | Captured time | `2026-11-01T10:00:00Z` |
   | Span offsets | `[0, 29) UTF-16 code units` |
   | Exact cited span | `Synthetic Lumen flag: TEST-A.` |

7. Read **Full retained snapshot** to compare the excerpt with the retained text. The locator is descriptive metadata; inspection reads local text without visiting an external site.
8. Select **Return to brief**. The panel closes, the brief remains, and keyboard focus returns to **Inspect source**.

## Review stale evidence

1. Select the **Synthetic Ember** example button. Alternatively, choose **Vessel name**, enter `Synthetic Ember`, and select **Look up contact**.
2. The brief identifies `Synthetic Ember, SYN-B`. **Current flag** is `UNKNOWN`.
3. Read the notice: `STALE, source dated 2026-01-01T09:00:00Z; current flag UNKNOWN.`
4. Under **Historical evidence**, read `Historical flag: TEST-B`.
5. Select **Inspect source** in that section. It opens document `reg-b`, revision `r1`, with the exact span `Synthetic Ember flag: TEST-B.`
6. Select **Return to brief** to continue.

The fixed reference time is `2026-11-04T12:00:00Z`. Source observations more than 90 days older are historical. This demonstration convention does not advance with your computer clock and is not an approved maritime freshness policy.

## Resolve an ambiguous name

1. Choose **Vessel name**, enter `Synthetic Twin`, and select **Look up contact**.
2. Read `Ambiguous name: choose a contact. No brief has been generated.` Two candidate buttons appear; their records are not merged.
3. Select **Synthetic Twin, SYN-D, IMO 9000004 (synthetic)**.
4. The brief shows `Synthetic Twin, SYN-D` and current flag `TEST-D`.
5. Select **Inspect source** to view document `reg-d` and `Synthetic Twin flag: TEST-D.`

You can select the other candidate to review SYN-C instead. For keyboard use, Tab to a candidate and activate it with Enter or Space.

## Look up an IMO or MMSI

1. Set **Identifier type** to **IMO** or **MMSI**.
2. Enter the corresponding number from the table below, without an `IMO` or `MMSI` prefix.
3. Select **Look up contact** or press Enter. An exact numeric identifier selects its contact directly.

| Synthetic contact | IMO | MMSI | Flag evidence |
| --- | --- | --- | --- |
| Synthetic Lumen / SYN-A | `9000001` | `990000001` | Current `TEST-A` |
| Synthetic Ember / SYN-B | `9000002` | `990000002` | Historical `TEST-B`; current UNKNOWN |
| Synthetic Twin / SYN-C | `9000003` | `990000003` | Current `TEST-C` |
| Synthetic Twin / SYN-D | `9000004` | `990000004` | Current `TEST-D` |

## Supported input and validation

- **Vessel name:** exact full-name matching after trimming surrounding whitespace, collapsing repeated whitespace and ignoring case. `  SYNTHETIC   lumen ` matches; `Lumen` alone does not. No aliases are populated in the included data.
- **IMO:** exactly seven digits, matched exactly after trimming surrounding whitespace.
- **MMSI:** exactly nine digits, matched exactly after trimming surrounding whitespace.
- **Empty input:** rejected with `Enter a vessel name, IMO or MMSI.`

Numeric validation checks only this synthetic format; it does not validate checksums or establish authoritative vessel identity. There is no free-text research query, file import, source editor or live-data input.

## Session data, reset and printing

The app keeps only the current page session. Opening and closing a source preserves the identifier and brief. Editing the input alone leaves the previous brief visible until you submit another lookup. Every submitted lookup clears the prior results and source panel, including submissions that produce validation errors or no match.

There are no **Save**, **Export**, **Reset**, approval or recovery-from-backup controls. Nothing is written to browser storage. Reload the page for a clean lookup; previous inputs, selected identity and results are not restored by the application. Use a new lookup to replace the current result.

You may use your browser's ordinary Print command. Print styling hides lookup controls, source inspection and buttons, and requests A4 portrait output. Check print preview yourself: single-page fit and printed readability have not been visually verified. Any PDF output depends on your browser's print facilities; there is no application PDF export.

## Troubleshooting and recovery

| Message or symptom | What to do |
| --- | --- |
| `Enter a vessel name, IMO or MMSI.` | Enter a sample identifier and retry. The input remains available for correction. |
| `Enter exactly 7 digits for a synthetic IMO.` | Choose IMO and enter a seven-digit value such as `9000004`, without a prefix or punctuation. |
| `Enter exactly 9 digits for a synthetic MMSI.` | Choose MMSI and enter nine digits such as `990000004`. |
| `UNKNOWN, no permitted identity matches this identifier.` | Check the identifier type and use an exact included value. `Synthetic Missing` deliberately produces this outcome. |
| Ambiguous-name message | Choose one of the displayed contact buttons before expecting a brief. |
| Destination or sanctions status is UNKNOWN | The sample records do not support these facts. Absence of sanctions evidence does not establish clearance. |
| STALE notice | Inspect the historical source; its flag cannot establish a current flag. |
| `Source unavailable, fact UNKNOWN.` | The citation failed validation and the brief was cleared. Retry the lookup; do not treat the unavailable citation as support. |
| `Evidence could not be read. Please retry the lookup.` | Retry with a sample identifier. If needed, reload the original index.html; this discards the session. |
| Buttons do nothing | Ensure JavaScript is enabled and open index.html in a modern browser. No server or network setup is required. |

Controls use native keyboard behavior. Tab moves through them; Enter submits the lookup. The implementation includes visible focus styling and a stacked narrow layout. Browser usability and accessibility checks remain outstanding.

## Known limitations and unavailable integrations

The embedded corpus contains seven synthetic snapshots across four identities: four eligible registry records, one excluded registry record and two AIS/sanctions representations that provide no supported destination or sanctions-status spans. The eligibility flag simulates filtering; it is not authentication or access control, and the inline fixture data is readable in the source file.

Retrieval uses a small in-memory lexical baseline and predefined field spans. A lexical score is not confidence, proof of identity or evidence of applicability. Missing, future, malformed, impossible calendar dates or inconsistent source/capture timestamps cannot support current facts. Citation records without document ID, revision, locator or a valid span list are rejected. Conflicting current values remain UNKNOWN rather than selecting a winner. Conflict fixtures are exercised by Node tests, with no dedicated conflict simulation control in the UI.

Local retained text and exact span references provide demonstration traceability, not immutable archival storage or universal factual assurance. No live AIS, IMO registry, OFAC/EU sanctions, JLLIS or SharePoint connector is implemented. Approved public snapshots, source rights, trusted authorization, operational policies and owner-led relevance/latency evaluation remain unresolved. No government-device installation approval or operational validation is claimed.

## Developer tests and verification status

Using the app requires only a browser. Running tests separately requires Node.js 18 or later; the recorded local run used Node v26.0.0. From the directory containing index.html and app.test.cjs, run:

```sh
node --test app.test.cjs
```

No package installation is needed. The tests read index.html, extract its actual `contact-core` script and execute it through Node's VM. They exercise exclusion, exact citation references, Unicode/literal text, identity matching and ambiguity, stale/missing evidence, timestamp boundaries and conflicting values. They do not execute the browser UI.

The verification run passed 10 tests with none skipped after one bounded repair. Added adversarial checks reject impossible calendar dates, incomplete citation provenance and candidate selections outside the matching permitted identities. Desktop/narrow browser journeys, visual inspection, keyboard verification, print fit and human acceptance remain pending in the available evidence.

See [verification.md](verification.md) for test notes and verification boundaries. See [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved owners, approved-data dependencies and authorization work. UC20-1, UC20-2 and RET-03 remain deferred.
