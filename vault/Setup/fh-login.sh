#!/bin/sh
# Log the Fleethacker Codex profile in with the API key on the clipboard.
# Copy the key first, then run this yourself. The key is never printed.
set -eu
H="$HOME/.codex-fleethacker"
mkdir -p "$H"
chmod 700 "$H"
case "$(pbpaste)" in
  sk-*) ;;
  *) echo "The clipboard does not hold an OpenAI key (it should start with sk-). Copy the key and run this again."; exit 1 ;;
esac
pbpaste | CODEX_HOME="$H" codex login --with-api-key
pbcopy < /dev/null
echo "Clipboard cleared."
CODEX_HOME="$H" codex login status
