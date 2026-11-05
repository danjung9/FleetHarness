# Data & storage

Open **Storage** in the app rail, or **Manage all builds & storage** from a project's Files view. This is a global workspace: it remains available when no project is selected or all projects are archived.

## Finding saved work

The Builds list includes current and previous build folders, candidate workspaces, and saved agent sessions. Search by project or build name, filter by project, and sort by last update or size. Open a folder to search its files or filter source, data, evidence, logs, dependencies, and other files. Text and common raster images have previews; binary and oversized files can be exported or revealed in Finder.

Storage totals include dependencies, Trash, and AppYard's other local app data. They describe managed local storage, not the Mac's entire disk. Exported copies outside AppYard's storage directory are managed separately in Finder. Application settings and credentials are not exposed as editable files.

**Export** saves a copy for inspection or backup. It does not grant delivery approval or replace the verified delivery workflow. Export destinations must be outside managed storage and existing files are never silently overwritten.

## Cleanup and recovery

Moving a file or build to **Trash** is recoverable. Undo restores the most recently moved item; the Trash tab keeps all recoverable items across restarts. Trash continues to use disk space until **Delete permanently** is confirmed. Restoration refuses to overwrite anything already at the original location.

If restoration fails, copied files may remain at the original location and the complete original stays in Trash. Move those copies aside before retrying. Failed exports can also leave an incomplete copy at the chosen destination; these files are preserved so cleanup cannot erase changes made in another editor.

Current-build file changes clear verification, approval, packaging state, and resume eligibility. Restoring files does not reinstate an earlier approval. Start a new build to produce fresh evidence before approving and delivering. In-use projects cannot be changed during build, delivery, approval, conversation, or another storage operation.

Saved experiment evidence is protected from file-level cleanup while learning history refers to it. **Manage learning** opens the existing comparison and learning settings, where the user can forget a project's learning separately. The selected candidate's delivery provenance may remain protected. Removing files does not silently erase learning history.

The Projects tab offers **Archive** and **Unarchive**. Archiving removes a project from Home, search, and the challenge picker while retaining its files and history here. It does not free disk space. Archived projects must be restored before starting or resuming a build.

## Verification

- `tests/data-storage.test.mjs`: filesystem inventory, containment, busy state, verification invalidation, recoverable deletion, persistence, and restore conflicts.
- `tests/data-storage-compatibility.test.mjs`: an older Electron host offers an actionable restart message rather than a missing-method crash.
- `npm run test:data-storage`: real Electron smoke using temporary synthetic projects, native-dialog stubs, file previews, export, deletion and restoration, archiving, restart persistence, and desktop/minimum-window captures.
- `npm run check`: repository-wide isolated build and test validation.
