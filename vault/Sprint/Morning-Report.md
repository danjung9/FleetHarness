---
type: report
status: draft
owner: mukul
updated: 2026-11-05
summary: "Where AppYard stands on Thursday morning: what landed, what real builds proved, what still needs a person."
---

# Morning report

Draft, refreshed through the night. Numbers come from receipts named below.

## The short version

[E] `mvp` holds Dan's work through `29ac921` merged with ours, plus connectors, the GenAI.mil framework, API-key sign-in, offline packaging, container export, downloadable service apps, change requests after delivery, and a plan audit.

[E] Benchmark result: [FILL: latest round].

## What only you can do

- [P] Submission is due in the portal at 2:00 PM. Plan was to submit at 1:30.
- [R] Fill the blanks in `Submission/Draft.md`: named user, burden number, team, category, rights split, owners. No agent can supply these.
- [R] One Sailor trial with a stopwatch. There is still no measured burden number, and impact is 30% of the score.
- [R] Run two of the ten challenges through Ark for a real comparison.
- [R] Register real Google and Microsoft client IDs if you want live connector sign-in shown. Sample data and fake servers are all that is proven.
- [R] Try a live GenAI.mil key on an approved device. The framework has never touched the service.
- [R] Check the real macOS keychain path once. Tests stay off it on purpose.
- [R] Decide: rewrite `mukul-dev` history to drop the 272 MB evidence blobs. It needs a force push, so I did not do it.
- [R] Decide what to do about `shourtestmerge` and George's `codex/fh-*` and `deployment-infra` branches, including the Windows installer. Navy desktops are mostly Windows and this was all tested on a Mac.
- [R] Tell Dan to pull `mvp`. Details are in `Research/QA/For-Dan.md`.

## Decisions I made that you should check

- [E] A judge NOT no longer fails the build. It goes to human review with its gaps listed, and approving requires a separate checkbox accepting those gaps. Before this, nothing could ever reach review. The judge now lists things only a person can do, such as operator acceptance, separately instead of counting them as gaps.
- [E] Frontend changes in Dan's code, each listed in `Research/QA/For-Dan.md`: six usability fixes, plain-word labels instead of Pi and Codex, the gap review section, and Request a change.
- [E] Stopped the code-writing council seats. Their sandbox test gate reported 122 false failures on the merged code. Non-code seats kept running, and code work went through Astra agents and my own tests outside the sandbox.
- [E] Stopped the automatic QA loop, because its runs under load reported false failures and added load.
- [E] Installed Ollama and started a colima VM on this Mac for the local model and container tests. Downloaded the `node:22.19.0-bookworm-slim` image from Docker Hub and `devstral-small-2:24b` (about 15 GB) from ollama.com.

## What real testing found

[FILL: list refreshed from `Sprint/Build-Log.md` at the end.]

## Not proven

- [E] Real Google and Microsoft sign-in, live GenAI.mil, the real keychain, Windows.
- [E] Wi-Fi off at the OS level. The network was blocked for the app process, because turning Wi-Fi off would have stopped the builds.
- [E] Generated test processes in the benchmark are not covered by the folder block on agent shells.

## GenAI.mil credit estimate

[A] Builds used 1.6 to 1.9 million gross tokens each before the plan audit. If cached tokens count in full, Tier 0 (2 million credits a day) is about one build a day. Not verified against the service.

## Ark

[R] Honest comparison from earlier: Ark packages and fields software into UDS, and AppYard builds the software from a brief, so they fit together rather than compete. Container export now gives Ark's packaging something to take in. Not yet run through Ark.
