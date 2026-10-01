// ---------- state ----------
const state = {
  lang: localStorage.getItem('lang') || 'vi',
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  category: '',
  q: '',
  sort: 'popular',
  min: 0,
  max: 0,
  page: 1,
  pages: 1,
  cartCount: 0,
};

const $ = (s) => document.querySelector(s);
const t = (key) => I18N[state.lang][key] ?? I18N.vi[key] ?? key;
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + '₫';
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({ ok: false, message: res.statusText }));
  if (!res.ok || data.ok === false) throw Object.assign(new Error(data.message || 'Error'), { status: res.status });
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

// ---------- i18n application ----------
function applyI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  $('#lang-label').textContent = state.lang === 'vi' ? 'Tiếng Việt' : 'English';
  $('.lang-toggle').firstChild.textContent = state.lang === 'vi' ? '🇻🇳 ' : '🇬🇧 ';
  const authLink = $('#login-link');
  if (authLink) authLink.textContent = state.user ? t('profile') : t('login');
}

// ---------- auth ----------
function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  api('/auth/logout', { method: 'POST' }).catch(() => {});
  state.token = null;
  state.user = null;
  state.cartCount = 0;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateCartBadge();
  applyI18n();
  render();
}

function requireLogin() {
  if (state.user) return true;
  openAuthModal();
  toast(t('loginRequired'), true);
  return false;
}

// ---------- cart ----------
async function updateCartBadge() {
  if (!state.user) return updateCartBadgeUI(0);
  try {
    const r = await api('/cart');
    state.cartCount = r.count;
  } catch {
    state.cartCount = 0;
  }
  updateCartBadgeUI(state.cartCount);
}
function updateCartBadgeUI(n) {
  const b = $('#cart-count');
  b.textContent = n;
  b.hidden = !n;
}

// ---------- rendering ----------
function productCard(p) {
  const name = state.lang === 'en' ? p.name_en : p.name_vi;
  const discount =
    p.original_price > p.price
      ? Math.round((1 - p.price / p.original_price) * 100)
      : 0;
  return `
    <article class="card" data-pid="${p.id}">
      ${discount ? `<span class="tag-sale">-${discount}%</span>` : ''}
      ${p.free_shipping ? `<span class="tag-ship">${t('freeShip')}</span>` : ''}
      <div class="img">${esc(p.image)}</div>
      <div class="body">
        <div class="nm">${esc(name)}</div>
        <div class="pr">${fmt(p.price)}</div>
        ${p.original_price > p.price ? `<div class="old">${fmt(p.original_price)}</div>` : ''}
        <div class="meta">
          <span>★ ${p.rating.toFixed(1)} · ${t('sold')} ${p.sold}</span>
        </div>
      </div>
    </article>`;
}

async function render() {
  applyI18n();
  const qs = new URLSearchParams();
  if (state.q) qs.set('q', state.q);
  if (state.category) qs.set('category', state.category);
  qs.set('sort', state.sort);
  qs.set('min', state.min);
  qs.set('max', state.max);
  qs.set('limit', 12);
  qs.set('lang', state.lang);

  const [cats, list] = await Promise.all([
    api(`/categories?lang=${state.lang}`),
    api(`/products?${qs}&page=${state.page}`),
  ]);

  $('#cat-row').innerHTML = cats.categories
    .map(
      (c) =>
        `<div class="cat ${state.category === c.slug ? 'active' : ''}" data-cat="${c.slug}">
           <span class="ic">${esc(c.icon)}</span><span class="nm">${esc(c.name)}</span>
         </div>`
    )
    .join('');

  $('#flash-grid').innerHTML = list.products.slice(0, 5).map(productCard).join('');
  $('#mall-grid').innerHTML = list.products.slice(0, 10).map(productCard).join('');
  $('#product-grid').innerHTML = list.products.length
    ? list.products.map(productCard).join('')
    : `<div class="empty" style="grid-column:1/-1"><span class="ic">🔍</span>${state.lang === 'en' ? 'No products found' : 'Không tìm thấy sản phẩm'}</div>`;

  state.pages = list.pages;
  $('#pager').innerHTML =
    list.pages > 1
      ? `<button ${state.page === 1 ? 'disabled' : ''} data-pg="${state.page - 1}">‹</button>` +
        Array.from({ length: list.pages }, (_, i) => i + 1)
          .map(
            (p) =>
              `<button class="${p === state.page ? 'on' : ''}" data-pg="${p}">${p}</button>`
          )
          .join('') +
        `<button ${state.page === list.pages ? 'disabled' : ''} data-pg="${state.page + 1}">›</button>`
      : '';

  $('#list-title').textContent = state.q
    ? `"${state.q}"`
    : state.category
    ? cats.categories.find((c) => c.slug === state.category)?.name || t('allProducts')
    : t('allProducts');

  try {
    const s = await api('/stats');
    $('#stats').textContent = `${s.stats.products} ${t('product')} · ${s.stats.users} ${state.lang === 'en' ? 'users' : 'người dùng'} · ${s.stats.orders} ${t('orders').toLowerCase()}`;
  } catch {}
}

