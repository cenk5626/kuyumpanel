const WebSocket = require('ws');
const io = require('socket.io-client');

console.log('Testing Altis WS connection...');

// Try raw WS first
const ws = new WebSocket('ws://5.250.255.86:17356');

ws.on('open', () => {
  console.log('[WS] Connected to Altis (Raw)');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'prices' })); // Just a guess
});

ws.on('message', (data) => {
  console.log('[WS] Message received:', data.toString().substring(0, 200));
});

ws.on('error', (err) => {
  console.log('[WS] Error:', err.message);
  
  // If raw WS fails, try Socket.io
  console.log('\nTrying Socket.io instead...');
  const socket = io('http://5.250.255.86:17356', { transports: ['websocket'] });
  
  socket.on('connect', () => console.log('[Socket.io] Connected to Altis'));
  socket.on('connect_error', (err) => console.log('[Socket.io] Error:', err.message));
  socket.onAny((ev, ...args) => console.log(`[Socket.io Event: ${ev}]`, JSON.stringify(args).substring(0, 100)));
});

setTimeout(() => {
  console.log('Closing Altis probe...');
  process.exit(0);
}, 10000);
