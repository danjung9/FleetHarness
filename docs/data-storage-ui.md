# Data & storage interface

Mode: **Operate**. This extends AppYard's file inspection and settings workflow. It inherits the current charcoal, ivory, and peach tokens in `src/styles.css`, the compact rail, DM Serif Display headings, DM Sans controls, and IBM Plex Mono source previews. The older navy design-system description is not a reason to recolor this surface.

The global Storage destination remains usable with no active projects. Its first view presents managed file size, a searchable list of current and previous builds, and clear Projects and Trash tabs. The size summary supports cleanup rather than dominating the page. Current and in-use labels distinguish the files the app is using. Project names and update dates provide context for run identities.

Opening a build replaces the list with a full-width file workspace. Search and type filters sit above a file list and preview. Pagination limits rendered lists to 200 entries while searching the complete inventory. The preview has reveal, export, and move-to-Trash actions. The back action restores the library context and keyboard focus.

Deletion is staged: an explicit confirmation explains recovery and any verification impact; a persistent success notice offers Undo; Trash has restore and separately confirmed permanent deletion. Archive is reversible organization, with copy that makes clear that files remain on disk. Learned data has its own link to existing settings.

The scope is the Electron desktop window: 1512×982 and the supported 1120×720 minimum. Lists, paths, code, and feedback must fit these sizes; panels manage their own overflow. Native dialogs, named icon controls, arrow-key tabs, visible focus, and text beside status color preserve keyboard and screen-reader access. Browser preview explains that filesystem actions require the desktop app.

The first completed implementation is code-led. No image assets or replacement brand system are introduced. Visual evidence lives in `output/playwright/data-storage/` and behavior is exercised by `scripts/smoke-data-storage.mjs`.
