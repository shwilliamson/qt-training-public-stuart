'use strict';

const { SIZES, TOPPINGS, PIZZAS, DELIVERY_FEE, TAX_RATE } = require('./menu');

const MAX_ITEMS = 20;
const MAX_QUANTITY = 20;
const MAX_EXTRAS = 10;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const pizzaById = new Map(PIZZAS.map((p) => [p.id, p]));
const sizeById = new Map(SIZES.map((s) => [s.id, s]));
const toppingById = new Map(TOPPINGS.map((t) => [t.id, t]));

function fail(message) {
  throw new ValidationError(message);
}

function requireString(value, field, maxLength, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) fail(`${field} is required.`);
    return '';
  }
  if (typeof value !== 'string') fail(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && trimmed === '') fail(`${field} is required.`);
  if (trimmed.length > maxLength) fail(`${field} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

/** Validates one cart line and returns it with server-side pricing. */
function priceItem(item, index) {
  const label = `Item ${index + 1}`;
  if (!item || typeof item !== 'object') fail(`${label} is invalid.`);

  const pizza = pizzaById.get(item.pizzaId);
  if (!pizza) fail(`${label}: unknown pizza.`);

  const size = sizeById.get(item.size);
  if (!size) fail(`${label}: choose a size (small, medium, or large).`);

  const extras = item.extras ?? [];
  if (!Array.isArray(extras)) fail(`${label}: extras must be a list.`);
  if (extras.length > MAX_EXTRAS) fail(`${label}: no more than ${MAX_EXTRAS} extra toppings.`);
  if (new Set(extras).size !== extras.length) fail(`${label}: duplicate extra topping.`);
  for (const id of extras) {
    if (!toppingById.has(id)) fail(`${label}: unknown topping "${id}".`);
    if (pizza.includes.includes(id)) fail(`${label}: ${toppingById.get(id).name} already comes on the ${pizza.name}.`);
  }

  const quantity = item.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    fail(`${label}: quantity must be a whole number from 1 to ${MAX_QUANTITY}.`);
  }

  const unitPrice = pizza.basePrice + size.priceAdjust + extras.length * size.toppingPrice;
  return {
    pizzaId: pizza.id,
    name: pizza.name,
    size: size.id,
    sizeLabel: size.label,
    extras: extras.map((id) => ({ id, name: toppingById.get(id).name })),
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
  };
}

/**
 * Validates an order request and computes all prices on the server.
 * Client-supplied prices are never trusted. Throws ValidationError on bad input.
 */
function buildOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Order must be a JSON object.');

  const { items, customer, fulfillment } = body;
  if (!Array.isArray(items) || items.length === 0) fail('Your cart is empty.');
  if (items.length > MAX_ITEMS) fail(`No more than ${MAX_ITEMS} items per order.`);
  const pricedItems = items.map(priceItem);

  if (!customer || typeof customer !== 'object') fail('Customer details are required.');
  const name = requireString(customer.name, 'Name', 100);
  const phone = requireString(customer.phone, 'Phone', 20);
  const digits = phone.replace(/\D/g, '');
  if (!/^[0-9()+\-.\s]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    fail('Phone must be a valid phone number.');
  }

  if (fulfillment !== 'pickup' && fulfillment !== 'delivery') fail('Choose pickup or delivery.');
  const address = requireString(customer.address, 'Delivery address', 200, {
    required: fulfillment === 'delivery',
  });
  const notes = requireString(body.notes, 'Notes', 300, { required: false });

  const subtotal = pricedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const deliveryFee = fulfillment === 'delivery' ? DELIVERY_FEE : 0;
  const tax = Math.round(subtotal * TAX_RATE);

  return {
    items: pricedItems,
    customer: { name, phone, ...(fulfillment === 'delivery' ? { address } : {}) },
    fulfillment,
    notes,
    subtotal,
    deliveryFee,
    tax,
    total: subtotal + deliveryFee + tax,
  };
}

const MINUTE = 60 * 1000;

/** Simulated kitchen progress, derived from how long ago the order was placed. */
function orderStatus(order, now = Date.now()) {
  const elapsed = now - new Date(order.createdAt).getTime();
  if (elapsed < 2 * MINUTE) return 'received';
  if (elapsed < 8 * MINUTE) return 'preparing';
  if (elapsed < 15 * MINUTE) return 'baking';
  if (order.fulfillment === 'pickup') return 'ready';
  if (elapsed < 30 * MINUTE) return 'out-for-delivery';
  return 'delivered';
}

function estimatedReadyAt(order) {
  const minutes = order.fulfillment === 'delivery' ? 30 : 15;
  return new Date(new Date(order.createdAt).getTime() + minutes * MINUTE).toISOString();
}

module.exports = { ValidationError, buildOrder, priceItem, orderStatus, estimatedReadyAt };
