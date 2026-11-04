---
name: fleet-cyber
description: Build defensive investigation and remediation-proposal workflows from authorized isolated-lab evidence, preserving analyst approval, audit, verification and rollback.
---

# Defensive evidence to reviewed action

Begin with offline synthetic alerts, configuration exports and an approved playbook or control baseline. Preserve asset ID, source timestamp, control revision, finding evidence, uncertainty and investigative gaps. Distinguish a scanner finding from a proven exploit or a complete policy evaluation.

Produce a reviewable handoff or change proposal: exact affected assets, before/after configuration, rationale, prerequisites, rollback and post-change checks. Bind approval to that proposal's digest and invalidate it after any edit. The tool proposing a fix must not grant itself permission to execute it.

The included AppYard tools retrieve supplied evidence only. A live scanner, patcher or CAC/PKI connection is a separate, explicitly scoped lab adapter. Do not interpret a challenge statement as permission to scan networks or administer accounts.

Use a seeded benign lab misconfiguration and a negative control to test detection. Test rejection of stale approval, failed rollback and partial remediation. Compare incident-handoff completeness and time against the same manual scenario. Avoid claiming STIG compliance or secure CAC authentication from a synthetic demo.
