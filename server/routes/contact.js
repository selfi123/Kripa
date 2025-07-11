const express = require('express');
const { db } = require('../database/init');
const nodemailer = require('nodemailer');

const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  // Save to database
  db.run(
    'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    [name, email, message],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save message.' });
      }
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
    }
  );
});

// GET /api/contact (admin only, simple token check for now)
router.get('/', (req, res) => {
  // TODO: Add real admin auth
  db.all('SELECT * FROM contacts ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch messages.' });
    }
    res.json({ messages: rows });
  });
});

module.exports = router; 