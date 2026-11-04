---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Additional comparator for inspectable internal tools and self-hosting, with a steeper non-coder path and patching duty."
---

# Appsmith

## Bottom line

[R] Include Appsmith as a self-hosted internal-tool comparator, not as an equivalent one-prompt app generator. [V] Its documented core workflow is widgets, data sources, queries and JavaScript (https://docs.appsmith.com/). [R] Borrow its inspectable connection between an action and the underlying query. [R] Prepare and govern the platform before putting a non-coder in front of it.

## The first ten minutes

[E] Proposed documentation-based walkthrough, read November 4, 2026; nothing was installed or run. [A] It assumes an administrator has already provisioned an instance and a synthetic read-only resource. Self-host installation is outside the ten-minute officer experience.

1. [R] Minute 0 to 1: personally sign in to the approved instance and create an application.
2. [R] Minute 1 to 3: select an administrator-prepared training_requests datasource or sample app. Avoid entering database credentials.
3. [R] Minute 3 to 5: drag a Table widget onto the canvas and bind it to a prepared query returning six synthetic requests.
4. [R] Minute 5 to 7: add a status filter and a request-detail panel. Use an existing query or binding example rather than expecting a novice to invent SQL.
5. [R] Minute 7 to 9: run the read-only query, inspect its results and verify the table matches. Change a filter and confirm expected row counts.
6. [R] Minute 9 to 10: inspect who can view or edit the app. Save it; record the developer work needed to implement a safe approval action.

[V] The introduction documents cloud sign-up or self-hosting, drag-and-drop UI, datasource connections, queries, JavaScript and Git collaboration (https://docs.appsmith.com/). [R] A prepared sample is essential to making this simple for a non-coder.

## Choosing, questioning and result inspection

[V] Appsmith provides AI-provider integrations for app functionality, including chat; this is not by itself evidence that the whole app is generated through a requirements conversation (https://docs.appsmith.com/connect-data/reference/google-ai). [A] A current, mandatory conversational app-planning interview was not verified.

[R] Let FleetHarness perform the requirements interview and supply a small set of governed templates. For this user, choosing a task and filling in fields is simpler than choosing widgets, SQL and JavaScript. Show the proposed action, affected records and reason before a write.

[R] Check datasource output, displayed rows, ordinary-user permissions, repeated submissions and failed writes. A query that runs successfully may still select the wrong records or run with excessive authority.

## Data, login and security evidence

[V] Self-hosting lets the organization operate the platform on its own infrastructure. The vendor notes some features need internet and offers a separate air-gapped version through sales (https://docs.appsmith.com/getting-started/setup). [R] Scope data access at the database or API as well as in the app. [A] Selected credential encryption, retention and identity-provider configuration were not verified in this pass.

[V] Independent security evaluation by Resecurity, January 21, 2026, describes CVE-2026-22794: attacker-controlled origins could affect password-reset links and enable account takeover. It identifies versions through 1.92 as affected and 1.93 as fixed (https://www.resecurity.com/blog/article/cve-2026-22794-changing-the-origin-header-to-take-over-appsmith-accounts). [V] Appsmith's notice says instances using SSO or without email delivery are not vulnerable to that issue (https://community.appsmith.com/index.php/content/blog/version-192-and-lower-important-security-notice-cve-2026-22794-recent-version-updates).

[R] A fixed version for that CVE is not a sufficient current patch target. Check all advisories and deploy a supported current release. [V] The project's advisory index contains later 2026 reports as well (https://github.com/appsmithorg/appsmith/security/advisories). [A] This was a documented vulnerability evaluation, not a controlled usability trial or confirmation that our own instance was compromised.

## Where real apps get difficult

[R] Expect engineering work at query design, reusable logic, record-level authorization and schema changes. Self-hosting transfers upgrade, monitoring, backup, identity and incident-response duties to the team. Keep an identified technical owner and a shutdown path.

[V] Business audit logs cover app changes, datasource and query activity, administrator changes and sign-in events, with JSON export (https://docs.appsmith.com/advanced-concepts/audit-logs). [R] Verify log completeness for the specific action and keep secrets out of query outputs and logs.

## Export, offline and pricing signal

[V] Audit documentation lists application import and export through Git or JSON (https://docs.appsmith.com/advanced-concepts/audit-logs). [R] Treat those as Appsmith application definitions requiring an Appsmith runtime, not verified standalone frontend source.

[V] The self-host documentation recommends Docker or Kubernetes and gives a baseline of two virtual CPUs and 8 GB memory. It explicitly distinguishes ordinary self-hosting from the air-gapped offer (https://docs.appsmith.com/getting-started/setup). [A] An unattended disconnected installation, licensing behavior and offline identity were not tested. [R] A local server on a ship is a different deployment from an app that runs on a disconnected laptop.

[V] Current pricing lists Free, Business at $15 per user monthly and Enterprise at $2,500 monthly for 100 users. Enterprise includes SAML/OIDC options and lists air-gapped availability as an add-on (https://www.appsmith.com/pricing). [R] Price every member and the hosting/operations burden; confirm the contracted air-gap and support terms.

## Sources

- [V] Core workflow: https://docs.appsmith.com/
- [V] AI datasource: https://docs.appsmith.com/connect-data/reference/google-ai
- [V] Self-hosting: https://docs.appsmith.com/getting-started/setup
- [V] Independent security analysis: https://www.resecurity.com/blog/article/cve-2026-22794-changing-the-origin-header-to-take-over-appsmith-accounts
- [V] Vendor security notice: https://community.appsmith.com/index.php/content/blog/version-192-and-lower-important-security-notice-cve-2026-22794-recent-version-updates
- [V] Advisory index: https://github.com/appsmithorg/appsmith/security/advisories
- [V] Audit and definition export: https://docs.appsmith.com/advanced-concepts/audit-logs
- [V] Pricing: https://www.appsmith.com/pricing