// ---------- modal ----------
function openModal(html, wide = false) {
  const m = $('#modal');
  m.className = 'modal' + (wide ? ' wide' : '');
  m.innerHTML = `<button class="close" data-close>×</button>${html}`;
  $('#overlay').hidden = false;
}
function closeModal() {
  $('#overlay').hidden = true;
  $('#modal').innerHTML = '';
}

// ---------- auth modal ----------
function openAuthModal() {
  openModal(`
    <div class="tabs">
      <button class="on" data-tab="login">${t('loginTitle')}</button>
      <button data-tab="register">${t('registerTitle')}</button>
    </div>
    <div id="auth-error"></div>
    <form id="auth-form">
      <div class="field reg-only" hidden>
        <label>${t('name')}</label><input name="name" autocomplete="name">
      </div>
      <div class="field">
        <label>${t('email')}</label><input name="email" type="email" required autocomplete="email">
      </div>
      <div class="field">
        <label>${t('password')}</label><input name="password" type="password" required minlength="6" autocomplete="current-password">
      </div>
      <div class="field reg-only" hidden>
        <label>${t('phoneLabel')}</label><input name="phone" autocomplete="tel">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-alt" data-close>${t('cancel')}</button>
        <button type="submit" class="btn-main">${t('login')}</button>
      </div>
    </form>
    <div class="demo-hint">${t('demoUser')}: <b>demo@shopee.vn</b> / <b>123456</b></div>
  `);

  const form = $('#auth-form');
  let mode = 'login';

  $('#modal').querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.tab;
      $('#modal').querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      $('#modal').querySelectorAll('.reg-only').forEach((x) => (x.hidden = mode !== 'register'));
      form.querySelector('[type=submit]').textContent = mode === 'login' ? t('login') : t('register');
      $('#auth-error').innerHTML = '';
    })
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const r = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(fd) });
      saveAuth(r.token, r.user);
      closeModal();
      toast(state.lang === 'en' ? `Welcome, ${r.user.name}!` : `Chào mừng ${r.user.name}!`);
      await updateCartBadge();
      render();
    } catch (err) {
      $('#auth-error').innerHTML = `<div class="err">${esc(err.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- product modal ----------
async function openProduct(id) {
  const r = await api(`/products/${id}?lang=${state.lang}`);
  const p = r.product;
  const name = state.lang === 'en' ? p.name_en : p.name_vi;
  const desc = state.lang === 'en' ? p.description_en : p.description_vi;

  openModal(
    `
    <div class="pd-img">${esc(p.image)}</div>
    <h2 style="font-size:17px;margin-bottom:4px">${esc(name)}</h2>
    <div class="pd-pr">${fmt(p.price)} ${p.original_price > p.price ? `<span style="font-size:13px;color:#8a9099;text-decoration:line-through">${fmt(p.original_price)}</span>` : ''}</div>
    <div style="color:#8a9099;font-size:12px;margin-bottom:14px">
      ★ ${p.rating.toFixed(1)} (${p.rating_count}) · ${t('sold')} ${p.sold}
      ${p.free_shipping ? ` · <span style="color:var(--orange)">${t('freeShip')}</span>` : ''}
    </div>
    <div style="font-size:13px;line-height:1.6;color:#4a4f57">${esc(desc || '')}</div>
    <div style="margin:16px 0 6px;font-size:13px">${t('product')}: ${p.stock}</div>
    <div class="qty">
      <button data-q="-1">−</button>
      <input id="qty" value="1" min="1" max="${p.stock}">
      <button data-q="1">+</button>
    </div>
    <div class="modal-actions">
      <button class="btn-alt" id="pd-cart" ${p.stock === 0 ? 'disabled' : ''}>${t('addToCart')}</button>
      <button class="btn-main" id="pd-buy" ${p.stock === 0 ? 'disabled' : ''}>${t('buyNow')}</button>
    </div>
    <h3 style="font-size:15px;margin:22px 0 10px">${t('relatedProducts')}</h3>
    <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px">
      ${r.related
        .slice(0, 4)
        .map(
          (rp) => `<div class="card" data-pid="${rp.id}">
            <div class="img" style="height:70px;font-size:28px">${esc(rp.image)}</div>
            <div class="body" style="padding:6px">
              <div class="nm" style="font-size:11px;height:30px">${esc(state.lang === 'en' ? rp.name_en : rp.name_vi)}</div>
              <div class="pr" style="font-size:12px">${fmt(rp.price)}</div>
            </div></div>`
        )
        .join('')}
    </div>
  `,
    true
  );

  const qty = $('#qty');
  $('#modal').querySelectorAll('[data-q]').forEach((b) =>
    b.addEventListener('click', () => {
      const v = Math.max(1, Math.min(p.stock, Number(qty.value) + Number(b.dataset.q)));
      qty.value = v;
    })
  );

  const addToCart = async () => {
    if (!requireLogin()) return;
    try {
      await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: p.id, qty: Number(qty.value) }) });
      await updateCartBadge();
      toast(state.lang === 'en' ? 'Added to cart' : 'Đã thêm vào giỏ hàng');
      closeModal();
    } catch (e) {
      toast(e.message, true);
    }
  };
  $('#pd-cart').addEventListener('click', addToCart);
  $('#pd-buy').addEventListener('click', async () => {
    if (!requireLogin()) return;
    try {
      await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: p.id, qty: Number(qty.value) }) });
      await updateCartBadge();
      closeModal();
      openCartModal();
    } catch (e) {
      toast(e.message, true);
    }
  });
}

// ---------- cart modal ----------
async function openCartModal() {
  if (!requireLogin()) return;
  const r = await api('/cart');
  if (!r.items.length) {
    openModal(
      `<h2>${t('cartTitle')}</h2>
       <div class="empty"><span class="ic">🛒</span>${t('cartEmpty')}<br><small>${t('cartEmptyHint')}</small></div>
       <div class="modal-actions"><button class="btn-main" data-close>${t('continueShopping')}</button></div>`
    );
    return;
  }
  openModal(
    `<h2>${t('cartTitle')} (${r.count})</h2>
     ${r.items
       .map(
         (i) => `<div class="cart-item">
           <div class="thumb">${esc(i.image)}</div>
           <div class="info">
             <span class="nm">${esc(i.name)}</span>
             <span class="pr">${fmt(i.price)}</span>
           </div>
           <div class="qty">
             <button data-dec="${i.product_id}">−</button>
             <input value="${i.qty}" disabled>
             <button data-inc="${i.product_id}">+</button>
           </div>
           <button class="close" style="position:static" data-del="${i.product_id}">×</button>
         </div>`
       )
       .join('')}
     <div class="summary">
       <div><span>${t('subtotal')}</span><b>${fmt(r.total)}</b></div>
       <div><span>${t('shipping')}</span><b>${fmt(30000)}</b></div>
       <div class="total"><span>${t('total')}</span><span style="color:var(--orange)">${fmt(r.total + 30000)}</span></div>
     </div>
     <div class="modal-actions">
       <button class="btn-alt" data-close>${t('continueShopping')}</button>
       <button class="btn-main" id="go-checkout">${t('checkout')}</button>
     </div>`,
    true
  );

  const change = async (pid, delta) => {
    const item = r.items.find((i) => i.product_id === pid);
    const next = item.qty + delta;
    if (next <= 0) {
      await api(`/cart/${pid}`, { method: 'DELETE' });
    } else {
      try {
        await api(`/cart/${pid}`, { method: 'PUT', body: JSON.stringify({ qty: next }) });
      } catch (e) {
        toast(e.message, true);
        return;
      }
    }
    await updateCartBadge();
    openCartModal();
  };
  $('#modal').querySelectorAll('[data-inc]').forEach((b) =>
    b.addEventListener('click', () => change(Number(b.dataset.inc), 1))
  );
  $('#modal').querySelectorAll('[data-dec]').forEach((b) =>
    b.addEventListener('click', () => change(Number(b.dataset.dec), -1))
  );
  $('#modal').querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/cart/${b.dataset.del}`, { method: 'DELETE' });
      await updateCartBadge();
      openCartModal();
    })
  );
  $('#go-checkout').addEventListener('click', openCheckoutModal);
}

