const express = require('express');
const path = require('path');
const multer = require('multer');
const storage = require('node-persist');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize node-persist
(async () => {
  await storage.init({ dir: path.join(__dirname, 'persist-store') });
})();

app.post('/submit', upload.single('groupImage'), async (req, res) => {
  const { username, groupName, groupLink } = req.body;
  if (!username || !username.trim()) return res.status(400).send('Username is required.');
  if (!groupName || !groupName.trim()) return res.status(400).send('Group name is required.');
  if (!groupLink || !groupLink.trim()) return res.status(400).send('Group link is required.');
  if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
    return res.status(400).send('Invalid WhatsApp group link.');
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  let groups = (await storage.getItem('groups')) || [];
  groups.push({
    username: username.trim(),
    groupName: groupName.trim(),
    groupLink: groupLink.trim(),
    imagePath,
    createdAt: new Date()
  });
  await storage.setItem('groups', groups);

  res.sendStatus(200);
});

app.get('/links', async (req, res) => {
  let groups = (await storage.getItem('groups')) || [];
  // Show newest first
  groups = groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(groups);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
