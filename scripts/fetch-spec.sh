#!/usr/bin/env bash
# Fetches the OpenAPI spec from the best available source.
# Priority: local backend → sibling repo file → GitHub API.
# Usage: bash scripts/fetch-spec.sh
set -euo pipefail

SPEC_OUT="src/generated/openapi.json"
LOCAL_URL="http://localhost:8050/v3/api-docs"
SIBLING_SPEC="../ymart-backend/openapi-spec.json"
GITHUB_REPO="apolovyi/ymart-backend"

validate_spec() {
  python3 -c "import sys,json; d=json.load(sys.stdin); assert 'openapi' in d" 2>/dev/null
}

format_spec() {
  npx prettier --write "$SPEC_OUT" > /dev/null 2>&1 || true
}

# 1. Local backend (running on dev machine)
if curl -sf --connect-timeout 2 --max-time 10 "$LOCAL_URL" | validate_spec; then
  curl -sf "$LOCAL_URL" > "$SPEC_OUT"
  format_spec
  echo "Fetched spec from local backend ($LOCAL_URL)."

# 2. Sibling repo (all ymart repos cloned under same parent)
elif [ -f "$SIBLING_SPEC" ] && validate_spec < "$SIBLING_SPEC"; then
  cp "$SIBLING_SPEC" "$SPEC_OUT"
  format_spec
  echo "Copied spec from sibling repo ($SIBLING_SPEC)."

# 3. GitHub API (CI or when sibling repo not available)
elif gh api "repos/$GITHUB_REPO/contents/openapi-spec.json" \
       -H "Accept: application/vnd.github.raw" 2>/dev/null | validate_spec; then
  gh api "repos/$GITHUB_REPO/contents/openapi-spec.json" \
    -H "Accept: application/vnd.github.raw" > "$SPEC_OUT"
  format_spec
  echo "Fetched spec from GitHub ($GITHUB_REPO)."

else
  echo "Error: Could not fetch spec from local backend, sibling repo, or GitHub." >&2
  exit 1
fi
