---
type: research
status: draft
owner: mukul
updated: 2026-11-04
summary: "Offline application use is the near-term goal; offline software generation needs a separately tested local model and cached toolchain."
---

# Offline local models

## Bottom line

[R] Separate building software while connected from using the delivered application while disconnected. [P] Speed to Fleet is worth 20% and explicitly concerns disconnected edge fielding, per [[Event/Judging]]. [R] For Thursday, prioritize a useful application that cold-starts offline, then add local generation only if the hardware and task benchmark support it. [A] Local inference is available in current public tools, but FleetHarness quality, latency and hardware fit have not been measured.

## Three different offline promises

| Promise | What must already be local | Recommended Thursday claim |
| --- | --- | --- |
| [R] Application use | App runtime, assets, database, required parsers/solver and fixtures | [R] Primary goal, demonstrate with networking disabled |
| [R] Model-assisted application use | Everything above plus model weights, tokenizer, templates and inference runtime | [R] Optional only after clean offline startup and task checks |
| [R] Autonomous software generation | Everything above plus compiler, package caches, tests, browser binaries, documentation and sandbox | [R] Stretch demonstration on one narrow task; otherwise mark unverified |

[R] A cloud-built deterministic scheduler can still offer substantial offline value. [R] A locally hosted language model does not make a package manager, web research step or external identity provider available offline.

## Runnable candidates as of November 4, 2026

[V] The disk sizes below are rounded registry listings retrieved November 4, not local measurements. [R] Memory columns are conservative starting budgets for a Mac with unified memory, including room for the OS, a modest context and development tools; they are estimates, not vendor minimums or guarantees. [A] The actual Mac's specifications are not verified.

| Model and exact candidate tag | Published artifact size | Suggested total laptop memory | Role and limitation |
| --- | --- | --- | --- |
| [V] `qwen2.5-coder:7b` | 4.7 GB. https://ollama.com/library/qwen2.5-coder | [R] 16 GB | [R] Small edits and fixture generation; retain deterministic checks and short context |
| [V] `qwen3.5:9b-q4_K_M` | 6.6 GB, Q4_K_M; card shows 8.95B language model and a separate projector. https://ollama.com/library/qwen3.5:9b-q4_K_M | [R] 16 GB minimum trial, 24 GB preferable alongside tools | [R] Current general model candidate; evaluate structured extraction and tool-call compatibility |
| [V] `qwen2.5-coder:14b` | 9.0 GB. https://ollama.com/library/qwen2.5-coder | [R] 24 to 32 GB | [R] Narrow coding and repair candidate; not a current frontier-quality claim |
| [V] `gpt-oss:20b` | 14 GB. https://ollama.com/library/gpt-oss | [R] 24 to 32 GB for the factory | [R] Reasoning/tool-use candidate; format and tool adapters must be tested |
| [V] `qwen3-coder:30b` | 19 GB; 30B total with 3.3B active. https://ollama.com/library/qwen3-coder | [R] 32 GB minimum trial, 48 GB preferable with VM and browser | [R] Stronger-capacity coding candidate at a substantial memory cost |

[V] OpenAI says gpt-oss-20b can run with 16 GB of memory and releases it under Apache 2.0. That vendor minimum is not a claim that an entire development factory fits comfortably on a 16 GB Mac: https://openai.com/index/introducing-gpt-oss/. [V] Qwen3.5-9B's official model card identifies Apache-2.0: https://huggingface.co/Qwen/Qwen3.5-9B. [R] Check the exact downloaded model, quantization distribution and runtime licenses before redistribution.

[V] The generic `qwen3.5:9b` page currently lists 7.6 GB, whereas the explicitly quantized tag above lists 6.6 GB. This illustrates why a mutable tag alone is insufficient packaging evidence: https://ollama.com/library/qwen3.5:9b and https://ollama.com/library/qwen3.5:9b-q4_K_M. [R] Record the complete manifest and blob hashes rather than copying a rounded size into a release specification.

## Memory and hardware reasoning

[R] For an initial weight-only estimate, parameter count multiplied by bits per weight divided by eight gives bytes before quantization metadata, unquantized tensors, runtime buffers and context cache. [R] Do not size a mixture-of-experts model using only its active parameter count; verify resident memory for the actual runtime. [R] Start with a 4K to 8K context and one worker, then measure peak memory before increasing either.

