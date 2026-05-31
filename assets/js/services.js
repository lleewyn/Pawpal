/* ==========================================================================
   services.js — Load & render dịch vụ từ dichvu.csv
   ========================================================================== */

// ── Ảnh mặc định theo loại dịch vụ ──────────────────────────────────────────
const SERVICE_IMAGES = {
    'SPA01': '../assets/images/services/spa.png',
    'SPA02': '../assets/images/services/spa.png',
    'SPA03': '../assets/images/services/spa.png',
    'SPA04': '../assets/images/services/spa.png',
    'SPA05': '../assets/images/services/spa.png',
    'SPA06': '../assets/images/services/spa.png',
    'SPA07': '../assets/images/services/spa.png',
    'SPA08': '../assets/images/services/spa.png',
    'SPA09': '../assets/images/services/spa.png',
    'HTL01': '../assets/images/services/hotel.png',
    'HTL02': '../assets/images/services/hotel.png',
    'HTL03': '../assets/images/services/hotel.png',
    'HTL05': '../assets/images/services/hotel.png',
    'HTL06': '../assets/images/services/hotel.png',
};

// ── State ────────────────────────────────────────────────────────────────────
let allServices = [];
let activeFilters = {
    category: 'all',
    pet: 'all-pet',
    weight: 'all-weight',
    status: 'all-status',
    search: ''
};
let currentView = 'grid';

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = splitCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
        return obj;
    }).filter(row => Object.values(row).some(v => v));
}

function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === '\t' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// ── Map CSV row → service object ─────────────────────────────────────────────
function mapRow(row) {
    const keys = Object.keys(row);
    return {
        category:    row[keys[0]] || '',
        id:          row[keys[1]] || '',
        name:        row[keys[2]] || '',
        petType:     row[keys[3]] || '',
        weight:      row[keys[4]] || '',
        price:       row[keys[5]] || '',
        memberPrice: row[keys[6]] || '',
        duration:    row[keys[7]] || '',
        description: row[keys[8]] || '',
        checklist:   row[keys[9]] || '',
        status:      row[keys[10]] || '',
    };
}

// ── Filter logic ─────────────────────────────────────────────────────────────
function matchesFilters(svc) {
    const { category, pet, weight, status, search } = activeFilters;

    if (category === 'spa' && !svc.id.startsWith('SPA')) return false;
    if (category === 'hotel' && !svc.id.startsWith('HTL')) return false;

    if (pet === 'cho' && !svc.petType.toLowerCase().includes('chó')) return false;
    if (pet === 'meo' && !svc.petType.toLowerCase().includes('mèo')) return false;

    if (weight !== 'all-weight') {
        const w = svc.weight.toLowerCase();
        const wMap = {
            'sieu-nho': ['siêu nhỏ', '<5kg', 'tất cả'],
            'nho':      ['nhỏ', '5–10kg', '5-10kg', 'tất cả'],
            'vua':      ['vừa', '10–20kg', '10-20kg', 'tất cả'],
            'lon':      ['lớn', '>20kg', 'tất cả'],
        };
        const allowed = wMap[weight] || [];
        if (!allowed.some(k => w.includes(k))) return false;
    }

    if (status === 'dang-phuc-vu' && !svc.status.toLowerCase().includes('đang phục vụ')) return false;

    if (search) {
        const q = search.toLowerCase();
        if (!svc.name.toLowerCase().includes(q) && !svc.description.toLowerCase().includes(q)) return false;
    }

    return true;
}

// ── Render cards ─────────────────────────────────────────────────────────────
function renderServices() {
    const grid = document.getElementById('servicesGrid');
    const emptyState = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');

    const filtered = allServices.filter(matchesFilters);
    resultCount.textContent = filtered.length;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    grid.innerHTML = filtered.map(svc => buildCard(svc)).join('');

    // Attach click events
    grid.querySelectorAll('.svc-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.id));
    });
    grid.querySelectorAll('.svc-card-detail-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openModal(btn.dataset.id);
        });
    });
}

