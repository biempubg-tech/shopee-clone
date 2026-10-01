import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { db, hashPassword, verifyPassword } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- helpers ----------
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, code, message) => res.status(code).json({ ok: false, message });
const lang = (req) => (String(req.query.lang || 'vi') === 'en' ? 'en' : 'vi');

function currentUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.cookies?.sid;
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!s || s.expires_at < Date.now()) return null;
  const u = db.prepare('SELECT id, email, name, phone, address FROM users WHERE id = ?').get(s.user_id);
  if (!u) return null;
  return { ...u, token };
}

function requireAuth(req, res, next) {
  const u = currentUser(req);
  if (!u) return fail(res, 401, 'Vui lòng đăng nhập / Please sign in');
  req.user = u;
  next();
}

// expose user to all requests
app.use((req, _res, next) => {
  req.user = currentUser(req);
  next();
});

const productSql = (l) => `
  SELECT p.*, c.slug AS category_slug, c.icon AS category_icon,
         c.name_${l} AS category_name
  FROM products p LEFT JOIN categories c ON c.id = p.category_id
`;

// ---------- auth ----------
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone = '' } = req.body || {};
  if (!email || !password || !name)
    return fail(res, 400, 'Thiếu email, mật khẩu hoặc tên / Missing email, password or name');
  if (String(password).length < 6)
    return fail(res, 400, 'Mật khẩu tối thiểu 6 ký tự / Password must be at least 6 characters');

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (exists) return fail(res, 409, 'Email đã được sử dụng / Email already registered');

  const info = db
    .prepare('INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)')
    .run(String(email).toLowerCase(), hashPassword(password), name, phone);

  const user = db.prepare('SELECT id, email, name, phone FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = createSession(user.id);
  ok(res, { token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
  if (!row || !verifyPassword(String(password || ''), row.password_hash))
    return fail(res, 401, 'Sai email hoặc mật khẩu / Wrong email or password');
  const { id, email: e, name, phone, address } = row;
  ok(res, { token: createSession(id), user: { id, email: e, name, phone, address } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.user.token);
  ok(res);
});

app.get('/api/auth/me', requireAuth, (req, res) => ok(res, { user: req.user }));

app.put('/api/auth/me', requireAuth, (req, res) => {
  const { name, phone, address } = req.body || {};
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?')
    .run(name ?? null, phone ?? null, address ?? null, req.user.id);
  const user = db.prepare('SELECT id, email, name, phone, address FROM users WHERE id = ?').get(req.user.id);
  ok(res, { user });
});

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, Date.now() + SESSION_TTL);
  return token;
}

// ---------- catalog ----------
app.get('/api/categories', (req, res) => {
  const l = lang(req);
  const rows = db.prepare(`SELECT id, slug, icon, name_${l} AS name FROM categories ORDER BY id`).all();
  ok(res, { categories: rows });
});

app.get('/api/products', (req, res) => {
  const l = lang(req);
  const { q = '', category = '', sort = 'popular', min = 0, max = 0, page = 1, limit = 12 } = req.query;
  const where = [];
  const params = [];

  if (q) {
    where.push('(p.name_vi LIKE ? OR p.name_en LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (Number(min) > 0) { where.push('p.price >= ?'); params.push(Number(min)); }
  if (Number(max) > 0) { where.push('p.price <= ?'); params.push(Number(max)); }

  const orderBy = {
    popular: 'p.sold DESC',
    newest: 'p.created_at DESC, p.id DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    rating: 'p.rating DESC',
  }[sort] || 'p.sold DESC';

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`)
    .get(...params).c;

  const lim = Math.min(Number(limit) || 12, 60);
  const off = (Math.max(Number(page) || 1, 1) - 1) * lim;
  const items = db
    .prepare(`${productSql(l)} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, lim, off);

  ok(res, { products: items, total, page: Number(page) || 1, pages: Math.ceil(total / lim) || 1 });
});

app.get('/api/products/:id', (req, res) => {
  const l = lang(req);
  const p = db.prepare(`${productSql(l)} WHERE p.id = ?`).get(Number(req.params.id));
  if (!p) return fail(res, 404, 'Không tìm thấy sản phẩm / Product not found');
  const related = db
    .prepare(`${productSql(l)} WHERE p.category_id = ? AND p.id != ? ORDER BY p.sold DESC LIMIT 8`)
    .all(p.category_id, p.id);
  ok(res, { product: p, related });
});

// ---------- cart ----------
app.get('/api/cart', requireAuth, (req, res) => {
  const l = lang(req);
  const items = db
    .prepare(
      `SELECT c.id, c.qty, p.id AS product_id, p.name_${l} AS name, p.price, p.image, p.stock, p.free_shipping
       FROM carts c JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ? ORDER BY c.id DESC`
    )
    .all(req.user.id);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  ok(res, { items, total, count });
});

app.post('/api/cart', requireAuth, (req, res) => {
  const productId = Number(req.body?.product_id);
  const qty = Math.max(1, Number(req.body?.qty) || 1);
  const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
  if (!p) return fail(res, 404, 'Sản phẩm không tồn tại / Product not found');

  const existing = db
    .prepare('SELECT qty FROM carts WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, productId);
  const newQty = Math.min((existing?.qty || 0) + qty, p.stock);
  if (newQty <= (existing?.qty || 0)) return fail(res, 400, 'Không đủ hàng / Not enough stock');

  db.prepare(
    `INSERT INTO carts (user_id, product_id, qty) VALUES (?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET qty = excluded.qty`
  ).run(req.user.id, productId, newQty);
  ok(res);
});

app.put('/api/cart/:productId', requireAuth, (req, res) => {
  const qty = Number(req.body?.qty);
  const productId = Number(req.params.productId);
  if (!Number.isInteger(qty) || qty < 0) return fail(res, 400, 'Số lượng không hợp lệ / Invalid quantity');
  if (qty === 0) {
    db.prepare('DELETE FROM carts WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  } else {
    const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId);
    if (!p || qty > p.stock) return fail(res, 400, 'Không đủ hàng / Not enough stock');
    db.prepare('UPDATE carts SET qty = ? WHERE user_id = ? AND product_id = ?').run(qty, req.user.id, productId);
  }
  ok(res);
});

app.delete('/api/cart/:productId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM carts WHERE user_id = ? AND product_id = ?').run(req.user.id, Number(req.params.productId));
  ok(res);
});

