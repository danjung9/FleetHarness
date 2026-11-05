---
type: research
status: complete
owner: mukul
updated: 2026-11-05
summary: "Six ranked operator defects in the merged f2e5422 journey, with source evidence and the smallest fixes for Dan."
---

# Merged officer walkthrough at f2e5422

## Bottom line

[E] Read the clean source at `f2e5422f900cfeb0fd73dae194923c5ea4c43f41` and inspected 12 supplied real-app screenshots. [R] Fix lost brief edits and the hidden account-switch step first, then keep Stop reachable and correct the misleading connector and preview routes. [A] The effects on a non-technical officer below are walkthrough judgments, not measured user behavior. [P] Dan owns the frontend; this is a report, with no application changes.

## Ranked defects

### 1. High: following the Connectors instruction loses brief edits

**Screen:** New challenge and Brief, Use connected data.

[E, source] With no saved connector, the form directs the person to the left-menu Connectors screen. New challenge is a modal, so that menu is unavailable until the dialog closes. Closing removes its locally held draft. In an existing Brief, navigating to Connectors unmounts the form and loses unsaved text, attachments and selections. The footer nevertheless describes the brief as locally saved before submission. See `Connectors.tsx:146`, `App.tsx:40-53,58-71,98,108,236-240,304-310,319`. The [brief screenshot](../../QA/Screens-f2e5422/brief-data/brief-connected-desktop.png) shows the instruction beside unsaved form controls; the [intake screenshot](../../QA/Screens-f2e5422/brief-data/intake-connected-minimum.png) shows the modal and footer. Navigation loss is source-only, not reproduced here.

[A] A person follows the supplied instruction, returns and has to reconstruct the brief, or builds from older saved values.

[R] Smallest change: retain each draft above the routed form and intake dialog, restoring it on return. Describe unsaved edits as unsaved until Save succeeds. This needs no automatic build or connector redesign.

### 2. High: the API-key tab hides the step needed to switch from ChatGPT

**Screen:** Settings, Model & credentials, API key.

[E, source-only] Start with a connected ChatGPT account, then select API key. The key field appears only when `!connected`, regardless of the selected tab. A generic Sign out button is available, but nothing explains that it is the prerequisite. With plan usage enabled, Save model settings can remain enabled while the active account is still ChatGPT. See `ModelSettings.tsx:23-30,42-45,65-82,89-91`.

[A] A person intending to use the event key cannot find anywhere to enter it, or mistakes saving on this tab for switching the billing account.

[R] Smallest change: when ChatGPT is active on the API-key tab, explain the prerequisite and label the existing disconnect action Switch to API key. Show the key form after disconnect and prevent the tab's save action from implying a completed switch.

### 3. High: Stop disappears when the person leaves the project

**Screen:** Home, Connectors and Settings during a build.

[E, source] Stop build is in `JourneyHeader.tsx:19-20`; `App.tsx:294` excludes that header on all three screens. Home's build rows open projects but contain no Stop control (`Home.tsx:19-31`). The [build screenshot](../../QA/Screens-f2e5422/journey-build-minimum.png) shows the control within the project. This carries forward U2 in [[Research/QA/For-Dan]] at the newly inspected revision; it is not a new runtime reproduction.

[A] A person who navigates away while work continues must find and reopen the running project before stopping it. Settings also tells them to stop active builds before changing accounts without offering that action there.

[R] Smallest change: show a running-project name and its existing Stop build action in the shared header while a run is active. Keep it reachable from Home, Settings and Connectors. This finding concerns access to the control, not process-termination behavior.

### 4. Medium: real connectors reveal their build restriction after setup

**Screen:** Connectors, account cards and your own data service, then Brief.

[E, source-only] The page introduces connectors as data for building the app. Account Connect and the custom service address are offered before explaining that live previews cannot be used in event builds. That restriction appears inside the fetched live preview. Its save action still says Use this; the saved card says Data ready, but Brief disables its checkbox. See `Connectors.tsx:98-100,125-128,134-135,149`.

[A] A person signs in or configures a service expecting to build from it, then finds the saved data unusable in the brief.

[R] Smallest change: state before Connect that event builds accept samples and live connections support local preview only. Label the live action Save preview and its saved state Preview saved. Preserve the existing sample path and disabled live-data selection.

### 5. Medium: command-line review offers a preview that cannot run the task

**Screen:** Review, Try the app, for a command-line result.

[E, source-only route] Review offers Open preview for every runtime (`ReviewFlow.tsx:104-106`). For a command-line result, the destination explains that it has no app preview and redirects the person to capability evidence and workspace startup instructions (`App.tsx:144`). Delivery already distinguishes this result with a runnable-package export and README instructions, as shown in the [CLI delivery screenshot](../../QA/Screens-f2e5422/quality/cli-delivery-desktop.png) and `ExecutableDownload.tsx:10-12`.

[A] The officer cannot perform the requested try-the-app step through its button and may treat automated evidence as a substitute for trying the result.

