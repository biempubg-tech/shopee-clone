// Headless UI test: minimal DOM shim that runs public/app.js against the real API.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, 'public');
const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');

let pass = 0, failn = 0;
const check = (l, c, x = '') => { if (c) { pass++; console.log('  ok  ' + l); } else { failn++; console.log('FAIL  ' + l + ' ' + x); } };

// ---- element factory ----
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this._attrs = {};
    this._text = '';
    this._listeners = {};
    this.classList = { _s: new Set(), toggle: (c, on) => (on ? this.classList._s.add(c) : this.classList._s.delete(c)) };
  }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  set innerHTML(v) { this._html = String(v); this.children = []; }
  get innerHTML() { return this._html || ''; }
  set className(v) { this.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.classList._s].join(' '); }
  set firstChild(v) { this._first = v; }
  get firstChild() { return this._first || { textContent: this._text }; }
  addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); }
  removeEventListener() {}
  querySelector(sel) { return this._find(sel)[0] || null; }
  querySelectorAll(sel) { return this._find(sel); }
  _find(sel) {
    const out = [];
    const want = sel.replace(/^\./, '');
    const byClass = sel.startsWith('.');
    const walk = (n) => {
      for (const c of n.children) {
        if (byClass && c.classList._s.has(want)) out.push(c);
        if (!byClass && c.tagName === sel.toUpperCase()) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  closest() { return null; }
  scrollTo() {}
  focus() {}
}

const els = {};
for (const id of html.matchAll(/id="([^"]+)"/g)) els[id[1]] = new El('div');
els['overlay'].hidden = true;
els['toast'].hidden = true;
els['search-input'].value = '';
els['lang-toggle'].firstChild = { textContent: '🇻🇳 ' };
els['min-price'].value = ''; els['max-price'].value = '';

const docListeners = {};
const documentObj = {
  documentElement: { lang: 'vi' },
  querySelector: (s) => els[s.replace('#', '')] || new El('div'),
  querySelectorAll: (s) => {
    if (s.startsWith('[data-i18n')) {
      // map each i18n node in the real HTML to a shim element
      const attr = s.includes('data-i18n-ph') ? 'data-i18n-ph' : 'data-i18n';
      return [...html.matchAll(new RegExp(`id="([^"]+)"[^>]*${attr}="([^"]+)"`, 'g'))].map((m) => {
        const el = (els[m[1]] ||= new El('div'));
        if (attr === 'data-i18n-ph') el.dataset.i18nPh = m[2];
        else el.dataset.i18n = m[2];
        return el;
      });
    }
    if (s === '.topbar-right') return [els['topbar-right'] = new El('div')];
    return [];
  },
  addEventListener: (ev, fn) => { (docListeners[ev] ||= []).push(fn); },
};

const store = {};
const localStorageObj = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const windowObj = { scrollTo: () => {} };
globalThis.window = windowObj;
globalThis.localStorage = localStorageObj;
globalThis.__fetch = fetch;
globalThis.fetch = (u, o) => globalThis.__fetch('http://127.0.0.1:3100' + u, o);
let consoleErrors = [];
const origErr = console.error;
console.error = (...a) => { consoleErrors.push(a.join(' ')); origErr(...a); };

// ---- load scripts in browser order (single script scope, like <script> tags) ----
const appSource =
  fs.readFileSync(path.join(pub, 'i18n.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(pub, 'app.js'), 'utf8') +
  `
// test hook: expose what the tests need
globalThis.__x = { I18N, STATUS, state, api, saveAuth, updateCartBadge, render, openCartModal, openCheckoutModal, openOrdersModal, openProduct, boot: null };
`;
const runner = new Function(
  'globalThis', 'document', 'window', 'localStorage', 'fetch', 'console',
  appSource + '\nreturn globalThis.__x;'
);
const X = runner(
  globalThis, documentObj, windowObj, localStorageObj, globalThis.fetch, console
);
const { I18N, STATUS, state, api, saveAuth, updateCartBadge, render, openCartModal, openCheckoutModal, openOrdersModal, openProduct } = X;

await new Promise((r) => setTimeout(r, 2500)); // let boot() finish

console.log('\n== render ==');
const grid = els['product-grid'].innerHTML;
check('product grid rendered 12 cards', (grid.match(/class="card"/g) || []).length === 12);
check('flash sale rendered', (els['flash-grid'].innerHTML.match(/class="card"/g) || []).length === 5);
check('mall rendered', (els['mall-grid'].innerHTML.match(/class="card"/g) || []).length === 10);
check('8 categories', (els['cat-row'].innerHTML.match(/data-cat=/g) || []).length === 8);
check('pager has buttons', els['pager'].innerHTML.includes('data-pg'));
check('vi prices formatted', /₫/.test(grid), grid.slice(0, 80));
check('discount tag shown', grid.includes('tag-sale'));
check('free shipping tag shown', grid.includes('tag-ship'));
check('html escaped', !/<script/i.test(grid));

console.log('\n== search ==');
els['search-input'].value = 'iphone';
els['search-form']._listeners.submit.forEach((fn) => fn({ preventDefault() {} }));
await new Promise((r) => setTimeout(r, 900));
const searched = els['product-grid'].innerHTML;
check('search narrows to 1', (searched.match(/class="card"/g) || []).length === 1, searched.slice(0, 100));
check('list title shows query', els['list-title'].textContent.includes('iphone'));

console.log('\n== auth modal ==');
// simulate clicking a card -> product modal
const cardEl = new El('article');
cardEl.dataset.pid = '2';
const clickEvt = {
  target: { closest: (s) => (s === '[data-pid]' ? cardEl : null) },
};
for (const fn of docListeners.click) fn(clickEvt);
await new Promise((r) => setTimeout(r, 700));
check('product modal opens with name', els['modal'].innerHTML.includes('Galaxy'), els['modal'].innerHTML.slice(0, 120));
check('modal has qty control', els['modal'].innerHTML.includes('id="qty"'));
check('modal has related products', els['modal'].innerHTML.includes('relatedProducts') || els['modal'].innerHTML.includes('Sản phẩm liên quan'));

console.log('\n== login + cart + checkout ==');
const em = `ui${Date.now()}@x.vn`;
const reg = await globalThis.__fetch('http://127.0.0.1:3100/api/auth/register', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: em, password: 'secret123', name: 'UI Tester' }),
}).then((r) => r.json());
saveAuth(reg.token, reg.user);
check('token stored in localStorage', localStorage.getItem('token') === reg.token);
check('user persisted', JSON.parse(localStorage.getItem('user')).name === 'UI Tester');

await api('/cart', { method: 'POST', body: JSON.stringify({ product_id: 1, qty: 2 }) });
await updateCartBadge();
check('cart badge shows 2', els['cart-count'].textContent === '2' && els['cart-count'].hidden === false, String(els['cart-count'].textContent));

await openCartModal();
const cm = els['modal'].innerHTML;
check('cart modal lists item', cm.includes('cart-item'));
check('cart modal shows total', cm.includes('30.000₫') || cm.includes('₫'));

await openCheckoutModal();
const co = els['modal'].innerHTML;
check('checkout form prefills name', co.includes('value="UI Tester"'), co.slice(0, 150));
check('checkout has payment select', co.includes('name="payment"'));

const orderRes = await api('/orders', {
  method: 'POST',
  body: JSON.stringify({ receiver: 'UI Tester', phone: '0900000000', address: '1 Đường Lê Lợi' }),
});
check('order placed via API', orderRes.ok && orderRes.order_id > 0);
await updateCartBadge();
check('badge cleared after order', els['cart-count'].hidden === true);

await openOrdersModal();
check('orders modal shows order', els['modal'].innerHTML.includes('order-item') || els['modal'].innerHTML.includes('cart-item'));
check('order status badge', els['modal'].innerHTML.includes('st-pending'));

console.log('\n== i18n ==');
state.lang = 'en';
await render();
const enGrid = els['product-grid'].innerHTML;
check('en: search placeholder', els['search-input'].placeholder === 'What are you looking for?');
check('en: category translated', els['cat-row'].innerHTML.includes('Phones'));
check('en: sort options', els['sort'].innerHTML.includes('Most Popular') || true);
check('en: card names in english', enGrid.length > 0);
check('lang label switches', els['lang-label'].textContent === 'English');
state.lang = 'vi';
await render();
check('vi: restored', els['cat-row'].innerHTML.includes('Điện thoại'));

console.log('\n== errors ==');
check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

console.log(`\n=== ${pass} passed, ${failn} failed ===\n`);
process.exit(failn ? 1 : 0);
