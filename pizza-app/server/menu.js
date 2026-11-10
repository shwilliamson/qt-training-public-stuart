'use strict';

// All prices are in cents to avoid floating-point rounding errors.

const SIZES = [
  { id: 'small', label: 'Small 10"', priceAdjust: 0, toppingPrice: 150 },
  { id: 'medium', label: 'Medium 12"', priceAdjust: 300, toppingPrice: 200 },
  { id: 'large', label: 'Large 14"', priceAdjust: 600, toppingPrice: 250 },
];

const TOPPINGS = [
  { id: 'pepperoni', name: 'Pepperoni' },
  { id: 'sausage', name: 'Italian Sausage' },
  { id: 'bacon', name: 'Bacon' },
  { id: 'ham', name: 'Ham' },
  { id: 'chicken', name: 'Grilled Chicken' },
  { id: 'mushrooms', name: 'Mushrooms' },
  { id: 'onions', name: 'Red Onions' },
  { id: 'green-peppers', name: 'Green Peppers' },
  { id: 'black-olives', name: 'Black Olives' },
  { id: 'jalapenos', name: 'Jalapeños' },
  { id: 'pineapple', name: 'Pineapple' },
  { id: 'basil', name: 'Fresh Basil' },
  { id: 'extra-cheese', name: 'Extra Cheese' },
];

const PIZZAS = [
  {
    id: 'cheese',
    name: 'Classic Cheese',
    description: 'House tomato sauce and a blend of mozzarella and provolone.',
    basePrice: 1099,
    includes: [],
  },
  {
    id: 'pepperoni',
    name: 'Pepperoni',
    description: 'Loaded edge to edge with cupped pepperoni.',
    basePrice: 1299,
    includes: ['pepperoni'],
  },
  {
    id: 'margherita',
    name: 'Margherita',
    description: 'Fresh mozzarella, San Marzano tomatoes, basil, olive oil.',
    basePrice: 1349,
    includes: ['basil'],
  },
  {
    id: 'hawaiian',
    name: 'Hawaiian',
    description: 'Ham, pineapple, and a little bacon for good measure.',
    basePrice: 1449,
    includes: ['ham', 'pineapple', 'bacon'],
  },
  {
    id: 'veggie',
    name: 'Garden Veggie',
    description: 'Mushrooms, onions, green peppers, and black olives.',
    basePrice: 1499,
    includes: ['mushrooms', 'onions', 'green-peppers', 'black-olives'],
  },
  {
    id: 'supreme',
    name: 'Supreme',
    description: 'Pepperoni, sausage, mushrooms, onions, green peppers, olives.',
    basePrice: 1599,
    includes: ['pepperoni', 'sausage', 'mushrooms', 'onions', 'green-peppers', 'black-olives'],
  },
];

const DELIVERY_FEE = 399;
const TAX_RATE = 0.08;

function getMenu() {
  return {
    pizzas: PIZZAS,
    sizes: SIZES,
    toppings: TOPPINGS,
    deliveryFee: DELIVERY_FEE,
    taxRate: TAX_RATE,
  };
}

module.exports = { SIZES, TOPPINGS, PIZZAS, DELIVERY_FEE, TAX_RATE, getMenu };
