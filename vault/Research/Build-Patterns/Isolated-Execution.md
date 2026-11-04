---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Use a disposable job directory plus a real execution boundary, with a trusted controller outside it."
---

# Isolated execution on a Mac

## Bottom line

[R] Give each job a disposable workspace, but also constrain the processes that can read, write and use the network. [R] For Thursday, use an already available Docker-compatible runtime with a restricted worker, or the coding tool's verified native sandbox if container integration threatens the deadline. [V] Docker Desktop runs Linux containers inside a Linux VM on macOS; mounted host files remain accessible according to their permissions: https://docs.docker.com/desktop/setup/install/mac-permission-requirements. [A] The team's Mac architecture, memory, OS version and installed container runtime were not inspected.

## Distinguish the boundaries

[R] Treat a workspace as organization and recoverability, a sandbox as enforceable access policy, and a VM as a separate operating-system boundary. [R] Keep the UI and trusted controller outside the generated application's origin and execution context. [R] Never let generated code inherit the controller's credentials, approval database or container-management socket.

| Option | Verified capability | Cost or limitation | Thursday use |
| --- | --- | --- | --- |
| [R] Fresh directory or Git worktree | [A] Proposed job organization; no local worktree experiment performed | [R] Alone it grants no security boundary; reject escaping symlinks and do not expose parent repositories | [R] Use for every job, inside another boundary |
| [V] Native coding-tool sandbox | Official non-interactive documentation supports workspace-write execution and structured event output. https://developers.openai.com/codex/noninteractive/ | [A] Installed version, effective read permissions and network policy need verification; workspace-write does not imply that unrelated host files are unreadable | [R] Fastest fallback for a supervised prototype, after explicit boundary tests |
| [V] Docker Desktop | Linux VM under macOS, restricted host file sharing. https://docs.docker.com/desktop/setup/install/mac-permission-requirements | [A] Availability and applicable Desktop subscription terms not verified; VM sharing and mounts require care | [R] Prefer if already set up |
| [V] Colima with Lima | Lima supplies Linux VMs, file sharing, port forwarding and containerd; Colima manages container runtimes. https://lima-vm.io/docs/ and https://colima.run/docs/ | [R] Review automatic home sharing and port forwarding; do not accept defaults without checking | [R] Good alternative if a team member already operates it |
| [V] Apple container | Runs Linux containers using lightweight VMs, requires Apple silicon and supports macOS 26. https://github.com/apple/container | [A] API/Compose compatibility with the proposed controller is not verified | [R] Evaluate later unless already proven locally |
| [R] Dedicated Linux VM per job | [V] Lima can create Linux VMs. https://lima-vm.io/docs/ | [R] More startup, image and resource management, but a cleaner independent guest boundary | [R] Use later for higher-risk or less trusted workloads |

## Recommended worker policy

[R] Build an image containing only the approved compiler/interpreter, test tools and cached dependencies. Run as a non-root user with a read-only root filesystem, a writable job volume and a size-limited temporary filesystem. Drop Linux capabilities, disable privilege escalation, cap CPU/memory/PIDs and deny networking during application tests.

[V] The Docker run reference documents controls including `--network`, `--read-only`, `--cap-drop`, `--security-opt`, `--pids-limit`, `--cpus` and `--memory`: https://docs.docker.com/reference/cli/docker/container/run. [R] Configure these through a fixed controller template rather than accepting arbitrary flags from the agent.

[R] Never mount the user's home directory, SSH agent, cloud configuration, credential stores, Docker socket or controller directory. [R] Keep the acceptance driver in a separate trusted process and send only test inputs to the constrained application through a narrow HTTP or command interface. Keep holdout expectations outside the candidate environment. [R] An in-process unit test that imports generated code is useful development feedback, but does not protect the test process from that code. [R] Restrict output collection to regular files inside the job directory, with size limits and path normalization.

## Network design without pretending an API is offline

[R] Separate three activities:

1. [R] Research and dependency acquisition: connected, explicit, audited and subject to technical review.
2. [R] Model requests: a controller-owned client or narrowly scoped broker, allowed only to the configured endpoint with request and usage limits.
3. [R] Generated code and tests: no network by default, with no model key or broker-control capability available to generated processes.

[R] A `--network none` container cannot call a hosted model. The controller can pass approved context to the model and dispatch bounded tool actions to the sandbox, or a proven worker/broker integration can supply narrowly authorized requests. [A] The broker arrangement is a proposed design, not a verified feature of the team's installed CLI. [R] If using the existing CLI directly, document its actual key exposure and sandbox properties instead of claiming stronger isolation.

## Boundary checks before calling this isolated

[R] Use synthetic canary files rather than real secrets. Attempt to read a canary outside the authorized workspace, write outside it, follow an escaping symlink, contact an unapproved endpoint, access the container socket and continue running after Stop. [R] Each denied operation should produce controller evidence; a prompt asking the agent not to try is insufficient.

[R] Bind preview ports to loopback and place generated previews in a separate origin with restrictive browser permissions. [R] Use an isolated browser profile without personal sessions. [R] A localhost service is still reachable by local processes, so keep controller endpoints authenticated and scoped.

## Limits and escalation

[R] Containers reduce risk but still share a guest kernel; a VM does not make unsafe mounts, exposed sockets or unrestricted egress safe. [R] Escalate any need for privileged mode, host networking or broad filesystem access to the technical owner. [R] Keep the last approved artifact when a job is killed; do not resume stopped jobs automatically after a controller restart.

## Sources

- [V] https://docs.docker.com/desktop/setup/install/mac-permission-requirements
- [V] https://docs.docker.com/reference/cli/docker/container/run
- [V] https://docs.docker.com/engine/security/
- [V] https://lima-vm.io/docs/
- [V] https://colima.run/docs/
- [V] https://github.com/apple/container
- [V] https://developers.openai.com/codex/noninteractive/
