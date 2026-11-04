---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "Frontend defects seen in the running app at 631849f, for Dan to decide. Nothing here has been changed in his files."
---

# Frontend reports for Dan

[P] Dan owns the frontend. These are reports, not changes. [E] Each one was reproduced in the running app at `631849f` on the local fixture. Evidence: [[Research/QA/Results-631849f-GUI]].

| Case | What happens | Where | Smallest fix |
| --- | --- | --- | --- |
| U1, medium | Typing a card's own visible title into Search challenges finds nothing. `Message to mission timeline` returns zero cards while that card is on screen. | `src/Home.tsx:35` searches the formal title, summary and category, while line 65 shows the friendly title | Add the friendly title to the searched text |
| U2, medium | While a build runs, Home shows no Stop button, including after a reload with the build still running. The only sign is a small dot on the Agents rail item. To stop: My builds, open the build, Stop run. | `src/App.tsx:235` has a Home branch without Stop; line 237 has it | Show Stop, or a running-build link with Stop, on Home when a build is active |
| U3, low | A card's accessible name is the formal title, not the visible one, so speech and label navigation do not match what a person sees. | `src/Home.tsx:63` `aria-label` overrides the heading at line 65 | Include the visible title in the label |
