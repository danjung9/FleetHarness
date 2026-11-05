# Installed MailMCP demonstration

The separate **AppYard Demo** app includes the real [MailMCP repository](https://github.com/shourovsahaaa/mailmcp) at commit `82abd7f68d964326419df16cd9c52f3a91bd79b3`, a working local preview, and preloaded simulated AppYard agent activity. It has its own bundle identifier, `dev.fleetharness.mailmcp-demo`, and an isolated AppYard Demo profile.

The source is imported from the upstream project. The five-agent history is illustrative and does not claim that AppYard authored the existing repository. It records no model calls, token usage, human approval, or delivery.

## Try it

Open AppYard Demo; it opens the **MailMCP · GenAI Outlook** Build view automatically. Choose **View app**, inspect the fictional inbox, search for **Cedar**, read a message and its related context, then create and edit a reply draft. The actual upstream frontend and FastAPI service handle the workflow.

Build and Activity show the simulated intake, research, planning, implementation, and verification history. Review and Files show actual captured evidence, source attribution, the application files, and a walkthrough guide.

The bundled launcher runs on loopback with the upstream memory-only development cache. It uses the upstream fictional mailbox, rejects live GenAI calls, and needs no system Python or account setup. The source files themselves remain unchanged.

## Prepare and package

The preparation inputs live in `output/mailmcp-demo/`:

- `source/`: a clean checkout of the pinned MailMCP commit. The preparation script clones it if absent.
- `evidence/upstream-tests-normalized-tmp.log`: the actual captured upstream Python unittest output.
- `evidence/demo-validation.json`: the actual passing local demo workflow report produced during validation.
- `bundle/python/` and `bundle/backend-entry.py`: the prepared portable runtime and demo wrapper.

On an Apple Silicon Mac with `uv` available, prepare a fresh checkout and portable runtime:

```sh
mkdir -p output/mailmcp-demo/evidence
git clone https://github.com/shourovsahaaa/mailmcp.git output/mailmcp-demo/source
git -C output/mailmcp-demo/source checkout --detach 82abd7f68d964326419df16cd9c52f3a91bd79b3
bash scripts/prepare-mailmcp-runtime.sh
```

If the pinned checkout already exists, keep it and skip the clone. The runtime script installs Python 3.12.12 into the demo output directory and copies the tracked `scripts/mailmcp-demo-backend.py` wrapper. It does not alter system Python.

Capture the upstream suite with the bundled Python executable. The temporary directory is resolved to avoid macOS `/var` symlinks affecting the upstream path-boundary checks:

```sh
demo_python="$PWD/output/mailmcp-demo/bundle/python/bin/python3.12"
demo_test_tmp="$(mktemp -d)"
demo_test_tmp="$(cd "$demo_test_tmp" && pwd -P)"
(
  cd output/mailmcp-demo/source
  TMPDIR="$demo_test_tmp" "$demo_python" -m unittest discover -s tests -v > ../evidence/upstream-tests-normalized-tmp.log 2>&1
)
```

Then build AppYard, generate the initial seed, capture the local Electron workflow checks, and package. The package command consumes the current compiled frontend and Electron code:

```sh
npm run build
node scripts/prepare-mailmcp-demo.mjs
node scripts/smoke-mailmcp-demo.mjs
node scripts/package-mailmcp-demo.mjs
```

Preparation recreates only `bundle/workspace/` and the seed/manifest files; it preserves the independently prepared Python runtime and wrapper. It copies only tracked upstream files, rejects a changed revision or dirty tracked source, excludes Git metadata and caches, and records a SHA-256 source inventory. The package script requires an actual passing local demo workflow report and a ready runtime.

The result is under `release/mailmcp-demo/mac-arm64/AppYard Demo.app`. Copy the app into `/Applications` or `~/Applications` and open it normally. The standard AppYard installation and profile remain separate. This runtime bundle currently targets Apple Silicon.

## Evidence and limits

The upstream suite ran **204 tests: 196 passed, 8 skipped, 0 failed**. The eight skips require Windows facilities. The captured log and parsed report are bundled under `workspace/evidence/`; they remain separate from the local demo workflow report displayed in AppYard Review.

Local demo checks establish the exercised preview/runtime workflows only. They do not replace the skipped Windows checks. Classic Outlook COM handoff, Windows DPAPI persistence, and live GenAI inference are outside the offline macOS demonstration. Fictional attachment names are illustrative. There is no production-readiness or human-approval claim.

## Reset

Quit and reopen AppYard Demo to reset the fictional mailbox and in-memory drafts. To restore the entire preloaded project, quit the app, move its isolated `~/Library/Application Support/fleetharness-mailmcp-demo` profile folder to a backup location, and reopen it. Preserve that folder if you want to keep your local review notes. Do not remove the regular AppYard profile.
