#!/bin/sh
# Run Codex with the Fleethacker event profile. The normal ~/.codex login is untouched.
CODEX_HOME="$HOME/.codex-fleethacker" exec codex "$@"
