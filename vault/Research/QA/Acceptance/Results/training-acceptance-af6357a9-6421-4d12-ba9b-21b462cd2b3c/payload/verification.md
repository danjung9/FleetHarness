# Development verification

[E] Executed `node --test core.test.cjs` on Node v26.0.0 after `node build.cjs`. Result: 30 passed, 0 failed, 0 cancelled, 0 skipped and 0 todo. This is development verification, not independent acceptance.

[E] Repeated the same command after the README and handoff documents existed, retaining output in [development-test-results.txt](development-test-results.txt). The final run also reports 30 passed and no failures, cancellations, skips or todo cases. Application source was unchanged between runs.

The actual core functions are tested against independently stated expected results, interval-pair audits, constraint boundaries, all four outcomes, state transitions, review invalidation and portable save/import. The real local JSON round trip uses a fresh module load. The browser's inlined core matches core.cjs byte for byte and executes in a Node VM. The UI script compiles there, without DOM execution. Packet hashes match the local baseline.

Source files are identified in source-hashes.json. The packet's own supplied aggregate hash is metadata; individual files were hashed locally before tests and compared. Packet content was not edited. The desktop runner owns its independent test-report.json, acceptance review and source approval; those artifacts are not fabricated here.

Browser rendering, click behavior, download, import dialogs, offline browser operation, close/reopen recovery and accessibility were not exercised. [NOTES.md](NOTES.md) supplies exact manual steps, run details and limitations. No actual human review or operational validation is recorded.
