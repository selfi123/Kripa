// server/routes/auth.js
// CAUTION: This file contains an intentionally vulnerable JWT verification path
// that accepts `alg: "none"` when ALLOW_NONE_ALG=1. USE ONLY FOR ISOLATED LABS.

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/init');
const router = express.Router();
const passport = require('passport');
const nodemailer = require('nodemailer');

// Toggle vulnerable behaviour. Only enable in an isolated teaching environment.
// e.g. on Linux/macOS: export ALLOW_NONE_ALG=1
// on Windows (Powershell): $env:ALLOW_NONE_ALG="1"
const ALLOW_NONE_ALG = process.env.ALLOW_NONE_ALG === '1';

// Helper: Generate JWT
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role, verified: user.verified },
    process.env.JWT_SECRET || 'pickle-secret-key',
    { expiresIn: '7d' }
  );
}

// Helper: Send verification email
async function sendVerificationEmail(email, username, verificationToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.CONTACT_EMAIL_USER,
      pass: process.env.CONTACT_EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: process.env.CONTACT_EMAIL_USER,
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
  await transporter.sendMail(mailOptions);
}

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.random().toString(36).substring(2, 15);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, verified, verification_token) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, verified',
      [username, email, hashedPassword, false, verificationToken]
    );
    await sendVerificationEmail(email, username, verificationToken);
    res.status(201).json({ message: 'Registration successful! Please check your email to verify your account.' });
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) {
    return res.status(400).json({ error: 'Invalid verification link.' });
  }
  try {
    const { rows } = await pool.query('SELECT id, verified FROM users WHERE email = $1 AND verification_token = $2', [email, token]);
    const user = rows[0];
    if (!user) {
      // Check if user exists and is already verified
      const { rows: userByEmail } = await pool.query('SELECT verified FROM users WHERE email = $1', [email]);
      if (userByEmail[0] && userByEmail[0].verified) {
        return res.status(200).json({ message: 'Email already verified.' });
      }
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }
    if (user.verified) {
      return res.status(200).json({ message: 'Email already verified.' });
    }
    await pool.query('UPDATE users SET verified = true, verification_token = NULL WHERE email = $1', [email]);
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// Resend verification email endpoint
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {
    const { rows } = await pool.query('SELECT id, username, verified, verification_token FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }
    let verificationToken = user.verification_token;
    if (!verificationToken) {
      verificationToken = Math.random().toString(36).substring(2, 15);
      await pool.query('UPDATE users SET verification_token = $1 WHERE id = $2', [verificationToken, user.id]);
    }
    await sendVerificationEmail(email, user.username, verificationToken);
    res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    if (!user.verified) return res.status(400).json({ error: 'Please verify your email before logging in', unverified: true });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, verified: user.verified } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Helper to base64url-decode a token part to JSON
function base64urlDecodeToJson(part) {
  try {
    const b = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b.length % 4;
    const base64 = b + (pad ? '='.repeat(4 - pad) : '');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// JWT authentication middleware
// This middleware has two modes:
// - Secure (default): uses jsonwebtoken.verify() with HS256 only.
// - Vulnerable (lab/demo): when ALLOW_NONE_ALG=1 it accepts alg: "none" (no signature).
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }

  const token = parts[1];

  // If demo vulnerability enabled and token looks like alg: "none", accept payload directly
  if (ALLOW_NONE_ALG) {
    const segments = token.split('.');
    if (segments.length === 3) {
      const [headerB64, payloadB64 /* signatureB64 */] = segments;
      const header = base64urlDecodeToJson(headerB64);
      const payload = base64urlDecodeToJson(payloadB64);

      if (header && typeof header.alg === 'string' && header.alg.toLowerCase() === 'none') {
        console.warn('[VULNERABLE MODE] Accepting unsigned JWT (alg: none) — LAB ONLY');
        req.user = payload;
        return next();
      }
    }
    // fall through to secure verification if not alg:none
  }

  // Secure path: verify signature properly (HS256)
  try {
    const secret = process.env.JWT_SECRET || 'pickle-secret-key';
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verify error:', err && err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Profile route example using authenticateToken
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, role, verified, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Google OAuth routes (unchanged)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = generateToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth-callback?token=${token}`;
    res.redirect(redirectUrl);
  }
);

// Export router and middleware for tests
module.exports = router;
module.exports.authenticateToken = authenticateToken;
