#!/usr/bin/env bash
# Smoke-test storefront URLs against live CS-Cart.
# Samples N products from the backend API, builds their storefront URLs,
# and HEAD-requests each to verify they resolve (HTTP 200).
#
# Usage:
#   AUTH_TOKEN="eyJ..." bash scripts/check-storefront-urls.sh [sample_size]
#
# Get your token: open browser devtools on YourMix, run in console:
#   copy(await fetch('/api/auth/refresh', {method:'POST'}).then(r=>r.json()).then(d=>d.accessToken))
#
# Options:
#   sample_size: number of products to check (default: 20)
#   BACKEND_URL: backend base URL (default: http://localhost:8050)
#   AUTH_TOKEN:  JWT bearer token (required)
set -euo pipefail

SAMPLE_SIZE="${1:-20}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8050}"

if [ -z "${AUTH_TOKEN:-}" ]; then
  echo "Error: AUTH_TOKEN env var required." >&2
  echo "Get it from browser console on YourMix:" >&2
  echo '  copy(document.cookie) // or check Network tab for Authorization header' >&2
  exit 1
fi

AUTH="Authorization: Bearer ${AUTH_TOKEN}"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Fetching categories..."
curl -sf "${BACKEND_URL}/api/catalog/categories" -H "$AUTH" > "$TMPDIR/categories.json"

echo "Fetching ${SAMPLE_SIZE} products..."
curl -sf "${BACKEND_URL}/api/catalog/products?page=0&pageSize=${SAMPLE_SIZE}" -H "$AUTH" > "$TMPDIR/products.json"

echo "Checking storefront URLs..."
echo

python3 - "$TMPDIR/categories.json" "$TMPDIR/products.json" "$SAMPLE_SIZE" << 'PYTHON'
import json, sys, subprocess

cat_file, prod_file, sample_size = sys.argv[1], sys.argv[2], int(sys.argv[3])

with open(cat_file) as f:
    cats_raw = json.load(f)
categories = cats_raw if isinstance(cats_raw, list) else cats_raw.get("categories", [])
cat_map = {c["id"]: c for c in categories}

with open(prod_file) as f:
    products = json.load(f).get("products", [])

STOREFRONT = "https://dev.yourmart.co.bw"

def walk_parents(cat_id):
    chain = []
    cur = cat_map.get(cat_id)
    while cur:
        seo = cur.get("seoName")
        if seo:
            chain.insert(0, seo)
        pid = cur.get("parentId")
        cur = cat_map.get(pid) if pid is not None else None
    return chain

passed = failed = skipped = 0
failures = []

for p in products[:sample_size]:
    name = p.get("name", "?")
    seo_name = p.get("seoName")
    seo_path = p.get("seoPath")

    if not seo_name:
        print(f"  SKIP  {name} (no seoName)")
        skipped += 1
        continue

    segments = []
    if seo_path:
        # seo_path is slash-separated category IDs (e.g. "275/335"); last is main category
        parts = seo_path.split("/")
        try:
            main_cat_id = int(parts[-1])
            segments = walk_parents(main_cat_id)
        except (ValueError, IndexError):
            pass

    if segments:
        url = f'{STOREFRONT}/{"/".join(segments)}/{seo_name}/'
    else:
        url = f"{STOREFRONT}/{seo_name}/"

    try:
        r = subprocess.run(
            ["curl", "-sf", "--head", "--connect-timeout", "5", "--max-time", "10",
             "-o", "/dev/null", "-w", "%{http_code}", url],
            capture_output=True, text=True, timeout=15,
        )
        status = r.stdout.strip()
    except Exception as e:
        status = f"ERR:{e}"

    if status == "200":
        print(f"  OK    {url}")
        passed += 1
    else:
        print(f"  FAIL  {url}  (HTTP {status})")
        print(f"        Product: {name}")
        failed += 1
        failures.append((name, url, status))

print()
print(f"Results: {passed} passed, {failed} failed, {skipped} skipped")

if failures:
    print()
    print("Failures:")
    for name, url, status in failures:
        print(f"  [{status}] {name}")
        print(f"         {url}")
    sys.exit(1)
else:
    print("All storefront URLs resolve correctly.")
PYTHON
