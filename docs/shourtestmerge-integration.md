# shourtestmerge integration

Source snapshot: 2026-11-05 01:43 America/New_York. Later commits to the source branches are not automatically incorporated.

| Source branch | Included source revision |
| --- | --- |
| codex/fh-001-windows-installer | 5a9d7d1a3175316e5f57624bb7be3abaee4c2d47 |
| codex/fh-008-build-budgets | a5e0bcf141df71d979136d9664c1728f1781762e |
| dan/backend-improvements | 29ac921823fee3cd263ce61f1d3ef3d2db9dded3 |
| deployment-infra | f579651bb6be6c23f5758129842e1b66c5fbe534 |
| dev/reviewed | 16a694080508ebae19384f05fda8279b5a5feb96 |
| main | b590dae679c88600f9d14bdeaa1dbf32c15c215c |
| mukul-dev | 0512b93265e766d06b94c79598c4b7534ee02864 |
| mvp | 16a694080508ebae19384f05fda8279b5a5feb96 |
| prod | 95b7759918b93b662c4378e5df71fe98ea5cf0d2 |
| research-vault | 383f48a3dcdaf22a5c18601812abcd1fa919bdba |

This development branch combines the Windows delivery work, hosted implementation, reviewed desktop safeguards, backend features, and whole-build budgets. The merge preserves private resume checkpoints, independent verification, model account routing, browser evidence, source integrity checks, and Windows process ownership. Windows release publication and hosted deployment are separate operations.

## Validation

- Frontend and Electron compilation and the worker build passed.
- Native Electron UI smoke passed: isolated renderer, desktop bridge, budget persistence and range validation, retained developer mode, data input controls, and minimum-width layout. No renderer errors were observed.
- Harness tests: 92 passed, zero failed, two existing platform skips (94 total).
- Windows native process probes passed for exact run markers, handle-based process identity, and child termination after host exit.
- Windows data input and helper fixture tests: 18 passed, zero skipped.
- Focused agent-runner and usage tests: 31 passed, zero failed. These cover persisted metrics, cumulative usage, stopped runs, and optional turn limits under the whole-build budget.
- Foundations: 14 passed, zero failed, one existing Python 3 unavailable skip. Node computation services, the delivered browser UI, source-link rejection, and Windows cleanup passed after the runtime shutdown fix.
- The complete runtime suite is not green. An initial partial run emitted 138 passes and 10 failures before hanging. A later focused run emitted 54 passes and six failures before a remaining native test process prevented exit; these overlap and must not be summed.

The focused runtime failures included three native build/image transport checks blocked by the Windows sandbox, two Codex engine fixtures failing the required `evaluation-plan.json` contract, and one native fixture cleanup error. Fixture cleanup was subsequently bounded but that native parser case was not rerun. The two quality-contract failures remain unresolved; no contract bypass was added.

The Windows restricted-read sandbox on this device requires the elevated Windows backend. Sandbox-dependent helper execution and complete generated-build verification are therefore unvalidated here. The integration retains the restricted filesystem and network policy. It does not provision OS sandbox accounts or use the user's Codex home as a workaround.

## Run locally

Use Node 24, install dependencies with `npm ci`, run `npm run build`, and launch with `npm start`. A model account must be connected in Settings before starting a new generated build. The running development app uses the existing AppYard project state.
