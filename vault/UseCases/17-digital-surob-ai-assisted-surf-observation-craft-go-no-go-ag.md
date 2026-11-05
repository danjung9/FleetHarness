---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An offline app that completes the surf observation worksheet, computes the Modified Surf Index and drafts craft GO/NO-GO for human approval."
use_case_id: 17
---

# Digital SUROB: AI-Assisted Surf Observation & Craft GO/NO-GO Agent

| Field | Value |
| --- | --- |
| Portal ID | 17 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | Not set |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Beach party teams compute the Modified Surf Index by hand on paper, often without connectivity, and an arithmetic error can endanger craft and crews.

## What to build

A phone or laptop app that takes typed or spoken observations, fills the SUROB worksheet, shows the math, and sends the approved report over a disconnected link; the agent never issues GO/NO-GO itself.

## Requirements

- Fully offline
- Complete worksheet Alpha through Hotel
- Show MSI math and compare to craft limits
- BPTC/SRM approval before release
- Log all inputs, actions and approvals with a hard stop
- Match historical hand-calculated worksheets

## Named systems

- MSI
- SUROB
- LCAC
- LCU
- LCM
- LARC-V
- INLS
- ACV

## Resources

- Existing offline SUROB/MSI calculator prototype
- NTTP 3-59.3M
- MCRP 2-10.3
- BMU-HNDBK-5400.1B
- BMU2 OIC
