const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();
const authenticateToken = require('./auth').authenticateToken;

// Middleware to check admin
function authenticateAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get all orders (admin)
router.get('/orders', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, u.username, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, u.username
      ORDER BY o.created_at DESC
    `);
    res.json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all users (admin)
router.get('/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
SELECT u.id, u.username, u.email, u.role, u.created_at,
       COUNT(o.id) as order_count,
       SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username, u.email, u.role, u.created_at
ORDER BY u.created_at DESC
  `);
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Add new pickle (admin)
router.post('/pickles', authenticateToken, authenticateAdmin, async (req, res) => {
  let { name, description, price, category, stock, imageUrl, image_url } = req.body;
  if (!name || !price || price <= 0) {
    return res.status(400).json({ error: 'Name and valid price are required' });
  }
  // Accept either imageUrl or image_url from client
  if (!image_url && imageUrl) image_url = imageUrl;
  if (typeof image_url === 'undefined') image_url = null;
  try {
    const result = await pool.query(
      'INSERT INTO pickles (name, description, price, category, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, description, price, category, stock || 0, image_url]
    );
    res.status(201).json({ message: 'Pickle added successfully', pickleId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add pickle' });
  }
});

// Update pickle (admin)
router.put('/pickles/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  let { name, description, price, category, stock, imageUrl, image_url } = req.body;
  if (!name || !price || price <= 0) {
    return res.status(400).json({ error: 'Name and valid price are required' });
  }
  if (!image_url && imageUrl) image_url = imageUrl;
  if (typeof image_url === 'undefined') image_url = null;
  try {
    const result = await pool.query(
      'UPDATE pickles SET name = $1, description = $2, price = $3, category = $4, stock = $5, image_url = $6 WHERE id = $7',
      [name, description, price, category, stock || 0, image_url, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Pickle not found' });
    res.json({ message: 'Pickle updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update pickle' });
  }
});

// Delete pickle (admin)
router.delete('/pickles/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM pickles WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Pickle not found' });
    res.json({ message: 'Pickle deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete pickle' });
  }
});

// Get dashboard stats (admin)
router.get('/dashboard', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const orderStats = (await pool.query('SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_order_value FROM orders')).rows[0];
    const userStats = (await pool.query('SELECT COUNT(*) as total_users FROM users WHERE role = $1', ['user'])).rows[0];
    const pickleStats = (await pool.query('SELECT COUNT(*) as total_pickles FROM pickles')).rows[0];
    const recentOrders = (await pool.query(`
      SELECT o.*, u.username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `)).rows;
    res.json({
      stats: { ...orderStats, ...userStats, ...pickleStats },
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user role (admin)
router.patch('/users/:id/role', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete user (admin)
router.delete('/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (req.user.userId == id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete order (admin)
router.delete('/orders/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    const result = await pool.query('DELETE FROM orders WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Update order status (admin)
router.put('/orders/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get order details (admin)
router.get('/orders/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT o.*, u.username, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const { rows: items } = await pool.query(`
      SELECT oi.*, p.name, p.description, p.image_url
      FROM order_items oi
      JOIN pickles p ON oi.pickle_id = p.id
      WHERE oi.order_id = $1
    `, [id]);
    res.json({ order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router; 