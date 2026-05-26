/* ==========================================================================
   shop.js — Load & render sản phẩm từ sanpham.csv
   ========================================================================== */

// ── Ảnh placeholder theo danh mục ────────────────────────────────────────────
const CATEGORY_IMAGES = {
    'Thực phẩm': 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=500&q=80',
    'Đồ dùng':   'https://images.unsplash.com/photo-1563460716889-ac2bc17d86c7?auto=format&fit=crop&w=500&q=80',
    'Vệ sinh':   'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=500&q=80',
    'Phụ kiện':  'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=500&q=80',
};

// ── State ─────────────────────────────────────────────────────────────────────
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
let activeFilters = {
    category: 'all',
    stock: 'all-stock',
    brand: 'all-brand',
    priceMin: null,
    priceMax: null,
    search: ''
};
let currentSort = 'default';
let currentView = 'grid';
let modalQty = 1;
let modalCurrentSku = null;

// ── Parse CSV (tab-separated) ─────────────────────────────────────────────────
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = splitLine(lines[0]);
    return lines.slice(1).map(line => {
        const vals = splitLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
        return obj;
    }).filter(row => Object.values(row).some(v => v));
}

function splitLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === '\t' && !inQ) { result.push(cur); cur = ''; }
        else { cur += ch; }
    }
    result.push(cur);
    return result;
}

// ── Map CSV row → product object ──────────────────────────────────────────────
function mapRow(row) {
    const k = Object.keys(row);
    const descRaw = row[k[9]] || '';
    // Parse TP / CD / HDSD from description
    const tp    = (descRaw.match(/TP[:\s]+([\s\S]*?)(?=CD[:\s]|HDSD[:\s]|$)/i) || [])[1]?.trim() || '';
    const cd    = (descRaw.match(/CD[:\s]+([\s\S]*?)(?=TP[:\s]|HDSD[:\s]|$)/i) || [])[1]?.trim() || '';
    const hdsd  = (descRaw.match(/HDSD[:\s]+([\s\S]*?)(?=TP[:\s]|CD[:\s]|$)/i) || [])[1]?.trim() || '';

    const retailRaw = row[k[5]] || '0';
    const memberRaw = row[k[6]] || '0';
    const retailNum = parseInt(retailRaw.replace(/\D/g, '')) || 0;
    const memberNum = parseInt(memberRaw.replace(/\D/g, '')) || 0;

    return {
        category:   row[k[0]] || '',
        sku:        row[k[1]] || '',
        name:       row[k[2]] || '',
        brand:      row[k[3]] || '',
        catLabel:   row[k[4]] || '',
        retailPrice: retailNum,
        memberPrice: memberNum,
        retailStr:  retailRaw,
        memberStr:  memberRaw,
        stock:      parseInt(row[k[7]]) || 0,
        minStock:   parseInt(row[k[8]]) || 5,
        descRaw,
        ingredients: tp,
        usage:       hdsd,
        benefits:    cd,
        attrs:       row[k[10]] || '',
        status:      row[k[11]] || '',
    };
}

// ── Stock helpers ─────────────────────────────────────────────────────────────
function getStockStatus(p) {
    const s = p.status.toLowerCase();
    if (s.includes('ngừng')) return 'discontinued';
    if (s.includes('hết'))   return 'out';
    if (p.stock === 0)        return 'out';
    if (p.stock <= p.minStock) return 'low';
    return 'in';
}

function getTagLabel(p) {
    const st = getStockStatus(p);
    if (st === 'discontinued') return { label: 'Ngừng KD', cls: 'discontinued' };
    if (st === 'out')          return { label: 'Hết hàng', cls: 'out-of-stock' };
    if (st === 'low')          return { label: '⚡ Sắp hết', cls: 'low-stock' };
    // Assign promo tags by SKU pattern
    if (p.sku.includes('HAT') || p.sku.includes('PATE')) return { label: 'BEST SELLER', cls: 'best-seller' };
    if (p.sku.includes('BALO') || p.sku.includes('AO'))  return { label: 'NEW ARRIVAL', cls: 'new-arrival' };
    return { label: 'BEST SELLER', cls: 'best-seller' };
}