function buildCard(svc) {
    const img = SERVICE_IMAGES[svc.id] || '../assets/images/services/spa.png';
    const isActive = svc.status.toLowerCase().includes('đang phục vụ');
    const statusLabel = isActive ? 'Đang phục vụ' : 'Tạm ngưng';
    const statusClass = isActive ? 'active' : 'paused';
    const catLabel = svc.id.startsWith('SPA') ? 'Spa & Grooming' : 'Pet Hotel';

    const petTag = svc.petType.includes('/') ? 'Chó & Mèo' : svc.petType.split(' ')[0];
    const weightShort = svc.weight.length > 20 ? 'Tất cả' : svc.weight;

    return `
    <div class="svc-card ${isActive ? '' : 'paused'}" data-id="${svc.id}" role="button" tabindex="0" aria-label="Xem chi tiết ${svc.name}">
        <div class="svc-card-img-wrapper">
            <img src="${img}" alt="${svc.name}" loading="lazy">
            <span class="svc-card-category-badge">${catLabel}</span>
            <span class="svc-card-status-badge ${statusClass}">${isActive ? '🟢' : '🔴'} ${statusLabel}</span>
        </div>
        <div class="svc-card-body">
            <p class="svc-card-id">${svc.id}</p>
            <h3 class="svc-card-name">${svc.name}</h3>
            <p class="svc-card-desc">${svc.description}</p>
            <div class="svc-card-tags">
                <span class="svc-tag">🐾 ${petTag}</span>
                <span class="svc-tag">⚖️ ${weightShort}</span>
                <span class="svc-tag">⏱ ${svc.duration}</span>
            </div>
            <div class="svc-card-footer">
                <div class="svc-card-price">
                    <span class="svc-price-main-val">${svc.price}</span>
                    <span class="svc-price-duration">${svc.duration}</span>
                </div>
                <button class="svc-card-detail-btn" data-id="${svc.id}">Chi tiết →</button>
            </div>
        </div>
    </div>`;
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
    const svc = allServices.find(s => s.id === id);
    if (!svc) return;

    const img = SERVICE_IMAGES[svc.id] || '../assets/images/services/spa.png';
    const isActive = svc.status.toLowerCase().includes('đang phục vụ');
    const catLabel = svc.id.startsWith('SPA') ? 'Spa & Grooming' : 'Pet Hotel';

    document.getElementById('modalServiceImg').src = img;
    document.getElementById('modalServiceImg').alt = svc.name;
    document.getElementById('modalServiceId').textContent = svc.id;
    document.getElementById('modalCategory').textContent = catLabel;
    document.getElementById('modalServiceName').textContent = svc.name;
    document.getElementById('modalDesc').textContent = svc.description;
    document.getElementById('modalDuration').textContent = svc.duration;
    document.getElementById('modalPetType').textContent = svc.petType;
    document.getElementById('modalWeight').textContent = svc.weight;
    document.getElementById('modalStatus').textContent = isActive ? '🟢 Đang phục vụ' : '🔴 Tạm ngưng';
    document.getElementById('modalPrice').textContent = svc.price;

    // Member price tiers
    const tiers = svc.memberPrice.split('\n').filter(Boolean);
    document.getElementById('modalMemberPrice').innerHTML = tiers
        .map(t => `<span class="svc-member-tier">${t.trim()}</span>`)
        .join('');

    // Checklist
    const steps = svc.checklist.split('→').map(s => s.trim()).filter(Boolean);
    document.getElementById('modalChecklist').innerHTML = steps
        .map(step => `<li>${step}</li>`)
        .join('');

    // Book button with service pre-selected
    document.getElementById('modalBookBtn').href = `booking.html?service=${encodeURIComponent(svc.id)}`;

    document.getElementById('serviceDetailModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('serviceDetailModal').classList.remove('open');
    document.body.style.overflow = '';
}

// ── Update filter counts ──────────────────────────────────────────────────────
function updateCounts() {
    const total = allServices.length;
    const spaCount = allServices.filter(s => s.id.startsWith('SPA')).length;
    const hotelCount = allServices.filter(s => s.id.startsWith('HTL')).length;

    document.getElementById('count-all').textContent = total;
    document.getElementById('count-spa').textContent = spaCount;
    document.getElementById('count-hotel').textContent = hotelCount;
}

// ── Filter event binding ──────────────────────────────────────────────────────
function bindFilters() {
    // Radio filter groups
    ['categoryFilter', 'petFilter', 'weightFilter', 'statusFilter'].forEach(groupId => {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.filter-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const input = opt.querySelector('input[type="radio"]');
                if (!input) return;
                const name = input.name;
                const value = input.value;

                group.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                input.checked = true;

                if (name === 'category') activeFilters.category = value;
                if (name === 'pet') activeFilters.pet = value;
                if (name === 'weight') activeFilters.weight = value;
                if (name === 'status') activeFilters.status = value;

                renderServices();
            });
        });
    });

    // Search
    const searchInput = document.getElementById('serviceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            activeFilters.search = e.target.value.trim();
            renderServices();
        });
    }

    // Header search sync
    const headerSearch = document.getElementById('headerSearch');
    if (headerSearch) {
        headerSearch.addEventListener('input', e => {
            activeFilters.search = e.target.value.trim();
            if (searchInput) searchInput.value = activeFilters.search;
            renderServices();
        });
    }

    // Reset
    document.getElementById('resetFilterBtn').addEventListener('click', () => {
        activeFilters = { category: 'all', pet: 'all-pet', weight: 'all-weight', status: 'all-status', search: '' };
        if (searchInput) searchInput.value = '';
        if (headerSearch) headerSearch.value = '';

        document.querySelectorAll('.filter-option').forEach(opt => {
            const input = opt.querySelector('input');
            if (!input) return;
            const defaults = { category: 'all', pet: 'all-pet', weight: 'all-weight', status: 'all-status' };
            opt.classList.toggle('active', input.value === defaults[input.name]);
        });

        renderServices();
    });

    // View toggle
    document.getElementById('gridViewBtn').addEventListener('click', () => {
        currentView = 'grid';
        document.getElementById('servicesGrid').classList.remove('list-view');
        document.getElementById('gridViewBtn').classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
        currentView = 'list';
        document.getElementById('servicesGrid').classList.add('list-view');
        document.getElementById('listViewBtn').classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
    });

    // Modal close
    document.getElementById('svcModalClose').addEventListener('click', closeModal);
    document.getElementById('svcModalOverlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    try {
        const res = await fetch('../Docs/dichvu.csv');
        if (!res.ok) throw new Error('Không tải được dichvu.csv');
        const text = await res.text();
        const rows = parseCSV(text);
        allServices = rows.map(mapRow).filter(s => s.id);

        updateCounts();
        bindFilters();
        renderServices();
    } catch (err) {
        console.error('services.js:', err);
        document.getElementById('servicesGrid').innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--color-text-light);">
                <p>⚠️ Không thể tải dữ liệu dịch vụ. Vui lòng thử lại sau.</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
