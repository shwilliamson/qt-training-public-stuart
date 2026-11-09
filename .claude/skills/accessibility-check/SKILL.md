---
name: accessibility-check
description: Run a Lighthouse accessibility audit on every page of the NeighborhoodPizza app and fix issues until each page scores 95 or higher. Use when asked to check, audit, or improve accessibility, or to get Lighthouse a11y scores.
---

# Accessibility check

Goal: every page scores **≥ 95** on Lighthouse accessibility. Then record the final scores in `accessibility-scores.md` at the repo root.

## 1. Make sure the app is running

- Check with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5268/`.
- If it isn't running, start it in the background:
  `dotnet run --project src/NeighborhoodPizza --launch-profile http`.
  Wait until `/` returns 200.

## 2. Find the pages

Today the pages are `/` (`wwwroot/index.html`) and `/kitchen` (`wwwroot/kitchen.html`).
Before you audit, check for new pages. Look at the `*.html` files in `src/NeighborhoodPizza/wwwroot` and the HTML routes in `Program.cs` (`MapGet` calls that return `text/html`). Audit every page you find.

## 3. Audit

```bash
.claude/skills/accessibility-check/scripts/audit.sh http://localhost:5268 / /kitchen
```

The script prints each page's score and the failing audits, with the elements that failed and why.

## 4. Fix and repeat

For every page below 95, fix the failing audits, then run the audit again. Repeat until every page is ≥ 95. Stop after 5 rounds if a page is still below 95, and report what still fails and why.

Rules for fixes:
- Fix the source in `src/NeighborhoodPizza/wwwroot` (HTML, `css/site.css`, `js/`). Static files use `no-cache`, so a reload picks up changes. You don't need to restart the app.
- Keep the visual design. For color contrast, darken or lighten the color only as much as needed to reach the WCAG AA ratio that Lighthouse reports. Change the shared CSS variable or class, not one element.
- Some failures come from markup that JavaScript renders (for example kitchen order cards). Fix the template in `js/`, not the generated DOM.
- Don't hide elements, remove features, or add `aria-hidden` to make an audit pass.
- After you fix the pages, run `dotnet test` to make sure that nothing broke.

## 5. Record results

Overwrite `accessibility-scores.md` with the date, the Lighthouse version, a table of page / URL / score, and a short list of fixes made and any failures that remain.
