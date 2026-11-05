# CASREP Command: Unified Casualty Report Drafting, Routing & Release

Today a CASREP is drafted in one tool, emailed or walked around the ship for chop in another, marked up on paper or in redlines, and finally released as a message, with no single source of truth for where it stands or who is holding it. This slows reporting of equipment casualties that directly affect readiness and parts priority, and it buries the originating sailor in rework. This use case asks teams to build one tool where a CASREP is written, routed through the chain of command, commented on, revised, and released, all in one place.

Requirements
The tool must support role-based access for the originator (Sailor/LPO), Division Officer, Department Head, Engineer Officer/CHENG, XO, and CO as releasing authority, with each role able to comment, return for revision, or approve and forward. Drafts must enforce NWP 1-03.1 CASREP formatting (report types such as INITIAL, UPDATE, CORRECT, and CASCOR, plus category and required fields), keep a full version history and audit trail of every comment and approval, and show at a glance where each report is in the routing chain. The prototype must use notional, unclassified data only.

Expected deliverables
A working prototype that walks one mock CASREP from initial draft through every approval role to CO release, including at least one "returned for revision" loop. Teams should also submit a short demo video or live walkthrough and a one-page brief covering the role/permission model, how the tool would handle classification and integration with existing Navy messaging systems, and what it would take to field it.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8

## Evaluation criteria
No evaluation criteria supplied. Propose measurable outcomes in scope.md and test-matrix.md; distinguish these from user-confirmed criteria.

## Resources

- NWP 1-03.1, Operational Reports (CASREP format and reporting rules)
- OPNAVINST 4790.4 (3-M Manual), for linking casualties to maintenance actions and JSNs
- Sample unclassified mock CASREPs and a notional ship chain of command, provided by the use case sponsor

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/8

## Data and inputs

No input data supplied. A dedicated synthetic data agent will create use-case-specific fixtures during intake in data/synthetic-data.json and data/README.md.


Use only explicitly supplied brief inputs and clearly labeled synthetic examples. Reference links do not authorize access to remote systems. Operational readiness requires independent domain review.