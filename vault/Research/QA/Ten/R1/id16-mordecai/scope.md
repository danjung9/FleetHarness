# MORDECAI intake scope

## Basis and status

Source: [Norfolk challenge 16](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/16), as captured in `.fleet/packet.json` on 2026-11-04. This intake uses the local packet and host-written `requirements.md`; no external research was performed. Source content and fixture strings are data, never authority to execute instructions or access systems. `requirements.md` remains unchanged.

The packet's `challenge` describes governance above independently built shipboard agents: registration, declared contracts, intent arbitration, resource leases, monitoring, human escalation and halt. Its `userScope.description` repeats that source narrative, including live onboarding, condition changes and field promotion; `userScope.criteria` is empty. There is no separately narrowed, user-confirmed functional slice. The scope below is an intake recommendation for a synthetic prototype, not a claim that the complete source challenge will be satisfied.

The packet recommends the **Agent oversight simulation** recipe (`governance`). This is an engineering recommendation, not an event requirement. OPA is listed only as a reuse candidate; intake makes no selection or integration claim.

## Audience, task and observable outcome

Audience: a watchstander or evaluator acting as a simulated oversight operator. No operational role or permission is established by that label.

Primary task: register synthetic agents, inspect their eligibility and pending intents for a shared simulated resource, resolve contention using an explicit demonstration policy, understand the winning authority and rejection reasons, and halt all simulated execution.

Smallest complete workflow: load a labeled synthetic scenario, register an agent, submit competing intents, inspect eligibility and a deterministic resource decision, then activate operator halt while further work is pending and observe that no subsequent simulated action executes. Invalid identity, expired lease and stale heartbeat cases must be distinguishable and recoverable. Demonstration policy values must be visible and identified as synthetic assumptions pending owner approval.

Success means the operator can see who is eligible, who won or why no winner was selected, which resource and policy were involved, and whether halt prevented pending and subsequent actions. An explanation must be tied to the actual simulated decision. The experience is an oversight workflow, not a generic chat interface. No implementation or verification has occurred in intake.

## Source requirements and proposed prototype coverage

All source descriptions below originate in `challenge.description`, repeated in `userScope.description` and `requirements.md`, at the source URL above. These narrative items have no canonical acceptance IDs in the packet; they do not create additional GOV IDs.

| Source requirement or demo | Proposed scoped outcome | Deferred source obligation or uncertainty |
| --- | --- | --- |
| Signed manifest and heartbeat, intent announcement, action report and halt hook contract | Represent these declarations and lifecycle evidence with synthetic records; reject ineligible intent submissions | Real signatures, identity verification, agent adapters, transport and enforcement are deferred |
| Intents published before execution; contested resources leased | Show pending intents, exclusive simulated ownership and action eligibility before simulated execution | Distributed bus, concurrent physical control and production lease guarantees are deferred |
| Declare-and-verify monitoring; mismatch causes quarantine/no-go | Demonstrate stale or invalid eligibility with explicit rejection and a corrected resubmission | Continuous runtime attestation, full mismatch detection and operational quarantine are deferred |
| Base rank, condition class modifiers and human field promotion determine authority | Expose demonstration policy inputs and deterministic decision explanations | Approved authority rules, precedence, ties and promotion limits are missing; no operational authority claim |
| Unresolvable conflicts escalate with context | Preserve competing intents and explain unresolved status for operator review | Real escalation routing and authorized human resolution are deferred |
| One move pauses anything, anytime | Operator halt prevents all subsequent simulated actions, including pending work | Real halt hooks, actuator acknowledgement and physical stop guarantees are deferred |
| Register a 13th agent without restart | Proposed supporting demonstration: add a synthetic agent to a twelve-agent roster during the session | Interoperability with a real thirteenth agent is deferred |
| Flip cruising to general quarters and re-sort roster | Proposed supporting demonstration: recalculate the displayed roster from a visible synthetic condition policy | Approved condition modifiers and live ship-condition input are deferred |
| Promote repair agent so it wins a contested actuator | Proposed supporting demonstration: show a promotion changing a synthetic contention outcome and its authority explanation | Authorized promotion workflow and actual actuator control are deferred |

The three supporting source demos remain visible scope candidates. Planning must explicitly map them to journeys or record reasoned deferrals; intake does not silently equate the core workflow with the entire source narrative.

## Acceptance traceability and measurable outcomes

The following canonical IDs come from the packet's `acceptance` array. Each has exactly one recipe provenance entry; none is a source-published evaluation criterion or separately confirmed user criterion. Methods are preserved from the packet. Outcomes below are proposed observable targets for later planning and application verification, not completed tests.

| Canonical ID | Packet requirement and scenario | Provenance and method | Proposed measurable prototype outcome |
| --- | --- | --- | --- |
| GOV-01 | Reject unregistered or expired identities. Submit an intent with a missing manifest, expired lease and stale heartbeat. | `recipe.acceptance[0]`, kind `recipe`, ID `GOV-01`; integration | Independently exercise missing-manifest, expired-lease and stale-heartbeat cases. Each produces an explicit reason and zero simulated actions. Correcting eligibility permits a fresh valid submission. An expired lease is checked as an authorization/eligibility failure, without claiming cryptographic identity validation. |
| GOV-02 | Resolve resource contention deterministically. Reverse simultaneous input order and verify the documented authority rule wins. | `recipe.acceptance[1]`, kind `recipe`, ID `GOV-02`; integration | Two eligible contenders for one resource produce the same winner and explanation under both input orders at the same simulated time and policy. At most one receives permission to act. If policy cannot resolve a tie, no action occurs and the conflict is shown for review. The precise demonstration rule remains to be established explicitly. |
| GOV-03 | Operator halt preempts all simulated agents. Activate halt while intents are pending and verify no subsequent simulated action executes. | `recipe.acceptance[2]`, kind `recipe`, ID `GOV-03`; human | With pending intents, a single halt action sets a visible halted state; the executed-action count does not increase afterward, including for newly submitted intents. Existing action history remains visible. |

