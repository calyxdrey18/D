const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const publicDir = path.join(__dirname, 'public');
const PORT = process.env.PORT || 10000;

let messages = [];
let clients = new Map(); // Map ws => { userId, username, profilePic }

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(publicDir, file.split('?')[0]);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    let type = 'text/html';
    if (file.endsWith('.js')) type = 'application/javascript';
    if (file.endsWith('.css')) type = 'text/css';
    if (file.endsWith('.png')) type = 'image/png';
    if (file.endsWith('.jpg') || file.endsWith('.jpeg')) type = 'image/jpeg';
    if (file.endsWith('.svg')) type = 'image/svg+xml';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

function getOnlineCount() {
  const ids = new Set();
  clients.forEach(({ userId }) => ids.add(userId));
  return ids.size;
}

wss.on('connection', ws => {
  let userInfo = null;

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'join') {
      userInfo = {
        userId: data.userId,
        username: data.username,
        profilePic: data.profilePic
      };
      clients.set(ws, userInfo);
      ws.send(JSON.stringify({ type: 'history', messages }));
      broadcast({ type: 'online', count: getOnlineCount() });
      // System join message
      const sysMsg = {
        user: { name: 'System', profilePic: '', color: '#999' },
        text: `${userInfo.username} joined the chat.`,
        time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        system: true
      };
      messages.push(sysMsg);
      broadcast({ type: 'message', message: sysMsg });
    } else if (data.type === 'message') {
      messages.push(data.message);
      if (messages.length > 200) messages = messages.slice(-200);
      broadcast({ type: 'message', message: data.message });
    } else if (data.type === 'signal') {
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'signal', from: userInfo.username, signal: data.signal }));
        }
      });
    }
  });

  ws.on('close', () => {
    if (userInfo) {
      clients.delete(ws);
      broadcast({ type: 'online', count: getOnlineCount() });
      // System leave message
      const sysMsg = {
        user: { name: 'System', profilePic: '', color: '#999' },
        text: `${userInfo.username} left the chat.`,
        time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        system: true
      };
      messages.push(sysMsg);
      broadcast({ type: 'message', message: sysMsg });
    }
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
