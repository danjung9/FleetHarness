# Chat and preview workspace

Mode: Operate. Targets: src/App.tsx, src/NewChat.tsx, src/ProjectConversation.tsx, src/Home.tsx, src/ModelSelector.tsx, src/builder.css.

The user requested removal of the entire briefing page and a Base44/Replit style chat-left, preview-right workspace. The implementation retains the current dark olive, peach, DM Sans and DM Serif visual system. This is a workflow simplification, without a replacement visual world.

Removed from the application shell: RequirementsForm, Intake, JourneyHeader, BuildFlow, system design navigation, experiment launch dashboard, terminal-goal launcher, conversation toggle and overlay, start confirmation modal, header usage indicator, and redundant model hints. Backend execution and stored project descriptions remain available to chat. Review and export retain their existing gates.

New app opens an unpersisted chat with a right-side preview placeholder. Sending creates a saved project; configured desktop/worker clients start the build. Project output tabs change independently of the mounted chat so drafts survive. Failed startup remains inline. Existing project failures and stale previews stay visible. Mobile stacks chat above preview.

Validation: frontend TypeScript and production frontend build pass. scripts/smoke-builder.mjs exercises creation, failed startup, tabs/draft preservation, chat send, preview iframe, stop/resume, reopening and Escape behavior through a local bridge fixture. Screenshot checks at 1440x960, 1120x720 and 390x844 confirm no outer horizontal overflow. Evidence is in output/playwright/builder. These are UI checks, not live model execution checks.

The full Electron build is blocked by the existing missing @siwc/local package/types and resulting implicit-any errors. The detector returned advisory mismatches with the older root DESIGN.md type/radius scale; shared palette and existing control styles are preserved, with no root design-system migration.
