---
name: fleet-governance
description: Design and test simulation-only agent oversight protocols covering registration, authority, resource leases, intent conflicts, audit and operator halt.
---

# Oversight protocol simulation

Use synthetic shared resources and a simulator. Define manifest identity, allowed actions, heartbeat expiry, intent announcement, decision receipt, action result and halt acknowledgement before building agents. Real equipment and physical actuation are outside the toolkit.

Make authority and tie-breaking explicit policy data owned by the operator. Leases need expiry, ownership and recovery behavior. A heartbeat is liveness evidence, not proof of identity or correctness. A cryptographic claim requires actual key issuance, verification and revocation tests.

Test unregistered agents, expired heartbeats, duplicate intents, concurrent resource requests, condition changes, rank ties and malformed telemetry. Reverse arrival order to verify the intended determinism. An operator halt must prevent future actions and make already-issued work visible; model text saying it stopped is not enforcement.

Document the simulation boundary and remaining identity/runtime integration. The recipe does not provide a finished arbitration engine. Keep any future runtime integration separately reviewed against its real authority model.
