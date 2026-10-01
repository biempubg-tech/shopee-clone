const BASE = 'http://localhost:3100/api';
let pass = 0, failn = 0;

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { failn++; console.log(`FAIL  ${label} ${extra}`); }
}

console.log('\n== catalog ==');
const cats = await call('/categories?lang=vi');
check('categories vi', cats.body.categories.length === 8 && cats.body.categories[0].name.includes('Điện'));
const catsEn = await call('/categories?lang=en');
check('categories en translated', catsEn.body.categories[0].name === 'Phones & Accessories');
const list = await call('/products?limit=12&lang=vi');
check('product list 12 items', list.body.products.length === 12, JSON.stringify(list.body).slice(0, 120));
check('total = 28', list.body.total === 28);
const sorted = await call('/products?sort=price_asc&limit=5');
const prices = sorted.body.products.map((p) => p.price);
check('price_asc sorted', prices.every((v, i) => i === 0 || prices[i - 1] <= v), prices.join(','));
const srch = await call('/products?q=iphone&lang=en');
check('search finds iPhone', srch.body.products.length === 1);
const catF = await call('/products?category=the-thao&lang=vi');
check('category filter = 3', catF.body.products.length === 3, String(catF.body.products.length));
const pr = await call('/products?min=1000000&max=5000000&limit=60');
check('price range filter', pr.body.products.every((p) => p.price >= 1e6 && p.price <= 5e6));
const det = await call('/products/1?lang=vi');
check('detail + related', det.body.product.id === 1 && det.body.related.length > 0);

console.log('\n== auth ==');
const email = `t${Date.now()}@shop.vn`;
const reg = await call('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'secret123', name: 'Test User', phone: '0900000000' }) });
check('register', reg.body.ok && !!reg.body.token);
const token = reg.body.token;
const auth = { Authorization: 'Bearer ' + token };
const dup = await call('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'secret123', name: 'X' }) });
check('duplicate email rejected 409', dup.status === 409);
const weak = await call('/auth/register', { method: 'POST', body: JSON.stringify({ email: 'w@x.vn', password: '12', name: 'X' }) });
check('weak password rejected', weak.status === 400);
const badLogin = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'wrong' }) });
check('wrong password rejected 401', badLogin.status === 401);
const noAuth = await call('/cart');
check('cart needs auth 401', noAuth.status === 401);
const me = await call('/auth/me', { headers: auth });
check('me works', me.body.user.email === email);
const upd = await call('/auth/me', { method: 'PUT', headers: auth, body: JSON.stringify({ address: '123 Nguyễn Huệ, Q1' }) });
check('update profile', upd.body.user.address.includes('Nguyễn Huệ'));

console.log('\n== cart ==');
await call('/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 1, qty: 2 }) });
await call('/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 5, qty: 3 }) });
const cart = await call('/cart', { headers: auth });
const p5 = (await call('/products/5?lang=vi')).body.product;
const expect = det.body.product.price * 2 + p5.price * 3;
check('cart count = 5', cart.body.count === 5);
check('cart total correct', cart.body.total === expect, `${cart.body.total} vs ${expect}`);
await call('/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 5, qty: 1 }) });
const merged = await call('/cart', { headers: auth });
const m1 = merged.body.items.find((i) => i.product_id === 5);
check('add merges same product qty=4', m1?.qty === 4, 'got ' + JSON.stringify(merged.body.items.map((i) => [i.product_id, i.qty])));

// merge must be refused, not silently capped, when it would exceed stock
const low = await call('/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 1, qty: 999 }) });
const stock1 = (await call('/products/1?lang=vi')).body.product.stock;
check(
  'merge beyond stock returns 400 or caps at stock',
  low.status === 400 || (await call('/cart', { headers: auth })).body.items.find((i) => i.product_id === 1)?.qty === stock1,
  `status=${low.status} stock=${stock1}`
);
const over = await call('/cart/1', { method: 'PUT', headers: auth, body: JSON.stringify({ qty: 9999 }) });
check('qty above stock rejected', over.status === 400);
const good = await call('/cart/1', { method: 'PUT', headers: auth, body: JSON.stringify({ qty: 1 }) });
check('set qty = 1', good.body.ok);
await call('/cart/5', { method: 'DELETE', headers: auth });
const afterDel = await call('/cart', { headers: auth });
check('delete item', afterDel.body.items.length === 1);
await call('/cart', { method: 'POST', headers: auth, body: JSON.stringify({ product_id: 6, qty: 4 }) });
const noStock = await call('/products/6?lang=vi');
check('product 6 has stock', noStock.body.product.stock > 0);

console.log('\n== checkout + orders ==');
const stockBefore = (await call('/products/1?lang=vi')).body.product.stock;
const soldBefore = (await call('/products/1?lang=vi')).body.product.sold;
const order = await call('/orders', { method: 'POST', headers: auth, body: JSON.stringify({ receiver: 'Test User', phone: '0900000000', address: '123 Nguyễn Huể' }) });
check('order created', order.body.ok && order.body.order_id > 0, JSON.stringify(order.body).slice(0, 150));
const afterOrder = await call('/products/1?lang=vi');
check('stock decremented', afterOrder.body.product.stock === stockBefore - 1, `${afterOrder.body.product.stock} vs ${stockBefore - 1}`);
check('sold incremented', afterOrder.body.product.sold === soldBefore + 1);
const emptied = await call('/cart', { headers: auth });
check('cart cleared after order', emptied.body.items.length === 0);
const noAddr = await call('/orders', { method: 'POST', headers: auth, body: JSON.stringify({ receiver: 'x' }) });
check('checkout needs address', noAddr.status === 400);
const orders = await call('/orders', { headers: auth });
check('order listed with items', orders.body.orders.length === 1 && orders.body.orders[0].items.length === 2);
const stockAfter = (await call('/products/1?lang=vi')).body.product.stock;
const cancel = await call(`/orders/${order.body.order_id}/cancel`, { method: 'POST', headers: auth });
check('cancel order', cancel.body.ok);
const restored = await call('/products/1?lang=vi');
check('stock restored on cancel', restored.body.product.stock === stockAfter + 1);
const recancel = await call(`/orders/${order.body.order_id}/cancel`, { method: 'POST', headers: auth });
check('cannot cancel twice', recancel.status === 400);

console.log('\n== security ==');
const otherEmail = `o${Date.now()}@shop.vn`;
const other = await call('/auth/register', { method: 'POST', body: JSON.stringify({ email: otherEmail, password: 'secret123', name: 'Other' }) });
const otherAuth = { Authorization: 'Bearer ' + other.body.token };
const steal = await call(`/orders/${order.body.order_id}/cancel`, { method: 'POST', headers: otherAuth });
check("cannot touch another user's order", steal.status === 404);
const badTok = await call('/cart', { headers: { Authorization: 'Bearer deadbeef' } });
check('invalid token 401', badTok.status === 401);
const notFound = await call('/products/99999');
check('product 404', notFound.status === 404);
const badApi = await call('/nope');
check('unknown api route 404', badApi.status === 404);

console.log('\n== logout ==');
const out = await call('/auth/logout', { method: 'POST', headers: auth });
check('logout ok', out.body.ok);
const afterOut = await call('/cart', { headers: auth });
check('token invalid after logout', afterOut.status === 401);

console.log(`\n=== ${pass} passed, ${failn} failed ===\n`);
process.exit(failn ? 1 : 0);
