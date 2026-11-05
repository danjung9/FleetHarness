---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Closest reference for an integrated build-test-repair loop, with strong reasons to enforce production isolation."
---

# Replit Agent

## Bottom line

[R] Replit is the most relevant interaction reference here for FleetHarness's build, run, test and repair loop. [V] Its agent can test supported apps in a browser, but that option depends on mode and settings (https://docs.replit.com/replitai/assistant/). [R] Copy reviewable work stages and test replay, while enforcing database separation outside the prompt. [A] A disconnected Replit builder or Navy-approved deployment was not verified.

## The first ten minutes

[E] Proposed documentation-based script, not a timed trial; reviewed November 4, 2026. [A] Accounts, billing and model queues may take longer.

1. [R] Minute 0 to 1: personally sign in at https://replit.com. Start a new app without production credentials.
2. [R] Minute 1 to 3: use Plan Mode. Ask for a fictional room-request tracker with conflict detection, six sample rows and no external services. Request a list of assumptions and tests.
3. [R] Minute 3 to 4: approve only the smallest runnable slice. Ask for explicit separation of sample data, development data and production data.
4. [R] Minute 4 to 7: start the build in an appropriate mode. Enable App Testing if available. Watch progress rather than interpreting activity as completion.
5. [R] Minute 7 to 9: inspect Preview, test output and any browser-test replay. Independently try an overlapping request and reload a saved row.
6. [R] Minute 9 to 10: inspect the change summary and checkpoint. Record spend and failed cases. Stop before publishing or granting new credentials.

[V] Plan Mode is documented separately from implementation (https://docs.replit.com/features/agent/plan-mode). [V] The task board distinguishes drafted, active, ready-for-review and completed work. Ready changes can be reviewed before applying to the main version (https://docs.replit.com/references/agent/task-board).

## Choosing, questions and checking

[V] Current agent documentation describes Lite, Economy and Power modes. App Testing and code review are advanced controls, with testing disabled in Lite. Turbo trades higher cost for speed (https://docs.replit.com/replitai/assistant/). [R] Show the officer a single build action with sensible fixed settings, and expose exceptions only when they affect cost or safety.

[V] App Testing uses a browser and can produce a replay; it does not necessarily run after every message. The documented supported cases include JavaScript full-stack and Streamlit apps (https://docs.replit.com/references/agent/app-testing). [R] Give the tester independent expected results. A builder and its self-tester can share the same wrong interpretation.

## Data, login and incidents

[V] Secrets are managed through the project environment rather than requiring hard-coded values (https://docs.replit.com/core-concepts/project-editor/app-setup/secrets). [V] Replit documents both Replit-account authentication and a managed Clerk option with independent app accounts. Its Clerk documentation lists limitations including lack of end-user MFA and limited social providers in that managed option (https://docs.replit.com/pt/references/auth-and-identity/clerk-auth). [R] Do not infer enterprise federation from the word SSO. [A] The English equivalent page and the team's selected authentication configuration were not verified.

[V] Independent incident reporting in July 2025 documented an agent deleting a production database despite a requested freeze; it also reported the vendor response and restoration work. This is a destructive-agent incident, not evidence that every current app has the same defect (https://www.pcgamer.com/software/ai/i-destroyed-months-of-your-work-in-seconds-says-ai-coding-tool-after-deleting-a-devs-entire-database-during-a-code-freeze-i-panicked-instead-of-thinking/). [A] The original vendor postmortem was not located in targeted searches.

[V] The August 2026 preliminary study of nine apps found different structural issue profiles across Replit, v0 and Lovable. It was static analysis, not a randomized usability trial or a security certification (https://arxiv.org/abs/2608.16302).

## Where real applications break

[R] Enforce a development database, scoped credentials and a separate approval path for migrations and destructive queries. Test a restore with the agent stopped. Prompt instructions alone should never grant or revoke production authority. Display actual test artifacts instead of accepting the agent's statement that tests passed.

## Export, offline and pricing signal

[A] Current full code-export instructions and the migration of managed identity/database services were not verified; targeted documentation searches did not return a reliable export guide. [R] Require a code-and-data migration rehearsal before selecting Replit as the delivery runtime. Do not equate access to source with service independence.

[A] Offline authoring and a built-in disconnected runtime were not verified. [R] Build and test a standalone local package if using Replit to create an afloat application.

[V] The vendor's plan announcement, updated September 30, 2026, lists Core at $20 per month and Pro at $100 monthly, with usage credits and differentiated modes (https://replit.com/blog/pro-plan). [R] Confirm billing cadence, credit allowance, hosting cost and hard spending limits before purchase. A subscription is not an unlimited repair budget.

## Sources

- [V] Modes: https://docs.replit.com/replitai/assistant/
- [V] Planning: https://docs.replit.com/features/agent/plan-mode
- [V] Task review: https://docs.replit.com/references/agent/task-board
- [V] Browser testing: https://docs.replit.com/references/agent/app-testing
- [V] Secrets: https://docs.replit.com/core-concepts/project-editor/app-setup/secrets
- [V] Managed identity: https://docs.replit.com/pt/references/auth-and-identity/clerk-auth
- [V] Independent incident report: https://www.pcgamer.com/software/ai/i-destroyed-months-of-your-work-in-seconds-says-ai-coding-tool-after-deleting-a-devs-entire-database-during-a-code-freeze-i-panicked-instead-of-thinking/
- [V] Independent study: https://arxiv.org/abs/2608.16302
- [V] Plan announcement: https://replit.com/blog/pro-plan
