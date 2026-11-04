---
name: fleet-delivery
description: Package a reviewed FleetHarness prototype with reproducible setup, source-bound evidence, limitations, and a concrete path-to-fleet handoff.
---

# Reproducible delivery

The harness owns test and review state. Preserve the tested source revision; a subsequent source change requires verification again and invalidates approval. Do not write an approval or reviewer signature for the operator.

Deliver runnable source, fixtures, install/run instructions, test commands and results, a short demo script and known limitations. Describe what was actually exercised: toolkit, generated application, browser behavior, external integration or operational evaluation. Keep untested credentials, endpoints, signing and device assumptions explicit.

Write `path-to-fleet.md` as a concise owner handoff with:

- Named or unresolved operational sponsor and sustainment owner.
- Intended user, device and hosting route; offline install and update/rollback path.
- Data classification and approved integration dependencies.
- Existing security/test evidence and outstanding authorization work.
- Concrete next validation, responsible owner and success measure.

If the owner supplies an existing application, preserve its established behavior and baseline tests. Record license and version evidence for reused dependencies. Do not imply authorization to operate, government-device installation approval or operational readiness from a local package.
