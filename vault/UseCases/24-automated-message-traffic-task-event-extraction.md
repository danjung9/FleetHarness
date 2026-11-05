---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "Software that pulls tasks, events and required correspondence for a command out of message traffic and routes them to the right officer."
use_case_id: 24
---

# Automated Message Traffic Task & Event Extraction

| Field | Value |
| --- | --- |
| Portal ID | 24 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | Not set |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Reading message traffic for one command by hand is slow and error prone, so tasks get missed and the schedule suffers.

## What to build

A tool that extracts tasking, events and correspondence for specified commands and identifies the proper command POC, optionally drafting responses and checking schedule conflicts.

## Requirements

- Extract tasking, events and correspondence per command
- Identify the coordinating POC (CO, XO, OPS, CHENG)
- Nice to have: draft formatted responses
- Nice to have: detect schedule conflicts early

## Named systems

None listed.

## Resources

None listed.
