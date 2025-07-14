const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/init');
const router = express.Router();

// Helper: Generate JWT
function generateToken(user) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role, verified: user.verified }, process.env.JWT_SECRET || 'pickle-secret-key', { expiresIn: '7d' });
}

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, verified, verification_token) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, verified',
      [username, email, hashedPassword, false, verificationToken]
    );
    // TODO: Send verification email
    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    if (!user.verified) return res.status(400).json({ error: 'Please verify your email before logging in', unverified: true });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, verified: user.verified } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, role, verified, created_at FROM users WHERE id = $1', [req.user.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Email verification, resend, etc. (implement as needed)

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = router;
module.exports.authenticateToken = authenticateToken; 