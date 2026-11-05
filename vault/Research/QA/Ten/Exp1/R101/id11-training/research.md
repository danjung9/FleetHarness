# PB4T reuse research

Primary deferrals: none. This research preserves all seven scoped criteria and the complete synthetic workflow. It selects no production dependency and makes no implementation, test, approval or operational-validation claim.

## Evidence boundary

Research date: 2026-11-04. Reviewed requirements.md, scope.md, .fleet/packet.json, README, quality contract, the three assigned skills, and relevant supplied toolkit source and fixtures. Only local inspection and fleet_search_evidence were used. No browser, network retrieval, connector, solver execution or benchmark was performed. External links below are primary-source leads, not inspected pages.

The packet captures [Norfolk use case 11](https://cdao.hackathon.maximus.com/event/norfolk/use-cases/11) on 2026-11-04. The local capture supports attribution of the requested workflow; current website content, source revision and event interpretation are unverified. No evaluation criteria were supplied. Scope outcomes are analyst-proposed synthetic outcomes, not owner-approved fatigue rules or event scoring criteria.

Lexical searches over the supplied corpus used queries “OR-Tools”, “restMinutes”, “fatigue” and “recurrence”, cutoff 2026-11-04T23:59:59Z and maximum age one day. This is a same-day corpus cutoff, not proof of publisher freshness. Source timestamps below are filesystem modification times, not publication dates; timestamps were normalized to whole seconds for retrieval. Initial calls rejected fractional timestamp formats and returned no evidence; corrected calls returned matches with stale=false. Documents were included as approved for local research retrieval, not approved as operational policy. No excluded or future-dated material supports a claim. “OR-Tools” tokenization matched generic “or”/“tools” text, so direct packet inspection supplies the component evidence. Exact excerpts and revisions below allow audit without treating retrieval as fact validation.

## Candidate decisions

| Candidate/component | Decision | Fit and integration effort | Evidence and unresolved limitations |
| --- | --- | --- | --- |
| Recipe: explicit occurrences, hard constraints, deterministic feasibility | Adopt as the synthetic domain approach | Fits shared crew/resource deconfliction and reproducible negotiation. Substantial domain work remains for five participants, qualified assignment alternatives, recurrence/history, fatigue and review. | Packet recipe.approach and scope workflow; this is an approach decision, not an application architecture or implementation plan. A model explanation cannot override hard constraints. |
| Supplied solveSchedule / fleet_solve_schedule reference | Adapt; reject unchanged use as the complete PB4T solver | Locally inspectable bounded backtracking is a concrete option for the small synthetic problem. Basic interval collision checks and separate feasible/infeasible/budget_exhausted statuses fit SCH-01 and SCH-03. Full scope requires substantial extensions or a compatible application-owned engine. | scheduling.js imports validation.js, accepts exact assigned people, explicit starts and integer-minute windows. Source inspection only; neither callable tool nor module was run. Application/browser compatibility untested. Preserve .fleet files unchanged. |
| OR-Tools CP-SAT, the packet's sole external component candidate | Adapt as a conditional alternative; not selected for this prototype | Packet recommends evaluation for larger instances, objectives and richer constraints. Would still require explicit domain modeling, occurrence expansion, participant negotiation, reporting and review. Integration effort high relative to supplied local JS primitive. | [Official scheduling lead](https://developers.google.com/optimization/scheduling); upstream [repository lead](https://github.com/google/or-tools), [license lead](https://github.com/google/or-tools/blob/stable/LICENSE), [release lead](https://github.com/google/or-tools/releases). All URLs uninspected. No retrieved version, license text, runtime/binding compatibility, browser packaging evidence or benchmark. No claim that a particular license or version applies. |
| Supplied synthetic scheduling fixture | Adapt as reference input shape only; reject as acceptance evidence | Two generic requests and two people illustrate API fields, including rest=30 and rest=0. It does not represent five departments, weekly recurrence, block fatigue, operator review or the named reports. A complete fictional PB4T dataset remains necessary. | fixtures.json labels itself synthetic and toolkit-reference-inputs. Fixture inclusion does not establish successful execution, expected application outcomes or real policy. |
| Supplied validation.js helpers | Adapt where their semantics fit | Safe-integer ranges, unique IDs and strict window shapes can inform local validation. Browser imports and error handling remain untested. Domain validation must exceed generic shape checks. | scheduling.js imports array, compareText, integer, object, strings, text and unique. Empty arrays are permitted by generic array validation; required crew/resources/occurrences must be domain-checked. No published package version/license supplied. |
| Browser board, heatmap, negotiation log, reports, review and export | Reject toolkit-only reuse as sufficient | These are required scoped outputs, but no reusable UI or complete PB4T workflow is supplied. Their absence is an application gap, not a criterion deferral. | .fleet/README.md explicitly describes calculation primitives, not complete applications. No UI dependency candidate, license or version evidence is provided; no new external UI library is selected here. |

The local toolkit package.json contains only type=module and private=true: no package version, license, dependency declarations or supported-runtime range. A source SHA-256 identifies the inspected bytes, not a released version or permission to redistribute. Toolkit license and redistribution terms remain unverified. OR-Tools version/license/bindings must be verified from a pinned release before adoption; do not substitute a familiar license name for supplied evidence.

## Concrete semantic and integration risks

1. **Fatigue mismatch (SCH-02).** Toolkit restMinutes rejects any two assignments separated by less than the given rest. Scope instead groups adjacent or less-than-twelve-hours-separated work into duty blocks, limits block span to eight hours, daily duty to four hours and weekly duty to twelve hours, and requires twelve hours between blocks. Setting restMinutes=720 would reject permitted intra-block work; setting it to zero would omit block/rest enforcement. maxMinutes covers the whole supplied horizon only. Neither setting implements the scoped policy. Daily counting, block construction, prior duty across the horizon boundary and policy versioning need explicit domain semantics. These scope values are fictional assumptions, not SFTRM or owner policy.

2. **Crew and qualification coverage (UC11-1, SCH-02).** Requests name fixed people; the solver chooses start times only. Required qualifications are satisfied when at least one listed person holds each qualification. This does not enforce role counts, distinct people for separate roles, qualification currency or selection of C04 instead of C01. Alternate qualified allocations require additional bounded search semantics with no false infeasibility claim after testing only one crew allocation.

3. **Resources and operations (SCH-01, SCH-02).** Resource IDs are exclusive labels checked for overlaps; there is no resource roster or resource-specific availability field. One global operational window list cannot express Flight Deck closed Monday morning while Training Room stays open. Resource validity and candidate filtering need separate treatment. Half-open overlap permits touching intervals; rest and block rules remain separate. Use one declared epoch and the scope's fixed clock; DST support is unverified.

4. **Periodicity (SCH-04).** No recurrence, last completion, release window, deadline or overdue carryover is inferred by the toolkit. Every synthetic seven-day and two-day occurrence needs a stable ID and coverage accounting, including the cross-week deadline. A feasible subset is insufficient. Do not hide overdue work by excluding it from the displayed week. Real SFTRM versions, applicability and deadline semantics are absent.

5. **Search completeness and scale (SCH-03).** Source limits include 24 requests, 200 people, 100 candidate starts per request, up to 100 windows per supplied list, and maxNodes at most 200,000 (default 50,000). A full seven-day grid of 30-minute starts exceeds 100 before filtering. Multiple recurrence occurrences plus allocation alternatives can exceed reference bounds. “Infeasible” means exhaustive failure over the encoded candidates, not impossibility over all real time/crew choices. budget_exhausted is unresolved. Diagnostics are observed conflicts, not a minimal unsatisfiable core; a feasible result returns no explanations, so source alone cannot populate the negotiation/resolution history.

6. **Participant behavior (UC11-1).** A single shared solver supplies no departmental agents. Scope requires deterministic Engineering, Weapons, Combat Systems, Damage Control and Flight Operations participants, with actual proposals, rejected choices, alternatives and responses. Decorative labels cannot demonstrate negotiation. No external model or agent framework is evidenced or necessary for the scoped deterministic participants.

7. **Review and deliverables (SCH-05, DELIVERABLE11-1).** No board edits, personnel totals, export consistency, review state or stale-approval invalidation exist in the calculation primitive. “Optimize schedule” must explain bounded feasibility. Constraint relaxation requests remain reviewable and cannot be applied silently. Synthetic acceptance of a revision is distinct from a human reviewing the prototype or authorizing actual drills.

8. **Runtime and evidence.** ES-module syntax and relative imports are visible, but local-browser loading, application packaging, persistence and cancellation responsiveness have not been exercised. An abort signal checked in a synchronous search is not evidence that a browser can interrupt a blocked main thread. No credential, transport, identity, government-system or production connector capability is supplied or tested. Keep synthetic inputs local and treat imported instructions as inert text.

## Options and unresolved questions for planning

The most grounded reuse option is the locally inspectable deterministic search approach with explicit application-owned domain adaptation. It offers a small bounded synthetic demonstration without an external solver dependency, but unchanged toolkit behavior cannot satisfy scope. An OR-Tools-backed option is conditional on verified release/license/runtime and representative benchmarks; no evidence here establishes it is needed or compatible. Choosing it would not remove the recurrence, fatigue, UI or review work.

Preserve scope's independently specified feasible witness and its personnel totals as reference expectations, not a result observed from software: Engineering Monday 08:00 to 10:00 C01; Combat Systems 10:00 to 11:00 C03; Damage Control 11:00 to 13:00 C04; flight quarters 13:00 to 14:00 C06; Weapons Tuesday 09:00 to 10:00 C02. Totals before prior duty are C01=2h, C02=1h, C03=1h, C04=2h, C05=0h, C06=1h. Other valid solver tie-breaks are possible.

Concrete open questions are the intended data sizes/search responsiveness, priority/objective definition, exact duty-block interpretation and midnight counting, treatment of prior duty/completion history, distinct-role and currency rules, resource calendars, and required interchange/retention formats. Owner-approved fatigue/SFTRM rules, real policy authority and operational validation remain unavailable. These questions refine operational suitability and must not shrink the complete synthetic workflow or manufacture a new deferral.

For later evidence design, the seven canonical IDs remain UC11-1 (requirement), SCH-01 through SCH-05 (recipe) and DELIVERABLE11-1 (deliverable), using packet acceptance provenance. Relevant evidence gaps include actual participant negotiation, independently checked interval pairs and totals, unavailable/missing-role cases, exact/over fatigue boundaries, impossible versus exhausted search, repeated/boundary/overdue occurrences, editing after acceptance, and faithful board/report/export results. This is a risk handoff, not a test matrix, frozen outcome contract or implementation plan. The planning phase defines literal outcomes before build; later application tests and desktop/narrow browser journeys must exercise the application. Toolkit calculations and reference fixtures cannot stand in for those results.

## Traceable supplied evidence

The following exact excerpts are from inspected local bytes. Revision means SHA-256; modification timestamps identify the local copy only. Offsets are zero-based Unicode character offsets with an exclusive end. File contents are the primary evidence; lexical matches are retrieval aids.

E1. Source: `.fleet/packet.json`; revision `141cf26aa29c8c7dd80af962d8db7dde29d588850352dcf907123084ad07a7ee`; local modified `2026-11-04T21:39:24.495670+00:00`; offsets [2137, 2314).

> Turn departmental proposals into explicit occurrences and hard constraints. Use a deterministic feasibility solver; an LLM may explain results but cannot relax hard constraints.

E2. Source: `.fleet/packet.json`; revision `141cf26aa29c8c7dd80af962d8db7dde29d588850352dcf907123084ad07a7ee`; local modified `2026-11-04T21:39:24.495670+00:00`; offsets [2643, 2731).

> Evaluate for production-scale scheduling, objectives, recurrence and richer constraints.

E3. Source: `scope.md`; revision `128cfced8c25ac42c8a7bb79b221ea8c9013d4380caa1a5436e01a107e067207`; local modified `2026-11-04T21:40:55.210927+00:00`; offsets [8413, 8526).

> Adjacent or less-than-twelve-hours-separated assignments are one duty block; the block spans at most eight hours.

E4. Source: `.fleet/toolkit/scheduling.js`; revision `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf`; local modified `2026-11-04T21:39:24.497464+00:00`; offsets [1124, 1184).

> const requests = unique(array(data.requests, 'requests', 24)

E5. Source: `.fleet/toolkit/scheduling.js`; revision `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf`; local modified `2026-11-04T21:39:24.497464+00:00`; offsets [2063, 2173).

> const qualified = r.qualifications.every(q => r.people.some(id => roster.get(id).qualifications.includes(q)));

E6. Source: `.fleet/toolkit/scheduling.js`; revision `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf`; local modified `2026-11-04T21:39:24.497464+00:00`; offsets [3954, 4045).

> if (previous.some(b => a.start < b.end + p.restMinutes && b.start < a.end + p.restMinutes))

E7. Source: `.fleet/toolkit/scheduling.js`; revision `df1516b6be05527c8b4f1a6cbf70df81569e3f57fa69f525ce2144d16bc13ecf`; local modified `2026-11-04T21:39:24.497464+00:00`; offsets [5293, 5326).

> No recurrence rules are inferred.

E8. Source: `.fleet/fixtures.json`; revision `5f4d1df7318a473d76d8603a025c042c3e56bdfd2f731489d9a9ba3ea2ee507b`; local modified `2026-11-04T21:39:24.495915+00:00`; offsets [37, 72).

> "scope": "toolkit-reference-inputs"

E9. Source: `.fleet/toolkit/package.json`; revision `f69ed17eea98f49ee075f676bae79df9cb779e54d5887b94d94313d34511170c`; local modified `2026-11-04T21:39:24.496849+00:00`; offsets [0, 42).

> {
>   "type": "module",
>   "private": true
> }

E10. Source: `.fleet/README.md`; revision `7e557ee9edbf3796149be3b24d0f055bf40fa2445b0f2fdfceb19e7b36b6dbf3`; local modified `2026-11-04T21:39:24.496686+00:00`; offsets [282, 440).

> toolkit/ contains dependency-free JavaScript calculation primitives; these do not supply production persistence, transport, identity or complete applications.

E11. Source: `.fleet/quality-contract.md`; revision `2db750e17daf686c3eb828618de37f4a5e833272b9ba902174d35ff716aa6f57`; local modified `2026-11-04T21:39:24.496430+00:00`; offsets [7910, 8084).

> Passing these contracts checks the declared browser behavior. Domain experts still need to assess whether the planned expected outcomes fully express the source requirements.

## Research status

Generated: this research artifact only. Application runnable: unverified/not built. Application tested: not performed. Reviewer accepted: not established. Operationally validated: not established. External links, versions, licenses, runtime compatibility and integrations remain unverified. requirements.md, scope.md and .fleet/ were preserved. No implementation plan or application was written.

