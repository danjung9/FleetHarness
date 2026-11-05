---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Reuse the existing Codex account path for model access; it does not import work data."
---

# ChatGPT sign-in

## Bottom line

[E] At commit `50fcaea`, FleetHarness already delegates ChatGPT sign-in to the bundled Codex app server. [E] The inspected account class retrieves account status, models and usage limits, with no work-data import method. [R] Reuse and verify this path instead of building another account screen before Thursday. [R] Treat access to a model and permission to import work as separate decisions.

## How it works and what the user sees

[E, read `electron/codex-account.ts` and `electron/codex-rpc.ts` at `50fcaea`] The main process creates a separate `codex` home, requests `account/login/start` with type `chatgpt`, validates the returned browser URL, then waits for the matching completion notification. The class exposes connecting, connected, disconnected and unavailable states; connected state includes email, plan and usage. It supports cancel, a five-minute timeout, refresh and logout. The browser opens through the host callback; no password field is implemented in this class.

[E, same source] The launcher forces ChatGPT login, removes inherited API-key provider overrides and requests file-based credential storage. The home directory is created with mode `0700`. Tokens are not returned by the account class to the renderer. [R] A protected directory is useful but does not establish encrypted storage, backup protection or complete revocation. Keep credential files out of exports, logs and generated workspaces.

[V] Official app-server documentation describes managed sign-in and token refresh. Its current browser example uses a `chatgpt.com` URL, while this code accepts only HTTPS on `auth.openai.com`. https://learn.chatgpt.com/docs/app-server [A] Compatibility with bundled `@openai/codex` version `0.166.0` needs a controlled runtime check. [R] Do not loosen the hostname check merely to make a failed login continue.

[V] ChatGPT plan use by another app does not itself grant conversation or memory access. https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites [R] Show plain copy: "Connect AI access. Choose files separately." Do not promise access to a user's existing ChatGPT projects or connected Gmail/Drive accounts.

## Navy approvals and event rule 4

[V] The app-server documentation permits continuation of existing local or open-source integrations, distinguishes commercial or hosted services, and directs those services toward supported Sign in with ChatGPT arrangements. https://learn.chatgpt.com/docs/app-server [R] Before distribution, confirm the application's integration category, provider terms, workspace controls and authorized inference destination with the responsible owner. Do not present this login as Navy SSO or Navy authorization.

[R] Apply the common approval gates in [[Research/RandE/Connectors/README]]. Treat account email as personal information: do not copy it into notes, screenshots or demo evidence. Rule 4 applies to prompts, generated files and tool results regardless of which account funds inference. Only the account owner signs in; this research performs no login.

## Thursday and post-event

[R] Thursday: use the already authorized event model path for synthetic requests. If the main session separately verifies this existing sign-in path, describe only model access and mask account identity during presentation. Keep a synthetic status fixture for interface explanation, labeled as simulated. No mailbox is involved.

[R] Post-event: verify cancel, denied login, timeout, logout, credential deletion behavior, usage exhaustion and workspace restrictions. Recheck provider guidance against the packaged version and intended distribution. Do not extract tokens to call unrelated APIs.

## Build size and evidence

[A] Estimate: 2 to 4 engineer-hours to exercise existing behavior, 1 to 3 engineer-days for storage and failure-path hardening. A different supported sign-in integration is a separate estimate after access and requirements are confirmed. Approval time is excluded.

[E] Read `tests/codex.test.mjs`, which uses fake RPC responses. The external gate report says 128 tests passed at `50fcaea`; this seat ran no tests or sign-in. Live authentication, entitlement and secure deletion remain not verified.

[E, final relay and Git diff] Teammate commit `631849f` unifies the interface and removes Studio/Workbench. No `electron/` or `shared/` files changed from `50fcaea`; the account/RPC findings still apply. The refreshed gate report records 128 passed at `631849f`, without a live-login result. [R] Use the retained interface when arranging the controlled check.

## Sources

- [E] FleetHarness `50fcaea1e86028503ae66bd2f17287093ad30cbe`: `electron/codex-account.ts`, `electron/codex-rpc.ts`, `tests/codex.test.mjs`, `package.json`, read through Git objects.
- [E] `~/.local/share/fleethacker-context/org/reports/mvp-gate.md`, reported gate only.
- [V] https://learn.chatgpt.com/docs/app-server
- [V] https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites
- [V] https://developers.openai.com/siwc

