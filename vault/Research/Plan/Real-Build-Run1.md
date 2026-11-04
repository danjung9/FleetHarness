---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "First real FleetHarness build: all five stages completed on the event login in 13.4 minutes, 22 of 22 generated tests pass, with agents held to a closed sandbox. Human review and independent acceptance are still open."
---

# First real build

## Bottom line

[E, driven through the actual app UI, run1, 15:10:59 to 15:24:21 EST] FleetHarness completed a real build with a live model: intake, research, plan, build and verify, then stopped at Needs review. The independent test run reported 22 passed, 0 failed, 0 skipped. All six system-design components show generated. [E] The plan's 4 PM gate is met for a working build. [R] It does not yet mean an accepted app: no person has reviewed it and independent browser acceptance has not run.

## What ran

| Item | Value |
| --- | --- |
| Source | `631849f` plus [[Research/Plan/Real-Build-Run1.patch]], in a throwaway copy, not in any shared branch |
| Engine and model | Codex engine, `gpt-6.1-sol`, event API key login, copied into a scratch profile. The key was never typed or printed |
| Brief | Catalog ID 11 card, then the public brief from [[Research/Agentic/Run-Readiness-50fcaea]] and eight acceptance criteria |
| Approval | Mukul approved real builds with the event login, synthetic data and a throwaway copy before going to sleep. The review step stays his |
| Outcome | Status `review`, exit 0, 22 of 22. Files in [[Research/TaskApp/Pipeline-run1/README]], digests in `SHA256SUMS.txt` |
| Duration | 13.4 minutes; 184 log entries, 149 of them tool calls |

## The patch

Small changes in four files, all in `electron/`:

1. `codex-rpc.ts`: drop the forced ChatGPT login flag.
2. `codex-account.ts`: treat an API key account as connected.
3. `codex-session.ts`: accept an API key account, and drop the `sandbox` parameter and its network override so the permission profile applies.
4. `verification.ts`: run generated tests through `codex sandbox -P run` with a plain Node, on a switch, instead of unsandboxed.

The profile lives in the scratch `config.toml`, outside the patch: reads limited to a minimal system set and the project folder, writes limited to the project folder and a scratch temp folder, network off.

## Containment, measured

[E, live probe through the same app-server, 15:09, script `probe.sh` run by the model's shell tool]

| Action by an agent shell | App default today | With the profile |
| --- | --- | --- |
| Read a canary file in the real home | Allowed | Denied |
| Read its own login file | Allowed | Denied |
| List `~/.ssh` and `~/Documents` | Allowed | Denied |
| Write outside the project | Denied | Denied |
| Network | Denied | Denied |
| Write in the project, run node and git | Allowed | Allowed |

[E, final state log] After the run, no log entry mentions the real home outside the scratch folder, and no process from the run remains. [E] One tool failed under the profile: a Perl-based command could not load its library. The agents worked around it. [A] The profile may need that system path added.

## Limits

- [E] Agents wrote their own tests, and the 22 count is theirs. Independent acceptance is separate work.
- [E] The app's own text is wrong on this route: the consent dialog says the build uses a ChatGPT plan's allowance, and the record says `chatgpt/gpt-6.1-sol`. The true route is event API key through the Codex engine, as recorded here.
- [A] Token use and cost for the run are not recorded by the app.
- [E] The verification notes mark real browser behavior, downloads and offline reopen as unverified by the agents.
- [R] Nothing here is a production control until a reviewed change lands.
