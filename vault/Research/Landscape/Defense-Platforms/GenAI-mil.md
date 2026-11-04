---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "GenAI.mil is already the designated Navy enterprise AI service and includes tools for non-programmers to build agents."
---

# GenAI.mil

## Bottom line

[V, Navy direction] DON CIO identifies GenAI.mil as the designated Naval Enterprise IT Service for CUI and IL5 generative AI, following a January 28, 2026 joint memorandum. https://www.doncio.navy.mil/ContentView.aspx?ID=20456
[V, vendor] Its Gemini offering includes a natural-language agent designer. https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/
[R] This is the first incumbent to check for the intended officer's ordinary document and administrative work. [R] FleetHarness needs evidence beyond a simpler chat screen to justify a separate product.

## What it does

[V, Navy service description, February 24, 2026] The service supports conversational use, file upload, retrieval over supplied documents, web grounding, research and persistent conversation history. That description permits CUI within its scope but excludes PII and PHI. It is a statement of Navy service designation and features, not permission for this hackathon to use those data categories. https://www.doncio.navy.mil/ContentView.aspx?ID=20456

[V, government announcement, September 1, 2026] DoW says ChatGPT Mil and Grok were added alongside Gemini on August 31. GenAI.mil is therefore an access platform for multiple offerings, not a single model. https://www.war.gov/News/News-Stories/Article/Article/4588244/chatgpt-grok-added-to-war-departments-ai-system-options/

[V, vendor, March 10, 2026] Google describes Agent Designer as a no-code or low-code way to create multi-step assistants using natural language, with examples such as drafting read-aheads and planning checklists. This verifies advertised scope, not independently measured reliability or a complete software build-and-test pipeline. https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/

## Actual users and daily work

[V, service user guidance] Coast Guard guidance describes authorized members using GenAI.mil for research and documents and identifies Agent Designer for non-coders. This is evidence beyond a vendor's marketing page, although not a controlled productivity evaluation. https://www.mycg.uscg.mil/News/Article/4551974/ai-tools-update-whats-available-for-coast-guard-members-now-and-new-training/

[A] A typical officer session is: sign in through the permitted government environment, select an available tool, attach an allowed reference, request a draft or analysis, check the references and edit the output. A prepared agent can reduce repeated prompting. Actual use by the team's target officer remains unobserved.

## Getting running and dependencies

[A] With a working identity and access, an existing service could produce a first draft in one session. A reliable local workflow still needs correct data permissions, available features, representative examples and review. No verified Navy onboarding median or guaranteed access time was found.

[V, vendor access guidance] Google's defense page identifies CAC-based access and an IL5 enterprise offering. https://cloud.google.com/gov/federal-defense-and-intel

[A] Hosted use needs connectivity to the service and its enabled tools. No publicly verified fully disconnected GenAI.mil mode was located. Downloading an output for offline reading is not offline generation, agent execution or synchronization.

[V, government budget signal] The FY2026 mandatory funding allocation plan lists $123 million for the GenAI.mil platform. This is an allocation signal, not per-user pricing or proof of the amount spent. https://comptroller.war.gov/Portals/45/Documents/news/FY2026_Mandatory_Funding_Allocation_Plan.pdf

[E] The team's access, API availability, connector permissions, feature parity among model offerings and current unit-level charging arrangements were not verified. Do not assume consumer product capabilities are available in the government instance.

## Public criticism and limits

[V, government rollout account] The December 2025 launch initially confused some Pentagon employees who thought the pop-up invitation might be a security test. This is a reported onboarding problem, not evidence of model inaccuracy. https://www.war.gov/serve-from-netstorage/News/News-Stories/Article/Article/4355797/hegseth-introduces-department-to-new-ai-tool/index.html

[V, independent audit, department-wide] GAO's October 2026 review found responsible-AI coordination and workforce gaps. It did not publish a GenAI.mil-specific accuracy or usability verdict in its summary. https://www.gao.gov/products/gao-27-107837

[E] A primary, product-specific Navy user study measuring hallucinations, task completion and disconnected operation was not verified. Adoption announcements are not those measurements.

## Copy or avoid

- [R] Copy enterprise sign-in and centrally supplied tools when available; reduce new accounts and subscriptions.
- [R] Use a task template that asks for the required output and shows source references.
- [R] Avoid assuming that prompt-to-agent generation is a new capability FleetHarness uniquely provides.
- [R] Differentiate through demonstrated acceptance tests, solver correctness, exportable applications or a measured offline workflow.

## Sources

- [V, Navy designation, indexed text; direct retrieval rejected] https://www.doncio.navy.mil/ContentView.aspx?ID=20456
- [V, signed memo, indexed text] https://www.doncio.navy.mil/FileHandler.ashx?id=24946
- [V, government September 2026 platform update, indexed text] https://www.war.gov/News/News-Stories/Article/Article/4588244/chatgpt-grok-added-to-war-departments-ai-system-options/
- [V, vendor agent launch] https://cloud.google.com/blog/topics/public-sector/gemini-for-government-build-custom-ai-agents-for-unclassified-work-on-genaimil/
- [V, vendor access description] https://cloud.google.com/gov/federal-defense-and-intel
- [V, service user guidance] https://www.mycg.uscg.mil/News/Article/4551974/ai-tools-update-whats-available-for-coast-guard-members-now-and-new-training/
- [V, government budget allocation] https://comptroller.war.gov/Portals/45/Documents/news/FY2026_Mandatory_Funding_Allocation_Plan.pdf
- [V, government rollout account] https://www.war.gov/serve-from-netstorage/News/News-Stories/Article/Article/4355797/hegseth-introduces-department-to-new-ai-tool/index.html
- [V, independent audit] https://www.gao.gov/products/gao-27-107837
