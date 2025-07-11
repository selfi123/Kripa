const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();

// Register user
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (user) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Insert new user with verified = 0 and verification_token
      db.run('INSERT INTO users (username, email, password, verified, verification_token) VALUES (?, ?, ?, 0, ?)', 
        [username, email, hashedPassword, verificationToken], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

        // Send verification email
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
          port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
          auth: {
            user: process.env.EMAIL_USER || 'your_ethereal_user',
            pass: process.env.EMAIL_PASS || 'your_ethereal_pass',
          },
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        const mailOptions = {
          from: `Kripa Pickles 🍋 <no-reply@kripapickles.shop>`,
          to: email,
          subject: 'Verify your email for Kripa Pickles',
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
            <h2 style="color:#e6b800;">Welcome to Kripa Pickles 🍋</h2>
            <p>Hi <b>${username}</b>,</p>
            <p>Thank you for registering! Please verify your email address to activate your account.</p>
            <p style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="background:#e6b800;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Verify Email</a>
            </p>
            <p>If you did not sign up, you can ignore this email.</p>
            <hr style="margin:24px 0;">
            <p style="font-size:12px;color:#888;">Kripa Pickles 🍋<br>www.kripapickles.shop</p>
          </div>`
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Verification email send error:', error);
            // Still create user, but notify client
            return res.status(201).json({
              message: 'User created, but failed to send verification email.',
              user: { id: this.lastID, username, email, role: 'user' },
              emailError: true
            });
          }
          res.status(201).json({
            message: 'User created successfully. Please check your email to verify your account.',
            user: { id: this.lastID, username, email, role: 'user' }
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Block login if not verified (for password-based users only)
      if (!user.verified) {
        return res.status(403).json({ error: 'Please verify your email before logging in.' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'pickle-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pickle-secret-key');
    
    db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', 
      [decoded.userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ user });
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Email verification endpoint
router.get('/verify-email', (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) {
    return res.status(400).json({ error: 'Invalid verification link.' });
  }
  db.get('SELECT id, verified FROM users WHERE email = ? AND verification_token = ?', [email, token], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }
    if (!user) {
      // Check if user exists and is already verified
      db.get('SELECT verified FROM users WHERE email = ?', [email], (err2, userByEmail) => {
        if (err2) {
          return res.status(500).json({ error: 'Database error.' });
        }
        if (userByEmail && userByEmail.verified) {
          return res.status(200).json({ message: 'Email already verified.' });
        }
        return res.status(400).json({ error: 'Invalid or expired verification link.' });
      });
      return;
    }
    if (user.verified) {
      return res.status(200).json({ message: 'Email already verified.' });
    }
    db.run('UPDATE users SET verified = 1, verification_token = NULL WHERE email = ?', [email], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to verify email.' });
      }
      res.status(200).json({ message: 'Email verified successfully.' });
    });
  });
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  db.get('SELECT id, username, verified FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }
    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    db.run('UPDATE users SET verification_token = ? WHERE id = ?', [verificationToken, user.id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update verification token.' });
      }
      // Send verification email
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
        auth: {
          user: process.env.EMAIL_USER || 'your_ethereal_user',
          pass: process.env.EMAIL_PASS || 'your_ethereal_pass',
        },
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      const mailOptions = {
        from: `Kripa Pickles 🍋 <no-reply@kripapickles.shop>`,
        to: email,
        subject: 'Verify your email for Kripa Pickles',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#e6b800;">Welcome to Kripa Pickles 🍋</h2>
          <p>Hi <b>${user.username}</b>,</p>
          <p>Please verify your email address to activate your account.</p>
          <p style="text-align:center;margin:32px 0;">
            <a href="${verifyUrl}" style="background:#e6b800;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Verify Email</a>
          </p>
          <p>If you did not sign up, you can ignore this email.</p>
          <hr style="margin:24px 0;">
          <p style="font-size:12px;color:#888;">Kripa Pickles 🍋<br>www.kripapickles.shop</p>
        </div>`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Verification email send error:', error);
          return res.status(500).json({ error: 'Failed to send verification email.' });
        }
        res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
      });
    });
  });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('Google OAuth callback successful');
    console.log('User:', req.user);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user.id, username: req.user.username, role: req.user.role },
      process.env.JWT_SECRET || 'pickle-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Generated token:', token);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL;
    const redirectUrl = `${frontendUrl}/auth-callback?token=${token}`;
    console.log('Redirecting to:', redirectUrl);
    
    res.redirect(redirectUrl);
  }
);

// Logout route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router; 