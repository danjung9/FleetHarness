# Owner handoff, Paperless Underway

This is a local synthetic prototype, not an accepted release. **synthetic, not validated against the real format**. Owner approval before delivery/deployment is outstanding.

Prospective sponsor routes from the supplied brief: NAVSUP Business Systems Center; NAVIFOR; Navy Reserve Force. No sponsor or sustainment owner is confirmed. The owner must appoint a workflow lead, device/platform lead, security lead and sustainment maintainer.

Intended users are expeditionary supply/admin staff and exact-version reviewers. The current route is Node.js 22.19+ running on the same device as the browser, bound to loopback, with IndexedDB. External connectivity is optional; the local service is required. No government-device install or low-code compatibility is certified. To trial offline, provision the whole folder and Node on an approved test device, start server.mjs, keep the same port, and disable external networking while preserving loopback. Export a backup before updates. Keep the previous application folder for rollback and test backup compatibility before migration; no automatic update system is implemented.

Data boundary: synthetic-only. No classification or accreditation decision is inferred from this label. No approved government integration, credentials, signing authority, disposal permission or external submission exists. IndexedDB is not encryption. Authenticated transport, receiver acknowledgements across real devices, receiver retention/deletion policy, identity/role enforcement and device/key protection require an approved design. Embedded Bradley Hand font rights require owner review before redistribution.

Existing evidence: 17 passing application Node tests and exploratory browser observations; initial desktop/narrow visual reviews. The initial host core evaluation failed at task issue ordering despite output following the frozen lexicographic rule. The host must resolve that planning/evaluation inconsistency; core reevaluation, full frozen browser acceptance and final visual rechecks remain pending. The stage reached its browser capture budget, so this handoff must not be treated as build approval. See verification.md.

Concrete next steps:

- Host verification owner: run clean core evaluation and frozen journeys; obtain final desktop/narrow visual evidence under the harness policy. Success: all required computational and browser checks pass against the same source revision, with no unresolved visual findings.
- Workflow owner, 30 days: select forms/workflows, review source fidelity, appoint a Sailor panel and establish a measured manual baseline. Success: representative reviewed input/output set and observed timing/error denominators.
- Platform/security leads, 60 days: select the owner's low-code/automation platform, authorized managed devices, key design, authenticated receiver and retention policy. Success: an approved integration threat/data-flow design and disconnected installation/update/rollback test.
- Unit sponsor, 90 days: approve a bounded unit pilot. Success: audited offline edits survive reload, both causal branches survive conflicts, only exact approved revisions route, acknowledgement interruption resumes without lost/duplicate bytes, and reviewers can recover errors.
- Sponsor/release authority, 180 days: make the fleet release decision using pilot, security, usability and sustainment evidence. No release, ATO, record destruction or deployment is authorized by this package.
