# Cited Contact Brief, Evidence-Backed Intelligence on Contacts of Interest

Problem Statement: When unidentified or merchant vessels appear in an operational area, tactical watchstanders spend hours manually scouring disconnected commercial registries, sanctions lists, and port logs to assess intent. Commercial AI models hallucinate and cannot cite verifiable evidence, making their output unusable for official briefing.

Operational Objective: Build an automated research agent that takes a vessel identifier (Name, IMO, MMSI) and returns a concise, 1-page intelligence brief where every factual claim links directly to an underlying primary source with exact timestamps, explicitly declaring "UNKNOWN" rather than guessing.

Requirements
Open-Source Grounding: Ingest unclassified commercial and open maritime feeds (AIS, IMO ship registries, OFAC/EU sanctions).
Zero Hallucination Tolerance: 100% of claims must link to an immutable captured source snapshot; unresolved queries must declare "Unknown".

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20

## Evaluation criteria
No evaluation criteria supplied. Propose measurable outcomes in scope.md and test-matrix.md; distinguish these from user-confirmed criteria.

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/20

## Data and inputs

No input data supplied. A dedicated synthetic data agent will create use-case-specific fixtures during intake in data/synthetic-data.json and data/README.md.


Use only explicitly supplied brief inputs and clearly labeled synthetic examples. Reference links do not authorize access to remote systems. Operational readiness requires independent domain review.