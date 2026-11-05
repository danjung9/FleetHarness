---
name: fleet-delivery
description: Package a reviewed AppYard prototype with reproducible setup, source-bound evidence, limitations, and a concrete path-to-fleet handoff.
---

# Reproducible delivery

The harness owns test and review state. Preserve the tested source revision; a subsequent source change requires verification again and invalidates approval. Do not write an approval or reviewer signature for the operator.

Deliver runnable source, fixtures, install/run instructions, test commands and results, a short demo script and known limitations. Describe what was actually exercised: toolkit, generated application, browser behavior, external integration or operational evaluation. Keep untested credentials, endpoints, signing and device assumptions explicit.

After implementation, write `README.md` as a user guide based on the actual application. The build agent receives a dedicated follow-up prompt for this before verification. Include:

- Purpose and intended users.
- Prerequisites and quick start: follow the declared browser, CLI or service runtime. Include exact dependency installation, startup commands, required model/environment configuration and offline limitations. Browser modules may require the documented local server; do not promise file:// startup for module-based applications.
- Numbered steps for the main workflows using the real screen, field and button names.
- A synthetic example with expected results that a first-time user can reproduce.
- Supported input formats, validation, storage/persistence behavior, and save/export/reset steps where implemented.
- Troubleshooting, limitations and unavailable integrations.
- Developer test commands matching the delivered test files, with Node requirements separate from using the app.
- Links to `verification.md` and `path-to-fleet.md`.

Do not invent features or claim unexecuted checks passed. Keep the guide current when verification or repair changes the application. The guide is part of the verified source revision and delivery export.

Write `path-to-fleet.md` as a concise owner handoff with:

- Named or unresolved operational sponsor and sustainment owner.
- Intended user, device and hosting route; offline install and update/rollback path.
- Data classification and approved integration dependencies.
- Existing security/test evidence and outstanding authorization work.
- Concrete next validation, responsible owner and success measure.

If the owner supplies an existing application, preserve its established behavior and baseline tests. Record license and version evidence for reused dependencies. Do not imply authorization to operate, government-device installation approval or operational readiness from a local package.
