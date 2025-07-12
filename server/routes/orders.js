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

// Calculate distance from pincode
const getDistanceFromPincode = (pincode) => {
  // Kerala pincode to distance mapping (from Ernakulam center)
  const pincodeDistances = {
    // Ernakulam area (0-5 km)
    "682001": 2, "682002": 3, "682003": 4, "682004": 3, "682005": 4,
    "682006": 5, "682007": 4, "682008": 3, "682009": 4, "682010": 5,
    "682011": 4, "682012": 3, "682013": 4, "682014": 5, "682015": 4,
    "682016": 3, "682017": 4, "682018": 5, "682019": 4, "682020": 3,
    
    // Kochi area (5-10 km)
    "682021": 6, "682022": 7, "682023": 8, "682024": 7, "682025": 8,
    "682026": 9, "682027": 8, "682028": 7, "682029": 8, "682030": 9,
    "682031": 8, "682032": 7, "682033": 8, "682034": 9, "682035": 8,
    
    // Fort Kochi, Mattancherry (10-15 km)
    "682036": 11, "682037": 12, "682038": 13, "682039": 12, "682040": 13,
    "682041": 14, "682042": 13, "682043": 12, "682044": 13, "682045": 14,
    
    // Aluva, Kalamassery (15-20 km)
    "683101": 16, "683102": 17, "683103": 18, "683104": 17, "683105": 18,
    "683106": 19, "683107": 18, "683108": 17, "683109": 18, "683110": 19,
    
    // Tripunithura, Kottayam (20+ km)
    "682301": 22, "682302": 23, "682303": 24, "682304": 23, "682305": 24,
    "682306": 25, "682307": 24, "682308": 23, "682309": 24, "682310": 25,
    "686001": 45, "686002": 46, "686003": 47, "686004": 46, "686005": 47,
    "686006": 48, "686007": 47, "686008": 46, "686009": 47, "686010": 48,
    
    // Thrissur area (50+ km)
    "680001": 52, "680002": 53, "680003": 54, "680004": 53, "680005": 54,
    "680006": 55, "680007": 54, "680008": 53, "680009": 54, "680010": 55,
    
    // Calicut area (100+ km)
    "673001": 102, "673002": 103, "673003": 104, "673004": 103, "673005": 104,
    "673006": 105, "673007": 104, "673008": 103, "673009": 104, "673010": 105,
    
    // Trivandrum area (150+ km)
    "695001": 152, "695002": 153, "695003": 154, "695004": 153, "695005": 154,
    "695006": 155, "695007": 154, "695008": 153, "695009": 154, "695010": 155
  };
  
  return pincodeDistances[pincode] || 10; // Default 10km if pincode not found
};

// Calculate delivery fee
router.post('/calculate-delivery-fee', (req, res) => {
  const { subtotal, deliveryType = 'standard', pincode } = req.body;
  
  if (!subtotal || subtotal < 0) {
    return res.status(400).json({ error: 'Invalid subtotal amount' });
  }
  
  // Calculate distance from pincode
  const distance = pincode ? getDistanceFromPincode(pincode) : 10;
  
  let deliveryFee = 0;
  let freeDeliveryThreshold = 1000; // Free delivery for orders above ₹1000
  
  // Calculate delivery fee based on delivery type and distance
  switch (deliveryType) {
    case 'express':
      deliveryFee = 150; // Express delivery
      freeDeliveryThreshold = 1500;
      break;
    case 'standard':
    default:
      if (distance <= 5) {
        deliveryFee = 50;
      } else if (distance <= 10) {
        deliveryFee = 100;
      } else if (distance <= 20) {
        deliveryFee = 150;
      } else {
        deliveryFee = 200;
      }
      break;
  }
  
  // Apply free delivery if order amount is above threshold
  if (subtotal >= freeDeliveryThreshold) {
    deliveryFee = 0;
  }
  
  const totalAmount = subtotal + deliveryFee;
  
  res.json({
    subtotal,
    deliveryFee,
    totalAmount,
    freeDeliveryThreshold,
    deliveryType,
    distance,
    pincode
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
    // Calculate distance from pincode
    const distance = pincode ? getDistanceFromPincode(pincode) : 10;
    
    // Calculate delivery fee
    let deliveryFee = 0;
    let freeDeliveryThreshold = 1000;
    
    switch (deliveryType) {
      case 'express':
        deliveryFee = 150;
        freeDeliveryThreshold = 1500;
        break;
      case 'standard':
      default:
        if (distance <= 5) {
          deliveryFee = 50;
        } else if (distance <= 10) {
          deliveryFee = 100;
        } else if (distance <= 20) {
          deliveryFee = 150;
        } else {
          deliveryFee = 200;
        }
        break;
    }
    
    // Apply free delivery if order amount is above threshold
    if (subtotal >= freeDeliveryThreshold) {
      deliveryFee = 0;
    }
    
    const totalAmount = subtotal + deliveryFee;
    
    // Create order with delivery fee
    db.run('INSERT INTO orders (user_id, total_amount, shipping_address, payment_type, razorpay_payment_id, razorpay_order_id, razorpay_signature, delivery_fee, delivery_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, totalAmount, shippingAddress, paymentType || 'cod', razorpayPaymentId || null, razorpayOrderId || null, razorpaySignature || null, deliveryFee, deliveryType], function(err) {
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
              deliveryFee,
              totalAmount,
              deliveryType,
              distance
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