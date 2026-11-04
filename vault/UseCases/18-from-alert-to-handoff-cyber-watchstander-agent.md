---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "A prototype that triages a suspected endpoint compromise from alert to analyst-approved incident handoff."
use_case_id: 18
---

# From Alert to Handoff: Cyber Watchstander Agent

| Field | Value |
| --- | --- |
| Portal ID | 18 |
| Category | [[UseCases/Categories#Open Innovation|Open Innovation]] |
| Difficulty | Not set |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Cyber watchstanders manually gather evidence from scattered tools, slowing triage, giving inconsistent handoffs and leaning on scarce senior analysts.

## What to build

An agent workflow on synthetic data that collects logs, consults a playbook, and writes an evidence-linked summary with gaps and recommended disposition for the watchstander to edit and approve.

## Requirements

- Ingest alerts, endpoint logs and event data
- Synthetic suspected-compromise scenarios
- Sample response playbook
- Correlate evidence and flag gaps with traceability
- Human review and approval of disposition and handoff

## Named systems

- SOC
- Legion

## Resources

- Legion AI agent orchestration platform
- Synthetic or sanitized cyber datasets
- Sample SOC procedures and playbooks
- AI and SOC technical staff
- Development compute and models