app.delete('/api/cart', requireAuth, (req, res) => {
  db.prepare('DELETE FROM carts WHERE user_id = ?').run(req.user.id);
  ok(res);
});

// ---------- orders ----------
app.post('/api/orders', requireAuth, (req, res) => {
  const l = lang(req);
  const { receiver, phone, address, note = '', payment = 'cod' } = req.body || {};
  if (!receiver || !phone || !address)
    return fail(res, 400, 'Vui lòng nhập tên, số điện thoại và địa chỉ nhận hàng');

  const items = db
    .prepare(
      `SELECT c.qty, p.id AS product_id, p.name_${l} AS name, p.price, p.stock
       FROM carts c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`
    )
    .all(req.user.id);
  if (!items.length) return fail(res, 400, 'Giỏ hàng đang trống / Cart is empty');

  for (const it of items) if (it.qty > it.stock) return fail(res, 400, `Không đủ hàng: ${it.name}`);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = 30000;
  const grandTotal = total + shipping;

  db.exec('BEGIN');
  try {
    const info = db
      .prepare(
        `INSERT INTO orders (user_id, status, total, receiver, phone, address, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, payment === 'cod' ? 'pending' : 'paid', grandTotal, receiver, phone, address, note);

    const orderId = Number(info.lastInsertRowid);
    const addItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name_snapshot, price, qty) VALUES (?, ?, ?, ?, ?)'
    );
    const decStock = db.prepare('UPDATE products SET stock = stock - ?, sold = sold + ? WHERE id = ?');
    for (const it of items) {
      addItem.run(orderId, it.product_id, it.name, it.price, it.qty);
      decStock.run(it.qty, it.qty, it.product_id);
    }
    db.prepare('DELETE FROM carts WHERE user_id = ?').run(req.user.id);
    db.prepare('UPDATE users SET phone = ?, address = ? WHERE id = ?').run(phone, address, req.user.id);
    db.exec('COMMIT');
    ok(res, { order_id: orderId, total: grandTotal, shipping });
  } catch (e) {
    db.exec('ROLLBACK');
    fail(res, 500, `Lỗi đặt hàng: ${e.message}`);
  }
});

app.get('/api/orders', requireAuth, (req, res) => {
  const l = lang(req);
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  const itemStmt = db.prepare(
    `SELECT oi.*, p.image, p.name_${l} AS name FROM order_items oi
     JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
  );
  ok(res, {
    orders: orders.map((o) => ({ ...o, items: itemStmt.all(o.id) })),
  });
});

app.post('/api/orders/:id/cancel', requireAuth, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.user.id);
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng / Order not found');
  if (!['pending', 'paid'].includes(order.status))
    return fail(res, 400, 'Không thể hủy đơn này / Cannot cancel this order');

  db.exec('BEGIN');
  try {
    const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ?').all(order.id);
    for (const it of items)
      db.prepare('UPDATE products SET stock = stock + ?, sold = MAX(sold - ?, 0) WHERE id = ?').run(it.qty, it.qty, it.product_id);
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
    db.exec('COMMIT');
    ok(res);
  } catch (e) {
    db.exec('ROLLBACK');
    fail(res, 500, e.message);
  }
});

app.get('/api/health', (_req, res) => ok(res, { uptime: Math.round(process.uptime()) }));

app.get('/api/stats', (req, res) => {
  const t = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM products) AS products,
              (SELECT COUNT(*) FROM users) AS users,
              (SELECT COUNT(*) FROM orders) AS orders`
    )
    .get();
  ok(res, { stats: t });
});

app.use('/api', (_req, res) => fail(res, 404, 'API không tồn tại / Endpoint not found'));

// A fresh host (CI/CD container, first deploy) starts with an empty DB — seed it.
if (db.prepare('SELECT COUNT(*) AS c FROM categories').get().c === 0) {
  const { seedDatabase } = await import('./seed-data.js');
  const seeded = seedDatabase(db, hashPassword);
  console.log(`[seed] ${seeded.categories} categories, ${seeded.products} products, demo user created.`);
}

app.listen(PORT, () => {
  console.log(`\n  🛒  Shopee-clone running at http://localhost:${PORT}\n`);
});
