# Architecture experiments and adaptive learning

This document describes architecture comparisons and local learning in AppYard.
The learner changes the harness's choices; coding-model weights stay unchanged.

## Using comparisons

Open a project's Review screen and choose **Compare 2 candidates**. Shared
planning freezes the brief, public behavior and private reference evaluations.
The two candidates then plan, build and verify independently. Inspect their
evidence and previews, choose a passing revision for project review, and approve
delivery separately. Source changes invalidate the recorded verification.

Before a new shared plan freezes, a fresh read-only reviewer checks minimum useful scope, each original criterion and deferral, public protocol consistency, evaluation shortcuts and boundaries, and meaningful recovery. The same selected Pi or Codex model runs this separate session. Each request for changes automatically starts another planner revision and a fresh independent review; candidate creation waits for approval. The host privately binds verdicts to the reviewed documents and behavior/evaluation hashes, rechecks them before freezing, and preserves the pending revision or review across restart. Stop requests, session limits and the existing shared-planning execution budget still apply. Previously frozen plans resume without changing their expectations. This gate also covers shared planning for paired and adaptive ordinary builds. It is a model judgment; its effect on generated output quality and cost needs controlled live comparisons.

**Model settings → Comparisons & learning** controls installation-wide learning.
The default is Off. Paired mode gathers evidence while ordinary runs retain the
baseline router; Adaptive uses an active validated policy when one exists and
otherwise falls back to the baseline. The explicit comparison button always
requests two candidates. Extra candidates on ordinary runs obey the persisted
comparison-credit limit in either learning mode.

Optional preferences are separate from candidate selection and delivery
approval. A skip adds no preference label. The same settings panel supports
policy rollback, forgetting project learning, and fixed external API operations.
Credentials are encrypted by the desktop and are never copied to a generated
process. Exported applications read user-supplied credentials from the declared
environment names.

After eight independent paired development tasks in one compatible cohort,
the next eligible explicit comparisons enter a frozen twelve-task validation
batch. The host records enrollment before running either candidate. Failed
tasks stay in that batch. An active policy is created only if the complete batch
and host regression probe pass; later online fits remain shadow proposals.
Validation outcomes never become training examples or lesson memory.

## Implementation map

| Boundary | Implementation |
| --- | --- |
| Shared behavior and candidate execution contracts | `harness/experiment-contract.ts`, `electron/experiment-quality.ts` |
| Sequential candidate execution and recovery | `electron/experiment-coordinator.ts`, `electron/experiment-workers.ts`, `electron/execution-budget.ts` |
| Desktop integration, selection and durable outbox projection | `electron/experiment-service.ts`, `electron/main.ts`, `electron/preload.cts` |
| Local evidence, lesson graph and frozen routing policies | `electron/learning-store.ts`, `electron/lesson-memory.ts`, `electron/learning-policy.ts` |
| Confined tools, dependencies and generated runtimes | `electron/isolated-agent-tools.ts`, `electron/isolated-dependencies.ts`, `electron/isolated-solution-runtime.ts` |
| Host-owned service access and standalone adapters | `electron/integration-broker.ts`, `electron/runtime-broker.ts`, `templates/runtime-broker/` |
| Comparison and optional preference UI | `src/ExperimentReview.tsx` |

The host learning database lives under the desktop's user-data directory in
`learning/`. Candidate summaries cross IPC; private evaluation sets, model
sessions and compiled host records do not. Selecting a candidate commits a
durable outbox entry before projecting it into `state.json`, so restart recovery
can finish the projection without losing subsequent approval. Forgetting learning
removes training records and invalidates their derived policies. A separate
delivery receipt retains only the provenance needed to verify an already
selected build; the learner never reads it.

Recovery fingerprints serialize each supplied input in its normalized field order
(`name`, `kind`, `content`), so SQLite's object-key sorting cannot make unchanged
attachments appear edited. Existing normalized checkpoint hashes remain valid.
Changes to an input's name, kind, content or position still invalidate recovery;
content whitespace and Unicode remain significant.

Source export verifies the entire selected revision before copying it, removes
private learning context, and adds `reproducibility/manifest.json`. The manifest
distinguishes the original verified source hash from the delivered bundle hash,
lists file hashes and records the public frozen runtime and operation definitions.
Evaluation answer keys remain private to the host.

## Accepted behavior

- Compare different architectures (static browser, Node/Python service, or
  Node/Python CLI) against one frozen behavioral contract and reference set.
- Share intake/data/research, then fork before architecture planning. Each
  candidate owns its runtime, dependencies, UI bindings, sessions, budget,
  workspace, checkpoints and evidence.
