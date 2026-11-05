---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "Offline-first workflows replacing paper forms, re-keying and manual routing for expeditionary and underway units."
use_case_id: 36
---

# Paperless Underway

| Field | Value |
| --- | --- |
| Portal ID | 36 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | medium |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Sailors hand-transcribe forms, re-key requisitions and route correspondence by hand, and disconnected units cannot route even basic forms.

## What to build

Two tracks: offline capture and validation of handwritten logs, a requisition and a correspondence package that sync on reconnect; and turning tasking emails into verified action lists, draft updates and filed records.

## Requirements

- Offline-first with clean sync
- Human review before submission
- Audit trail
- Government devices and existing low-code platforms
- Synthetic data only

## Named systems

- DD 1348-1A
- NAVPERS
- SECNAV M-5216.5

## Resources

- Public blank forms (DD 1348-1A, NAVPERS)
- SECNAV M-5216.5
- Sample handwritten scans
- Synthetic tasking emails and records schedule
- Yeoman, logistics and admin SMEs
