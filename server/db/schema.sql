-- Northridge Nets Database Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin', 'editor', 'viewer', 'org_admin')),
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
  verification_token TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  start_time TEXT NOT NULL,     -- HH:MM (24h)
  end_time TEXT NOT NULL,       -- HH:MM (24h)
  session_type TEXT NOT NULL CHECK(session_type IN ('nets_only', 'nets_bowling')),
  price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'on_hold' CHECK(status IN ('confirmed', 'cancelled', 'on_hold')),
  notes TEXT,
  dispatch_status TEXT CHECK(dispatch_status IN ('success', 'failed')),
  code_sent INTEGER NOT NULL DEFAULT 0 CHECK(code_sent IN (0, 1)),
  access_code TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('payment', 'refund')),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'transfer', 'online')),
  reference_number TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions(booking_id);
