const next = require('next');
const http = require('node:http');
(async () => {
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3108 });
  let server;
  try {
    await app.prepare();
    server = http.createServer(app.getRequestHandler());
    await new Promise(resolve => server.listen(3108, '127.0.0.1', resolve));
    for (const path of ['/admin', '/api/push/subscribe', '/api/push/test', '/api/project/notifications', '/api/project/notifications/507f1f77bcf86cd799439011', '/sw.js']) {
      const method = path === '/api/push/test' ? 'POST' : 'GET';
      const response = await fetch('http://127.0.0.1:3108' + path, { method });
      await response.text();
      console.log(method + ' ' + path + ': ' + response.status);
      if (response.status !== (path.startsWith('/api/') ? 401 : 200)) throw new Error('Smoke check failed: ' + path);
      if (path === '/sw.js') console.log('Service worker caching: ' + response.headers.get('cache-control'));
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await app.close();
  }
})().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
