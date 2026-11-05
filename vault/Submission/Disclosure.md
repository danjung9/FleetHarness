---
type: disclosure
status: draft
owner: mukul
updated: 2026-11-04
summary: "Rules 5, 7 and 10 disclosure from Sprint logs, with later run evidence and unresolved ownership."
---

# AppYard disclosure

[P] Rules 5, 7 and 10 require tools, prior work and friction to be disclosed. [E] This draft summarizes the Sprint ledgers and adds later run evidence. Completeness, exact versions and contribution rights need team confirmation. Sources: [[Event/Rules]], [[Sprint/Tool-Disclosure-Log]], [[Sprint/Prior-Work-Log]], [[Sprint/Friction-Log]].

## Rule 5: tools, models, data and services

[R] Include the full [[Sprint/Tool-Disclosure-Log]] with this disclosure. Its itemized products, providers, purposes and account basis are incorporated by reference, including supporting research and coordination services. The grouped inventory below is a summary, not a replacement for that attachment.

| Resource | Recorded use, provider and version boundary |
| --- | --- |
| Build and evaluation | [E] Codex CLI 0.163.0; gpt-6.1-sol and gpt-6-astra, OpenAI event access. The real factory run used gpt-6.1-sol through the Codex engine with event API-key access. Sources: [[Sprint/Tool-Disclosure-Log]], [[Research/Plan/Real-Build-Run1]]. |
| Research and coordination | [E] Hosted web search, personally provided models and browser automation are listed with exact product names and providers in [[Sprint/Tool-Disclosure-Log#Used]]. They do not establish the factory run's model route. Source: [[Research/Plan/Real-Build-Run1]]. |
| Application stack | [E] Pi coding agent SDK 1.5.0; Electron, React, Vite, TypeScript, Playwright and electron-builder, recorded as open-source dependencies added by the teammate. Most exact versions are missing centrally. Source: [[Sprint/Tool-Disclosure-Log]]. |
| Independent checking | [E] Team-created ID 11 checker and UI adapters; Node.js v26.0.0, Playwright 1.64.1 and Google Chrome 156.0.8078.80 in the factory receipt. Providers: team, Node.js project, Playwright project and Google. Sources: [[Research/QA/Acceptance/README]], [QA receipt][qa]. |
| Local tools | [E] Git/GitHub CLI, Git 2.50.1, ripgrep 15.2.0, Python 3.9.6, pdftotext, macOS process inspection, command/patch/image interfaces and clocks. Sprint scripts include fh.py, bridge and council runner. Documentation and collaboration tools are listed centrally. Providers and missing versions remain as recorded. Source: [[Sprint/Tool-Disclosure-Log]]. |
| Data | [E] Captured event requirements/documents, cited public research and synthetic QA examples, golden answers, Stop fixture and browser variants. The demonstrated task uses fictional people, rooms and rules. Sources: [[Sprint/Tool-Disclosure-Log]], [[Research/QA/Officer/11-Training-Golden]], [[Research/Plan/Real-Build-Run1]]. |

[E] The ledger separates four studied projects from tools used, and offered services from adopted resources. Neither group establishes incorporation. Source: [[Sprint/Tool-Disclosure-Log]].

[E] Run1's interface incorrectly described its allowance and provider route; actual access is recorded in [[Research/Plan/Real-Build-Run1]]. Token use and cost are unknown. [R] Reconcile later use, exact dependency versions, model identifiers and any ledger rows withheld from pushed copies before submission. Keep secret values and credential links out. Sources: [[Research/Plan/Review]], [[Sprint/Tool-Disclosure-Log]].

## Rule 7: prior work and ownership

| Material | Disclosure |
| --- | --- |
| Existing AppYard/FleetHarness source | [E] The log identifies existing source and reviews from f72c5dc through later revisions. It does not establish the pre-event/event split or top-level license. **[MUKUL/DAN TO SUPPLY: imported ffc21e2 history, ownership, timing and restrictions].** Sources: [[Sprint/Prior-Work-Log]], [[Research/Plan/Review]]. |
| Event work | [E] November 4 records document the four-file experimental patch, one 13.4-minute build, synthetic artifacts and later independent browser checks. They do not make the entire source base event-created. Sources: [[Research/Plan/Real-Build-Run1]], [QA receipt][qa]. |
| Alternate candidate | [E] CLI-route has separate provenance. Its results cannot be attributed to the factory run. Sources: [[Sprint/Prior-Work-Log]], [[Research/QA/Acceptance/README]]. |
| Rights and staff disclosure | [E] Contributor permissions, restrictions and disclosure to staff remain unverified. [R] Attach the confirmed split and dependency notices before claiming completeness. Source: [[Sprint/Prior-Work-Log]]. |

## Rule 10: friction

| Type | Barrier or gap | Next action [R] |
| --- | --- | --- |
| Policy | [E] Partial-category and sync requirements need a ruling; no waiver is recorded. Sources: [[Reference/Open-Questions]], [[Research/Plan/Review]]. | Obtain the organizer's disposition through an authorized person. |
| Data | [E] Synthetic cases supply no measured user burden. Source: [[Research/QA/Officer/Burden-Claim]]. | Confirm the workflow and run a matched trial. |
| Authority | [E] Execution ownership is restricted; artifact and submission approval remain human decisions. Sources: [[Sprint/Friction-Log]], [[Research/Plan/Plan]]. | Bind a person's decision to the exact artifact and scope. |
| Infrastructure | [E] Browser work hit loopback permission limits; a checkout initially lacked Electron. Sources: [[Sprint/Friction-Log]], [[Research/QA/Results-50fcaea]]. | Preserve the working runtime and validate the delivery device. |
| Acquisition | [A] Funded support, installation route and procurement needs are unconfirmed. This is a transition gap, not an observed procurement delay. Sources: [[Research/Plan/Plan]], [[Submission/Next-30-60-90]]. | Name owners and resources before a pilot. |
| Technical | [E] Initial discovery left 27 checks unmeasured per candidate. Later adapters enabled checks; the factory candidate retains a clock failure and 14 unchecked items. MVP gate: 20 failures. Sources: [[Sprint/Friction-Log]], [QA receipt][qa], [current gate][gate]. | Fix applicable failures and rerun without weakening expected answers. |

[E] The experimental permission profile denied selected outside reads allowed by the default. One utility then could not load a library; the build continued with another command. This is a containment and compatibility finding, not a shipped fix. Source: [[Research/Plan/Real-Build-Run1]].

[E] Local tools, reused evidence and writing-boundary friction are recorded in [[Submission/Sprint/Submission-Log]]. Central logs have not been changed by this draft.

[qa]: ../Research/QA/Acceptance/Results/training-acceptance-edf3150f-4563-4059-b9c0-6ecca70e64ac/result.json
[gate]: ~/.local/share/fleethacker-context/org/reports/mvp-gate.md
