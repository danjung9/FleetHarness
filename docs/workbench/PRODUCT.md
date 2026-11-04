# FleetHarness Field Workspace · UI version 3

## Audience

Frontline personnel and soldiers who need a software tool to solve a problem in their own work. They understand the operational task and its constraints; programming, agent orchestration, architecture, and model administration are not assumed skills. This is the user's confirmed audience, overriding the hackathon-builder audience recorded for the older interfaces.

## Job to be done

Describe what gets in the way, get a tool that addresses it, try it against representative examples, and decide whether the prototype is useful enough to download. The person closest to the problem defines success and retains the final decision.

## Workflow

1. Find a relevant field challenge or describe a new problem.
2. Name the tool, explain the situation, and list what it must do.
3. Create the tool through a configured desktop AI connection.
4. Follow plain-language progress and try the resulting application.
5. Review requirements, automated checks, and limitations, then approve delivery.

## Product truth

The catalog contains 34 Norfolk challenges. The browser interface supports browsing, local request drafts, saved requests, and JSON handoff. Desktop reuses FleetHarness's existing Pi/Codex build engines, local workspaces, isolated application preview, independent test runner, repair attempt, and approval/export gates. Technical logs, files, system design, and phase tools remain inspectable under Technical details.

Connection setup remains available to the user or their technical support team. Creation requires desktop and an authenticated provider; browsing and writing requests do not imply an active model connection. Generated tools are prototypes. Passing tests and approving a download do not establish operational readiness. Use synthetic or approved samples.

Concurrent shared delivery work supplies a standalone-app download control. V3's smoke test proves the source-and-evidence export path, not executable packaging or hosted model quality.

## Design constraints

Use plain language, recognizable controls, labeled states, visible focus, readable contrast, and reduced-motion support. The primary path must not require the user to read code or agent logs. Support desktop and mobile browsing, with explicit desktop requirements for tool creation. Keep the original Desktop and Studio interfaces, launch commands, bundles, and data separate.

## Scope

This product record applies only to `src/workbench/`, `workbench/index.html`, and the Workbench launch/configuration files. It does not replace root PRODUCT.md or either incumbent UI's design system.
