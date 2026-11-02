#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-0.22.37}"
IMG="farosai/airbyte-faros-destination:${TAG}"
OUT="$(dirname "$0")/s13-converter-models-${TAG}.txt"

docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c '
d=$(find / -type d -path "*lib/converters/github" 2>/dev/null | head -1)
for f in "$d"/faros_*.js; do
  m=$(grep -hoE "\b(vcs|faros|cicd|tms|org|ims|compute)_[A-Z][A-Za-z]+" "$f" | sort -u | tr "\n" " ")
  echo "$(basename "$f"): $m"
done
' > "$OUT"

wc -l "$OUT"

exit 0
