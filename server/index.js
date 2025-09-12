const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
require('dotenv').config();

const authRoutes = require('./routes/auth');
const pickleRoutes = require('./routes/pickles');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const contactRoutes = require('./routes/contact');
const cartRoutes = require('./routes/cart');
const { pool, initializeDatabase } = require('./database/init');
const passport = require('./config/passport');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://kripapickles.shop',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  store: new pgSession({
    pool: require('./database/init').pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'pickle-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pickles', pickleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/cart', cartRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Pickle MCP is running!' });
});

// Serve static files from React build (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Serve React app for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🥒 Pickle MCP Server running on port ${PORT}`);
      console.log(`🌐 Frontend: http://localhost:3000`);
      console.log(`🔧 API: http://localhost:5000/api`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }); 