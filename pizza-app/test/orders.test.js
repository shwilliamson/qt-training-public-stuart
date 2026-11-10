'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOrder, orderStatus, ValidationError } = require('../server/orders');

const validOrder = (overrides = {}) => ({
  items: [{ pizzaId: 'cheese', size: 'medium', extras: ['mushrooms'], quantity: 2 }],
  customer: { name: 'Pat', phone: '555-123-4567' },
  fulfillment: 'pickup',
  ...overrides,
});

test('prices items on the server: base + size + extras, times quantity', () => {
  const order = buildOrder(validOrder());
  // cheese 1099 + medium 300 + 1 extra at 200 = 1599 each, x2
  assert.equal(order.items[0].unitPrice, 1599);
  assert.equal(order.items[0].lineTotal, 3198);
  assert.equal(order.subtotal, 3198);
  assert.equal(order.deliveryFee, 0);
  assert.equal(order.tax, Math.round(3198 * 0.08));
  assert.equal(order.total, 3198 + order.tax);
});

test('ignores client-supplied prices', () => {
  const body = validOrder({ total: 1, subtotal: 1 });
  body.items[0].unitPrice = 1;
  const order = buildOrder(body);
  assert.equal(order.items[0].unitPrice, 1599);
  assert.notEqual(order.total, 1);
});

test('delivery adds a fee and requires an address', () => {
  assert.throws(() => buildOrder(validOrder({ fulfillment: 'delivery' })), /address is required/i);

  const order = buildOrder(validOrder({
    fulfillment: 'delivery',
    customer: { name: 'Pat', phone: '555-123-4567', address: '1 Main St' },
  }));
  assert.equal(order.deliveryFee, 399);
  assert.equal(order.customer.address, '1 Main St');
});

test('pickup orders drop any address', () => {
  const order = buildOrder(validOrder({ customer: { name: 'Pat', phone: '5551234567', address: 'x' } }));
  assert.equal(order.customer.address, undefined);
});

test('rejects invalid input with a ValidationError', () => {
  const cases = [
    [validOrder({ items: [] }), /cart is empty/],
    [validOrder({ items: [{ pizzaId: 'nope', size: 'small' }] }), /unknown pizza/],
    [validOrder({ items: [{ pizzaId: 'cheese', size: 'huge' }] }), /choose a size/],
    [validOrder({ items: [{ pizzaId: 'cheese', size: 'small', quantity: 0 }] }), /quantity/],
    [validOrder({ items: [{ pizzaId: 'cheese', size: 'small', quantity: 1.5 }] }), /quantity/],
    [validOrder({ items: [{ pizzaId: 'cheese', size: 'small', extras: ['gold'] }] }), /unknown topping/],
    [validOrder({ items: [{ pizzaId: 'cheese', size: 'small', extras: ['bacon', 'bacon'] }] }), /duplicate/],
    [validOrder({ items: [{ pizzaId: 'pepperoni', size: 'small', extras: ['pepperoni'] }] }), /already comes/],
    [validOrder({ customer: { name: '  ', phone: '5551234567' } }), /Name is required/],
    [validOrder({ customer: { name: 'Pat', phone: 'call me' } }), /valid phone/],
    [validOrder({ fulfillment: 'drone' }), /pickup or delivery/],
    [null, /JSON object/],
  ];
  for (const [body, message] of cases) {
    assert.throws(() => buildOrder(body), (err) => err instanceof ValidationError && message.test(err.message));
  }
});

test('status advances with time and differs by fulfillment', () => {
  const placed = Date.parse('2026-01-01T12:00:00Z');
  const at = (minutes) => placed + minutes * 60_000;
  const pickup = { createdAt: new Date(placed).toISOString(), fulfillment: 'pickup' };
  const delivery = { ...pickup, fulfillment: 'delivery' };

  assert.equal(orderStatus(pickup, at(0)), 'received');
  assert.equal(orderStatus(pickup, at(5)), 'preparing');
  assert.equal(orderStatus(pickup, at(10)), 'baking');
  assert.equal(orderStatus(pickup, at(60)), 'ready');
  assert.equal(orderStatus(delivery, at(20)), 'out-for-delivery');
  assert.equal(orderStatus(delivery, at(60)), 'delivered');
});
