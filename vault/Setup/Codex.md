---
type: runbook
status: active
owner: mukul
updated: 2026-11-04
summary: "OpenAI and Codex setup status, and how to start Codex on the event key."
---

# Codex setup

Event steps are in [[Resources/OpenAI]]. Hooks are in [[Setup/Hooks]]. Multi-seat runs are in [[Setup/Council]]. Talking to the main session is in [[Setup/Bridge]].

## Status

| Step | State | Evidence |
| --- | --- | --- |
| Accept invitation | Done | [E, browser] FLEETHACKER organization active |
| Project key | Done | [E, browser] Active key named CodexKey. [A] It is in the Default project |
| Event profile | Done | [E, CLI] `~/.codex-fleethacker` |
| Log in with the key | Done | [E, CLI] Mukul logged in. Status reports an API key |
| Test run | Done | [E, CLI, 2026-11-04] `gpt-6.1-sol` answered on the event key, about 13,700 tokens for a one-line reply |
| Hooks | **Waiting on Mukul** | Codex skips them until approved. See [[Setup/Hooks]] |

## Starting Codex

Run these in the Terminal app, from the project folder:

```sh
cd ~/Documents/CDAO/FleetHarness
~/Documents/CDAO/Fleethacker-Vault/Setup/fh-codex.sh
```

| What you want | Add this |
| --- | --- |
| Latest Sol, the default | Nothing |
| Latest Astra, for the hardest work | `-m gpt-6-astra` |
| One task, no chat | `exec "your task"` |
| Stronger reasoning | `-c model_reasoning_effort="high"` (also `xhigh`, `max`, `ultra`, which cost more) |

[E, model catalog and live runs, 2026-11-04] `gpt-6.1-sol` and `gpt-6-astra` both answer on the event key.

Plain `codex` and the desktop app still use the personal ChatGPT login, not the event key.

## Why a separate profile

[E, CLI] The default `~/.codex` is signed in with ChatGPT and is used by the desktop app. The event instructions say to sign out first, which would change that login for everything else on this Mac. [R] So the CLI uses its own folder through `CODEX_HOME`. The event profile does not inherit settings from `~/.codex`.

## Replacing the key

Copy the new key, then run `Setup/fh-login.sh` yourself. It never prints the key.

## Desktop app or VS Code on the event key

Follow the event steps: sign out, then choose the API key option. This changes the login those clients share, so plan to switch it back afterward. The VS Code extension is not installed yet.

## After the event

[R] Revoke the key, since it has no expiry. Terms section 8 says event access creates no lasting rights.
