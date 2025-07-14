const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();
const authenticateToken = require('./auth').authenticateToken;

// Create new order
router.post('/', authenticateToken, async (req, res) => {
  const { items, shippingAddress, paymentType, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  const userId = req.user.userId;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }
  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required' });
  }
  if (paymentType === 'cod') {
    return res.status(400).json({ error: 'Cash on Delivery is not available. Please use prepaid payment methods.' });
  }
  let subtotal = 0;
  const validatedItems = [];
  try {
    for (const item of items) {
      if (!item.pickleId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item data' });
      }
      const { rows } = await pool.query('SELECT id, name, price, stock FROM pickles WHERE id = $1', [item.pickleId]);
      const pickle = rows[0];
      if (!pickle) {
        return res.status(400).json({ error: `Pickle with id ${item.pickleId} not found` });
      }
      if (pickle.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${pickle.name}` });
      }
      validatedItems.push({ ...item, price: pickle.price, name: pickle.name });
      subtotal += pickle.price * item.quantity;
    }
    // TODO: Calculate delivery fee and coupon logic if needed
    // Create order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_amount, shipping_address, payment_type, razorpay_payment_id, razorpay_order_id, razorpay_signature, delivery_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [userId, subtotal, shippingAddress, paymentType, razorpayPaymentId, razorpayOrderId, razorpaySignature, 0]
    );
    const orderId = orderResult.rows[0].id;
    for (const item of validatedItems) {
      await pool.query('INSERT INTO order_items (order_id, pickle_id, quantity, price) VALUES ($1, $2, $3, $4)', [orderId, item.pickleId, item.quantity, item.price]);
      await pool.query('UPDATE pickles SET stock = stock - $1 WHERE id = $2', [item.quantity, item.pickleId]);
    }
    res.status(201).json({ message: 'Order created successfully', orderId, subtotal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order details
router.get('/:orderId', authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query(`
      SELECT o.*, u.username
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1 AND o.user_id = $2
    `, [orderId, userId]);
    const order = rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const { rows: items } = await pool.query(`
      SELECT oi.*, p.name, p.description
      FROM order_items oi
      JOIN pickles p ON oi.pickle_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);
    res.json({ order: { ...order, items } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Update order status (admin)
router.put('/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, orderId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete order (admin)
router.delete('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  try {
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [orderId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router; 