function formatPrice(num) {
    return num.toLocaleString('vi-VN') + 'đ';
}

// ── Filter & Sort ─────────────────────────────────────────────────────────────
function applyFiltersAndSort() {
    let list = allProducts.filter(p => {
        const { category, stock, brand, priceMin, priceMax, search } = activeFilters;

        if (category !== 'all' && p.catLabel !== category) return false;

        if (stock === 'con-hang') {
            const st = getStockStatus(p);
            if (st === 'out' || st === 'discontinued') return false;
        }

        if (brand !== 'all-brand' && p.brand !== brand) return false;

        if (priceMin !== null && p.memberPrice < priceMin) return false;
        if (priceMax !== null && p.memberPrice > priceMax) return false;

        if (search) {
            const q = search.toLowerCase();
            if (!p.name.toLowerCase().includes(q) &&
                !p.brand.toLowerCase().includes(q) &&
                !p.attrs.toLowerCase().includes(q)) return false;
        }

        return true;
    });

    // Sort
    switch (currentSort) {
        case 'price-asc':   list.sort((a, b) => a.memberPrice - b.memberPrice); break;
        case 'price-desc':  list.sort((a, b) => b.memberPrice - a.memberPrice); break;
        case 'name-asc':    list.sort((a, b) => a.name.localeCompare(b.name, 'vi')); break;
        case 'stock-desc':  list.sort((a, b) => b.stock - a.stock); break;
    }

    return list;
}

// ── Render products ───────────────────────────────────────────────────────────
function renderProducts() {
    const grid      = document.getElementById('productGrid');
    const empty     = document.getElementById('emptyState');
    const countEl   = document.getElementById('resultCount');
    const filtered  = applyFiltersAndSort();

    countEl.textContent = filtered.length;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(buildCard).join('');

    grid.querySelectorAll('.prod-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.prod-card-add-btn')) return;
            openModal(card.dataset.sku);
        });
    });

    grid.querySelectorAll('.prod-card-add-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            addToCart(btn.dataset.sku, 1);
        });
    });
}

