import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { priceOrder, ValidationError } from './pricing.js';

// Simulated kitchen timeline: minutes after the order is placed.
const STAGES = {
  pickup: [
    [0, 'Received'],
    [1, 'In the oven'],
    [3, 'Ready for pickup'],
  ],
  delivery: [
    [0, 'Received'],
    [1, 'In the oven'],
    [3, 'Out for delivery'],
    [6, 'Delivered'],
  ],
};

export function statusFor(order, now = Date.now()) {
  const minutes = (now - Date.parse(order.createdAt)) / 60000;
  let status = STAGES[order.fulfillment][0][1];
  for (const [at, label] of STAGES[order.fulfillment]) {
    if (minutes >= at) status = label;
  }
  return status;
}

function validateCustomer(customer, fulfillment) {
  const name = String(customer?.name ?? '').trim();
  const phone = String(customer?.phone ?? '').trim();
  const address = String(customer?.address ?? '').trim();
  if (!name) throw new ValidationError('Name is required');
  if (phone.replace(/\D/g, '').length < 10) throw new ValidationError('Enter a phone number with at least 10 digits');
  if (fulfillment === 'delivery' && !address) throw new ValidationError('Address is required for delivery');
  return {
    name: name.slice(0, 100),
    phone: phone.slice(0, 30),
    address: fulfillment === 'delivery' ? address.slice(0, 200) : '',
  };
}

export class OrderStore {
  constructor(file) {
    this.file = file;
    this.orders = null;
    this.writing = Promise.resolve();
  }

  async load() {
    if (this.orders) return;
    try {
      this.orders = JSON.parse(await readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.orders = {};
    }
  }

  async save() {
    // Chain writes so two concurrent orders cannot interleave on disk.
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.file), { recursive: true });
      await writeFile(this.file, JSON.stringify(this.orders, null, 2));
    });
    return this.writing;
  }

  async create(body) {
    await this.load();
    const fulfillment = body?.fulfillment;
    const priced = priceOrder({ items: body?.items, fulfillment });
    const customer = validateCustomer(body?.customer, fulfillment);
    const order = {
      id: randomUUID().slice(0, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      fulfillment,
      customer,
      ...priced,
    };
    this.orders[order.id] = order;
    await this.save();
    return { ...order, status: statusFor(order) };
  }

  async get(id) {
    await this.load();
    const order = this.orders[String(id).toUpperCase()];
    return order ? { ...order, status: statusFor(order) } : null;
  }
}
