const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const initializeDatabase = async () => {
  try {
    // Test the connection first
    const client = await pool.connect();
    console.log('✅ Database connection established');
    client.release();
    
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      google_id TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pickles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      shipping_address TEXT,
      razorpay_payment_id TEXT,
      razorpay_order_id TEXT,
      razorpay_signature TEXT,
      delivery_fee REAL DEFAULT 0,
      delivery_type TEXT DEFAULT 'standard',
      payment_type TEXT DEFAULT 'cod',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      pickle_id INTEGER REFERENCES pickles(id),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      pickle_id INTEGER REFERENCES pickles(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      items TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase }; 