function buildCard(p) {
    const img = CATEGORY_IMAGES[p.catLabel] || CATEGORY_IMAGES['Phụ kiện'];
    const tag = getTagLabel(p);
    const st  = getStockStatus(p);
    const dotCls = st === 'in' ? 'in-stock' : st === 'low' ? 'low' : 'out';
    const saving = p.retailPrice > p.memberPrice
        ? Math.round((1 - p.memberPrice / p.retailPrice) * 100) : 0;
    const canAdd = st !== 'out' && st !== 'discontinued';

    return `
    <div class="prod-card ${st === 'out' ? 'out-of-stock' : st === 'discontinued' ? 'discontinued' : ''}"
         data-sku="${p.sku}" role="button" tabindex="0" aria-label="Xem chi tiết ${p.name}">
        <div class="prod-card-img-wrapper">
            <img src="${img}" alt="${p.name}" loading="lazy">
            <span class="prod-card-tag ${tag.cls}">${tag.label}</span>
            <span class="prod-card-stock-dot ${dotCls}" title="${p.stock} còn lại"></span>
        </div>
        <div class="prod-card-body">
            <p class="prod-card-category">${p.catLabel}</p>
            <h3 class="prod-card-name">${p.name}</h3>
            <p class="prod-card-brand">${p.brand}</p>
            <p class="prod-card-attrs">${p.attrs}</p>
            <div class="prod-card-footer">
                <div class="prod-card-prices">
                    <span class="prod-price-retail">${formatPrice(p.retailPrice)}</span>
                    <span class="prod-price-member">${formatPrice(p.memberPrice)}</span>
                    ${saving > 0 ? `<span class="prod-price-saving">-${saving}%</span>` : ''}
                </div>
                <button class="prod-card-add-btn" data-sku="${p.sku}"
                    ${canAdd ? '' : 'disabled'} aria-label="Thêm vào giỏ">
                    ${canAdd ? '+' : '✕'}
                </button>
            </div>
        </div>
    </div>`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(sku) {
    const p = allProducts.find(x => x.sku === sku);
    if (!p) return;
    modalCurrentSku = sku;
    modalQty = 1;
    document.getElementById('qtyValue').textContent = 1;

    const img = CATEGORY_IMAGES[p.catLabel] || CATEGORY_IMAGES['Phụ kiện'];
    const tag = getTagLabel(p);
    const st  = getStockStatus(p);
    const saving = p.retailPrice > p.memberPrice
        ? Math.round((1 - p.memberPrice / p.retailPrice) * 100) : 0;

    document.getElementById('modalProductImg').src = img;
    document.getElementById('modalProductImg').alt = p.name;
    document.getElementById('modalProductTag').textContent = tag.label;
    document.getElementById('modalProductTag').className = `prod-modal-tag ${tag.cls}`;
    document.getElementById('modalCategory').textContent = p.catLabel;
    document.getElementById('modalProductName').textContent = p.name;
    document.getElementById('modalBrand').textContent = '🏷 ' + p.brand;
    document.getElementById('modalSku').textContent = 'SKU: ' + p.sku;
    document.getElementById('modalRetailPrice').textContent = formatPrice(p.retailPrice);
    document.getElementById('modalMemberPrice').textContent = formatPrice(p.memberPrice);
    document.getElementById('modalSaving').textContent = saving > 0 ? `Tiết kiệm ${saving}%` : '';
    document.getElementById('modalAttrs').textContent = p.attrs;

    // Stock bar
    const maxStock = Math.max(p.stock, p.minStock * 3, 50);
    const pct = Math.min(100, Math.round((p.stock / maxStock) * 100));
    const barCls = p.stock > p.minStock * 2 ? 'high' : p.stock > p.minStock ? 'medium' : 'low';
    document.getElementById('modalStock').textContent = p.stock + ' sản phẩm';
    const bar = document.getElementById('modalStockBar');
    bar.style.width = pct + '%';
    bar.className = `prod-stock-bar ${barCls}`;
    document.getElementById('modalStockNote').textContent =
        st === 'low' ? '⚠️ Sắp hết hàng — đặt mua sớm!' :
        st === 'out' ? '❌ Hiện đã hết hàng' :
        st === 'discontinued' ? '🚫 Ngừng kinh doanh' :
        '✅ Còn hàng, sẵn sàng giao';

    // Description tabs
    document.getElementById('tab-desc').textContent = p.benefits || p.descRaw || 'Chưa có mô tả.';
    document.getElementById('tab-usage').textContent = p.usage || 'Chưa có hướng dẫn.';
    document.getElementById('tab-ingredients').textContent = p.ingredients || 'Chưa có thông tin.';

    // Reset tabs
    document.querySelectorAll('.prod-desc-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.prod-desc-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.prod-desc-tab[data-tab="desc"]').classList.add('active');
    document.getElementById('tab-desc').classList.add('active');

    const addBtn = document.getElementById('modalAddCartBtn');
    const canAdd = st !== 'out' && st !== 'discontinued';
    addBtn.disabled = !canAdd;
    addBtn.textContent = canAdd ? '🛒 Thêm vào giỏ' : '❌ Không thể mua';

    document.getElementById('productDetailModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('productDetailModal').classList.remove('open');
    document.body.style.overflow = '';
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function addToCart(sku, qty) {
    const p = allProducts.find(x => x.sku === sku);
    if (!p) return;
    const existing = cart.find(c => c.sku === sku);
    if (existing) {
        existing.qty = Math.min(existing.qty + qty, p.stock || 99);
    } else {
        cart.push({ sku, qty, name: p.name, brand: p.brand,
                    price: p.memberPrice, img: CATEGORY_IMAGES[p.catLabel] });
    }
    saveCart();
    updateCartBadge();
    renderCartDrawer();
    showToast(`✅ Đã thêm "${p.name}" vào giỏ hàng`);
}

function removeFromCart(sku) {
    cart = cart.filter(c => c.sku !== sku);
    saveCart();
    updateCartBadge();
    renderCartDrawer();
}

function updateCartQty(sku, delta) {
    const item = cart.find(c => c.sku === sku);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart();
    updateCartBadge();
    renderCartDrawer();
}

function saveCart() {
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const total = cart.reduce((s, c) => s + c.qty, 0);
    const badge = document.getElementById('cartBadge');
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
}

function renderCartDrawer() {
    const list   = document.getElementById('cartItemsList');
    const empty  = document.getElementById('cartEmpty');
    const footer = document.getElementById('cartDrawerFooter');

    if (cart.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        footer.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    footer.style.display = 'flex';

    list.innerHTML = cart.map(item => `
        <div class="cart-item" data-sku="${item.sku}">
            <img class="cart-item-img" src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-brand">${item.brand}</p>
                <div class="cart-item-controls">
                    <button class="cart-item-qty-btn" data-sku="${item.sku}" data-delta="-1">−</button>
                    <span class="cart-item-qty">${item.qty}</span>
                    <button class="cart-item-qty-btn" data-sku="${item.sku}" data-delta="1">+</button>
                </div>
            </div>
            <span class="cart-item-price">${formatPrice(item.price * item.qty)}</span>
            <button class="cart-item-remove" data-sku="${item.sku}" aria-label="Xóa">✕</button>
        </div>`).join('');

    // Bind qty buttons
    list.querySelectorAll('.cart-item-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => updateCartQty(btn.dataset.sku, parseInt(btn.dataset.delta)));
    });
    list.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.sku));
    });

    // Summary
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const freeShip = subtotal >= 300000;
    document.getElementById('cartSubtotal').textContent = formatPrice(subtotal);
    document.getElementById('cartShipping').textContent = freeShip ? 'Miễn phí 🎉' : formatPrice(30000);
    document.getElementById('cartTotal').textContent = formatPrice(subtotal + (freeShip ? 0 : 30000));
}

