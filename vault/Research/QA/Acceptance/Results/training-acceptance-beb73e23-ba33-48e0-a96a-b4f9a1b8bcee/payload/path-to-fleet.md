# Owner handoff

Operational sponsor and sustainment owner: unresolved. Intended user: a training coordinator inspecting synthetic practice sessions. Current device/hosting route: a modern desktop or narrow browser opening a self-contained local index.html; government device installation approval is not established.

Offline package: retain a versioned copy of index.html and portable JSON snapshots. Distribute updates only through an owner-approved channel after browser and domain validation. Keep the previous HTML revision for rollback and export data before changing versions; the current importer supports schema version 1 only. No update service is implemented.

Data boundary: synthetic only. No operational data classification or approved integration dependency has been supplied. There are no credentials, endpoints, live rosters, calendar writes, identity services or remote synchronization. An owner must establish approved data handling, device storage/encryption, identity, retention and hosting before operational data is considered.

Existing evidence: application core tests and embedded-core parity checks; see verification.md. Host browser evidence and human review remain pending. No CAC, ATO, security assessment, government connection, operational qualification authority or safe fatigue policy is established. External dependency version/license evidence for the supplied toolkit remains unverified; no package dependency is delivered.

Next validation: AppYard host runs frozen journeys at desktop and narrow widths, including save/reload and import. Success: every implemented journey passes, with screenshots/traces tied to the delivered source. Human reviewer then checks clarity, keyboard behavior, actual offline close/reopen and downloaded-file upload recovery on target browsers. Success: a first-time coordinator reproduces the documented four intervals and D=30 recovery without losing current work.

Operational sponsor must next provide authoritative fatigue/rest/budget horizons, qualification rules, recurrence/deadline/SFTRM interpretation, and acceptance authority. Success: owner-approved fixtures include every mandated occurrence and boundary, independently checked by a domain expert. A separate planning run must cover departmental negotiation, weekly optimization/heatmaps and integration scope. UC11-1, SCH-04 and DELIVERABLE11-1 remain deferred; this prototype does not satisfy all source requirements.
