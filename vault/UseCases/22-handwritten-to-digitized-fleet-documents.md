---
type: use-case
status: active
owner: mukul
updated: 2026-11-04
summary: "Software that reads scanned handwritten maintenance logs and fills the matching Word or Excel templates with confidence scoring."
use_case_id: 22
---

# Handwritten to Digitized Fleet Documents

| Field | Value |
| --- | --- |
| Portal ID | 22 |
| Category | [[UseCases/Categories#Tactical Decision Advantage|Tactical Decision Advantage]] |
| Difficulty | Not set |
| Teams using it at capture | 0 |

Summarized in our own words from the portal [P]. Full submitted text: the Use Cases tab on the portal, or `Sources/raw/events_norfolk_combined.json`.

## Problem

Personnel record system checkouts by hand, then scan or retype them, which wastes time and adds transcription errors.

## What to build

A pipeline that accepts printer-scanned PDFs, picks the right template, extracts handwriting, flags low-confidence values and saves a populated file.

## Requirements

- Accept PDF scans from a multifunction printer
- Hold master Word and Excel templates, auto-select one
- Confidence score per extracted token
- Highlight items under 70 percent for review
- Map by meaning not coordinates
- Save as separate downloadable file

## Named systems

- Microsoft Word
- Microsoft Excel

## Resources

None listed.
