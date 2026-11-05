# Agent activity

The Agents view presents saved run events as a timeline. Planning, build, and verification selectors narrow the timeline; the stage menu includes intake, research, review, and delivery. Activity filters show messages, tools, or issues. The same timeline is used in the preview sidebar and the build-flow inspector.

Tool starts and results appear as one expandable action with a human-readable label, a file path or command when available, a status, and a recorded duration. Expand an action to inspect its input, decoded result, and original saved records. Structured results use labeled fields and lists. Messages render an escaped subset of Markdown: paragraphs, headings, lists, bold text, inline code, and code blocks. Agent output is never interpreted as HTML.

New tool events save the SDK call ID and phase alongside the existing text record. Older runs require no migration: unambiguous tool names and stages are paired from the legacy text. Overlapping legacy calls are left unpaired rather than guessed. Missing results appear as interrupted after a stopped/failed run, or as “No result recorded”; they never imply success. Log size and retention limits are unchanged, so original records may retain the backend's existing truncation.

Live activity follows the newest event until the user scrolls away. “Jump to latest” resumes following. The inspector shows the latest four actions, with a link to the full Agents view.

Independent planning review records host-written milestones for model activity, document-page reads, verdict submission and provider retries. Review text, tool arguments, tool results and provider error details stay out of public activity because they can contain sealed evaluation answers. The planner finishing its files does not complete the phase: reviewer approval and contract freeze must also succeed. A timed-out review keeps the saved plan; **Resume planning** starts a fresh reviewer without repeating completed phases or resetting the one-revision allowance. Architecture comparisons use **Resume comparison** for the same recovery.

## Verification

- `npm test` includes parsing, call correlation, legacy records, interrupted runs, truncated data, unknown tools, and result decoding.
- `npm run test:activity` builds the app and runs an isolated Chromium UI fixture. It checks filtering, keyboard disclosures, structured results, original records, scrolling during updates, stopped runs, long paths, escaped content, and empty states at the supported desktop sizes. It uses installed Chrome by default; `FLEET_BROWSER_CHANNEL` can select another installed Playwright channel.
- `npm run test:desktop` exercises the local Pi SDK workflow and saves the resulting events in `output/playwright/fixture-run.json`.

Activity screenshots are saved under `output/playwright/activity/`. These use synthetic, clearly labeled UI fixtures, not hosted-model output.
