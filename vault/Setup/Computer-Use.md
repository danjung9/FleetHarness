---
type: runbook
status: draft
owner: mukul
updated: 2026-11-04
summary: "Why desktop computer use is not on the event key, and the browser test harness to use instead."
---

# Computer use for testing

## What we found

- [E, CLI, 2026-11-04] The computer use plugin cannot be installed in the event profile. Codex answers that the `openai-bundled` marketplace is reserved. A test run in that profile reports no computer use tools.
- [E, config] The normal `~/.codex` profile has the plugin, through the ChatGPT app. That profile uses a personal login, not the event key, and whether Astra works there was not tested.
- Desktop computer use sends screenshots of whatever is on screen to the provider, and needs macOS Screen Recording and Accessibility permissions.

## What to use instead

[R] To test our web apps, have Codex drive a separate browser with Playwright on the event key, using `gpt-6-astra`, and read its screenshots. It sees only the app under test, needs no macOS permissions and leaves a repeatable test behind. Build this when FleetHarness has an app to test.

Not built or tested yet.
