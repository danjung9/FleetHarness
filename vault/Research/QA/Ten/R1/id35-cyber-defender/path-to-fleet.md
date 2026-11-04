# Path to fleet, owner handoff

This package is a synthetic offline proposal workbench, not an authorized cyber defender. Only CYB-01's planned prototype explanation slice is implemented. Full operational requirements remain deferred.

**Owners:** Operational sponsor and sustainment owner are unresolved. NAVIFOR / Naval Network Warfare Command, NIWC Atlantic and program cloud operators are packet-listed transition candidates, not confirmed sponsors. A sponsor must name an accountable range owner, security lead, domain reviewer and software maintainer.

**Users and route:** Cyber/IT analysts and synthetic reviewers on a modern desktop or narrow-screen browser. Open `index.html` offline; no installation or server is needed. Government-device installation and browser approval are unresolved. Distribute a reviewed, hashed version through an approved offline route. Keep the previous package to roll back the application, export handoffs before update, and validate storage migration before adopting a changed schema. Application rollback does not reverse configuration changes; none are executed.

**Data and dependencies:** Synthetic-only. No real configurations, secrets or operational data are authorized. No packages or external network dependencies are included. OpenSCAP and OPA were not adopted; their version/license/integration evidence remains unresolved. Local JSON is not an approved external integration. Browser storage is mutable and unencrypted, with no identity authentication or reconnect synchronization. Classifications, retention, transport and approved hosting route for future operational data require the security owner.

**Evidence:** `core.test.cjs` exercises actual delivered core and extracted inline core; see `verification.md` for the build run. Frozen desktop/narrow browser journeys, accessibility review, SME applicability and human acceptance remain host/reviewer work. No STIG compliance, CAC authentication, operational audit assurance, ATO or remediation result is established.

**Next validation and owners:**

1. Sponsor, within 30 days of sponsorship: confirm target devices/enclave, data handling, users, sustainment owner and success thresholds. Success: signed scope and accountable owners, not a prototype self-score.
2. Domain lead: independently review SYN-AUDIT and replace it with authorized, versioned training content, sanitized snapshots and a seeded/benign/unknown answer key. Success: agreed applicability and completeness rubric with independently measured false positives and misses.
3. Range owner and security lead, target 60 days: supply an explicitly authorized isolated range, authenticated reviewer roles and scoped execution adapter. Reviewed tests must reject stale approval and cover successful reversal, failed rollback, verification failure and partial remediation. Success: attributable before/after evidence and complete audit reconciliation for every change.
4. Evaluation lead: compare the same fixed manual and assisted scenario for handoff completeness, elapsed planning/remediation time and analyst hours; specify bandwidth/latency/loss profile and transfer limits. Success: independently judged plans, measured comparison and constrained-link evidence. No savings currently claimed.
5. Sponsor/security owner, targets 90/180 days: define authorization and software/content update path, then make a limited deployment decision based on the evidence. CAC/PKI, identity administration, reconnect transport and any operational integration require separate authorization and review.
