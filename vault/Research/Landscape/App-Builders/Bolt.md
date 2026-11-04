---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Useful all-in-one onboarding and visible infrastructure, with token costs and runtime portability to verify."
---

# Bolt

## Bottom line

[R] Borrow Bolt's integrated preview, database view and visible usage meter. [V] Its guide builds an app with login and saved favorites, then checks the corresponding database rows (https://support.bolt.new/building/quickstart). [R] That is a stronger teaching pattern than checking only the rendered screen. [A] A disconnected, portable full-stack deployment was not demonstrated in this research.

## The first ten minutes

[E] Proposed script based on public documentation, read November 4, 2026; no account or live app was created. [A] Generation time is variable; the vendor's full introductory guide allows 10 to 15 minutes.

1. [R] Minute 0 to 1: open https://bolt.new in a Chromium browser. Personally sign in with an allowed account.
2. [R] Minute 1 to 2: submit: Create a fictional training-room request app. Six synthetic requests, room and time filters, explicit conflict warnings. Do not publish or connect external systems.
3. [R] Minute 2 to 6: watch generation. Use the wait to write two test cases: one overlap and one valid request. Do not keep sending corrective prompts during the initial build.
4. [R] Minute 6 to 8: exercise filters and conflict behavior in Preview. Select the title and ask for a precise wording change.
5. [R] Minute 8 to 9: if persistence was requested, open the database view and verify one new synthetic row. Otherwise record that the first version uses sample state.
6. [R] Minute 9 to 10: inspect remaining tokens and Version history. Save the known working state. Do not publish.

[V] The official quickstart includes prompt submission, personal sign-up, a survey, an approximately five-minute initial database-backed build, preview, database inspection, user management and version restoration (https://support.bolt.new/building/quickstart).

## Choosing the app and asking questions

[V] Bolt generates JavaScript-based full-stack apps from prompts and can automatically provision a database when the requested features require it. Its documented integrations include GitHub and Expo (https://support.bolt.new/building/intro-bolt).

[V] Current tutorial guidance distinguishes Planning Mode for the newer agent from Discussion Mode for the legacy agent. It describes discussion as investigating and planning without code changes (https://support.bolt.new/building/video-tutorials). [A] A guaranteed requirements questionnaire was not verified. [R] Explicitly ask it to list unresolved access, persistence and offline requirements before building.

## Checking and failure boundary

[R] Test an actual saved row, reload, sign out, and use a second synthetic account. Verify that a hidden edit button is also denied by the backend. Check the same rule again after a generated migration.

[V] Bolt's pricing explanation says larger projects consume more tokens because project files are synchronized into model context (https://bolt.new/pricing). [R] Set a maximum repair budget and stop after repeated unsuccessful fixes. Export the last working version before attempting an architectural rewrite. Ask a developer to review concurrency, authorization and recovery.

## Data, login and security evidence

[V] Bolt Cloud combines hosting, databases and user authentication. The introduction says users can inspect tables, logs, edge functions and secrets, and can claim a database and connect it to Supabase (https://support.bolt.new/building/intro-bolt). [A] Whether the team's desired enterprise identity and government region are supported was not verified. [R] Separate project access from deployed-app access and database policy.

[V] Vendor claim dated July 30, 2026: Bolt added an AI security audit when publishing, covering categories including injection and cross-site scripting (https://bolt.new/blog/security-audit-on-publish). [R] Treat that as a useful review step, not proof that an app's business permissions are correct.

[V] Independent hands-on evaluation: TechRadar's July 2026 review reported slow generation and restrictive free token capacity, while finding the documentation useful (https://www.techradar.com/pro/software-services/bolt-no-code-review). [A] A directly documented hosted Bolt security breach or original researcher exploit report was not verified after targeted searches. No finding here establishes absence of vulnerabilities.

## Export, offline and pricing signal

[V] The introduction documents GitHub integration for source control, backups and collaboration (https://support.bolt.new/building/intro-bolt). [A] A complete database/auth export and independent rehosting procedure were not verified; searches for ZIP download instructions did not produce a reliable current page. [R] Require an export rehearsal including data and identity rather than assuming a repository includes them.

[A] Offline builder use and a ready-made disconnected runtime were not verified. [R] A browser-based development environment is not an offline capability; test the exported app with external network access disabled.

[V] At retrieval, the pricing page lists Free with 1 million monthly tokens and a 300,000 daily limit; Pro starts at $25 per month with 10 million tokens; Teams is $30 per member monthly. Higher use and infrastructure capacity matter (https://bolt.new/pricing). [R] Estimate the cost of ten repair iterations, not just one initial generation.

## Sources

- [V] Quickstart: https://support.bolt.new/building/quickstart
- [V] Architecture and integrated services: https://support.bolt.new/building/intro-bolt
- [V] Planning terminology: https://support.bolt.new/building/video-tutorials
- [V] Publish-time audit: https://bolt.new/blog/security-audit-on-publish
- [V] Independent review: https://www.techradar.com/pro/software-services/bolt-no-code-review
- [V] Pricing: https://bolt.new/pricing
