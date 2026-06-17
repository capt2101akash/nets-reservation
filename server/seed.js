const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  // Check if admin already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@northridgenets.com');
  if (existing) {
    console.log('Admin already seeded.');
    return;
  }

  const hash = await bcrypt.hash('Admin@1234', 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('Admin', 'admin@northridgenets.com', hash, '555-0000', 'admin');

  console.log('✅ Admin user seeded:');
  console.log('   Email:    admin@northridgenets.com');
  console.log('   Password: Admin@1234');
}

seed().catch(console.error);
