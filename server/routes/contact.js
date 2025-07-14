const express = require('express');
const { pool } = require('../database/init');
const nodemailer = require('nodemailer');
const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)',
      [name, email, message]
    );
    // Send email notification
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.CONTACT_EMAIL_USER || 'abelselfi12@gmail.com',
        pass: process.env.CONTACT_EMAIL_PASS || 'your-app-password',
      },
    });
    const mailOptions = {
      from: process.env.CONTACT_EMAIL_USER || 'abelselfi12@gmail.com',
      to: 'kripapicklestore@gmail.com',
      subject: `New Contact Form Submission from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        // Still return success, but log error
        console.error('Email send error:', error);
      }
      return res.status(201).json({ message: 'Message sent successfully!' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save message.' });
  }
});

// GET /api/contact (admin) - get all contact messages
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json({ contacts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
});

module.exports = router; 