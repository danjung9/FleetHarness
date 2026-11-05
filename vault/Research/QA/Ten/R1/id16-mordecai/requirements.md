# MORDECAI, "Adult Supervision" for Shipboard AI

**Problem:** A warship runs a dozen AI systems side by side, sensors, nav, weapons, damage control, logistics, comms. Built independently, sharing physical resources, with nobody arbitrating when they disagree. Two agents issue contradictory orders to the same actuator and nobody notices until something breaks. The hard part of multi-agent systems isn't the agents, it's the undocumented authority between them.

**Approach:** MORDECAI (Multi-agent Oversight, Resource Deconfliction, Emergent Conflict Arbitration, Intervention) is a governance layer above the agents, not another agent. Protocol, not plugins: every agent signs a manifest and honors a four-part contract, heartbeat, intent announcement, action reporting, halt hook. Intents publish to a shared bus before execution; contested resources are managed as leases; policy lives as data, not code. Trust is declare-and-verify with continuous monitoring, mismatch means quarantine, no-go. When intents collide, rank wins: human-assigned base rank, class modifiers per ship condition, live human field promotion. Anything unresolvable escalates to the operator with full context. One move pauses anything, anytime.

**Cognitive burden payoff:** Watchstanders stop being the integration layer. Instead of mentally arbitrating which system to trust when two disagree, the operator sees one governed picture, who won, why, under whose authority, with a single override that always works identically on agent 1 and agent 13.

**Demo:** (1) Live onboarding, register a 13th agent mid-demo, absorbed with zero restart. (2) Condition flip, cruising to general quarters, roster re-sorts in real time. (3) Field promotion, operator promotes the repair agent live in a simulated emergency and it wins the contested actuator.

**Track:** Tactical Intent and Edge Intelligence (Cognitive Burden Reduction); Open Innovation Track as fallback.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/16

## Evaluation criteria
No evaluation criteria supplied. Propose measurable outcomes in scope.md and test-matrix.md; distinguish these from user-confirmed criteria.

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/16

Use synthetic data only. Operational readiness requires independent domain review.