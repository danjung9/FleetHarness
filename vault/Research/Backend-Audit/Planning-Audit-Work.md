---
type: evidence
status: complete
owner: mukul
updated: 2026-11-05
summary: "Local planning audit implementation ledger and sandbox limitations."
---

# Planning audit work

[E] Asked: implement generic planning audit and stronger expected-result guidance before freeze, with bounded correction, Stop and Resume coverage.

[E] Tools: local shell, ripgrep, Python 3, Node.js and the repository TypeScript compiler for source inspection, edits and synthetic lifecycle checks. No new external service, dataset or dependency. No live model requests.

[E] Prior work: read the vault working rules, status, open questions, One-Shot-Gaps and available officer verdicts. Keep changes generic and preserve full build-agent access.

[E] Friction: the permission profile denies the vault tools directory and permits writes only in this checkout. The vault ledger command, vault session note and Team/Now.md updates cannot run here. This local record is for the owner's handoff. Native process scanning, sandbox-exec and Chrome cannot run here. No .git writes or outward-facing actions.

[E] Implementation: the existing read-only judge adapter now also runs a planning audit. The host allows at most one correction prompt, then a second audit. Errors remain advisory, Stop cancels, and private checkpoints retain attempts and the spent correction turn across Resume. Review reports retain plain-language results and gaps. The audit is separate from the sealed quality contract. Requested format and complete-result guidance is consistent across the edited skills and solution guide.

[E] Verification: direct local TypeScript compilation passed for Electron and harness. Selected backend lifecycle tests passed 30/30, including 13 audit cases and a Codex RPC boundary fixture. Existing judge tests passed 34/34, including the native executable against a local fake provider. Plain-error tests passed 16/16. Harness tests passed 93/94; the special-file test could not spawn its FIFO creation command (EPERM). No live model calls occurred. Synthetic model replies, verification and process scanning establish orchestration behavior only; they do not establish native cleanup or browser rendering.

[E] Error inventory: only the two edited modules with existing dynamic error constructors needed new full-module signatures. Reviewed thrown error paths keep their existing plain mappings. New advisory audit diagnostics are retained as evidence, not public build errors. Inventory checks and mutation checks pass unchanged.

[E] Skill checks: no token-budget test was found. Existing frontmatter, skill routing and packet materialization checks passed. Edited skill sizes are 4,954 bytes (judge), 6,552 (planning), 4,706 (intake) and 6,892 (evidence).

[E] Build friction: the first npm command did not refresh emitted backend code. Direct invocation of the repository TypeScript entrypoint with TMPDIR inside this checkout emitted the changed files; all reported final lifecycle results use those files. A shell heredoc was also blocked by the default temporary directory, so edit scripts were kept inside .tmp.

[R] Next: the overseer runs the full native suite and benchmarks with these changes. No benchmark improvement or satisfactory generated app is claimed by these synthetic tests.
