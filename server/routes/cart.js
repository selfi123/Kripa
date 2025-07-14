const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();
const authenticateToken = require('./auth').authenticateToken;

// Get cart for user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query('SELECT items FROM carts WHERE user_id = $1', [userId]);
    if (rows.length === 0) return res.json({ items: [] });
    const items = JSON.parse(rows[0].items || '[]');
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Update cart for user
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { items } = req.body;
  try {
    const itemsStr = JSON.stringify(items || []);
    await pool.query(
      'INSERT INTO carts (user_id, items, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET items = $2, updated_at = NOW()',
      [userId, itemsStr]
    );
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Delete cart for user
router.delete('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    await pool.query('DELETE FROM carts WHERE user_id = $1', [userId]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router; 