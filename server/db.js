const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db', 'northridge_nets.db');
const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql');

// Ensure parent directory exists (especially for persistent volume mounts)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Self-healing schema check
let needsRecreation = false;
try {
  const userCols = db.prepare("PRAGMA table_info(users)").all();
  const bookingCols = db.prepare("PRAGMA table_info(bookings)").all();
  
  const hasIsVerified = userCols.some(c => c.name === 'is_verified');
  const hasDispatchStatus = bookingCols.some(c => c.name === 'dispatch_status');
  
  // Check if transactions table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const hasTransactions = tables.some(t => t.name === 'transactions');

  if (userCols.length > 0 && (!hasIsVerified || !hasDispatchStatus || !hasTransactions)) {
    needsRecreation = true;
  }
} catch (e) {
  // If tables do not exist, they will be created by the schema execution below
}

if (needsRecreation) {
  console.log('🔄 Outdated database schema detected. Recreating database...');
  db.exec('DROP TABLE IF EXISTS transactions;');
  db.exec('DROP TABLE IF EXISTS bookings;');
  db.exec('DROP TABLE IF EXISTS users;');
}

// Initialize schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Auto-seed admin user if recreating or empty
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@northridgenets.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin@1234', 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role, is_verified)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run('Admin', 'admin@northridgenets.com', hash, '555-0000', 'org_admin');
  console.log('✅ Admin user seeded automatically.');
}

// Auto-promote specific user email to admin on startup
try {
  const targetEmail = 'akash210197@gmail.com';
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(targetEmail);
  if (user) {
    db.prepare("UPDATE users SET role = 'org_admin', is_verified = 1 WHERE id = ?").run(user.id);
    console.log(`👑 User ${targetEmail} auto-promoted to Org Admin.`);
  }
} catch (err) {
  console.error('Error promoting admin user on startup:', err);
}

module.exports = db;
