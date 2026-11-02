#!/usr/bin/env bash
set -euo pipefail

# Usage: FAROS_GITHUB_PAT=<token> ./run-scope-test.sh [seconds]
# Bounded source 0.23.48 -> destination 0.22.37 run, then org/repo evidence.
# The PAT is injected into a throwaway temp config, never written to the repo.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/s11-scope-test.json"
LOG="${SCRIPT_DIR}/s11-scope-test.log"
STATE="${SCRIPT_DIR}/s11-scope-test.state.json"
LIMIT="${1:-120}"

if [[ -z "${FAROS_GITHUB_PAT:-}" ]]; then
  echo "Error: FAROS_GITHUB_PAT is not set"
  exit 0
fi

TMPCONFIG=$(mktemp)
trap 'rm -f "$TMPCONFIG"' EXIT
echo '{}' > "$STATE"

jq --arg pat "${FAROS_GITHUB_PAT}" \
  '.src.config.authentication.personal_access_token = $pat' \
  "$TEMPLATE" > "$TMPCONFIG"

echo "=== Running (hard stop after ${LIMIT}s), log: ${LOG} ==="
timeout "$LIMIT" airbyte-local \
  --config-file "$TMPCONFIG" \
  --state-file "$STATE" \
  --no-src-pull --no-dst-pull > "$LOG" 2>&1 || echo "(run ended with status $? - 124 means the time limit hit)"

echo "=== Other orgs mentioned in log (want 0 lines) ==="
grep -ciE 'ucsf-ckm|dspace|chiulab|graddiv' "$LOG" || true

echo "=== ERROR / Unsupported lines in log ==="
grep -ciE 'error|unsupported' "$LOG" || true

echo "=== What landed in faros-db ==="
docker exec -i airbyte-db psql -U docker -d faros <<'SQL'
select uid as org from "vcs_Organization" order by 1;
select organization, name from "vcs_Repository" order by 1, 2;
select 'vcs_Commit' as tbl, count(*) from "vcs_Commit"
union all select 'vcs_PullRequest', count(*) from "vcs_PullRequest"
union all select 'vcs_User', count(*) from "vcs_User";
SQL

exit 0
