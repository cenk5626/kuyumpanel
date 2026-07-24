const io = require('socket.io-client');

console.log('Connecting to Harem Altin...');
const socket = io('wss://hrmsocketonly.haremaltin.com', {
  transports: ['websocket'],
  path: '/socket.io'
});

socket.on('connect', () => {
  console.log('Connected to Harem Altin!');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.log('Connection error:', err.message);
});

// Listen to all events
socket.onAny((eventName, ...args) => {
  console.log(`[Event: ${eventName}]`, JSON.stringify(args, null, 2).substring(0, 500));
});

setTimeout(() => {
  console.log('Closing connection...');
  socket.close();
  process.exit(0);
}, 10000);
