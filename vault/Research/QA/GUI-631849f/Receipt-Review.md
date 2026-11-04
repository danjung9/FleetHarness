---
type: review
status: complete
owner: mukul
updated: 2026-11-04
summary: "Independent review of the GUI receipt, retained observations and remaining evidence limits."
---

# GUI receipt review

[E, receipt and source inspection] [[Research/QA/Results-631849f-GUI]] reports six smoke scripts succeeding at `631849f`. The retained `u123.json` and `fh-org/gui-631849f/scripts/qa-u123.mjs` support the three recorded Home concerns. This review did not execute the app or inspect raw authentication logs. The seven verification/export failures in [[Research/QA/Acceptance-Reconcile-631849f]] remain open.

| Claim | Evidence and correction |
| --- | --- |
| Six fixture-only scripts | [E] This is a mixture of scripted-provider, renderer and desktop checks. `smoke-chatgpt.mjs` starts and cancels a real Codex login flow with browser opening intercepted. Say six smoke scripts reported success, no live model inference or completed sign-in. Do not say no sign-in was initiated or all six used a local provider. That additional protocol check was not in the earlier fixture-only proposal from this QA assignment. |
| U1 | [E] The title was present before searching. Entering its exact visible wording produced zero cards and the empty-result heading. This confirms the search defect at this revision. |
| U2 | [E] Zero Stop buttons appeared on Home before and after reload; the post-reload build status remained running. Opening the build restored a Stop button. This confirms the discoverability defect. The text query only checked an agents-running phrase, so it cannot establish the absence of every possible indicator. |
| U3 | [E] The script compared visible DOM text with the card's `aria-label`; they differ and the label omits the visible title. It did not inspect a computed accessibility tree or run screen-reader or voice-control software. Those effects remain unmeasured. |
| Stop timing | [E] The first poll after the awaited click observed stopped, request count stayed one and status stayed stopped eight seconds later. The recorded 3 ms is time after click completion until the subsequent query, not click-to-stop latency. Request count alone does not establish whether the request remained in flight or whether tools were executing. |
| Start consent | [E] The disclosure appeared before Run Pi agents was clicked on one Pi path. The script does not assert no work before confirmation, cancellation behavior, alternative entry points or backend enforcement. Operator understanding is also unmeasured. |
| `passed: true` | [E] The U1-U3 capture script assigns this when it reaches the end, including when defects are recorded. Errors are caught without setting a failing exit code. Treat its JSON as manually assessed observations, not a passing product regression gate. |

[R] The result strengthens confidence in interface plumbing, not generated pilot behavior, live event-key operation, export correctness or the officer's first ten minutes. Use [[Research/QA/GUI-631849f/Stop-Child-Runbook]] for the next bounded shutdown check. Keep this review beside the original receipt so corrections and execution provenance stay visible.

[E, subsequent direct image inspection] `u2-home-after-reload.png` visibly shows a small green dot beside Agents and no Stop control in the captured Home viewport. It also shows a separate Settings dot, so a dot alone does not explain shutdown or running status to an unfamiliar operator. `consent-dialog.png` visibly discloses local file and shell access, the absence of an OS sandbox, provider transmission and possible usage charges, with Cancel and Run Pi agents controls. These screenshots support visible-content claims; they do not measure comprehension or backend enforcement.
