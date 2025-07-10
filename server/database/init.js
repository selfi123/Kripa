const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pickles.db');
const db = new sqlite3.Database(dbPath);

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          google_id TEXT UNIQUE,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Pickles table
      db.run(`
        CREATE TABLE IF NOT EXISTS pickles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          image_url TEXT,
          category TEXT,
          stock INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          total_amount REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          shipping_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER,
          pickle_id INTEGER,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders (id),
          FOREIGN KEY (pickle_id) REFERENCES pickles (id)
        )
      `);

      // Reviews table
      db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          pickle_id INTEGER,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (pickle_id) REFERENCES pickles (id)
        )
      `);

      // Insert sample data
      db.run(`
        INSERT OR IGNORE INTO users (username, email, password, role) 
        VALUES ('admin', 'admin@pickles.com', '$2a$10$rQZ9K8X2Y1L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6J', 'admin')
      `);

      // Sample pickles
      const samplePickles = [
        {
          name: 'Classic Dill Pickles',
          description: 'Traditional dill pickles with garlic and spices',
          price: 8.99,
          category: 'Dill',
          stock: 50
        },
        {
          name: 'Spicy Jalapeño Pickles',
          description: 'Hot and spicy pickles with jalapeño peppers',
          price: 9.99,
          category: 'Spicy',
          stock: 30
        },
        {
          name: 'Sweet Bread & Butter Pickles',
          description: 'Sweet and tangy pickles perfect for sandwiches',
          price: 7.99,
          category: 'Sweet',
          stock: 40
        },
        {
          name: 'Garlic Dill Pickles',
          description: 'Extra garlicky dill pickles for garlic lovers',
          price: 10.99,
          category: 'Dill',
          stock: 25
        },
        {
          name: 'Pickled Onions',
          description: 'Tangy pickled red onions',
          price: 6.99,
          category: 'Vegetables',
          stock: 35
        }
      ];

      const insertPickle = db.prepare(`
        INSERT OR IGNORE INTO pickles (name, description, price, category, stock)
        VALUES (?, ?, ?, ?, ?)
      `);

      samplePickles.forEach(pickle => {
        insertPickle.run(pickle.name, pickle.description, pickle.price, pickle.category, pickle.stock);
      });

      insertPickle.finalize((err) => {
        if (err) {
          console.error('Error inserting sample data:', err);
          reject(err);
        } else {
          console.log('✅ Database initialized with sample data');
          resolve();
        }
      });
    });
  });
};

module.exports = { db, initializeDatabase }; 