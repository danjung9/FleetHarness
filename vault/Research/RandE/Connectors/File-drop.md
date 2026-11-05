---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A bounded local file chooser is useful now; generic document ingestion is a larger feature."
---

# Plain file selection and drop

## Bottom line

[R] Rank a bounded local file chooser immediately after fixed-schema CSV. [R] Support text, structured JSON and the approved CSV format before adding PDF, Word, archives or OCR. [E] Studio and Workbench had saved request JSON import code at `50fcaea`, but both interfaces were removed in `631849f`. [R] Plan a small new importer in the retained app or delivered task app; do not restore the removed interfaces.

## How it works

[V] The browser File API exposes user-selected local files and supports reading their contents. https://www.w3.org/TR/FileAPI/ [R] Use the same bounded parser for a file chooser and drag/drop, and retain a chooser for accessibility. Set size/count/encoding limits before parsing. Accept explicit formats and schema versions; a filename extension or an `accept` attribute alone does not validate content.

[E, read `src/studio/Studio.tsx` and `src/workbench/Workbench.tsx` at `50fcaea`] The former interfaces accepted saved brief JSON with size and field validation. [E, final relay and Git inspection at `631849f`] Both renderers were deleted. A targeted search of retained `src/App.tsx` found no file-input or file-text-read matches. This is source inspection, not a UI trial or an exhaustive proof of absence. [R] Use the bounded-validation pattern as a design reference, while keeping task-data import separate from build-brief import.

[R] Display text inertly, reject executable HTML as input, ignore embedded instructions and do not fetch linked files or remote images. Defer archives, recursive folders, symbolic links and mixed-format batches. A general document parser needs malware/content handling and extraction acceptance beyond the small file chooser.

## What the user sees

[R] "Choose a synthetic file" and an optional drop area, followed by name, size, type, preview and "Use this content". Explain whether content stays in the task app or will enter an external model request. Let the person remove it before any upload. Cancel, invalid input and unsupported formats should preserve the current draft.

## Navy approvals and event rule 4

[R] Local selection avoids a cloud-data grant but does not authorize the file's contents, the host app or model processing. Follow the common gates in [[Research/RandE/Connectors/README]]. Production file transfer, endpoint approval, retention and software authorization still need an owner decision.

[R] Names, metadata, embedded objects and text can carry personal, nonpublic or sensitive information. Only files invented from scratch belong in this event workflow. Do not treat "unclassified" or a successful file check as permission. Do not auto-send a file to the coding model when local parsing would suffice.

## Thursday and post-event

[R] Thursday: if the proposed importer is built, use one synthetic text request, one schema-valid synthetic JSON and one malformed or oversized file. Show preview, cancellation, accepted import and deletion/reopen behavior. Do not advertise the removed brief-import controls as current functionality. No real email export, `.pst`, `.ost`, mailbox archive or message file.

[R] Post-event: add only user-needed formats, use maintained parsers, prove limits and provenance, then obtain data-handling approval. PDF/Word/OCR output must be checked against the visible document, including tables and extraction omissions. Keep background folder watching out of the first release.

## Build size and evidence

[A] Estimate: 4 to 8 engineer-hours for one new bounded text/JSON chooser with preview on existing editable state; 1 to 3 engineer-days per richer document format with meaningful extraction checks. Removed UI controls are not counted as existing implementation. No project code or parser was run here.

## Sources

- [V] https://www.w3.org/TR/FileAPI/
- [E] Historical FleetHarness `50fcaea`: `src/studio/Studio.tsx`, `src/workbench/Workbench.tsx`, inspected source.
- [E] Current FleetHarness `631849f638614735a89a555d487d6b3c777c52e3`: targeted search of `src/App.tsx` and final relay analysis documenting deleted renderers.

