---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "An agent with a 2D pier canvas that calculates mooring forces and recommends tug assist and line sequences."
use_case_id: 10
---

# Physics-Informed Mooring & Tug Allocation Planning Agent

| Field | Value |
| --- | --- |
| Portal ID | 10 |
| Category | [[UseCases/Categories#Open Innovation|Open Innovation]] |
| Difficulty | medium |
| Teams using it at capture | 1 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Bridge teams plan mooring from whiteboard sketches and rough estimates despite many physical factors.

## What to build

A physics-informed assistant using mock wind and current data to evaluate line geometry and bollard strain against limits and warn of break thresholds.

## Requirements

- Drag-and-drop 2D pier canvas
- Select ship class, pier and line types
- Ingest mock hydrographic data
- Check strain against NSTM 582
- Recommend tug horsepower and line sequences
- Warn on gust risk

## Named systems

- NSTM 582

## Resources

- NSTM 582
