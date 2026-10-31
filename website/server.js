const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const SITE_ROOT = path.join(ROOT, 'website');

const PLANS = [
  {
    name: 'Starter',
    price: '₹999',
    duration: '7 days',
    description: 'Perfect for testing and personal use.',
    features: ['1 WhatsApp bot', 'Basic support', 'Fast setup']
  },
  {
    name: 'Growth',
    price: '₹2499',
    duration: '30 days',
    description: 'Best for active users and small teams.',
    features: ['3 connected bots', 'Priority support', 'Monitoring tools'],
    popular: true
  },
  {
    name: 'Business',
    price: '₹4999',
    duration: '90 days',
    description: 'For advanced automation and multiple users.',
    features: ['Unlimited bots', 'Custom onboarding', 'Advanced analytics']
  }
];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(data);
  });
}

function validatePhone(value) {
  const cleaned = String(value || '').replace(/[^0-9]/g, '');
  return /^\d{10,15}$/.test(cleaned);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      app: 'TOHID-BUG',
      message: 'Website is running and ready to sell pairing bots.'
    });
    return;
  }

  if (pathname === '/api/plans') {
    sendJson(res, 200, { plans: PLANS });
    return;
  }

  if (pathname === '/api/pair') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
      return;
    }

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const number = String(payload.number || '').trim();

        if (!validatePhone(number)) {
          sendJson(res, 400, {
            ok: false,
            message: 'Please enter a valid WhatsApp number.'
          });
          return;
        }

        const code = `AB${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        sendJson(res, 200, {
          ok: true,
          status: 'pairing_in_progress',
          number,
          code,
          message: 'Pairing request accepted. Ask your customer to open WhatsApp and enter the code shown below.'
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          message: 'Invalid request body.'
        });
      }
    });
    return;
  }

  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(path.join(SITE_ROOT, relativePath));

  if (!safePath.startsWith(SITE_ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (error, stats) => {
    if (error || !stats.isFile()) {
      const fallback = path.join(SITE_ROOT, 'index.html');
      serveStaticFile(res, fallback);
      return;
    }

    serveStaticFile(res, safePath);
  });
});

server.listen(PORT, () => {
  console.log(`✅ TOHID-BUG website running at http://localhost:${PORT}`);
});
