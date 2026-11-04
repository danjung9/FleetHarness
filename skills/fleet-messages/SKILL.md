---
name: fleet-messages
description: Build source-traceable message or form extraction and review workflows for Norfolk message traffic, OPTASK, and handwritten-document challenges.
---

# Message and form extraction

Start from preserved original input. Choose a parser for structured text; add OCR only when scans require it. Retain text offsets or image coordinates for each extracted field. Keep uncertain fields editable and visibly awaiting review.

The `fleet_extract_messages` tool and `.fleet/toolkit/messages.js` support only this synthetic grammar:

```text
EVENT/id/2026-11-04T09:00Z/2026-11-04T10:00Z/owner/description//
TASK/id/2026-11-04T16:00Z/owner/description//
```

Fields cannot contain slashes or newlines. Dates need explicit timezones. Source spans are UTF-16 indices for JavaScript `slice`, not byte offsets. Unsupported lines remain warnings; invalid, missing and duplicate fields require review. Include mixed CRLF/LF, empty input, invalid dates, duplicate IDs, offsets and cross-midnight events in tests.

Challenge 12 additionally needs a daily timeline and a reviewed mapping from mock USMTF data to event types. The synthetic parser is a reusable baseline, not a claim of USMTF compliance. Challenge 22 needs template matching, OCR confidence and field-level answer keys; a text parser does not satisfy it.

If adding an LLM extraction fallback, validate structured output and verify every claimed source span against the input. Measure precision/recall on held-out examples, including messages without events. Preserve unknown dates rather than borrowing the system clock. Keep raw content and reviewed output distinct.