[R] Smallest change: branch the review instruction and action by runtime. For command-line results, open the existing usage guide and explain the required run step; retain capability evidence and the human review gate. No new packaging work is requested.

### 6. Medium: a failed preview is presented as an app that has not been built

**Screen:** Preview after a completed browser or service build.

[E, source-only failure path] `App.tsx:133-145` catches every preview-open error, discards it and sets the preview to null. For a non-running, non-CLI project, the fallback tells the person to start a build, even when a completed build already exists. Reload preview is available, but the screen does not explain that loading failed.

[A] A person may rebuild a successful project instead of retrying its preview or reporting the launch failure.

[R] Smallest change: distinguish a failed preview request from an unbuilt project. Show a short preview-unavailable message with Retry preview and Back to review for completed builds. Keep the existing build and its evidence intact.

## Coverage of the requested path

[E] The walkthrough followed the rendered source and these supplied screens. Account operations, navigation-loss cases and error branches were not executed here.

| Step | Checked behavior and evidence |
| --- | --- |
| Open app | [E] [Fresh Home](../../QA/Screens-f2e5422/home/home-fresh.png), saved-build Home and `ModelSelector.tsx:40-52`: model settings are reachable from the selector or Settings. |
| ChatGPT and API key | [E] Disconnected ChatGPT screenshot and `ModelSettings.tsx`: browser sign-in, cancel/reopen, billing distinction and model save are present. Account switching is finding 2. |
| Other providers | [E] [Other providers screenshot](../../QA/Screens-f2e5422/chatgpt/desktop-pi.png) and `ModelSettings.tsx:85-91`: provider, key, remember choice, model and Save are present. No additional demonstrated blocker. |
| GenAI.mil | [E, source-only] `GenAiMilTab.tsx:32-70` includes address/key setup, connection status, recovery actions, model selection and an explicit live-service-not-tried notice. [P] The charter identifies this as framework only. No live access claim or defect inferred solely from missing live proof. |
| Sample connector | [E, source-only] `Connectors.tsx:101,121-135,144-153`: Try sample data, inspect, Use this, then select the saved sample in Brief. The two selection steps are explained. |
| Account without client ID | [E, source-only] The unavailable-card branch disables Connect and directs the person to an administrator or sample data (`Connectors.tsx:96,100-101`). Missing administrator setup is explained, not an additional UI defect. |
| Own data service | [E, source-only] Address/documentation input, progress, questions, Cancel and preview are present (`Connectors.tsx:99-128`). Finding 4 concerns what that setup can contribute to a build. |
| New challenge and brief | [E] Intake and connected-input screenshots; `App.tsx:57-129,304-310`. Save challenge is separate from the later build confirmation. Finding 1 covers the connector detour. |
| Build | [E] Build and [waiting-question screenshots](../../QA/Screens-f2e5422/conversation/question-minimum.png): phase progress, Project lead questions and Stop are visible within the project. The start dialog discloses host/network access and charges (`App.tsx:321`). |
| Review | [E] [Review screenshot](../../QA/Screens-f2e5422/journey-review-minimum.png), computational-evidence screenshot and `ReviewFlow.tsx`: unverified requirements, prototype limits, review notes, acknowledgment and Request changes are present. Findings 5 and 6 affect trying the result. |
| Deliver | [E] [Browser delivery](../../QA/Screens-f2e5422/journey-delivery-minimum.png) and CLI delivery distinguish app download from source/package export. Later offline packaging and changes after approval are already assigned in the charter and QA record; this report does not duplicate those efforts. |

## Evidence limits and sources

[E] [[Research/QA/Auto/f2e5422]] reports 934 unit passes, 94 harness passes and successful fixture screen checks. Those results do not establish officer comprehension or live integrations. [[Research/Plan/Test-Results]] concerns older revisions; [[Research/QA/Acceptance/Review-3da8ad8]] keeps native receipt scope and later delivery work separate. The sandbox gate report records a dependency-install failure, not a newly reproduced product defect.

[E] Source references above are relative to `~/Documents/CDAO/fh-org/agentic-builder/src/` at the full revision recorded above. The 12 inspected screenshots are supplied under `Research/QA/Screens-f2e5422`; their fixture content is not a real generated challenge or completed live login. No API-key, GenAI.mil or Connector screenshot was found in that set, so those screen findings rely on source.

[E] Context: [[Research/Plan/Plan]], [[Research/Plan/Findings]], [[Research/Plan/Review]], [[Ops/Dev-Pattern]], [[Ops/Directors/Directive-rande]], the assigned charter and both relay files. The direct merged-walkthrough assignment supersedes the older directive's idle instruction. Historical containment and Studio findings are not carried into this report. No public web research was needed for these application-specific observations.

[E] Closing relay reread still names mvp f2e5422 and Dan's merged tip 29ac921. Its updated analysis separates budget, hosted and Windows branches from this desktop baseline. Source identity and clean status were rechecked before handoff.
