# Windows installation and team releases

AppYard's Windows host is distributed as an x64 NSIS installer. This is the application that runs your challenges, distinct from the standalone application ZIPs produced by **Download executable**.

## Download and install

The shared download location is the [latest successful Windows release](https://github.com/danjung9/FleetHarness/releases/latest). Download `AppYard-<version>-windows-x64-setup.exe`, `SHA256SUMS.txt`, and `windows-build.json` from that release. Earlier installers remain under [all releases](https://github.com/danjung9/FleetHarness/releases) for rollback.

FleetHarness is a **private repository**. Sign in to GitHub with an account that can read it; an anonymous request or an account without access may return 404. These URLs do not provide public distribution. At implementation time the repository had no published releases. The latest link will work only after an authorized main-branch publication succeeds; adding this workflow alone does not prove publishing is active.

1. Use a Windows x64 machine. Download the installer and checksum from the same release.
2. In PowerShell, run `Get-FileHash -Algorithm SHA256 -LiteralPath '.\<installer-name>.exe'` and compare its hash with the release checksum. A matching checksum identifies the release bytes; it is separate from a publisher signature.
3. Close AppYard if it is running, then run the installer. Install for your current Windows account and retain the same installation location for later upgrades.
4. Open AppYard and inspect **Model settings → Installed build**. It shows the installed version, full commit revision, and build identity. These should match the release metadata.
5. Connect your model provider or ChatGPT account, then run a challenge. See [desktop setup](desktop.md) for the app workflow and external runtime requirements below.

The host includes Electron and its Node runtime. Pi's shell tools also require **Git Bash**: install [Git for Windows](https://git-scm.com/install/windows) in its standard location, or make a compatible `bash.exe` available on `PATH`. Browser journey verification needs either the matching Playwright Chromium runtime or an installed **Google Chrome**; AppYard tries Chromium first and Chrome second. Development and CI install Chromium with `npm run setup:browser`. These external tools are not installed by the AppYard installer.

Windows publisher signing is not configured by this change. Windows may show an unknown-publisher or SmartScreen prompt. Inspect the source release and checksum; follow your organization's software policy if execution is blocked. Signing and reputation are separate enablement work, not proof supplied by the automated tests.

## Manual upgrade and rollback

Download the newer installer from the shared location, close AppYard, back up `%APPDATA%\fleetharness\`, and run the installer. Open the app and confirm the new version in Model settings. There is **no in-app background updater** in this phase.

The application ID stays `dev.fleetharness.desktop`, the package name stays `fleetharness`, and the default data directory stays `%APPDATA%\fleetharness\`. Saved challenges, model settings, workspaces, sessions, and AppYard's encrypted credential file are retained. Credentials encrypted for one Windows account should be used under that same account. Do not delete the data directory as part of an upgrade.

For a rollback, choose an earlier installer from Releases, close AppYard, and preserve a backup of the current data directory before running it. State is currently schema version 1 and this change does not migrate it. Future migrations may require restoring the matching backup; keeping an older installer does not by itself guarantee backward state compatibility.

## Team workflow

Every relevant team change must be merged or pushed to **`main`** to enter the shared installer. Feature branches are validated through pull requests to `main`; the Windows workflow never merges them automatically. A release contains the entire immutable source commit, so it includes preceding main-branch changes cumulatively.

The Windows workflow runs for every pull request to `main`, every push to `main`, and manual dispatch. It has no path filter. Windows runners perform a clean dependency install, application build, runtime and harness regression suites, NSIS packaging, and deterministic installed-app smoke/upgrade validation. The fixture provider uses loopback requests and needs no real model credentials. A successful PR creates review artifacts, not a published release. Dispatching from another branch can validate that branch but cannot publish it.

Each build records its full SHA and source link, version, build identity, and workflow run identity. CI versions have three numeric components: `1 + floor(runNumber / 65536)`, `runNumber % 65536`, and `2 × runAttempt`. For example, run 42's first attempt is `1.42.2` and its second attempt is `1.42.4`. The upgrade fixture's patch component is one lower. Numeric component comparison gives sortable release versions within Windows' component limits. Local builds use a `0.*.*` development version. Versions are generated during packaging; no version-bump commit is pushed to the repository. The installer, checksum, and `windows-build.json` provenance are uploaded together to a distinct release tagged `windows-v<version>-r<runId>-a<runAttempt>`.

The publisher uploads into a draft, verifies asset hashes, publishes with `make_latest: false`, verifies GitHub reports the release immutable, and only then promotes it. Publication jobs are serialized. The publisher checks release ordering and source ancestry, so an older slow build cannot replace a newer successful download. Failed or cancelled validation never promotes a release. An interrupted draft can remain for diagnosis, while the last successful release remains downloadable.

GitHub's `releases/latest` is a repository-wide channel. Reserve it for this Windows workflow; other release publishers must use `make_latest: false`. Published Windows releases and tags must never be replaced. Do not delete earlier releases to make room for new ones.

The Vercel deployment workflow stays independent. This Windows gate does not change web deployment timing or enforce a general Vercel deployment gate.

Successful installer artifacts are retained in Actions for 30 days, and smoke diagnostics for 14 days. Published releases are the long-term rollback downloads. If publication fails, rerun **all jobs**, so the new attempt builds and validates its own version and artifact before publication. Do not rerun just the publishing job against an earlier attempt's artifact.

## Publishing enablement

The implementation account could verify private visibility and push access, but did not have repository administration permission. The Actions-permissions and immutable-releases settings endpoints returned 404; that does not establish whether those settings are disabled or merely inaccessible. A repository administrator must complete and verify the following before enabling publication:

1. Enable GitHub Actions for the repository and allow the workflow's actions. Permit `GITHUB_TOKEN` to receive `contents: write` for the publication job. Build/test jobs request only read access; PR runs receive no publication credentials.
2. In repository **Settings → Releases**, select **Enable release immutability** ([GitHub instructions](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)). The publisher requires GitHub to confirm immutability before promotion. GitHub immutable release assets and associated tags cannot be modified after publication.
3. Set the repository Actions variable **`WINDOWS_RELEASES_ENABLED`** to **`true`** only after the above setup. Without it, main builds still validate and retain Actions artifacts, but publishing is skipped.
4. Run the Windows workflow from `main`. Inspect every validation job and verify the release SHA, assets, checksums, immutability, and latest URL using an account with read access. Record the successful run before calling publishing active.

Code-signing credentials are optional for producing an unsigned installer, but required for a publisher-signed distribution. Configure signing separately and rerun the installer checks. No signing secret is required by PR validation.

## Local packaging and validation

Use the locked dependencies and the same supported Node release as CI (Node 24). Keep the source checkout clean when creating a distributable build so its recorded commit describes the packaged source.

```powershell
npm ci
npm run setup:browser
npm run build
npm test
npm run test:harness
npm run dist:win:baseline -- --version 0.1.2
npm run dist:win -- --version 0.1.2
npm run test:windows
```

The build output goes to `release/`, with upgrade fixture A in `release-baseline/`. The explicit test version above produces A `0.1.1` and B `0.1.2`. Ordinary `npm run dist:win` generates a local version from the UTC day and two-second time slot. Do not run simultaneous builds into the same output folder. Use the documented packaging commands to generate provenance and checksums; invoking electron-builder directly bypasses this preparation. Local packaging does not publish to GitHub. The existing `npm run dist` macOS ARM64 path is retained; use a macOS build machine for that target.

Run installer smoke checks in a **disposable Windows account or runner**. The check refuses an existing AppYard installation and installs/uninstalls its own test instance. It uses isolated application data and an isolated installation directory. It installs version A, creates saved challenges/settings/workspace data, replaces it with version B, and checks preserved state. It also runs a mock-provider build, independent verification, stop/restart, source export, and executable export/launch. Read the command's report for the exact versions and scope validated. A same-source A/B upgrade checks the installer and current state contract; it does not prove compatibility with arbitrary older or future schemas.

By default, the smoke script reads baseline metadata from `release-baseline/windows-build.json` and candidate metadata from `release/windows-build.json`. To test a retained real release as the baseline, pass `npm run test:windows -- --previous-installer 'C:\downloads\<older-installer>.exe' --installer 'C:\downloads\<newer-installer>.exe'`. Keep the matching release metadata beside each installer.

## Troubleshooting and external capabilities

- **Latest release is 404:** confirm GitHub sign-in and repository access, then check whether a main-branch publishing run has succeeded. Before activation, download a validation artifact from Actions or build locally.
- **Installed version is old:** a newly built installer does not update installed copies automatically. Close AppYard, run the newer installer, and verify Model settings again.
- **Checksum differs:** download the installer and checksum from the same immutable release again. Do not use the mismatched file.
- **Installer cannot replace files:** close AppYard and any generated-app packaging operation before retrying. Keep your data backup.
- **Saved data appears missing:** check the Windows account and the Workspace storage path shown in Model settings. A set `FLEET_USER_DATA` environment variable selects a different directory. Do not overwrite either directory while investigating.
- **Model build fails:** the deterministic release fixture does not test hosted model authentication, account allowance, service availability, or model output quality. Reconnect in Model settings and inspect the run logs.
- **Browser verification cannot launch:** install Google Chrome or the compatible Playwright Chromium runtime. Development and CI install Chromium with `npm run setup:browser`; inspect the error for a missing browser or an organization policy blocking execution.
- **Pi cannot find a shell:** install Git for Windows with Git Bash, then restart AppYard so it sees any updated `PATH`.
- **Executable export cannot obtain Electron:** the first generated-app package may need network access to Electron's runtime download. Later attempts can reuse the download cache.

Primary references: [electron-builder NSIS configuration](https://www.electron.build/nsis/), [GitHub release links](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases), [immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases), and [release API semantics](https://docs.github.com/en/rest/releases/releases).