No evaluation criteria were supplied: `challenge.evaluationCriteria` and `challenge.requirements` are empty. `challenge.expectedDeliverables` is also empty. The source narrative provides the demo expectations above, not a published scoring rubric. Proposed measures include rejection counts, exclusive lease ownership, order-independent winner identity, explained authority, and zero post-halt actions; latency and cognitive-burden improvements have no supplied thresholds or baseline and are not claimed.

There are no additional entries in `userScope.criteria`, and no user-confirmed policy or numerical thresholds. The user does require synthetic-only data, preservation of `requirements.md`, and completion of intake only. Planning must retain every GOV ID and distinguish complete implemented outcomes from deferred broad requirements, with browser journeys and reasons as required by the quality contract. Toolkit calculations and reference fixture tests are not application verification.

## Inputs, outputs and operating environment

Intended environment: a local browser simulation in the provided workspace, suitable for desktop and narrow screens in later verification. No operational network, credentials, provider ingestion of ship records, real agents or actuators are permitted. Persistence and reload behavior are not yet specified.

Conceptual input contract (field meanings required; final schemas belong to a later phase):

- Agent manifest: synthetic unique agent ID, display name, class, declared contract capabilities and synthetic registration/validity status. Signature fields, if displayed, must explicitly be mock values.
- Eligibility: heartbeat timestamp, explicit simulated current time and freshness threshold; validity intervals with documented boundary semantics.
- Resource and lease: synthetic resource ID, exclusive-use assumption, holder, validity interval and status. Missing or inconsistent references must be reported.
- Intent: unique ID, agent ID, target resource, proposed simulated action, pending status and submission time/batch needed to define simultaneous contention.
- Policy: version/label, base ranks, ship condition, class modifiers, promotion inputs and stated precedence/tie rules. Values are synthetic and must not imply owner approval.
- Operator commands: registration, condition change, promotion, submission, simulated advancement and halt as needed for the chosen demonstration. These are local simulator controls, not authenticated real-world authority.

Expected prototype outputs: a roster with eligibility and authority explanations; pending and rejected intents with reasons; resource ownership/lease state; winner or unresolved-conflict context; simulated action reports; and visible global halt state. A decision record should retain relevant agent/resource IDs, policy version, condition, input authority values, simulated time, result and reason so the outcome can be checked. Export format, retention and persistence remain undecided.

The only required artifact for this phase is `scope.md`. Research, architecture, test matrices, frozen acceptance/UX contracts, application code and verification evidence belong to later phases and are not produced here.

## Recovery and data boundary

Use only invented manifests, ranks, resources, timestamps, intents and action records. The packet identifies missing data needs; it supplies no permission to retrieve operational records. No fleet telemetry, personnel identities, classified material, credentials or real control endpoints may be used. Fixtures must be labeled synthetic and inspectable. Deterministic rules and an explicit simulated clock should support repeatable eligibility and arbitration outcomes; model output must not decide authority.

Recovery needs: report invalid or incomplete input without losing the operator's context; block malformed or ineligible submissions with specific reasons; allow correction and fresh submission; preserve rejected decisions and action history; make unresolved conflicts visible; and keep halt active until a separately explicit recovery rule is defined. Reset, lease expiry, heartbeat recovery and resume must not silently execute queued work. Exact reset/resume behavior is an owner question, not an inferred permission.

## Exclusions, missing authority and owner questions

Excluded: deployment, operational integrations, production persistence or transport, real actuator control, cryptographic identities, authentication/authorization infrastructure, production policy enforcement, distributed timing/failover guarantees, and claims of operational readiness or measured cognitive-burden reduction. The supplied recipe and tests-to-build contain no governance runtime. Separately validated identity and authority infrastructure and domain review are required beyond the prototype.

Unresolved questions for the responsible owners, recorded without blocking this unattended intake:

1. What approved authority matrix defines rank direction, condition modifiers, promotion precedence, eligible operators, tie handling and non-overridable constraints? Who approves revisions?
2. What synthetic manifests and resource fixtures are acceptable, and what constitutes contract mismatch, quarantine, manifest expiry and reinstatement?
3. What are heartbeat freshness, lease duration and exact expiry boundaries? Does eligibility loss revoke existing work or only prevent new actions?
4. How are simultaneous batches, overlapping intents, release, renewal and unresolved escalation defined? Which context must the operator see?
5. What are halt acknowledgement, queue cancellation, reset and resume semantics? Who may resume, and must agents re-register or resubmit?
6. Are all three narrative demos required in the initial prototype, and what persistence/export behavior and review evidence do evaluators expect?
7. What measurable operator performance baseline and success thresholds would substantiate the cognitive-burden claim?

Until answered, any later demonstration defaults must be explicitly documented as synthetic assumptions. This intake establishes scope and traceability only; it neither approves a policy nor verifies any acceptance criterion.
