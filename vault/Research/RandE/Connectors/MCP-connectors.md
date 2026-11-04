---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "MCP standardizes tool connections but does not supply Navy authorization or safe data access."
---

# MCP connectors

## Bottom line

[V] MCP standardizes connections between applications, tools and data sources. https://modelcontextprotocol.io/specification/2026-07-28 [R] It is an integration mechanism, not an accredited connector catalog or a substitute for Graph/Google consent. [R] A local synthetic read-only server is the only event experiment worth considering after the task app is accepted. [R] Defer arbitrary remote servers and real enterprise data.

## How it works

[V] The published specification currently resolves to revision `2026-07-28`. Its authorization profile covers HTTP transports; local stdio transports use a different credential arrangement. Protected HTTP servers act as OAuth resource servers, with discovery and audience-bound authorization. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization

[V] MCP security guidance forbids token passthrough and discusses authorization discovery risks, server-side request forgery and local-server compromise. https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices [R] A Graph-backed MCP server needs its own correctly issued client-facing access token and separately authorized Graph access. Do not hand it a copied Graph, Google or ChatGPT token as a shortcut.

[R] Pin the client/server versions and approved server identity. Expose a tiny allowlist of read functions with host-enforced resource and output limits. No shell tools, write tools, server installation from a prompt or arbitrary endpoint entry in the officer workflow. A read-only tool annotation is not a host authorization decision. Treat tool descriptions and returned content as untrusted data.

[E] The inspected FleetHarness account flow at `50fcaea` implements Codex RPC sign-in. The scoped code search did not establish a product MCP connection UI or an approved MCP data adapter. [R] Do not infer product support from a model backend's possible MCP support.

## What the user sees

[R] Show an approved source with provider, permitted operations, data destination and connection status. The user chooses a bounded source and previews the actual data before accepting it. Hide server configuration from the normal task. Offer disconnect and removal of locally cached content as distinct actions. No background autonomous tool loop in the first pilot.

## Navy approvals and event rule 4

[R] Review both the MCP server's hosting/operations and the downstream connector grants within the full system boundary. Confirm allowed tools, resource authorization, token custody, logs, update process and shutdown with system and tenant owners. See [[Research/RandE/Connectors/README]]. A locally installed process can still access host files or a network unless the host enforces restrictions.

[R] MCP can widen exposure through remote operators, tool output, prompts and local process authority. A read-only source can still leak content. The event fixture must contain only invented records, hold no credentials and expose no real file directories or mailboxes.

## Thursday and post-event

[R] Thursday: if time remains, a local fixture server may provide only `list_examples` and `read_example` from bundled invented records. Label "Synthetic local MCP example" and show a disallowed request being refused and the server stopping. A static mock is a design demonstration, not protocol integration. Neither was built here.

[R] Post-event: authorize one server and downstream service, verify resource isolation, OAuth cancellation/revocation, malicious output handling, timeouts and process shutdown. Avoid a public server marketplace in the first release.

## Build size and evidence

[A] Estimate: 1 to 2 engineer-days for a small local fixture integration after selecting a compatible SDK; 5 to 10 days for one protected remote connector with discovery, secure tokens and meaningful failure checks. Downstream API work and Navy approvals are additional. No MCP SDK, server or authenticated connection was used.

## Sources

- [V] https://modelcontextprotocol.io/specification/2026-07-28
- [V] https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- [V] https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
- [E] FleetHarness `50fcaea`: account/RPC source and scoped Git search.
