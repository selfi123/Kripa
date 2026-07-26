/* ============================================
   KRIPA Admin Dashboard – admin.js (base64)
   ============================================ */

const TOKEN_KEY = 'kripa_admin_token';
let allProducts = [];
let allCategories = [];
let deleteTarget = null;
let editMode = false;
let isFeatured = false;
let currentTab = 'products';

// ── AUTH ─────────────────────────────────────
async function checkAuth() {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
        // Fallback: try getting token from server session (Google OAuth flow)
        try {
            const res = await fetch('/auth/admin-token');
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    sessionStorage.setItem(TOKEN_KEY, data.token);
                    token = data.token;
                }
            }
        } catch (e) { }
    }
    if (!token) { window.location.replace('/admin/'); return; }
    loadDashboard();
}

function getToken() { return sessionStorage.getItem(TOKEN_KEY); }

function logout() {
    fetch('/api/admin/logout', { method: 'POST', headers: { 'x-admin-token': getToken() } }).catch(() => { });
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.replace('/admin/');
}

// ── API ──────────────────────────────────────
async function apiFetch(url, opts = {}) {
    const res = await fetch(url, {
        ...opts,
        headers: { 'x-admin-token': getToken(), 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    if (res.status === 401) { window.location.replace('/admin/'); return null; }
    return res;
}

// ── INIT ─────────────────────────────────────
async function loadDashboard() {
    document.body.style.opacity = '1';
    document.body.style.pointerEvents = 'auto';
    await Promise.all([loadProducts(), loadCategories(), loadDashStats()]);
}

async function loadDashStats() {
    try {
        const res = await fetch('/api/stats');
        if (!res.ok) return;
        const s = await res.json();
        const fmt = v => '₹' + Math.round(v).toLocaleString('en-IN');
        document.getElementById('stat-revenue').textContent = fmt(s.revenue);
        document.getElementById('stat-orders').textContent = s.totalOrders;
        document.getElementById('stat-pending').textContent = s.pending;
        document.getElementById('stat-total').textContent = s.products;
        document.getElementById('stat-users').textContent = s.users;
    } catch (e) { }
}

// ── TABS ─────────────────────────────────────
function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tab);
    if (tabEl) tabEl.style.display = '';
    document.querySelectorAll(`[onclick="showTab('${tab}')"]`).forEach(el => el.classList.add('active'));
    if (tab === 'products') loadProducts();
    if (tab === 'categories') loadCategories();
    if (tab === 'users') loadUsers();
    if (tab === 'orders') loadAdminOrders();
    if (tab === 'preorders') loadAdminPreorders();
}

// ══════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════
async function loadProducts() {
    try {
        const res = await apiFetch('/api/admin/products');
        if (!res) return;
        allProducts = await res.json();
        renderProductsTable(allProducts);
    } catch (e) { showToast('Error loading products.'); }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-tbody');
    if (!products.length) { tbody.innerHTML = `<tr><td colspan="7" style="padding:50px;text-align:center;color:var(--text-muted)">No products found.</td></tr>`; return; }
    const stColors = { in_stock: '#5cb85c', low_stock: '#f0ad4e', out_of_stock: '#d9534f' };
    const stLabels = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Sold Out' };
    tbody.innerHTML = products.map(p => `
    <tr>
      <td><img class="td-img" src="" data-pid="${p.id}" alt="${p.name}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#222;" /></td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</td>
      <td><span style="font-size:12px;color:var(--gold);">${p.category}</span></td>
      <td style="font-weight:500;color:var(--gold);">₹${parseFloat(p.price).toLocaleString('en-IN')}</td>
      <td><div style="font-size:12px;color:${stColors[p.stock_status] || '#fff'};">${p.stock !== null ? p.stock + ' qty' : '\u221e'}</div><div style="font-size:10px;color:var(--text-muted);">${stLabels[p.stock_status] || ''}</div></td>
      <td><span class="td-badge ${p.featured ? 'badge-featured' : 'badge-normal'}">${p.featured ? 'Featured' : 'Standard'}</span></td>
      <td>
        <div class="td-actions">
          <button class="icon-btn icon-btn-edit" onclick="openEditProductModal('${p.id}')" title="Edit">✏️</button>
          <button class="icon-btn icon-btn-del" onclick="openDeleteModal('${p.id}','${p.name.replace(/'/g, "\\'")}','product')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
    // Lazy-load product thumbnails
    document.querySelectorAll('[data-pid]').forEach(async img => {
        const res = await apiFetch(`/api/admin/products/${img.dataset.pid}/images`).catch(() => null);
        if (!res) return;
        const { images } = await res.json().catch(() => ({ images: [] }));
        if (images && images[0]) img.src = images[0];
    });
}

function filterTable(q) {
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase()));
    renderProductsTable(filtered);
}

// ── Product Modals ────────────────────────────
let productImages = []; // base64 array for current modal

function openAddProductModal() {
    editMode = false; productImages = [];
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('img-previews').innerHTML = '';
    document.getElementById('img-previews').innerHTML = '';
    populateCategorySelect();
    isFeatured = false; updateToggle();
    isPushOn = false; updatePushToggle();
    currentWeightPrices = {};
    renderVariants();
    document.getElementById('product-modal').classList.add('open');
}



async function openEditProductModal(id) {
    editMode = true;
    const res = await apiFetch(`/api/admin/products/${id}/images`);
    const { images } = await res.json().catch(() => ({ images: [] }));
    productImages = images || [];
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('edit-id').value = id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-description').value = p.description || '';
    document.getElementById('p-description').value = p.description || '';
    isFeatured = p.featured || false; updateToggle();
    isPushOn = false; updatePushToggle();
    populateCategorySelect(p.category);
    // Load variants
    currentWeightPrices = (p.weight_prices && typeof p.weight_prices === 'object') ? { ...p.weight_prices } : {};
    renderVariants();
    renderImagePreviews();
    document.getElementById('product-modal').classList.add('open');
}

function populateCategorySelect(selected = '') {
    const sel = document.getElementById('p-category');
    sel.innerHTML = `<option value="">Select category…</option>` +
        allCategories.map(c => `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${c.name}</option>`).join('');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
    currentWeightPrices = {};
    renderVariants();
}

function toggleFeatured() { isFeatured = !isFeatured; updateToggle(); }
function updateToggle() {
    const t = document.getElementById('featured-toggle'), l = document.getElementById('featured-label');
    if (isFeatured) { t.classList.add('on'); l.textContent = 'Featured on homepage'; }
    else { t.classList.remove('on'); l.textContent = 'Not featured'; }
    document.getElementById('p-featured').value = isFeatured;
}

let isPushOn = false;
function togglePush() { isPushOn = !isPushOn; updatePushToggle(); }
function updatePushToggle() {
    const track = document.getElementById('push-toggle');
    if (track) track.classList.toggle('on', isPushOn);
    document.getElementById('p-send-push').value = isPushOn;
}

// ── VARIANTS (WEIGHTS) ────────────────────────────────────────────────────────

let currentWeightPrices = {};

function addVariantRow(weight = '', price = '', salePrice = '', stock = '', isOnSale = false, featured = false) {
    const uid = 'var_' + Math.random().toString(36).substr(2, 9);
    
    const container = document.getElementById('variants-container');
    const row = document.createElement('div');
    row.id = uid;
    row.className = 'variant-row';
    row.style.cssText = 'display:flex; gap:12px; align-items:center; background:var(--dark-2); padding:16px; border:1px solid rgba(201,169,110,0.15); border-radius:12px; flex-wrap:wrap;';
    
    row.innerHTML = `
        <div style="flex:1; min-width:120px;">
            <label style="font-size:10px; color:var(--text-muted); margin-bottom:4px; display:block;">Weight *</label>
            <input type="text" class="v-weight" value="${weight}" placeholder="e.g. 250g" style="width:100%; padding:8px; border-radius:6px; background:var(--dark-3); border:1px solid rgba(255,255,255,0.05); color:#fff;">
        </div>
        <div style="flex:1; min-width:100px;">
            <label style="font-size:10px; color:var(--text-muted); margin-bottom:4px; display:block;">Price (₹) *</label>
            <input type="number" class="v-price" value="${price}" placeholder="150" min="0" style="width:100%; padding:8px; border-radius:6px; background:var(--dark-3); border:1px solid rgba(255,255,255,0.05); color:#fff;">
        </div>
        <div style="flex:1; min-width:100px;">
            <label style="font-size:10px; color:var(--text-muted); margin-bottom:4px; display:block;">Sale Price</label>
            <input type="number" class="v-sale-price" value="${salePrice}" placeholder="120" min="0" style="width:100%; padding:8px; border-radius:6px; background:var(--dark-3); border:1px solid rgba(255,255,255,0.05); color:#fff;">
        </div>
        <div style="flex:1; min-width:100px;">
            <label style="font-size:10px; color:var(--text-muted); margin-bottom:4px; display:block;">Stock Qty</label>
            <input type="number" class="v-stock" value="${stock}" placeholder="e.g. 50" min="0" style="width:100%; padding:8px; border-radius:6px; background:var(--dark-3); border:1px solid rgba(255,255,255,0.05); color:#fff;">
        </div>
        <div style="display:flex; align-items:center; gap:6px; min-width:80px; margin-top:16px;">
            <input type="checkbox" class="v-on-sale" ${isOnSale ? 'checked' : ''} style="accent-color:var(--gold);">
            <label style="font-size:11px; margin:0;">On Sale</label>
        </div>
        <div style="display:flex; align-items:center; gap:6px; min-width:80px; margin-top:16px;">
            <input type="checkbox" class="v-featured" ${featured ? 'checked' : ''} style="accent-color:var(--gold);">
            <label style="font-size:11px; margin:0;">Popular</label>
        </div>
        <button type="button" onclick="document.getElementById('${uid}').remove()" style="margin-top:16px; background:none; border:none; color:#d9534f; cursor:pointer; font-size:16px; padding:4px;">✕</button>
    `;
    container.appendChild(row);
}

function renderVariants() {
    const container = document.getElementById('variants-container');
    container.innerHTML = '';
    
    const weights = Object.keys(currentWeightPrices);
    if (weights.length === 0) {
        addVariantRow();
        return;
    }
    
    weights.forEach(w => {
        const v = currentWeightPrices[w];
        if (typeof v === 'number') {
            addVariantRow(w, v, '', '', false, false);
        } else {
            addVariantRow(w, v.price || '', v.sale_price || '', v.stock !== undefined && v.stock !== null ? v.stock : '', v.is_on_sale || false, v.featured || false);
        }
    });
}

function collectVariants() {
    const container = document.getElementById('variants-container');
    const rows = container.querySelectorAll('.variant-row');
    const newWeightPrices = {};
    
    rows.forEach(row => {
        const w = row.querySelector('.v-weight').value.trim();
        const p = parseFloat(row.querySelector('.v-price').value);
        const sp = parseFloat(row.querySelector('.v-sale-price').value);
        const stockStr = row.querySelector('.v-stock').value.trim();
        const stock = stockStr !== '' ? parseInt(stockStr) : null;
        const isOnSale = row.querySelector('.v-on-sale').checked;
        const featured = row.querySelector('.v-featured').checked;
        
        if (w && !isNaN(p)) {
            newWeightPrices[w] = {
                price: p,
                sale_price: isNaN(sp) ? null : sp,
                stock: isNaN(stock) ? null : stock,
                is_on_sale: isOnSale,
                featured: featured
            };
        }
    });
    return newWeightPrices;
}


// Image upload → base64 with compression
async function handleImageFiles(files) {
    const compressed = [];
    for (const file of files) {
        try {
            const dataUrl = await new Promise(res => {
                const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file);
            });
            const compressedUrl = await compressImage(dataUrl, 1000, 0.6);
            compressed.push(compressedUrl);
        } catch (e) { console.error('Compression failed', e); }
    }
    productImages = [...productImages, ...compressed];
    renderImagePreviews();
}

function compressImage(dataUrl, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to JPEG with specified quality
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
    });
}

function renderImagePreviews() {
    const c = document.getElementById('img-previews');
    c.innerHTML = productImages.map((src, i) => `
    <div class="img-preview" style="position:relative;display:inline-block;margin:4px;">
      <img src="${src}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid rgba(201,169,110,0.2);" />
      <span onclick="removeProductImage(${i})" style="position:absolute;top:-6px;right:-6px;background:#c00;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;">✕</span>
    </div>
  `).join('');
}
function removeProductImage(i) { productImages.splice(i, 1); renderImagePreviews(); }

async function submitProduct() {
    const name = document.getElementById('p-name').value.trim();
    const category = document.getElementById('p-category').value;
    
    // Collect variants from UI
    currentWeightPrices = collectVariants();
    const weights = Object.keys(currentWeightPrices);
    
    // Find min price for the base price field
    let basePrice = 0;
    if (weights.length > 0) {
        basePrice = Math.min(...weights.map(w => currentWeightPrices[w].price));
    }

    const description = document.getElementById('p-description').value.trim();
    const featured = document.getElementById('p-featured').value === 'true';
    if (!name || !category) { showToast('Fill in all required fields.'); return; }
    if (weights.length === 0) { showToast('Please add at least one weight and price.'); return; }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
        const body = {
            name, category, price: basePrice, description, featured, images: productImages,
            is_on_sale: false,
            sale_price: null,
            available_sizes: weights,
            weight_prices: currentWeightPrices,
            available_colors: []
        };
        const editId = document.getElementById('edit-id').value;
        const res = editMode && editId
            ? await apiFetch(`/api/admin/products/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
            : await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });

        if (res && res.ok) {
            // Read body ONCE — only needed for new products to get the new ID
            let actualId = editId;
            if (!editMode) {
                try {
                    const prodData = await res.json();
                    actualId = prodData.id;
                } catch (_) { }
            }

            showToast(editMode ? '✅ Updated!' : '✅ Product added!');

            // Send push notification broadcast if toggle is enabled
            if (isPushOn && actualId) {
                try {
                    const pushRes = await fetch('/api/admin/push/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
                        body: JSON.stringify({
                            title: `✨ New: ${name}`,
                            body: `${category} · ₹${parseFloat(price).toLocaleString('en-IN')} — Tap to view!`,
                            url: `/product.html?id=${actualId}`
                        })
                    });
                    if (pushRes.ok) {
                        const d = await pushRes.json();
                        showToast(`🔔 ${d.message || 'Push alert sent!'}`);
                    } else {
                        const d = await pushRes.json().catch(() => ({}));
                        showToast('⚠️ Push failed: ' + (d.error || 'Unknown'));
                        console.warn('Push send failed:', d);
                    }
                } catch (e) {
                    console.error('Push broadcast error:', e);
                    showToast('⚠️ Push error: ' + e.message);
                }
            }

            closeProductModal();
            loadProducts();
        }
        else { showToast('❌ Failed to save.'); }
    } catch (e) { showToast('❌ Error: ' + e.message); }
    finally { btn.disabled = false; btn.textContent = 'Save Product'; }
}

