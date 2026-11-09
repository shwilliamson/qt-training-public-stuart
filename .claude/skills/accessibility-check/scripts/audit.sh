#!/usr/bin/env bash
# Run a Lighthouse accessibility audit on each page and print score + failing audits.
# Usage: audit.sh [base-url] [path ...]
# Defaults: base http://localhost:5268, paths "/" and "/kitchen".
set -euo pipefail

BASE="${1:-http://localhost:5268}"
shift || true
PATHS=("$@")
[ ${#PATHS[@]} -eq 0 ] && PATHS=("/" "/kitchen")

OUT="${TMPDIR:-/tmp}/a11y-audit"
mkdir -p "$OUT"

for p in "${PATHS[@]}"; do
  name=$(echo "$p" | tr '/' '_' | sed 's/^_*$/root/')
  json="$OUT/lh$name.json"
  npx -y lighthouse@12.6.1 "$BASE$p" \
    --only-categories=accessibility \
    --output=json --output-path="$json" \
    --chrome-flags="--headless=new" --quiet
  node -e '
    const r = require(process.argv[1]);
    const score = Math.round(r.categories.accessibility.score * 100);
    console.log(`\n=== ${process.argv[2]}  score=${score}`);
    for (const a of Object.values(r.audits)) {
      if (a.score !== 0 || a.scoreDisplayMode !== "binary") continue;
      console.log(`- ${a.id}: ${a.title}`);
      for (const i of (a.details?.items || []).slice(0, 10)) {
        const n = i.node || {};
        console.log(`    ${n.selector || ""}  ${n.snippet || ""}`);
        if (n.explanation) console.log(`      ${n.explanation.replace(/\n/g, " ")}`);
      }
    }
  ' "$json" "$p"
done
echo -e "\nRaw reports: $OUT"
