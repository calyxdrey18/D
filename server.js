const express = require('express');
const path = require('path');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'public/uploads/' });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Setup SQLite database
const dbFile = path.join(__dirname, 'groups.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    groupName TEXT NOT NULL,
    groupLink TEXT NOT NULL,
    imagePath TEXT
  )`);
});

app.post('/submit', upload.single('groupImage'), (req, res) => {
  const { username, groupName, groupLink } = req.body;
  if (!username || !username.trim()) return res.status(400).send('Username is required.');
  if (!groupName || !groupName.trim()) return res.status(400).send('Group name is required.');
  if (!groupLink || !groupLink.trim()) return res.status(400).send('Group link is required.');
  if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
    return res.status(400).send('Invalid WhatsApp group link.');
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  db.run(
    `INSERT INTO groups (username, groupName, groupLink, imagePath) VALUES (?, ?, ?, ?)`,
    [username.trim(), groupName.trim(), groupLink.trim(), imagePath],
    function (err) {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).send('Failed to save group.');
      }
      res.sendStatus(200);
    }
  );
});

app.get('/links', (req, res) => {
  db.all(`SELECT * FROM groups ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      console.error('DB select error:', err);
      return res.status(500).json([]);
    }
    res.json(rows);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
