#!/usr/bin/env bash
set -euo pipefail

IMG=farosai/airbyte-faros-destination:0.22.37

docker run --rm --platform linux/amd64 --entrypoint sh "$IMG" -c '
d=$(find / -type d -path "*lib/converters/github" 2>/dev/null | head -1)
echo "DIR=$d" >&2
grep -hoE "\b(vcs|faros|cicd|tms|org|ims|compute)_[A-Z][A-Za-z]+" "$d"/*.js | sort -u
' > "$(dirname "$0")/s12-dst-github-models.txt"

exit 0
