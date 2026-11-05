---
type: research
status: active
owner: mukul
updated: 2026-11-04
summary: "The deferral fix on five challenges: builds implement far more of each challenge and all reached review, and the judges found deeper gaps."
---

# Experiment 1: deferral fix

[E, automatic] Round 1 at `d0f4c69` compared with the fix on `1d9eeee`, same challenges from their portal cards, same model, at most three at once. Columns read: status, minutes, criteria met / deferred / failed, tokens uncached plus output. The experiment copy had not been through the reviewer; the fix landed afterward as `57da6e2`.

| Challenge | Round 1 | With the fix | Judge, round 1 | Judge, with the fix |
| --- | --- | --- | --- | --- |
| id12-optask | review, 9.7 min, 3 / 4 / 0, 232070 | review, 12.6 min, 6 / 1 / 0, 281527 | unsatisfactory | NOT |
| id11-training | review, 14.1 min, 3 / 4 / 0, 285944 | review, 15 min, 7 / 0 / 0, 285821 | NOT | NOT |
| id36-paperless | failed, 13.2 min, 3 / 15 / 2, 311374 | review, 16.7 min, 14 / 6 / 0, 369359 | pending | NOT |
| id08-casrep | review, 11.3 min, 3 / 2 / 0, 252079 | review, 11.8 min, 5 / 0 / 0, 257533 | NOT | NOT |
| id20-contact-brief | review, 9 min, 2 / 3 / 0, 219044 | review, 15 min, 3 / 2 / 0, 350354 | NOT | pending |

[E] Deferred criteria fell sharply, and the one build that failed in round 1 reached review. Builds took somewhat longer and cost somewhat more, because they did more. [E] Judges still reject, for narrower reasons recorded in `Research/QA/Officer/JUDGE-R101-*.md`: an invented format instead of the named one, preset answers instead of generated ones, simulated delivery. [R] Those drive the next tuning: real named formats, generation beyond presets, and an independent judge inside the factory.
