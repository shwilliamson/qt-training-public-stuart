const $ = (sel) => document.querySelector(sel);
const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const CART_KEY = 'slice-shop-cart';

let menu;
let cart = loadCart();
let editing = null; // { name } for the pizza being built
let pollTimer = null;

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* storage unavailable; cart still works for this visit */
  }
}

// Mirrors server pricing for display. The server recalculates on checkout.
function unitPrice({ size, crust, toppings }) {
  const s = menu.sizes.find((x) => x.id === size);
  const c = menu.crusts.find((x) => x.id === crust);
  return s.price + c.price + toppings.length * s.toppingPrice;
}

const nameOf = (list, id) => menu[list].find((x) => x.id === id)?.name ?? id;

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// ---------- Menu ----------

function renderMenu() {
  const grid = $('#specialties');
  const base = unitPrice({ size: 'medium', crust: 'hand-tossed', toppings: [] });
  for (const sp of menu.specialties) {
    const from = base + sp.toppings.length * menu.sizes.find((s) => s.id === 'medium').toppingPrice;
    grid.append(
      el('article', { className: 'card' },
        el('h3', { textContent: sp.name }),
        el('p', { className: 'muted', textContent: sp.description }),
        el('p', { className: 'price', textContent: `Medium ${money(from)}` }),
        el('button', { className: 'btn btn-primary', textContent: 'Customize & add', onclick: () => openBuilder(sp) }),
      ),
    );
  }
  grid.append(
    el('article', { className: 'card card-custom' },
      el('h3', { textContent: 'Build your own' }),
      el('p', { className: 'muted', textContent: 'Start with cheese and pick everything yourself.' }),
      el('p', { className: 'price', textContent: `From ${money(menu.sizes[0].price)}` }),
      el('button', { className: 'btn btn-primary', textContent: 'Start building', onclick: () => openBuilder(null) }),
    ),
  );
}

// ---------- Builder ----------

function radioGroup(container, name, items, selected, label) {
  container.replaceChildren(
    ...items.map((item) =>
      el('label', { className: 'option' },
        el('input', { type: 'radio', name, value: item.id, checked: item.id === selected }),
        label(item),
      ),
    ),
  );
}

function openBuilder(specialty) {
  editing = { name: specialty ? specialty.name : 'Custom Pizza' };
  $('#builder-title').textContent = editing.name;
  radioGroup($('#size-options'), 'size', menu.sizes, 'medium', (s) => `${s.name} — ${money(s.price)}`);
  radioGroup($('#crust-options'), 'crust', menu.crusts, 'hand-tossed', (c) => (c.price ? `${c.name} (+${money(c.price)})` : c.name));
  const chosen = new Set(specialty?.toppings ?? []);
  $('#topping-options').replaceChildren(
    ...menu.toppings.map((t) =>
      el('label', { className: 'option' },
        el('input', { type: 'checkbox', name: 'topping', value: t.id, checked: chosen.has(t.id) }),
        t.name,
      ),
    ),
  );
  $('#qty').value = 1;
  updateBuilderPrice();
  $('#builder').showModal();
}

function readBuilder() {
  const form = $('#builder-form');
  return {
    name: editing.name,
    size: form.size.value,
    crust: form.crust.value,
    toppings: [...form.querySelectorAll('input[name=topping]:checked')].map((i) => i.value),
    quantity: Math.min(20, Math.max(1, parseInt($('#qty').value, 10) || 1)),
  };
}

function updateBuilderPrice() {
  const item = readBuilder();
  const size = menu.sizes.find((s) => s.id === item.size);
  $('#topping-price').textContent = `(${money(size.toppingPrice)} each)`;
  $('#builder-price').textContent = money(unitPrice(item) * item.quantity);
}

$('#builder-form').addEventListener('input', updateBuilderPrice);
$('#builder-cancel').addEventListener('click', () => $('#builder').close());
$('#builder-form').addEventListener('submit', () => {
  cart.push(readBuilder());
  saveCart();
  renderCart();
});

// ---------- Cart ----------

function describe(item) {
  const tops = item.toppings.length ? item.toppings.map((t) => nameOf('toppings', t)).join(', ') : 'Cheese only';
  return `${nameOf('sizes', item.size)} · ${nameOf('crusts', item.crust)} · ${tops}`;
}

function totals() {
  const subtotal = cart.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0);
  const delivery = $('#checkout').fulfillment.value === 'delivery' ? menu.deliveryFee : 0;
  const tax = Math.round(subtotal * menu.taxRate);
  return { subtotal, delivery, tax, total: subtotal + delivery + tax };
}

