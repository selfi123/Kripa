const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database/pickles.db');

db.serialize(() => {
  // 1. Rename the old table
  db.run('ALTER TABLE users RENAME TO users_old;', (err) => {
    if (err) {
      if (err.message.includes('no such table')) {
        console.error('No users table found.');
        db.close();
        return;
      }
      console.error('Error renaming users table:', err);
      db.close();
      return;
    }
    // 2. Create the new table with password nullable
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      google_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`, (err) => {
      if (err) {
        console.error('Error creating new users table:', err);
        db.close();
        return;
      }
      // 3. Copy data
      db.run(`INSERT INTO users (id, username, email, password, role, google_id, created_at)
        SELECT id, username, email, password, role, google_id, created_at FROM users_old;`, (err) => {
        if (err) {
          console.error('Error copying data to new users table:', err);
          db.close();
          return;
        }
        // 4. Drop old table
        db.run('DROP TABLE users_old;', (err) => {
          if (err) {
            console.error('Error dropping old users table:', err);
          } else {
            console.log('Migration complete: password column is now nullable.');
          }
          db.close();
        });
      });
    });
  });
}); 