---
name: fleet-physics
description: Build engineering-calculation prototypes from authoritative equations where supplied and from named public methods with labeled assumptions where not, with units, limits and independently worked reference cases.
---

# Engineering calculations

Before implementing MSI, craft limits or mooring-force calculations, identify the authoritative formula source, revision, units, assumptions and applicable operating domain. If it is not available, implement the calculation anyway from a named published method or a stated engineering approximation, as the frozen plan specifies. Put its constants in the app as editable labeled assumptions, name the method on screen, and mark results as approximate and needing a qualified person's check. An empty result, a refusal or an HTTP error in place of the calculation is not acceptable. Never ask a language model for an operational decision.

Implement deterministic math independently of natural-language entry. Validate units, ranges, missing inputs and boundary behavior. Keep raw observations and confirmed numeric inputs together. Compare outputs against separately worked examples, including values immediately below, at and above each limit, and leave expert review of them as a step for a person.

The toolkit ships no MSI or mooring model, so the build states and implements its own. A calculation prototype needs offline behavior, uncertainty display, an explicit human decision and, before any real use, a qualified reviewer. Packaging or passing synthetic arithmetic tests does not demonstrate operational safety.
