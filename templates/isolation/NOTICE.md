`seatbelt-base.sbpl` and `seatbelt-minimal.sbpl` are unmodified copies from
[OpenAI Codex rust-v0.166.0](https://github.com/openai/codex/tree/rust-v0.166.0/codex-rs/sandboxing/src),
respectively `seatbelt_base_policy.sbpl` and `seatbelt_read_only_platform_defaults.sbpl`.
They are distributed under the Apache License 2.0, included in `LICENSE.codex`.

AppYard adds candidate filesystem grants and syscall restrictions in
`electron/macos-isolation.ts`. The Node compatibility preload uses fork/exec so
normal subprocesses remain usable when the kernel denies `posix_spawn`, `setsid`
and `setpgid`. The kernel restrictions, rather than the JavaScript preload,
prevent descendant processes from leaving the supervised process group.
