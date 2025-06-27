const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, file);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    let type = 'text/html';
    if (file.endsWith('.js')) type = 'application/javascript';
    if (file.endsWith('.css')) type = 'text/css';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
let onlineUsers = new Set();

wss.on('connection', ws => {
  let username = null;
  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'join') {
      username = data.username;
      onlineUsers.add(username);
      broadcast({ type: 'online', count: onlineUsers.size });
    } else if (data.type === 'leave') {
      if (username) onlineUsers.delete(username);
      broadcast({ type: 'online', count: onlineUsers.size });
    } else if (data.type === 'message') {
      broadcast(data);
    }
  });
  ws.on('close', () => {
    if (username) onlineUsers.delete(username);
    broadcast({ type: 'online', count: onlineUsers.size });
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
