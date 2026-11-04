---
type: plan
status: active
owner: mukul
updated: 2026-11-04
summary: "Mukul's idea: give the agents a tested app starter so each build fills in the challenge instead of rewriting the same shell, which cuts context, time and failures."
---

# App starter

## The idea

[P] Mukul, 2026-11-04: instead of creating the entire product from scratch every time, set up a boilerplate template, for less context in the application being built.

## Why it should pay off

[E, round 1, ten real builds] Average minutes: intake 1.3, research 1.5, plan 3.0, build 3.9. Verify takes about 2 to 3 more. Each build writes about 100 KB of notes that later sessions reread, plus a 17 to 27 KB `index.html`. The same shell appears every time: layout, synthetic labels, status messages, review state, save and import, download, narrow layout, inlining logic into one file, and test wiring. [E, Research/QA/Ten/QA-Lead-Notes] Several defects live in that repeated code: a broken native select, weak exports, review binding gaps.

## What it is

A tested starter copied into each new workspace, with the shell done and passing, so agents spend their effort on the challenge.

| Part | Starter provides | Agents provide |
| --- | --- | --- |
| Page | One self-contained offline `index.html` built from parts, labels, layout, narrow width, keyboard, status and error regions, limitations panel | Title, wording, the views the challenge needs |
| State | Store, render loop, review tied to exact inputs and results, cleared on edit | The domain state shape |
| Files | Save, import with validation and tamper rejection, download, audit log | Which fields matter |
| Components | Table, form fields, timeline, board, citation list, status badge | Which to use and how |
| Logic | A `domain` module slot with a clear contract: sample data, validate, compute | All of it. It must really compute |
| Tests | `node:test` wiring, parity between tested and shipped code, shell tests already green | Real domain tests, which start failing until written |
| Browser checks | Stable selectors for shell actions, ready to reuse in journeys | Journeys for the challenge |
| Docs | Short README and path-to-fleet skeletons | The facts |

## Rules

- [R] A starter must not make fake work easier. Compute has no default answer, and an unfilled slot fails the build.
- [R] Stage prompts shrink: planning covers the domain only, and agents do not reread what the starter already settles.
- [R] Measure it on real builds against round 1: minutes, tokens, journeys passed and the judges' verdicts. It lands only if quality holds.
