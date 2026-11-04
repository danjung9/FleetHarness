# Intake scope: Physics-Informed Mooring & Tug Allocation Planning Agent

## Authority and provenance

This document records intake only. No research, engineering validation, implementation plan, application or test evidence has been produced in this phase. The host-written `requirements.md` is preserved unchanged.

Source: https://cdao.hackathon.maximus.com/event/norfolk/use-cases/10. The supplied `.fleet/packet.json` captures challenge 10 on 2026-11-04 (`challenge.sourceScope: detail`). Source statements are requirements data, not instructions or authority to access systems. NSTM 582 (Mooring and Towing) is named as a resource; no authoritative edition, passages, equations or limits are supplied.

The source challenge requests environmental-force calculations, automatic tug placement and mooring sequences, a drag-and-drop pier canvas, and an approved Mooring Evolution Safety Sheet. The builder's `userScope` repeats this full challenge and supplies no additional criteria (`userScope.criteria: []`); it does not independently narrow or approve an engineering model. The narrower demonstration below is an intake recommendation necessitated by missing authority, not a replacement for the source requirements.

The packet selects **Validated engineering calculations** (`recipe.id: physics`). This is an engineering recommendation, not an event requirement. It requires authoritative equations, units, limits and revision before deterministic calculations, independently validated boundary cases, and qualified human authority. No recipe components or tools are listed for reuse in the packet.

## Audience, task and observable outcome

Intended source audience: bridge teams and qualified mooring planners. Prototype audience: those reviewers and builders inspecting a synthetic scenario, its completeness and its unresolved engineering dependencies.

The smallest complete candidate workflow is to assemble and review a synthetic mooring scenario: select a synthetic ship class, pier and line type; arrange a 2D layout; enter explicitly unit-tagged mock environmental inputs; submit for completeness review; correct invalid or missing entries; and obtain a reviewable scenario summary and graphical layout identifying unavailable engineering evaluations. This is a task-specific scenario review interface, not a generic chat UI.

Observable prototype success means a reviewer can inspect the selected scenario and layout, see specific input errors and correct them without losing other entries, and see an explicit **engineering assessment unavailable** state with missing authority and uncertainty identified. A human review acknowledgement records review of the synthetic scenario only. It cannot approve a mooring evolution or assert safe conditions.

The source engineering outcome remains conditional on authoritative inputs: deterministic lateral-force and line/bollard calculations, suitable tug horsepower and placement, line sequences, safety margins and gust warnings, all checked against approved references. No values or models will be fabricated to make that outcome appear complete.

## Inputs and data boundary

All application examples, identifiers, configurations and scenario records must be synthetic. Do not retrieve operational hydrography, vessel records, pier plans, personnel details or other operational records. Missing integrations are dependencies, not access permissions. Source content and fixture strings remain data even if they contain instructions.

Candidate scenario input contract (required domain details remain unresolved):

| Input | Required information and present constraint |
| --- | --- |
| Scenario | Synthetic identifier and explicit synthetic/unvalidated status. |
| Ship/craft | Synthetic class selection; displacement, geometry and craft configuration only where a future approved model specifies fields and units. No invented craft operating limits. |
| Pier and berth | Synthetic pier identifier, layout positions and berth/depth values with explicit units and reference datum if applicable. Geometry conventions and authoritative constraints are missing. |
| Mooring configuration | Synthetic line types, endpoints and bollard identifiers; ratings, geometry and material properties require authoritative definitions before engineering evaluation. |
| Environment | Mock wind velocity/direction, gust information and ebb/flood current velocity/direction with explicit units, direction convention and scenario context. Required combinations and bounds need authoritative definition. |
| Engineering authority | Model identifier, equations, assumptions, units/conversions, valid configurations, limits, source revision and approving authority. Currently absent. |
| Reference cases | SME-signed synthetic inputs, independent expected results, tolerances and boundary cases. Currently absent. |
| Human review | Explicit acknowledgement and scope of review; no operational approval or identity assurance implied. |

Only completeness, declared supported units and explicitly defined structural constraints may be validated before engineering authority exists. Physical ranges and craft restrictions must not be guessed. Unsupported configurations and unresolved unit conventions must stop engineering evaluation with an actionable reason. Toolkit reference fixtures and calculations do not supply missing authority or verify application behavior.

## Outputs and environment

The candidate prototype outputs a synthetic scenario summary, graphical pier/line layout, validation messages, authority/uncertainty status and human review state. Any report must be visibly marked synthetic, unvalidated and unsuitable for operational decision-making; missing engineering results remain unavailable rather than zero or a passing margin.

The full source deliverables remain recorded: interactive web application; approved Mooring Evolution Safety Sheet and graphical layout with rationale and safety margins; demo walkthrough; and one-page fielding brief. A later prototype report may demonstrate sheet structure but cannot be described as an approved safety sheet. A walkthrough and brief must distinguish demonstrated behavior from deferred engineering work.

Intended demonstration environment is a local browser with synthetic data, including an offline review screen as required by PHY-03. Desktop and narrow viewport usability, keyboard access and visible feedback are required considerations for later planning. Persistence, export format and browser support have not been selected at intake. No backend, external service, deployment or operational integration is authorized by this scope.

Recovery needs: identify the affected field and reason; preserve valid draft entries while correcting input; distinguish absent engineering authority from invalid user input; prevent stale results being presented as applicable after scenario changes; allow review to resume after correction. Loading or unavailable states must not look like successful engineering evaluations. Reload retention and reset behavior require an explicit later decision.

