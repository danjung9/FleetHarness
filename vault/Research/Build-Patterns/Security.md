---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Keep untrusted text and generated code away from credentials, controller authority and release decisions."
---

# Security

## Bottom line

[R] Assume public pages, source repositories, user documents and generated code may be hostile. [R] Enforce tool authority, filesystem limits, network policy and release approval outside the model. [V] A published coding-editor attack study reports malicious-command execution success as high as 84% in its tested configurations, which demonstrates a real attack path rather than a universal current rate: https://arxiv.org/abs/2509.22040. [P] Rule 4 restricts permitted data and rule 6 requires human authority, monitoring, escalation and shutdown, per [[Event/Rules]].

## Assets and trust boundaries

[R] Protect the user's laptop, allowed project files, model-service credentials, canonical tests, approval records and final artifacts. [R] Trust the controller only after ordinary engineering review; do not trust model-generated policy, logs or UI claims as authorization. [R] Give retrieved material a source identity and mark it as data, never a new instruction layer.

[V] OWASP describes direct and indirect prompt injection, including attacks through content the model processes, and says retrieval and fine-tuning do not fully mitigate it: https://genai.owasp.org/llmrisk/llm01-prompt-injection/. [V] OWASP attributes excessive agency to excessive functionality, permissions and autonomy: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/.

## Threat model for this design

| Entry point | Concrete risk | Proposed enforced control | Residual risk |
| --- | --- | --- | --- |
| [R] Repository documentation | Instructions request host reads, uploads or permission changes | Read-only discovery; no execution authority in research; scoped executor later | [R] The model can still misunderstand requirements |
| [R] Imported document | Hidden text changes an extraction or test expectation | Separate source data from contract; canonical expected results reviewed by people | [R] Plausible misinformation may pass superficial review |
| [R] Dependency installer | Lifecycle script executes or downloads an unpinned binary | Review hooks, pin artifacts, isolate build, restrict egress | [R] A pinned dependency may already be malicious |
| [R] Generated application | Reads keys, contacts controller or forges a result | No inherited secrets; separate origin; read-only evidence store; authenticated controller | [R] Host or runtime vulnerabilities remain |
| [R] Test execution | Agent edits tests, monkey-patches runner or fabricates JSON | Trusted tests outside workspace; collect exit state outside candidate; fresh environment | [R] Tests still have incomplete coverage |
| [R] Build output | Symlink escape, giant archive or executable disguised as evidence | Normalize paths, reject symlinks, limit output sizes and file types | [R] Accepted content still needs safe rendering |
| [R] UI preview | Script steals an approval token or tricks the reviewer | Separate origin, sandboxed preview, no controller tokens in preview | [R] Social engineering of the human remains possible |
| [R] Release bundle | Credentials, vulnerable libraries or altered files enter transfer | Secret scan, SBOM, digest manifest, signature verification and human release gate | [R] Scanners and signatures do not prove benign behavior |

## Secrets without handing keys to generated code

[R] Keep model credentials in a controller-owned process or restricted broker. Pass only approved requests and results into the execution environment. [R] Do not place keys in source, job manifests, arguments visible in process lists, screenshots, prompts, fixtures or exported logs. [R] Use short-lived, narrowly scoped credentials where the service supports them, and require owners to enter their own credentials.

[R] Redact logs before storage, and avoid capturing entire environment-variable dumps. [R] Use synthetic canary strings to test attempted exfiltration instead of real keys. [R] Revoking future requests after Stop reduces ongoing access, but requests already sent to an external service may still complete.

## Supply chain and provenance

[V] SLSA defines increasing supply-chain security guarantees and provenance formats: https://slsa.dev/spec/v1.2/. [R] Capture source revision, dependency locks, image digests, build inputs, test outputs and artifact hashes. [R] Call this recorded provenance; do not claim a SLSA level without satisfying its actual requirements.

[R] Verify an artifact's identity against the intended source and trusted builder, then separately evaluate vulnerabilities and behavior. [R] Keep offline scan database dates visible. [R] An SBOM is an inventory, a signature authenticates a signer and bytes under a trust policy, and neither establishes operational suitability.

[R] Run final acceptance checks from a separate trusted driver, rather than importing candidate code into the process that owns the verdict and credentials. A read-only test file does not stop code in the same interpreter from changing runtime behavior. [R] Preserve unit tests as feedback, then verify user-visible outcomes across the execution boundary.

## Thursday security demonstration

[R] Demonstrate these checks with harmless synthetic material:

1. [R] A fixture containing instruction-like text cannot alter the approved specification or enable tools.
2. [R] A generated process cannot read an out-of-scope canary file or write outside its workspace.
3. [R] A test-time network request fails, while the application still performs its promised offline workflow.
4. [R] Attempted changes to canonical tests fail or invalidate the candidate.
5. [R] A Stop command terminates a long-running worker and its child process; export remains disabled.
6. [R] A changed artifact invalidates earlier test evidence and release approval.

[R] Keep active testing confined to team-owned disposable environments. [A] These checks are proposed and were not executed during this research. [R] Do not claim a production security assessment from a six-check demonstration.

## Incident response and ownership

[R] On a boundary violation, block dispatch, stop the job, quarantine outputs and notify the designated technical owner through the agreed human process. [R] Preserve redacted controller events, rotate any potentially exposed credentials through their owner and require explicit approval before restarting. [A] A named technical owner and escalation contact still need team assignment.

## Sources

- [V] https://arxiv.org/abs/2509.22040 (September 2025; current abstract revision April 28, 2026).
- [V] https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- [V] https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- [V] https://slsa.dev/spec/v1.2/
- [P] [[Event/Rules]].
