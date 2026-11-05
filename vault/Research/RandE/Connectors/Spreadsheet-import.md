---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use a synthetic CSV export first; local workbooks and cloud spreadsheet APIs add distinct risks."
---

# Spreadsheet import

## Bottom line

[R] For Thursday, start with one synthetic worksheet exported as CSV. [R] Local Excel files, Google Sheets and Excel through Graph are different connectors with different permissions. [V] A read-style Excel Graph method can still require `Files.ReadWrite`. https://learn.microsoft.com/en-us/graph/api/workbook-list-worksheets?view=graph-rest-1.0 [R] Do not promise a harmless read-only account grant merely because the app only displays cells.

## How it works

| Path | Mechanism and boundary |
| --- | --- |
| [R] Local CSV | Use the fixed-schema importer in [[Research/RandE/Connectors/CSV-import]]. Ask the user to export only a newly created synthetic sheet for the event. |
| [R] Local `.xlsx` | Use a separately reviewed parser with workbook size, sheet, row and decompression limits. Select one visible sheet and range. Never execute macros, evaluate formulas or resolve external links. Reject encrypted or macro-enabled files in the first version. |
| [V] Google Sheets | `spreadsheets.readonly` covers all the user's spreadsheets; Sheets grants cannot be narrowed to one worksheet tab. `drive.file` is an accepted narrower file-selection option. https://developers.google.com/workspace/sheets/api/scopes |
| [V] Google value reads | `spreadsheets.values.get` reads a specified range and accepts `drive.file` among its grants. A range limits returned cells, not the authorization grant. https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get |
| [V] Excel through Graph | Listing worksheets requires delegated `Files.ReadWrite`; application permission is not supported for that method. The method is documented for US Government L5. https://learn.microsoft.com/en-us/graph/api/workbook-list-worksheets?view=graph-rest-1.0 |

[R] Do not generalize the cited Excel method to every workbook API. Confirm each required range/read operation and cloud before choosing it. Downloading an approved workbook for local parsing is a different design and grant from invoking Excel workbook APIs.

## What the user sees

[R] A spreadsheet import shows the chosen file, sheet and range, then a field preview. Explain which columns enter the task and which are ignored. Report formulas, missing values and unsupported dates rather than silently treating stale cached results as current. Require confirmation before replacing task rows. A later reimport should show differences and clear the old review.

## Navy approvals and event rule 4

[R] Local imports need approved software and data-handling paths; cloud imports add the relevant tenant/Google consent and authorization-boundary review. See [[Research/RandE/Connectors/README]]. If an endpoint requires write permission, obtain explicit approval for that grant or choose another path.

[R] Workbooks can conceal disallowed content in other sheets, comments, formulas, metadata and links. A visible synthetic-looking tab in a real workbook is insufficient. Create the event workbook from scratch and never copy a personnel roster. The import must prevent unselected content from reaching model context or logs.

## Thursday and post-event

[R] Thursday: create an invented one-sheet example, export CSV and use that path. Native `.xlsx` is optional only if the main session implements and independently checks bounded parsing without delaying the accepted task. No live Google or Microsoft account is needed.

[R] Post-event: confirm which spreadsheet format users actually have, choose one path and test hidden sheets, formulas, date systems, large/corrupt files, column changes and grant revocation where applicable. Do not infer interoperability from a single happy-path file.

## Build size and evidence

[A] Estimate: CSV reuses its 4 to 8 hour base; local `.xlsx` adds 1 to 3 engineer-days; chosen-file Sheets adds 2 to 4 days after auth; Excel workbook API integration adds 3 to 5 days after Graph auth and permission review. Shared work is not additive across every choice. No workbook library or spreadsheet API was executed here.

## Sources

- [V] https://developers.google.com/workspace/sheets/api/scopes
- [V] https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get
- [V] https://learn.microsoft.com/en-us/graph/api/workbook-list-worksheets?view=graph-rest-1.0

