// customers.js - Phân hệ Quản lý Khách hàng Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    window.PawpalCustomersModule = PawpalCustomers;

    PawpalCustomers.state = PawpalCustomers.state || {
        customerDatabase: {},
        pawpointHistory: []
    };
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};
    PawpalCustomers.state.listLoadStatus = 'idle';
    PawpalCustomers.state.hasLoadedCustomers = false;
    PawpalCustomers.state.pawpointLoadStatus = 'idle';

    // 1. FORMATTERS CHUẨN HÓA TOÀN HỆ THỐNG
    PawpalCustomers.formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalCustomers.formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(dateObj);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    PawpalCustomers.formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalCustomers.toUnaccent = function(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    };

    PawpalCustomers.matchSearch = function(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return PawpalCustomers.toUnaccent(sourceText).includes(PawpalCustomers.toUnaccent(searchTerm));
    };

    // 2. TOAST NOTIFICATION & CONFIRM MODAL CHUẨN AGENTS.MD
    PawpalCustomers.showToast = function(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: 9px;
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 9999;
            display: block;
        `;
        toast.textContent = msg;
        if (window._custToastTimer) clearTimeout(window._custToastTimer);
        window._custToastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 3200);
    };

    let activeCustConfirmCallback = null;
    PawpalCustomers.showCustomerConfirmModal = function({ title, message, acceptText = 'Xác nhận', onAccept }) {
        const modal = document.getElementById('modalConfirmCustomerAction');
        const titleEl = document.getElementById('custConfirmTitle');
        const msgEl = document.getElementById('custConfirmMessage');
        const acceptBtn = document.getElementById('btnAcceptCustConfirm');
        if (!modal) {
            console.error('[Customers] Thiếu phần tử modal xác nhận (#modalConfirmCustomerAction). Thao tác đã bị hủy để đảm bảo an toàn.');
            if (typeof PawpalCustomers.showToast === 'function') {
                PawpalCustomers.showToast('Không thể hiển thị hộp thoại xác nhận. Thao tác đã bị hủy để đảm bảo an toàn.', 'danger');
            }
            return;
        }

        if (titleEl && title) titleEl.textContent = title;
        if (msgEl && message) msgEl.textContent = message;
        if (acceptBtn) acceptBtn.textContent = acceptText;

        activeCustConfirmCallback = onAccept;
        modal.style.display = 'flex';
    };

    document.getElementById('btnAcceptCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        if (typeof activeCustConfirmCallback === 'function') {
            activeCustConfirmCallback();
            activeCustConfirmCallback = null;
        }
    });

    document.getElementById('btnCancelCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        activeCustConfirmCallback = null;
    });

    document.getElementById('btnCloseCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        activeCustConfirmCallback = null;
    });

    PawpalCustomers.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    PawpalCustomers.setFieldError = function(id, message) {
        const input = document.getElementById(id);
        let error = document.getElementById(id + 'Error');
        if (!error) {
            error = document.createElement('div'); error.id = id + 'Error';
            error.style.cssText = 'color:#DC2626;font-size:12px;margin-top:4px';
            input.parentElement.appendChild(error);
            input.addEventListener('input', () => PawpalCustomers.setFieldError(id, ''));
        }
        error.textContent = message;
        input.setAttribute('aria-invalid', String(Boolean(message)));
        input.setAttribute('aria-describedby', error.id);
    };

    PawpalCustomers.bindPetTaxonomy = function(prefix) {
        let species = [], breeds = [];
        const speciesInput = document.getElementById(prefix + 'Species');
        const breedInput = document.getElementById(prefix + 'Breed');
        const clear = input => {
            input.value = ''; delete input.dataset.id; input.style.display = '';
            input.parentElement.querySelector('.taxonomy-selected')?.remove();
            document.getElementById(input.id + 'Dropdown').style.display = 'none';
        };
        const choose = (input, row, label) => {
            clear(input); input.value = label; input.dataset.id = row.id; input.style.display = 'none';
            const card = document.createElement('div'); card.className = 'adjust-customer-selected-card taxonomy-selected';
            const text = document.createElement('span'); text.textContent = label;
            const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-text-add-address'; button.textContent = '✕ Bỏ chọn';
            button.addEventListener('click', () => { clear(input); if (input === speciesInput) clear(breedInput); input.focus(); });
            card.append(text, button); input.parentElement.appendChild(card);
            PawpalCustomers.setFieldError(input.id, '');
        };
        async function load() {
            const db = window.getSupabaseClient();
            const results = await Promise.all([
                db.from('pet_species').select('id,species_name').eq('is_active', true).order('species_name'),
                db.from('pet_breed').select('id,species_id,breed_name').eq('is_active', true).order('breed_name')
            ]);
            for (const r of results) if (r.error) throw r.error;
            const clean = name => name && !/^\d+$|^(chưa rõ|chưa cập nhật|unknown|null|undefined)$/i.test(name.trim());
            species = results[0].data.filter(s => clean(s.species_name)); breeds = results[1].data.filter(b => clean(b.breed_name));
        }
        for (const input of [speciesInput, breedInput]) {
            const dropdown = document.getElementById(input.id + 'Dropdown');
            const rows = () => input === speciesInput ? species : breeds.filter(b => b.species_id === speciesInput.dataset.id);
            const label = row => row.species_name || row.breed_name;
            const render = () => {
                dropdown.innerHTML = rows().filter(r => PawpalCustomers.matchSearch(label(r), input.value)).map(r => `<div class="autocomplete-item" data-id="${r.id}"><div class="autocomplete-item-name">${PawpalCustomers.escapeHtml(label(r))}</div></div>`).join('') || '<div class="autocomplete-empty">Không có lựa chọn phù hợp trong danh mục.</div>';
                dropdown.style.display = 'block';
            };
            input.addEventListener('focus', async () => { try { await load(); render(); } catch { dropdown.innerHTML = '<div class="autocomplete-empty">Không tải được danh mục. Vui lòng thử lại.</div>'; dropdown.style.display = 'block'; } });
            input.addEventListener('input', () => { delete input.dataset.id; if (input === speciesInput) clear(breedInput); render(); });
            dropdown.addEventListener('click', event => {
                const row = rows().find(r => r.id === event.target.closest('[data-id]')?.dataset.id);
                if (row) { if (input === speciesInput) clear(breedInput); choose(input, row, label(row)); }
            });
            document.addEventListener('click', event => { if (!input.parentElement.contains(event.target)) dropdown.style.display = 'none'; });
        }
        return {
            reset() { clear(speciesInput); clear(breedInput); },
            async set(pet, isCurrent = () => true) {
                await load();
                if (!isCurrent()) return;
                choose(speciesInput, { id: pet.speciesId }, pet.species);
                choose(breedInput, { id: pet.breedId }, pet.breed);
            },
            speciesId: () => speciesInput.dataset.id,
            breedId: () => breedInput.dataset.id
        };
    };

    // 3. HEADER BREADCRUMB & SUBTAB NAVIGATION
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
    const subtabPanels = document.querySelectorAll('.subtab-content');

    PawpalCustomers.updateBreadcrumb = function(custName) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Khách hàng') return;
        if (!deepBreadcrumbEl) return;
        if (!document.getElementById('subtab-tab-profile')?.classList.contains('active')) custName = null;
        if (custName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalCustomers.escapeHtml(custName)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    };

    PawpalCustomers.switchSubtab = function(targetSubtab, updateHistory = true) {
        const root = document.getElementById('subtab-tab-list')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Khách hàng') return;
        if (!root.querySelector(`#subtab-${targetSubtab}`)) return;
        const btns = document.querySelectorAll('.header-subtab-btn');
        const panels = root.querySelectorAll('.subtab-content');

        btns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
        });

        if (targetSubtab === 'tab-profile') {
            const currentName = sessionStorage.getItem('pawpal_admin_customer_name') || 
                                document.getElementById('drawerCustomerName')?.textContent?.trim() || 
                                'Khách hàng';
            PawpalCustomers.updateBreadcrumb(currentName);
        } else {
            PawpalCustomers.updateBreadcrumb(null);
        }

        sessionStorage.setItem('pawpal_admin_customer_subtab', targetSubtab);
        if (targetSubtab === 'tab-profile') {
            PawpalCustomers.subtabs.profile?.switchDrawerTab(sessionStorage.getItem('pawpal_admin_customer_drawertab') || 'dtab-personal');
        }
        if (targetSubtab === 'tab-pawpoint') PawpalCustomers.subtabs.pawpoint?.renderPawpointHistory();
        if (directoryDirty || ledgerDirty || profileDirty || historyDirty) scheduleCustomerSync();
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }

        if (window.lucide) lucide.createIcons();
    };

    // 4. DATA LOADER 100% TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
    // Cache TTL 90 giây — không fetch lại khi chuyển qua lại giữa các phân hệ
    let _custLastFetchedAt = 0;
    const CUST_CACHE_TTL_MS = 90_000;

    let customerLoadPromise = null;
    PawpalCustomers.loadCustomersModuleData = function(options = {}) {
        if (customerLoadPromise) return customerLoadPromise;
        const normalizedOptions = typeof options === 'boolean' ? { force: options } : (options || {});
        customerLoadPromise = loadCustomersModuleData(normalizedOptions).finally(() => {
            customerLoadPromise = null;
        });
        return customerLoadPromise;
    };

    function hydrateCustomerPage(data){
            const profMap = {};
            (data.profData || []).forEach(p => { profMap[p.customer_id] = p; });

            const memMap = {};
            (data.memData || []).forEach(m => { memMap[m.customer_id] = m; });
            const phoneMap = new Map((data.phonesData || []).map(p => [p.customer_id, p.phone_number]));
            const balanceMap = new Map((data.balancesData || []).map(p => [p.customer_id, Number(p.total_paw_points)]));
            const weightMap = new Map((data.weightsData || []).map(p => [p.pet_id, p.weight]));

            const addrMap = {};
            (data.addrData || []).forEach(a => {
                if (!addrMap[a.customer_id]) addrMap[a.customer_id] = [];
                const street = a.street_address || '';
                const prov = a.province || '';
                const fullAddr = [street, prov].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ';
                addrMap[a.customer_id].push({
                    rawId: a.id,
                    streetAddress: a.street_address || '',
                    province: a.province || '',
                    postalCode: a.postal_code || '',
                    address: fullAddr,
                    receiverName: a.receiver_name || '',
                    receiverPhone: a.receiver_phone || '',
                    isDefault: !!a.is_default
                });
            });

            const petsMap = {};
            (data.petsData || []).forEach((p, idx) => {
                if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                const specName = p.breed?.species?.species_name || 'Chưa cập nhật';
                const petCode = p.pet_code || (p.id ? `PET-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `PET-${String(idx + 1).padStart(3, '0')}`);
                petsMap[p.customer_id].push({
                    id: petCode,
                    dbId: p.id,
                    updatedAt: p.updated_at,
                    status: p.status,
                    breedId: p.breed?.id,
                    speciesId: p.breed?.species_id,
                    safetyNote: p.safety_note || '',
                    allergy: p.allergy || '',
                    routine: p.routine || '',
                    name: p.pet_name || 'Bé cưng',
                    species: specName,
                    breed: p.breed?.breed_name || 'Chưa cập nhật',
                    weight: weightMap.has(p.id) ? String(weightMap.get(p.id)) : 'Chưa ghi nhận',
                    alertNote: [p.safety_note, p.allergy && p.allergy !== 'Không' ? `Dị ứng: ${p.allergy}` : ''].filter(Boolean).join('; ')
                });
            });

            // PERF-03.C02: Khởi tạo rỗng, các đơn/lịch/ticket tải on-demand theo từng customer_id khi mở hồ sơ 360°
            const ordersMap = {};
            const apptsMap = {};
            const complaintsMap = {};
            for (const ticket of data.ticketsData || []) {
                if (!ticket.customer_id) continue;
                const status = window.PawpalEnum?.ticketStatus(ticket.status);
                (complaintsMap[ticket.customer_id] ||= []).push({
                    id: ticket.ticket_code, rawId: ticket.id, issue: ticket.subject,
                    status: status?.label || ticket.status, statusClass: status?.badgeClass || 'badge-neutral',
                    isClosed: ['resolved', 'closed', 'rejected', 'da_giai_quyet', 'da_dong', 'tu_choi'].includes(ticket.status)
                });
            }

            const freshDb = {};

            // Hợp nhất danh sách khách hàng từ bảng customer và customer_profile để nạp đầy đủ 100% CSDL
            const customerIdSet = new Set();
            const unifiedCustomers = [];

            if (Array.isArray(data.custData)) {
                data.custData.forEach(c => {
                    if (c && c.id) {
                        customerIdSet.add(c.id);
                        unifiedCustomers.push(c);
                    }
                });
            }

            if (Array.isArray(data.profData)) {
                data.profData.forEach(p => {
                    if (p && p.customer_id && !customerIdSet.has(p.customer_id)) {
                        customerIdSet.add(p.customer_id);
                        unifiedCustomers.push({
                            id: p.customer_id,
                            full_name: p.full_name,
                            is_profile_only: true
                        });
                    }
                });
            }

            if (unifiedCustomers.length > 0) {
                unifiedCustomers.forEach((c, idx) => {
                    const rawClean = (c.id || '').replace(/-/g, '').toUpperCase();
                    const shortCode = rawClean.length >= 12 
                        ? ((rawClean.startsWith('D0000000') || rawClean.startsWith('F0000000')) ? rawClean.slice(-8) : rawClean.slice(0, 8))
                        : rawClean;
                    let custKey = c.customer_code || (shortCode ? `CUST-${shortCode}` : `CUST-${String(idx + 1).padStart(3, '0')}`);
                    if (freshDb[custKey]) {
                        custKey = `CUST-${rawClean.slice(-8)}`;
                    }
                    if (freshDb[custKey]) {
                        custKey = `${custKey}-${idx + 1}`;
                    }
                    const prof = profMap[c.id] || {};
                    const mem = memMap[c.id] || {};
                    const points = balanceMap.get(c.id) || 0;

                    const hasMembership = !!memMap[c.id];
                    const isWalkInName = /vãng lai|vang lai/i.test(prof.full_name || c.full_name || '');
                    const isTemp = !hasMembership;

                    let tier = 'NONE';
                    const tierName = mem.membership_tier?.tier_name || 'Chưa có hạng';
                    const tierCodes = { 'Đồng': 'BRONZE', 'Bạc': 'SILVER', 'Vàng': 'GOLD', 'Kim Cương': 'DIAMOND', 'Kim cương': 'DIAMOND' };
                    tier = tierCodes[tierName] || 'NONE';
                    const tierBadge = tier === 'NONE' || tier === 'BRONZE' ? 'badge-neutral' : `badge-tier-${tier.toLowerCase()}`;

                    const addrs = addrMap[c.id] || [];

                    const cPets = petsMap[c.id] || [];
                    const cOrders = ordersMap[c.id] || [];
                    const cAppts = apptsMap[c.id] || [];
                    const cComplaints = complaintsMap[c.id] || [];

                    let emergency = null;
                    const pendingComp = cComplaints.find(comp => !comp.isClosed);
                    if (pendingComp) {
                        emergency = `Phiếu ${pendingComp.id} · ${pendingComp.status}: ${pendingComp.issue}`;
                    }

                    const rawAccountStatus = String(c.customer_status || '').toLowerCase();
                    // GĐ-03 & F-023: Tách biệt rõ ràng 3 trạng thái tài khoản theo PawpalEnum
                    const accMeta = (window.PawpalEnum?.accountStatus)
                        ? window.PawpalEnum.accountStatus(c.customer_status)
                        : { raw: rawAccountStatus, label: 'Đang hoạt động', isLocked: false };
                    const isSuspended = accMeta.raw === 'tam_khoa' || rawAccountStatus === 'suspended';
                    const isLocked = accMeta.isLocked;

                    // Xác định số điện thoại ưu tiên: c.phone_main -> số người nhận trong sổ địa chỉ -> '—'
                    const phoneVal = phoneMap.get(c.id) || '—';

                    // GĐ-03 & F-006: Chuẩn hóa mapping giới tính qua PawpalEnum, không gán NULL thành Khác
                    const genderVal = (window.PawpalEnum?.gender)
                        ? window.PawpalEnum.gender(prof.gender)
                        : (prof.gender || 'Chưa cập nhật');

                    freshDb[custKey] = {
                        id: custKey,
                        dbId: c.id,
                        updatedAt: c.updated_at,
                        fullNameRaw: prof.full_name || '',
                        genderRaw: prof.gender || '',
                        membershipTierId: mem.membership_tier_id || '',
                        accountStatusRaw: c.customer_status,
                        name: prof.full_name || c.full_name || ('Khách hàng ' + (phoneVal !== '—' ? phoneVal : custKey)),
                        phone: phoneVal,
                        email: c.contact_email || 'Chưa cập nhật',
                        gender: genderVal,
                        dob: prof.date_of_birth ? PawpalCustomers.formatDate(prof.date_of_birth) : 'Chưa cập nhật',
                        dobRaw: prof.date_of_birth || '',
                        tier,
                        tierName,
                        tierBadgeClass: tierBadge,
                        points: points,
                        isMember: hasMembership,
                        status: isSuspended ? 'SUSPENDED' : (isLocked ? 'LOCKED' : (isTemp ? 'TEMP' : 'ACTIVE')),
                        authStatus: isSuspended ? 'Tạm khóa' : (isLocked ? 'Đã khóa' : (isTemp ? 'Khách vãng lai' : 'Đang hoạt động')),
                        accountStatusLabel: accMeta.label,
                        note: c.note || '',
                        emergencyAlert: emergency,
                        addresses: addrs,
                        pets: cPets,
                        orders: cOrders,
                        bookings: cAppts,
                        complaints: cComplaints
                    };
                });
            }

        for (const [key, fresh] of Object.entries(freshDb)) {
            const existing = PawpalCustomers.state.customerDatabase?.[key];
            if (!existing) continue;
            const histories = {};
            for (const kind of ['orders', 'bookings', 'complaints']) {
                if (existing._historyStatus?.[kind] === 'loaded') histories[kind] = existing[kind];
            }
            freshDb[key] = Object.assign(existing, fresh, histories);
        }
        return freshDb;
    }

    async function readAllRows(builder) {
        const data=[];
        for(let offset=0;;offset+=1000){
            const result=await builder().range(offset,offset+999);
            if(result.error)return result;
            data.push(...(result.data || []));
            if(!result.data || result.data.length<1000)return {data,error:null};
        }
    }

    const directoryCache=new Map(),directoryRequests=new Map();
    let directoryGeneration = 0;
    PawpalCustomers.serverCustomerPaging=true;
    PawpalCustomers.readCustomerPage=async function(request={},options={}){
        if(options.force){directoryGeneration+=1;directoryCache.clear();}
        const key=JSON.stringify(request),cached=directoryCache.get(key);
        if(!options.force&&cached&&Date.now()-cached.at<60000)return cached.data;
        const generation = directoryGeneration;
        const requestKey = generation + ':' + key;
        if(directoryRequests.has(requestKey))return directoryRequests.get(requestKey);
        const task=(async()=>{const client=window.getSupabaseClient?.()||window.SupabaseClient;if(!client)throw Error('connection_unavailable');
            const {data,error}=await client.rpc('admin_customer_page',{p_query:request.query||'',p_tier:request.tier||'ALL',p_status:request.status||'ALL',p_category:request.category||'ALL',p_page:request.page||1,p_size:request.size||10,p_lookup:request.lookup||''});if(error)throw error;
            if(generation===directoryGeneration){if(directoryCache.size>=20)directoryCache.delete(directoryCache.keys().next().value);directoryCache.set(key,{at:Date.now(),data});}return data;
        })().finally(()=>directoryRequests.delete(requestKey));directoryRequests.set(requestKey,task);return task;
    };
    PawpalCustomers.lookupCustomers=async function(query='',lookup=''){
        const data=await PawpalCustomers.readCustomerPage({query,lookup,page:1,size:15});const customers=hydrateCustomerPage(data),ids=new Set(data.pageIds||[]);
        Object.assign(PawpalCustomers.state.customerDatabase,customers);return Object.values(customers).filter(c=>ids.has(c.dbId));
    };
    PawpalCustomers.hydrateCustomerPage=hydrateCustomerPage;
    async function loadCustomersModuleData({ force = false, refreshSelected = force } = {}) {
        try {
            PawpalCustomers.state.listLoadStatus = 'loading';
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                throw new Error('Supabase client not initialized.');
            }

            // Sử dụng cache nếu dữ liệu còn mới và đã có ít nhất 1 khách hàng
            if (!force && !refreshSelected && PawpalCustomers.state.customerPage?.key===JSON.stringify(PawpalCustomers.state.customerListRequest||{query:'',tier:'ALL',status:'ALL',category:'ALL',page:1,size:10}) && Date.now() - _custLastFetchedAt < CUST_CACHE_TTL_MS) {
                console.log('[Customers] Dùng cache, bỏ qua fetch.');
                PawpalCustomers.state.listLoadStatus = 'loaded';
                return;
            }

            const request=PawpalCustomers.state.customerListRequest||{query:'',tier:'ALL',status:'ALL',category:'ALL',page:1,size:10};
            const requestKey=JSON.stringify(request);
            const task=PawpalCustomers.readCustomerPage(request,{force});
            const generation=directoryGeneration;
            const data=await task;
            if(generation!==directoryGeneration){PawpalCustomers.state.listLoadStatus='idle';return;}
            const freshDb=hydrateCustomerPage(data);
            const selectedKey=sessionStorage.getItem('pawpal_admin_customer_id');
            if(refreshSelected&&selectedKey&&!freshDb[selectedKey]){const selectedData=await PawpalCustomers.readCustomerPage({lookup:selectedKey,page:1,size:1});Object.assign(freshDb,hydrateCustomerPage(selectedData));}
            const previous=PawpalCustomers.state.customerDatabase||{};
            PawpalCustomers.state.customerDatabase={...previous,...freshDb};
            const pageIds=new Set(data.pageIds||[]);
            PawpalCustomers.state.customerPage={key:requestKey,total:Number(data.total||0),page:Number(data.page||1),stats:data.stats,operations:data.operations||[],opsTotal:Number(data.opsTotal||0),keys:Object.values(freshDb).filter(c=>pageIds.has(c.dbId)).map(c=>c.id)};
            const keep=new Set([...Object.keys(freshDb),sessionStorage.getItem('pawpal_admin_customer_id')]);
            const cachedKeys=Object.keys(PawpalCustomers.state.customerDatabase);if(cachedKeys.length>200)for(const key of cachedKeys)if(!keep.has(key)&&Object.keys(PawpalCustomers.state.customerDatabase).length>200)delete PawpalCustomers.state.customerDatabase[key];
            PawpalCustomers.state.membershipTiers = data.tiersData || [];

            // PERF-03.C04: Lịch sử điểm Pawpoint nạp on-demand khi mở subtab Pawpoints
            // Directory refreshes do not invalidate the independent Pawpoint ledger.

            PawpalCustomers.populateCustomerDatalists();
            _custLastFetchedAt = Date.now();
            PawpalCustomers.state.hasLoadedCustomers = true;
            PawpalCustomers.state.listLoadStatus = 'loaded';
            PawpalCustomers.state.customerFailedKey=null;

            if (document.getElementById('subtab-tab-pawpoint')?.classList.contains('active')) {
                PawpalCustomers.subtabs.pawpoint?.renderPawpointHistory?.();
            }

            if (PawpalCustomers.subtabs.list?.renderCustomersTable) {
                PawpalCustomers.subtabs.list.renderCustomersTable();
                PawpalCustomers.subtabs.list.updateCustomerKPIs();
                if (PawpalCustomers.subtabs.list.renderComplaintBar) {
                    PawpalCustomers.subtabs.list.renderComplaintBar();
                }
            }
        } catch (err) {
            PawpalCustomers.state.listLoadStatus = 'error';
            PawpalCustomers.state.customerFailedKey=JSON.stringify(PawpalCustomers.state.customerListRequest||{query:'',tier:'ALL',status:'ALL',category:'ALL',page:1,size:10});
            PawpalCustomers.state.hasLoadedCustomers = false;
            console.error('[Customers] Lỗi nạp dữ liệu từ Supabase:', err);
            PawpalCustomers.subtabs.list?.renderCustomersTable?.();
            PawpalCustomers.subtabs.list?.updateCustomerKPIs?.();
            PawpalCustomers.subtabs.pawpoint?.renderPawpointHistory?.();
            PawpalCustomers.subtabs.profile?.renderDrawerCustomerProfile?.(sessionStorage.getItem('pawpal_admin_customer_id'));
        }
    }

    // Helper lazy-fetch hồ sơ 360° (Đơn hàng, Lịch hẹn, Khiếu nại) cho 1 khách hàng cụ thể (PERF-03.C03)
    const detailRequests = new Map();
    const detailPages = new Map();
    const detailVersions = new Map();
    const historyKinds = ['orders', 'bookings', 'complaints'];

    function historyVersion(customerId, kinds) {
        return kinds.map(kind => `${detailVersions.get('*:' + kind) || 0}:${detailVersions.get(customerId + ':' + kind) || 0}`).join('|');
    }

    function invalidateHistory(kind, customerIds = []) {
        for (const id of customerIds.length ? customerIds : ['*']) {
            for (const item of kind ? [kind] : historyKinds) {
                const key = id + ':' + item;
                detailVersions.set(key, (detailVersions.get(key) || 0) + 1);
            }
        }
        for (const [key, entry] of detailPages) {
            if ((!kind || entry.kind === kind || entry.kind === 'all') && (!customerIds.length || customerIds.includes(entry.customerId))) {
                detailPages.delete(key);
            }
        }
        for (const cust of Object.values(PawpalCustomers.state.customerDatabase || {})) {
            if (customerIds.length && !customerIds.includes(cust.dbId)) continue;
            for (const item of kind ? [kind] : historyKinds) {
                if (cust._historyStatus) cust._historyStatus[item] = 'idle';
                if (cust._historyCounts) delete cust._historyCounts[item];
            }
            cust._detailsLoaded = false;
        }
    }

    PawpalCustomers.fetchCustomerProfile360 = function(cust, options = {}) {
        if (!cust) return Promise.resolve(null);
        const kinds = historyKinds.includes(options.kind) ? [options.kind] : historyKinds;
        const key = JSON.stringify([cust.dbId || cust.id, options.kind || 'all', options.page || 1, historyVersion(cust.dbId, kinds)]);
        if (detailRequests.has(key)) {
            return detailRequests.get(key).then(result => result === cust ? result : fetchCustomerProfile360(cust, options));
        }
        const request = fetchCustomerProfile360(cust, options).finally(() => detailRequests.delete(key));
        detailRequests.set(key, request);
        return request;
    };
    const fetchCustomerProfile360 = async function(cust, { force = false, page = 1, kind = 'all' } = {}) {
        if (!cust || !cust.dbId) return cust;
        page=Math.max(1,Math.floor(Number(page)||1));
        const kinds = historyKinds.includes(kind) ? [kind] : historyKinds;
        const generation = historyVersion(cust.dbId, kinds);
        const cacheKey = JSON.stringify([cust.dbId, kind, page]);
        const cached = detailPages.get(cacheKey);
        cust._historyStatus ||= {};
        cust._historyPages ||= {};
        cust._historyTokens ||= {};
        const token = {};
        for (const item of kinds) cust._historyTokens[item] = token;
        for (const item of kinds) cust._historyStatus[item] = 'loading';

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        cust._detailsLoadStatus='loading';
        try {
            if (!client) throw new Error('connection_unavailable');
            const fetchCust360 = async () => {
                const empty = () => Promise.resolve({ data: [], count: 0 });
                const [ordersRes,apptsRes,ticketsRes]=await Promise.all([
                    kinds.includes('orders') ? client.from('sales_order').select('id,order_code,customer_id,order_status,created_at',{count:'exact'}).eq('customer_id',cust.dbId).order('created_at',{ascending:false}).order('id').range((page-1)*10,page*10-1) : empty(),
                    kinds.includes('bookings') ? client.from('appointment').select('id,appointment_code,customer_id,scheduled_start_at,appointment_status,items:appointment_item(name_snapshot,status),staff:staff_id(full_name)',{count:'exact'}).eq('customer_id',cust.dbId).order('scheduled_start_at',{ascending:false}).order('id').range((page-1)*10,page*10-1) : empty(),
                    kinds.includes('complaints') ? client.from('support_ticket').select('id,ticket_code,customer_id,subject,type,status,priority,created_at',{count:'exact'}).eq('customer_id',cust.dbId).order('created_at',{ascending:false}).order('id').range((page-1)*10,page*10-1) : empty(),
                ]);
                for (const result of [ordersRes, apptsRes, ticketsRes]) if (result.error) throw result.error;
                const paymentsRes = { data: [] };
                const counts = { orders: ordersRes.count || 0, bookings: apptsRes.count || 0, complaints: ticketsRes.count || 0 };
                let totals = [];
                for (let offset = 0; offset < (ordersRes.data || []).length; offset += 100) {
                    const result = await client.from('sales_order_totals').select('order_id,total_amount').in('order_id',ordersRes.data.slice(offset,offset+100).map(o=>o.id)).order('order_id');
                    if (result.error) throw result.error;
                    totals.push(...(result.data || []));
                    const payments = await readAllRows(()=>client.from('payment').select('id,order_id,amount,transaction_status,refunds:refund_transaction(refunded_amount,refund_status)').eq('customer_id',cust.dbId).in('order_id',ordersRes.data.slice(offset,offset+100).map(o=>o.id)).order('id'));
                    if (payments.error) throw payments.error;
                    paymentsRes.data.push(...(payments.data || []));
                }
                return {
                    historyCounts: Object.fromEntries(kinds.map(item => [item, counts[item]])),
                    orders: (ordersRes.data || []).map(o => ({ ...o, total_amount: totals.find(t => t.order_id === o.id)?.total_amount })),
                    payments: paymentsRes.data || [],
                    appts: apptsRes.data || [],
                    tickets: ticketsRes.data || []
                };
            };

            const payload = !force && cached && Date.now() - cached.at < 60000
                ? cached.payload
                : await fetchCust360();
            if (generation !== historyVersion(cust.dbId, kinds)) return cust;
            if (detailPages.size >= 80) detailPages.delete(detailPages.keys().next().value);
            detailPages.set(cacheKey, { at: cached?.payload === payload ? cached.at : Date.now(), payload, kind, customerId: cust.dbId });
            if (kinds.some(item => cust._historyTokens[item] !== token)) return cust;
            cust._historyCounts = { ...cust._historyCounts, ...payload.historyCounts };
            cust._historyPage = page;
            for (const item of kinds) cust._historyPages[item] = page;
            // Map orders
            if (kinds.includes('orders')) cust.orders = (payload.orders || []).map(o => {
                const dateStr = o.created_at ? PawpalCustomers.formatDateTime(o.created_at) : '—';
                const totalStr = o.total_amount ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '0 đ';
                let st = window.PawpalEnum?.orderStatus(o.order_status)?.label || 'Chưa xác định';
                let stClass = window.PawpalEnum?.orderStatus(o.order_status)?.badgeClass || 'badge-neutral';
                const ordStatus = (o.order_status || '').toUpperCase();
                if (ordStatus === 'PENDING' || ordStatus === 'CHO_XAC_NHAN') { st = 'Chờ xác nhận'; stClass = 'badge-warning'; }
                else if (ordStatus === 'PROCESSING' || ordStatus === 'CONFIRMED' || ordStatus === 'DA_XAC_NHAN' || ordStatus === 'DANG_DONG_GOI' || ordStatus === 'PACKING') { st = 'Đang chuẩn bị'; stClass = 'badge-info'; }
                else if (ordStatus === 'SHIPPING' || ordStatus === 'DELIVERING' || ordStatus === 'DANG_GIAO_HANG') { st = 'Đang giao'; stClass = 'badge-info'; }
                else if (ordStatus === 'CANCELLED' || ordStatus === 'DA_HUY') { st = 'Đã hủy'; stClass = 'badge-danger'; }
                else if (ordStatus === 'DELIVERED' || ordStatus === 'DA_GIAO_HANG' || ordStatus === 'COMPLETED' || ordStatus === 'DA_HOAN_TAT') { st = 'Hoàn thành'; stClass = 'badge-success'; }
                const payments=(payload.payments || []).filter(p=>p.order_id===o.id && p.transaction_status==='succeeded');
                const paid=payments.reduce((sum,p)=>sum+Number(p.amount),0);
                const refunded=payments.reduce((sum,p)=>sum+(p.refunds || []).filter(r=>r.refund_status==='succeeded').reduce((v,r)=>v+Number(r.refunded_amount),0),0);
                const payment=refunded>0?(refunded>=paid?'Đã hoàn tiền':'Hoàn tiền một phần'):Number(o.total_amount)===0&&paid===0?'Không phát sinh thanh toán':paid>=Number(o.total_amount)?'Đã thanh toán':paid>0?'Thanh toán một phần':'Chưa ghi nhận thanh toán';
                return {
                    id: o.order_code || `ORD-${o.id.slice(0, 4)}`,
                    rawId: o.id,
                    date: dateStr,
                    total: totalStr,
                    payment,
                    paymentClass: refunded>0?'badge-warning':paid>=Number(o.total_amount)?'badge-success':'badge-neutral',
                    status: st,
                    statusClass: stClass
                };
            });

            // GĐ-03 & F-005: Map appts qua PawpalEnum nhận diện da_hoan_tat, da_check_in, vang_mat
            if (kinds.includes('bookings')) cust.bookings = (payload.appts || []).map(a => {
                const aDate = a.scheduled_start_at ? PawpalCustomers.formatDateTime(a.scheduled_start_at) : '—';
                const apptMeta = (window.PawpalEnum?.appointmentStatus)
                    ? window.PawpalEnum.appointmentStatus(a.appointment_status)
                    : { raw: a.appointment_status, label: a.appointment_status || 'Chưa rõ', badgeClass: 'badge-neutral' };
                return {
                    id: a.appointment_code || `APT-${a.id.slice(0, 4)}`,
                    rawId: a.id,
                    date: aDate,
                    service: (a.items || []).filter(i => i.status !== 'cancelled').map(i => i.name_snapshot).join(', ') || 'Chưa ghi nhận',
                    staff: a.staff?.full_name || 'Chưa phân công',
                    status: apptMeta.label,
                    statusClass: apptMeta.badgeClass
                };
            });

            // GĐ-03 & F-007: Map complaints qua PawpalEnum phân biệt tu_choi, da_dong, mo, khẩn cấp
            if (kinds.includes('complaints')) cust.complaints = (payload.tickets || []).map(t => {
                const tDate = t.created_at ? PawpalCustomers.formatDateTime(t.created_at) : '—';
                const ticketMeta = (window.PawpalEnum?.ticketStatus)
                    ? window.PawpalEnum.ticketStatus(t.status)
                    : { label: t.status || 'Chờ xử lý', badgeClass: 'badge-warning' };
                const priorityMeta = (window.PawpalEnum?.priority)
                    ? window.PawpalEnum.priority(t.priority)
                    : { label: t.priority || 'Trung bình' };
                return {
                    id: t.ticket_code || `TK-${t.id.slice(0, 4)}`,
                    rawId: t.id,
                    date: tDate,
                    issue: t.subject || 'Chưa ghi nhận',
                    level: priorityMeta.label,
                    status: ticketMeta.label,
                    isClosed: ['resolved', 'closed', 'rejected', 'da_giai_quyet', 'da_dong', 'tu_choi'].includes(t.status),
                    statusClass: ticketMeta.badgeClass
                };
            });

            for (const item of kinds) cust._historyStatus[item] = 'loaded';
            cust._detailsLoaded = historyKinds.every(item => cust._historyStatus[item] === 'loaded');
            cust._detailsLoadStatus = 'loaded';
        } catch (e) {
            if (generation !== historyVersion(cust.dbId, kinds)) return cust;
            if (kinds.some(item => cust._historyTokens[item] !== token)) return cust;
            detailPages.delete(cacheKey);
            for (const item of kinds) cust._historyStatus[item] = 'error';
            cust._detailsLoadStatus = 'error';
            console.warn('[PawpalCustomers] Lỗi nạp 360:', e.code || 'connection');
        }
        return cust;
    };

    // Helper lazy-fetch lịch sử điểm Pawpoint khi vào tab Pawpoints (PERF-03.C04)
    const ledgerPages=new Map(),ledgerRequests=new Map();
    let ledgerGeneration = 0;
    const ledgerKey=options=>JSON.stringify([options.query||'',options.kind||'ALL',options.page||1,options.size||10]);
    PawpalCustomers.ledgerPageKey=ledgerKey;
    PawpalCustomers.readPawpointPage=async function(options={}){
        const key=ledgerKey(options),cached=ledgerPages.get(key);
        if(!options.force&&cached&&Date.now()-cached.at<60000)return cached.data;
        const generation = ledgerGeneration;
        const requestKey = generation + ':' + key;
        if(ledgerRequests.has(requestKey))return ledgerRequests.get(requestKey);
        const task=(async()=>{
            const client=window.getSupabaseClient?.()||window.SupabaseClient;
            if(!client)throw Error('connection_unavailable');
            const {data,error}=await client.rpc('admin_pawpoint_page',{p_query:options.query||'',p_kind:options.kind||'ALL',p_page:options.page||1,p_size:options.size||10});
            if(error)throw error;
            const result={...data,rows:(data.rows||[]).map(pt=>({id:pt.id,rawId:pt.id,custId:pt.customer_code||pt.customer_id,custName:pt.full_name||'Khách hàng',phone:pt.phone_number||'—',time:PawpalCustomers.formatDateTime(pt.created_at),createdAt:pt.created_at,type:Number(pt.points)<0?'SUB':'ADD',points:Math.abs(Number(pt.points)),balance:Number(pt.balance),reason:pt.description||'Giao dịch điểm Pawpoint'}))};
            if(ledgerPages.size>=20)ledgerPages.delete(ledgerPages.keys().next().value);
            if(generation===ledgerGeneration)ledgerPages.set(key,{at:Date.now(),data:result});return result;
        })().finally(()=>ledgerRequests.delete(requestKey));ledgerRequests.set(requestKey,task);return task;
    };
    let ledgerVersion=0;
    PawpalCustomers.fetchPawpointLedger=async function(options={}){
        const request=options.query!==undefined?options:(PawpalCustomers.state.ledgerRequest||{});
        const key=ledgerKey(request),version=++ledgerVersion;
        PawpalCustomers.state.ledgerRequest={...request,force:false};
        PawpalCustomers.state.ledgerRequestKey=key;
        PawpalCustomers.state.pawpointLoadStatus='loading';
        if(options.force){ledgerGeneration+=1;ledgerPages.clear();}
        try{
            const result=await PawpalCustomers.readPawpointPage({...request,force:!!options.force});
            if(version!==ledgerVersion)return [];
            PawpalCustomers.state.ledgerPage=result;PawpalCustomers.state.pawpointHistory=result.rows;PawpalCustomers.state.pawpointLoadStatus='loaded';return result.rows;
        }catch(error){if(version===ledgerVersion){PawpalCustomers.state.pawpointLoadStatus='error';PawpalCustomers.state.pawpointHistory=[];PawpalCustomers.state.ledgerPage=null;}return [];}
    };

    PawpalCustomers.getCustomer = function(idOrKey) {
        if (!idOrKey) return null;
        const db = PawpalCustomers.state.customerDatabase || {};
        if (db[idOrKey]) return db[idOrKey];
        const raw = String(idOrKey).trim();
        const lower = raw.toLowerCase();
        const digits = raw.replace(/\D/g, '');
        return Object.values(db).find(c => {
            if (c.dbId === idOrKey || c.id === idOrKey) return true;
            if (digits.length >= 9 && c.phone && c.phone.replace(/\D/g, '') === digits) return true;
            if (c.name && c.name.toLowerCase() === lower) return true;
            if (c.name && lower.length >= 3 && (c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()))) return true;
            return false;
        }) || null;
    };

    PawpalCustomers.populateCustomerDatalists = function() {
        const searchDatalist = document.getElementById('customerSearchDatalist');
        const adjustDatalist = document.getElementById('adjustCustomerDatalist');
        const breedDatalist = document.getElementById('quickAddBreedDatalist');
        const petBreedDatalist = document.getElementById('petBreedDatalist');

        const customers = Object.values(PawpalCustomers.state.customerDatabase || {});

        if (searchDatalist) {
            searchDatalist.innerHTML = '';
            customers.forEach(c => {
                const opt = document.createElement('option');
                const petNames = (c.pets && c.pets.length > 0) ? ` (Bé: ${c.pets.map(p => p.name).join(', ')})` : '';
                opt.value = `${c.name} - ${c.phone}`;
                opt.label = `${c.tierName} • ${(c.points || 0).toLocaleString('vi-VN')} điểm${petNames}`;
                searchDatalist.appendChild(opt);
            });
        }

        const commonBreeds = [
            'Poodle', 'Corgi', 'Golden Retriever', 'Phốc sóc (Pomeranian)', 
            'Husky', 'Alaska', 'Pug', 'Chihuahua', 'Shiba Inu', 'Bulldog Pháp',
            'Mèo Anh lông ngắn (ALN)', 'Mèo Anh lông dài (ALD)', 'Mèo Ba Tư (Persian)',
            'Mèo Xiêm', 'Mèo Ragdoll', 'Mèo Munchkin', 'Mèo Sphynx', 'Thỏ Minilop'
        ];

        if (breedDatalist) breedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
        if (petBreedDatalist) petBreedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
    };

    // 5. Coalesce mutations and Realtime updates; refresh only the visible resource.
    let directoryDirty = false;
    let ledgerDirty = false;
    let profileDirty = false;
    let historyDirty = false;
    let syncTimer = null;
    let syncRunning = null;
    let syncWaiters = [];

    function invalidateDirectory() {
        directoryGeneration += 1;
        directoryCache.clear();
        _custLastFetchedAt = 0;
        if (PawpalCustomers.state.customerPage) PawpalCustomers.state.customerPage.key = null;
        PawpalCustomers.state.customerFailedKey = null;
    }

    function scheduleCustomerSync() {
        clearTimeout(syncTimer);
        return new Promise(resolve => {
            syncWaiters.push(resolve);
            syncTimer = setTimeout(flushCustomerSync, 300);
        });
    }

    async function flushCustomerSync() {
        if (syncRunning) {
            await syncRunning;
            return flushCustomerSync();
        }
        const waiters = syncWaiters;
        syncWaiters = [];
        syncRunning = (async () => {
            if (document.hidden || sessionStorage.getItem('pawpal_admin_active_module') !== 'Kh\u00e1ch h\u00e0ng') return;
            if (customerLoadPromise) await customerLoadPromise;
            if (document.hidden || sessionStorage.getItem('pawpal_admin_active_module') !== 'Kh\u00e1ch h\u00e0ng') return;
            const profileActive = document.getElementById('subtab-tab-profile')?.classList.contains('active');
            const listActive = document.getElementById('subtab-tab-list')?.classList.contains('active');
            const ledgerActive = document.getElementById('subtab-tab-pawpoint')?.classList.contains('active');
            const openId = sessionStorage.getItem('pawpal_admin_customer_id');
            const oldCustomer = PawpalCustomers.getCustomer(openId);
            const note = document.getElementById('drawerCustNote');
            const draft = profileActive && note && oldCustomer && note.value !== (oldCustomer.note || '')
                ? { value: note.value, version: note.dataset.version } : null;
            const refreshProfile = profileActive && profileDirty;
            const refreshHistory = profileActive && historyDirty;
            if (profileActive) historyDirty = false;
            if (directoryDirty && listActive) {
                directoryDirty = false;
                await PawpalCustomers.loadCustomersModuleData();
            }
            if (refreshProfile && openId) {
                profileDirty = false;
                const generation = directoryGeneration;
                try {
                    const data = await PawpalCustomers.readCustomerPage({ lookup: openId, page: 1, size: 1 });
                    if (generation !== directoryGeneration) {
                        profileDirty = true;
                        return;
                    }
                    Object.assign(PawpalCustomers.state.customerDatabase, hydrateCustomerPage(data));
                    PawpalCustomers.state.membershipTiers = data.tiersData || [];
                } catch (error) {
                    profileDirty = true;
                    PawpalCustomers.showToast('Ch\u01b0a t\u1ea3i l\u1ea1i \u0111\u01b0\u1ee3c h\u1ed3 s\u01a1. Vui l\u00f2ng th\u1eed l\u1ea1i.', 'warning');
                    return;
                }
            }
            if (refreshProfile && sessionStorage.getItem('pawpal_admin_customer_id') === openId) {
                PawpalCustomers.subtabs.profile?.renderDrawerCustomerProfile(openId);
                if (draft && note) {
                    note.value = draft.value;
                    note.dataset.version = draft.version;
                    const editor = document.getElementById('customerNoteEditor');
                    const edit = document.getElementById('customerNoteEdit');
                    if (editor) editor.hidden = false;
                    if (edit) edit.hidden = true;
                }
            } else if (refreshHistory) {
                PawpalCustomers.subtabs.profile?.switchDrawerTab(sessionStorage.getItem('pawpal_admin_customer_drawertab') || 'dtab-personal');
            }
            if (ledgerActive && ledgerDirty) {
                ledgerDirty = false;
                await PawpalCustomers.fetchPawpointLedger();
                PawpalCustomers.subtabs.pawpoint?.renderPawpointHistory();
            }
        })();
        try {
            await syncRunning;
        } catch (error) {
            console.warn('[Customers] Refresh failed:', error.code || 'connection');
        } finally {
            syncRunning = null;
            waiters.forEach(resolve => resolve());
        }
    }

    PawpalCustomers.refreshCustomerData = function({ directory = true, ledger = false, kind = null, customerIds = [] } = {}) {
        const selected = PawpalCustomers.getCustomer(sessionStorage.getItem('pawpal_admin_customer_id'));
        const affectsSelected = !customerIds.length || customerIds.includes(selected?.dbId);
        if (directory) {
            invalidateDirectory();
            directoryDirty = true;
            profileDirty ||= affectsSelected;
        }
        if (ledger) {
            ledgerGeneration += 1;
            ledgerPages.clear();
            ledgerVersion += 1;
            PawpalCustomers.state.ledgerRequestKey = null;
            PawpalCustomers.state.pawpointLoadStatus = 'idle';
            ledgerDirty = true;
        }
        if (kind) {
            invalidateHistory(kind, customerIds);
            historyDirty ||= affectsSelected;
        }
        return scheduleCustomerSync();
    };

    function setupCustomersRealtimeSubscription() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return;
            if (window._custRealtimeChannel) {
                client.removeChannel(window._custRealtimeChannel);
                window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin_customers_realtime');
            }
            const directoryTables = new Set([
                'customer_phone', 'membership_tier', 'pet_weight_history', 'pet_breed', 'pet_species',
                'customer', 'customer_profile', 'customer_membership', 'customer_address', 'pet_profile',
                'support_ticket', 'paw_point_transaction'
            ]);
            const ledgerTables = new Set(['paw_point_transaction', 'customer', 'customer_profile', 'customer_phone']);
            const kinds = {
                sales_order: 'orders', sales_order_detail: 'orders', payment: 'orders', refund_transaction: 'orders',
                voucher_redemption: 'orders', appointment: 'bookings', appointment_item: 'bookings', support_ticket: 'complaints'
            };
            let channel = client.channel('admin_customers_realtime');
            for (const table of new Set([...directoryTables, ...ledgerTables, ...Object.keys(kinds)])) {
                channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
                    const rows = [payload?.new, payload?.old].filter(row => row && Object.keys(row).length);
                    // DELETE payloads may contain only the primary key. In that case invalidate
                    // this resource conservatively, without downloading unrelated histories.
                    const ids = rows.map(row => table === 'customer' ? row.id : row.customer_id).filter(Boolean);
                    const customerIds = rows.length && rows.every(row => table === 'customer' ? row.id : row.customer_id)
                        ? [...new Set(ids)] : [];
                    window.PawpalDataStore?.recordMetric?.('realtime');
                    PawpalCustomers.refreshCustomerData({
                        directory: directoryTables.has(table), ledger: ledgerTables.has(table),
                        kind: kinds[table] || null, customerIds
                    });
                });
            }
            window._custRealtimeChannel = channel.subscribe();
            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin_customers_realtime');
        } catch (error) {
            console.warn('[Customers] Realtime unavailable:', error.code || 'connection');
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && (directoryDirty || ledgerDirty || profileDirty || historyDirty)) scheduleCustomerSync();
    });

    async function initCustomersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Khách hàng' && validTabs.includes(e.detail.tabId)) {
                PawpalCustomers.switchSubtab(e.detail.tabId, false);
            }
        });

        // Nạp dữ liệu Supabase Live
        await PawpalCustomers.loadCustomersModuleData();

        // Khởi tạo các subtab nếu đã được tải
        if (PawpalCustomers.subtabs.list) {
            PawpalCustomers.subtabs.list.renderCustomersTable();
            PawpalCustomers.subtabs.list.updateCustomerKPIs();
            PawpalCustomers.subtabs.list.renderComplaintBar();
        }
        if (PawpalCustomers.subtabs.pawpoint) {
            PawpalCustomers.subtabs.pawpoint.init?.();
            PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
        }

        // Khôi phục subtab active và hồ sơ khách hàng đang xem
        const hashSubtab = window.location.hash ? window.location.hash.replace('#', '') : null;
        const validSubtabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        let initialSubtab = 'tab-list';

        if (hashSubtab && validSubtabs.includes(hashSubtab)) {
            initialSubtab = hashSubtab;
        } else {
            const savedSubtab = sessionStorage.getItem('pawpal_admin_customer_subtab');
            if (savedSubtab && validSubtabs.includes(savedSubtab)) {
                initialSubtab = savedSubtab;
            }
        }

        const firstCustId = Object.keys(PawpalCustomers.state.customerDatabase)[0] || 'CUST-001';
        const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id');
        if(savedCustId&&!PawpalCustomers.getCustomer(savedCustId)){try{await PawpalCustomers.lookupCustomers('',savedCustId);}catch{PawpalCustomers.showToast('Chưa tải được hồ sơ đã chọn. Vui lòng thử lại.','warning');}}
        const resolvedCust = savedCustId ? PawpalCustomers.getCustomer(savedCustId) : null;
        const activeCustId = resolvedCust ? resolvedCust.id : (savedCustId || firstCustId);
        if (PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(activeCustId);
        }

        PawpalCustomers.switchSubtab(initialSubtab, false);

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab) && PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.switchDrawerTab(savedDrawerTab);
        }

        setupCustomersRealtimeSubscription();

        // Bộ xử lý đóng modal toàn cục cho phân hệ Khách hàng (Hỗ trợ nút Đóng, Hủy, click backdrop và phím Escape)
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                e.preventDefault();
                const modalId = closeBtn.getAttribute('data-close-modal');
                const targetModal = document.getElementById(modalId);
                if (targetModal) {
                    targetModal.style.display = 'none';
                    targetModal.classList.remove('open');
                    targetModal.classList.remove('show');
                }
                return;
            }

            if (e.target.classList.contains('admin-modal-backdrop') && (e.target.style.display === 'flex' || e.target.classList.contains('open'))) {
                e.target.style.display = 'none';
                e.target.classList.remove('open');
                e.target.classList.remove('show');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.admin-modal-backdrop').forEach(m => {
                    if (m.style.display === 'flex' || m.classList.contains('open')) {
                        m.style.display = 'none';
                        m.classList.remove('open');
                        m.classList.remove('show');
                    }
                });
            }
        });


        if (window.lucide) {
            lucide.createIcons();
        }
    }

    PawpalCustomers.init = initCustomersModule;

    window.addEventListener('admin:module-show', (e) => {
        if (e.detail?.module === 'Kh\u00e1ch h\u00e0ng') {
            if (directoryDirty || ledgerDirty || profileDirty || historyDirty) scheduleCustomerSync();
            if (document.getElementById('subtab-tab-list')?.classList.contains('active')) {
                PawpalCustomers.subtabs.list?.renderCustomersTable();
                PawpalCustomers.subtabs.list?.updateCustomerKPIs();
                PawpalCustomers.subtabs.list?.renderComplaintBar?.();
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();

/* ===== Modal lifecycle helper (merged from customer-modal-v7.js) ===== */
/* Shared interaction contract for the customer modals explicitly migrated to V7. */
(()=>{
 if(window.__customerModalV7)return;window.__customerModalV7=true;
 const entries=new Map();let scheduled=false;
 const visible=modal=>modal.isConnected&&getComputedStyle(modal).display!=='none';
 const focusable=modal=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);
 const busy=modal=>[...modal.querySelectorAll('.admin-btn-primary')].some(button=>button.disabled);
 const close=modal=>{if(busy(modal))return;const button=modal.querySelector('[data-close-modal]');if(button)button.click();else modal.style.display='none';};
 const sync=()=>{
  scheduled=false;
  document.querySelectorAll('.customer-modal-v7').forEach(modal=>{
   if(visible(modal)&&!entries.has(modal)){
    entries.set(modal,document.activeElement);
    const card=modal.querySelector('.admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    const title=modal.querySelector('.admin-modal-title');if(title){title.id||=modal.id+'Title';card.setAttribute('aria-labelledby',title.id);}
    modal.querySelectorAll('.form-group').forEach(group=>{const label=group.querySelector('label'),input=group.querySelector('input:not([type=hidden]),select,textarea');if(label&&input?.id)label.htmlFor=input.id;});
    (focusable(modal).find(e=>e.matches('input:not([readonly]),select,textarea'))||focusable(modal)[0])?.focus();
   }
  });
  for(const [modal,previous]of entries)if(!visible(modal)){entries.delete(modal);if(previous?.isConnected)previous.focus();}
 };
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(sync);}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
 document.addEventListener('keydown',event=>{
  const modal=[...entries.keys()].filter(visible).at(-1);if(!modal)return;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close(modal);}
  if(event.key==='Tab'){const items=focusable(modal),first=items[0],last=items.at(-1);if(!items.length)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('click',event=>{
  const modal=event.target.closest('.customer-modal-v7');if(!modal)return;
  const closing=event.target===modal||event.target.closest('[data-close-modal]');
  if(closing&&busy(modal)){event.preventDefault();event.stopImmediatePropagation();return;}
  if(event.target===modal)close(modal);
 },true);
})();
