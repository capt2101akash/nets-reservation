const express = require('express');
const db = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { mockSendSMS } = require('../utils/notifications');

const router = express.Router();

// Base middleware: all admin sub-routes require auth and staff roles
router.use(verifyToken, requireRole(['admin', 'org_admin', 'editor', 'viewer']));

// Helper to check write access
function hasWriteAccess(role) {
  return ['admin', 'org_admin', 'editor'].includes(role);
}

// Helper to check full admin access
function hasFullAdminAccess(role) {
  return ['admin', 'org_admin'].includes(role);
}

// GET /api/admin/bookings?date=&status=
router.get('/bookings', (req, res) => {
  const { date, status } = req.query;
  let query = `
    SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (date) { query += ' AND b.date = ?'; params.push(date); }
  if (status) { query += ' AND b.status = ?'; params.push(status); }

  query += ' ORDER BY b.date DESC, b.start_time ASC';

  const bookings = db.prepare(query).all(...params);
  res.json({ bookings });
});

// DELETE /api/admin/bookings/:id — cancel any booking (Admins & Editors)
router.delete('/bookings/:id', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to cancel bookings' });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

  // If the booking was previously confirmed, log a refund in transactions
  if (booking.status === 'confirmed') {
    db.prepare(`
      INSERT INTO transactions (booking_id, user_id, amount, type, payment_method, reference_number)
      VALUES (?, ?, ?, 'refund', 'online', ?)
    `).run(booking.id, booking.user_id, -booking.price, `CANCEL-ADMIN-${booking.id}`);
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
  res.json({ message: 'Booking cancelled by administrator' });
});

// POST /api/admin/bookings/:id/confirm — moderate: confirm booking (Admins & Editors)
router.post('/bookings/:id/confirm', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to confirm bookings' });
  }

  const booking = db.prepare('SELECT b.*, u.phone, u.name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'on_hold') return res.status(400).json({ error: 'Only bookings on hold can be confirmed' });

  db.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").run(booking.id);

  // Automatically record a payment transaction in the ledger
  // Check if a payment for this booking has already been logged (avoid duplicates)
  const existingTransaction = db.prepare("SELECT id FROM transactions WHERE booking_id = ? AND type = 'payment'").get(booking.id);
  if (!existingTransaction) {
    db.prepare(`
      INSERT INTO transactions (booking_id, user_id, amount, type, payment_method, reference_number)
      VALUES (?, ?, ?, 'payment', 'online', ?)
    `).run(booking.id, booking.user_id, booking.price, `CONFIRM-${booking.id}`);
  }
  
  // Simulated SMS/WhatsApp notification for booking confirmation
  mockSendSMS(booking.phone, `Hi ${booking.name}, your booking #${booking.id} for Northridge Nets has been confirmed! We will send your access code 30 minutes before your session.`);

  res.json({ message: 'Booking confirmed successfully' });
});

// POST /api/admin/bookings/:id/reject — moderate: reject booking (Admins & Editors)
router.post('/bookings/:id/reject', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to reject bookings' });
  }

  const booking = db.prepare('SELECT b.*, u.phone, u.name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'on_hold') return res.status(400).json({ error: 'Only bookings on hold can be rejected' });

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);

  // Simulated SMS/WhatsApp notification for booking rejection
  mockSendSMS(booking.phone, `Hi ${booking.name}, we were unable to verify your payment for booking #${booking.id}. Your booking has been cancelled.`);

  res.json({ message: 'Booking rejected successfully' });
});

// POST /api/admin/bookings/:id/dispatch — manual dispatch access code (Admins & Editors)
router.post('/bookings/:id/dispatch', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to dispatch access codes' });
  }

  const booking = db.prepare('SELECT b.*, u.phone, u.name FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Only confirmed bookings can receive access codes' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const message = `Hi ${booking.name}, your access code for Northridge Nets on ${booking.date} at ${booking.start_time} is ${code}.`;

  const success = mockSendSMS(booking.phone, message);
  if (success) {
    db.prepare("UPDATE bookings SET dispatch_status = 'success', code_sent = 1, access_code = ? WHERE id = ?").run(code, booking.id);
    res.json({ message: 'Access code sent successfully', access_code: code });
  } else {
    db.prepare("UPDATE bookings SET dispatch_status = 'failed' WHERE id = ?").run(booking.id);
    res.status(500).json({ error: 'Failed to send SMS/WhatsApp access code' });
  }
});

