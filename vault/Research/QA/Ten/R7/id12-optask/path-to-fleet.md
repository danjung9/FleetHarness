# Primary deferrals

None within the frozen synthetic prototype scope. Real USMTF conformance and operational validity remain unverified.

# Owner handoff

Operational sponsor and sustainment owner: unresolved; owner must nominate both before delivery approval. Intended users are watchstanders and shipboard leaders reviewing fictional tasking in a modern browser with a locally installed Node 22.19+ service. No third-party dependency, model, credential or internet connection is required. Loopback must remain reachable.

Proposed hosting route: owner-controlled local workstation, bound to 127.0.0.1. No government-device installation or hosting authorization is established. For offline installation, transfer the approved source bundle and an approved Node runtime through the owner's approved channel; run `HOST=127.0.0.1 PORT=3000 node server.mjs`. Browser storage is local to that origin; changing ports creates another storage namespace. Export reviewed JSON before updates. Keep the previous approved source/runtime bundle and roll back by stopping the new service and starting the prior bundle. No update channel or installer is implemented.

Data boundary: synthetic only; fixtures contain invented ship identities, frequencies and change-over identifiers. Never enter operational messages or cryptographic material. No CAC, remote retrieval, USMTF integration, transmission, encryption-at-rest assurance, authentication, authorization-to-operate or operational monitoring exists. The service has no application disk persistence; browser localStorage holds the draft and review snapshot. Downloaded JSON is controlled by the browser and user.

Existing evidence: application Node tests, HTTP integration test and host-recorded development visual reviews. See verification.md for exact scope and pending independent gates. Starter version/hash provenance is in foundation-lock.json. No third-party packages added. Foundation/toolkit redistribution license is unresolved; review before redistribution.

Next validation: owner assigns a message-format SME to review the invented mapping and all three named outputs against authorized, representative USMTF material. Success requires an approved format revision, field-level reference labels, representative negative examples, measured extraction/time/evidence correctness and watchstander usability trials. Sponsor/security owner must separately approve data handling, installation, integration and a specific delivery revision. No delivery/deployment or operational dissemination is attempted here. Stop the service to halt parsing; escalate unsupported semantics to the nominated domain owner.
