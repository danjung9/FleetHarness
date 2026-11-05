Primary deferrals: **UC20-1, real-data:** approved AIS, IMO registry, OFAC and EU snapshots are unavailable, so real-source grounding remains unverified. **RET-03, human-authority (recipe-only):** owner evaluation remains PENDING. The fictional workflow demonstrates research and evidence review; it does not close these requirements.

# Cited Contact Brief user guide

## Purpose and audience

Cited Contact Brief is an offline, synthetic demonstration for watchstanders and analysts practicing source review. Research a fictional vessel by name, IMO or MMSI, inspect the captured evidence behind its brief, record a separate human interpretation, and export a readable brief with an offline evidence appendix.

The application provides a **Cited Contact Brief**, **Identity Resolution Record**, **Evidence Appendix** and **Synthetic Evaluation Report**. Unsupported facts remain **UNKNOWN**. All sample names and identifiers are fictional fixtures, even if they happen to coincide with real entities. The application does not make operational decisions or provide authoritative sanctions screening.

## Prerequisites and quick start

Use a modern browser with JavaScript enabled. Downloads must be allowed to export files. Browser local storage is needed to retain work across reloads; if unavailable, the app can continue in memory.

1. Open [index.html](index.html) directly in your browser. No installation, server, internet connection or Node runtime is required to use the application.
2. Under **1. Contact research**, choose **Load synthetic samples**.
3. Set **Identifier type** to **IMO** and enter `9000003` in **Vessel identifier**.
4. Choose **Research contact**, or press Enter in **Vessel identifier**.

On the first run, no snapshots are loaded and no vessel is selected. Loading samples supplies eight snapshots: seven pass the synthetic permission flag, and six remain eligible after excluding one future-dated snapshot. They represent AIS, IMO registry, OFAC, EU and port logs.

## Walkthrough: research, inspect, interpret and export

1. Load samples and research IMO `9000003` as described above. The selected identity should be **ALDER REACH | IMO 9000003 | MMSI 999000101**.
2. Read **Cited Contact Brief, SYNTHETIC**. The original samples produce these results:

   | Brief item | Expected result |
   | --- | --- |
   | Registered owner | North Lantern Shipping Ltd., citing `REG-A:owner` |
   | Last supported AIS | 36.90 N, 76.30 W at 2026-11-04T10:00:00Z, citing `AIS-A:position` |
   | Historical port call | Fictional Harbor One at 2026-08-01T08:00:00Z, labeled STALE and not current location |
   | Flag and intent | UNKNOWN |
   | Sanctions status | UNKNOWN, name-only OFAC match; EU evidence absent |
   | Factual citation coverage | 100% for the assembled fixture facts |

3. Choose **Inspect REG-A:owner** below the owner. Under **2. Inspect source evidence**, the excerpt should read `Registered owner: North Lantern Shipping Ltd.` The viewer also shows revision 1, `synthetic://registry/REG-A`, capture time `2026-11-04T11:00:00Z`, observation time `2026-11-03T09:00:00Z`, verified integrity, original text, span offsets and SHA-256 digest.
4. Choose **Return to brief** to return keyboard focus to the citation. Other **Inspect** buttons open their corresponding evidence. Expand **Identity Resolution Record** to see the original and normalized query, candidate identities, selection and reason.
5. Under **3. Interpret and review**, enter `Identity requires human review; intent remains unknown.` in **Human interpretation**.
6. Choose **Save interpretation**. The status becomes **Interpretation saved locally.**
7. Check **I inspected the evidence and unknowns.**, then choose **Acknowledge local review**. The status becomes **Local review acknowledged, no operational approval.**
8. Choose **Export brief and evidence**. The browser downloads `cited-contact-brief.html`. Open that file to read the brief, saved unverified commentary, Identity Resolution Record and permitted cited Evidence Appendix without the application or an internet connection. Internal citation links open the corresponding appendix entries.

The exported file has print styling separating the brief from its appendix. Use your browser's print controls if needed; page count depends on content and print settings. One-page readability has not been visually verified.

## Resolve an ambiguous vessel name

1. Set **Identifier type** to **Name**.
2. Enter `ALDER REACH` in **Vessel identifier**, then choose **Research contact**.
3. The app reports two candidates and requires a choice before generating a brief. Review the cards for IMO `9000003` / MMSI `999000101` and IMO `9000015` / MMSI `999000102`. **Inspect identity evidence** opens the evidence for each candidate.
4. Choose **Select this vessel** on the IMO `9000015` card.
5. Its brief shows a synthetic EU identifier-linked designation, citing `EU-B:designation`. Choose **Inspect EU-B:designation** to see `Synthetic designation: IMO 9000015; listed entity ALDER REACH.` This candidate does not inherit the other vessel's owner or AIS position; OFAC status remains UNKNOWN.

Selection records a choice among fictional identities; it does not certify a real vessel's identity.

## Search permitted evidence

1. Load samples if needed, then go to **Search permitted evidence**.
2. In **All-token lexical query**, enter `ALDER REACH owner North Lantern`.
3. Choose **Search evidence**. The original samples return **REG-A** and the exact owner excerpt.
4. Choose an **Inspect** button in the results to open that source span.

