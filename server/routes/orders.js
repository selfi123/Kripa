const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

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

// Helper: Map pincode to district (simple prefix-based)
const getDistrictFromPincode = (pincode) => {
  if (!pincode) return '';
  const pin = String(pincode);
  if (pin.startsWith('68')) {
    // Ernakulam (68xxxx)
    return 'Ernakulam';
  }
  if (pin.startsWith('67')) {
    // Kozhikode (67xxxx)
    return 'Kozhikode';
  }
  if (pin.startsWith('69')) {
    // Trivandrum (69xxxx)
    return 'Trivandrum';
  }
  if (pin.startsWith('68')) {
    // Thrissur (68xxxx, but overlaps with Ernakulam)
    // We'll use a more specific check below
    if (pin.startsWith('680')) return 'Thrissur';
    if (pin.startsWith('682')) return 'Ernakulam';
  }
  // Add more as needed
  return '';
};

// Calculate courier charge
router.post('/calculate-delivery-fee', (req, res) => {
  const { subtotal, deliveryType = 'standard', state } = req.body;
  
  if (!subtotal || subtotal < 0) {
    return res.status(400).json({ error: 'Invalid subtotal amount' });
  }
  
  // Determine courier charge by state
  let courierCharge = 150;
  if (state && String(state).trim().toLowerCase() === 'kerala') {
    courierCharge = 100;
  }
  // Free delivery threshold
  let freeDeliveryThreshold = 1000;
  if (subtotal >= freeDeliveryThreshold) {
    courierCharge = 0;
  }
  const totalAmount = subtotal + courierCharge;
  res.json({
    subtotal,
    courierCharge,
    totalAmount,
    freeDeliveryThreshold,
    deliveryType,
    state
  });
});

// Create new order
router.post('/', authenticateToken, (req, res) => {
  const { items, shippingAddress, paymentType, deliveryType = 'standard', pincode, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  const userId = req.user.userId;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }
  
  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required' });
  }
  
  // Calculate total and validate items
  let subtotal = 0;
  const validatedItems = [];
  
  for (const item of items) {
    if (!item.pickleId || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: 'Invalid item data' });
    }
    
    // Get pickle details and check stock
    db.get('SELECT id, name, price, stock FROM pickles WHERE id = ?', [item.pickleId], (err, pickle) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!pickle) {
        return res.status(400).json({ error: `Pickle with id ${item.pickleId} not found` });
      }
      if (pickle.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${pickle.name}` });
      }
      
      validatedItems.push({
        ...item,
        price: pickle.price,
        name: pickle.name
      });
      subtotal += pickle.price * item.quantity;
      
      // If this is the last item, calculate delivery fee and create the order
      if (validatedItems.length === items.length) {
        calculateDeliveryAndCreateOrder();
      }
    });
  }
  
  function calculateDeliveryAndCreateOrder() {
    // Determine courier charge by state
    let courierCharge = 150;
    if (shippingAddress && shippingAddress.toLowerCase().includes('kerala')) {
      courierCharge = 100;
    }
    // Free delivery threshold
    let freeDeliveryThreshold = 1000;
    if (subtotal >= freeDeliveryThreshold) {
      courierCharge = 0;
    }
    const totalAmount = subtotal + courierCharge;
    // Create order with courier charge
    db.run('INSERT INTO orders (user_id, total_amount, shipping_address, payment_type, razorpay_payment_id, razorpay_order_id, razorpay_signature, delivery_fee, delivery_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, totalAmount, shippingAddress, paymentType || 'cod', razorpayPaymentId || null, razorpayOrderId || null, razorpaySignature || null, courierCharge, deliveryType], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create order' });
      }
      const orderId = this.lastID;
      // Add order items
      let itemsAdded = 0;
      for (const item of validatedItems) {
        db.run('INSERT INTO order_items (order_id, pickle_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.pickleId, item.quantity, item.price], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to add order items' });
          }
          // Update stock
          db.run('UPDATE pickles SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.pickleId], (err) => {
            if (err) {
              console.error('Failed to update stock:', err);
            }
          });
          itemsAdded++;
          if (itemsAdded === validatedItems.length) {
            res.status(201).json({
              message: 'Order created successfully',
              orderId,
              subtotal,
              courierCharge,
              totalAmount,
              deliveryType,
              state
            });
          }
        });
      }
    });
  }
});

// Create Razorpay order for payment
router.post('/create-razorpay-order', authenticateToken, async (req, res) => {
  const { amount, currency = 'INR' } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: `order_rcptid_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error('Razorpay order error:', err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// Get user's order history
router.get('/my-orders', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.all(`
    SELECT o.*, 
           COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [userId], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ orders });
  });
});

// Get order details
router.get('/:orderId', authenticateToken, (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;
  
  // Get order details
  db.get(`
    SELECT o.*, u.username
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ? AND o.user_id = ?
  `, [orderId, userId], (err, order) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    db.all(`
      SELECT oi.*, p.name, p.description
      FROM order_items oi
      JOIN pickles p ON oi.pickle_id = p.id
      WHERE oi.order_id = ?
    `, [orderId], (err, items) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        order: {
          ...order,
          items
        }
      });
    });
  });
});

// Update order status (admin only)
router.patch('/:orderId/status', authenticateToken, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  });
});

module.exports = router; 