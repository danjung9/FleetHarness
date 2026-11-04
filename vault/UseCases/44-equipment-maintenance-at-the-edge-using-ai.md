---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An offline on-device AI assistant for sailors to query parts and work orders and record maintenance, syncing to shore when connected."
use_case_id: 44
---

# Equipment Maintenance at the Edge using AI

| Field | Value |
| --- | --- |
| Portal ID | 44 |
| Category | [[UseCases/Categories#The Autonomous Shipboard Enterprise|The Autonomous Shipboard Enterprise]] |
| Difficulty | Not set |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Maintenance and supply data sit in separate systems requiring several screens, and sailors lack access when comms are denied.

## What to build

A disconnected technician client with plain-language parts and work-order queries, encrypted capture of completions, meter readings and photos, and queued sync to the ashore backend.

## Requirements

- Show workload, NSN catalog and on-hand stock
- Plain-language on-device queries
- Encrypted offline capture of work order data
- Usable during EMCON via onboard server
- Sync queued transactions on reconnect
- Scale from DDG to CVN

## Named systems

- Navy ERP+
- SAP S/4
- SKED
- OMMS
- R-Supply
- NSN

## Resources

- SAP S/4 remote and central servers
- GPUs for local LLMs
- iOS, Android or Windows devices
