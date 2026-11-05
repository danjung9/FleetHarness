# Data & storage interface

Mode: **Operate**. This extends AppYard's file inspection and settings workflow. It inherits the current charcoal, ivory, and peach tokens in `src/styles.css`, the compact rail, DM Serif Display headings, DM Sans controls, and IBM Plex Mono source previews. The older navy design-system description is not a reason to recolor this surface.

The global Storage destination remains usable with no active projects. Its first view presents managed file size, a searchable list of current and previous builds, and clear Projects and Trash tabs. Every build or folder row exposes a labeled **Delete** button beside Open folder. The size summary supports cleanup rather than dominating the page. Current and in-use labels distinguish the files the app is using. Project names and update dates provide context for run identities.

The list loads before recursive size calculations finish. Unmeasured sizes and file counts say they are being calculated, while later visits immediately reuse the last inventory. Storage refreshes in the background while visible and when the window regains focus. Refreshes keep filters, pagination, and the selected preview in place; file changes update that preview without blanking its existing contents. The Refresh action also requests a new measurement.

Opening a build replaces the list with a full-width file workspace. **Delete build** or **Delete folder** appears beside Export in the workspace heading. Search and type filters sit above a file list and preview. Pagination limits rendered lists to 200 entries while searching the complete inventory. The preview has reveal, export, and **Move file to Trash** actions. The back action restores the library context and keyboard focus.

Deletion is staged: the Builds caption explains that Delete moves files to Trash; an explicit confirmation explains recovery and any verification impact; a persistent success notice offers Undo. Trash exposes **Restore** and **Delete permanently**, with a separate confirmation for permanent deletion. Delete controls reuse the existing secondary button shape and semantic danger colors. In-use and protected items retain visible disabled controls with an explanation. Archive is reversible organization, with copy that makes clear that files remain on disk. Learned data has its own link to existing settings.

The scope is the Electron desktop window: 1512×982 and the supported 1120×720 minimum. Lists, paths, code, and feedback must fit these sizes; panels manage their own overflow. Native dialogs, named icon controls, arrow-key tabs, visible focus, and text beside status color preserve keyboard and screen-reader access. Browser preview explains that filesystem actions require the desktop app.

The first completed implementation is code-led. No image assets or replacement brand system are introduced. Visual evidence lives in `output/playwright/data-storage/` and behavior is exercised by `scripts/smoke-data-storage.mjs`.
