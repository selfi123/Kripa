/* ================================================
   KRIPA Pickles – Shared Storefront Logic (main.js)
   Cart, Nav, Search, Push Notifications, Product Cards, i18n Hook
   ================================================ */

const _t = (k, v) => (typeof window.t === 'function' ? window.t(k, v) : k);

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── CART STATE ────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('kripa_cart') || '[]');

function saveCart() {
  localStorage.setItem('kripa_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product) {
  const existing = cart.find(i =>
    String(i.id) === String(product.id) &&
    String(i.selectedSize || '') === String(product.selectedSize || '')
  );
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  showToast(_t('toast_added', { name: product.name }));
}

function removeFromCart(id, selectedSize) {
  cart = cart.filter(i => !(String(i.id) === String(id) && String(i.selectedSize || '') === String(selectedSize || '')));
  saveCart();
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    countEl.textContent = count;
    countEl.classList.toggle('has-items', count > 0);
  }
  renderCartItems();
}

function changeQty(id, selectedSize, delta) {
  const item = cart.find(i => String(i.id) === String(id) && String(i.selectedSize || '') === String(selectedSize || ''));
  if (!item) return;
  const newQty = (item.qty || 1) + delta;
  if (newQty <= 0) {
    removeFromCart(id, selectedSize);
  } else {
    item.qty = newQty;
    saveCart();
  }
}

function renderCartItems() {
  const list = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = `
      <div class="cart-empty">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:0.35;margin-bottom:14px;color:var(--leaf);">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p style="margin-bottom:18px;color:var(--text-muted);font-size:14px;">${_t('cart_empty')}</p>
        <a href="/#pantry" class="btn btn-gold" style="font-size:12px;padding:10px 22px;" onclick="closeCart()">${_t('cart_explore')}</a>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  list.innerHTML = cart.map(item => {
    const imgSrc = item.thumb || (item.images && item.images[0]) || '';
    const linePrice = parseFloat(item.price) * (item.qty || 1);
    return `
    <div class="cart-item" style="border-bottom:1px solid var(--border);padding:14px 0;display:flex;gap:12px;align-items:center;">
      <img src="${imgSrc}" alt="${item.name}" style="width:62px;height:62px;border-radius:12px;object-fit:cover;border:1px solid var(--border-kasavu);background:var(--bg-alt);flex-shrink:0;" onerror="this.style.display='none'"/>
      <div style="flex:1;min-width:0;">
        <p style="font-size:14px;color:var(--leaf-deep);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</p>
        <p style="font-size:11.5px;color:var(--text-muted);margin:2px 0 ${item.selectedSize ? '3px' : '8px'};">${item.category || ''}</p>
        ${item.selectedSize ? `<p style="font-size:10.5px;color:var(--kasavu);font-weight:700;margin-bottom:6px;">${_t('cart_weight')} ${item.selectedSize}</p>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;border:1px solid var(--border);border-radius:999px;overflow:hidden;background:var(--bg);">
            <button onclick="changeQty('${item.id}', ${item.selectedSize ? `'${item.selectedSize}'` : 'null'}, -1)" style="color:var(--leaf-deep);width:28px;height:26px;font-size:15px;font-weight:600;">−</button>
            <span style="font-size:12px;color:var(--text);font-weight:600;min-width:22px;text-align:center;">${item.qty || 1}</span>
            <button onclick="changeQty('${item.id}', ${item.selectedSize ? `'${item.selectedSize}'` : 'null'}, 1)" style="color:var(--leaf-deep);width:28px;height:26px;font-size:15px;font-weight:600;">+</button>
          </div>
          <span style="font-size:14px;color:var(--leaf);font-weight:700;">₹${linePrice.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <button onclick="removeFromCart('${item.id}', ${item.selectedSize ? `'${item.selectedSize}'` : 'null'})" style="color:var(--text-subtle);font-size:16px;padding:4px;transition:color 0.2s;" onmouseover="this.style.color='var(--spice)'" onmouseout="this.style.color='var(--text-subtle)'" title="Remove">✕</button>
    </div>`;
  }).join('');

  const subtotal = cart.reduce((s, i) => s + parseFloat(i.price) * (i.qty || 1), 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

  if (footer) {
    footer.style.display = 'block';
    footer.innerHTML = `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);margin-bottom:6px;">
          <span>${_t('cart_subtotal')}</span><span style="font-weight:600;color:var(--text);">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">
          <span>${_t('cart_shipping')}</span><span>${_t('cart_calc_checkout')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;color:var(--leaf-deep);font-weight:700;padding-top:10px;border-top:1px solid var(--border-kasavu);">
          <span>${_t('cart_total')}</span><span style="color:var(--leaf);">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
      </div>
      <a href="/checkout" onclick="closeCart()" class="btn btn-gold" style="width:100%;padding:14px;">
        ${_t('cart_checkout_btn')}
      </a>
      <p style="text-align:center;font-size:11px;color:var(--text-subtle);margin-top:10px;">${_t('cart_razorpay_note')}</p>`;
  }
}

