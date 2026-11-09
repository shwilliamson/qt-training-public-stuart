// Kitchen board: lists orders by status, polls every 5 seconds, marks orders Ready.
"use strict";

const POLL_MS = 5000;
const $ = (id) => document.getElementById(id);

// Inline errors for cards whose Mark Ready failed, keyed by order number. Survive re-renders.
const cardErrors = new Map();
let pollTimer = null;

function timeText(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderCard(order) {
  const isNew = order.status === "New";
  const error = cardErrors.get(order.orderNumber);
  return el("li", { class: "order-card " + (isNew ? "is-new" : "is-ready"), attrs: { "data-order": order.orderNumber } },
    el("div", { class: "card-head" },
      el("span", { class: "card-number", text: "#" + order.orderNumber }),
      el("span", { class: "badge " + (isNew ? "badge-new" : "badge-ready"), text: order.status })),
    el("div", { class: "card-name", text: order.customerName }),
    el("div", { class: "card-time", text: "Placed " + timeText(order.createdAt) +
      (order.readyAt ? " · Ready " + timeText(order.readyAt) : "") }),
    el("ul", { class: "card-items" },
      order.items.map((item) =>
        el("li", {},
          el("strong", { text: `${item.quantity} × ${item.sizeName}` }),
          el("div", { class: "line-toppings", text: toppingsText(item.toppings.map((t) => t.name)) })))),
    el("div", { class: "card-total", text: "Total " + formatCents(order.totalCents) }),
    isNew && el("button", {
      type: "button", class: "btn btn-primary btn-wide", text: "Mark Ready",
      on: { click: (e) => markReady(order.orderNumber, e.currentTarget) },
    }),
    error && el("p", { class: "field-error", attrs: { role: "alert" }, text: error }));
}

function render(orders) {
  const fresh = orders.filter((o) => o.status === "New");
  const ready = orders.filter((o) => o.status === "Ready");

  $("new-orders").replaceChildren(...fresh.map(renderCard));
  $("ready-orders").replaceChildren(...ready.map(renderCard));
  $("new-count").textContent = fresh.length;
  $("ready-count").textContent = ready.length;
  $("new-empty").hidden = fresh.length > 0;
  $("ready-empty").hidden = ready.length > 0;
}

async function refresh() {
  try {
    const res = await fetch("/api/orders", { cache: "no-store" });
    if (!res.ok) throw new Error("orders " + res.status);
    render(await res.json());
    $("conn-banner").hidden = true;
    $("last-updated").textContent = "Last updated " + new Date().toLocaleTimeString();
  } catch {
    $("conn-banner").hidden = false;
  }
}

async function markReady(orderNumber, button) {
  button.disabled = true;
  button.textContent = "Marking…";
  try {
    const res = await fetch(`/api/orders/${orderNumber}/ready`, { method: "POST" });
    if (!res.ok) throw new Error("ready " + res.status);
    cardErrors.delete(orderNumber);
  } catch {
    cardErrors.set(orderNumber, "Couldn't mark this order ready. Please try again.");
  }
  await refresh();
  // If refresh failed too, re-enable the button so staff can retry.
  if (button.isConnected) {
    button.disabled = false;
    button.textContent = "Mark Ready";
  }
}

async function poll() {
  await refresh();
  pollTimer = setTimeout(poll, POLL_MS);
}

poll();
