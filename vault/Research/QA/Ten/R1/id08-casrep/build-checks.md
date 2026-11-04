# Build-phase checks

Executed `node --test core.test.cjs` against the actual marked core in index.html: 10 tests passed, 0 failed, 0 skipped (2026-11-04). Tests use OS temporary directories for mutable filesystem storage and remove them. No dependencies installed.

Covered: full return/revise/all-role simulated-release/export; early release and wrong role; missing return reason; unsaved boundary and discard; stale approvals and digests; required fields/limits/no-op saves/markup round-trip; competing branches and durable resolution parents; idempotent/opposite-order edit-delete merge; graph errors without input mutation; reload of drafts and committed content; injected storage failure; corrupt/unknown schema and stale generations; immutable release and linked draft boundary.

The fixture-level fleet_reconcile_records call retained both concurrent heads; this is toolkit reference exploration, not application verification. Application graph tests execute the actual inline merge function separately.

Generated: self-contained application, tests and handoff guides. Runnable: disk-open design with no imports or network dependencies; actual core executed in Node. Browser handlers, downloads, keyboard behavior, visual layout and frozen desktop/narrow journeys have not been executed by this agent. Host verification, human acceptance and operational validation remain pending. No host report, screenshot, signature or approval was authored. Frozen plans and system-design.json were preserved.