// ── CART DRAWER ───────────────────────────────────
function openCart() {
  document.getElementById('cart-drawer')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── TOAST ─────────────────────────────────────────
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">✦</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(80px)';
    toast.style.transition = '0.28s ease';
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

// ── PRODUCT CARD RENDERER ─────────────────────────
function renderProductCard(p) {
  const img = p.thumb || (p.images && p.images[0]) || '/images/hero/kerala_pickle.png';
  const priceHtml = p.is_on_sale && p.sale_price
    ? `<div class="product-price">
        <div>
          <span style="color:var(--spice);font-weight:700;font-size:16px;">₹${parseFloat(p.sale_price).toLocaleString('en-IN')}</span>
          <span style="text-decoration:line-through;color:var(--text-subtle);font-size:13px;margin-left:6px;">₹${parseFloat(p.price).toLocaleString('en-IN')}</span>
        </div>
        <span>${_t('incl_taxes')}</span>
       </div>`
    : `<p class="product-price">₹${parseFloat(p.price).toLocaleString('en-IN')} <span>${_t('incl_taxes')}</span></p>`;

  const discount = p.is_on_sale && p.sale_price ? Math.round((1 - p.sale_price / p.price) * 100) : 0;
  const hasOptions = (Array.isArray(p.available_sizes) && p.available_sizes.length > 0) || (p.weight_prices && Object.keys(p.weight_prices).length > 0);

  return `
    <div class="product-card reveal" onclick="location.href='product.html?id=${p.id}'" style="position:relative;">
      ${discount > 0 ? `<div style="position:absolute;top:12px;left:12px;z-index:3;background:var(--spice);color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;">${discount}${_t('badge_off')}</div>` : ''}
      <div class="product-img-wrap">
        <img class="product-img" src="${img}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='/images/hero/kerala_pickle.png';" />
        ${p.stock_status === 'out_of_stock' ? `<span class="product-badge" style="background:var(--spice);color:#fff;border-color:transparent;">${_t('badge_soldout')}</span>` : (p.featured ? `<span class="product-badge">${_t('badge_featured')}</span>` : '')}
        <div class="product-actions">
          ${p.stock_status === 'out_of_stock' ? `
          <button class="btn-cart" style="background:var(--spice-soft);color:var(--spice);cursor:not-allowed;" onclick="event.stopPropagation()">
            ${_t('badge_soldout')}
          </button>
          ` : hasOptions ? `
          <button class="btn-cart" onclick="event.stopPropagation(); location.href='product.html?id=${p.id}'">
            ${_t('btn_select_weight')}
          </button>
          ` : `
          <button class="btn-cart" onclick="event.stopPropagation(); addToCart(${JSON.stringify({ id: p.id, name: p.name, category: p.category, price: p.is_on_sale && p.sale_price ? p.sale_price : p.price, thumb: img }).replace(/"/g, '&quot;')})">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            ${_t('btn_add_cart')}
          </button>
          `}
        </div>
      </div>
      <div class="product-info">
        <p class="product-category">${p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        ${priceHtml}
      </div>
    </div>
  `;
}

// ── PUSH NOTIFICATIONS ──────────────────────────────
async function setupPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      setTimeout(() => document.querySelectorAll('.push-subscribe-btn').forEach(el => el.style.display = 'none'), 500);
    }
  } catch (e) { console.warn('SW error:', e); }
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('Please allow notifications in browser settings.');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) return showToast('Already subscribed! 🔔');

    const res = await fetch('/api/push/vapidPublicKey');
    if (!res.ok) throw new Error('Server push not configured');
    const { publicKey } = await res.json();

    const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const rawData = window.atob(base64 + padding);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });

    showToast('Batch drop alerts enabled! 🔔');
    document.querySelectorAll('.push-subscribe-btn').forEach(el => el.style.display = 'none');
  } catch (e) {
    console.error('Subscribe error:', e);
    showToast('Notification permission denied.');
  }
}

// ── NAV ───────────────────────────────────────────
function setupNav() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 24);
    const btt = document.getElementById('back-to-top');
    if (btt) btt.classList.toggle('visible', window.scrollY > 400);
  });

  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
  document.getElementById('search-btn')?.addEventListener('click', openSearch);

  loadUserState();
}

// ── USER STATE (Google Auth) ──────────────────────
let currentUser = null;

