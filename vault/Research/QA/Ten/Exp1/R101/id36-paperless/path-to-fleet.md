# One-page path to fleet, synthetic prototype

SYNTHETIC, NOT FOR OPERATIONAL USE. No deployment or operational authorization.

Sponsor and sustainment owner: unresolved. NAVSUP Business Systems Center, NAVIFOR and Navy Reserve Force are transition leads from requirements.md, not confirmed owners. Nominate an accountable sponsor, platform maintainer, security owner, support desk and shutdown authority before any pilot.

Intended users: expeditionary-unit training, supply and command clerks with a reviewing role. Current route: open the self-contained index.html on a desktop/tablet browser with IndexedDB enabled; no install, server, network assets or packages. Government browser/device and low-code platform compatibility remains unverified. Provision the file through an approved offline distribution route; an owner must define signed updates, database migrations, verified backups and rollback. Retain a known-good package and test restored data before updates; copying an older HTML file alone does not roll back data.

Data boundary: fictional DEMO records only. Actual classification, handling, records classes, retention and disposal authority are unresolved. No personal information, live credentials or government endpoints are used. Plain IndexedDB is not device encryption, authentication, tamper-proof audit or backup. Local role labels confer no identity or authority. Browser eviction and storage policy can cause loss; export synthetic backups.

Existing evidence: dependency-free application core tests are described in verification.md. Host browser journeys, physical restart, cross-tab concurrency, quota denial, accessibility, security, Sailor review and operational validation remain pending. Supplied toolkit algorithms were adapted from the local packet; its upstream version/license is unspecified. No third-party packages installed. Research evaluated PouchDB/CouchDB as a conditional replication candidate; verify version/license and history/retention semantics before selecting a real adapter.

Required integrations: owner-approved format versions and rules; independently reviewed scans and field answer keys; SME manual baseline; approved device/key design, identity, authenticated transport, durable receiver acknowledgements, chunk integrity, retention/history policy and backup recovery. Demo transfers do not implement a transport. No cloud, email or government system connection exists.

30d: owner selects forms; 60d: platform build; 90d: unit pilot; 180d: fleet release decision.

Next validation: nominated sponsor and Fleet SME run both tracks on an approved test device with synthetic fixtures. Success: all frozen browser journeys pass at desktop/narrow sizes, edits and acknowledged offsets survive reload/restart, missing history retains work, every competing head is reviewed, unauthorized/stale routing is blocked, and outputs trace to sources. Security owner validates keys, access, transport and retention before introducing approved data. Sailor panel assesses task clarity; official judges alone score the rubric. Measure observed time and rework against SME-authorized baseline before claiming returned hours.

Monitoring/escalation/shutdown: unresolved operational owners must define storage failure and sync backlog alerts, audit retention, incident escalation, revoke/pause procedure and rollback criteria. Current Pause simulation blocks local routing/acknowledgements while retaining saved work; it is not an operational kill switch.
