---
type: session
status: done
owner: mukul
updated: 2026-11-04
summary: "Set up the sprint hook flow for the event Codex profile and other tools."
---

# Hooks setup

## Asked

Set up the same hook flow for Codex and the other tools.

## Done

- Added `tools/fh.py`: context, guard, vault check, agent hooks and git hooks. See [[Setup/Hooks]].
- Wired it into the event Codex profile, with its own `AGENTS.md` and `hooks.json`.
- Created the work folder `~/Documents/CDAO/Fleethacker-Work` as a local git repository with hooks.
- Put the vault under local git with hooks. No remote exists and nothing is pushed.

## Verified how

- Fed sample events to the hook on throwaway folders: 17 guard cases, 4 stop cases and 3 commit cases behaved as intended.
- The guard's first version misread words like "task-event" as keys. Fixed and retested.
- `tools/fh.py check` passes on the vault and work folder.
- One live Codex run: key and model work, and the hooks did not fire, because they are not yet approved.

## Next

Mukul approves the hooks in Codex. Then rerun the live test.
