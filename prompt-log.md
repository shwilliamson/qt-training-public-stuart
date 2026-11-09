## 2026-11-09 11:31 CST · pass-2

**Prompt:**
Read requirements.md. Interview me about anything unclear, then write a spec to spec.md that covers every acceptance criterion.

**Summary:** Interviewed the user (stack: .NET Minimal API + static JS + SQLite; /kitchen without login; New→Ready only; polling; qty 1–20; cart in localStorage) and wrote spec.md with domain model, API, UI, persistence, AC traceability table, and test plan. Files: spec.md, prompt-log.md.

## 2026-11-09 11:43 CST · pass-2

**Prompt:**
open spec.md in vscode so i can see it

**Summary:** Opened spec.md in VS Code. No code changes; only prompt-log.md updated.

## 2026-11-09 11:51 CST · pass-2

**Prompt:**
Build the app from spec.md. Check it against every acceptance criterion in requirements.md when you're done.

**Summary:** Built the Neighborhood Pizza app (.NET 10 Minimal API, EF Core SQLite, static HTML/JS customer and kitchen pages) plus 46 xUnit tests, all passing; verified every AC in the browser, including kitchen polling and persistence across a server restart. Files: NeighborhoodPizza.slnx, dotnet-tools.json, src/NeighborhoodPizza/**, tests/NeighborhoodPizza.Tests/**, spec.md (.NET 10 and DateTime notes, run instructions), prompt-log.md.

## 2026-11-09 11:57 CST · pass-2

**Prompt:**
run it and open both the customer and kitchen views in my browser

**Summary:** Started the app on http://localhost:5268 in the background and opened the customer (/) and kitchen (/kitchen) pages in the default browser. No code changes; only prompt-log.md updated.

## 2026-11-09 11:58 CST · pass-2

**Prompt:**
ok stop the app

**Summary:** Stopped the running app on port 5268. No code changes; only prompt-log.md updated.

## 2026-11-09 12:00 CST · pass-2

**Prompt:**
ok open a pr for this branch to main and also open a pr for this back into the forked repo

**Summary:** Opened PR #2 from pass-2 into main on the fork (shwilliamson/qt-training-public-stuart) and draft PR #2 "Stuart Williamson - Pass 2" into phase2interactive/qt-training-public main. Only prompt-log.md changed.

## 2026-11-09 12:01 CST · pass-2

**Prompt:**
open both of these in my browser

**Summary:** Opened the fork PR #2 and the upstream draft PR #2 in the default browser. Only prompt-log.md changed.

## 2026-11-09 12:38 CST · pass-3

**Prompt:**
Use Playwright to check that section 2 of requirements.md (Reviewing an Order) works in the running app. Fix anything that fails.

**Summary:** Ran Playwright checks for AC-2.1–2.3. All functional checks passed, but keyboard focus was lost after +/−/Remove and after typing a quantity, and browsers cached stale JS. Fixed both: order.js updates quantities in place and restores focus, labels now name size and toppings, and Program.cs sends Cache-Control: no-cache. Added 5 cache tests (51 total passing); all 23 Playwright checks pass. Files: order.js, index.html, Program.cs, OrderApiTests.cs, spec.md, prompt-log.md.

## 2026-11-09 13:44 CST · pass-3

**Prompt:**
ok, open a pr for this branch both in this repo and in the forked repo

**Summary:** Opened PR #3 from pass-3 into main on the fork (shwilliamson/qt-training-public-stuart) and draft PR #3 "Stuart Williamson - Pass 3" into phase2interactive/qt-training-public main. Only prompt-log.md changed.

## 2026-11-09 13:59 CST · pass-4

**Prompt:**
! git checkout -b pass-4

**Summary:** User created the pass-4 branch from pass-3. No changes besides this log entry.


## 2026-11-09 14:08 · pass-4

**Prompt:**
You are a tester. Do not change code. Use Playwright to check section 3 of requirements.md (Placing an Order) against the running app. Report each acceptance criterion as pass or fail, with steps to reproduce.

**Summary:** Ran the app against a scratch database and tested AC-3.1 to AC-3.3 with Playwright plus direct API calls. All three passed. No code changed; only prompt-log.md was updated.
## 2026-11-09 14:11 CST · pass-4

**Prompt:**
All three acceptance criteria in section 3 pass. I tested in a Playwright browser at http://localhost:5268 and also sent requests straight to POST /api/orders to check the server rejects bad orders on its own. I ran the app against a scratch database so your dev database wasn't touched. No code was changed.

AC-3.1: You can't submit an empty order or one without a name. PASS
1. Open /, leave the cart empty and type "Alice" as the name. "Place pickup order" stays disabled.
2. Add a Small pizza with Pepperoni and enter a name of only spaces. The button stays disabled.
3. Send the order directly to the API:
   - With no items, or an empty item list, the server returns 400 "Your order is empty."
   - With no name, or only spaces, it returns 400 "Please enter your name."
   - None of these rejected requests created an order.

AC-3.2: The confirmation shows the order number, name, items and total. PASS
1. Add a Small pizza with Pepperoni ($12) and a Large with Mushrooms and Onions, quantity 2 ($36).
2. Enter "  Alice Tester  " and click "Place pickup order".
3. The confirmation reads "Order placed!", shows Order #1001 and the name "Alice Tester" with the spaces trimmed. It lists both items with quantity, toppings, price each and line totals, and shows Total $48.00.

AC-3.3: A submitted order is available to the kitchen. PASS
1. After placing the order above, open /kitchen.html.
2. Order #1001 is in the "New" column with the name, items, Total $48.00 and a "Mark Ready" button.

The only other thing I saw was a 404 for /favicon.ico in the browser console, which isn't part of section 3.

**Summary:** Reviewed the pasted section 3 tester report against the code and repo state: results are consistent, the tree is clean and no app is left running, so nothing needed fixing. No code changed; only prompt-log.md was updated.

## 2026-11-09 14:12 CST · pass-4

**Prompt:**
fix these issues identified by our tester

**Summary:** Fixed the only issue in the tester's report, the /favicon.ico 404: added wwwroot/favicon.svg and linked it from index.html and kitchen.html. Added a test (53 passing) and confirmed with Playwright on a scratch DB that both pages load with no HTTP or console errors. Files: favicon.svg, index.html, kitchen.html, OrderApiTests.cs, prompt-log.md.


## 2026-11-09 14:28 · pass-4

**Prompt:**
ok, an agent addressed your findings, please retest and verify these are now fixed

**Summary:** Retested after commit 2bcf7de (favicon). The /favicon.ico console 404 is gone on both pages, and AC-3.1 to AC-3.3 still pass. No code changed; only prompt-log.md was updated.
## 2026-11-09 14:31 CST · pass-4

**Prompt:**
ok, this is all good now, open a pr into both this repo and the forked repo

**Summary:** Opened PR #4 from pass-4 into main on the fork (shwilliamson/qt-training-public-stuart) and draft PR #4 "Stuart Williamson - Pass 4" into phase2interactive/qt-training-public main. Only prompt-log.md changed.


## 2026-11-09 14:47 · pass-5,

**Prompt:**
Run a Lighthouse accessibility audit on each page of the running app and tell me the scores. Persist the scores to an accessibility-scores.md file somewhere

**Summary:** Started the app (it wasn't running) and ran Lighthouse 12.6.1 accessibility audits on `/` (100) and `/kitchen` (94, one color-contrast failure on the Ready badge). Recorded the results in `accessibility-scores.md` at the repo root.

## 2026-11-09 15:10 · pass-5,

**Prompt:**
Create a project skill in .claude/skills/accessibility-check that runs a Lighthouse accessibility audit and fixes problems until each page scores 95 or higher.

**Summary:** Added the `accessibility-check` project skill (`.claude/skills/accessibility-check/SKILL.md`) and a helper script (`scripts/audit.sh`) that audits each page and prints its score and failing elements. The skill's loop is: start the app, find the pages, audit, fix, then audit again until every page is ≥ 95, and record the scores. Tested the script against the running app.

## 2026-11-09 15:14 · pass-5,

**Prompt:**
Let customers add special instructions to each pizza.

**Summary:** Added an optional per-pizza "Special instructions" field (max 140 characters) to the builder. It's stored on `OrderLine` (with a new migration), validated by the API, and shown in the cart, the confirmation, and the kitchen cards. Pizzas only merge into one cart line when their instructions match. Changed `OrderEndpoints.cs`, `Entities.cs`, `PizzaDbContext.cs`, `Menu.cs`, the `wwwroot` HTML/JS/CSS, `spec.md`, and the API tests (3 new, 56 passing). Checked the full flow in a browser.

## 2026-11-09 15:17 · pass-5,

**Prompt:**
Run the audit again and record the new scores.

**Summary:** Ran the Lighthouse accessibility audit again on `/` (100) and `/kitchen` (94). The scores didn't change, and the only failure is still the Ready badge contrast. Updated `accessibility-scores.md` with the latest results and a history table.

## 2026-11-09 15:19 · pass-5,

**Prompt:**
so run that then

**Summary:** Ran the `accessibility-check` skill. It fixed the kitchen Ready badge contrast by darkening the shared `--ok` color from `#2f7d32` to `#286a2a` in `site.css`. Both pages now score 100 and all 56 tests pass. Updated `accessibility-scores.md`.

## 2026-11-09 15:21 · pass-5

**Prompt:**
great, open a pr into both this repo and the forked repo for pass-5

**Summary:** Renamed the branch from `pass-5,` to `pass-5` and pushed it. Opened PR #5 into main on the fork (shwilliamson/qt-training-public-stuart) and draft PR #5 "Stuart Williamson - Pass 5" into phase2interactive/qt-training-public main. Only prompt-log.md changed.

## 2026-11-09 15:22 · pass-5

**Prompt:**
open those prs in my browser

**Summary:** Opened both pass-5 PRs (fork #5 and phase2interactive/qt-training-public #5) in the default browser. Only prompt-log.md changed.

## 2026-11-09 15:24 · pass-5

**Prompt:**
shut down the app

**Summary:** Stopped the app server on port 5268. Only prompt-log.md changed.
