import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { priceItem, priceOrder, ValidationError } from '../lib/pricing.js';
import { OrderStore, statusFor } from '../lib/orders.js';
import { createApp } from '../server.js';

test('prices a pizza from size, crust, and toppings', () => {
  assert.equal(priceItem({ size: 'small', crust: 'thin', toppings: [] }), 1000);
  assert.equal(priceItem({ size: 'large', crust: 'deep-dish', toppings: ['pepperoni', 'ham'] }), 1600 + 200 + 2 * 200);
});

test('rejects unknown options and duplicate toppings', () => {
  assert.throws(() => priceItem({ size: 'huge', crust: 'thin', toppings: [] }), ValidationError);
  assert.throws(() => priceItem({ size: 'small', crust: 'thin', toppings: ['gold'] }), ValidationError);
  assert.throws(() => priceItem({ size: 'small', crust: 'thin', toppings: ['ham', 'ham'] }), ValidationError);
});

test('order totals include tax and delivery fee', () => {
  const items = [{ size: 'medium', crust: 'hand-tossed', toppings: ['pepperoni'], quantity: 2 }];
  const pickup = priceOrder({ items, fulfillment: 'pickup' });
  assert.equal(pickup.subtotal, 2 * 1450);
  assert.equal(pickup.tax, Math.round(2900 * 0.0825));
  assert.equal(pickup.deliveryFee, 0);
  const delivery = priceOrder({ items, fulfillment: 'delivery' });
  assert.equal(delivery.total, pickup.total + 399);
});

test('rejects empty carts and bad quantities', () => {
  assert.throws(() => priceOrder({ items: [], fulfillment: 'pickup' }), /empty/);
  const bad = [{ size: 'small', crust: 'thin', toppings: [], quantity: 0 }];
  assert.throws(() => priceOrder({ items: bad, fulfillment: 'pickup' }), /Quantity/);
});

test('status advances over time', () => {
  const createdAt = new Date(0).toISOString();
  assert.equal(statusFor({ createdAt, fulfillment: 'pickup' }, 0), 'Received');
  assert.equal(statusFor({ createdAt, fulfillment: 'pickup' }, 90_000), 'In the oven');
  assert.equal(statusFor({ createdAt, fulfillment: 'delivery' }, 10 * 60_000), 'Delivered');
});

let dir, server, base;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pizza-'));
  server = createApp(new OrderStore(join(dir, 'orders.json'))).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
});
after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

test('API: place an order and look it up', async () => {
  const menu = await (await fetch(`${base}/api/menu`)).json();
  assert.ok(menu.specialties.length > 0);

  const res = await fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fulfillment: 'delivery',
      customer: { name: 'Pat', phone: '555-123-4567', address: '1 Main St' },
      items: [{ name: 'Hawaiian', size: 'large', crust: 'thin', toppings: ['ham', 'pineapple'], quantity: 1, unitPrice: 1 }],
    }),
  });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.equal(order.lines[0].unitPrice, 2000, 'server ignores client-supplied prices');
  assert.equal(order.status, 'Received');

  const lookup = await fetch(`${base}/api/orders/${order.id}`);
  assert.equal((await lookup.json()).id, order.id);
});

test('API: validation errors return 400', async () => {
  const res = await fetch(`${base}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fulfillment: 'delivery', customer: { name: 'Pat', phone: '5551234567' }, items: [{ size: 'small', crust: 'thin', toppings: [], quantity: 1 }] }),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Address/);
});

test('API: serves the page and blocks path traversal', async () => {
  assert.equal((await fetch(`${base}/`)).status, 200);
  assert.equal((await fetch(`${base}/..%2Fserver.js`)).status, 404);
  assert.equal((await fetch(`${base}/api/orders/NOPE`)).status, 404);
});
