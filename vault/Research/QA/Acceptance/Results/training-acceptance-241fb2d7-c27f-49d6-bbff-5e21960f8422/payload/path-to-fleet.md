# Path to fleet: owner handoff

This is a synthetic-only, two-day training-draft prototype, not an issued schedule, operational compliance tool or approved installation. No operational systems have been contacted.

| Responsibility | Current owner / next decision |
| --- | --- |
| Operational sponsor and issuing authority | Unresolved. Identify a training coordinator sponsor and approving authority before field validation. |
| Sustainment and release owner | Unresolved. Assign engineering ownership, vulnerability response, release review and support. |
| Domain policy owner | Unresolved. Supply approved qualification, fatigue/rest, historical duty and recurrence rules. |
| Security/data owner | Unresolved. Approve data classification, device route, integration contracts and authorization work. |

Intended present user: a coordinator inspecting synthetic administrative practice proposals on a desktop browser. Hosting route: open the self-contained index.html locally, with no server or install. Real government devices and specific browser versions have not been validated or approved. Portable JSON is the sole recovery route; no automatic persistence, sync or backend exists.

Offline update/rollback proposal for the future release owner: distribute a reviewed, source-bound HTML artifact through an approved route; retain the previous artifact and synthetic snapshot; validate imports against the new release before replacement; roll back to the retained version if compatibility fails. This proposal is not an exercised deployment procedure. No signing, trusted updater, device encryption or endpoint management is included.

Data boundary: synthetic-only. Operational classification, retention, access control and audit requirements remain unresolved. No approved external dependencies or connections exist. A future readiness/qualification source, official calendar, identity/CAC or synchronization service requires explicit owner approval, documented API contracts and security review; none is simulated as a working integration. The delivered code uses no package dependencies. The scheduling approach was informed by supplied toolkit source, but no toolkit source is shipped as a runtime dependency; upstream toolkit version/license remain unresolved. OR-Tools is deferred and has no pinned version/license/benchmark evaluation here.

Existing evidence: actual core/state/inline-source development tests, independent pairwise and duty checks, and snapshot tampering tests; details in [verification.md](verification.md). No browser evidence, security assessment, source-review approval, ATO, official calendar access, CAC integration, government-device approval or operational evaluation exists. Harness verification and human source review are separate later gates.

Concrete next validations:

1. **Verifier / desktop owner:** run the supplied tests and B1 to B5 procedures in test-matrix.md on the intended browser/device, recording version and harness source revision. Success: all four statuses and constraints behave as expected, keyboard access works, no network requests are needed, exact edited drafts survive save/close/reopen/import, rejected imports preserve the workspace, and search responsiveness is acceptable at the allowed bounds.
2. **Training policy owner (SCH-04 gap):** provide recurrence anchors, every mandated occurrence ID and due window, duty history, approved fatigue and qualification semantics. Success: implement and independently verify complete occurrence/deadline coverage and historical duty without inferring policy from this sample.
3. **Sponsor / human reviewer:** inspect every synthetic draft session, constraint and load, then separately review this source revision through the host. Success: explicit recorded scope acceptance; an in-app review label is not issuing authority or host approval.
4. **Engineering and security owners:** establish representative workload, performance limits, input/storage threats and approved integration/data contracts; evaluate CP-SAT only if scale/objectives justify it, with version/license and benchmark evidence. Success: documented test targets, approved data handling and authorization decisions before any real data or fielding.

Unimplemented: recurrence, SFTRM interpretation, departmental negotiation/agents, real readiness data, qualification policy beyond supplied values, official-calendar writes and reconnect sync. Two days do not demonstrate weekly training coverage. Feasibility is over listed starts, not global optimization. Example rest/caps are synthetic values only.
