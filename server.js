
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'public/uploads/' });
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'links.json');

let data = { groups: [], channels: [] };
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

app.post('/submit', upload.single('groupImage'), (req, res) => {
  const { username, groupName, groupLink, category } = req.body;
  if (!username || username.trim() === '') return res.status(400).send('Username is required.');
  if (!groupName || groupName.trim() === '') return res.status(400).send('Name is required.');
  if (!groupLink || groupLink.trim() === '') return res.status(400).send('Link is required.');
  if (category !== 'group' && category !== 'channel') return res.status(400).send('Invalid category.');

  // Validate group and channel links
  if (category === 'group' && !groupLink.startsWith('https://chat.whatsapp.com/')) {
    return res.status(400).send('Invalid WhatsApp group link.');
  }
  if (category === 'channel' && !groupLink.startsWith('https://whatsapp.com/channel/')) {
    return res.status(400).send('Invalid WhatsApp channel link.');
  }

  let imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const entry = {
    username: username.trim(),
    name: groupName.trim(),
    link: groupLink.trim(),
    imagePath,
  };

  if (category === 'group') {
    data.groups.push(entry);
  } else {
    data.channels.push(entry);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.sendStatus(200);
});

app.get('/links', (req, res) => {
  res.json(data);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

