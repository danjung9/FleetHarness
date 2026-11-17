# AppYard build harness

AppYard connects a chosen model to host tools through an authenticated, per-session
loopback MCP bridge. Native engine tools and delegation are disabled. The current
AppBuilder keeps planning, implementation and repair in one coding session on the
selected model. Host verification executes independently and returns failures to
the same session, with a maximum of three repairs. There is no agent-to-agent
conversation. Human review and verified-source export remain the delivery gates.

The connection interface shows ChatGPT, OpenAI API key, GenAI.mil, provider API
and existing provider options. Provider and model lists are searchable radio
choices. The toolbar opens these choices instead of a model dropdown. The
underlying engine's name is an implementation detail, absent from interface copy.

## ChatGPT sign-in

Desktop uses the official Sign-in with ChatGPT DevKit local SDK and React button.
The source revision and modifications are recorded in
vendor/sign-in-with-chatgpt-devkit/PROVENANCE.json. The SDK owns OAuth, PKCE,
profile selection, plan-use consent, token refresh and encrypted persistence.
Electron safeStorage provides encryption. Only safe account snapshots cross IPC.

One documented SDK extension obtains a refreshed access token in the trusted host
process. The local Responses gateway fixes the selected model, sets store:false,
blocks redirects and keeps the real token out of engine configuration and tools.
Existing OpenAI API-key sign-in remains independent. Old custom OAuth
registrations remain preserved; reconnect through the new sign-in option.
ChatGPT sign-in is local-desktop functionality; the private worker offers provider
API-key and GenAI.mil connections.

The SDK source and built tarballs are vendored, pinned by lockfile integrity, with
upstream notices included. Its noncommercial license applies. This integration
is for the user's confirmed personal, noncommercial experimentation. Changes to
SDK source require rebuilding and repacking the vendored packages before updating
their lockfile integrity.

## GenAI.mil

Enter your issued HTTPS API endpoint and key in its connection option. Existing
catalog discovery, encrypted credentials, lock/unlock guidance, retired-model
handling and retry limits are retained. A saved key is not a successful live
connection, and catalog access does not prove inference access.

Desktop and private-worker connections use a local gateway restricted to chat
completions for the selected discovered model. Real credentials are attached only
by the host transport. Image capability is forwarded when advertised by the
catalog in input_modalities or capabilities.input.image. Otherwise the connection
is conservatively text-only; no vision support is inferred from the model name.

## Validation and scope

Run npm run build and npm run test:models with a supported Node version. The
connection tests cover keyboard navigation, visible choices, saved settings,
failed saves, official ChatGPT button wiring, GenAI.mil routing and desktop/narrow
layouts. Runtime tests exercise the real coding executable against deterministic
local protocol fixtures, including both model gateways, MCP tool execution,
conversation history, token usage and cancellation. The vendored SDK's tests
cover authorization, token rotation, encrypted storage and streaming errors.

Live ChatGPT authorization/plan eligibility and live GenAI.mil access still need
user-owned credentials. Builds retain host filesystem, shell and network access;
there is no OS sandbox. Public multitenancy, managed production backend
provisioning and one-click production publication remain outside this change.
