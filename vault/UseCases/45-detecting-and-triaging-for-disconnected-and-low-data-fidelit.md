---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An on-device upload prioritization algorithm that sends the most important data first over poor connections."
use_case_id: 45
---

# Detecting and triaging for disconnected and low data fidelity environment.

| Field | Value |
| --- | --- |
| Portal ID | 45 |
| Category | Uncategorized |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Field devices collect data faster than links deliver, so critical records wait behind large photos and the cloud picture is stale.

## What to build

A scheduler that scores queued items, sends small high-priority data first, uses progressive photos, resumes transfers and guarantees single delivery.

## Requirements

- Configurable priority scoring
- Small structured data first
- Preview then full photo
- Resume from last chunk
- Preserve dependencies
- Idempotent, starvation-free delivery

## Named systems

None listed.

## Resources

None listed.
