# Accessibility Scores

Lighthouse 12.6.1 accessibility audit (headless Chrome, default mobile config) against the local app at `http://localhost:5268`, run with `.claude/skills/accessibility-check/scripts/audit.sh`.

## Latest — 2026-11-09 (after Ready badge contrast fix)

| Page | URL | Score |
|------|-----|-------|
| Customer ordering | `/` | 100 |
| Kitchen | `/kitchen` | 100 |

### Fixes made

- **`/kitchen` — color-contrast:** the "Ready" badge measured 3.75:1, below the 4.5:1 that WCAG AA requires. The cause was the shared `--ok` green (`#2f7d32`) on `--ok-bg`, washed out further by the Ready card's `opacity: 0.9`. Darkened `--ok` by 15% to `#286a2a`, giving 4.63:1 after the opacity. This also slightly darkens the Ready card border and the "Order placed!" heading.

### Remaining failures

None.

## History

| Date | Change | `/` | `/kitchen` |
|------|--------|----:|-----------:|
| 2026-11-09 | Baseline | 100 | 94 |
| 2026-11-09 | Per-pizza special instructions | 100 | 94 |
| 2026-11-09 | Ready badge contrast fix (`--ok` → `#286a2a`) | 100 | 100 |
