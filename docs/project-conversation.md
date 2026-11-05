# Project lead and clarification

Open **Project lead** in the toolbar of a saved project. One conversation stays with that project through Brief, Build, Review and Deliver, including fresh builds and renderer reloads. It uses the selected Pi or Codex model and runs only when a message is sent. Chat does not occupy one of the three factory run slots.

The lead can explain the current brief, phase status, failures and relevant artifacts. It can propose starting or stopping a build, or revising the title, problem statement and criteria. An action card shows the proposed changes and consequences before the user applies it. A revision stops a running build, saves the revised brief, resets verification and approval, and starts a fresh build. Attached inputs and other brief fields are retained. Earlier run directories remain available. A proposal tied to an older brief or run is rejected.

## Research and planning questions

Research and planning agents receive `fleet_request_clarification`. They use it only when a missing user decision materially affects the workflow, success criteria or a major tradeoff. Routine choices continue automatically. Each phase can ask at most two rounds of one to three questions, with optional recommendations.

Each question declares an `answerType` that selects its answer controls:

| Answer type | Tool input | Project lead controls |
| --- | --- | --- |
| `text` | Question and context; omit options | Open-ended text area |
| `single_choice` | Question, context and 2–4 distinct options | Radio buttons for one choice |
| `multiple_choice` | Question, context and 2–4 distinct options | Checkboxes for all applicable choices |

Choice forms also accept written context or a custom answer without selecting an option. Choices start unselected, recommendations never submit an answer, and **Clear selection(s)** lets the user switch to a written answer. Draft text and selections survive renderer reloads. Earlier saved questions and legacy tool calls infer single choice when options are present, otherwise text.

The answer API accepts `{ selectedOptions: string[], text: string }`. The host validates the selections against the question, limits single-choice answers to one selection, and saves both the structured response and readable answer text. Both reach the resumed agent. Legacy string answers remain supported.

After requesting clarification, the agent ends its turn. The host closes the model session and waits outside the agent timeout. The project shows **Waiting for your answer**, and Project lead exposes explicit answer controls. Nothing is submitted automatically. An ordinary chat message does not answer the phase question; the lead can help explain it while the worker remains waiting.

Once all questions in the round are answered and saved, the same phase runs in a fresh model session with those answers. They also reach downstream phases through prompts and a host-owned `clarifications.json` artifact. Integrity checks protect that artifact. Answers resolve ambiguity within the original brief; changes to scope use a separate brief revision. Original requirements, acceptance IDs and frozen contracts remain authoritative.

Stopping a run cancels outstanding questions. Late or duplicate answers are rejected. After an application restart, interrupted builds remain stopped, their unanswered questions close, and prior conversations and answers remain available. This version does not resume an interrupted build automatically.

## Runtime boundaries and efficiency

Conversation history is separate from bounded run logs. A lead response receives an excerpted project snapshot and at most sixteen recent messages; the full latest request is preserved. Read tools retrieve bounded pages of earlier conversation, brief fields and allowlisted artifacts when needed. The lead has no shell, source editing, delivery approval or export tool. Codex conversations use read-only mode with command tools disabled; Pi receives an explicit custom-tool allowlist. Codex settings follow the [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

Lead responses have a three-minute deadline, a one-minute inactivity limit and an eight-turn budget. Cancelling a reply does not stop its build. The lead uses separate cancellation and concurrency state, so worker execution continues during ordinary conversation. No model calls or polling run while a clarification is waiting. Builds that ask no questions use the existing number of phase sessions and prompts. A clarification adds a new session when the answer arrives; revising a brief starts the entire build again.

## Validation

- `npm test` includes coordinator isolation, history, context bounds, artifact access, proposal validation, cancellation, interrupted-state recovery, broker persistence and pipeline integration tests.
- `npm run test:conversation` builds and runs a real Electron/Pi SDK smoke using an explicit local streaming provider fixture. It checks action application, stale proposals, all three clarification answer controls, draft restoration, partial-round waits, structured answers in resumed sessions, unchanged frozen contracts, reloads, fresh builds, stopped questions, keyboard focus and desktop overflow.
- Captures and the smoke result are written to `output/playwright/conversation/` at 1512×982 and 1120×720.

The fixture proves the application integration. It does not measure hosted-model latency, token cost, question quality or production account behavior. Voice input and live redirection of implementation agents are outside this version.
