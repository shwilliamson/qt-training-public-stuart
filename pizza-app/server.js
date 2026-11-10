'use strict';

const http = require('node:http');
const path = require('node:path');
const { createApp } = require('./server/app');
const { OrderStore } = require('./server/store');

const port = Number(process.env.PORT) || 3000;
const store = new OrderStore(path.join(__dirname, 'data', 'orders.json'));
const handler = createApp({ store, publicDir: path.join(__dirname, 'public') });

http.createServer(handler).listen(port, () => {
  console.log(`Pizza app running at http://localhost:${port}`);
});