function totalsRows(t) {
  const rows = [['Subtotal', t.subtotal]];
  if (t.delivery) rows.push(['Delivery', t.delivery]);
  rows.push(['Tax', t.tax], ['Total', t.total]);
  return rows.map(([k, v]) => el('div', { className: k === 'Total' ? 'row total' : 'row' }, el('span', { textContent: k }), el('span', { textContent: money(v) })));
}

function changeQty(index, delta) {
  const item = cart[index];
  item.quantity += delta;
  if (item.quantity < 1) cart.splice(index, 1);
  else item.quantity = Math.min(20, item.quantity);
  saveCart();
  renderCart();
}

function renderCart() {
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  $('#cart-count').textContent = count;
  $('#cart-empty').hidden = cart.length > 0;
  $('#checkout').hidden = cart.length === 0;
  $('#cart-items').replaceChildren(
    ...cart.map((item, i) =>
      el('li', { className: 'cart-item' },
        el('div', {},
          el('strong', { textContent: item.name }),
          el('div', { className: 'muted small', textContent: describe(item) }),
        ),
        el('div', { className: 'cart-controls' },
          el('button', { className: 'icon', textContent: '−', ariaLabel: 'Decrease', onclick: () => changeQty(i, -1) }),
          el('span', { textContent: item.quantity }),
          el('button', { className: 'icon', textContent: '+', ariaLabel: 'Increase', onclick: () => changeQty(i, 1) }),
          el('span', { className: 'line-price', textContent: money(unitPrice(item) * item.quantity) }),
        ),
      ),
    ),
  );
  if (cart.length) $('#totals').replaceChildren(...totalsRows(totals()));
}

$('#checkout').addEventListener('change', (e) => {
  if (e.target.name !== 'fulfillment') return;
  $('#address-field').hidden = e.target.value !== 'delivery';
  renderCart();
});

$('#cart-toggle').addEventListener('click', () => $('#cart').scrollIntoView({ behavior: 'smooth' }));

$('#checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button[type=submit]');
  $('#checkout-error').textContent = '';
  button.disabled = true;
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fulfillment: form.fulfillment.value,
        customer: { name: form.elements.name.value, phone: form.elements.phone.value, address: form.elements.address.value },
        items: cart,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Order failed');
    cart = [];
    saveCart();
    renderCart();
    form.reset();
    $('#address-field').hidden = true;
    location.hash = `order/${data.id}`;
  } catch (err) {
    $('#checkout-error').textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

// ---------- Order tracking ----------

const STEPS = {
  pickup: ['Received', 'In the oven', 'Ready for pickup'],
  delivery: ['Received', 'In the oven', 'Out for delivery', 'Delivered'],
};

async function showOrder(id) {
  clearTimeout(pollTimer);
  const res = await fetch(`/api/orders/${encodeURIComponent(id)}`);
  if (!res.ok) {
    location.hash = '';
    return;
  }
  const order = await res.json();
  $('#menu-view').hidden = true;
  $('#cart').hidden = true;
  $('#track-view').hidden = false;
  $('#track-id').textContent = `#${order.id}`;
  $('#track-status').textContent = order.status;

  const steps = STEPS[order.fulfillment];
  const current = steps.indexOf(order.status);
  $('#track-steps').replaceChildren(
    ...steps.map((s, i) => el('li', { className: i < current ? 'done' : i === current ? 'current' : '', textContent: s })),
  );
  $('#track-summary').replaceChildren(
    el('p', { textContent: `${order.fulfillment === 'delivery' ? 'Delivering to' : 'Pickup for'} ${order.customer.name}${order.customer.address ? ` at ${order.customer.address}` : ''}` }),
    el('ul', { className: 'cart-items' },
      ...order.lines.map((l) => el('li', { className: 'cart-item' },
        el('div', {}, el('strong', { textContent: `${l.quantity} × ${l.name}` }), el('div', { className: 'muted small', textContent: describe(l) })),
        el('span', { textContent: money(l.lineTotal) }),
      )),
    ),
    el('div', { className: 'totals' }, ...totalsRows({ subtotal: order.subtotal, delivery: order.deliveryFee, tax: order.tax, total: order.total })),
  );

  if (current < steps.length - 1) pollTimer = setTimeout(() => showOrder(id), 10000);
}

function showMenu() {
  clearTimeout(pollTimer);
  $('#menu-view').hidden = false;
  $('#cart').hidden = false;
  $('#track-view').hidden = true;
}

$('#new-order').addEventListener('click', () => (location.hash = ''));

function route() {
  const m = location.hash.match(/^#order\/([A-Za-z0-9]+)$/);
  if (m) showOrder(m[1]);
  else showMenu();
}

window.addEventListener('hashchange', route);

// ---------- Start ----------

menu = await (await fetch('/api/menu')).json();
renderMenu();
renderCart();
route();
