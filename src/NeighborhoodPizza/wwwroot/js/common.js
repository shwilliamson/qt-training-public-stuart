// Shared helpers for the customer and kitchen pages.
"use strict";

/** Format integer cents as $X.XX. */
function formatCents(cents) {
  return "$" + (cents / 100).toFixed(2);
}

/**
 * Build a DOM element. Text is always set via textContent, never innerHTML.
 * props: { class, text, attrs: {...}, on: { event: handler }, ...directProps }
 */
function el(tag, props, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "attrs") for (const [a, v] of Object.entries(value)) node.setAttribute(a, v);
    else if (key === "on") for (const [e, h] of Object.entries(value)) node.addEventListener(e, h);
    else node[key] = value;
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** "Pepperoni, Onions" or "Cheese only". */
function toppingsText(names) {
  return names.length ? names.join(", ") : "Cheese only";
}
