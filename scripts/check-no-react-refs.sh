#!/bin/sh
# T035: fail if anything active references the retired React bundle (frontend/dist).
# Run before deleting frontend/.
set -eu
hits=0
for pat in 'frontend/dist' 'frontend/src' "'frontend', 'dist'" '"frontend", "dist"'; do
  found=$(grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=frontend \
    --exclude='*.log' --exclude='check-no-react-refs.sh' -e "$pat" \
    server/ config/ app.yaml package.json scripts/ tests/ database/ HANDOFF.md README.md DEPLOYMENT.md 2>/dev/null || true)
  if [ -n "$found" ]; then
    echo "REACT REF: $pat"
    echo "$found"
    hits=1
  fi
done
if [ "$hits" -eq 1 ]; then
  echo 'FAIL: live references to frontend/ remain — do not delete.'
  exit 1
fi
echo 'OK: no live references to frontend/ outside frontend/ itself.'
