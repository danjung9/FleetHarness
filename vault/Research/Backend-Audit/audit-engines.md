
## 17:46 report

Four high-severity defects survive the five pending branches. Product code is unchanged. Added [regression proofs](~/Documents/CDAO/fh-org/astra-a2/tests/engines-safety.audit.test.mjs) and a [full report](~/Documents/CDAO/fh-org/astra-a2/audit/engines-safety-report.md).

1. **High (P1): Pi is not contained.** [electron/pi-backend.ts:157](~/Documents/CDAO/fh-org/astra-a2/electron/pi-backend.ts:157). Production SDK tools read synthetic sibling files through absolute paths, `../` and symlinks, and wrote outside their workspace. Bash also has no application-enforced network boundary. Dev-2 preflight checks the separate verification sandbox. **Fix:** constrain filesystem tools to canonical workspace paths, sandbox shell descendants with network disabled, and probe that actual boundary before starting Pi.

2. **High (P1): host report writes escape through symlinks.** [Pending electron/pi-backend.ts:71](~/Documents/CDAO/fh-org/agentic-builder/electron/pi-backend.ts:71), also current lines 261 and 270. An agent-created `test-report.json` symlink makes the host overwrite another writable file. The pending production `saveReport` method overwrote a synthetic sibling state file. This remains before independent judgment runs. **Fix:** write reports and approval records to fresh exclusive temporary files inside the validated workspace, then atomically rename over the destination.

3. **High (P1): secrets enter activity logs.** [electron/pi-backend.ts:144](~/Documents/CDAO/fh-org/astra-a2/electron/pi-backend.ts:144) and [pending electron/plain-errors.ts:85](~/Documents/CDAO/fh-org/dev-2/electron/plain-errors.ts:85). A real Pi shell inherited a synthetic secret, and the production logger retained its output. Dev-2 error handling also retained a synthetic bearer credential in diagnostics. **Fix:** give tools an explicit environment allowlist; redact credential values and authorization fields before log/session persistence; reject deliverables containing configured credential values.

4. **High (P1): symlinks bypass approval and break successful exports.** [electron/executable.ts:69](~/Documents/CDAO/fh-org/astra-a2/electron/executable.ts:69), supported by `storage.ts:67` and `source-export.ts:28`. Hashing omits symlinks while packaging follows internal links. Changing `index.html`’s target under `node_modules` preserved its approved hash and packaged the replacement. Source export also succeeded while omitting a symlinked `index.html`. **Fix:** require a regular entry point, reject artifact symlinks, and use one validated manifest for hashing and export. These proofs exercised production gates with synthetic approval records.

Direct TypeScript compilation and 26 existing watchdog/export/executable tests passed. The six new checks reproduce the four defect groups across the relevant compiled branches.

Dev-2 accepts both API-key and ChatGPT account types. Neither authenticated route is proven end to end here. I could not run native `ps` cleanup, `sandbox-exec` containment, Chrome verification or packaged GUI execution. No live model calls were made and no `auth.json` was opened.

VERDICT: NOT DONE
