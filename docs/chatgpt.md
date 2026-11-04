# ChatGPT subscription builds

AppYard includes Codex 0.166.0 as a second build engine alongside Pi. The desktop dashboard exposes the account controls.

1. Open **Settings**, then select **Codex · ChatGPT subscription** under **Build engine**.
2. Choose **Continue with ChatGPT** and complete sign-in in the browser. Settings updates when OpenAI confirms the login. Use **Cancel sign-in** to stop a pending attempt.
3. Select a model and choose **Save model settings**.
4. Start a build as usual. Intake, research, planning, implementation, verification, repair, and human review use the same factory workflow and evidence gates.

Codex uses the signed-in account's ChatGPT Codex allowance and limits. It does not use a Pi provider or fall back to API-key billing. Model choices come from Codex's catalog; catalog membership is not proof of account entitlement. The completed inference result is authoritative. Usage windows appear when the account endpoint supplies them; **Refresh connection** reloads account, models, and usage. A failed or interrupted Codex turn fails its stage, including usage-limit errors after output has started.

Choose **Pi · model providers** to continue using existing Pi credentials and API keys. Saved projects without a backend field retain the Pi behavior. The engine used for each run is recorded on the project and in its activity and delivery output. Account and engine changes are blocked while builds are active.

## Implementation

- The pinned `@openai/codex` dependency includes its native platform package. Electron Builder unpacks that executable so packaged apps do not depend on a globally installed CLI.
- The main process starts `codex app-server --listen stdio://` and performs the initialize/initialized handshake. `account/login/start` returns an OpenAI authorization URL, which the main process validates and opens. The renderer never receives that URL, OAuth tokens, or API keys.
- Codex handles the callback, token storage, and refresh. Its `CODEX_HOME` is `<AppYard userData>/codex`, separate from the user's other Codex installations. Credentials use Codex's file credential store inside the private local directory; this is distinct from Electron's encrypted Pi API-key storage. **Sign out** clears this AppYard Codex login only.
- Stage processes use that isolated login and explicitly require a ChatGPT account. Inherited `OPENAI_API_KEY`, `CODEX_API_KEY`, and `OPENAI_BASE_URL` values are removed. The thread explicitly selects the OpenAI provider and requested model.
- Each stage gets its own Codex thread with the resolved phase skills and AppYard domain/architecture tools registered through the experimental dynamic-tool protocol. The dependency is pinned and its generated schema was checked for the `type: "function"` descriptor.
- Codex uses workspace-write permissions, no approval escalation, and no external network access for shell commands. AppYard's independent verification runner still executes generated tests as local processes. Prompt instructions are not a substitute for OS isolation.
- The stdio client correlates requests, bounds RPC waits, handles process loss, translates text/tool events into the activity stream, and terminates the stage process on cancellation or disposal. Existing stage inactivity/deadline limits and artifact checks apply to both engines.

## Validation

`npm test` includes account-state, URL validation, login cancellation, logout, protocol timeout/process-loss, tool-dispatch, failed/interrupted turn, cancellation, and full Codex factory routing tests. The full workflow uses a deterministic protocol fixture and real files plus independent Node tests; it does not consume a ChatGPT subscription.

`node scripts/smoke-chatgpt.mjs` exercises the actual bundled login-start/cancel RPC through Electron while intercepting external browser opening. It checks connected UI states with an explicitly synthetic account fixture in the desktop interface. The Electron smoke suite also exercises Pi generation, repair, review, and export.

Live sign-in completion and hosted-model generation require the user's account and have not been validated by the automated suite.

Protocol reference: [Codex app server](https://learn.chatgpt.com/docs/app-server).
