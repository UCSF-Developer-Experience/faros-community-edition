#!/usr/bin/env bash
set -euo pipefail

TAG="${1:?usage: s13-dst-tag-check.sh <dst-tag>}"
IMG="farosai/airbyte-faros-destination:${TAG}"
OUT="$(dirname "$0")"

docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c '
d=$(find / -type d -path "*lib/converters/github" 2>/dev/null | head -1)
echo "DIR=$d" >&2
ls "$d"/*.js | xargs -n1 basename | sort > /dev/stderr
grep -hoE "\b(vcs|faros|cicd|tms|org|ims|compute)_[A-Z][A-Za-z]+" "$d"/*.js | sort -u
' > "$OUT/s13-dst-${TAG}-models.txt" 2> "$OUT/s13-dst-${TAG}-converters.txt"

echo "tag=$TAG faros_* converters: $(grep -c '^faros_.*\.js$' "$OUT/s13-dst-${TAG}-converters.txt" || true)"
echo "tag=$TAG models referenced: $(wc -l < "$OUT/s13-dst-${TAG}-models.txt")"

exit 0
