# Neighborhood Pizza — Technical Specification

Source: `requirements.md`. This spec covers every acceptance criterion (AC-1.1 – AC-4.3) and the expectations in requirements section 5. Section 9 maps each AC to where this spec covers it and the tests that check it.

## 1. Overview and scope

A web app for online pickup orders. Customers build pizzas, review a cart, enter their name, and submit. Kitchen staff see submitted orders on a separate page and mark them Ready. Orders are stored in a SQLite file, so they survive app and computer restarts.

**In scope**
- Pizza builder (size + toppings) with live price.
- Cart with several pizzas, quantity changes, removal, and a running total.
- Order submission with customer name, then a confirmation screen.
- Kitchen board at `/kitchen` with New/Ready status that refreshes itself.
- Persistent storage of orders and statuses.

**Out of scope**
Delivery, online payment (customers pay at the counter), customer accounts, staff login, coupons, loyalty programs, taxes and fees, menu editing, and a customer-facing status tracker.

## 2. Architecture

| Concern | Choice |
|---|---|
| Runtime | .NET 10, ASP.NET Core Minimal API (the only SDK installed on the build machine) |
| Front end | Static HTML, CSS, and vanilla JavaScript served from `wwwroot` |
| Storage | SQLite through EF Core (`Microsoft.EntityFrameworkCore.Sqlite`) |
| Tests | xUnit, `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory`) |

**Project layout**

```
NeighborhoodPizza.sln
src/NeighborhoodPizza/
  Program.cs            # host setup, endpoint mapping, DB init
  Menu.cs               # fixed menu and prices
  Pricing.cs            # pure price calculation
  Data/PizzaDbContext.cs
  Data/Entities.cs      # Order, OrderLine, OrderLineTopping
  Endpoints/MenuEndpoints.cs
  Endpoints/OrderEndpoints.cs
  wwwroot/index.html    # customer ordering page
  wwwroot/kitchen.html  # kitchen board (served at /kitchen)
  wwwroot/css/site.css
  wwwroot/js/order.js
  wwwroot/js/kitchen.js
tests/NeighborhoodPizza.Tests/
  PricingTests.cs
  OrderApiTests.cs
  KitchenApiTests.cs
  PersistenceTests.cs
```

**Configuration**
- Connection string `ConnectionStrings:Pizza`, default `Data Source=App_Data/pizza.db`. The `App_Data/` folder is created on startup if it is missing. `*.db` files are already ignored by `.gitignore`.
- `/kitchen` maps to `wwwroot/kitchen.html`. `/` serves `index.html`.

**Run:** `dotnet run --project src/NeighborhoodPizza`, then open http://localhost:5268 (customers) and http://localhost:5268/kitchen (kitchen). **Test:** `dotnet test`. **Migrations:** `dotnet tool restore`, then `dotnet ef migrations add <Name> --project src/NeighborhoodPizza -o Data/Migrations`.

## 3. Domain model and pricing

### 3.1 Menu (fixed in code)

