// Customer ordering page: pizza builder, cart, submit, confirmation.
"use strict";

const CART_KEY = "np.cart";
const MIN_QTY = 1;
const MAX_QTY = 20;

const state = {
  menu: null,                                  // { sizes: [...], toppings: [...] }
  builder: { size: null, toppings: new Set() },
  cart: [],                                    // [{ size, toppings: [ids, menu order], quantity }]
  submitting: false,
};

const $ = (id) => document.getElementById(id);

// ---------- pricing (display only; the server recalculates on submit) ----------

function findSize(id) { return state.menu.sizes.find((s) => s.id === id); }
function findTopping(id) { return state.menu.toppings.find((t) => t.id === id); }

function unitPriceCents(sizeId, toppingIds) {
  return findSize(sizeId).priceCents + toppingIds.reduce((sum, id) => sum + findTopping(id).priceCents, 0);
}

function cartTotalCents() {
  return state.cart.reduce((sum, line) => sum + unitPriceCents(line.size, line.toppings) * line.quantity, 0);
}

/** Toppings in menu order, so the same pizza always has the same key. */
function normalizeToppings(ids) {
  return state.menu.toppings.map((t) => t.id).filter((id) => ids.includes(id));
}

function lineKey(size, toppings) { return size + "|" + toppings.join(","); }

function clampQty(n) { return Math.min(MAX_QTY, Math.max(MIN_QTY, n)); }

// ---------- cart persistence ----------

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  } catch { /* storage unavailable: cart just won't survive refresh */ }
}

function loadCart() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { raw = []; }
  if (!Array.isArray(raw)) return [];
  const result = [];
  for (const line of raw) {
    if (!line || !findSize(line.size) || !Array.isArray(line.toppings)) continue;
    if (!line.toppings.every((id) => findTopping(id))) continue;
    if (new Set(line.toppings).size !== line.toppings.length) continue;
    if (!Number.isInteger(line.quantity) || line.quantity < MIN_QTY || line.quantity > MAX_QTY) continue;
    result.push({ size: line.size, toppings: normalizeToppings(line.toppings), quantity: line.quantity });
  }
  return result;
}

// ---------- builder ----------

function resetBuilder() {
  state.builder.size = state.menu.sizes[0].id;
  state.builder.toppings = new Set();
  for (const input of document.querySelectorAll("#builder input")) {
    input.checked = input.type === "radio" && input.value === state.builder.size;
  }
  renderBuilderPrice();
}

function renderBuilder() {
  const sizes = $("sizes");
  sizes.replaceChildren(...state.menu.sizes.map((s) =>
    el("label", { class: "choice" },
      el("input", {
        type: "radio", name: "size", value: s.id,
        on: { change: () => { state.builder.size = s.id; renderBuilderPrice(); } },
      }),
      el("span", { class: "choice-name", text: s.name }),
      el("span", { class: "choice-price", text: formatCents(s.priceCents) }))));

  const toppings = $("toppings");
  toppings.replaceChildren(...state.menu.toppings.map((t) =>
    el("label", { class: "choice" },
      el("input", {
        type: "checkbox", name: "topping", value: t.id,
        on: {
          change: (e) => {
            if (e.target.checked) state.builder.toppings.add(t.id); else state.builder.toppings.delete(t.id);
            renderBuilderPrice();
          },
        },
      }),
      el("span", { class: "choice-name", text: t.name }),
      el("span", { class: "choice-price", text: "+" + formatCents(t.priceCents) }))));

  resetBuilder();
}

function renderBuilderPrice() {
  const toppings = normalizeToppings([...state.builder.toppings]);
  $("pizza-price").textContent = formatCents(unitPriceCents(state.builder.size, toppings));
}

function addToOrder(e) {
  e.preventDefault();
  const size = state.builder.size;
  const toppings = normalizeToppings([...state.builder.toppings]);
  const key = lineKey(size, toppings);
  const existing = state.cart.find((l) => lineKey(l.size, l.toppings) === key);
  let message;
  if (existing) {
    if (existing.quantity >= MAX_QTY) {
      message = `You already have the maximum of ${MAX_QTY} of that pizza.`;
    } else {
      existing.quantity += 1;
      message = "Added another to your order.";
    }
  } else {
    state.cart.push({ size, toppings, quantity: 1 });
    message = "Added to your order.";
  }
  $("add-status").textContent = message;
  clearServerErrors();
  cartChanged();
  resetBuilder();
}

// ---------- cart ----------

function describePizza(line) {
  const names = line.toppings.map((id) => findTopping(id).name);
  return { title: findSize(line.size).name, toppings: toppingsText(names) };
}

