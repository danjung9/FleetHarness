## Primary deferrals

UC20-1, “Open-Source Grounding: Ingest unclassified commercial and open maritime feeds (AIS, IMO ship registries, OFAC/EU sanctions).” real-system: approved feeds and captured registry snapshots are unavailable under synthetic-only scope. Live ingestion is withheld; supplied fictional named-source snapshots demonstrate the complete cited brief workflow. Synthetic, not validated against the real format.

No other primary deferrals. RET-03 owner relevance/latency assessment remains unverified. Owner approval is required before delivery or deployment.

## What the application does

A local research prototype for watchstanders and reviewing analysts. Find a fictional vessel by Name, IMO or MMSI, review source assertions and UNKNOWN values, inspect exact captured evidence and download a draft for human interpretation. No live connections, model or automated decisions are used.

## Prerequisites and startup

The person starting the local service needs Node.js 22.19+; users connect through a current browser. Developer tests also require Node and are separate from normal use. No package installation, credentials or model settings are needed. From this directory:

```sh
HOST=127.0.0.1 PORT=3000 node server.mjs
```

Open http://127.0.0.1:3000/. Keep the service running; module-based pages require this local server. All sample records are embedded in public/index.html. Once Node is installed, the application works without internet. Stop with Ctrl+C; closing the browser alone does not stop the service.

## First walkthrough: research and inspect evidence

1. In **Find a contact**, choose **Identifier type**, enter **Vessel name or identifier**, then choose **Research contact** or press Enter.
2. Try IMO `9001003`. Expect LANTERN REACH, MMSI 990001001, under-way AIS status at 11.2 knots, fictional OFAC and EU findings and Glasshaven departure. Conflicting ownership, cargo and intent remain UNKNOWN.
3. Select a citation beside a fact to inspect the exact highlighted original line, offsets, SHA-256 revision, publisher/location and event/publication/capture times. **Close source** or Escape returns to the citation.
4. Search Name `LANTERN REACH` to review two distinct candidates. Choose an identity, then **Use selected vessel**; no vessel is chosen automatically. An optional **Name constraint** checks agreement with numeric searches.
5. After review, **Download draft** creates synthetic-contact-brief.html with the same computed claims, timestamps and local source appendix. **Print draft** uses US Letter portrait styles. Actual one-page pagination still requires host/manual validation. The download is local and does not publish, approve or transmit a brief.

The samples come from the prepared, unchanged [synthetic fixtures](data/README.md): five fictional identities and 16 snapshots, embedded in the page. No operational records were attached or fetched. The demonstration clock is fixed at `2026-11-05T12:00:00Z`, rather than the current wall clock. In the walkthrough, AIS observation time is `2026-11-05T09:45:00Z` and capture time is `2026-11-05T11:00:00Z`.

## Resolve an ambiguous name

1. Leave **Name constraint (optional)** empty and choose **Name** in **Identifier type**.
2. Enter `LANTERN REACH` and choose **Research contact**. Expect **Ambiguous identity, select a vessel**.
3. In **Review distinct identities**, choose the candidate with IMO `9001015` and MMSI `990001002`.
4. Choose **Use selected vessel**. Expect that identity's own brief, with **OFAC/EU sanctions: UNKNOWN**. It does not inherit the other vessel's list entries.

## Review historical or missing evidence

1. Choose **IMO**, enter `9001027` and choose **Research contact**. Expect **Historical AIS: 2026-10-30T08:00:00Z, STALE** and current position **UNKNOWN**.
2. Choose **Name**, enter `MISTED QUAY` and research again. Expect **Port logs: Arrival, Paperbay, UNKNOWN**, with port freshness **UNKNOWN**.
3. Expand **All supported source assertions** to inspect additional claims; use the individual citations or **Source timestamps** links to inspect preserved sources.

No local sanctions match means UNKNOWN, never cleared. Source observations cannot establish intent.

## Export or print a review copy