function openCartDrawer() {
    document.getElementById('cartDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    document.getElementById('cartDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── Filter counts ─────────────────────────────────────────────────────────────
function updateCounts() {
    document.getElementById('count-all').textContent = allProducts.length;
    ['Thực phẩm','Đồ dùng','Vệ sinh','Phụ kiện'].forEach((cat, i) => {
        const ids = ['count-food','count-supplies','count-hygiene','count-accessories'];
        const el = document.getElementById(ids[i]);
        if (el) el.textContent = allProducts.filter(p => p.catLabel === cat).length;
    });
}

function buildBrandFilter() {
    const brands = [...new Set(allProducts.map(p => p.brand))].sort();
    const container = document.getElementById('brandFilter');
    container.innerHTML = `
        <label class="filter-option active" data-value="all-brand">
            <input type="radio" name="brand" value="all-brand" checked>
            <span class="filter-option-label">Tất cả</span>
        </label>` +
        brands.map(b => `
        <label class="filter-option" data-value="${b}">
            <input type="radio" name="brand" value="${b}">
            <span class="filter-option-label">${b}</span>
        </label>`).join('');

    container.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            activeFilters.brand = opt.dataset.value;
            renderProducts();
        });
    });
}

function showLowStockAlert() {
    const lowItems = allProducts.filter(p => getStockStatus(p) === 'low');
    const alert = document.getElementById('lowStockAlert');
    if (lowItems.length > 0) {
        document.getElementById('lowStockMsg').textContent =
            `${lowItems.length} sản phẩm sắp hết hàng: ${lowItems.map(p => p.name).join(', ')}`;
        alert.style.display = 'flex';
    }
}

