const express = require('express');
const { pool } = require('../database/init');

const router = express.Router();

// Get all pickles
router.get('/', async (req, res) => {
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
    conditions.push('p.category = $' + (params.length + 1));
    params.push(category);
  }
  if (search) {
    conditions.push('(p.name ILIKE $' + (params.length + 1) + ' OR p.description ILIKE $' + (params.length + 2) + ')');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY p.id';
  const validSortFields = ['name', 'price', 'avg_rating', 'created_at'];
  const sortField = validSortFields.includes(sort) ? sort : 'name';
  query += ` ORDER BY ${sortField} ${sortField === 'price' ? 'ASC' : 'ASC'}`;
  if (req.query.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(Number(req.query.limit));
  }
  try {
    const { rows: pickles } = await pool.query(query, params);
    res.json({ pickles });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single pickle with reviews
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
    SELECT p.*, 
           COALESCE(AVG(r.rating), 0) as avg_rating,
           COUNT(r.id) as review_count
    FROM pickles p
    LEFT JOIN reviews r ON p.id = r.pickle_id
      WHERE p.id = $1
    GROUP BY p.id
    `, [id]);
    const pickle = rows[0];
    if (!pickle) return res.status(404).json({ error: 'Pickle not found' });
    const { rows: reviews } = await pool.query(`
      SELECT r.*, u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.pickle_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    res.json({ pickle: { ...pickle, reviews } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
      }
});

// Get categories
router.get('/categories/all', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT category FROM pickles WHERE category IS NOT NULL');
    res.json({ categories: rows.map(c => c.category) });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
    }
});

// Add review (requires authentication)
router.post('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Valid rating required (1-5)' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    // Check if user already reviewed this pickle
    const { rowCount } = await pool.query('SELECT id FROM reviews WHERE user_id = $1 AND pickle_id = $2', [decoded.userId, id]);
    if (rowCount > 0) return res.status(400).json({ error: 'You have already reviewed this pickle' });
      // Add review
    const result = await pool.query('INSERT INTO reviews (user_id, pickle_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING id', [decoded.userId, id, rating, comment]);
    res.status(201).json({ message: 'Review added successfully', reviewId: result.rows[0].id });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router; 