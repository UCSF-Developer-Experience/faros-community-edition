#!/usr/bin/env bash
set -euo pipefail

IMG="${1:-farosai/airbyte-faros-destination:0.22.37}"

docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c '
p=/home/node/airbyte/node_modules/@faros-ai/canonical-models
echo "--- package.json"; head -30 $p/package.json
echo "--- tree (depth 3)"; find $p -maxdepth 3 -not -path "*/node_modules/*" | head -40
echo "--- files mentioning UserEmail"; grep -rl "UserEmail" $p 2>/dev/null | head
echo "--- faros-js-client schema-ish files"; find /home/node/airbyte/node_modules/faros-js-client -type f \( -name "*.json" -o -name "*.graphql" -o -name "*.gql" \) -not -name package.json 2>/dev/null | head
'

exit 0
