# Slice Shop — pizza ordering app

A small pizza ordering web app. Node 18+ only, no dependencies to install.

```bash
cd pizza-app
npm start      # http://localhost:3000  (set PORT to change)
npm test
```

## Features

- Specialty pizzas and build-your-own, with size, crust, and topping choices
- Cart with quantity controls, kept in the browser between visits
- Pickup or delivery checkout with tax and delivery fee
- Order tracking page with a simulated kitchen timeline

## Layout

- `server.js` — HTTP server: static files plus a JSON API (`GET /api/menu`, `POST /api/orders`, `GET /api/orders/:id`)
- `lib/menu.js` — menu and prices (in cents)
- `lib/pricing.js` — server-side pricing and validation; the client's prices are never trusted
- `lib/orders.js` — order storage in `data/orders.json` and order status
- `public/` — the front end (plain HTML, CSS, and JS)
