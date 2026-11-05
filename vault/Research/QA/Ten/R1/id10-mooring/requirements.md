# Physics-Informed Mooring & Tug Allocation Planning Agent

Drafting a safe mooring and pier-work plan requires navigating ship displacement, berth depth, wind and tidal current vectors, bollard load ratings, and line configurations. Bridge teams often rely on static whiteboard sketches and rough mental estimates. This use case asks teams to build an agentic mooring assistant that calculates lateral environmental forces and autonomously configures tug placement and mooring line sequences.

Requirements
The tool must provide a drag-and-drop 2D pier canvas for selecting ship class, pier number, and line types. A physics-informed agent ingests mock hydrographic data (wind velocity, ebb/flood current) and iteratively evaluates mooring line geometry and bollard strain against NSTM 582 limits. The agent must recommend optimal tug assist horsepower, line sequences, and issue warnings when wind gusts threaten breaking line thresholds.

Expected deliverables
An interactive web application outputting an approved Mooring Evolution Safety Sheet and graphical layout, complete with agent rationale and safety margins. Deliverables include a demo walkthrough and a 1-page fielding brief.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10

## Evaluation criteria
No evaluation criteria supplied. Propose measurable outcomes in scope.md and test-matrix.md; distinguish these from user-confirmed criteria.

## Resources

NSTM 582 (Mooring and Towing)

## Reference links

- https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10

Use synthetic data only. Operational readiness requires independent domain review.