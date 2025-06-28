const express = require('express');
const path = require('path');
const multer = require('multer');
const { MongoClient, ServerApiVersion } = require('mongodb');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ======= MongoDB Atlas Setup =======
const MONGO_URI = 'mongodb+srv://calyxdrey11:<db_password>@drey.qptc9q8.mongodb.net/?retryWrites=true&w=majority&appName=Drey'; // <--- REPLACE THIS!
const DB_NAME = 'whatsapp_links';
const COLLECTION = 'groups';

let db, groupsCollection;

// Connect to MongoDB Atlas
MongoClient.connect(MONGO_URI, { serverApi: ServerApiVersion.v1 })
  .then(client => {
    db = client.db(DB_NAME);
    groupsCollection = db.collection(COLLECTION);
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}/`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB Atlas:', err);
    process.exit(1);
  });

// ======= Routes =======
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
    await groupsCollection.insertOne({
      username: username.trim(),
      groupName: groupName.trim(),
      groupLink: groupLink.trim(),
      imagePath,
      createdAt: new Date()
    });
    res.sendStatus(200);
  } catch (err) {
    console.error('MongoDB insert error:', err);
    res.status(500).send('Failed to save group.');
  }
});

app.get('/links', async (req, res) => {
  try {
    const groups = await groupsCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(groups);
  } catch (err) {
    console.error('MongoDB find error:', err);
    res.status(500).json([]);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
