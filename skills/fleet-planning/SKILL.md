---
name: fleet-planning
description: Turn scoped requirements and reuse decisions into an application architecture, ordered implementation plan, and traceable acceptance matrix.
---

# Implementation planning

Read requirements.md, scope.md, research.md and .fleet/packet.json. Publish the application architecture with fleet_system_design, mapping components to the source files the build agent will create. Then write plan.md and test-matrix.md.

Define the smallest complete workflow, data contracts, dependencies, failure states and ordered implementation tasks. Map every acceptance criterion to an independent expected result and a test, manual procedure or explicit integration gap. Keep domain calculations separate from model-assisted explanation.

Target a self-contained index.html with inline styles and classic JavaScript, testable core logic, and Node built-in tests named *.test.cjs or *.test.mjs. Plan consistency checks between the browser app and tested core. No external dependencies are required for this delivery contract.

Hand off to the build phase once the plan, test matrix and published architecture exist. Do not implement application code or claim tests passed during planning.