- Permit configured external HTTPS JSON/text APIs with bearer/header-key
  authentication through a trusted broker. Keep credentials outside generated
  processes. OAuth setup, WebSockets and native callbacks are outside this release.
- Use enforceable isolation for both coding tools and generated programs on
  macOS/Linux. No unrestricted fallback. Host-owned stdio brokers provide HTTP
  serving and external operations while workers have no network access.
- Keep ordinary single-build projects compatible. New comparisons and feedback
  live in the existing Review screen. Selecting a passing candidate and approving
  delivery are separate actions; changing selection invalidates approval.
- Persist evidence and a typed lesson graph in a local SQLite sidecar. Share
  generalized lessons across the installation; never index raw workspaces,
  evaluation keys, credentials, transcripts or user data into cross-project memory.
- Learn the harness's architecture choices; do not fine-tune coding-model weights.
  Reliability estimates dominate; human preference only breaks exact reliability
  ties. Missing feedback is not a neutral label.
- Optional human feedback: at most two requests per local day, one targeted and
  one random audit, with randomized stable A/B presentation and tie/neither/skip.
- Normal adaptive runs create at most 10% additional candidates. Initial paired
  experiments are explicitly selected and separately budgeted.

Isolated coding tools preserve UTF-8 file paths, content and exact edit text
across stdin chunks. The complete JSON request is limited to 2,000,000 raw bytes
and decoded only after collection; oversized requests fail before file mutation.
Text reads and targeted edits require valid UTF-8 throughout the file. Malformed
bytes fail with guidance for bounded byte inspection or explicit encoding
conversion; a rejected edit leaves the original bytes unchanged. File paths,
written content and edit strings reject unpaired Unicode surrogates before
mutation. Valid byte-order marks, literal replacement characters and line endings
are preserved, and supported image reads still return their original bytes.

Text reads return complete lines within 50,000 UTF-8 bytes, including any
continuation notice. Every successful truncated page advances the line offset.
When the first requested line cannot fit, the tool reports its line number and
byte count and directs the agent to bounded shell inspection or selected JSON
fields. Reducing the line limit cannot split compact JSON or minified source;
bounded shell inspection provides an alternate route. No content is silently
skipped, and the same isolated shell and file-access restrictions still apply.

On macOS, isolated Node commands load the host's subprocess compatibility code
through explicit runtime arguments, including nested Node children. A read-only
`node` launcher in private scratch space points shell commands and test workers
at the same configured runtime, including the desktop's bundled Electron runtime.
This keeps desktop execution covered by the ordinary offline checks. The kernel
still denies process detachment, outside-file access and network access; Python
keeps its own interpreter and argument handling.

## Frozen defaults

Candidate planning, implementation and verification each have a 30-minute limit,
with a 90-minute candidate total including bounded functional repairs. Core, primary-workflow and final verification each reserve up to three repairs and fifteen active repair minutes, still within the candidate and phase deadlines. Recovery preserves consumed
budget and pinned model/profile/memory versions. An extra attempt has a new ID.
External operations default to 100 calls per candidate, 2 MB responses and a
30-second request timeout. Missing trustworthy dollar telemetry remains unknown.

Quality success means all mandatory checks pass, required scope is implemented,
and the budget is respected. Implementation errors/budget exhaustion are failures;
user cancellation and host-confirmed infrastructure failures are censored.

Dependency preparation also treats host storage and file-descriptor failures
(`ENOSPC`, `EDQUOT`, `EIO`, `EMFILE`, `ENFILE`, `EROFS`) as infrastructure
interruptions, preserving the original error for diagnosis. These codes must come
from host operations; installer output and agent-authored messages cannot supply
the classification. Missing manifests, malformed pins, conflicting files and
ambiguous permission errors remain implementation failures. This distinction
prevents host resource failures from becoming negative architecture evidence;
it does not reclassify ordinary nonzero installer exits or change resource limits.

If saving a final checkpoint or execution projection fails, the candidate stays
unscored as an infrastructure interruption, even when its checks passed or it had
already encountered an implementation error or budget limit. Recovery uses the
saved checkpoint and its remaining budget before an outcome can be collected.
Existing integrity failures and user cancellations retain their classifications.
Restored architecture definitions are compared by their structured values, so
database key ordering does not block recovery; changed values or array order do.

Stopping while a worker collects its result or the host verifies it leaves that
candidate unscored and resumable; previously committed outcomes stay intact.
After interruption, a completed `review` projection collects and rechecks its
existing evidence without starting another build. An interrupted `running`
projection resumes as stopped with its existing run, workspace and consumed
budget. Changed source still fails verification during completed-run recovery.

