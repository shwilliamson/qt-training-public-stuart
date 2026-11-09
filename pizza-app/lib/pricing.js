import { SIZES, CRUSTS, TOPPINGS, DELIVERY_FEE, TAX_RATE, MAX_QUANTITY } from './menu.js';

const byId = (list) => new Map(list.map((x) => [x.id, x]));
const sizes = byId(SIZES);
const crusts = byId(CRUSTS);
const toppings = byId(TOPPINGS);

export class ValidationError extends Error {}

// Returns the price of one pizza in cents. Throws ValidationError on bad input.
export function priceItem(item) {
  const size = sizes.get(item?.size);
  if (!size) throw new ValidationError(`Unknown size: ${item?.size}`);
  const crust = crusts.get(item.crust);
  if (!crust) throw new ValidationError(`Unknown crust: ${item.crust}`);
  const list = item.toppings ?? [];
  if (!Array.isArray(list)) throw new ValidationError('Toppings must be a list');
  if (new Set(list).size !== list.length) throw new ValidationError('Duplicate toppings');
  for (const t of list) {
    if (!toppings.has(t)) throw new ValidationError(`Unknown topping: ${t}`);
  }
  return size.price + crust.price + list.length * size.toppingPrice;
}

// Prices a whole order on the server so the client cannot set its own prices.
export function priceOrder({ items, fulfillment }) {
  if (!Array.isArray(items) || items.length === 0) throw new ValidationError('Your cart is empty');
  if (fulfillment !== 'pickup' && fulfillment !== 'delivery') throw new ValidationError('Choose pickup or delivery');

  const lines = items.map((item) => {
    const quantity = item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new ValidationError(`Quantity must be between 1 and ${MAX_QUANTITY}`);
    }
    const unitPrice = priceItem(item);
    return {
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 60) : 'Custom Pizza',
      size: item.size,
      crust: item.crust,
      toppings: item.toppings ?? [],
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const deliveryFee = fulfillment === 'delivery' ? DELIVERY_FEE : 0;
  const tax = Math.round(subtotal * TAX_RATE);
  return { lines, subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
}
