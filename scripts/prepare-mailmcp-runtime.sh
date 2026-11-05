#!/bin/bash
# Build a self-contained Apple Silicon Python runtime for the installed demo.
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
demo_root="${MAILMCP_DEMO_OUTPUT:-"$project_root/output/mailmcp-demo"}"
source_root="${SOURCE_ROOT:-"$demo_root/source"}"
runtime_root="$demo_root/bundle/python"
managed_root="$demo_root/python-managed"
python_version="3.12.12"
distribution="cpython-$python_version-macos-aarch64-none"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "This demo runtime package targets macOS on Apple Silicon." >&2
  exit 1
fi
if [[ ! -f "$source_root/requirements.txt" ]]; then
  echo "Prepare the MailMCP checkout before running this script: $source_root" >&2
  exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
  echo "Install uv before preparing the standalone runtime." >&2
  exit 1
fi

mkdir -p "$demo_root/evidence" "$demo_root/bundle"
if [[ ! -x "$runtime_root/bin/python3.12" ]]; then
  uv python install --no-bin --install-dir "$managed_root" "$python_version" > "$demo_root/evidence/portable-python-install.log" 2>&1
  cp -R "$managed_root/$distribution" "$runtime_root"
fi

# Install only into our private copied distribution; leave uv's managed source
# and all system Python installations untouched.
uv pip install --python "$runtime_root/bin/python3.12" \
  --target "$runtime_root/lib/python3.12/site-packages" \
  -r "$source_root/requirements.txt" > "$demo_root/evidence/bundled-dependency-install.log" 2>&1
cp "$project_root/scripts/mailmcp-demo-backend.py" "$demo_root/bundle/backend-entry.py"
"$runtime_root/bin/python3.12" -I -c 'import fastapi, httpx, sys, uvicorn; print("Bundled Python", sys.version.split()[0], "ready at", sys.prefix)'
