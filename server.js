const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'links.json');

// Load or initialize links
async function loadLinks() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, '[]');
      return [];
    }
    throw err;
  }
}

// Save links to file
async function saveLinks(links) {
  await fs.writeFile(DATA_FILE, JSON.stringify(links, null, 2));
}

// Submit endpoint
app.post('/submit', upload.single('groupImage'), async (req, res) => {
  const { username, groupName, groupLink } = req.body;
  if (!username || !username.trim()) return res.status(400).send('Username is required.');
  if (!groupName || !groupName.trim()) return res.status(400).send('Group name is required.');
  if (!groupLink || !groupLink.trim()) return res.status(400).send('Group link is required.');
  if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
    return res.status(400).send('Invalid WhatsApp group link.');
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const links = await loadLinks();
    links.push({
      username: username.trim(),
      groupName: groupName.trim(),
      groupLink: groupLink.trim(),
      imagePath,
      createdAt: new Date()
    });
    await saveLinks(links);
    res.sendStatus(200);
  } catch (err) {
    console.error('Failed to save group:', err);
    res.status(500).send('Internal server error.');
  }
});

// Get all links
app.get('/links', async (req, res) => {
  try {
    let links = await loadLinks();
    // Newest first
    links = links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(links);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
