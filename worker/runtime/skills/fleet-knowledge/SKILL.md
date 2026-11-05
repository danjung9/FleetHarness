---
name: fleet-knowledge
description: Build cited retrieval over authorized local knowledge exports, with source freshness, applicability review and abstention for unsupported answers.
---

# Cited knowledge workflows

Use authorized exports or explicit connectors; record document identity, revision, source locator and timestamp. Apply access filters before retrieval and test a denied document that would otherwise rank first. A synthetic `approved` flag is only a test fixture for this boundary.

`fleet_search_evidence` returns lexical matches and exact excerpts, not semantic answers. No result means unknown, not permission to complete a plausible answer from memory. Stale or contradictory sources should lead to visible uncertainty. Cite factual statements separately from interpretations of applicability.

Start with an embedded full-text index where it meets the latency and relevance needs. Introduce embeddings or reranking only after comparing against the baseline on owner-labeled queries. Record corpus size, hardware, p50/p95 latency, retrieval relevance and source-coverage metrics.

JLLIS, SharePoint, vessel registries and approved procedure sets are separate integrations. Do not fabricate endpoint credentials, records, vessel identity or procedural instructions. For watchstander demonstrations, use supplied trainer material and keep decisions with the human. A successful five-second retrieval on fixtures does not validate a casualty-response recommendation.
