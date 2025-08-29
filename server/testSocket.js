const WebSocket = require('ws'); // npm install ws if needed

const test = new WebSocket("wss://chatrio-app-2.onrender.com");

test.on('open', () => {
  console.log("Render backend is live!");
  test.close();
});

test.on('error', (err) => {
  console.log("Cannot connect to Render backend", err.message);
});
