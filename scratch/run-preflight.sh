#!/usr/bin/env bash
set -euo pipefail

# Usage: FAROS_GITHUB_PAT=<token> ./run-preflight.sh
# Runs a connection check + source-only test without writing the PAT to disk.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/github-src-preflight.json"

if [[ -z "${FAROS_GITHUB_PAT:-}" ]]; then
  echo "Error: FAROS_GITHUB_PAT is not set"
  exit 1
fi

TMPCONFIG=$(mktemp /tmp/preflight-XXXXXX.json)
trap 'rm -f "$TMPCONFIG"' EXIT

jq --arg pat "${FAROS_GITHUB_PAT}" \
  '.src.config.authentication.personal_access_token = $pat' \
  "$TEMPLATE" > "$TMPCONFIG"

echo "=== Connection check ==="
airbyte-local --config-file "$TMPCONFIG" --src-check-connection

echo ""
echo "=== Source-only test (first 50 lines) ==="
airbyte-local --config-file "$TMPCONFIG" --src-only 2>&1 | head -50

exit 0
