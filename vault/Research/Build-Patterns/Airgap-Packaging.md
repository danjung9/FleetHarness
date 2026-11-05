---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Prove a clean disconnected install before claiming portability, and use Zarf or UDS only where the target warrants them."
---

# Airgap packaging

## Bottom line

[R] Package the delivered application independently from the development factory. [R] Demonstrate installation and useful operation without external networking, with all required runtime dependencies already included. [V] Zarf packages software resources for disconnected deployment, while UDS Core adds a broader platform with identity, networking, policy and monitoring: https://docs.zarf.dev/ref/deploy/ and https://github.com/defenseunicorns/uds-core. [R] Use an OCI image archive for the smallest laptop demo and a Zarf package when the target is a prepared Kubernetes environment.

## Define the claim precisely

[R] Use three labels: offline runtime means normal application use works without the internet; disconnected install means the application can be installed from supplied artifacts without downloads; target validation means this has been demonstrated on the actual intended environment. [R] Do not call a cached development laptop a clean airgap installation. [A] The team's intended Fleet deployment target, architecture and transfer process are not confirmed.

## Smallest useful bundle

[R] A proposed application bundle should include:

- [R] A versioned image archive for the target CPU and an explicit container-runtime prerequisite, or a tested native runtime bundle.
- [R] Local UI assets, migrations, seed fixtures, schema and any OCR/solver/model resources required during normal use.
- [R] Checksums and a signed release manifest tied to source and accepted test evidence.
- [R] Dependency inventory, notices, applicable source obligations and dated vulnerability findings.
- [R] Install, start, health check, backup, restore, update, rollback and removal instructions.
- [R] A synthetic smoke test with exact expected results and a list of unsupported functions.

[R] Keep state outside disposable application layers and back it up before an update. [R] Image rollback alone does not reverse a database migration; test data restoration or provide a compatible forward path. [R] Include the runtime installer or clearly declare it a target prerequisite, instead of claiming the image archive supplies a complete operating environment.

## Zarf path

[V] Zarf's documented deployment model combines a CLI, an initialization package and an application package. The init package supplies or connects infrastructure such as a registry; the application package carries images, manifests and other specified resources: https://docs.zarf.dev/ref/deploy/. [V] The package creation tutorial uses a `zarf.yaml` definition to declare components and images: https://docs.zarf.dev/tutorials/0-creating-a-zarf-package/.

[R] Proposed workflow, requiring version-specific testing before use:

1. [R] Build and test an application image for the target architecture; record its digest.
2. [R] Write a minimal `zarf.yaml` containing that image and deployment manifests, plus any local files and charts actually needed.
3. [R] Create the package while connected, inspect contents and SBOM, and sign the approved artifact using the owner's approved signing process.
4. [R] Stage the matching CLI and init package if the target is not already initialized. Transfer artifacts through the target's authorized human process.
5. [R] Verify signature and digest, review package actions, then deploy locally on the disconnected prepared target.
6. [R] Run acceptance, restart, backup/restore and rollback checks there, and retain results with the package digest.

[V] The CLI documents `zarf package create`, architecture selection and SBOM output, and `zarf package deploy` accepts local archives: https://www.docs.zarf.dev/commands/zarf_package_create and https://www.docs.zarf.dev/commands/zarf_package_deploy/. [R] Treat package lifecycle actions as executable code subject to review. [R] Preserve interactive review for the first deployment; do not copy automation flags that skip review into the officer's default flow.

[R] Zarf cannot invent a dependency omitted from the manifest or make an application independent of a hard-coded cloud service. [R] Test external fonts, CDNs, authentication, license checks, image pulls, model downloads and telemetry explicitly. [R] Local signature verification needs staged trust material and an offline verification method; do not assume an online transparency or identity service is reachable.

## UDS path

[V] UDS Core describes a Zarf-packaged platform, deployed using UDS CLI, with an operator for networking, SSO and monitoring configuration and a policy engine for enforcement: https://github.com/defenseunicorns/uds-core. [R] Fit the application into that environment when a mission owner already has or intends to operate it; do not make installing a new platform a prerequisite to validating the core user workflow.

[V] The versioned UDS Core v1.14 production prerequisites list a baseline of 12+ vCPUs, 32+ GiB memory and 100+ GiB persistent storage across worker nodes, before application sizing: https://docs.defenseunicorns.com/core/v1-14/getting-started/production/prerequisites/. [R] Do not generalize that production baseline to every reduced or development configuration, or promise a full UDS production installation on an unspecified laptop.

[R] A transition package should identify the UDS version/flavor, target Kubernetes distribution, application identity needs, permitted network flows, storage and resource requirements. [A] A selected platform version, deployment credentials, cluster access, reduced-profile sizing and application integration are not verified. [R] See [[Research/Build-Patterns/Reuse-Research]] for the separate UDS Core license review.

## Architecture and disconnected evidence

[R] Build arm64 and amd64 deliverables separately when both are needed, and test each natively if available. [R] A successful emulated run on an Apple silicon laptop is useful development evidence but does not prove target performance. [R] Keep the runtime, model blobs and application images in distinct inventory entries so a large optional model is not silently required for a deterministic app.

[R] Record a clean test: environment prerequisites, network-denial method, install duration, transferred bytes, first successful task, restart result and observed outbound attempts. [R] Map that evidence directly to Speed to Fleet in [[Event/Judging]]. [A] No OCI archive, Zarf package, UDS bundle or disconnected deployment was created or run for this research.

## Sources

- [V] https://docs.zarf.dev/ref/deploy/
- [V] https://docs.zarf.dev/tutorials/0-creating-a-zarf-package/
- [V] https://www.docs.zarf.dev/commands/zarf_package_create
- [V] https://www.docs.zarf.dev/commands/zarf_package_deploy/
- [V] https://github.com/defenseunicorns/uds-core
- [V] https://docs.defenseunicorns.com/core/v1-14/getting-started/production/prerequisites/
- [P] [[Event/Rules]] and [[Event/Judging]].