Search ignores case, splits the query on whitespace and requires every distinct token to appear in a document. It ranks matches by token occurrence count. Permission and future-date filters apply before matching, and changed snapshots fail integrity checking. No match produces **UNKNOWN, no permitted lexical match.** Search works across the eligible collection, independently of the selected vessel; a lexical hit alone does not establish applicability to a contact.

## Save, discard and acknowledge interpretation

1. Type into **Human interpretation**. A changed note is marked **Unsaved interpretation.** It is retained as a draft when browser storage is available.
2. Choose **Save interpretation** to commit it, or **Discard changes** to restore the last saved note.
3. If you try to research another contact, change selection, load samples or apply an exercise while the note is unsaved, use **Save and continue** or **Discard and continue** in the displayed prompt.
4. Save or discard before choosing **Acknowledge local review**. Review also requires an active brief with verified evidence and the acknowledgement checkbox checked.

Changing the saved note or committed research clears acknowledgement. Discarding an unsaved edit can restore the previously acknowledged saved note. Export includes only the saved note, labeled as unverified human commentary; an unsaved draft is excluded, and a dirty draft is not exported as acknowledged.

There is one workspace note, not a separate notebook per vessel. Saved commentary remains when changing contacts or restoring samples, so review its applicability to each new brief.

## Run and export the synthetic evaluation

1. Choose **Load synthetic samples** or **Restore samples** to return to the original collection, resolving any unsaved-note prompt first.
2. Under **Synthetic Evaluation Report**, choose **Run synthetic evaluation**.
3. The original samples should produce **Held-out cases: 6 | Identity and abstention: 6/6**, four of four relevant spans retrieved, 100% precision and recall, four correct citations and zero excluded leaks. The corpus counts are eight snapshots, seven permitted and six eligible.
4. Read the measured p50/p95 latency and exposed browser/runtime information. Expand **Case outcomes and measurement boundary** for individual results.
5. Choose **Export evaluation report** to download `synthetic-evaluation-report.json`.

There are 20 measured runs per case, totaling 120, with one warm-up per case. Measurements cover the core pipeline and exclude rendering and export. Timings vary by machine and run. CPU model and memory are unavailable. These small synthetic cases have no owner-approved speed target, and **Owner review: PENDING** remains explicit. The evaluation report is not saved across reloads; rerun it when needed. Rerun after changing the corpus to obtain current results.

## Exercise errors and recover the samples

These are built-in synthetic fault scenarios, not a file-import feature. Start with loaded samples and a researched contact such as IMO `9000003`.

1. Expand **Synthetic exercises** in **Contact research**.
2. Choose an **Exercise**, then choose **Apply exercise**:

   | Exercise | Expected behavior |
   | --- | --- |
   | Changed snapshot | REG-A fails its digest check. Identity is resolved again from verified snapshots, affected owner facts become UNKNOWN, the old viewer is cleared and export is blocked. |
   | Malformed import | The diagnostic BAD-1 record is rejected for missing capturedAt; the previous corpus remains available. |
   | Conflicting AIS | Two equal-time positions are shown. The location conclusion becomes UNKNOWN and human review is required. |

3. For **Conflicting AIS**, the competing values are **AIS-A: 36.90 N, 76.30 W** and **AIS-C: 35.10 N, 75.00 W**. The app does not offer an automatic resolution.
4. Choose **Restore samples**, then **Research contact** to generate a brief from the original eight snapshots. Restore preserves the query and notes but clears the active selection and brief.

Use **Stop** to remove the active brief and selection while keeping the corpus, query and notes. Research again to resume. Stop is not a full data reset and does not clear every secondary result display.

## Input formats and evidence rules

| Field | Accepted input and validation |
| --- | --- |
| Vessel identifier, IMO | Exactly seven digits after trimming surrounding spaces and an optional case-insensitive `IMO` prefix; for example, `9000003` or `IMO 9000003`. No real IMO checksum check is performed. |
| Vessel identifier, MMSI | Exactly nine digits after trimming surrounding spaces; for example, `999000101`. |
| Vessel identifier, Name | Nonempty text, normalized to uppercase with repeated whitespace collapsed. Name matching uses the normalized full name. |
| All-token lexical query | Whitespace-separated terms; case-insensitive matching. An empty query returns no matches. |
| Human interpretation | Free text saved separately from structured facts and escaped in exported HTML. |

Malformed identifiers produce an inline error and keep the entered text so it can be corrected. An unknown name such as `NO SUCH VESSEL` produces **UNKNOWN, no permitted identity match.** No real files, URLs, feeds or custom snapshot imports are supported through the UI.

Stale AIS is labeled STALE and not current location; AIS with an unknown observation time cannot establish the latest position. Export reassembles the committed brief and refuses altered asserted values or identity metadata even when citation IDs still exist.

Freshness uses the fixed synthetic as-of **2026-11-04T12:00:00Z**, not the current clock. An age strictly greater than 30 days is STALE. Capture and observation age are assessed separately: a newly captured historical port record remains stale, and an unknown observation time remains UNKNOWN. Future capture or observation times exclude a snapshot from retrieval.

