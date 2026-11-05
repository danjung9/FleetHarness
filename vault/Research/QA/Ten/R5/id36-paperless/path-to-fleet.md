# Primary deferrals

Government-device and low-code installation (UC36-4, DESC36-11), measured baseline and benefit (EVAL36-3, DELIVERABLE36-1, DELIVERABLE36-2, DESC36-2, DESC36-16, SCOPE36-25, SCOPE36-26), Sailor-panel and official judging (EVAL36-5, EVAL36-6), and owner-authorized transition (DESC36-12) remain unverified. Synthetic capture, review, filing, tasking and local reconciliation demonstrate the workflow, not these operational outcomes. See plan.md for original wording and concrete dependencies.

# Owner handoff, synthetic prototype, awaiting approval

Proposed sponsor: NAVSUP Business Systems Center, NAVIFOR or Navy Reserve Force; operational sponsor and sustainment owner unresolved. Owner approval is required before delivery or deployment.

Intended users: Sailor form drafters, command task coordinators and records reviewers. Intended device: approved government tablet/browser; local evidence uses only a loopback browser. No device certification or low-code platform installation performed.

Destination: Existing low-code / automation platform; pilot with one ship or expeditionary unit. Government devices and existing low-code platforms where possible remain awaiting owner action.

30d: owner selects the forms and workflows to pilot; 60d: build on the owner's platform; 90d: unit pilot; 180d: fleet release decision

Install/update: Node >=22.19, no third-party dependencies; start `node server.mjs` on assigned loopback PORT and load the app once to cache its shell. Offline reload requires the browser cache and IndexedDB. Export the packet before updating. Retain a prior versioned source package for rollback; preserve/export the local database before storage migration. Owner must establish signed installation, cache versioning, rollback and retention policy before field use.

Data: synthetic only; synthetic, not validated against the real format. Do not enter operational or sensitive records. Plain IndexedDB is not encrypted, storage may be evicted, actor strings are not identity. No cloud/government synchronization endpoint is contacted.

Integration prerequisites: authenticated receiver, receiver acknowledgements and deduplication, approved identity and role authorization, approved encryption/key recovery, reviewed record schedule, real OCR/scanning design, backup/retention and device loss recovery. Evaluate PouchDB/CouchDB against the immutable-operation graph before production replication. No credentials or external endpoints configured.

Evidence: application node:test checks exercise shared core; browser development observations and host acceptance/core reports are separate. No ATO, encryption validation, field pilot, panel assessment, official score or measured benefit is claimed.

Next validation: sponsor appoints sustainment owner and records authority; they select approved forms and schedule, validate outputs on representative permitted data and conduct comparable manual/application trials. Success: no lost revisions across approved device reconnects, exact current-revision approvals, receiver-confirmed transfer offsets, independently reviewed form/task accuracy and measured elapsed times. Sailor panel assesses usability; judges assign their own rubric. Release authority approves any pilot or fleet release.
