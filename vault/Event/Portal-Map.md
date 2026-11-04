---
type: reference
status: active
owner: mukul
updated: 2026-11-04
summary: "Every portal page and data source we found, and what needs a login."
---

# Portal map

Base: https://cdao.hackathon.maximus.com

## Pages

| Path | What it holds | Needs sign-in |
| --- | --- | --- |
| `/event/norfolk` | Home with FAQ, Rules, Judging and Resources tabs | No |
| `/event/norfolk/schedule` | Schedule | No |
| `/event/norfolk/judging-criteria` | Judging | No |
| `/event/norfolk/sponsors` | Sponsors | No |
| `/event/norfolk/register` | Registration | Sign-in to register |
| `/event/norfolk/my-team` | My Dashboard and team | Yes |
| `/event/norfolk/teams` | Teams | Yes |
| `/event/norfolk/roster` | Participants | Yes |
| `/event/norfolk/use-cases` | Use cases | Yes |
| `/event/norfolk/datasets` | Datasets, none published at capture | Yes |
| `/notifications` | Event messages. Reading the page did not change the unread count | Yes |

## Documents

Event documents live at `/api/events/norfolk/documents/<id>/file/` and need sign-in. See [[Resources/Documents]].

## Things to be careful with

- The signed-in home page has a Cancel Registration button.
- New documents appear as a dialog with a Got it button, which may record an acknowledgment.
- Opening document 12 downloads a spreadsheet instead of showing it. See [[Reference/Open-Questions]].
