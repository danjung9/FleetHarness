# Primary deferrals

- **UC36-4, Runs on government devices and existing low-code platforms where possible**
  real-system: Authorized government devices and the owner low-code runtime are unavailable; withhold compatibility/deployment claims. Demonstrate the complete local browser workflow and a platform-transition checklist.
- **EVAL36-3, Time per packet against a manual baseline [baseline to be set with Fleet SME]**
  real-data: A Fleet-SME-established manual timing baseline is unavailable; withhold fleet timing comparison. Record observed synthetic elapsed time and a separately invented 20-minute baseline.
- **EVAL36-5, Ease of use judged by a Sailor panel**
  human-authority: A Sailor panel must supply its own usability judgment; withhold endorsement. Demonstrate both tracks and provide an unscored panel worksheet.
- **EVAL36-6, Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.**
  human-authority: Official judges must issue official rubric scores; withhold scoring. Display the five original weights with every score unassessed.
- **DELIVERABLE36-1, Sailor hours returned to maintenance, training and watchstanding**
  real-data: Observed operational workload and independently measured manual/assisted timings are unavailable; withhold actual hours-returned claims. Show an invented 20 versus 8 minute, 10-packet estimate of 2.00 hours.
- **DELIVERABLE36-2, Fewer errors and less rework**
  real-data: Matched operational error and rework observations are unavailable; withhold actual fleet error-reduction claims. Detect and correct five seeded synthetic errors before local routing.

All six remain unverified. Browser prototype checks cannot establish all source requirements met. The same up-front inventory is required in verification.md, README.md and the review summary. No real-format or operational validation is claimed.

# Path to fleet, owner handoff

**Synthetic prototype; not validated against the real format.** Proposed sponsors from the challenge: NAVSUP Business Systems Center, NAVIFOR and Navy Reserve Force. Committed operational sponsor, approving authority and sustainment owner remain unresolved. No installation, deployment or external connection has occurred.

Intended users: expeditionary/underway Sailors and command staff reviewing training, supply, correspondence and weekly tasking on tablets. Intended destination: the owner's existing low-code/automation platform and approved government browser/device. Current route: open self-contained index.html locally. Platform/device compatibility and field installation approval are unverified.

**30d: owner selects forms; 60d: owner-platform build; 90d: unit pilot; 180d: fleet release decision**

- Sponsor: select actual workflow, reviewer/routing authority and classification boundary. Current data is synthetic-only; no real classification determination is inferred.
- Domain owner: map current form editions, records schedule, routing rules and retention. Success: approved mappings and independent ground truth for every named output, including handwriting cases and ambiguous tasking.
- Platform/security owner: select approved device, hosting/install route, offline update packaging and versioned rollback. Preserve/export local data before migrations, test failed updates and restore the prior approved bundle without losing queue state. Current package has no installer, automatic update or migration service.
- Integration owner: evaluate established PouchDB/CouchDB replication with exact version/license/security and adapter evidence before choosing a production stack. Research provides candidate leads only; none was installed. Specify authenticated identity/transport, durable receiver acknowledgements, authorization, retention/tombstones and idempotent routing. No endpoint or credential is configured.
- Security owner: validate device/key design, encryption, storage eviction and physical restart behavior, audit protection, role authorization and the applicable authorization process. IndexedDB is not encryption. Success: witnessed restore/restart, rejected unauthorized submission and acknowledged reconnect without duplicate receipts on approved devices.
- Evaluation owner/Fleet SME: establish a manual timing protocol, matched error/rework observations and real answer key. Sailor panel assesses complete workflows; official judges supply rubric scores. Success: independently observed usability and outcome evidence, not the invented 20/8-minute comparison.

Existing evidence: dependency-free application, 20 local Node checks against the delivered core and inline core. Host desktop/narrow browser checks, human acceptance and all operational validation remain pending. Source revision must be reverified after any change. Local testing does not grant authority to operate or government-device installation approval.
