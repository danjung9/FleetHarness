---
type: runbook
status: active
owner: mukul
updated: 2026-11-04
summary: "How the sprint council runs: independent Codex seats, a verifier, a chief draft and human review."
---

# Council

## How it works

1. Independent seats answer the same brief from different angles.
2. A verifier on a different model tries to break the claims the answers rely on.
3. A chief drafts the ruling.
4. A reviewer checks the sources and the ruling. Mukul decides.

A seat that fails or returns nothing is named as failed. It never counts as agreement. Seats that share a model do not give independent votes, so treat agreement between them as weak evidence.

## Roster

- Codex on the event key: `gpt-6.1-sol` and `gpt-6-astra` only. The runner refuses any other model.
- A second-vendor reviewer only when needed: a seat fails twice, or seats disagree on something that matters.

## Running it

```sh
python3 ~/.local/share/fleethacker-context/council/run_seats.py SEATS.json
```

The runner stops launching seats at 10 million tokens unless `TOKEN_CAP` says otherwise. Setup details are in the README beside it. Log whatever is used in [[Sprint/Tool-Disclosure-Log]].
