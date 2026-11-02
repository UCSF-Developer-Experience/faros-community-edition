#!/usr/bin/env bash
set -euo pipefail

IMG="${1:-farosai/airbyte-faros-destination:0.22.37}"

docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c '
echo "--- sql/graphql/gql files outside proc"
find / \( -name "*.sql" -o -name "*.graphql" -o -name "*.gql" \) -not -path "/proc/*" 2>/dev/null | head -20
echo "--- files mentioning UserEmail (json/yaml/graphql/sql/md/ts), excluding converters dir"
find / -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.graphql" -o -name "*.sql" -o -name "*.md" -o -name "*.ts" \) -not -path "/proc/*" -not -path "*/converters/*" 2>/dev/null | xargs grep -l "UserEmail" 2>/dev/null | head -20
echo "--- candidate schema packages"
find / -type d \( -name "faros-js-client" -o -name "faros-schema*" -o -name "canonical*" -o -name "*-schema" \) -not -path "/proc/*" 2>/dev/null | head
'

exit 0
