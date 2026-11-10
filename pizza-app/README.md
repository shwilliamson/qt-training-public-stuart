# Slice Shop — pizza ordering app

Zero-dependency Node.js app (Node 22+): browse the menu, customize pizzas, check out for pickup or delivery, and track order status.

```bash
npm start   # http://localhost:3000 (set PORT to change)
npm test
```

- `server/` — HTTP API (`GET /api/menu`, `POST /api/orders`, `GET /api/orders/:id`); prices are always computed server-side.
- `public/` — vanilla JS frontend.
- Orders persist to `data/orders.json` (git-ignored). Order status is simulated from elapsed time.
