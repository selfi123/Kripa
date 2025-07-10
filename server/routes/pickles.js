const express = require('express');
const { db } = require('../database/init');

const router = express.Router();

// Get all pickles
router.get('/', (req, res) => {
  const { category, search, sort = 'name' } = req.query;
  
  let query = `
    SELECT p.*, 
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(r.id) as review_count
    FROM pickles p
    LEFT JOIN reviews r ON p.id = r.pickle_id
  `;
  
  const conditions = [];
  const params = [];
  
  if (category) {
    conditions.push('p.category = ?');
    params.push(category);
  }
  
  if (search) {
    conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY p.id';
  
  // Add sorting
  const validSortFields = ['name', 'price', 'avg_rating', 'created_at'];
  const sortField = validSortFields.includes(sort) ? sort : 'name';
  query += ` ORDER BY ${sortField} ${sortField === 'price' ? 'ASC' : 'ASC'}`;
  
  db.all(query, params, (err, pickles) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ pickles });
  });
});

// Get single pickle with reviews
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Get pickle details
  db.get(`
    SELECT p.*, 
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(r.id) as review_count
    FROM pickles p
    LEFT JOIN reviews r ON p.id = r.pickle_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [id], (err, pickle) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!pickle) {
      return res.status(404).json({ error: 'Pickle not found' });
    }
    
    // Get reviews for this pickle
    db.all(`
      SELECT r.*, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.pickle_id = ?
      ORDER BY r.created_at DESC
    `, [id], (err, reviews) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        pickle: {
          ...pickle,
          reviews
        }
      });
    });
  });
});

// Get categories
router.get('/categories/all', (req, res) => {
  db.all('SELECT DISTINCT category FROM pickles WHERE category IS NOT NULL', (err, categories) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ categories: categories.map(c => c.category) });
  });
});

// Add review (requires authentication)
router.post('/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Valid rating required (1-5)' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    
    // Check if user already reviewed this pickle
    db.get('SELECT id FROM reviews WHERE user_id = ? AND pickle_id = ?', 
      [decoded.userId, id], (err, existingReview) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this pickle' });
      }
      
      // Add review
      db.run('INSERT INTO reviews (user_id, pickle_id, rating, comment) VALUES (?, ?, ?, ?)',
        [decoded.userId, id, rating, comment], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add review' });
        }
        
        res.status(201).json({ 
          message: 'Review added successfully',
          reviewId: this.lastID
        });
      });
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router; 