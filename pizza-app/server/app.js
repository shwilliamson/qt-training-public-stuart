'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getMenu } = require('./menu');
const { ValidationError, buildOrder, orderStatus, estimatedReadyAt } = require('./orders');

const MAX_BODY_BYTES = 100 * 1024;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function withStatus(order, now) {
  return { ...order, status: orderStatus(order, now), estimatedReadyAt: estimatedReadyAt(order) };
}

function serveStatic(publicDir, urlPath, res) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return sendJson(res, 400, { error: 'Bad request.' });
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, relative);

  // Block path traversal outside the public folder.
  if (!filePath.startsWith(publicDir + path.sep)) {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'Not found.' });
    const type = CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length });
    res.end(data);
  });
}

/** Builds the request handler. Dependencies are injected so tests can control them. */
function createApp({ store, publicDir, now = () => Date.now() }) {
  const root = path.resolve(publicDir);

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;

    try {
      if (pathname === '/api/menu') {
        if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
        return sendJson(res, 200, getMenu());
      }

      if (pathname === '/api/orders') {
        if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
        const body = await readJsonBody(req);
        const order = store.create(buildOrder(body), new Date(now()));
        return sendJson(res, 201, withStatus(order, now()));
      }

      const match = pathname.match(/^\/api\/orders\/([A-Za-z0-9-]+)$/);
      if (match) {
        if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
        const order = store.get(match[1].toUpperCase());
        if (!order) throw new HttpError(404, 'Order not found.');
        return sendJson(res, 200, withStatus(order, now()));
      }

      if (pathname.startsWith('/api/')) throw new HttpError(404, 'Not found.');

      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
      return serveStatic(root, pathname, res);
    } catch (err) {
      if (err instanceof ValidationError) return sendJson(res, 400, { error: err.message });
      if (err instanceof HttpError) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      return sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
    }
  };
}

module.exports = { createApp };
