const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('voice.db');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS voices (id INTEGER PRIMARY KEY AUTOINCREMENT, audioUrl TEXT)');
});

const sqliteConnection = {
  getConnection: (callback) => {
    db.serialize(() => {
      callback(db);
    });
  },
};

module.exports = sqliteConnection;