| Id | Name | Kind | Price (cents) |
|---|---|---|---:|
| `small` | Small pizza (10") | size | 1000 |
| `large` | Large pizza (14") | size | 1400 |
| `pepperoni` | Pepperoni | topping | 200 |
| `mushrooms` | Mushrooms | topping | 200 |
| `onions` | Onions | topping | 200 |
| `green-peppers` | Green peppers | topping | 200 |

The menu lives in `Menu.cs` as the single source of truth. The front end loads it from `GET /api/menu` and never hardcodes prices.

### 3.2 Pricing rules
- All money is stored and computed as integer cents. It is shown as `$X.XX`.
- Unit price = size price + 200 × number of selected toppings. A topping costs the same on either size.
- Each topping is either on or off. A pizza cannot have the same topping twice. No toppings means a plain cheese pizza.
- Line total = unit price × quantity.
- Order total = sum of line totals. No tax, fees, or discounts.
- Every price comes from `Pricing.cs`, which is pure and unit-tested. The client uses the same rules to show prices as the customer edits, but the server recalculates all prices on submit and ignores any prices the client sends.

### 3.3 Entities

**Order**
| Field | Type | Notes |
|---|---|---|
| `Id` | int, PK | Internal |
| `OrderNumber` | int, unique | Sequential, starting at 1001. Assigned when the order is saved. |
| `CustomerName` | string (≤ 50) | Trimmed |
| `Status` | enum `New` \| `Ready` | Stored as a string. Defaults to `New`. |
| `TotalCents` | int | Snapshot when the order is submitted |
| `CreatedAt` | DateTime (UTC) | DateTime, not DateTimeOffset, because EF Core can't sort DateTimeOffset on SQLite |
| `ReadyAt` | DateTime? (UTC) | Set when the order is marked Ready |
| `Lines` | list of OrderLine | |

**OrderLine**: `Id`, `OrderId`, `Size` (`small`\|`large`), `Quantity` (1–20), `UnitPriceCents`, `LineTotalCents`, `Toppings`.

**OrderLineTopping**: `Id`, `OrderLineId`, `ToppingId`.

The order stores price snapshots, so past orders keep their prices even if the menu changes later.

**Order number assignment:** insert the order, then set `OrderNumber = Id + 1000` in the same transaction. Alternatively, seed the SQLite autoincrement so `Id` starts at 1001 and use it directly. Either way, numbers are unique, keep increasing, and keep counting after a restart.

### 3.4 Status lifecycle
`New` → `Ready`. The change goes one way only. Staff cannot set an order back to New, and there are no other statuses.

## 4. HTTP API

All endpoints use JSON with camelCase property names. Validation errors return `400` with a `ValidationProblemDetails` body. Its `errors` dictionary maps each field to a list of messages.

### 4.1 `GET /api/menu`
Returns the menu.
```json
{ "sizes":   [{ "id": "small", "name": "Small pizza (10\")", "priceCents": 1000 }, ...],
  "toppings":[{ "id": "pepperoni", "name": "Pepperoni", "priceCents": 200 }, ...] }
```

### 4.2 `POST /api/orders`
Submits an order.

Request:
```json
{ "customerName": "Pat",
  "items": [ { "size": "large", "toppings": ["pepperoni","onions"], "quantity": 2 } ] }
```

Validation. All errors are reported together, not one at a time.
| Rule | Error key | Message |
|---|---|---|
| `customerName` is present and not blank after trimming | `customerName` | "Please enter your name." |
| Trimmed name is ≤ 50 characters | `customerName` | "Name must be 50 characters or fewer." |
| `items` has at least one entry | `items` | "Your order is empty." |
| Every `size` is a known size id | `items[i].size` | "Unknown size." |
| Every topping is a known topping id | `items[i].toppings` | "Unknown topping." |
| A line has no duplicate toppings | `items[i].toppings` | "Each topping can be added once." |
| `quantity` is between 1 and 20 inclusive | `items[i].quantity` | "Quantity must be between 1 and 20." |

On success, the server saves the order with status `New`, using server-calculated prices, and returns `201 Created` with `Location: /api/orders/{orderNumber}` and the order body (4.3).

### 4.3 `GET /api/orders/{orderNumber}`
Returns one order, or `404` if it does not exist.
```json
{ "orderNumber": 1001, "customerName": "Pat", "status": "New",
  "createdAt": "2026-11-09T17:02:00Z", "readyAt": null, "totalCents": 3600,
  "items": [ { "size": "large", "sizeName": "Large pizza (14\")",
               "toppings": [{ "id": "pepperoni", "name": "Pepperoni" }, { "id": "onions", "name": "Onions" }],
               "quantity": 2, "unitPriceCents": 1800, "lineTotalCents": 3600 } ] }
```

### 4.4 `GET /api/orders`
Kitchen list. Returns every order in the 4.3 shape, sorted with `New` orders first (oldest first), then `Ready` orders (most recently readied first). An optional `?status=New|Ready` filter returns only that status.

### 4.5 `POST /api/orders/{orderNumber}/ready`
Sets the status to `Ready` and records `ReadyAt`. Returns `200` with the updated order. Calling it on an order that is already Ready returns `200` and leaves `ReadyAt` unchanged. An unknown order number returns `404`.

## 5. Customer UI (`/`)

One page with three areas: **Build a pizza**, **Your order** (cart), and **Place order**. On narrow screens they stack vertically. Prices are always shown as `$X.XX`.

### 5.1 Pizza builder (AC-1.1, AC-1.2, AC-1.3)
- Size: radio buttons showing name and price ("Small 10" — $10.00", "Large 14" — $14.00"). Small is selected by default.
- Toppings: one checkbox per topping, labeled "+$2.00". Any combination, including none, can be selected.
- A **Pizza price** line shows the current unit price. It updates right away when the size or any topping changes.
- **Add to order** adds the pizza (quantity 1) to the cart and resets the builder to its default state. If the cart already has a pizza with the same size and the same set of toppings, that line's quantity goes up by 1 instead, capped at 20.

### 5.2 Cart (AC-2.1, AC-2.2, AC-2.3)
- Each line shows the size name, toppings (or "Cheese only"), unit price, a quantity control, the line total, and a **Remove** button.
- Quantity control: − / number / + buttons, limited to 1–20. The − button is disabled at 1 and + is disabled at 20. Typed values outside 1–20 snap back to the nearest valid value.
- The **Total** at the bottom is the sum of the line totals. It updates whenever a line is added, removed, or its quantity changes.
- An empty cart shows "Your order is empty." and the submit button is disabled.
- The cart is saved to `localStorage` (key `np.cart`) after every change and restored when the page loads, so it survives a refresh. Stored lines with an unknown size, unknown topping, or invalid quantity are dropped when the cart is restored. The cart stores only ids and quantities. Prices are always recalculated from the menu.

### 5.3 Place order (AC-3.1, AC-3.2)
- A **Your name** text field, required, maximum 50 characters.
- The **Place pickup order** button is disabled while the cart is empty or the trimmed name is blank. A note says "Pay at the counter when you pick up."
- While the submit request is in flight, the button shows "Placing order…" and is disabled to prevent double submission.
- If the server returns `400`, its messages are shown next to the relevant fields and the cart is kept.
- On a network or server error (`5xx`), the page shows "We couldn't place your order. Please try again." and keeps the cart.
- On `201`, the page clears the cart (memory and `localStorage`) and shows the confirmation view.

### 5.4 Confirmation view (AC-3.2)
Built from the server's response, not from the client cart:
- Heading: "Order placed!"
- **Order #1001** (large and prominent), customer name, each item (size, toppings, quantity, line total), and the order total.
- "Pay at the counter when you pick up."
- A **Start a new order** button that returns to an empty builder.

## 6. Kitchen UI (`/kitchen`) (AC-4.1, AC-4.2)
- No login. It is meant for an in-store computer.
- Two columns, stacking on narrow screens: **New** (oldest first) and **Ready** (most recently readied first). Each column header shows a count.
- Each order card shows the order number, customer name, time placed (local time), a status badge (**New** or **Ready**), every pizza (quantity × size, then toppings or "Cheese only"), and the order total.
- New cards have a **Mark Ready** button. Clicking it calls `POST /api/orders/{n}/ready`. On success the card moves to the Ready column. On failure the card shows an inline error and stays in New. Ready cards have no button.
- The page loads orders from `GET /api/orders` when it opens and again every 5 seconds. Each refresh fully replaces the board's contents. If a refresh fails, a "Connection lost — retrying" banner appears and polling continues. The banner disappears after the next successful refresh.
- A "Last updated hh:mm:ss" label shows when the board last refreshed.

## 7. Persistence (AC-3.3, AC-4.3)
- Every order and status change is written to the SQLite file before the API responds. Nothing is held only in memory.
- On startup the app applies EF Core migrations (`Database.Migrate()`), which creates the DB file if it is missing and never drops data.
- After the app or computer restarts, `/kitchen` shows the same orders with the same statuses. New order numbers continue from the highest existing number.
- The in-progress customer cart is stored only in the browser (5.2) and is not part of server persistence.

## 8. Validation and error handling summary
- The server is authoritative for all validation and pricing (4.2). Client checks only make the UI friendlier.
- Unknown routes under `/api` return `404` JSON. Unhandled exceptions return `500` with `ProblemDetails` and are logged.
- User-entered text is inserted with `textContent`, never `innerHTML`, so names cannot inject HTML.

## 9. Acceptance criteria traceability

| AC | Requirement (short) | Spec sections | Tests |
|---|---|---|---|
| AC-1.1 | Select either size and any topping combination | 3.1, 3.2, 4.2, 5.1 | `PricingTests` (both sizes; 0–4 toppings); `OrderApiTests.Submit_AcceptsAnySizeAndToppingCombination`; manual M1 |
| AC-1.2 | See pizza price before adding | 5.1 | manual M1 |
| AC-1.3 | Price updates on add/remove topping | 3.2, 5.1 | `PricingTests.UnitPrice_AddsTwoDollarsPerTopping`; manual M2 |
| AC-2.1 | Several different pizzas in one order | 4.2, 5.1, 5.2 | `OrderApiTests.Submit_MultipleLinesDifferentConfigs`; manual M3 |
| AC-2.2 | Details and price per pizza, plus total | 3.2, 5.2 | `PricingTests.OrderTotal_SumsLineTotals`; manual M3 |
| AC-2.3 | Change quantities / remove; total updates | 5.2, 4.2 (qty 1–20) | `OrderApiTests.Submit_RejectsQuantityOutOfRange`; `PricingTests.LineTotal_MultipliesByQuantity`; manual M4 |
| AC-3.1 | No empty order; name required | 4.2, 5.3 | `OrderApiTests.Submit_RejectsEmptyItems`, `Submit_RejectsBlankName`, `Submit_RejectsWhitespaceName`; manual M5 |
| AC-3.2 | Confirmation with number, name, items, total | 4.2, 4.3, 5.4 | `OrderApiTests.Submit_Returns201WithNumberNameItemsTotal`; manual M6 |
| AC-3.3 | Submitted order available to kitchen | 4.4, 6, 7 | `KitchenApiTests.SubmittedOrder_AppearsInKitchenListAsNew`; manual M7 |
| AC-4.1 | Kitchen sees name, number, pizza details, total | 4.4, 6 | `KitchenApiTests.List_IncludesNameNumberItemsTotal`; manual M7 |
| AC-4.2 | New by default; staff can mark Ready | 3.4, 4.5, 6 | `KitchenApiTests.MarkReady_ChangesStatus`, `MarkReady_IsIdempotent`, `MarkReady_Unknown404`; manual M8 |
| AC-4.3 | Orders and statuses survive restart | 7 | `PersistenceTests.OrdersAndStatuses_SurviveHostRestart`, `OrderNumbers_ContinueAfterRestart`; manual M9 |

**Section 5 expectations**
- Simple enough to use without help: 5.1–5.4 (single page, sensible defaults, disabled states).
- Clear prices: 3.2, 5.1, 5.2 (every price shown as `$X.XX`, unit and line totals visible).
- Customer knows whether the order went through: 5.3 (in-flight, error, and success states), 5.4.
- Pickup only, no payment, accounts, coupons, loyalty, tax, or fees: 1 (out of scope), 3.2.

## 10. Test plan

### 10.1 Unit tests (`PricingTests`)
- Small with no toppings = 1000. Large with no toppings = 1400.
- Small with 4 toppings = 1800. Large with 4 toppings = 2200.
- Each added topping adds 200 to either size. Removing one subtracts 200.
- Line total = unit × quantity (1 and 20).
- Order total sums mixed lines correctly.

### 10.2 Integration tests (`WebApplicationFactory`, each test with its own temp SQLite file)
- **OrderApiTests:** valid submit returns 201 with order number ≥ 1001, the trimmed name, items, and a server-calculated total, ignoring any extra price fields the client sends. Rejects: empty items, missing name, whitespace-only name, name over 50 characters, unknown size, unknown topping, duplicate topping, quantity 0, quantity 21. Multiple errors are returned together. Two orders in a row get consecutive numbers.
- **KitchenApiTests:** a new order shows up in `GET /api/orders` with status `New` and full details. Sort order is correct. `?status=` filter works. Marking an order Ready moves it and sets `readyAt`. Repeating the call returns 200 and leaves `readyAt` unchanged. An unknown number returns 404.
- **PersistenceTests:** start a factory on a temp DB file, submit two orders, and mark one Ready. Dispose the factory, start a new one on the same file, and check that both orders and their statuses are unchanged. Then submit a third order and check that its number follows the last one.

### 10.3 Manual UI checklist
- **M1** Open `/`. The default is Small, cheese only, $10.00. Switching to Large shows $14.00. Any combination of toppings can be selected.
- **M2** Check and uncheck toppings. The price changes by $2.00 each time.
- **M3** Add a small cheese and a large pepperoni + onions. Both lines show details and prices, and the total is $28.00.
- **M4** Raise a line's quantity to 3, then remove the other line. The total updates each time. − is disabled at 1 and + at 20. Refresh the page and the cart is still there.
- **M5** With an empty cart or a blank name, the submit button is disabled. Server-side checks are covered by the API tests.
- **M6** Submit. The confirmation shows the order number, name, items, and total. The cart is now empty.
- **M7** Open `/kitchen` in another tab. The order appears in the New column within 5 seconds with the name, number, pizzas, and total.
- **M8** Click Mark Ready. The card moves to Ready with a Ready badge.
- **M9** Stop and restart the app. `/kitchen` shows the same orders and statuses. A new order gets the next number.
