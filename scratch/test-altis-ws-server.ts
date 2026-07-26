import WebSocket from 'ws';

const ws = new WebSocket('ws://5.250.255.86:17356');

ws.on('open', () => {
  console.log('✓ Node.js sunucu tarafından Altis WS bağlantısı BAŞARILI!');
});

ws.on('message', (data) => {
  console.log('Altis WS Veri Gelişi:', data.toString().slice(0, 150));
  ws.close();
});

ws.on('error', (err) => {
  console.error('Altis WS Bağlantı Hatası:', err);
});