// ---------- checkout modal ----------
async function openCheckoutModal() {
  if (!requireLogin()) return;
  const r = await api('/cart');
  if (!r.items.length) return closeModal();
  const u = state.user || {};

  openModal(
    `<h2>${t('checkoutTitle')}</h2>
     <div id="co-error"></div>
     <form id="co-form">
       <div class="field"><label>${t('receiver')}</label><input name="receiver" required value="${esc(u.name || '')}"></div>
       <div class="field"><label>${t('phone')}</label><input name="phone" required value="${esc(u.phone || '')}"></div>
       <div class="field"><label>${t('address')}</label><input name="address" required value="${esc(u.address || '')}"></div>
       <div class="field"><label>${t('note')}</label><input name="note"></div>
       <div class="field"><label>${t('payment')}</label>
         <select name="payment">
           <option value="cod">${t('cod')}</option>
           <option value="online">${t('online')}</option>
         </select>
       </div>
       <div class="summary">
         <div><span>${t('subtotal')}</span><b>${fmt(r.total)}</b></div>
         <div><span>${t('shipping')}</span><b>${fmt(r.shipping ?? 30000)}</b></div>
         <div class="total"><span>${t('total')}</span><span style="color:var(--orange)">${fmt(r.total + 30000)}</span></div>
       </div>
       <div class="modal-actions">
         <button type="button" class="btn-alt" data-close>${t('cancel')}</button>
         <button type="submit" class="btn-main">${t('placeOrder')}</button>
       </div>
     </form>`,
    true
  );

  $('#co-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const res = await api('/orders', { method: 'POST', body: JSON.stringify(fd) });
      await updateCartBadge();
      openModal(
        `<h2>${t('orderSuccess')}</h2>
         <div class="empty"><span class="ic">✅</span>
           ${t('orderSuccessHint')}<br><b>#${res.order_id} — ${fmt(res.total)}</b>
         </div>
         <div class="modal-actions">
           <button class="btn-alt" data-close>${t('continueShopping')}</button>
           <button class="btn-main" id="view-orders">${t('myOrders')}</button>
         </div>`
      );
      $('#view-orders').addEventListener('click', openOrdersModal);
    } catch (err) {
      $('#co-error').innerHTML = `<div class="err">${esc(err.message)}</div>`;
      btn.disabled = false;
    }
  });
}

