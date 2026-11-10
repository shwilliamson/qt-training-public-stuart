'use strict';

const CART_KEY = 'slice-shop-cart';
const POLL_MS = 15000;

const STEPS = {
  pickup: [
    ['received', 'Received'],
    ['preparing', 'Preparing'],
    ['baking', 'Baking'],
    ['ready', 'Ready for pickup'],
  ],
  delivery: [
    ['received', 'Received'],
    ['preparing', 'Preparing'],
    ['baking', 'Baking'],
    ['out-for-delivery', 'Out for delivery'],
    ['delivered', 'Delivered'],
  ],
};

const state = { menu: null, cart: loadCart(), pollTimer: null };
const $ = (id) => document.getElementById(id);
const money = (cents) => `$${(cents / 100).toFixed(2)}`;

/** Small DOM helper. Text is always set via textContent, so user input is never parsed as HTML. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children.filter(Boolean));
  return node;
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  } catch {
    /* storage unavailable; cart just won't persist */
  }
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---- Pricing (estimate only; the server recalculates on checkout) ----

function unitPrice(item) {
  const pizza = state.menu.pizzas.find((p) => p.id === item.pizzaId);
  const size = state.menu.sizes.find((s) => s.id === item.size);
  if (!pizza || !size) return 0;
  return pizza.basePrice + size.priceAdjust + item.extras.length * size.toppingPrice;
}

function cartTotals() {
  const subtotal = state.cart.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0);
  const delivery = selectedFulfillment() === 'delivery';
  const deliveryFee = delivery ? state.menu.deliveryFee : 0;
  const tax = Math.round(subtotal * state.menu.taxRate);
  return { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax };
}

function selectedFulfillment() {
  return $('checkout-form').elements.fulfillment.value;
}

// ---- Menu ----

function toppingName(id) {
  return state.menu.toppings.find((t) => t.id === id)?.name ?? id;
}

function renderMenu() {
  const container = $('menu');
  container.replaceChildren(...state.menu.pizzas.map(pizzaCard));
}

function pizzaCard(pizza) {
  const sizeName = `size-${pizza.id}`;
  const priceEl = el('span', { class: 'price' });
  const qty = el('input', { type: 'number', min: '1', max: '20', value: '1', 'aria-label': `${pizza.name} quantity` });

  const sizes = el('fieldset', { class: 'sizes' },
    el('legend', { class: 'visually-hidden', text: 'Size' }),
    ...state.menu.sizes.map((s, i) => {
      const input = el('input', { type: 'radio', name: sizeName, value: s.id });
      if (i === 1) input.checked = true;
      return el('label', {}, input, s.label);
    }),
  );

  const available = state.menu.toppings.filter((t) => !pizza.includes.includes(t.id));
  const extrasList = el('div', { class: 'extras-list' },
    ...available.map((t) => el('label', {}, el('input', { type: 'checkbox', value: t.id }), ` ${t.name}`)),
  );
  const extras = el('details', { class: 'extras' }, el('summary', { text: 'Add toppings' }), extrasList);

  const currentItem = () => ({
    pizzaId: pizza.id,
    size: sizes.querySelector('input:checked').value,
    extras: [...extrasList.querySelectorAll('input:checked')].map((c) => c.value),
    quantity: Math.min(20, Math.max(1, parseInt(qty.value, 10) || 1)),
  });

  const updatePrice = () => {
    const item = currentItem();
    priceEl.textContent = money(unitPrice(item) * item.quantity);
  };

  const card = el('article', { class: 'pizza-card', oninput: updatePrice, onchange: updatePrice },
    el('h3', { text: pizza.name }),
    el('p', { class: 'muted', text: pizza.description }),
    sizes,
    extras,
    el('div', { class: 'card-footer' },
      priceEl,
      qty,
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        text: 'Add',
        onclick: () => {
          addToCart(currentItem());
          extrasList.querySelectorAll('input:checked').forEach((c) => { c.checked = false; });
          extras.open = false;
          qty.value = '1';
          updatePrice();
        },
      }),
    ),
  );
  updatePrice();
  return card;
}

// ---- Cart ----

function sameItem(a, b) {
  return a.pizzaId === b.pizzaId && a.size === b.size &&
    [...a.extras].sort().join() === [...b.extras].sort().join();
}

function addToCart(item) {
  const existing = state.cart.find((i) => sameItem(i, item));
  if (existing) existing.quantity = Math.min(20, existing.quantity + item.quantity);
  else state.cart.push(item);
  saveCart();
  renderCart();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  saveCart();
  renderCart();
}

function itemDetails(sizeLabel, extraNames) {
  return [sizeLabel, ...extraNames.map((n) => `+ ${n}`)].join(' · ');
}

function renderTotals(dl, { subtotal, deliveryFee, tax, total }) {
  const rows = [['Subtotal', subtotal]];
  if (deliveryFee) rows.push(['Delivery', deliveryFee]);
  rows.push(['Tax', tax]);
  dl.replaceChildren(
    ...rows.flatMap(([label, cents]) => [el('dt', { text: label }), el('dd', { text: money(cents) })]),
    el('dt', { class: 'grand', text: 'Total' }),
    el('dd', { class: 'grand', text: money(total) }),
  );
}

