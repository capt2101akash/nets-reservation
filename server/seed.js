const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  // Check if admin already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@northridgenets.com');
  if (existing) {
    console.log('Admin already seeded.');
    return;
  }

  const crypto = require('crypto');
  const adminPassword = process.env.ADMIN_PASSWORD || (crypto.randomBytes(8).toString('hex') + 'A1!');
  const hash = await bcrypt.hash(adminPassword, 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('Admin', 'admin@northridgenets.com', hash, '555-0000', 'org_admin');

  console.log('✅ Admin user seeded:');
  console.log('   Email:    admin@northridgenets.com');
  console.log(`   Password: ${adminPassword}`);
}

seed().catch(console.error);
