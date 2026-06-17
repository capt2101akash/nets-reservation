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
  
  // Check if transactions & facility_passcodes tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const hasTransactions = tables.some(t => t.name === 'transactions');
  const hasFacilityPasscodes = tables.some(t => t.name === 'facility_passcodes');

  if (userCols.length > 0 && (!hasIsVerified || !hasDispatchStatus || !hasTransactions || !hasFacilityPasscodes)) {
    needsRecreation = true;
  }
} catch (e) {
  // If tables do not exist, they will be created by the schema execution below
}

if (needsRecreation) {
  console.log('🔄 Outdated database schema detected. Recreating database...');
  db.exec('DROP TABLE IF EXISTS facility_passcodes;');
  db.exec('DROP TABLE IF EXISTS transactions;');
  db.exec('DROP TABLE IF EXISTS bookings;');
  db.exec('DROP TABLE IF EXISTS users;');
}

// Initialize schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Initialize facility passcode if empty
try {
  const passcodeExists = db.prepare("SELECT id FROM facility_passcodes").get();
  if (!passcodeExists) {
    db.prepare(`
      INSERT INTO facility_passcodes (passcode, valid_until)
      VALUES (?, ?)
    `).run('55555', '2099-12-31 23:59');
    console.log('✅ Facility passcode initialized with 55555.');
  }
} catch (err) {
  console.error('Error initializing facility passcode:', err);
}

// Auto-seed admin user if recreating or empty
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@northridgenets.com');
if (!adminExists) {
  const crypto = require('crypto');
  const adminPassword = process.env.ADMIN_PASSWORD || (crypto.randomBytes(8).toString('hex') + 'A1!');
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role, is_verified)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run('Admin', 'admin@northridgenets.com', hash, '555-0000', 'org_admin');
  console.log(`✅ Admin user seeded automatically. Password: ${process.env.ADMIN_PASSWORD ? '[REDACTED]' : adminPassword}`);
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