The same finalization rule applies to candidate projections saved as `failed`
with a host classification of `implementation` or `budget`: resume collects the
failed outcome without rerunning the failed stage or allocating another repair.
The worker checks the existing checkpoint and retains immutable evidence before
the outcome is committed. Cancellation, infrastructure and integrity interruptions,
unclassified legacy failures, and failed shared planning still use normal recovery.

The initial policy maintains Beta(1 + successes, 1 + failures) estimates per
architecture/context. Context includes task family, delivery/network constraints
and budget tier; provider/model and architecture versions define separate cohorts.
Explicit preferences break exact reliability ties after at least three labeled
comparisons. Validated routing uses epsilon-greedy with epsilon 0.10.

Normal decisions earn 0.1 comparison credit, initially zero and capped at one.
When one credit is available, sample an extra candidate with probability 0.10,
reserve the credit before execution, and log the conditional probability.

Promotion requires eight distinct paired training tasks followed by a frozen
policy/memory evaluation on twelve new paired tasks from at least three lineages:
at least eleven proposed choices succeed, no proposed choice fails where the
baseline succeeds, budgets hold, and host regression checks pass. Every arm
eligible for epsilon exploration must also succeed on at least eleven tasks and
must never fail where the baseline passes in that same batch. This permits a
limited local rollout, not a claim of statistically established improvement.
Validation lineages stay outside memory/training. Three consecutive selected
implementation failures roll back a context; gate/isolation/budget defects roll
back immediately.

Rollback retires both active policies and every existing shadow proposal in that
context. A pending regression check cannot restore them: promotion rechecks the
frozen policy in the same transaction that saves and activates its successor.
Restart, resume and repeated assessment retain this rollback. Other contexts are
unaffected. A newly fitted proposal can earn activation through a fresh twelve-task
validation batch; an old proposal cannot reuse its completed batch to undo rollback.

Forgetting a held-out task invalidates its frozen source policy and every policy
promoted from that batch, even if the task failed or was unfinished. A regression
check already in progress cannot activate that policy after its evidence is
deleted. Restarting or replacing the deleted task cannot reuse the old batch;
a newly fitted proposal must earn its own fresh validation. Unrelated policies
and completed applications in other projects remain available.

## Verification evidence

The implementation includes durable recovery, evidence-linked lessons,
contradiction/retirement/forgetting, top-three retrieval within 4,000 characters,
immutable memory snapshots, prospective policy validation and rollback. Early
implementation failures have immutable failure receipts, so they can contradict
prior lessons without qualifying a failed candidate for selection. Only trusted
host failures can censor a learning outcome as infrastructure failure.

Lesson retrieval walks matching records in relevance order until it has up to
three eligible lessons that fit within 4,000 characters, or exhausts the matches.
Other task families, cohorts, retired or unsupported lessons, and excluded
lineages cannot consume a search cutoff and hide usable evidence. A lesson that
does not fit the remaining text budget is skipped so later, shorter lessons can
still be considered. Existing evidence rules, cohort identities and frozen memory
snapshots remain unchanged.

Verified on macOS on 2026-11-05:

- `npm run test:experiments`: 121 tests passed, including actual confined Node and
  Python execution, both coding adapters' isolation, broker/credential boundaries,
  crash recovery, policy partitions, quotas and rollback. The full service test
  builds both candidates, selects each, exports it and executes its standalone
  adapter on fresh input.
- `node --test --test-concurrency=2 tests/journey.test.mjs tests/source-export.test.mjs`:
  20 tests passed.
- `npm run smoke:experiments`: production build and all three UI checks passed.
  Coverage includes keyboard comparison/feedback, independent selection/approval,
  settings, ordinary Run activity, stop/resume, and an actual Electron iframe.
  The iframe's isolated API worked with zero observed external HTTP requests,
  STUN packets or direct TCP connections; closing it revoked the preview runtime.
  Desktop and minimum-size screenshots were inspected.
- Quality, solution evaluation, source export and typed execution-failure regression:
  58 tests passed.
- Agent-browser and independent browser-verification regression: 35 tests passed.
  This covered both failures from an earlier broad run (a browser startup timeout
  under concurrent load and a WebRTC egress defect). The egress defect was fixed;
  the broad suite has not been rerun to establish its timing stability.

Paid model/API benchmarks were not run. These checks establish integration and
failure handling; improved real-world architecture choices still require the
prospective validation described above. Linux isolation is implemented but was
not exercised on this macOS host.
