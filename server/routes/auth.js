const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { mockSendVerificationEmail } = require('../utils/notifications');
const crypto = require('crypto');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(16).toString('hex');
    
    const isTargetAdmin = email.toLowerCase().trim() === 'akash210197@gmail.com';
    const role = isTargetAdmin ? 'org_admin' : 'user';
    const isVerified = isTargetAdmin ? 1 : 0;
    const tokenVal = isTargetAdmin ? null : verificationToken;

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, role, is_verified, verification_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), email.toLowerCase().trim(), hash, phone || null, role, isVerified, tokenVal);

    const user = db.prepare('SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    const origin = `${req.protocol}://${req.get('host')}`;
    // Send simulated verification email if not auto-verified
    if (!isVerified) {
      mockSendVerificationEmail(user.email, verificationToken, origin);
    }

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify?token=TOKEN
router.get('/verify', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h1>Error</h1><p>Verification token is required.</p>');

    const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
    if (!user) {
      return res.status(400).send('<h1>Verification failed</h1><p>Invalid or expired verification token.</p>');
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
    
    // Redirect to frontend login with verified=true
    res.redirect(`${process.env.FRONTEND_URL || ''}/login?verified=true`);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h1>Server error</h1><p>An unexpected error occurred.</p>');
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', verifyToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, is_verified FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_verified) return res.status(400).json({ error: 'Account already verified' });

    const verificationToken = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);
    
    const origin = `${req.protocol}://${req.get('host')}`;
    mockSendVerificationEmail(user.email, verificationToken, origin);
    res.json({ message: 'Verification email resent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
