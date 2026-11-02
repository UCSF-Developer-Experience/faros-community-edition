#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-0.22.37}"
IMG="farosai/airbyte-faros-destination:${TAG}"
OUT="$(dirname "$0")/s13-converter-src-${TAG}"
mkdir -p "$OUT"

for name in faros_users faros_repositories faros_pull_requests common; do
  docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c "
d=\$(find / -type d -path '*lib/converters/github' 2>/dev/null | head -1)
cat \"\$d/${name}.js\"
" > "$OUT/${name}.js"
done

wc -l "$OUT"/*.js

exit 0
