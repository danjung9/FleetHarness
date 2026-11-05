# Know Before It Breaks the Mission

Challenge statement: Surface emerging readiness risk and what to do first, before it affects tasking.

High-value outcome to the fleet: Leaders see readiness risk before it reaches tasking, know why, and act on the right thing first.

Operational problem: Ship leaders reconstruct status from the 8 O'Clock and 1200 reports, maintenance schedules, casualty reports, manning, spreadsheets and meetings. Sailors re-enter the same data across many disconnected systems (one submitter lists seven). Individual indicators exist, but no one can quickly tell whether a seemingly minor change. A slipped maintenance action, a late part, two qualified watchstanders detaching will become a mission-readiness problem next week.

Scenario:
A destroyer is 21 days from a scheduled mission. During the event a stream of changes arrives: a casualty report on a radar, a parts arrival date slips, a maintenance backlog grows, two qualified personnel detach, and the schedule moves. Show which mission capabilities are at risk, why, and what to do first.

Transition hypothesis:
- Owner: Naval Surface Forces / Task Force Hopper (two related submissions came from surface force headquarters staff)
- Destination: Task Force Hopper data environment
- Next steps: 30d: owner validates the mission-dependency model; 60d: access to representative ship data; 90d: shore-based pilot on one ship's data; 180d: decision on integration with readiness reporting

Category: Fleet Readiness & Restore-to-Mission (Status: New)
Category description: Focuses on the readiness chain from an equipment casualty to restored mission capability, and on seeing readiness risk before it reaches tasking. Projects will correlate technical procedures, maintenance history, parts, manning and schedule data to isolate faults, plan restorations and surface compounding risks, working on last-synced data when disconnected. The goal is shorter time to restore and an earlier, explainable view of mission risk, with Sailors keeping every decision.
Why this category: Maintenance, casualty response, parts and readiness visibility formed the largest problem cluster in the submissions, and it is more than administrative modernization.

Requirements
Read-only by design: cannot write back to any source system
Every flagged risk explains itself and traces to source records
Humans decide; the tool recommends
Works on last-synced data; synthetic data only
Fleet-Ready Definition of Done (all solutions): runs offline; keeps humans in authority; cites sources; logs auditable actions; syncs on reconnect; includes a one-page path to fleet.

Expected deliverables
- Earlier identification of compounding readiness risks
- Prioritized, explained actions for leadership
- Less time spent assembling status

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/32

## Evaluation criteria
1. Injected risks correctly identified and ranked against an answer key
2. False-alarm rate on injected noise
3. Every flagged risk traceable to its source records
4. Time to produce a leadership readiness brief against a manual baseline [baseline to be set with Fleet SME]
5. Official judging rubric: Warfighting 30%; Speed to Fleet 20%; Scalability 20%; Barrier Removal 15%; Judges' Discretion 15%.

## Resources

- Synthetic ship status dataset: 8 O'Clock / 1200 reports, maintenance schedule, casualty reports, manning and qualifications, ship schedule
- Mission-to-equipment dependency table
- Optional synthetic equipment condition data for a predictive variant
- SMEs with department head / executive officer perspective

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/32

Use synthetic data only. Operational readiness requires independent domain review.