// ---------- orders modal ----------
async function openOrdersModal() {
  if (!requireLogin()) return;
  const r = await api('/orders');
  if (!r.orders.length) {
    openModal(`<h2>${t('myOrders')}</h2><div class="empty"><span class="ic">📦</span>${t('noOrders')}</div>`);
    return;
  }
  openModal(
    `<h2>${t('myOrders')}</h2>
     ${r.orders
       .map(
         (o) => `<div class="order">
           <div class="order-head">
             <b>#${o.id}</b>
             <span class="badge-st st-${o.status}">${STATUS[state.lang][o.status] || o.status}</span>
             <b style="color:var(--orange)">${fmt(o.total)}</b>
           </div>
           <div style="font-size:12px;color:#8a9099;margin-bottom:8px">${esc(o.created_at)} · ${esc(o.receiver)} · ${esc(o.address)}</div>
           ${o.items
             .map(
               (i) => `<div class="cart-item" style="padding:6px 0">
                 <div class="thumb" style="width:38px;height:38px;font-size:18px">${esc(i.image)}</div>
                 <div class="info"><span class="nm">${esc(i.name)}</span></div>
                 <span style="font-size:12px">×${i.qty}</span>
               </div>`
             )
             .join('')}
           ${['pending', 'paid'].includes(o.status) ? `<div style="text-align:right;margin-top:8px"><button class="btn-ghost" data-cancel="${o.id}">${t('cancel')}</button></div>` : ''}
         </div>`
       )
       .join('')}`,
    true
  );

  $('#modal').querySelectorAll('[data-cancel]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await api(`/orders/${b.dataset.cancel}/cancel`, { method: 'POST' });
        toast(t('orderCancelled'));
        openOrdersModal();
      } catch (e) {
        toast(e.message, true);
      }
    })
  );
}

