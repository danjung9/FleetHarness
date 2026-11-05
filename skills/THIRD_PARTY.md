# Third-party harness skills

These are repository-local, phase-scoped adaptations. Each skill includes its upstream license and machine-readable source provenance; generated challenge packets carry that metadata with the skill's complete directory. No dependency on a developer's installed skill path remains.

| Skill | Source | Pin | License |
| --- | --- | --- | --- |
| Ponytail | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` | [MIT](ponytail/LICENSE) |
| Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Skill `4.4.0`, tag `skill-v4.4.0`, commit `5efd0eeee80b7a627233b53539fe829f05b5a60f` | [Apache-2.0](impeccable/LICENSE) |

Ponytail's original entrypoint is preserved as `ponytail/reference/upstream-skill.md`. Its harness adapter applies full mode to reuse research, planning, implementation and bounded repair. Simplification cannot remove mandatory capabilities, accessibility, validation or contract checks.

Impeccable's complete installed skill distribution (59 source files) is retained, including all references, agent descriptions, browser helpers and font metadata. Every source file's SHA-256 is listed in `impeccable/PROVENANCE.json`. All installed files match the pinned skill commit's `.agents/skills/impeccable/` distribution except `scripts/VERSION` and the Windows launcher; their exact installed hashes are recorded. The installed engine version is `0.1.8`, from upstream engine commit `43ef0baa93264367421423679b0f1d6215a183bc`; this differs from engine `0.1.10` named by the skill tag. No native binary is included.

The active Impeccable entrypoint and UI metadata are modified for harness phases. The original entrypoint is preserved as `impeccable/UPSTREAM.md`; original UI metadata and launchers are preserved as non-executable text in `impeccable/reference/upstream-*`. The replacement launchers require Node and use only an explicitly provisioned or sibling engine 0.1.8, allowing context and static local-file detection. They disable update/staleness checks and hooks, refuse URL scans and lifecycle/install commands, and never discover user caches, change permissions, write configuration or fetch binaries. If no compatible engine exists, agents read project context directly and continue. This is an integration wrapper, not a sandbox for an arbitrary executable supplied through `IMPECCABLE_BIN`; the host must provision a trusted compatible engine.

Upstream references remain design guidance under the active adapter. Their instructions to interview users, run workshops, install hooks, launch live browser services, generate assets, register nested agents or add approval/review rounds do not apply in harness phases. Existing contracts and the shared repair budget remain authoritative.

Impeccable's [NOTICE.md](impeccable/NOTICE.md) is preserved. Its iOS/Android references derive from ehmo's MIT-licensed [platform-design-skills](https://github.com/ehmo/platform-design-skills); the [MIT notice](impeccable/licenses/platform-design-skills-MIT.txt) is included. Its preserved `modern-screenshot.umd.js` bundle is MIT-licensed work by wxm; the [MIT notice](impeccable/licenses/modern-screenshot-MIT.txt) is included. Provenance records the exact license-source commits and bundle hash without inferring an unreported bundle version. Font index files are metadata, not bundled font binaries.