// ══════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════
async function loadCategories() {
    try {
        const res = await apiFetch('/api/admin/categories');
        if (!res) return;
        allCategories = await res.json();
        renderCategoriesTable(allCategories);
    } catch (e) { showToast('Error loading categories.'); }
}

function renderCategoriesTable(cats) {
    const tbody = document.getElementById('categories-tbody');
    if (!tbody) return;
    if (!cats.length) { tbody.innerHTML = `<tr><td colspan="4" style="padding:50px;text-align:center;color:var(--text-muted)">No categories yet. Add your first!</td></tr>`; return; }
    tbody.innerHTML = cats.map(c => `
    <tr>
      <td><img src="${c.cover_data || ''}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;background:#222;" onerror="this.style.display='none'" /></td>
      <td style="font-weight:500;">${c.parent_id ? '<span style="color:var(--text-muted);font-size:11px;margin-right:6px;">↳</span>' : ''}${c.name}</td>
      <td style="color:var(--text-muted);font-size:13px;">${c.description || '—'}</td>
      <td>
        <div class="td-actions">
          <button class="icon-btn icon-btn-edit" onclick="openEditCatModal(${JSON.stringify(c).replace(/"/g, '&quot;')})" title="Edit">✏️</button>
          <button class="icon-btn icon-btn-del" onclick="openDeleteModal(${c.id},'${c.name.replace(/'/g, "\\'")}','category')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

let catImageData = null;

function openAddCatModal() {
    catImageData = null;
    document.getElementById('cat-modal-title').textContent = 'Add Category';
    document.getElementById('cat-form').reset();
    document.getElementById('edit-cat-id').value = '';
    document.getElementById('cat-img-preview').innerHTML = '';
    populateParentCatSelect(null);
    document.getElementById('cat-modal').classList.add('open');
}

function openEditCatModal(cat) {
    catImageData = null;
    document.getElementById('cat-modal-title').textContent = 'Edit Category';
    document.getElementById('edit-cat-id').value = cat.id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-description').value = cat.description || '';
    document.getElementById('cat-img-preview').innerHTML = cat.cover_data
        ? `<img src="${cat.cover_data}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid rgba(201,169,110,0.2);" />`
        : '';
    populateParentCatSelect(cat.parent_id, cat.id);
    document.getElementById('cat-modal').classList.add('open');
}

function populateParentCatSelect(selectedId, excludeId = null) {
    const sel = document.getElementById('cat-parent');
    if (!sel) return;
    const topLevel = allCategories.filter(c => !c.parent_id && c.id !== excludeId);
    sel.innerHTML = '<option value="">— Top Level —</option>' +
        topLevel.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

function closeCatModal() { document.getElementById('cat-modal').classList.remove('open'); }

function handleCatImage(files) {
    const f = files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        catImageData = { data: e.target.result, name: f.name };
        document.getElementById('cat-img-preview').innerHTML =
            `<img src="${e.target.result}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid rgba(201,169,110,0.2);" />`;
    };
    r.readAsDataURL(f);
}

async function submitCategory() {
    const name = document.getElementById('cat-name').value.trim();
    const desc = document.getElementById('cat-description').value.trim();
    const parent_id = document.getElementById('cat-parent')?.value || null;
    if (!name) { showToast('Category name is required.'); return; }
    const btn = document.getElementById('submit-cat-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
        const body = { name, description: desc, parent_id: parent_id || null };
        if (catImageData) { body.cover_data = catImageData.data; body.cover_name = catImageData.name; }
        const editId = document.getElementById('edit-cat-id').value;
        const res = editId
            ? await apiFetch(`/api/admin/categories/${editId}`, { method: 'PUT', body: JSON.stringify(body) })
            : await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) });
        if (res && res.ok) { showToast(editId ? '✅ Category updated!' : '✅ Category added!'); closeCatModal(); loadCategories(); }
        else { const e = await res.json().catch(() => { }); showToast('❌ ' + (e?.error || 'Failed')); }
    } catch (e) { showToast('❌ ' + e.message); }
    finally { btn.disabled = false; btn.textContent = 'Save Category'; }
}

// ══════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════
async function loadUsers() {
    try {
        const res = await apiFetch('/api/admin/users');
        if (!res) return;
        const users = await res.json();
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.name || '—'}</td>
        <td>${u.email}</td>
        <td><span class="td-badge ${u.role === 'admin' ? 'badge-featured' : 'badge-normal'}">${u.role}</span></td>
        <td style="color:var(--text-muted);font-size:12px;">${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
    } catch (e) { showToast('Error loading users.'); }
}

// ══════════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════════
function openDeleteModal(id, name, type = 'product') {
    deleteTarget = { id, type };
    document.getElementById('delete-name').textContent = name;
    document.getElementById('delete-modal').classList.add('open');
}

async function confirmDelete() {
    if (!deleteTarget) return;
    const btn = document.getElementById('confirm-del-btn');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try {
        const url = deleteTarget.type === 'category'
            ? `/api/admin/categories/${deleteTarget.id}`
            : `/api/admin/products/${deleteTarget.id}`;
        const res = await apiFetch(url, { method: 'DELETE' });
        if (res && res.ok) {
            showToast('🗑️ Deleted.');
            document.getElementById('delete-modal').classList.remove('open');
            if (deleteTarget.type === 'category') loadCategories(); else loadProducts();
        } else { showToast('❌ Failed to delete.'); }
    } catch (e) { showToast('❌ Error.'); }
    finally { btn.disabled = false; btn.textContent = 'Delete'; deleteTarget = null; }
}

// ── TOAST ─────────────────────────────────────
function showToast(msg) {
    let c = document.getElementById('admin-toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'admin-toast-container'; c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;'; document.body.appendChild(c); }
    const t = document.createElement('div');
    t.style.cssText = 'background:rgba(17,17,17,0.95);border:1px solid rgba(201,169,110,0.3);color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,0.4);animation:fadeUp 0.3s ease;';
    t.textContent = msg; c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Modal close on overlay click ──────────────
['product-modal', 'cat-modal', 'delete-modal', 'po-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => { if (e.target === e.currentTarget) e.target.classList.remove('open'); });
});

// ── Drag & drop ──────────────────────────────
const fileDrop = document.getElementById('file-drop');
if (fileDrop) {
    fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
    fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
    fileDrop.addEventListener('drop', e => { e.preventDefault(); fileDrop.classList.remove('drag-over'); handleImageFiles(e.dataTransfer.files); });
}
