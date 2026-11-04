---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An offline agent that finds, explains and fixes vulnerabilities in isolated shipboard-like networks, with human approval for every change."
use_case_id: 35
---

# Autonomous Cyber Defender

| Field | Value |
| --- | --- |
| Portal ID | 35 |
| Category | [[UseCases/Categories#Cyber Resilience & Trusted Autonomy|Cyber Resilience & Trusted Autonomy]] |
| Difficulty | medium |
| Teams using it at capture | 2 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

New STIGs and vulnerability bulletins arrive faster than cyber staff can review them, and afloat networks cannot use normal patching or cloud tools.

## What to build

A tool for an isolated enclave that discovers affected assets, explains risk, proposes fixes, applies them after approval or lists steps, verifies and reports, including finding a hidden seeded flaw.

## Requirements

- Works isolated and on low bandwidth
- Human approval and rollback for every change
- Full audit trail
- Open interfaces, no live Navy networks
- Runs offline, cites sources, syncs on reconnect

## Named systems

- STIG
- NVD
- CVE
- DISA

## Resources

- Isolated cyber range with misconfigured hosts
- Public DISA STIGs and NVD/CVE feeds
- Sample logs and network configurations
- Low-bandwidth link emulation
- IT and cyber SMEs
