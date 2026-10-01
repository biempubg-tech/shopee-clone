import { db, hashPassword } from './db.js';
import { seedDatabase } from './seed-data.js';

const c = db.prepare('SELECT COUNT(*) AS c FROM categories').get();

if (c.c === 0) {
  const r = seedDatabase(db, hashPassword);
  console.log(`Seeded ${r.categories} categories, ${r.products} products.`);
  console.log('Demo account ready: demo@shopee.vn / 123456');
} else {
  console.log(`Database already has ${c.c} categories — skipping seed.`);
  const demo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@shopee.vn');
  if (!demo) {
    db.prepare('INSERT INTO users (email, password_hash, name, phone, address) VALUES (?, ?, ?, ?, ?)')
      .run('demo@shopee.vn', hashPassword('123456'), 'Demo User', '0900000000', '100 Nguyễn Huệ, Quận 1, TP.HCM');
    console.log('Demo account ready: demo@shopee.vn / 123456');
  }
}
