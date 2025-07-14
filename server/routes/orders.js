const express = require('express');
const { pool } = require('../database/init');
const router = express.Router();
const authenticateToken = require('./auth').authenticateToken;
const Razorpay = require('razorpay');

// Calculate delivery fee and coupon logic
router.post('/calculate-delivery-fee', async (req, res) => {
  const { subtotal, state, coupon } = req.body;
  let courierCharge = 99;
  let couponApplied = false;
  let couponMessage = '';

  // Free delivery if subtotal >= 1000
  if (subtotal >= 1000) {
    courierCharge = 0;
    couponMessage = 'Free delivery for orders above ₹1000!';
  }
  // Coupon logic
  else if (coupon && coupon.trim().toUpperCase() === 'FREESHIP') {
    courierCharge = 0;
    couponApplied = true;
    couponMessage = 'Coupon applied: Free delivery!';
  }

  const totalAmount = subtotal + courierCharge;
  res.json({ courierCharge, totalAmount, couponApplied, couponMessage });
});

// Create new order
router.post('/', authenticateToken, async (req, res) => {
  const { items, shippingAddress, paymentType, razorpayPaymentId, razorpayOrderId, razorpaySignature, coupon } = req.body;
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
    // Delivery fee and coupon logic
    let deliveryFee = 99;
    if (subtotal >= 1000) {
      deliveryFee = 0;
    } else if (coupon && coupon.trim().toUpperCase() === 'FREESHIP') {
      deliveryFee = 0;
    }
    const totalAmount = subtotal + deliveryFee;
    // Create order
    const orderResult = await pool.query(
      'INSERT INTO orders (user_id, total_amount, shipping_address, payment_type, razorpay_payment_id, razorpay_order_id, razorpay_signature, delivery_fee) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [userId, totalAmount, shippingAddress, paymentType, razorpayPaymentId, razorpayOrderId, razorpaySignature, deliveryFee]
    );
    const orderId = orderResult.rows[0].id;
    for (const item of validatedItems) {
      await pool.query('INSERT INTO order_items (order_id, pickle_id, quantity, price) VALUES ($1, $2, $3, $4)', [orderId, item.pickleId, item.quantity, item.price]);
      await pool.query('UPDATE pickles SET stock = stock - $1 WHERE id = $2', [item.quantity, item.pickleId]);
    }
    res.status(201).json({ message: 'Order created successfully', orderId, subtotal, deliveryFee, totalAmount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Create Razorpay order endpoint
router.post('/create-razorpay-order', async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: 'order_rcpt_' + Math.floor(Math.random() * 1000000),
      payment_capture: 1
    };
    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
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

// Get all orders for the logged-in user
router.get('/my-orders', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const { rows } = await pool.query(`
      SELECT o.*, COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [userId]);
    res.json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
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