function renderCart() {
  // Drop anything the menu no longer offers (e.g. a stale saved cart).
  state.cart = state.cart.filter((i) => unitPrice(i) > 0);
  const empty = state.cart.length === 0;
  $('cart-empty').hidden = !empty;
  $('cart-totals').hidden = empty;
  $('checkout-form').hidden = empty;

  $('cart-items').replaceChildren(...state.cart.map((item, index) => {
    const pizza = state.menu.pizzas.find((p) => p.id === item.pizzaId);
    const size = state.menu.sizes.find((s) => s.id === item.size);
    return el('li', {},
      el('div', {},
        el('div', { text: `${item.quantity} × ${pizza.name}` }),
        el('div', { class: 'details', text: itemDetails(size.label, item.extras.map(toppingName)) }),
        el('button', { type: 'button', class: 'btn btn-link', text: 'Remove', onclick: () => removeFromCart(index) }),
      ),
      el('strong', { text: money(unitPrice(item) * item.quantity) }),
    );
  }));

  if (!empty) renderTotals($('cart-totals'), cartTotals());
}

// ---- Checkout ----

async function placeOrder(event) {
  event.preventDefault();
  const form = event.target;
  const errorEl = $('checkout-error');
  const submit = form.querySelector('button[type=submit]');
  errorEl.hidden = true;

  const fulfillment = selectedFulfillment();
  const payload = {
    items: state.cart,
    fulfillment,
    customer: {
      name: form.elements.name.value,
      phone: form.elements.phone.value,
      ...(fulfillment === 'delivery' ? { address: form.elements.address.value } : {}),
    },
    notes: form.elements.notes.value,
  };

  submit.disabled = true;
  submit.textContent = 'Placing order…';
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    state.cart = [];
    saveCart();
    form.reset();
    toggleAddress();
    renderCart();
    showStatus(order);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = 'Place order';
  }
}

function toggleAddress() {
  const delivery = selectedFulfillment() === 'delivery';
  $('address-field').hidden = !delivery;
  $('checkout-form').elements.address.required = delivery;
  if (state.cart.length) renderTotals($('cart-totals'), cartTotals());
}

// ---- Order status ----

function showStatus(order) {
  $('order-view').hidden = true;
  $('status-view').hidden = false;
  history.replaceState(null, '', `#order/${order.id}`);

  $('status-id').textContent = order.id;
  const steps = STEPS[order.fulfillment];
  const currentIndex = steps.findIndex(([key]) => key === order.status);
  $('status-steps').replaceChildren(...steps.map(([, label], i) =>
    el('li', {
      class: i < currentIndex ? 'done' : i === currentIndex ? 'current' : '',
      text: label,
      ...(i === currentIndex ? { 'aria-current': 'step' } : {}),
    }),
  ));

  const eta = new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const finished = order.status === 'ready' || order.status === 'delivered';
  $('status-eta').textContent = finished
    ? (order.status === 'ready' ? 'Your order is ready. Come and get it!' : 'Delivered. Enjoy!')
    : `Estimated ${order.fulfillment === 'delivery' ? 'delivery' : 'ready'} by ${eta}`;

  $('status-items').replaceChildren(...order.items.map((item) =>
    el('li', {},
      el('div', {},
        el('div', { text: `${item.quantity} × ${item.name}` }),
        el('div', { class: 'details', text: itemDetails(item.sizeLabel, item.extras.map((e) => e.name)) }),
      ),
      el('strong', { text: money(item.lineTotal) }),
    ),
  ));
  renderTotals($('status-totals'), order);

  clearTimeout(state.pollTimer);
  if (!finished) {
    state.pollTimer = setTimeout(() => trackOrder(order.id), POLL_MS);
  }
}

async function trackOrder(id) {
  try {
    showStatus(await api(`/api/orders/${encodeURIComponent(id.trim())}`));
  } catch (err) {
    alertTrackError(err.message);
  }
}

function alertTrackError(message) {
  const input = $('track-id');
  input.setCustomValidity(message);
  input.reportValidity();
  input.addEventListener('input', () => input.setCustomValidity(''), { once: true });
}

function showOrderView() {
  clearTimeout(state.pollTimer);
  history.replaceState(null, '', location.pathname);
  $('status-view').hidden = true;
  $('order-view').hidden = false;
}

// ---- Startup ----

async function init() {
  $('checkout-form').addEventListener('submit', placeOrder);
  $('checkout-form').addEventListener('change', (e) => {
    if (e.target.name === 'fulfillment') toggleAddress();
  });
  $('new-order').addEventListener('click', showOrderView);
  $('track-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('track-id').value;
    if (id.trim()) trackOrder(id);
  });

  try {
    state.menu = await api('/api/menu');
  } catch (err) {
    $('menu-error').textContent = `Couldn't load the menu: ${err.message}`;
    $('menu-error').hidden = false;
    return;
  }
  renderMenu();
  renderCart();

  const match = location.hash.match(/^#order\/(.+)$/);
  if (match) trackOrder(decodeURIComponent(match[1]));
}

init();
