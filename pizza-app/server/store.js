'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Keeps orders in memory. When given a file path, it also saves them to a
 * JSON file so they survive a restart. Without a path (as in tests) nothing
 * touches the disk.
 */
class OrderStore {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.orders = new Map();
    if (filePath && fs.existsSync(filePath)) {
      for (const order of JSON.parse(fs.readFileSync(filePath, 'utf8'))) {
        this.orders.set(order.id, order);
      }
    }
  }

  create(order, now = new Date()) {
    let id;
    do {
      id = 'P-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (this.orders.has(id));

    const record = { id, createdAt: now.toISOString(), ...order };
    this.orders.set(id, record);
    this.save();
    return record;
  }

  get(id) {
    return this.orders.get(id) ?? null;
  }

  save() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...this.orders.values()], null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

module.exports = { OrderStore };
