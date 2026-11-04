---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Donovan already offers no-code defense agents, with a public Army experiment exposing important limits."
---

# Scale Donovan

## Bottom line

[V, vendor] Donovan already offers a no-code agent factory, data connections, model comparison and evaluation. https://scale.com/donovan
[V, government user research] An Army War College experiment found useful support for challenging human plans, alongside gaps in spatial understanding, calculation and memory. https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF
[R] Copy the combination of source access and evaluation, while keeping deterministic tasks in deterministic tools. [R] Do not pitch FleetHarness as the first simple AI assistant for military staff.

## What it does and daily use

[V, vendor product page] Donovan lets a builder select data sources, create knowledge bases, choose models, configure instructions and connect tools through its integration with Scale GenAI Platform. The page shows document upload, retrieval, report generation and model comparison. Its advertised deployment options include Kubernetes, classified networks and air-gapped environments; the public page names IL4 and FedRAMP High authorization. https://scale.com/donovan

[A] A staff user could open a prepared assistant, ask a question over approved references, inspect supporting material and revise a report. A workflow owner must configure and evaluate that assistant. The no-code promise does not mean no data preparation, validation or training.

## Actual users and Navy or DoW evidence

[V, government experiment] Army War College researchers describe a May 2025 five-day US Army North war game in which Donovan supported planning analysis. This is a documented experiment with military users, not proof of fleet-wide production readiness. https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF

[V, vendor customer claim] Scale's 2025 progress report says it has a Defense Logistics Agency R&D contract to use Donovan for logistics information and routine tasks. The same report discusses other Scale programs; those should not all be counted as Donovan deployments. https://scale.com/blog/scale-public-sector-building-on-our-progress-in-2025

[E] A named Navy production deployment was not verified. Searches for Donovan with Navy and government-service domains yielded mostly unrelated people or broader Scale activity. Thunderforge is a related Scale effort, not evidence that every Donovan feature is present in every Thunderforge deployment.

## Getting running and dependencies

[E] No current public seat price, contract-to-production median, or independent setup benchmark was verified. The five-day experiment is the exercise duration, not installation time.

[A] An existing hosted instance with a prepared knowledge base may yield a useful first interaction in one session. Establishing a new environment needs a sponsor and contract route, data access, ingestion, model and compute capacity, permissions, a deployment boundary and task-level acceptance tests. Custom offline deployment also needs local model weights, serving, identity and update arrangements.

[V, vendor] The product advertises flexible model and hosting choices and no-code customization. These are options rather than a guaranteed delivery schedule or evidence of the team's access. https://scale.com/donovan

## Public criticism and observed limits

[V, government user research] The Army War College paper says the tested system lacked the game board's spatial context and uncaptured verbal interactions. It calls for practical familiarization before headquarters adoption and recommends using AI to challenge human reasoning instead of replacing it. These findings concern the tested 2025 configuration, not an assertion that all current Donovan deployments retain the same defects. https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF

[E] The PDF returned HTTP 403 on direct retrieval. Its indexed passages, including the introduction and critical observations, were available through targeted searches. This review did not inspect the complete experimental record.

[R] For FleetHarness scheduling, use a constraint solver to prove that schedules satisfy rules and to report infeasibility. For extraction, require source spans and schema checks. Do not use plausible prose as a substitute for either.

## Copy or avoid

- [R] Copy selectable approved sources, repeatable evaluations and the ability to compare models on the same task.
- [R] Copy a reusable prepared workflow so the officer does not start with a blank prompt.
- [R] Avoid generalizing from a successful demo to reliable spatial, numerical or planning competence.
- [R] Avoid calling a generated explanation an audit trail. Preserve the inputs, tool calls, outputs, checks and human decision.

## Sources

- [V, vendor product page, accessed November 4, 2026] https://scale.com/donovan
- [V, government user research, Issue Paper 2-25, 2025, indexed passages] https://media.defense.gov/2025/Aug/05/2003773179/-1/-1/0/CENTAUR%20IN%20TRAINING%20ISSUE%20PAPER_2025%2006-26_MD.PDF
- [V, government publication listing] https://publications.armywarcollege.edu/Strategic-Issues/Center-for-Strategic-Leadership/
- [V, vendor customer claims] https://scale.com/blog/scale-public-sector-building-on-our-progress-in-2025
