---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Make an officer choose intent and judge evidence while the system manages implementation details."
---

# Simplicity patterns

## Bottom line

[R] FleetHarness should make a naval officer describe a task, correct assumptions and check concrete examples. [R] Keep code, hosting and schema choices behind an engineering handoff unless they change the user's decision. [R] Preserve visible approval, evidence, cost and stop controls throughout the experience. [P] These controls fit the project's requirement for human review and the event's human-authority and Fleet-condition rules; see [[Event/Rules]] and [[Event/Judging]].

## Specific patterns to borrow

[E] Examples below come from public documentation read November 4, 2026, not a comparative hands-on trial. [R] Government suitability judgments are design recommendations, not authorization determinations.

| Pattern | Concrete product example and evidence | FleetHarness version | Would it survive a government setting? |
| --- | --- | --- | --- |
| [R] Start with an outcome | [V] Lovable starts from a natural-language request and preview: https://docs.lovable.dev/introduction/getting-started | [R] Choose Extract message tasks, Deconflict training, or Work offline, then describe success in one sentence. | [R] Yes, with a prominent synthetic/public-data boundary before input. An unrestricted file drop is a poor default. |
| [R] Use a bounded example instead of a blank page | [V] Bolt teaches a small complete app and inspection of saved rows: https://support.bolt.new/building/quickstart | [R] Preload six synthetic requests with one intentional conflict and one valid case. | [R] Yes. Mark samples persistently and never silently substitute them for real integration results. |
| [R] Plan before changing anything | [V] Lovable's Plan view allows review before code generation: https://docs.lovable.dev/features/plan-mode | [R] Show user, task, constraints, data boundary and three examples in a compact approval card. | [R] Yes, if the approval controls a real action gate. A chat instruction alone is insufficient. |
| [R] Ask about decisions in the user's vocabulary | [V] Power Apps lets the maker revise proposed fields and relationships conversationally: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/ai-conversations-create-app | [R] Ask Can two requests share a room at the same time? rather than Which database constraint should I add? | [R] Yes. Record the answer as an explicit rule and turn it into a test. |
| [R] Keep the result beside the conversation | [V] Retool's canvas allows direct interaction with the generated app: https://docs.retool.com/build/apps/concepts/app-builder | [R] Put sample input, live preview and pass/fail evidence on one page. | [R] Yes, with access controls on preview data and visible environment labels. |
| [R] Point to change | [V] Retool Selection mode scopes a requested change to a component: https://docs.retool.com/build/apps/concepts/app-builder | [R] Let the officer select Conflict warning and request clearer wording. | [R] Yes for presentation changes. Require renewed rule review if behavior or authority changes. |
| [R] Show staged progress | [V] Replit separates drafted, active, ready and completed tasks: https://docs.replit.com/references/agent/task-board | [R] Show Spec approved, Built, Running, Tests passed and Reviewed as separate states. | [R] Yes. Each status needs a stored artifact, time and responsible owner; avoid an unsupported Ready badge. |
| [R] Make verification watchable | [V] Replit browser testing offers test execution and replay: https://docs.replit.com/features/agent/app-testing | [R] Show the rejected overlap, accepted valid request and persisted result. | [R] Yes with synthetic fixtures, repeatable expected outcomes and an independent human check. Replay is evidence of that run, not certification. |
| [R] Make a write request understandable | [V] Retool asks builders to review functions and checks approvals before publishing: https://docs.retool.com/build/apps/quickstart | [R] Show Approve request 4, one record affected, reason required, reviewer role required. | [R] Yes. Enforce authority on the server and log the decision; UI confirmation is only one layer. |
| [R] Put undo within reach | [V] Bolt provides version restoration in its tutorial: https://support.bolt.new/building/quickstart | [R] Offer Restore last tested build and separately Restore data from verified backup. | [R] Yes, when the interface states exactly which assets restoration covers. Never imply a code rollback undoes a data deletion. |
| [R] Hide connection setup behind prepared resources | [V] Retool's new builder uses organization-configured resources: https://docs.retool.com/build/apps/quickstart | [R] An administrator supplies approved synthetic sources; the officer chooses the business dataset. | [R] Yes. Least privilege, model/data boundaries and denied connections must remain inspectable. |
| [R] Make offline state visible | [V] Power Apps documents local data, profiles and synchronization status for mobile offline: https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview | [R] Show Last synced, Pending changes, Conflicts and Export local work. | [R] Yes, if device storage and reconnect behavior are approved and tested. Local editing must not falsely imply the server accepted changes. |
| [R] Provide an escape hatch | [V] FlutterFlow documents exported Flutter projects running independently: https://docs.flutterflow.io/resources/projects/ | [R] Package source, fixtures, dependencies, run instructions and test results for the technical owner. | [R] Yes. Require a clean-machine run with allowed network access, an owner and a patching plan. |
| [R] Translate usage into a bounded decision | [V] Bolt exposes token consumption and explains project-size effects: https://bolt.new/pricing | [R] Show estimated remaining budget, actual spend and Stop after this attempt. | [R] Yes. Enforce spending limits in the execution service rather than relying on the officer to watch a token counter. |

## A proposed FleetHarness first screen

[R] Present three task cards, each with a synthetic example. After a task is selected, show five fields: who uses it, what goes in, what comes out, what must never happen and how we know it worked. Ask at most three blocking questions at once. Offer choices with plain-language consequences, while allowing an answer in the user's own words.

[R] For training, use this review card:

- [R] User: fictional training coordinator.
- [R] Input: six requests, three rooms, explicit start and end times.
- [R] Rule: one room cannot host overlapping approved requests.
- [R] Success: five feasible requests accepted and the conflicting request explained.
- [R] Authority: suggest a schedule; a human reviewer approves it.
- [R] Offline promise: view and edit local draft requests; shared approval waits for reconnect and conflict checks.

[R] After approval, show a preview next to three fixed acceptance cases. A green result must link to the input, expected output, actual output and run log. Put publishing, external connections and database migrations behind separate specific approvals. Keep Stop visible while work is active, and identify who receives an escalation if the build stalls or a guardrail fails.

## What to avoid copying

[R] Do not copy a promise that one sentence yields a production-ready app. Do not expose model selection, hosting providers and database selection as the officer's first decisions. Do not hide synthetic state, failed tests or permission changes behind attractive progress messages. Offer a concrete technical handoff when the task exceeds the supported template.

## Sources

- [V] Prompt to preview: https://docs.lovable.dev/introduction/getting-started
- [V] Reviewable planning: https://docs.lovable.dev/features/plan-mode
- [V] End-to-end tutorial and restore: https://support.bolt.new/building/quickstart
- [V] Conversational schema review: https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/ai-conversations-create-app
- [V] Scoped editing: https://docs.retool.com/build/apps/concepts/app-builder
- [V] Approval and resources: https://docs.retool.com/build/apps/quickstart
- [V] Task stages: https://docs.replit.com/references/agent/task-board
- [V] Browser verification: https://docs.replit.com/features/agent/app-testing
- [V] Mobile offline: https://learn.microsoft.com/en-us/power-apps/mobile/canvas-mobile-offline-overview
- [V] Portable generated project: https://docs.flutterflow.io/resources/projects/
- [V] Usage pricing: https://bolt.new/pricing
