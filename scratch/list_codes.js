const WebSocket = require('ws');
const ws = new WebSocket('ws://5.250.255.86:17356');
const codes = new Set();

ws.on('open', () => {
  console.log('Connected to Altis, collecting codes...');
});

ws.on('message', (data) => {
  try {
    const parsed = JSON.parse(data.toString());
    if (Array.isArray(parsed)) {
      parsed.forEach(item => {
        if (item.Code) {
          codes.add(item.Code);
        }
      });
      console.log('Current distinct codes:', Array.from(codes).join(', '));
    }
  } catch (e) {
    console.error(e);
  }
});

setTimeout(() => {
  console.log('\n--- FINAL LIST OF CODES ---');
  console.log(Array.from(codes).sort());
  ws.close();
  process.exit(0);
}, 6000);
