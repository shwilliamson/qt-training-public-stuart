import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMenu } from './lib/menu.js';
import { OrderStore } from './lib/orders.js';
import { ValidationError } from './lib/pricing.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(root, 'public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const MAX_BODY = 100_000;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new ValidationError('Request too large');
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ValidationError('Invalid JSON');
  }
}

async function serveStatic(res, rawPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    return sendJson(res, 400, { error: 'Bad path' });
  }
  const file = normalize(join(publicDir, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(publicDir + sep)) return sendJson(res, 404, { error: 'Not found' });
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

export function createApp(store) {
  return createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && pathname === '/api/menu') return sendJson(res, 200, getMenu());
      if (req.method === 'POST' && pathname === '/api/orders') {
        return sendJson(res, 201, await store.create(await readJson(req)));
      }
      const match = pathname.match(/^\/api\/orders\/([A-Za-z0-9]+)$/);
      if (req.method === 'GET' && match) {
        const order = await store.get(match[1]);
        return order ? sendJson(res, 200, order) : sendJson(res, 404, { error: 'Order not found' });
      }
      if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });
      if (req.method === 'GET') return serveStatic(res, pathname);
      sendJson(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      if (err instanceof ValidationError) return sendJson(res, 400, { error: err.message });
      console.error(err);
      sendJson(res, 500, { error: 'Something went wrong' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const store = new OrderStore(join(root, 'data', 'orders.json'));
  createApp(store).listen(port, () => console.log(`Pizza app running at http://localhost:${port}`));
}
