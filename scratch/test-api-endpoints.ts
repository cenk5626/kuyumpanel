async function testApiEndpoints() {
  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/stocks',
    '/api/transactions',
    '/api/customers',
    '/api/suppliers',
    '/api/prices/live',
    '/api/prices/has',
    '/api/prices/settings',
    '/api/z-report',
    '/api/z-report/session',
    '/api/stocks/analytics',
    '/api/dealers',
    '/api/logs',
    '/api/users',
  ];

  console.log('Testing all API endpoints on', baseUrl);
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep}`);
      const text = await res.text();
      let statusIcon = res.ok ? '✓' : '❌';
      console.log(`${statusIcon} ${ep} -> Status: ${res.status} (Length: ${text.length})`);
      if (!res.ok) {
        console.log(`   Error response:`, text.slice(0, 200));
      }
    } catch (e: any) {
      console.error(`❌ ${ep} -> Network/Server Error:`, e.message);
    }
  }
}

testApiEndpoints().catch(console.error);