function renderUserSlot() {
  const userSlot = document.getElementById('nav-user-slot');
  const mobileUserSlot = document.getElementById('mobile-user-slot');
  if (!userSlot) return;

  if (currentUser) {
    const displayName = currentUser.name || 'Account';

    userSlot.style.cssText = 'display:flex;align-items:center;gap:8px;';
    userSlot.innerHTML = `
      ${currentUser.isAdmin ? `
        <a href="/admin" class="nav-admin-btn">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 2l3.5 8L21 5l-2 11H5z"/></svg>
          ${_t('nav_admin')}
        </a>` : ''}
      <div class="nav-auth-links">
        <button class="push-subscribe-btn" onclick="subscribeToPush()" style="color:var(--kasavu);font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;">${_t('nav_alerts')}</button>
        <span class="nav-sep push-subscribe-btn">·</span>
        <span class="nav-user-name">${displayName}</span>
        <span class="nav-sep">·</span>
        <a href="/orders" class="nav-orders-link">${_t('nav_orders')}</a>
        <span class="nav-sep">·</span>
        <a href="/auth/logout" class="nav-logout-link" title="Sign Out">${_t('nav_signout')}</a>
      </div>
    `;

    if (mobileUserSlot) {
      mobileUserSlot.innerHTML = `
        <div style="text-align:center;">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${_t('nav_welcome')}</p>
          <p style="font-size:20px;font-family:var(--font-heading);color:var(--leaf-deep);font-weight:600;">${displayName}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;">
          <button class="push-subscribe-btn btn btn-outline" onclick="subscribeToPush()">${_t('nav_enable_alerts')}</button>
          ${currentUser.isAdmin ? `<a href="/admin" class="btn btn-kasavu">${_t('nav_admin_dash')}</a>` : ''}
          <a href="/orders" class="btn btn-gold">${_t('nav_my_orders')}</a>
          <a href="/auth/logout" style="font-size:14px;color:var(--spice);font-weight:600;margin-top:6px;">${_t('nav_signout')}</a>
        </div>
      `;
    }
  } else {
    userSlot.style.cssText = 'display:flex;align-items:center;gap:8px;';
    userSlot.innerHTML = `
      <a href="/login" class="nav-auth-links" style="color:var(--leaf-deep);font-weight:600;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${_t('nav_signin')}
      </a>
      <button class="push-subscribe-btn nav-icon-btn" onclick="subscribeToPush()" title="Enable Push Alerts">🔔</button>
    `;

    if (mobileUserSlot) {
      mobileUserSlot.innerHTML = `
        <button class="push-subscribe-btn btn btn-outline" onclick="subscribeToPush()">${_t('nav_enable_alerts')}</button>
        <a href="/login" class="btn btn-gold" style="padding:12px 36px;">${_t('nav_signin')}</a>
      `;
    }
  }
}

function loadUserState() {
  fetch('/auth/me').then(r => r.json()).then(({ user }) => {
    currentUser = user;
    renderUserSlot();
  }).catch(() => { renderUserSlot(); });
}

// ── SEARCH ────────────────────────────────────────
let _searchCache = null, _searchTimer = null;

function openSearch() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('search-input')?.focus(), 80);
  if (!_searchCache) fetch('/api/products').then(r => r.json()).then(d => { _searchCache = d; }).catch(() => { });
}

function closeSearch() {
  document.getElementById('search-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
  if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
  const sr = document.getElementById('search-results');
  if (sr) sr.innerHTML = `<p class="search-hint">${_t('search_hint')}</p>`;
}

function handleSearchOverlayClick(e) {
  if (e.target === document.getElementById('search-overlay')) closeSearch();
}

function doSearch(q) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _runSearch(q.trim()), 180);
}

function _runSearch(q) {
  const results = document.getElementById('search-results');
  if (!results) return;
  if (!q) { results.innerHTML = `<p class="search-hint">${_t('search_hint')}</p>`; return; }
  const src = _searchCache || [];
  const matches = src.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);
  if (!matches.length) { results.innerHTML = `<p class="search-hint">${_t('search_none', { q: escapeHtml(q) })}</p>`; return; }
  results.innerHTML = matches.map(p => {
    const img = p.thumb || '';
    return `<a class="search-result-item" href="/product.html?id=${encodeURIComponent(p.id)}" onclick="closeSearch()">
      <img class="search-result-img" src="${img}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'"/>
      <div style="flex:1;min-width:0;">
        <div class="search-result-name">${escapeHtml(p.name)}</div>
        <div class="search-result-cat">${escapeHtml(p.category)}</div>
      </div>
      <div class="search-result-price">₹${parseFloat(p.price).toLocaleString('en-IN')}</div>
    </a>`;
  }).join('');
}

// ── MOBILE MENU ───────────────────────────────────
function setupMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
}
window.closeMobileMenu = function () {
  document.getElementById('hamburger')?.classList.remove('open');
  document.getElementById('mobile-menu')?.classList.remove('open');
  document.body.style.overflow = '';
};

// ── INIT & LANGUAGE REFRESH ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupMobileMenu();
  updateCartUI();
  setupPushNotifications();
});

window.addEventListener('kripa:langchange', () => {
  renderCartItems();
  renderUserSlot();
});
