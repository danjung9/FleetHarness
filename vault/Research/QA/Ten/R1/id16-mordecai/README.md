# MORDECAI synthetic oversight console

An offline exercise for watchstanders and evaluators to explore agent eligibility, shared-resource decisions and operator halt. Every agent, policy value and action is synthetic. Execution adds a local report; it controls no equipment.

## Prerequisites and quick start

Open `index.html` directly in a modern browser. No installation, server, network, account or package dependency is needed. Keep the file at the same location if relying on browser-local storage. JavaScript must be enabled.

A fresh session starts at t=100 with repair and sensor registered, no intents and no completed actions. Sample data is built into the application; there is no file to upload. The simulation clock advances only through **Advance time** or resets to t=100 when you load an eligibility scenario.

If the application restores an earlier session, export it if needed, then choose **New session** → **Confirm new session** before following an example below. Reset deletes the current browser-local session. Start each separate exercise from a fresh session for the stated scores and action counts.

The single page contains **Roster & demonstration policy**, **Intent workspace**, **Decision & action review**, **Eligibility exercises**, and **Local session**. Use Tab to reach controls, Enter/Space to activate buttons, and native select keyboard controls to choose options. Errors receive focus; successful updates appear in the status region.

## Walkthrough: resolve competing requests

1. In **Intent workspace**, leave **Competing request arrival order** at **Sensor first**.
2. Click **Queue competing requests**, then **Resolve batch**.
3. In **Decision & action review**, expect winner and lease owner `sensor`, and `sensor wins pump-1: 60 > 40 under demo-v1 / cruising.` No action has executed yet.
4. Click **Execute approved action**. Completed actions becomes `1`, and the latest report reads `Executed: sensor / pump-1 / inspect at t=100.`
5. Click **Clear batch** to cancel unexecuted work and release ownership. Choose **Repair first**, queue and resolve again. Sensor still wins under cruising policy.

To inspect the evidence, expand **Intent, decision & action history** in **Decision & action review**. It lists intent statuses and completed actions; **Decision input snapshots** shows the inputs retained for each decision. Clearing or requeuing work retains historical records. **Queue competing requests** replaces the current unexecuted batch with fresh sensor and repair requests.

## Announce a single request

1. In a fresh session, choose `repair` under **Requesting agent**.
2. Click **Announce intent**. Expect `Pending: repair requests pump-1.` This announces work without executing it.
3. Click **Resolve batch**, review the decision and lease, then click **Execute approved action**.
4. Expect Completed actions `1` and `Executed: repair / pump-1 / inspect at t=100.` Repeated execution cannot create a second report for the same approval.

All requests use resource pump-1 and action inspect; neither is editable in the UI.

## Review and change authority

1. Select **General quarters** under **Ship condition**, then click **Apply condition**. The roster shows `repair 70; sensor 60`.
2. Queue competing requests and resolve. Repair wins 70 to 60.
3. For a tie exercise, return to **Cruising**, apply it, enter `20` in **Repair promotion (0 to 100)** and click **Save promotion**. Queue and resolve: `Escalate pump-1: repair 60 = sensor 60. No lease granted.` Execution is blocked.
4. Enter `40`, save and resolve again. Repair wins 80 to 60. Execute deliberately to create its report.

Scores use invented policy demo-v1: base rank + condition modifier + saved promotion. Promotion must be a whole number from 0 through 100. Edits remain visibly unsaved until **Save promotion** or **Apply condition**. Use **Discard promotion** or **Discard condition** to recover the saved values. Resolve and execute require saved or discarded drafts. Committing a policy change invalidates unexecuted decisions; resolve again.

## Recover eligibility

1. In **Eligibility exercises**, choose **Missing manifest · ghost**, click **Load scenario**, then **Announce intent**. Expect `Rejected: agent ghost is not registered.` and zero new actions.
2. Click **Repair eligibility**, then announce a fresh intent. Registration never resubmits work automatically.
3. Choose **Expired authorization · repair**, load and announce. Expect `Rejected: repair authorization lease expired at t=100.` Repair eligibility and resubmit.
4. Choose **Stale heartbeat · repair**, load and announce. Expect `Rejected: repair heartbeat is stale at t=100.` Repair eligibility, announce, resolve and execute to complete one repair action.

Loading scenarios cancels the unexecuted batch, sets t=100 and preserves history. A previously registered ghost with historical accepted requests cannot be removed by the missing-manifest exercise: start a confirmed new session to repeat that case. Heartbeat freshness is at most 10 seconds; future or malformed telemetry fails closed. Authorization and resource lease expiry exclude their final timestamp. Resource leases last 5 synthetic seconds; an expired lease requires fresh resolution.

## Exercise lease expiry

1. In a fresh session, click **Queue competing requests**, then **Resolve batch**. The lease is issued at t=100 and expires at t=105.
2. In **Eligibility exercises**, expand **Advance synthetic time**. Enter `5` under **Seconds to advance** and click **Advance time**.
3. Click **Execute approved action**. Expect `Blocked: Resource lease expired.` Completed actions remains `0`.
4. Click **Resolve batch** again to obtain a new lease, then execute. At t=105 the initial heartbeat is still fresh, so the new action can complete.

