---
name: fleet-physics
description: Scope and verify engineering-calculation prototypes only against supplied authoritative equations, units, limits and independently reviewed reference cases.
---

# Engineering calculations

Before implementing MSI, craft limits or mooring-force calculations, identify the authoritative formula source, revision, units, assumptions and applicable operating domain. If these are missing, build intake/validation and document the gap; do not substitute a plausible formula or ask a language model for an operational decision.

Implement deterministic math independently of natural-language entry. Validate units, ranges, missing inputs and boundary behavior. Keep raw observations and confirmed numeric inputs together. Compare outputs against separately worked and SME-reviewed examples, including values immediately below, at and above each limit.

The toolkit intentionally contains no invented MSI or mooring model. A calculation prototype needs a qualified reviewer, offline behavior, uncertainty display and an explicit human decision. Packaging or passing synthetic arithmetic tests does not demonstrate operational safety.
