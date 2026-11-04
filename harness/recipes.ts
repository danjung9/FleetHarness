import type { AcceptanceCriterion, Recipe, RecipeId } from './types.js';

const check = (id: string, requirement: string, scenario: string, method: AcceptanceCriterion['method'] = 'automated'): AcceptanceCriterion => ({ id, requirement, scenario, method });
const candidate = (name: string, url: string, rationale: string): Recipe['components'][number] => ({ name, url, rationale, status: 'candidate' });

export const recipes: Record<RecipeId, Recipe> = {
  messages: {
    id: 'messages', title: 'Traceable document extraction',
    approach: 'Preserve original input, parse known structures deterministically, and send unsupported or ambiguous fields to review. Add OCR only for scanned inputs; evaluate it against field-level ground truth.',
    skills: ['fleet-intake', 'fleet-evidence', 'fleet-messages', 'fleet-delivery'],
    tools: ['fleet_extract_messages', 'fleet_search_evidence'],
    components: [candidate('Tesseract', 'https://github.com/tesseract-ocr/tesseract', 'Candidate for scan OCR; handwritten accuracy requires a separate benchmark.'), candidate('Apache Tika', 'https://tika.apache.org/', 'Candidate for heterogeneous file text extraction before field parsing.')],
    acceptance: [
      check('MSG-01', 'Every extracted field has exact source offsets.', 'Slice the original input at every emitted offset and compare to the field source text.'),
      check('MSG-02', 'Do not invent ambiguous timestamps.', 'Supply a missing timezone, invalid calendar date, empty input and unsupported line; inspect review flags.'),
      check('MSG-03', 'Normalize time zones without shifting the event.', 'Compare two timestamps for the same instant and a cross-midnight interval.'),
      check('MSG-04', 'Review output against an independent answer key.', 'Measure precision and recall on held-out synthetic formats, including non-events.', 'human'),
      check('MSG-05', 'Keep the timeline usable offline.', 'Disconnect the browser, parse a message and export its reviewed schedule.', 'integration')
    ],
    limitations: ['The included parser implements a documented synthetic grammar, not the full USMTF standard.', 'Handwriting recognition, actual message formats and operational accuracy are not established by toolkit tests.']
  },
  scheduling: {
    id: 'scheduling', title: 'Constraint-based planning',
    approach: 'Turn departmental proposals into explicit occurrences and hard constraints. Use a deterministic feasibility solver; an LLM may explain results but cannot relax hard constraints.',
    skills: ['fleet-intake', 'fleet-scheduling', 'fleet-evidence', 'fleet-delivery'],
    tools: ['fleet_solve_schedule'],
    components: [candidate('OR-Tools CP-SAT', 'https://developers.google.com/optimization/scheduling', 'Evaluate for production-scale scheduling, objectives, recurrence and richer constraints.')],
    acceptance: [
      check('SCH-01', 'No personnel or shared-resource double booking.', 'Schedule requests sharing a person and room; independently verify all interval pairs.'),
      check('SCH-02', 'Honor availability, qualifications, rest and duty budgets.', 'Include a missing qualification, unavailable window and fatigue-boundary case.'),
      check('SCH-03', 'Distinguish infeasible input from exhausted search.', 'Run an impossible case and a deliberately tiny search budget; expect different statuses.'),
      check('SCH-04', 'Preserve mandatory training periodicities.', 'Expand the owner-supplied recurrence rules into occurrences and verify every deadline.', 'integration'),
      check('SCH-05', 'Have an operator accept the proposed schedule.', 'Review the editable board, personnel load and every constraint relaxation request.', 'human')
    ],
    limitations: ['Included bounded backtracking finds feasibility, not a globally optimal roster.', 'Recurrence and fatigue policy values must be supplied by the owner; the toolkit does not encode SFTRM.']
  },
  offline: {
    id: 'offline', title: 'Offline records and synchronization',
    approach: 'Persist local edits before acknowledging them. Exchange immutable revision operations, deduplicate retries, retain competing branches and require an explicit merge. Prioritize resumable transfers separately from record reconciliation.',
    skills: ['fleet-intake', 'fleet-offline', 'fleet-evidence', 'fleet-delivery'],
    tools: ['fleet_reconcile_records', 'fleet_plan_uploads'],
    components: [candidate('PouchDB / CouchDB', 'https://pouchdb.com/guides/replication.html', 'Evaluate mature replication and conflict retention for an authorized deployment.'), candidate('IndexedDB', 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API', 'Browser-local persistence for the dependency-free prototype.')],
    acceptance: [
      check('OFF-01', 'Replaying an operation has no duplicate effect.', 'Merge the same revision twice and compare complete results.'),
      check('OFF-02', 'Concurrent edits and deletes remain visible.', 'Make independent edits at two replicas, including edit versus delete; preserve all heads until reviewed.'),
      check('OFF-03', 'Converge independent of delivery order.', 'Merge A into B and B into A and compare the canonical record state.'),
      check('OFF-04', 'Resume transfers within a bounded link budget.', 'Interrupt a photo halfway, send critical records first, then continue from the acknowledged byte offset.'),
      check('OFF-05', 'Persist across device restart and review before routing.', 'Reload offline after an edit, reconnect, resolve conflicts and inspect the recorded reviewer decision.', 'integration')
    ],
    limitations: ['Pure reconciliation is included; authenticated transport, durable browser storage and device encryption are application integration work.', 'No actual cloud or government synchronization endpoint is contacted.']
  },
  knowledge: {
    id: 'knowledge', title: 'Cited retrieval and human interpretation',
    approach: 'Filter the approved corpus before retrieval, retain document IDs, timestamps and exact excerpts, then separate source facts from interpretation. Abstain when no source supports an answer.',
    skills: ['fleet-intake', 'fleet-evidence', 'fleet-knowledge', 'fleet-delivery'],
    tools: ['fleet_search_evidence'],
    components: [candidate('SQLite FTS5', 'https://sqlite.org/fts5.html', 'Evaluate an embedded offline full-text index before adding embeddings.')],
    acceptance: [check('RET-01', 'Every result cites an exact permitted source span.', 'Include an excluded document with the best lexical match; it must not be returned.'), check('RET-02', 'Expose stale and missing evidence.', 'Query an absent fact and an outdated record; return no answer or explicit staleness.'), check('RET-03', 'Measure relevance and latency with the owner.', 'Evaluate a held-out question set, record hardware, corpus size and latency percentiles.', 'human')],
    limitations: ['The included search is lexical and consumes supplied local documents; it is not a live JLLIS, registry or SharePoint connector.', 'An approved flag in a fixture is not an access-control implementation.']
  },
  readiness: {
    id: 'readiness', title: 'Explainable dependency analysis',
    approach: 'Reconcile source snapshots and use a validated dependency graph to calculate completion and margin. Preserve uncertainty and source freshness; require human review of assumptions and response options.',
    skills: ['fleet-intake', 'fleet-readiness', 'fleet-evidence', 'fleet-delivery'],
    tools: ['fleet_analyze_dependencies', 'fleet_search_evidence'],
    components: [candidate('NetworkX', 'https://networkx.org/documentation/stable/reference/algorithms/dag.html', 'Candidate for larger graph models and dependency diagnostics.')],
    acceptance: [check('DEP-01', 'Identify the controlling path and deadline margin.', 'Use a known DAG with one late branch; calculate the expected finish by hand.'), check('DEP-02', 'Never convert missing estimates to zero.', 'Remove a controlling duration and expect UNKNOWN instead of a green readiness claim.'), check('DEP-03', 'Reject cyclic and dangling dependencies.', 'Include a dependency cycle and a reference to an unknown task.'), check('DEP-04', 'Validate the model with the operational owner.', 'Compare conclusions to a documented manual baseline on synthetic scenarios.', 'human')],
    limitations: ['The included DAG calculator is a planning primitive, not a validated mission-readiness model.', 'No operational response or command decision is automated.']
  },
  cyber: {
    id: 'cyber', title: 'Defensive investigation and staged remediation',
    approach: 'Ingest authorized offline evidence, correlate findings with approved controls, and assemble a traceable handoff or change proposal. Changes need an authorized reviewer, a scoped execution adapter, verification and rollback.',
    skills: ['fleet-intake', 'fleet-cyber', 'fleet-evidence', 'fleet-delivery'],
    tools: ['fleet_search_evidence'],
    components: [candidate('OpenSCAP', 'https://www.open-scap.org/', 'Candidate scanner for an explicitly authorized isolated lab.'), candidate('OPA', 'https://www.openpolicyagent.org/docs', 'Candidate for explicit policy-as-data evaluation.')],
    acceptance: [check('CYB-01', 'Explain findings with asset and control evidence.', 'Use a seeded offline misconfiguration and a benign look-alike; compare against the lab answer key.', 'integration'), check('CYB-02', 'Approval is specific to the proposed change.', 'Change the proposed patch after review; the old approval must no longer permit execution.', 'integration'), check('CYB-03', 'Verify rollback and analyst handoff.', 'Apply and reverse a benign lab configuration change and inspect the audit record.', 'human')],
    limitations: ['No live scanning, patching, identity administration or CAC infrastructure is supplied by this toolkit.', 'Cyber recipes stop at evidence and planning until a lab adapter and reviewed tests are available.']
  },
  governance: {
    id: 'governance', title: 'Agent oversight simulation',
    approach: 'Specify manifests, heartbeats, intent, leases, policy evaluation and an operator halt as protocols. Test synthetic shared resources and explain arbitration without controlling physical equipment.',
    skills: ['fleet-intake', 'fleet-governance', 'fleet-evidence', 'fleet-delivery'],
    tools: [],
    components: [candidate('OPA', 'https://www.openpolicyagent.org/docs', 'Candidate for policy decisions independent of the proposing agent.')],
    acceptance: [check('GOV-01', 'Reject unregistered or expired identities.', 'Submit an intent with a missing manifest, expired lease and stale heartbeat.', 'integration'), check('GOV-02', 'Resolve resource contention deterministically.', 'Reverse simultaneous input order and verify the documented authority rule wins.', 'integration'), check('GOV-03', 'Operator halt preempts all simulated agents.', 'Activate halt while intents are pending and verify no subsequent simulated action executes.', 'human')],
    limitations: ['Recipe and tests-to-build only; no governance runtime or real actuator integration is included.', 'Cryptographic identity and authority policy require separately validated infrastructure.']
  },
  workflow: {
    id: 'workflow', title: 'Versioned records and review workflow',
    approach: 'Model records and revisions before UI. Make allowed transitions, reviewer roles and release authority explicit; retain change history and route offline work through reviewed synchronization.',
    skills: ['fleet-intake', 'fleet-workflows', 'fleet-offline', 'fleet-evidence', 'fleet-delivery'],
    tools: ['fleet_reconcile_records', 'fleet_search_evidence'],
    components: [candidate('Microsoft Power Apps', 'https://learn.microsoft.com/en-us/power-apps/', 'Evaluate when a challenge requires an existing licensed Microsoft 365 platform.')],
    acceptance: [check('WFL-01', 'Reject invalid state transitions and stale approvals.', 'Revise a record after approval and verify it cannot be released with the previous decision.', 'integration'), check('WFL-02', 'Retain record lineage and conflicts.', 'Submit competing amendments and verify both source revisions are recoverable.'), check('WFL-03', 'Complete the owner-specific workflow.', 'Have a reviewer perform the full intake, review, return-for-edit and export journey.', 'human')],
    limitations: ['Identity providers, formal release channels and Microsoft 365 connectors are not preconfigured.', 'Classified source systems are represented only by synthetic substitutes.']
  },
  physics: {
    id: 'physics', title: 'Validated engineering calculations',
    approach: 'Obtain the authoritative equations, units, limits and revision first. Implement deterministic math with boundary tests; use AI only to assist input and explain approved calculations.',
    skills: ['fleet-intake', 'fleet-physics', 'fleet-evidence', 'fleet-delivery'],
    tools: [], components: [],
    acceptance: [check('PHY-01', 'Match independently validated reference cases.', 'Compare each calculation and limit boundary to signed-off worked examples.', 'human'), check('PHY-02', 'Reject inconsistent units and missing inputs.', 'Test unit conversions, out-of-range values and unsupported craft configurations.', 'integration'), check('PHY-03', 'Preserve qualified human authority.', 'Inspect the offline decision screen, uncertainty display and explicit operator review.', 'human')],
    limitations: ['No MSI formula, craft limit or mooring model is invented or implemented without an authoritative input.', 'A synthetic UI demonstration does not establish safe operational use.']
  },
  fielding: {
    id: 'fielding', title: 'Transition and reproducible delivery',
    approach: 'Begin with the owner-supplied working application, verify its behavior, then document supported devices, installation, security evidence, update/rollback and sustainment ownership.',
    skills: ['fleet-intake', 'fleet-evidence', 'fleet-delivery'],
    tools: [], components: [],
    acceptance: [check('FLD-01', 'Reproduce installation on the intended device.', 'A second operator installs from the package and follows the offline demo.', 'human'), check('FLD-02', 'Preserve baseline behavior.', 'Run the supplied application tests before and after packaging.', 'integration'), check('FLD-03', 'Name accountable transition owners and unresolved approvals.', 'Review hosting, authorization, update and sustainment decisions with the owner.', 'human')],
    limitations: ['Packaging does not grant authorization to operate or install on government devices.', 'Hosting approval, signing credentials and operational owners are external dependencies.']
  }
};

export function getRecipe(id: RecipeId): Recipe { return structuredClone(recipes[id]); }