// ---------- global events ----------
document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-pid]');
  if (card) openProduct(Number(card.dataset.pid));
  const cat = e.target.closest('[data-cat]');
  if (cat) {
    state.category = state.category === cat.dataset.cat ? '' : cat.dataset.cat;
    state.page = 1;
    window.scrollTo({ top: 300, behavior: 'smooth' });
    render();
  }
  const pg = e.target.closest('[data-pg]');
  if (pg && !pg.disabled) {
    state.page = Number(pg.dataset.pg);
    render();
  }
  if (e.target.closest('[data-close]') || e.target.id === 'overlay') closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.q = $('#search-input').value.trim();
  state.page = 1;
  state.category = '';
  window.scrollTo({ top: 300, behavior: 'smooth' });
  render();
});

$('#sort').addEventListener('change', (e) => {
  state.sort = e.target.value;
  state.page = 1;
  render();
});

$('#apply-price').addEventListener('click', () => {
  state.min = Number($('#min-price').value) || 0;
  state.max = Number($('#max-price').value) || 0;
  state.page = 1;
  render();
});

$('.cart-btn').addEventListener('click', (e) => {
  e.preventDefault();
  openCartModal();
});

$('#lang-toggle').addEventListener('click', () => {
  state.lang = state.lang === 'vi' ? 'en' : 'vi';
  localStorage.setItem('lang', state.lang);
  render();
});

// rebuild auth/profile link in topbar
const topRight = document.querySelector('.topbar-right');
topRight.innerHTML = `
  <a href="#" id="orders-link">${t('orders')}</a>
  <a href="#">${t('help')}</a>
  <a href="#" id="login-link">${t('login')}</a>`;

document.addEventListener('click', (e) => {
  if (e.target.id === 'login-link') {
    e.preventDefault();
    state.user ? openProfileModal() : openAuthModal();
  }
  if (e.target.id === 'orders-link') {
    e.preventDefault();
    openOrdersModal();
  }
});

function openProfileModal() {
  const u = state.user;
  openModal(
    `<h2>${t('profile')}</h2>
     <form id="pf-form">
       <div class="field"><label>${t('email')}</label><input value="${esc(u.email)}" disabled></div>
       <div class="field"><label>${t('name')}</label><input name="name" value="${esc(u.name)}"></div>
       <div class="field"><label>${t('phoneLabel')}</label><input name="phone" value="${esc(u.phone || '')}"></div>
       <div class="field"><label>${t('address')}</label><input name="address" value="${esc(u.address || '')}"></div>
       <div class="modal-actions">
         <button type="button" class="btn-alt" id="pf-logout">${t('logout')}</button>
         <button type="submit" class="btn-main">${t('apply')}</button>
       </div>
     </form>`
  );
  $('#pf-logout').addEventListener('click', () => {
    logout();
    closeModal();
    toast(t('logout'));
  });
  $('#pf-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api('/auth/me', { method: 'PUT', body: JSON.stringify(fd) });
      saveAuth(state.token, r.user);
      closeModal();
      toast(t('apply'));
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------- boot ----------
(async function boot() {
  if (state.token) {
    try {
      const r = await api('/auth/me');
      saveAuth(state.token, r.user);
    } catch {
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  await updateCartBadge();
  await render();
  console.log('Shopee-clone ready.');
})();
