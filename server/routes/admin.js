const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

const router = express.Router();

// Middleware to verify admin access
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all orders (admin)
router.get('/orders', authenticateAdmin, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT o.*, u.username, u.email,
           COUNT(oi.id) as item_count
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (status) {
    conditions.push('o.status = ?');
    params.push(status);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, orders) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ orders });
  });
});

// Get all users (admin)
router.get('/users', authenticateAdmin, (req, res) => {
  db.all(`
SELECT u.id, u.username, u.email, u.role, u.created_at,
       COUNT(o.id) as order_count,
       SUM(o.total_amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id
ORDER BY u.created_at DESC
  `, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users });
  });
});

// Add new pickle (admin)
router.post('/pickles', authenticateAdmin, (req, res) => {
  const { name, description, price, category, stock, imageUrl } = req.body;
  
  if (!name || !price || price <= 0) {
    return res.status(400).json({ error: 'Name and valid price are required' });
  }
  
  db.run(`
    INSERT INTO pickles (name, description, price, category, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [name, description, price, category, stock || 0, imageUrl], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add pickle' });
    }
    
    res.status(201).json({
      message: 'Pickle added successfully',
      pickleId: this.lastID
    });
  });
});

// Update pickle (admin)
router.put('/pickles/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, stock, imageUrl } = req.body;
  
  if (!name || !price || price <= 0) {
    return res.status(400).json({ error: 'Name and valid price are required' });
  }
  
  db.run(`
    UPDATE pickles 
    SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ?
    WHERE id = ?
  `, [name, description, price, category, stock || 0, imageUrl, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update pickle' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Pickle not found' });
    }
    
    res.json({ message: 'Pickle updated successfully' });
  });
});

// Delete pickle (admin)
router.delete('/pickles/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM pickles WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete pickle' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Pickle not found' });
    }
    
    res.json({ message: 'Pickle deleted successfully' });
  });
});

// Get dashboard stats (admin)
router.get('/dashboard', authenticateAdmin, (req, res) => {
  // Get total orders and revenue
  db.get(`
    SELECT COUNT(*) as total_orders,
           SUM(total_amount) as total_revenue,
           AVG(total_amount) as avg_order_value
    FROM orders
  `, (err, orderStats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get total users
    db.get('SELECT COUNT(*) as total_users FROM users WHERE role = "user"', (err, userStats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get total pickles
      db.get('SELECT COUNT(*) as total_pickles FROM pickles', (err, pickleStats) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get recent orders
        db.all(`
          SELECT o.*, u.username
          FROM orders o
          JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC
          LIMIT 5
        `, (err, recentOrders) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            stats: {
              ...orderStats,
              ...userStats,
              ...pickleStats
            },
            recentOrders
          });
        });
      });
    });
  });
});

// Update user role (admin)
router.patch('/users/:id/role', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  const validRoles = ['user', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User role updated successfully' });
  });
});

// Delete user (admin)
router.delete('/users/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;

  // Prevent deleting yourself
  if (req.user.userId == id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// Delete order (admin)
router.delete('/orders/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  // First delete order items
  db.run('DELETE FROM order_items WHERE order_id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete order items' });
    }
    // Then delete the order itself
    db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete order' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order deleted successfully' });
    });
  });
});

module.exports = router; 