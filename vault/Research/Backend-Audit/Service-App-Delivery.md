---
type: implementation-log
status: native-verification-pending
owner: mukul
updated: 2026-11-05
summary: "Node service app downloads and their bounded verification record."
---

# Service app delivery

- [E] Implemented Node service downloads using the bundled runtime, a persisted loopback port, health checks, writable payload files under user data, single-instance startup, and process cleanup. Dependency installation uses the existing registry lock validator plus offline npm ci with scripts disabled. Credential checks include installed dependency bytes.
- [E] Browser wrappers retain their existing packaging. Python and CLI downloads explain source export in one sentence. Review and judge backend files are unchanged.
- [E] Frontend edits are exactly ExecutableDownload.tsx lines 10 and 12, and ReviewFlow.tsx line 183 in DeliveryContent. They enable service downloads and route delivery notices correctly.
- [E] Electron compilation, frontend type checking, generated launcher syntax, smoke script syntax and diff checks pass. Thirty focused tests pass: eight existing executable tests, five service delivery tests and seventeen plain error tests. The npm test installs a synthetic locked package from a real local cache without network, proves scripts did not execute and proves an empty cache fails.
- [E] Two real existing offline packager checks reached macOS signing and failed with spawn EPERM. Two verifier tests fail with an ambient node_modules ancestor because the only writable temporary directory is inside this checkout. These are not native acceptance results.
- [E] The new packaged-service HTTP test and Playwright smoke were not run. Electron, Chrome and real process inspection are unavailable here. macOS, Linux and Windows shutdown behavior needs native execution. No fake process scanner was used as proof.
- [E] The plain-error inventory now covers executable packaging modules. Its pre-existing pi-backend signature was stale against unchanged source; reviewed error producers retain existing mappings before updating the signature.
- [E] Vault writes and its ledger script are unavailable under this permission profile. This local record substitutes for Sprint logging; Team/Now.md was not changed. No files outside this checkout were changed. No commits or outward actions were performed.

Existing tools used: shell/file editing and ripgrep for source inspection; Node 26.0.0 and npm 11.12.1 for local synthetic tests; TypeScript 7.0.2 for compilation; Electron 45.2.2 and @electron/packager 20.3.0 for packaging preparation. Providers are the existing local toolchain projects. Playwright 1.64.1 is used by the prepared native smoke script and was not launched. No new dependency or outside service was added. The dataset is the synthetic service notebook fixture authored for these tests, with no real records.

Native follow-up commands after building:

```sh
node --test tests/package-offline.test.mjs tests/executable.test.mjs tests/service-executable.test.mjs tests/plain-errors.test.mjs
node scripts/smoke-service-app.mjs
```

The smoke packages offline, opens the service page with name resolution blocked, saves a note, checks same-origin navigation and renderer isolation, checks the second instance, quits and confirms owned PIDs are absent, relaunches and checks the saved note, occupies the saved port and checks the persistent address notice, then checks startup failure and cleanup.
