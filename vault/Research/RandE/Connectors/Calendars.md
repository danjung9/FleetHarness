---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Start with a synthetic schedule file; live calendar reads and publication are separate later features."
---

# Calendars

## Bottom line

[R] Import a tiny synthetic schedule file for Thursday's training draft. [R] Keep calendar reading, local draft export and calendar publication as separate capabilities. [V] Both Microsoft and Google offer permissions narrower than full calendar management. https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0 and https://developers.google.com/workspace/calendar/api/auth [R] Prefer availability-only information when the task does not need event text.

## How it works

| Path | Real behavior and permission |
| --- | --- |
| [V] Outlook calendar | `calendarView` returns single events, recurring occurrences and exceptions in a time range. Its least delegated permission is `Calendars.ReadBasic`; the method is documented for US Government L5. https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0 |
| [V] Google Calendar | `calendar.freebusy` covers the user's availability; `calendar.events.owned.readonly` reads owned-calendar events; broader event-read scopes cover other accessible calendars. These are different grants. https://developers.google.com/workspace/calendar/api/auth |
| [V] Local calendar file | iCalendar defines a portable event representation with time-zone and recurrence rules. https://www.rfc-editor.org/rfc/rfc5545 |

[R] For the first local importer, prefer the already proposed CSV schema with explicit date, start, end and timezone. If accepting `.ics`, document a small supported subset: single non-recurring events with explicit UTC or supported timezone. Reject unsupported recurrence, floating time, meeting invitations and ambiguous daylight-saving times rather than silently flattening them. A proper general calendar importer is larger than this subset.

## What the user sees

[R] The person chooses a synthetic file, sees a calendar/table preview with timezone and conflicts, then accepts a draft. The interface says "No invitations sent. No official calendar changed." A later online reader adds an approved calendar picker and short date range. Draft export downloads a local file; publishing or accepting an invitation requires a separate reviewed action and grant.

## Navy approvals and event rule 4

[R] Apply tenant consent, calendar-owner approval and the system/data-flow review in [[Research/RandE/Connectors/README]]. Confirm whether even free/busy information is eligible for the intended environment. Do not use an actual work calendar or mailbox during this event.

[R] Calendar metadata can disclose attendance, locations, staffing patterns, readiness activity or personal appointments. A redacted title does not make real event times safe. Use invented people IDs, rooms, events and dates. Treat descriptions, URLs and attachments as untrusted data and never follow calendar links automatically.

## Thursday and post-event

[R] Thursday: demonstrate four invented events, change one time, show a conflict, review the draft, save and reopen it. Use local data with no account and no invitations. Label any API-looking calendar feed as a fixture. These are proposed acceptance steps, not a tested result.

[R] Post-event: pilot availability-only or a bounded read for one approved calendar. Test timezones, recurrence exceptions, all-day events, cancelled events, deleted records and grant revocation. Two-way sync, conflict resolution and publication need a separate design, idempotency and human review.

## Build size and evidence

[A] Estimate: 4 to 8 engineer-hours to map a fixed schedule CSV into an existing draft form; 1 to 2 engineer-days for a deliberately limited `.ics` importer; 2 to 4 engineer-days per online provider after shared auth. General recurrence and sync are excluded. No calendar import or API was tested here.

## Sources

- [V] https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview?view=graph-rest-1.0
- [V] https://developers.google.com/workspace/calendar/api/auth
- [V] https://www.rfc-editor.org/rfc/rfc5545