// ── Bind all events ───────────────────────────────────────────────────────────
function bindEvents() {
    // Category filter
    document.getElementById('categoryFilter').querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.getElementById('categoryFilter').querySelectorAll('.filter-option')
                .forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            activeFilters.category = opt.dataset.value;
            renderProducts();
        });
    });

    // Stock filter
    document.getElementById('stockFilter').querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.getElementById('stockFilter').querySelectorAll('.filter-option')
                .forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            activeFilters.stock = opt.dataset.value;
            renderProducts();
        });
    });

    // Price filter
    document.getElementById('applyPriceBtn').addEventListener('click', () => {
        const min = parseInt(document.getElementById('priceMin').value) || null;
        const max = parseInt(document.getElementById('priceMax').value) || null;
        activeFilters.priceMin = min;
        activeFilters.priceMax = max;
        renderProducts();
    });

    // Search
    document.getElementById('productSearch').addEventListener('input', e => {
        activeFilters.search = e.target.value.trim();
        renderProducts();
    });

    document.getElementById('headerSearch').addEventListener('input', e => {
        activeFilters.search = e.target.value.trim();
        document.getElementById('productSearch').value = activeFilters.search;
        renderProducts();
    });

    // Sort
    document.getElementById('sortSelect').addEventListener('change', e => {
        currentSort = e.target.value;
        renderProducts();
    });

    // View toggle
    document.getElementById('gridViewBtn').addEventListener('click', () => {
        currentView = 'grid';
        document.getElementById('productGrid').classList.remove('list-view');
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
        currentView = 'list';
        document.getElementById('productGrid').classList.add('list-view');
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
    });

    // Reset filter
    document.getElementById('resetFilterBtn').addEventListener('click', () => {
        activeFilters = { category: 'all', stock: 'all-stock', brand: 'all-brand',
                          priceMin: null, priceMax: null, search: '' };
        document.getElementById('productSearch').value = '';
        document.getElementById('headerSearch').value = '';
        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';
        document.querySelectorAll('.filter-option').forEach(opt => {
            const input = opt.querySelector('input');
            if (!input) return;
            const defaults = { category:'all', stock:'all-stock', brand:'all-brand' };
            opt.classList.toggle('active', input.value === (defaults[input.name] || ''));
        });
        renderProducts();
    });

    // Modal
    document.getElementById('prodModalClose').addEventListener('click', closeModal);
    document.getElementById('prodModalOverlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCartDrawer(); } });

    // Modal qty
    document.getElementById('qtyMinus').addEventListener('click', () => {
        if (modalQty > 1) { modalQty--; document.getElementById('qtyValue').textContent = modalQty; }
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
        modalQty++;
        document.getElementById('qtyValue').textContent = modalQty;
    });

    // Modal add to cart
    document.getElementById('modalAddCartBtn').addEventListener('click', () => {
        if (modalCurrentSku) {
            addToCart(modalCurrentSku, modalQty);
            closeModal();
            openCartDrawer();
        }
    });

    // Description tabs
    document.querySelectorAll('.prod-desc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.prod-desc-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.prod-desc-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    // Cart drawer
    document.getElementById('cartToggleBtn').addEventListener('click', openCartDrawer);
    document.getElementById('cartDrawerClose').addEventListener('click', closeCartDrawer);
    document.getElementById('cartDrawerOverlay').addEventListener('click', closeCartDrawer);
    document.getElementById('cartContinueBtn').addEventListener('click', closeCartDrawer);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    try {
        const res = await fetch('../Docs/sanpham.csv');
        if (!res.ok) throw new Error('Không tải được sanpham.csv');
        const text = await res.text();
        allProducts = parseCSV(text).map(mapRow).filter(p => p.sku);

        updateCounts();
        buildBrandFilter();
        showLowStockAlert();
        bindEvents();
        updateCartBadge();
        renderCartDrawer();
        renderProducts();
    } catch (err) {
        console.error('shop.js:', err);
        document.getElementById('productGrid').innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--color-text-light);">
                <p>⚠️ Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