1. Research a contact successfully and inspect its citations. Export controls appear only for a resolved draft.
2. Choose **Download draft**. Save `synthetic-contact-brief.html` using your browser's normal download handling.
3. Open the downloaded HTML in a browser. Its citation links jump to the included local source appendix; no running service is needed to read that saved copy. The saved file is read-only output and cannot be imported to restore an app session.
4. To print the current draft, choose **Print draft** and select US Letter portrait in the browser print dialog. Expanded source details are hidden in print. Confirm the preview fits one page; physical pagination and readability still need validation on the target browser/printer.

## Supported inputs and validation

Name/alias matching trims and ignores case but requires exact text. IMO accepts seven ASCII digits with optional IMO prefix; MMSI requires nine. These are illustrative strings without real-registry/checksum validation. Fix errors in place and research again. Editing the query invalidates the previous draft. Queries/selections are session-only; reload clears them, and only download retains a review copy. No save/approval state is implied.

## Storage, reset and integrity recovery

There is no saved search history, editable brief or separate reset-query button. To start another search, replace the input and choose **Research contact**. To clear the session completely, reload the page; download a review copy first if needed. Opening source/provenance panels preserves the current query.

1. Expand **Synthetic diagnostics**.
2. In **Isolated test corpus**, choose **Tampered AIS** and research IMO 9001003 to observe **Evidence integrity error, restore synthetic corpus**, with no usable draft.
3. Choose **Restore synthetic corpus**, then **Research contact** to recover. The query is retained; restoration does not automatically run a search. The diagnostics change isolated memory copies, never the preserved fixture files. **Missing capture time** affects MISTED QUAY. Unknown dates never borrow capture time as event time.

The local raw JSON POST /api/invoke uses the nested synthetic record schema documented in data/README.md; it is not a live feed/import format. Request keys are records, queryType, queryValue and optional asOf, selectedVesselId, nameConstraint, question, inspectSnapshotId. Defaults use 2026-11-05T12:00:00Z. Up to 200 records/200 snapshots are accepted within transport limits. Claims must cite whole exact key=value lines with Unicode code-point offsets and valid UTF-8 SHA-256. Permission/future snapshots are filtered before claims. These fixture flags are not access control.

## Troubleshooting

| Message or symptom | What to do |
| --- | --- |
| Enter seven numeric IMO digits (optional IMO prefix). | Correct the value, for example `9001003`, and research again. Your typed input is retained. |
| Enter nine numeric MMSI digits. | Use nine ASCII digits, for example `990001001`. |
| Enter a vessel name. | Enter a nonblank exact sample name or alias. |
| UNKNOWN, no matching vessel | Check the local synthetic identifier. `9999999` intentionally returns no match. |
| Identity conflict, name and identifier disagree | Correct or clear **Name constraint (optional)**, then research again. |
| Evidence integrity error, restore synthetic corpus | Choose **Restore synthetic corpus**, then repeat the search. |
| No download/print controls | Complete a valid, unambiguous search first. Changing a query invalidates the previous draft. |

## Known limitations and unavailable integrations

If **Local service unavailable** appears, restart the service at the same loopback port and retry. If the port is occupied, choose another PORT. Integrity errors require restoring the original synthetic corpus. No network evidence URLs are fetched; .invalid URLs are fictional source labels. Provenance and source challenge requirements are under **Provenance and requirements**.

All identities, lists, companies and source grammars are fictional. No JLLIS, SharePoint, registry, AIS or sanctions connector exists. Hash consistency does not prove authenticity or immutable storage. Official formats, legal status, intent, operational safety, real-device installation and owner acceptance are unvalidated. Do not infer operational readiness from prototype tests.

## Developer tests

Developers can run the actual application tests (requires Node, separately from browser use):

```sh
node --test contact.test.mjs verification-boundaries.test.mjs
```

Nine application tests passed in the workspace and a clean copied runtime (seven original plus two transport boundary tests). Host clean-runtime core evaluation passed all 21 synthetic cases at threshold 1. Independent browser/download checks and PDF pagination remain separate verification work. See [verification.md](verification.md) for evidence boundaries and [path-to-fleet.md](path-to-fleet.md) for ownership and field-validation prerequisites.

Challenge source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20 (requirements provenance, not vessel evidence).
