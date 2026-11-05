# ChatGPT and API-key builds

AppYard includes Codex 0.166.0 as a second build engine alongside Pi. The desktop dashboard exposes the account controls.

1. Open **Settings**, then select **Codex · ChatGPT or API key** under **Build engine**.
2. Choose **Continue with ChatGPT**, complete sign-in in the browser, and allow ChatGPT plan usage. Settings updates when OpenAI confirms the login and shows **You’re using your ChatGPT plan**. Use **Reopen browser** if the browser tab closes, or **Cancel sign-in** to stop a pending attempt.
3. Select a model and choose **Save model settings**.
4. Start a build as usual. Intake, research, planning, implementation, verification, repair, and human review use the same factory workflow and evidence gates.

Builds use the signed-in account's ChatGPT plan usage and limits. Choose **Manage ChatGPT usage** to open [ChatGPT usage settings](https://chatgpt.com/settings/usage). Signing in without allowing plan usage keeps model selection and saving disabled; choose **Enable ChatGPT plan usage** to complete consent. Model choices come from OpenAI's model endpoint using the selected account; catalog membership is not proof of account entitlement. The completed inference result is authoritative. A failed or interrupted Codex turn fails its stage, including usage-limit errors after output has started.

Alternatively, enter an API key in the password field and choose **Sign in with API key**. The field clears immediately. This route uses the key's API account and billing, without ChatGPT plan consent. Sign out before replacing a key; **Continue with ChatGPT** or the saved-account selector switches back to the app-owned browser login.

Use **Add account** to connect another ChatGPT account. **Saved account** switches between local registrations, and **Reconnect account** signs back in to a selected registration after sign-out. **Refresh connection** reloads the selected account and model catalog. Account selection changes the active login immediately; choose **Save model settings** to save the engine and model selection.

Choose **Pi · model providers** to continue using existing Pi credentials and API keys. Saved projects without a backend field retain the Pi behavior. The engine used for each run is recorded on the project and in its activity and delivery output. Account and engine changes are blocked while builds are active.

## Implementation

- The pinned `@openai/codex` dependency includes its native platform package. Electron Builder unpacks that executable so packaged apps do not depend on a globally installed CLI.
- AppYard owns the browser authorization flow using OpenAI's Sign in with ChatGPT token-sharing protocol: PKCE, a random state value, and a loopback callback. The main process constructs and validates the OpenAI authorization URL before opening it. The renderer receives only account display state, saved-account labels, and model choices; it never receives the authorization URL, OAuth tokens, or API keys.
- Local registrations and token refresh belong to AppYard. They are written atomically to `<AppYard userData>/chatgpt/credentials.json` with owner-only permissions (`0600`), distinct from Electron's encrypted Pi API-key storage. An app instance lock keeps one process responsible for rotating tokens in each user-data directory. **Sign out** clears the selected AppYard login while retaining its registration for reconnecting.
- The browser sign-in approach was informed by [LearnHarness](https://github.com/amosblomqvist/learnharness) and implemented independently against [OpenAI's open-source token-sharing documentation](https://developers.openai.com/siwc/token-sharing-open-source). No LearnHarness source code is included.
- The main process loads models from `GET https://api.openai.com/v1/models` with the selected account's OAuth access token. No Codex process is needed to sign in or select a model. Browser login no longer depends on Codex's `account/login/start` RPC.
- Each build stage starts `codex app-server --listen stdio://` and performs the initialize/initialized handshake. Its isolated `CODEX_HOME` at `<AppYard userData>/codex` stores thread data. The child process receives the selected account's access token through `FLEET_CHATGPT_ACCESS_TOKEN` and uses the `openai_chatgpt_plan` provider at `https://api.openai.com/v1`. Inherited `OPENAI_API_KEY`, `CODEX_API_KEY`, and `OPENAI_BASE_URL` values are removed. Before each prompt, AppYard refreshes credentials near expiry; if the token changes, it restarts the child and resumes the saved thread. An authorization failure during an active turn fails the stage without automatically replaying work.
- Each stage gets its own Codex thread with the resolved phase skills and AppYard domain/architecture tools registered through the experimental dynamic-tool protocol. The dependency is pinned and its generated schema was checked for the `type: "function"` descriptor.
- Build threads use `danger-full-access`, network access and live web search. Generated tests, services, previews and evaluators run directly with host permissions. The project lead retains its separate tool limits. Process markers and cleanup checks still make Stop account for tracked run processes before a terminal status is saved.
- API-key login uses the installed app-server protocol `account/login/start` with `type: "apiKey"`. The app-server manages that credential in AppYard's Codex home. AppYard persists only the selected route in `connection.json`; ChatGPT registration and token ownership stay with the browser flow above. No login method is forced.
- Logs and saved diagnostics redact registered credentials and sensitive headers. Delivery scans the validated manifest and completed bundle for configured credentials while retaining authoritative verification evidence.
- The stdio client correlates requests, bounds RPC waits, handles process loss, translates text/tool events into the activity stream, and terminates the stage process on cancellation or disposal. Existing stage inactivity/deadline limits and artifact checks apply to both engines.

## Validation

`npm test` includes account-state, URL validation, login cancellation, logout, protocol timeout/process-loss, tool-dispatch, failed/interrupted turn, cancellation, and full Codex factory routing tests. The full workflow uses a deterministic protocol fixture and real files plus independent Node tests; it does not consume a ChatGPT subscription.

`node scripts/smoke-chatgpt.mjs` starts the actual loopback sign-in flow through Electron while intercepting external browser opening. It verifies cancellation closes the callback server, browser reopening, the fixed usage-settings destination, IPC input checks, and that bootstrap data excludes authorization secrets. An explicitly synthetic account fixture checks connected UI, switching accounts, reconnecting, adding an account, sign-out, and plan-usage consent gating at desktop and minimum window sizes. The Electron smoke suite also exercises Pi generation, repair, review, and export.

Live sign-in completion and hosted-model generation require the user's account and have not been validated by the automated suite.

Protocol references: [Sign in with ChatGPT token sharing](https://developers.openai.com/siwc/token-sharing-open-source), [Codex app server](https://learn.chatgpt.com/docs/app-server).