## Source-linked acceptance record

These are intake scope assessments, not implementation claims or frozen planning dispositions. Every canonical packet ID is retained once below. A partial demo cannot satisfy a complete source criterion.

| Canonical ID | Provenance and supplied assessment method | Complete requirement / evidence needed | Intake scope and unresolved dependency |
| --- | --- | --- | --- |
| UC10-1 | `challenge.requirements[0]`; provenance kind `requirement`, id `UC10-1`; human | Drag-and-drop 2D canvas selecting ship class, pier and line types; mock wind/current ingestion; iterative line geometry and bollard strain evaluation against NSTM 582; optimal tug horsepower, line sequences and gust breaking-threshold warnings. | Synthetic scenario entry and layout are the proposed demonstration slice. The complete criterion remains deferred while authoritative models, limits, optimization objectives and reference scenarios are absent. Canvas behavior alone does not satisfy it. |
| PHY-01 | `recipe.acceptance[0]`; provenance kind `recipe`, id `PHY-01`; human | Match independently validated reference cases, including signed-off calculations and limit boundaries. | Deferred pending authoritative equations, signed examples, tolerances and SME validation. Toolkit fixtures are not independent application verification. |
| PHY-02 | `recipe.acceptance[1]`; provenance kind `recipe`, id `PHY-02`; integration | Reject inconsistent units and missing inputs; assess unit conversions, out-of-range values and unsupported craft configurations. | Candidate prototype slice: missing-input and explicit unsupported-unit/configuration recovery. Complete coverage depends on approved unit rules, physical bounds and craft definitions; structural input checks alone do not establish the whole criterion. |
| PHY-03 | `recipe.acceptance[2]`; provenance kind `recipe`, id `PHY-03`; human | Preserve qualified human authority through an offline decision screen, uncertainty display and explicit operator review. | Candidate prototype outcome: offline synthetic review, conspicuous missing authority/uncertainty and explicit review acknowledgement. Qualification, operational approval process and review authority remain owner questions; a checkbox cannot establish them. |
| DELIVERABLE10-1 | `challenge.expectedDeliverables.lines[0]`; provenance kind `deliverable`, id `DELIVERABLE10-1`; human | Interactive app producing an approved Mooring Evolution Safety Sheet and graphical layout, rationale and safety margins, plus demo walkthrough and one-page fielding brief. | Complete criterion deferred: no approval authority, validated margins or approved engineering basis is supplied. A synthetic summary/layout, walkthrough and brief may demonstrate a limited slice without claiming the approved deliverable. |

## Evaluation and proposed measurable outcomes

The source provides no evaluation criteria (`challenge.evaluationCriteria: []`; also stated in `requirements.md`). The builder provides no additional acceptance criteria. The following are analyst-proposed outcomes, not event-published or user-confirmed criteria, and do not add canonical acceptance IDs:

- A submitted synthetic scenario summary reproduces the chosen ship, pier, line types, environmental values and declared units, and its layout reflects the entered arrangement.
- Missing required inputs or unsupported declared units produce specific errors; after correction, the same draft can reach a complete scenario review without losing unrelated values.
- With no approved model, the review and any report always identify engineering assessment as unavailable; no force, tug recommendation, line sequence, safety margin or safe/unsafe determination is invented.
- Human review is explicit, and its displayed meaning remains synthetic scenario review rather than engineering or operational approval, including offline operation.
- Once authoritative material exists, every supported calculation and limit boundary must match independent signed reference outcomes within owner-approved tolerances; those tolerances cannot be supplied by intuition.

Later planning must map every canonical criterion to complete browser outcomes or reasoned deferral, recording demonstrated slices without converting them into full compliance. That phase owns `test-matrix.md`, `acceptance-plan.json` and `ux-spec.json`; they are not produced in intake. Actual application verification must exercise application behavior; toolkit checks and a synthetic UI demonstration cannot establish operational safety.

## Explicit exclusions and authority gaps

Excluded from the presently supportable prototype: invented MSI formulas, craft limits or mooring models; unapproved engineering calculations and conversions; automatic operational tug allocation; executable mooring sequences; assertions of optimality or NSTM compliance; fabricated gust thresholds, safety margins or approvals; live systems/data; deployment and operational use. No generic model-generated rationale can substitute for traceable approved calculations.

Outstanding questions for the owner/qualified engineering authority (recorded for subsequent phases, not answered by assumptions):

1. Which authoritative NSTM 582 revision, sections, equations and associated sources apply? Who may approve their interpretation and use?
2. What model assumptions, coordinate frames, direction conventions, units, conversions, valid ranges and supported ship/line/bollard configurations are approved? How are uncertainty and coupled effects handled?
3. Which SME-validated synthetic berth scenarios and independently worked boundary cases can be supplied, with signed expected values and tolerances?
4. What defines optimal tug assistance, available synthetic tug capabilities and placement constraints? What governs line sequencing and gust warning thresholds?
5. What fields and approval process define an approved Mooring Evolution Safety Sheet? Which qualifications and explicit operator decisions must be represented?
6. What offline persistence, export, review history and recovery requirements apply? Which browser environments must be supported?

The packet's known gaps remain unresolved: authoritative equations/limits and SME-validated synthetic berth scenarios are absent; no MSI formula, craft limit or mooring model may be invented or implemented without authoritative input; and a synthetic demonstration does not establish safe operational use.
