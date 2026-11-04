---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Ask Sage is an evidenced Army productivity workspace with visual agents and a separately configured offline option."
---

# Ask Sage

## Bottom line

[V, government customer] The Army publicly launched an Ask Sage-powered enterprise workspace in May 2025. https://www.army.mil/article/285537/army_launches_army_enterprise_llm_workspace_the_revolutionary_ai_platform_that_wrote_this_article
[V, vendor documentation] Ask Sage now documents visual agent workflows as well as chat and datasets. https://docs.asksage.ai/agent-builder/
[R] Treat it as a serious existing route for document and administrative work. [R] Test whether the officer needs a new application or only a prepared workflow in an already authorized service.

## What it does and daily use

[V, vendor documentation] The agent builder connects nodes for model calls, branching, loops, file operations and retrieval. Users can start from a template or natural-language workflow generation, inspect execution activity and export a workflow as JSON. https://docs.asksage.ai/agent-builder/

[A] A routine user could choose a prepared task, attach approved documents, review cited output and export a draft. A builder configures the workflow and data access. Model choice, token balances and workflow design can add burden unless the organization supplies defaults.

## Actual users and Navy or DoW evidence

[V, Army public affairs, May 15, 2025] The Army says the workspace runs as IL5 SaaS in cArmy Cloud and permits eligible users to register with CAC. The announcement describes a 30-day trial, limited centrally purchased tokens and organizational procurement for continued use. It reports use on personnel-description updates. The article explicitly says the platform generated the article; treat its productivity figures as a government announcement, not an independent audit. https://www.army.mil/article/285537/army_launches_army_enterprise_llm_workspace_the_revolutionary_ai_platform_that_wrote_this_article

[E] A specific Navy production organization was not verified. An Army service and a vendor's broad defense customer claim do not establish Navy access for this team.

## Getting running, cost and dependencies

[V, vendor documentation, accessed November 4, 2026] Ask Sage lists separate commercial, government and DoD instances with different compliance scopes, plus dedicated and Edge instances. Its FAQ and instance page do not use identical descriptions of every endpoint. Confirm the selected instance with the organization's administrator. https://docs.asksage.ai/instances/ ; https://docs.asksage.ai/faq/

[V, vendor pricing] Sales documentation lists a $90 monthly Power User tier with two million Ask Sage tokens as of September 2026, and quoted enterprise arrangements. This is a public price signal, not a Navy quote or proof that all models have equal effective cost. https://docs.asksage.ai/asksage-sales/

[A] Basic use can begin in a session after access and entitlement exist. Building a reliable workflow needs approved reference data, permissions, acceptance examples and user review. New dedicated deployment has no verified public lead time in this review.

[V, vendor offline guide] Edge can operate offline only when application services, models and dependencies are local. The guide specifically calls out local authentication, DNS, certificates, time, embeddings, databases and update media. Cloud models and remote integrations stop working when their services are unreachable. https://docs.asksage.ai/edge/offline-operation/

[R] Do not transfer an Edge claim to the hosted chat service, and do not treat the provider's accreditation as permission to use restricted data at this event.

## Public criticism and limitations

[E] A product-specific independent Navy usability audit or attributable Navy user complaint was not verified in the searches reviewed.

[V, vendor admission] Ask Sage's field guide explains that plausible model output can be false and distinguishes model memory from retrieval-backed answers. https://docs.asksage.ai/docs/v2/user-guides/asksage-101/

[V, vendor component limitation] The SharePoint widget guide describes a read-only assistant with a limited conversational history and tells users to check original references when an answer is wrong. These limits apply to that widget, not the entire product. https://docs.asksage.ai/integrations/sharepoint-widget/user-guide/

[R] Do not interpret a privacy assessment or hosting authorization as an accuracy certification. Measure correctness on the actual task.

## Copy or avoid

- [R] Copy prepared templates, citations and a common model interface behind organization-approved defaults.
- [R] Copy the offline dependency checklist and explicit test with connectivity removed.
- [R] Avoid making an officer understand token purchasing, model routing or a large visual graph to finish a routine task.
- [R] Consider exporting a task specification and evaluation set that an existing Ask Sage owner could implement.

## Sources

- [V, government customer announcement] https://www.army.mil/article/285537/army_launches_army_enterprise_llm_workspace_the_revolutionary_ai_platform_that_wrote_this_article
- [V, vendor agent documentation] https://docs.asksage.ai/agent-builder/
- [V, vendor instance documentation] https://docs.asksage.ai/instances/
- [V, vendor FAQ] https://docs.asksage.ai/faq/
- [V, vendor pricing, September 2026 signal] https://docs.asksage.ai/asksage-sales/
- [V, vendor offline documentation] https://docs.asksage.ai/edge/offline-operation/
- [V, vendor accuracy explanation] https://docs.asksage.ai/docs/v2/user-guides/asksage-101/
- [V, vendor widget limits] https://docs.asksage.ai/integrations/sharepoint-widget/user-guide/
