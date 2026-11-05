---
type: research
status: active
owner: mukul
updated: 2026-11-05
summary: "Frontend defects seen in the running app at 631849f, for Dan to decide. Nothing here has been changed in his files."
---

# Frontend reports for Dan

## Pull `mvp` now, 2026-11-05 02:43 EST

[E] `mvp` is `f2e5422` and contains everything on `dan/backend-improvements` through `29ac921`, merged with our backend, connectors, the GenAI.mil framework, the Model settings tabs and API-key sign-in. Please pull `mvp` and continue from there, so the merge is not repeated. Keep pushing to your branch as you like. It gets merged and tested, then lands on `mvp`.

[E] Tested at or just before that commit, outside the agent sandbox: 934 of 934 unit tests, 94 of 94 harness tests, all 16 real-screen scripts, and native checks for inputs, browser recovery, detached Stop and resume. Fixtures only. No real build yet at this commit; the benchmark round is running now.

[E] Frontend lines changed in your code, so you can check them:

- `src/App.tsx`: Connectors rail item and route, change-request hook on the delivery page.
- `src/ModelSettings.tsx`, `src/model-settings.css`: the four tabs (ChatGPT, API key, Other providers, GenAI.mil).
- `src/BriefDataInputs.tsx`: a Use connected data section in the brief.
- `src/api.ts`: browser preview now rejects unusable saved state instead of showing a blank screen.
- New files: `src/Connectors.tsx`, `src/connectors.css`, `src/GenAiMilTab.tsx`.
- Exact lines: `docs/backend-integration-frontend.patch`, `docs/connectors-frontend-lines.md` and `docs/connectors-integration.md` in the repo.
- Coming next: `src/ReviewFlow.tsx` and `src/ProjectConversation.tsx` get a Request a change control after approval. These are being tested now.

[R] Decision for you: `skills/impeccable` and `skills/ponytail` are third-party. They must be disclosed in the submission and they add about 11.6k tokens to initial prompts, plus about 13.6k optional. `skills/THIRD_PARTY.md` lists them. Say if you want them handled differently.

## Earlier reports

[P] Dan owns the frontend. These are reports, not changes. [E] Each one was reproduced in the running app at `631849f` on the local fixture. Evidence: [[Research/QA/Results-631849f-GUI]].

| Case | What happens | Where | Smallest fix |
| --- | --- | --- | --- |
| U1, medium | Typing a card's own visible title into Search challenges finds nothing. `Message to mission timeline` returns zero cards while that card is on screen. | `src/Home.tsx:35` searches the formal title, summary and category, while line 65 shows the friendly title | Add the friendly title to the searched text |
| U2, medium | While a build runs, Home shows no Stop button, including after a reload with the build still running. The only sign is a small dot on the Agents rail item. To stop: My builds, open the build, Stop run. | `src/App.tsx:235` has a Home branch without Stop; line 237 has it | Show Stop, or a running-build link with Stop, on Home when a build is active |
| U3, low | A card's accessible name is the formal title, not the visible one, so speech and label navigation do not match what a person sees. | `src/Home.tsx:63` `aria-label` overrides the heading at line 65 | Include the visible title in the label |

## At d0f4c69

[E, automatic QA, [[Research/QA/Auto/d0f4c69]]] All 116 unit tests and 51 harness tests pass outside the agent sandbox. Five GUI smoke scripts fail: `smoke-activity`, `smoke-electron`, `smoke-home`, `smoke-model-selector` and `smoke-system-design`. [A] They look stale against the new UI rather than app defects: for example, two Start build buttons now exist, one in the header and one in Stage details. [R] dev-3 is updating the scripts on `dev/reviewed`, with no change to `src/`. Dan, if you are fixing these yourself, say so through Mukul and the seat will stop.

## Needs a small control or wording

- [E, `b8cb505`, not landed yet] A failed build will be able to resume from its last good stage through `resumeRun` in IPC and preload. It has no button yet, and a Resume button on a failed build is yours if you want it.
- [E, `d402b67`, not landed yet] On an event API key run, the start dialog, readiness text and model settings still say ChatGPT subscription allowance. That wording should change when the account is an API key.
- [E, automatic QA at `1d9eeee`] `smoke-electron` and `smoke-norfolk` fail. Cause not yet known; see [[Research/QA/Auto/1d9eeee]].

## 2026-11-04 17:41 EST: use `git pull origin mvp`

- [E] A plain `git pull` fetches every branch, including `mukul-dev`, which carried about 272 MB of test screenshots and browser traces. Those files are now out of the branch's latest commit and new ones are no longer added, but they stay in its history. `git pull origin mvp` fetches only your branch.
- [E] `c4f6ac9` made every real build on a Mac that got past tests end as failed, because a `ps` flag this Mac rejects made process cleanup fail. `f5fec32` fixes it. Pull before you push: org commits now land on `mvp` directly.
- [E] Known failure on `mvp`: tests/pi-backend.test.mjs "the complete workflow advances in order" gets an extra `bash` tool. It fails before and after `f5fec32` and is being fixed.

## 2026-11-04 18:01 EST: new screens coming

- [P] Mukul ordered data connectors and more sign-in tabs. Coming to `mvp` once tested: a new Connectors screen (new files `src/Connectors.tsx` and `src/connectors.css`, one rail entry, one section in the brief) and tabs in `src/ModelSettings.tsx` (ChatGPT, API key, GenAI.mil, Other providers). Changes to existing frontend lines are kept to the minimum and will be listed here.
