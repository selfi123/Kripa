const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database/pickles.db');

db.all("PRAGMA table_info(contacts);", (err, columns) => {
  if (err) {
    console.error('Failed to get table info:', err);
    db.close();
    return;
  }
  if (!columns || columns.length === 0) {
    db.run(`CREATE TABLE contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Failed to create contacts table:', err);
      } else {
        console.log('contacts table created.');
      }
      db.close();
    });
  } else {
    console.log('contacts table already exists.');
    db.close();
  }
}); 