function renderCart() {
  const list = $("cart-lines");
  list.replaceChildren(...state.cart.map((line, index) => {
    const unit = unitPriceCents(line.size, line.toppings);
    const d = describePizza(line);
    const qtyInput = el("input", {
      type: "number", min: MIN_QTY, max: MAX_QTY, step: 1, value: line.quantity, class: "qty-input",
      attrs: { "aria-label": `Quantity for ${d.title}, ${d.toppings}`, inputmode: "numeric" },
      on: {
        change: (e) => {
          const n = parseInt(e.target.value, 10);
          setQuantity(index, Number.isNaN(n) ? line.quantity : n);
        },
      },
    });
    return el("li", { class: "cart-line" },
      el("div", { class: "line-info" },
        el("div", { class: "line-title", text: d.title }),
        el("div", { class: "line-toppings", text: d.toppings }),
        el("div", { class: "line-unit", text: formatCents(unit) + " each" })),
      el("div", { class: "qty" },
        el("button", {
          type: "button", class: "btn btn-qty", text: "−", disabled: line.quantity <= MIN_QTY,
          attrs: { "aria-label": `Decrease quantity of ${d.title}` },
          on: { click: () => setQuantity(index, line.quantity - 1) },
        }),
        qtyInput,
        el("button", {
          type: "button", class: "btn btn-qty", text: "+", disabled: line.quantity >= MAX_QTY,
          attrs: { "aria-label": `Increase quantity of ${d.title}` },
          on: { click: () => setQuantity(index, line.quantity + 1) },
        })),
      el("div", { class: "line-total", text: formatCents(unit * line.quantity) }),
      el("button", {
        type: "button", class: "btn btn-link", text: "Remove",
        attrs: { "aria-label": `Remove ${d.title}, ${d.toppings}` },
        on: { click: () => removeLine(index) },
      }));
  }));

  $("cart-empty").hidden = state.cart.length > 0;
  $("cart-total").textContent = formatCents(cartTotalCents());
}

function setQuantity(index, n) {
  state.cart[index].quantity = clampQty(n);
  cartChanged();
}

function removeLine(index) {
  state.cart.splice(index, 1);
  $("add-status").textContent = "";
  cartChanged();
}

function cartChanged() {
  saveCart();
  renderCart();
  updateSubmitState();
}

// ---------- submit ----------

function updateSubmitState() {
  const nameOk = $("customer-name").value.trim().length > 0;
  const btn = $("submit-btn");
  btn.disabled = state.submitting || state.cart.length === 0 || !nameOk;
  btn.textContent = state.submitting ? "Placing order…" : "Place pickup order";
}

function showError(id, messages) {
  const node = $(id);
  node.textContent = messages.join(" ");
  node.hidden = messages.length === 0;
}

function clearServerErrors() {
  showError("name-error", []);
  showError("items-error", []);
  showError("submit-error", []);
}

async function submitOrder(e) {
  e.preventDefault();
  if (state.submitting) return;
  clearServerErrors();

  const name = $("customer-name").value.trim();
  if (state.cart.length === 0) { showError("items-error", ["Your order is empty."]); return; }
  if (!name) { showError("name-error", ["Please enter your name."]); return; }

  state.submitting = true;
  updateSubmitState();
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        items: state.cart.map((l) => ({ size: l.size, toppings: l.toppings, quantity: l.quantity })),
      }),
    });

    if (res.status === 201) {
      const order = await res.json();
      state.cart = [];
      saveCart();
      renderCart();
      showConfirmation(order);
      return;
    }

    if (res.status === 400) {
      const problem = await res.json().catch(() => ({}));
      const errors = problem.errors || {};
      const nameErrors = errors.customerName || [];
      const itemErrors = Object.entries(errors)
        .filter(([k]) => k !== "customerName")
        .flatMap(([, v]) => v);
      showError("name-error", nameErrors);
      showError("items-error", itemErrors);
      if (!nameErrors.length && !itemErrors.length) showError("submit-error", ["Please check your order and try again."]);
      return;
    }

    showError("submit-error", ["We couldn't place your order. Please try again."]);
  } catch {
    showError("submit-error", ["We couldn't place your order. Please try again."]);
  } finally {
    state.submitting = false;
    updateSubmitState();
  }
}

// ---------- confirmation ----------

function showConfirmation(order) {
  $("confirm-number").textContent = order.orderNumber;
  $("confirm-name").textContent = order.customerName;
  $("confirm-lines").replaceChildren(...order.items.map((item) =>
    el("li", { class: "cart-line" },
      el("div", { class: "line-info" },
        el("div", { class: "line-title", text: `${item.quantity} × ${item.sizeName}` }),
        el("div", { class: "line-toppings", text: toppingsText(item.toppings.map((t) => t.name)) }),
        el("div", { class: "line-unit", text: formatCents(item.unitPriceCents) + " each" })),
      el("div", { class: "line-total", text: formatCents(item.lineTotalCents) }))));
  $("confirm-total").textContent = formatCents(order.totalCents);

  $("order-view").hidden = true;
  $("confirm-view").hidden = false;
  $("confirm-title").focus();
  window.scrollTo(0, 0);
}

function startNewOrder() {
  $("customer-name").value = "";
  $("add-status").textContent = "";
  clearServerErrors();
  resetBuilder();
  renderCart();
  updateSubmitState();
  $("confirm-view").hidden = true;
  $("order-view").hidden = false;
  window.scrollTo(0, 0);
}

// ---------- init ----------

async function init() {
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) throw new Error("menu " + res.status);
    state.menu = await res.json();
  } catch {
    const err = $("load-error");
    err.textContent = "We couldn't load the menu. Please refresh the page.";
    err.hidden = false;
    $("add-btn").disabled = true;
    return;
  }

  state.cart = loadCart();
  saveCart();
  renderBuilder();
  renderCart();
  updateSubmitState();

  $("builder").addEventListener("submit", addToOrder);
  $("place-form").addEventListener("submit", submitOrder);
  $("customer-name").addEventListener("input", () => { showError("name-error", []); updateSubmitState(); });
  $("new-order-btn").addEventListener("click", startNewOrder);
}

init();