[V] llama.cpp supports Apple silicon through Metal and CPU execution across several architectures, plus quantized weights: https://github.com/ggml-org/llama.cpp. [V] MLX LM provides generation and quantization tools built for Apple silicon: https://github.com/ml-explore/mlx-lm. [R] Use a native local inference process on loopback as the first Mac configuration; do not assume GPU access through a Linux container matches native performance. [A] Intel Mac throughput, GPU support and acceptable thermals for this workload are not verified.

## What quality is lost

[A] Expect smaller local models, short context limits and aggressive quantization to risk weaker planning, repository navigation, multi-file repair, instruction adherence and ambiguous extraction. The size of each loss is not verified for the listed models and FleetHarness tasks. [R] Do not invent a percentage degradation or infer repository-agent performance from a code-completion score.

[V] A November 2, 2026 coding-agent preprint compares BF16 with 4-bit AWQ/GPTQ for Qwen2.5-Coder and Devstral on OJBench over three seeds. It detects no statistically significant final-accuracy loss, but reports Qwen-7B one-shot successes falling from 17 to zero under AWQ while loop-based successes rise from 10 to 25. These are counts in that experiment, not FleetHarness rates or proof of equivalence: https://arxiv.org/abs/2611.02368. [R] Quantization may change how much repair is needed even when aggregate success looks similar; do not promise a uniform quality penalty or uniform free compression.

[V] A separate 2026 program-repair study evaluates 13 quantization configurations across six models and two benchmarks. It reports memory reductions up to 85%, but increased inference time and energy in its tested setup, with repaired-problem sets changing despite similar totals: https://arxiv.org/abs/2606.27205. [R] Lower memory use does not establish lower end-to-end latency on the Mac.

[V] An October 8, 2026 preprint on fifteen data-engineering tasks reports 1,500 scored attempts, an 85.3% best artifact-level success rate and 69.3% for a quantized 9B configuration using about 6.5 GB. Closed-loop gains over one-shot generation range from 26.7 to 52.0 percentage points among models above 2B parameters: https://arxiv.org/abs/2610.11482. [R] This is encouraging evidence for narrow, checkable local work, with a remaining failure fraction. [A] The detailed configurations and artifacts were not audited here; these abstract-level author reports are not a Mac benchmark or evidence that the particular registry tags above achieve those rates.

[R] Offline operation also removes live documentation, vulnerability lookups, package downloads and cloud fallback. That is a capability loss even when the same model output would be correct. [R] Make fallback explicit: save the unresolved job for later human review instead of silently sending it to a cloud service.

[R] Compare the connected baseline and one local candidate on the same fixed set: four parsing cases including ambiguity, four schedule cases including infeasibility and four repair tasks including a deliberately failing regression. Record exact model/quantization, context, acceptance pass rate, invalid tool calls, time to accepted result, memory and intervention. [R] Twelve tasks are an initial engineering screen, not a statistically representative benchmark.

## Actual no-network checklist

[V] Ollama documents local-only operation using `OLLAMA_NO_CLOUD=1`, and loopback binding by default: https://docs.ollama.com/faq. [R] After configuration and restart, verify cloud is disabled, use a locally stored model rather than a cloud-tagged model, and deny outbound networking independently.

[R] Pre-stage the inference executable, model blobs, templates/tokenizer, application image, dependency cache and required browser. Reboot or cold-start the intended runtime with external networking disabled and run the complete workflow, including export and restart recovery. [R] Record attempted outbound calls and make unavailable features visibly unavailable.

[A] No models were downloaded or executed during this research. Tokens per second, peak memory, task quality, power consumption and the team's ability to stage the artifacts remain not verified.

## Sources

- [V] https://ollama.com/library/qwen2.5-coder
- [V] https://ollama.com/library/qwen3.5:9b-q4_K_M
- [V] https://ollama.com/library/qwen3.5:9b
- [V] https://ollama.com/library/gpt-oss
- [V] https://ollama.com/library/qwen3-coder
- [V] https://openai.com/index/introducing-gpt-oss/
- [V] https://huggingface.co/Qwen/Qwen3.5-9B
- [V] https://github.com/ggml-org/llama.cpp
- [V] https://github.com/ml-explore/mlx-lm
- [V] https://docs.ollama.com/faq
- [V] https://arxiv.org/abs/2611.02368 (November 2, 2026 preprint; abstract-level review).
- [V] https://arxiv.org/abs/2606.27205 (July 3, 2026 revision; abstract-level review).
- [V] https://arxiv.org/abs/2610.11482 (October 8, 2026 preprint; abstract-level review).
- [P] [[Event/Judging]] and [[Event/Rules]].
