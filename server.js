const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'public/uploads/' });

const DATA_FILE = path.join(__dirname, 'links.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let groups = [];

// Load existing groups from file or initialize empty
async function loadGroups() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    groups = JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      groups = [];
      await saveGroups();
    } else {
      console.error('Error reading groups file:', err);
    }
  }
}

// Save groups array to file
async function saveGroups() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(groups, null, 2));
  } catch (err) {
    console.error('Error writing groups file:', err);
  }
}

// Initialize groups on server start
loadGroups();

app.post('/submit', upload.single('groupImage'), async (req, res) => {
  const { username, groupName, groupLink } = req.body;

  if (!username || !username.trim()) return res.status(400).send('Username is required.');
  if (!groupName || !groupName.trim()) return res.status(400).send('Group name is required.');
  if (!groupLink || !groupLink.trim()) return res.status(400).send('Group link is required.');

  if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
    return res.status(400).send('Invalid WhatsApp group link.');
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // Add new group to array
  groups.push({
    username: username.trim(),
    groupName: groupName.trim(),
    groupLink: groupLink.trim(),
    imagePath,
  });

  try {
    await saveGroups();
    res.sendStatus(200);
  } catch (err) {
    console.error('Failed to save group:', err);
    res.status(500).send('Internal server error.');
  }
});

app.get('/links', (req, res) => {
  res.json(groups);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
