const express = require('express');
const { db } = require('../database/init');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user's cart
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.get('SELECT items FROM carts WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.json({ items: [] });
    let items = [];
    try { items = JSON.parse(row.items); } catch { items = []; }
    res.json({ items });
  });
});

// Update user's cart (replace all items)
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const items = req.body.items || [];
  const itemsJson = JSON.stringify(items);
  db.run(
    'INSERT INTO carts (user_id, items, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET items = excluded.items, updated_at = CURRENT_TIMESTAMP',
    [userId, itemsJson],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Cart updated' });
    }
  );
});

// Clear user's cart
router.delete('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.run('DELETE FROM carts WHERE user_id = ?', [userId], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Cart cleared' });
  });
});

module.exports = router; 