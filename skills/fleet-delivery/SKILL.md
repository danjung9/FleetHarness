---
name: fleet-delivery
description: Package a reviewed AppYard application with reproducible setup, source-bound evidence, limitations, and a concrete path-to-fleet handoff.
---

# Reproducible delivery

The harness owns test and review state. Preserve the tested source revision; a subsequent source change requires verification again and invalidates approval. Do not write an approval or reviewer signature for the operator.

Deliver runnable source, development/test fixtures, install/run instructions, test commands and results, a reproducible workflow and known limitations. Describe what was actually exercised: toolkit, generated application, browser behavior, external integration or operational evaluation. Keep untested credentials, endpoints, signing and device assumptions explicit. The finished application uses real computation and state; users implement or configure environment-specific plugins and data connectors after the build.

After implementation, write `README.md` as a user guide based on the actual application. The build agent receives a dedicated follow-up prompt for this before verification. Include:

- Purpose and intended users.
- Prerequisites and quick start: follow the declared browser, CLI or service runtime. Include exact dependency installation, startup commands, required model/environment configuration and offline limitations. Browser modules may require the documented local server; do not promise file:// startup for module-based applications.
- Numbered steps for the main workflows using the real screen, field and button names.
- The initial empty/setup state, how to enter or import the user's own data, and the observable result of completing each workflow.
- Exact plugin/connector extension files and interface methods, input/output contracts, configuration fields, credential handling, and the post-build steps to implement, configure and verify connections.
- Supported input formats, validation, storage/persistence behavior, and save/export/reset steps where implemented.
- Troubleshooting, limitations and unavailable integrations.
- Developer test commands matching the delivered test files, with Node requirements separate from using the app.
- Links to `verification.md` and `path-to-fleet.md`.

Use the product's name and task-focused language in the guide and interface without synthetic-data, mock, demo or prototype branding. Keep fixture examples, their expected results and accurate synthetic provenance in development data documentation and test/evidence artifacts. Do not ship those records as default application state or claim an unconfigured connector succeeds. Do not invent features or claim unexecuted checks passed. Keep the guide current when verification or repair changes the application. The guide is part of the verified source revision and delivery export.

Write `path-to-fleet.md` as a concise owner handoff with:

- Named or unresolved operational sponsor and sustainment owner.
- Intended user, device and hosting route; offline install and update/rollback path.
- Data classification and approved integration dependencies.
- The plugin and data-connector contracts, implementation/configuration tasks, responsible owner and checks needed to enable each external source.
- Existing security/test evidence and outstanding authorization work.
- Concrete next validation, responsible owner and success measure.

If the owner supplies an existing application, preserve its established behavior and baseline tests. Record license and version evidence for reused dependencies. Do not imply authorization to operate, government-device installation approval or operational readiness from a local package.