Advancing time never sends heartbeats automatically. If an agent becomes stale, choose that **Requesting agent**, click **Repair eligibility**, then announce a fresh intent and resolve. Previously rejected work is not automatically reactivated.

## Halt, save and export

1. Click **Halt all simulated agents** at any time. Pending and granted work is canceled; registered agents receive simulated acknowledgements. Completed reports remain.
2. **Execute approved action** and **Announce intent** remain available to demonstrate explicit halt refusals. Other simulation mutations are unavailable while halted.
3. Reload: a valid saved session retains halt, drafts and completed history. There is no resume control.
4. Use **Export session JSON** to download `mordecai-session.json`, including policy, drafts, manifests, intents, receipts and audit records. No import feature is supplied.
5. To discard the current session, click **New session**, then **Confirm new session**. **Keep current session** cancels this action. Reset creates a separate empty simulation and never resumes old work.

To reproduce halt with retained history: complete the competing-request walkthrough through its first execution, click **Clear batch**, then **Queue competing requests**, and halt. Pending intents changes from `2` to `0`; Completed actions stays `1`. Acknowledgements read `repair: acknowledged; sensor: acknowledged`. Executing now gives `Blocked: operator halt is active.`; announcing gives `Rejected: operator halt is active.`

State and drafts save automatically to the browser-local key `mordecai-synthetic-v1`. Storage is local, editable and not secure or tamper resistant. Storage failures display **Session not saved** while keeping in-memory work; export before closing. Invalid restored data locks actions until explicit new-session confirmation. Exported JSON is for review, not authenticated evidence.

## Supported inputs and validation

| Input | Supported values and behavior |
| --- | --- |
| **Requesting agent** | Built-in repair, sensor and ghost choices. Ghost requires registration through **Repair eligibility** before its request is accepted. |
| **Ship condition** | Cruising or General quarters; requires **Apply condition**. |
| **Repair promotion (0 to 100)** | Whole numeric value 0 to 100; blank, negative, fractional or larger values are rejected on save. The draft is preserved for correction. |
| **Competing request arrival order** | Sensor first or Repair first; changes announcement order, not authority. |
| **Synthetic failure** | Missing manifest, expired authorization or stale heartbeat. **Load scenario** prepares the exercise; it does not submit or execute work. |
| **Seconds to advance** | Positive whole seconds within the safe integer range; zero, blank, negative and fractional values are rejected. |
| Export | UTF-8 JSON download named `mordecai-session.json`. No CSV, manifest upload, JSON import or user-supplied resource/action format is supported. |

Synthetic manifests must permit inspect and declare heartbeat, intent, action-report and halt support. The core checks manifest validity, authorization and heartbeat before granting or executing. A fresh heartbeat is at most 10 seconds old, inclusive; manifest and authorization expiry timestamps are exclusive. These checks do not verify cryptographic identity.

## Troubleshooting

- **Save or discard policy drafts**: finish the visible policy edit before resolving or executing.
- **No approved action**: announce and resolve a fresh batch; a tie, policy change, clear or completed action cannot execute an old receipt.
- **Resource lease expired**: resolve again; also check heartbeat and authorization eligibility.
- **Halted**: only a confirmed new session starts new work. Ordinary controls cannot clear halt.
- Browser file storage varies. If reload persistence is unavailable, export and retain the JSON externally; import/restore from a file is unavailable.
- **Invalid local snapshot**: actions and export are locked. Earlier prototype snapshots containing grants without a resource identity also fail the tightened validation; there is no automatic migration. Choose **New session** and **Confirm new session** to discard the invalid stored session. The app has no repair/import tool for corrupted data.
- **Ghost already registered in this session**: use a confirmed new session to repeat the missing-manifest exercise; existing accepted ghost history cannot be removed by that exercise.
- **No eligible pending intents**: repair the selected agent's eligibility and announce a fresh request, then resolve. Rejected intents remain historical records.

## Known limitations and unavailable integrations

No cryptographic identity, approved authority matrix, real agents, distributed arbitration, authenticated promotion, physical actuator/halt adapter, trusted clock, government connection or operational authorization is included. The exact twelve-to-thirteen-agent source demo and cognitive-burden claims remain unvalidated. Simulated acknowledgements are local state transitions, not device confirmations. No dependencies are reused or installed; OPA and toolkit fixtures are not part of the application.

## Developer checks

Node.js 18 or newer is needed only to run developer tests, not to use the app:

```sh
node --test core.test.cjs browser-core.test.cjs
```

`core.cjs` exposes actual application state transitions. The same implementation is embedded in `index.html` inside `script#governance-core`; keep both copies synchronized. The parity suite executes both implementations with the same behavioral vectors. Tests create no mutable fixture files and use no packages.

The verification run passed 15 application tests, with none failed or skipped, after one bounded repair for restored-grant consistency and missing-authorization rejection receipts. This does not establish browser task completion. See [verification.md](verification.md) for the evidence boundary and [path-to-fleet.md](path-to-fleet.md) for ownership and validation prerequisites. Host browser checks, human acceptance and operational validation remain pending.
