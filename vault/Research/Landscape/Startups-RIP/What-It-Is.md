---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "A public research library connects startup histories to proposed rebuilds and developer handoffs, with important inspection limits."
---

# What startups.rip does

## Bottom line

[V] Startups.rip presents startup research and practical build plans as a way to find a new business idea: https://startups.rip/. [E] Public company pages opened on 2026-11-04 contain substantive reports, citations, navigation and, on some pages, appended rebuild proposals. [R] The reusable product pattern is a readable decision page that connects evidence to a next experiment. [E] A working software factory, paid technical specifications, research chat and executable prototypes were not verified in this inspection.

## Who it is for and what it sells

[V] The indexed Clara Labs page explicitly addresses founders, operators and investors in a short briefing: https://startups.rip/company/clara-labs. [V] The pricing and CLI pages also address builders handing research to coding tools: https://startups.rip/pricing and https://startups.rip/cli. [R] Read its product as two connected jobs: deciding whether an opportunity deserves work, then handing a bounded build proposal to someone who can implement it.

[V] The homepage advertises a catalog exceeding 2,178 startups; that is a site claim, not a counted inventory: https://startups.rip/. [E] Opened pages include acquired and active company labels as well as the site's dead-startup positioning. [R] Do not assume the catalog is a list of failed ideas.

## A user journey, with verification boundaries

1. [E] Open the homepage. The retrieved view offers email sign-in and says catalog search requires sign-in. No account was created: https://startups.rip/.
2. [E] Open Browse or follow a direct company URL. Browse describes exploration by category or YC batch; the retrieved page did not expose a full working filter interaction: https://startups.rip/browse.
3. [E] Open a company page, scan its status and description, then use its contents list to choose a report section. The Clara Labs page exposed these elements without sign-in: https://startups.rip/company/clara-labs.
4. [E] Read the short briefing and historical analysis, follow citations, and compare the proposed new product with the original. Public report content was readable; citation destinations did not all load.
5. [E] A report can display report, build-plan and specification availability indicators. Explo also exposes a Build it link. This is visible navigation, not proof of completed implementation: https://startups.rip/company/explo.
6. [V] A subscriber can, according to pricing, ask research questions and obtain technical specifications; according to CLI documentation, research can be imported into a coding agent. These authenticated flows were not exercised: https://startups.rip/pricing and https://startups.rip/cli.
7. [R] The reader still has to validate the business, review the specification, build or adapt software, and test it. The inspected public evidence does not establish that the service performs all those steps for the reader.

## What each output looks like

| Output | Public evidence and appearance | What was not verified |
| --- | --- | --- |
| Report | [E] A long company page with identity, historical narrative, market context, outcome analysis, lessons and source links. It has a contents list rather than presenting only a chat response. Example: https://startups.rip/company/clara-labs. | [E] No independent accuracy audit or completeness assessment was performed. |
| Rebuild plan | [E] Public Delve text changes from historical analysis to a proposed new evidence-review product. Headings cover concept, why now, market, minimum product and route to customers. It describes scope, review steps, exclusions and pilot hypotheses: https://startups.rip/company/delve. | [E] A proposal's demand, partnerships and commercial results are not established by its presence on the page. |
| Executive briefing | [E] Explo exposes an executive-briefing label and four numbered actionable insights ahead of the long report: https://startups.rip/company/explo. | [E] No separate downloadable executive document was verified. Some other opened pages instead say at a glance. |
| Technical specification | [V] Pricing describes implementation-ready specifications as a Pro feature: https://startups.rip/pricing. [E] Company pages show a Pro specification indicator. | [E] Not verified: actual schema, architecture, dependencies, tests, export format or completeness behind the paid boundary. Do not fill in a conventional specification template and call it observed. |
| Prototype | [E] Explo links to https://startups.rip/company/explo/mvp, but retrieval returned a cache miss. [V] Delve's plan describes a fictional-record sandbox, fixture integrity checks and a simulated purchase: https://startups.rip/company/delve. | [E] Not verified: an interactive prototype working in a browser, downloadable code, real integrations or executed tests. A cache miss is an inspection limit, not evidence of a broken product. |
| Research chat | [V] Pricing says Pro users can ask about reports and build plans: https://startups.rip/pricing. | [E] Not verified: chat layout, citation quality, retained context, research refresh behavior, answer accuracy or export. |
| CLI | [V] The indexed CLI page describes token-authenticated terminal import of reports, plans and specs, Markdown output or structured JSON, and queued analysis requests: https://startups.rip/cli. | [E] The direct page would not open, and no package, login, token, import or analysis request was run. Reliability is not verified. |

## How the pieces connect

[R] The apparent artifact chain is company identity, evidence-backed history, short decision summary, proposed opportunity, build instructions, demonstrator and developer handoff. [E] Historical report and future build proposal can appear within the same retrieved company page. [R] The critical boundary is where sourced past-tense statements become a future product hypothesis. A new product name is not the old company's product or proof that anyone built it.

[R] Research chat is a way to interrogate the packet. The CLI is a delivery channel into a developer's workflow. Neither should be mistaken for the resulting application or for a test certificate.

## Methods and accuracy, claims versus observations

| What the service says | What this inspection establishes |
| --- | --- |
| [V] Reports are AI-researched and readers should check sources: https://startups.rip/company/clara-labs. | [E] This disclaimer and a correction contact were visible. This does not establish human review, the model used, retrieval coverage or a measured error rate. |
| [V] Public reports use public sources: https://startups.rip/privacy. | [E] Reports include citations and source sections; only a small sample of linked primary sources was checked. |
| [V] Research and chat may send request text to configured AI or search providers: https://startups.rip/privacy. | [R] Treat this as an external research service. Do not submit Fleet material merely because a source is publicly accessible. |

[E] No public methods document specifying the research pipeline, editorial approval, source hierarchy, update cadence or evaluation benchmark was verified. [R] Citation presence supports inspection, not truth. A linked source must actually support the nearby statement, especially a claim about why a company stopped.

## Access descriptions disagree

[E] On 2026-11-04 the opened pricing view said completed reports and build plans/prototypes were free, with specifications, research chat and CLI in Pro. A search-index version of the same URL instead described 40 free reports and Pro-only rebuild assets plus five fresh requests monthly: https://startups.rip/pricing. [E] The opened view displayed an annual equivalent of $15 monthly, billed $180 annually. [A] The reason for the contradictory views is not verified. [R] Check current entitlements interactively before relying on either description; no purchase is needed for our pattern research.

## Sources

- [V] https://startups.rip/ (opened and searched 2026-11-04)
- [V] https://startups.rip/browse
- [V] https://startups.rip/pricing (opened view and conflicting search-index view)
- [V] https://startups.rip/cli (search-index text; direct open failed)
- [V] https://startups.rip/privacy
- [V] https://startups.rip/company/explo
- [V] https://startups.rip/company/explo/mvp (linked destination; retrieval failed)
- [V] https://startups.rip/company/delve
- [V] https://startups.rip/company/clara-labs
