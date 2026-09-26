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

# Sustained rate (SC-006): 10 submissions/min for 2 minutes, one every 6s.
if [ "${SUSTAINED:-0}" = "1" ]; then
  echo "sustained: 20 submissions, one every 6s (≈10/min)"
  ok=0
  fail=0
  k=0
  while [ "$k" -lt 20 ]; do
    k=$((k + 1))
    code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/restaurants/$SLUG/orders" \
      -H 'Content-Type: application/json' \
      -d "{\"customerName\":\"Sustained $k\",\"customerWhatsapp\":\"1555910${k}\",\"orderType\":\"pickup\",\"items\":[{\"itemId\":\"$ITEM\",\"quantity\":1}]}")
    if [ "$code" = "201" ]; then ok=$((ok + 1)); else fail=$((fail + 1)); fi
    sleep 6
  done
  echo "sustained: ok=$ok fail=$fail (expect ok=20 fail=0)"
fi
echo "done."
