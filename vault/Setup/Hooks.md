---
type: runbook
status: active
owner: mukul
updated: 2026-11-04
summary: "How the sprint hooks work, what they block, and what they do not cover."
---

# Hooks

All of this runs from `tools/fh.py` in this vault. Run `python3 tools/fh.py` to see its commands.

## The flow

| When | What happens |
| --- | --- |
| Session start | Loads the rules, the time to the deadline and the top of [[Team/Now]] |
| Each prompt | Adds one short line with the time left and the core rules |
| Before a write or shell command | The guard below can block it |
| Stop | If sprint files changed and no session note exists from the last hour, asks for one, at most once an hour. Then runs the vault check and makes a local vault checkpoint commit. It never pushes |
| Session end | Runs the vault check and prints a reminder |
| Git commit | Pre-commit and commit-msg hooks run the guard again on staged lines |

## What the guard blocks

Everywhere:

- API keys, tokens, private keys and team credential links
- Classification and CUI markings, such as a banner line or a dissemination control. A plain mention of the word CUI in a sentence is allowed
- References to internal WDP systems and folders
- Commands or reads that touch stored login files or the Google access sheet

In documents (`.md`, `.txt`) only:

- Em and en dashes
- Attribution trailers and tool authorship traces. [[Sprint/Tool-Disclosure-Log]] is exempt, so it can name any tool honestly

## Where it is wired

| Tool | How | State |
| --- | --- | --- |
| Codex, event profile | `~/.codex-fleethacker/hooks.json` and `AGENTS.md` | Waiting for approval, see below |
| Other local agent tools | Local settings in the vault and work folders, excluded from git. They load when the tool starts from that folder | Not tested in a live session |
| Any other tool | `AGENTS.md` in the work folder, plus git hooks | Git hooks tested |
| New repositories | `python3 tools/fh.py init-repo PATH` | Tested |

Tool names for the trace check are kept outside the vault, in `~/.local/share/fleethacker-context/trace-patterns.txt`.

Hooks from other work on this machine are deliberately not part of this profile, so their context never reaches the event key.

## Approving the hooks in Codex

[E, 2026-11-04] Codex skips new hooks until a person approves them. A test run on the event key ran normally, but the context hook did not fire. Mukul needs to approve them once:

1. Start Codex with `Setup/fh-codex.sh` in the Terminal app.
2. At the "Hooks need review" screen, choose "Trust all and continue", or "Review hooks" to look first. `/hooks` inside Codex shows them later.

Codex warns that trusted hooks can run outside its sandbox. These only run `tools/fh.py`. Changing `hooks.json` later requires approving again.

## Limits

- [E] Each hook was tested by feeding it sample events. A live Codex session with the hooks firing has not been tested yet.
- [E] The Stop block depends on Codex honoring the block response, which is untested.
- If the hook itself crashes, it lets the action through and prints a warning, so a bug cannot stop the sprint. Git hooks still check at commit time.
- Shell commands are only scanned as text, so a script that writes a secret from elsewhere will get past the write guard.
- The markings check is a pattern match. It does not establish that data is safe, and unmarked sensitive data will not be caught. People remain responsible for rule 4.
- Tools that run elsewhere, such as the Google VM or Ark, get none of this until their code reaches a repository with the git hooks.