// GET /api/admin/users — list all users (Admins, Editors & Viewers)
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, is_verified, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id — update user details or role (Admins & Editors)
router.put('/users/:id', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to modify users' });
  }

  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Restrict editor access: cannot edit admins, and cannot promote to admin roles
    const targetIsAdmin = ['admin', 'org_admin'].includes(targetUser.role);
    const callerIsAdmin = hasFullAdminAccess(req.user.role);

    if (targetIsAdmin && !callerIsAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only Org Admins can modify Admin profiles' });
    }

    const { name, email, phone, role, is_verified } = req.body;

    if (role && ['admin', 'org_admin', 'editor'].includes(role) && !callerIsAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only Org Admins can assign Admin/Editor roles' });
    }

    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, role = ?, is_verified = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : targetUser.name,
      email !== undefined ? email.toLowerCase().trim() : targetUser.email,
      phone !== undefined ? phone : targetUser.phone,
      role !== undefined ? role : targetUser.role,
      is_verified !== undefined ? Number(is_verified) : targetUser.is_verified,
      targetUser.id
    );

    const updatedUser = db.prepare('SELECT id, name, email, phone, role, is_verified FROM users WHERE id = ?').get(targetUser.id);
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/transactions — list all transactions (Admins, Editors & Viewers)
router.get('/transactions', (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email, b.date as booking_date
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN bookings b ON t.booking_id = b.id
      ORDER BY t.created_at DESC
    `).all();
    res.json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/transactions — manually log payment/refund (Admins & Editors)
router.post('/transactions', (req, res) => {
  if (!hasWriteAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to create transaction records' });
  }

  try {
    const { user_email, amount, type, payment_method, reference_number, booking_id } = req.body;
    if (!user_email || amount === undefined || !type || !payment_method) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(user_email.toLowerCase().trim());
    if (!user) return res.status(404).json({ error: 'User with this email not found' });

    let transAmount = Math.abs(parseFloat(amount));
    if (type === 'refund') {
      transAmount = -transAmount;
    }

    const result = db.prepare(`
      INSERT INTO transactions (booking_id, user_id, amount, type, payment_method, reference_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(booking_id || null, user.id, transAmount, type, payment_method, reference_number || null);

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Transaction recorded successfully', transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/transactions/:id — delete/revert ledger entry (Only Org Admins)
router.delete('/transactions/:id', (req, res) => {
  if (!hasFullAdminAccess(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Only Org Admins can delete ledger entries' });
  }

  try {
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    db.prepare('DELETE FROM transactions WHERE id = ?').run(transaction.id);
    res.json({ message: 'Transaction record deleted successfully from ledger' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  // Compute total revenue (payments - refunds) from transactions ledger
  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
  `).get().total;

  const totalBookings = db.prepare(`
    SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'
  `).get().count;

  const cancelledBookings = db.prepare(`
    SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled'
  `).get().count;

  const totalUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'user'
  `).get().count;

  const upcomingBookings = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE status = 'confirmed' AND date >= date('now')
  `).get().count;

  const revenueByType = db.prepare(`
    SELECT session_type, COALESCE(SUM(price), 0) as revenue, COUNT(*) as count
    FROM bookings WHERE status = 'confirmed'
    GROUP BY session_type
  `).all();

  const recentBookings = db.prepare(`
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.status = 'confirmed'
    ORDER BY b.created_at DESC
    LIMIT 5
  `).all();

  const utilizationData = db.prepare(`
    SELECT date,
      COUNT(*) as sessions,
      SUM((CAST(SUBSTR(end_time,1,2) AS INTEGER)*60 + CAST(SUBSTR(end_time,4,2) AS INTEGER))
        - (CAST(SUBSTR(start_time,1,2) AS INTEGER)*60 + CAST(SUBSTR(start_time,4,2) AS INTEGER))) as booked_minutes
    FROM bookings WHERE status = 'confirmed' AND date >= date('now', '-30 days')
    GROUP BY date ORDER BY date ASC
  `).all();

  res.json({
    totalRevenue,
    totalBookings,
    cancelledBookings,
    totalUsers,
    upcomingBookings,
    revenueByType,
    recentBookings,
    utilizationData
  });
});

module.exports = router;