Source text is hashed as UTF-8 with SHA-256. Displayed span offsets are zero-based, end-exclusive JavaScript UTF-16 character indices. Digests detect changes relative to the packaged expected values; they do not establish source authenticity or production immutability.

## Persistence, export and reset

When available, browser localStorage retains the corpus, query type and text, selected identity, saved interpretation, unsaved draft and local acknowledgement. Reload reconstructs the brief and revalidates stored evidence. Drafts survive citation viewing and ordinary reloads. Evidence-search results, the open source viewer and evaluation results are not persisted.

Storage is local to the browser and file context. Moving the file, using another browser/profile or clearing browser data may lose access to that workspace. There is no account, synchronization, workspace backup/import or multi-contact history. Downloaded HTML and JSON are readable outputs, not restorable workspaces.

To clear local work:

1. Export any brief or evaluation you want to retain. Save a draft first if you want its text included in the brief.
2. Choose **Reset local work**.
3. Choose **Confirm reset** to clear the corpus, active research, notes, acknowledgement and evaluation, or **Cancel** to keep the workspace.
4. Choose **Load synthetic samples** to start again. Existing downloaded files are unaffected.

If local storage is unavailable, the application reports that it is working in memory. Export saved work before closing. If stored evidence fails validation on reload, notes may still be recovered, but the evidence should be restored using the sample controls.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Research or evaluation asks for samples | Choose **Load synthetic samples** first. |
| “Enter a synthetic IMO with exactly 7 digits.” | Select the intended identifier type, correct the length or characters, then research again. MMSI requires nine digits. |
| Two candidates appear | Inspect their identity evidence and choose **Select this vessel** on the intended card. |
| UNKNOWN result or missing evidence | Check the input and sample identity. The app does not fill unsupported facts from memory or treat absent sanctions evidence as clearance. |
| Review asks you to save or discard | Use **Save interpretation** or **Discard changes**, then check the acknowledgement box and retry. |
| Export says to research a contact first | Generate a brief; resolve ambiguity if present. |
| Export is blocked by integrity failure | Choose **Restore samples**, then **Research contact**. |
| Download does not appear | Check the browser's download list, download permissions and chosen download folder. Keep the app open and retry after permitting downloads. |
| Evaluation export says to run evaluation | Choose **Run synthetic evaluation**, then export. |
| Storage or restore warning appears | Retain any visible note text, restore samples, and export saved work before closing. Browser settings may restrict local-file storage. |
| Reset or Stop leaves secondary text visible | Reset/Stop should be assessed by the active-brief status. Stop preserves secondary results; a full fresh page reload clears transient displays. |

Native controls support Tab navigation and visible focus. Enter in **Vessel identifier** submits research. Citation controls move focus to the evidence viewer; **Return to brief** returns it to the citation. The initial host run passed 15 of 18 browser runs. Integrity recovery and narrow evaluation layout were repaired; browser confirmation of the revised source and human accessibility review remain pending.

## Known limitations and unavailable integrations

- All data is synthetic. There are no live AIS, IMO registry, OFAC/EU, JLLIS, SharePoint or other registry connections, and no approved public snapshots.
- The permission flag is a filtering test fixture, not authentication or production access control. Browser storage is not encrypted storage or an immutable evidence archive.
- Packaged digests do not protect against replacement of both text and expected digest. There is no cryptographic signing or trusted capture service.
- Retrieval is a lexical scan over a tiny supplied corpus. It does not provide semantic search, automated research acquisition, authoritative identity certification, sanctions clearance or intent prediction.
- Human acknowledgement is local only. No operational approval, reviewer signature, external notification, installation authorization or authority to operate is supplied.
- Exported commentary can make the brief longer; one-page print quality and full usability/accessibility are not established by core tests. Owner label review, representative-scale performance and operational validation remain outstanding.

See [path-to-fleet.md](path-to-fleet.md) for field-validation prerequisites, unresolved owners and integration dependencies.

## Developer tests, Node required

Using the browser application requires no Node installation. Running its developer tests requires a modern Node runtime providing `node:test`, `TextEncoder` and `performance`. The recorded local build run used **Node v26.0.0**.

1. Open a terminal in the directory containing index.html and application.test.cjs.
2. Run:

   ```sh
   node --test application.test.cjs
   ```

3. Review the actual pass/fail output. No package installation or server is needed.

The tests extract and execute the actual inline `app-core` from index.html. They cover digest vectors, corpus validation, identity resolution, permission/future filtering, exact citations, freshness, conflicts, integrity blocking, safe portable HTML, review-state logic and evaluation arithmetic. They do not execute the browser DOM workflow.

[verification.md](verification.md) records **18 passed, 0 failed, 0 skipped** locally after the host-failure repair. The added test executes the actual UI handlers with a minimal DOM adapter to cover changed-snapshot recovery and blocked export. This is not browser evidence. The preserved host report has 17/17 Node tests and 15/18 browser runs passing on the previous source; a host rerun must confirm all desktop/narrow journeys on the repaired source. Print review, reviewer acceptance and operational validation remain unverified.
