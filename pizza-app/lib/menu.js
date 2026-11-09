// Prices are in cents to avoid floating-point rounding errors.

export const SIZES = [
  { id: 'small', name: 'Small (10")', price: 1000, toppingPrice: 100 },
  { id: 'medium', name: 'Medium (12")', price: 1300, toppingPrice: 150 },
  { id: 'large', name: 'Large (14")', price: 1600, toppingPrice: 200 },
];

export const CRUSTS = [
  { id: 'hand-tossed', name: 'Hand tossed', price: 0 },
  { id: 'thin', name: 'Thin & crispy', price: 0 },
  { id: 'deep-dish', name: 'Deep dish', price: 200 },
  { id: 'gluten-free', name: 'Gluten free', price: 300 },
];

export const TOPPINGS = [
  { id: 'pepperoni', name: 'Pepperoni' },
  { id: 'sausage', name: 'Italian sausage' },
  { id: 'bacon', name: 'Bacon' },
  { id: 'ham', name: 'Ham' },
  { id: 'chicken', name: 'Grilled chicken' },
  { id: 'mushrooms', name: 'Mushrooms' },
  { id: 'onions', name: 'Red onions' },
  { id: 'peppers', name: 'Green peppers' },
  { id: 'olives', name: 'Black olives' },
  { id: 'jalapenos', name: 'Jalapeños' },
  { id: 'pineapple', name: 'Pineapple' },
  { id: 'extra-cheese', name: 'Extra cheese' },
];

// Specialty pizzas are preset topping lists; they are priced like a custom pizza.
export const SPECIALTIES = [
  { id: 'cheese', name: 'Classic Cheese', description: 'Mozzarella and our house tomato sauce.', toppings: [] },
  { id: 'pepperoni', name: 'Pepperoni', description: 'Loaded with crispy-edged pepperoni.', toppings: ['pepperoni'] },
  { id: 'supreme', name: 'Supreme', description: 'Pepperoni, sausage, mushrooms, onions, peppers, olives.', toppings: ['pepperoni', 'sausage', 'mushrooms', 'onions', 'peppers', 'olives'] },
  { id: 'meat-lovers', name: 'Meat Lovers', description: 'Pepperoni, sausage, bacon, and ham.', toppings: ['pepperoni', 'sausage', 'bacon', 'ham'] },
  { id: 'veggie', name: 'Garden Veggie', description: 'Mushrooms, onions, peppers, olives.', toppings: ['mushrooms', 'onions', 'peppers', 'olives'] },
  { id: 'hawaiian', name: 'Hawaiian', description: 'Ham and pineapple.', toppings: ['ham', 'pineapple'] },
];

export const DELIVERY_FEE = 399;
export const TAX_RATE = 0.0825;
export const MAX_QUANTITY = 20;

export function getMenu() {
  return { sizes: SIZES, crusts: CRUSTS, toppings: TOPPINGS, specialties: SPECIALTIES, deliveryFee: DELIVERY_FEE, taxRate: TAX_RATE };
}
