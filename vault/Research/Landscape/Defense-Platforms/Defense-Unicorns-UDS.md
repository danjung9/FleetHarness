---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "UDS is a credible Navy-linked delivery foundation for disconnected systems, with substantial engineering and operational prerequisites."
---

# Defense Unicorns UDS

## Bottom line

[V, Navy technology-transition account] Navy SBIR describes Zarf as part of UDS used for disconnected submarine software delivery. https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf
[V, vendor documentation] UDS Core supplies a secure runtime and supporting deployment tooling rather than an officer's natural-language app builder. https://docs.defenseunicorns.com/core/
[R] Consider it a possible packaging and transition target for FleetHarness outputs. [R] Keep its engineering setup and authorization work out of the officer's normal task flow.

## What it does

[V, vendor documentation] UDS Core assembles identity, networking, runtime security, logs and metrics, with an air-gap-oriented delivery model. The docs describe no external runtime dependencies for Core after deployment. This statement does not cover arbitrary applications added to it. https://docs.defenseunicorns.com/core/

[V, Navy account, indexed PDF] Zarf packages application images and dependencies for transfer into disconnected environments. The Navy account connects the work to Project Blue and submarine sustainment and describes benefits for maintaining software baselines. It uses the older expansion Unicorn Delivery Service; current vendor material also uses Unified Defense Stack. https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf ; https://defenseunicorns.com/resources/from-six-months-to-two-days-accelerating-ato-for-navy-and-beyond/

## Actual users and daily work

[V, government transition evidence] The Navy account reports Phase III adoption following earlier Air Force and Naval Postgraduate School work. It is stronger evidence of Navy relevance than a generic statement that a platform can run on ships. It is not an independent operational test of every UDS component. https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf

[A] A platform engineer packages an application, reviews software composition and configuration, deploys an approved bundle, checks health and logs, and plans updates or rollback. An operational user should simply open the resulting mission application. These personas should not be collapsed into a single training burden.

## Getting running and dependencies

[V, vendor] Core's landing page advertises a local demo in about 15 minutes. Its local prerequisites specify at least four CPU cores, 10 GiB RAM and 40 GiB storage available to the container runtime. These are demo prerequisites, not production sizing or evidence of operation on a locked government laptop. https://docs.defenseunicorns.com/core/ ; https://docs.defenseunicorns.com/core/getting-started/local-demo/basic-requirements/

[V, vendor production guide, version 1.14] Production deployment needs supported Kubernetes infrastructure, storage, load balancing, DNS and TLS arrangements. The getting-started overview estimates two to four hours on prepared production infrastructure. This excludes acquiring that infrastructure, application integration and authorization. https://docs.defenseunicorns.com/core/v1-14/getting-started/production/prerequisites/ ; https://docs.defenseunicorns.com/core/getting-started/overview/

[A] Useful disconnected application delivery also requires all application dependencies, appropriate hardware, a local inference service if AI runs at runtime, an authorized media-transfer process, data import, identity and a maintainer. Installing Core does not solve application data integration or guarantee authorization.

[V, vendor case claim] A NAVSEA team reportedly reduced application-upgrade approval cycles from six months to under two days and delivered 13 updates over nine months. This is a claim about changes on an established program and process, not a new system obtaining its first ATO in two days. https://defenseunicorns.com/resources/from-six-months-to-two-days-accelerating-ato-for-navy-and-beyond/

[V, public repository] The UDS Core repository is public and its organization listing displays AGPL-3.0. That is a component license signal, not evidence that supported enterprise deployment, infrastructure or all packages are free. https://github.com/defenseunicorns/uds-core ; https://github.com/defenseunicorns

[E] A current support price and a reliable new-program installation-to-authorization duration were not verified. Public contract ceilings are not deployment prices.

## Public criticism and limitations

[V, direct engineering issue] Public issue 2346 identifies a gap in testing whether applications actually use mounted private certificate authorities. The page was open when retrieved. This is a maintainer-reported test-coverage concern, not evidence of an exploited vulnerability or a fleet-wide outage. https://github.com/defenseunicorns/uds-core/issues/2346

[E] An independent Navy user or auditor evaluation quantifying UDS usability, sustainment cost and offline reliability was not verified. The Navy transition PDF returned HTTP 403 directly; available indexed passages were used.

## Copy or avoid

- [R] Copy complete dependency packaging, explicit versions, reproducible delivery, logs and rollback.
- [R] Test offline behavior at the application level, including identity and data access.
- [R] Avoid making Kubernetes administration a prerequisite for the officer to solve a scheduling or document task.
- [R] Avoid describing packaged software or generated compliance evidence as an authorization decision.

## Sources

- [V, government transition account, indexed text] https://www.navysbir.com/success/docs/Defense_Unicorns-AF21A-TCSO1-308.pdf
- [V, vendor Core overview] https://docs.defenseunicorns.com/core/
- [V, vendor local demo requirements] https://docs.defenseunicorns.com/core/getting-started/local-demo/basic-requirements/
- [V, vendor production prerequisites, version 1.14] https://docs.defenseunicorns.com/core/v1-14/getting-started/production/prerequisites/
- [V, vendor installation-time estimates] https://docs.defenseunicorns.com/core/getting-started/overview/
- [V, vendor authorization case claim] https://defenseunicorns.com/resources/from-six-months-to-two-days-accelerating-ato-for-navy-and-beyond/
- [V, component source and displayed license] https://github.com/defenseunicorns/uds-core
- [V, provider repository listing] https://github.com/defenseunicorns
- [V, direct engineering limitation] https://github.com/defenseunicorns/uds-core/issues/2346
