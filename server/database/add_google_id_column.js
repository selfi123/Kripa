const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database/pickles.db');

// Check if google_id column exists, and add it if not
const addGoogleIdColumn = () => {
  db.all("PRAGMA table_info(users);", (err, columns) => {
    if (err) {
      console.error('Failed to get table info:', err);
      db.close();
      return;
    }
    const hasGoogleId = columns.some(col => col.name === 'google_id');
    if (!hasGoogleId) {
      db.run("ALTER TABLE users ADD COLUMN google_id TEXT;", (err) => {
        if (err) {
          console.error('Failed to add google_id column:', err);
        } else {
          console.log('google_id column added to users table.');
        }
        db.close();
      });
    } else {
      console.log('google_id column already exists.');
      db.close();
    }
  });
};

addGoogleIdColumn(); 