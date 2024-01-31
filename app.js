const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const sqliteConnection = require('./sqliteConnection');

const app = express();
const port = 3000;

const uploadFolder = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${fileId}${extension}`);
  },
});

const upload = multer({ storage: storage });

app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('audio'), (req, res) => {
  try {
    console.log(req.file.filename)
    const audioUrl = `${req.file.filename}`;
    sqliteConnection.getConnection((db) => {
      const stmt = db.prepare('INSERT INTO voices (audioUrl) VALUES (?)');
      stmt.run(audioUrl);
      stmt.finalize();
    });
    res.json({ audioUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/play/:id', (req, res) => {
  const id = req.params.id;
  console.log(id)
  sqliteConnection.getConnection((db) => {
    db.get('SELECT audioUrl FROM voices WHERE audioUrl = ?', [id], (err, row) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      } else {
        if (row) {
          const audioUrl = row.audioUrl;
          const filePath = path.join(__dirname, 'uploads', audioUrl);


          res.sendFile(filePath, (err) => {
            if (err) {
              console.error(err);
              res.status(500).send('Internal Server Error');
            }
          });
        } else {
          res.status(404).send('Audio not found');
        }
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
