#!/bin/sh
# T043: load probe — 50-submission burst + sustained rate against a DISPOSABLE env.
# Usage: BASE_URL=http://127.0.0.1:3000 SLUG=<slug> ITEM=<itemId> sh scripts/load-probe.sh
# Prerequisites: server running against a disposable database, ORDER_RATE_MAX raised,
# an open restaurant with an available item. NEVER point at production.
set -eu
BASE_URL="${BASE_URL:?set BASE_URL}"
SLUG="${SLUG:?set SLUG}"
ITEM="${ITEM:?set ITEM}"
N="${N:-50}"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "burst: $N simultaneous order submissions to $BASE_URL/restaurants/$SLUG/orders"
i=0
while [ "$i" -lt "$N" ]; do
  i=$((i + 1))
  curl -s -o "$tmp/$i.json" -w "%{http_code} %{time_total}\n" -X POST "$BASE_URL/api/restaurants/$SLUG/orders" \
    -H 'Content-Type: application/json' \
    -d "{\"customerName\":\"Load $i\",\"customerWhatsapp\":\"1555900${i}\",\"orderType\":\"pickup\",\"items\":[{\"itemId\":\"$ITEM\",\"quantity\":1}]}" \
    > "$tmp/$i.time" &
done
wait
echo "--- status codes ---"
awk '{print $1}' "$tmp"/*.time | sort | uniq -c | sort -rn
echo "--- p95 seconds (all) ---"
awk '{print $2}' "$tmp"/*.time | sort -n | awk '{a[NR]=$1} END {print a[int(NR*0.95)+1]}'
echo "--- distinct order codes ---"
grep -h -o '"code":"[^"]*"' "$tmp"/*.json 2>/dev/null | sort -u | wc -l
echo "done."
