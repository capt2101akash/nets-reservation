const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const RATES = { nets_only: 30, nets_bowling: 50 };
const OPEN_TIME = '08:30';
const CLOSE_TIME = '22:30';
const MAX_ADVANCE_DAYS = 92; // ~3 months
const CANCEL_HOURS_BEFORE = 24;

// Convert HH:MM to minutes from midnight
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Validate slot grid constraints
function validateBooking({ date, start_time, end_time, session_type }) {
  if (!date || !start_time || !end_time || !session_type) {
    return 'Missing required fields';
  }
  if (!RATES[session_type]) {
    return 'Invalid session type';
  }

  const bookingDate = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_ADVANCE_DAYS);

  if (isNaN(bookingDate.getTime())) return 'Invalid date';
  if (bookingDate < today) return 'Cannot book in the past';
  if (bookingDate > maxDate) return `Bookings can only be made up to ${MAX_ADVANCE_DAYS} days in advance`;

  const startMin = toMinutes(start_time);
  const endMin = toMinutes(end_time);
  const openMin = toMinutes(OPEN_TIME);
  const closeMin = toMinutes(CLOSE_TIME);

  if (startMin < openMin || endMin > closeMin) {
    return `Bookings must be between ${OPEN_TIME} and ${CLOSE_TIME}`;
  }
  if (endMin <= startMin) return 'End time must be after start time';
  if ((endMin - startMin) < 60) return 'Minimum booking duration is 1 hour';
  if ((endMin - startMin) % 30 !== 0) return 'Bookings must be in 30-minute increments';

  return null;
}

// Check for overlapping bookings
function hasOverlap(date, start_time, end_time, excludeId = null) {
  let query = `
    SELECT id FROM bookings
    WHERE date = ? AND status IN ('confirmed', 'on_hold')
    AND start_time < ? AND end_time > ?
  `;
  const params = [date, end_time, start_time];
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  return db.prepare(query).get(...params);
}

// GET /api/bookings/availability?date=YYYY-MM-DD
router.get('/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  const bookings = db.prepare(`
    SELECT id, start_time, end_time, session_type
    FROM bookings
    WHERE date = ? AND status IN ('confirmed', 'on_hold')
    ORDER BY start_time
  `).all(date);

  res.json({ date, bookings });
});

// POST /api/bookings
router.post('/', verifyToken, (req, res) => {
  const { date, start_time, end_time, session_type, notes } = req.body;

  // Check email/phone verification status
  const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(req.user.id);
  if (!user || user.is_verified === 0) {
    return res.status(403).json({ error: 'Your account is not verified. Please verify your email before booking.' });
  }

  const validationError = validateBooking({ date, start_time, end_time, session_type });
  if (validationError) return res.status(400).json({ error: validationError });

  // Check overlap
  if (hasOverlap(date, start_time, end_time)) {
    return res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });
  }

  const durationHrs = (toMinutes(end_time) - toMinutes(start_time)) / 60;
  const price = parseFloat((durationHrs * RATES[session_type]).toFixed(2));

  const result = db.prepare(`
    INSERT INTO bookings (user_id, date, start_time, end_time, session_type, price, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'on_hold', ?)
  `).run(req.user.id, date, start_time, end_time, session_type, price, notes || null);

  const booking = db.prepare(`
    SELECT b.*, u.name as user_name, u.email as user_email
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ booking });
});

// GET /api/bookings/me
router.get('/me', verifyToken, (req, res) => {
  const bookings = db.prepare(`
    SELECT * FROM bookings
    WHERE user_id = ?
    ORDER BY date DESC, start_time DESC
  `).all(req.user.id);

  res.json({ bookings });
});

// DELETE /api/bookings/:id — cancel own booking
router.delete('/:id', verifyToken, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Not your booking' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

  // Enforce 24-hour cancellation rule ONLY for confirmed bookings (on_hold can cancel immediately)
  if (booking.status === 'confirmed') {
    const sessionDateTime = new Date(`${booking.date}T${booking.start_time}:00`);
    const now = new Date();
    const hoursUntil = (sessionDateTime - now) / (1000 * 60 * 60);

    if (hoursUntil < CANCEL_HOURS_BEFORE) {
      return res.status(400).json({
        error: `Cancellations must be made at least ${CANCEL_HOURS_BEFORE} hours before the session`
      });
    }

    // Log refund to transaction ledger
    db.prepare(`
      INSERT INTO transactions (booking_id, user_id, amount, type, payment_method, reference_number)
      VALUES (?, ?, ?, 'refund', 'online', ?)
    `).run(booking.id, booking.user_id, -booking.price, `CANCEL-USER-${booking.id}`);
  }

  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
  res.json({ message: 'Booking cancelled successfully' });
});

module.exports = router;
