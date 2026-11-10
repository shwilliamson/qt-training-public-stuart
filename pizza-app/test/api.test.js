'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { createApp } = require('../server/app');
const { OrderStore } = require('../server/store');

let server;
let base;

test.before(async () => {
  const app = createApp({ store: new OrderStore(), publicDir: path.join(__dirname, '..', 'public') });
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

const post = (body) => fetch(`${base}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('GET /api/menu returns pizzas, sizes, and toppings', async () => {
  const res = await fetch(`${base}/api/menu`);
  assert.equal(res.status, 200);
  const menu = await res.json();
  assert.ok(menu.pizzas.length > 0);
  assert.deepEqual(menu.sizes.map((s) => s.id), ['small', 'medium', 'large']);
});

test('POST /api/orders creates an order that can be fetched', async () => {
  const res = await post({
    items: [{ pizzaId: 'supreme', size: 'large', quantity: 1 }],
    customer: { name: 'Sam', phone: '(555) 555-0100', address: '2 Elm St' },
    fulfillment: 'delivery',
  });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.match(order.id, /^P-[0-9A-F]{6}$/);
  assert.equal(order.status, 'received');
  assert.equal(order.total, 1599 + 600 + 399 + Math.round(2199 * 0.08));

  const fetched = await fetch(`${base}/api/orders/${order.id.toLowerCase()}`);
  assert.equal(fetched.status, 200);
  assert.equal((await fetched.json()).id, order.id);
});

test('POST /api/orders returns 400 with a message for bad input', async () => {
  const res = await post({ items: [], customer: {}, fulfillment: 'pickup' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /cart is empty/);

  const badJson = await post('{not json');
  assert.equal(badJson.status, 400);
});

test('unknown order returns 404', async () => {
  const res = await fetch(`${base}/api/orders/P-000000`);
  assert.equal(res.status, 404);
});

test('serves the frontend and blocks path traversal', async () => {
  const index = await fetch(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /Slice Shop/);

  const traversal = await fetch(`${base}/%2e%2e/package.json`);
  assert.equal(traversal.status, 404);
});
