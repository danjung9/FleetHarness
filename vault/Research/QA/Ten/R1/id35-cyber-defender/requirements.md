# Autonomous Cyber Defender

Challenge statement: Find, explain and fix misconfigurations and vulnerabilities in isolated, low-bandwidth networks with a human approving every change.

High-value outcome to the fleet: Isolated and afloat networks close new vulnerabilities faster, with every change approved, logged and reversible.

Operational problem: New STIGs and vulnerability bulletins arrive faster than IT and cyber staff can review them. Engineers manually correlate device configurations, logs, firewall and monitoring data to find root causes. Afloat and isolated networks cannot rely on normal patching or cloud tooling, and complex cloud identity policies hide insecure combinations that no existing tool flags.

Scenario:
An isolated, shipboard-like network enclave receives a new STIG release and a critical vulnerability bulletin over a constrained link. Discover affected assets, explain the risk, propose fixes, apply them after approval (or produce steps), verify, and report. A seeded misconfiguration or intrusion is hidden in the environment.

Transition hypothesis:
- Owner: NAVIFOR / Naval Network Warfare Command, NIWC Atlantic and program cloud operators (all appear among submitters)
- Destination: Information warfare training range, then an afloat or shore enclave
- Next steps: 30d: owner confirms target environment; 60d: test on a training range; 90d: authorization path defined; 180d: limited deployment decision

Category: Cyber Resilience & Trusted Autonomy (Status: New)
Category description: Focuses on defending isolated, low-bandwidth naval networks and making AI agents safe to field. Projects will find misconfigurations, vulnerabilities and threats, explain the risk, and stage fixes only with human approval, audit and rollback. Trusted-agent guardrails from this category apply to AI solutions in every category. The goal is a shorter path from new vulnerability to verified fix.
Why this category: Cyber produced the largest single candidate challenge and had no home; about a third of government registrants list a cyber or networking background.

Requirements
Isolated and low-bandwidth
Human approval before any change, with rollback
Full audit trail
Open interfaces; no live Navy networks
Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet.

Expected deliverables
- Shorter time from new requirement or vulnerability to verified remediation
- Fewer manual hours per network
- Risk explained in terms commanders, system owners and data owners can act on
- Every change auditable and reversible

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/35

## Evaluation criteria
1. Share of seeded misconfigurations and vulnerabilities found
2. Time to a correct remediation plan
3. Changes applied only with approval, and rolled back cleanly
4. Works over the emulated low-bandwidth link
5. Complete audit trail
6. Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.

## Resources

- Isolated cyber range with deliberately misconfigured hosts and containers
- Public DISA STIGs and NVD / CVE feeds
- Sample logs and network configurations
- Low-bandwidth link emulation
- SMEs: IT and cyber warfare personnel

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/35

Use synthetic data only. Operational readiness requires independent domain review.