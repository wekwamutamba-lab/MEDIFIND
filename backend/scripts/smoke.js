import http from 'http';

const BASE = 'http://localhost:5000/api';

function doRequest(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: new URL(BASE + path).hostname,
      path: new URL(BASE + path).pathname,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const checks = [
    // 1. health
    { path: '/health', expected: ['ok'] },
    // 2. products
    { path: '/products', expected: ['data', 'total', 'stats', 'categories'] },
    // 3. orders
    { path: '/orders', expected: ['data', 'total', 'stats'] },
    // 4. customers
    { path: '/customers', expected: ['data', 'total', 'stats'] },
    // 5. payments
    { path: '/payments', expected: ['data', 'total', 'stats'] },
    // 6. stats/overview
    { path: '/stats/overview', expected: ['totalProfit', 'totalCustomers', 'totalOrders'] },
    // 7. stats/sales
    { path: '/stats/sales', expected: ['totalRevenue', 'totalProfit', 'totalCost', 'avgOrderValue'] },
    // 8. ai /find
    { path: '/find', method: 'POST', body: { query: 'I need Paracetamol' }, expected: ['parsed', 'results', 'disclaimer'] },
    // 9. ai /insights
    { path: '/insights', method: 'POST', body: {}, expected: ['summary', 'restock', 'expiring'] },
  ];

  let allPass = true;
  for (const c of checks) {
    try {
      const resp = await doRequest(c.path, c.method || 'GET', c.body || null);
      const obj = JSON.parse(resp.body);
      const missing = c.expected.filter((k) => !(k in obj));
      if (missing.length) {
        console.log(`FAIL ${c.path} – missing keys: ${missing.join(', ')}`);
        allPass = false;
      } else {
        console.log(`PASS ${c.path}`);
      }
    } catch (e) {
      console.log(`FAIL ${c.path} – error: ${e.message}`);
      allPass = false;
    }
  }

  console.log(allPass ? '\n🎉 ALL CHECKS PASSED' : '\n❌ SOME CHECKS FAILED');
  process.exit(allPass ? 0 : 1);
}

main();