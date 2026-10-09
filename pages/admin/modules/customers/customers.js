// customers.js - Phân hệ Quản lý Khách hàng Pawpal-er
(function() {
    // Hàm định dạng thời gian chuẩn hóa toàn hệ thống (YYYY-MM-DD HH:mm, YYYY-MM-DD, HH:mm)
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(dateObj);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    async function initCustomersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 3 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-list">Khách hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pawpoint">Pawpoint</button>
            `;
        }

        // Helper: Hiển thị Toast Notification nhẹ nhàng chuẩn AGENTS.md
        function showToast(message, type = 'info') {
            let container = document.getElementById('adminToastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'adminToastContainer';
                container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            const bgColors = {
                success: '#DCEEE2',
                warning: '#F5E8D3',
                danger: '#F7DCDC',
                info: '#DCEAF2'
            };
            const textColors = {
                success: '#165335',
                warning: '#734718',
                danger: '#8F2424',
                info: '#20495E'
            };

            const bg = bgColors[type] || bgColors.info;
            const color = textColors[type] || textColors.info;

            toast.style.cssText = `
                background: ${bg};
                color: ${color};
                padding: 10px 16px;
                border-radius: 9px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                pointer-events: auto;
                opacity: 0;
                transform: translateY(-8px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                max-width: 380px;
                line-height: 1.4;
            `;
            toast.textContent = message;
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-8px)';
                setTimeout(() => toast.remove(), 200);
            }, 3000);
        }

        // Helper: Mở Custom Confirm Modal chuẩn AGENTS.md thay thế window.confirm()
        let activeCustConfirmCallback = null;
        function showCustomerConfirmModal({ title, message, acceptText = 'Xác nhận', onAccept }) {
            const modal = document.getElementById('modalConfirmCustomerAction');
            const titleEl = document.getElementById('custConfirmTitle');
            const msgEl = document.getElementById('custConfirmMessage');
            const acceptBtn = document.getElementById('btnAcceptCustConfirm');
            if (!modal) {
                if (onAccept) onAccept();
                return;
            }

            if (titleEl && title) titleEl.textContent = title;
            if (msgEl && message) msgEl.innerHTML = message;
            if (acceptBtn) acceptBtn.textContent = acceptText;

            activeCustConfirmCallback = onAccept;
            modal.style.display = 'flex';
        }

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

        // ====================================================================
        // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
        // ====================================================================
        let customerDatabase = {};
        let pawpointHistory = [];

        async function loadCustomersModuleData() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    console.warn('[Customers] Supabase client not initialized.');
                    return;
                }

                // Nạp song song toàn bộ các thực thể liên quan đến Khách hàng
                const [
                    custRes,
                    profRes,
                    memRes,
                    addrRes,
                    petsRes,
                    ordersRes,
                    apptsRes,
                    ticketsRes,
                    pointsTxRes
                ] = await Promise.all([
                    client.from('customer').select('*').order('created_at', { ascending: false }),
                    client.from('customer_profile').select('*'),
                    client.from('customer_membership').select('*'),
                    client.from('customer_address').select('*'),
                    client.from('pet_profile').select('*'),
                    client.from('sales_order').select('*').order('created_at', { ascending: false }),
                    client.from('appointment').select('*, service:service_id(service_name), staff:staff_id(full_name)').order('appointment_date', { ascending: false }),
                    client.from('support_ticket').select('*').order('created_at', { ascending: false }),
                    client.from('paw_point_transaction').select('*').order('created_at', { ascending: false })
                ]);

                const profMap = {};
                if (Array.isArray(profRes.data)) {
                    profRes.data.forEach(p => { profMap[p.customer_id] = p; });
                }

                const memMap = {};
                if (Array.isArray(memRes.data)) {
                    memRes.data.forEach(m => { memMap[m.customer_id] = m; });
                }

                const addrMap = {};
                if (Array.isArray(addrRes.data)) {
                    addrRes.data.forEach(a => {
                        if (!addrMap[a.customer_id]) addrMap[a.customer_id] = [];
                        const street = a.street_address || '';
                        const prov = a.province || '';
                        const fullAddr = [street, prov].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ';
                        addrMap[a.customer_id].push({
                            rawId: a.id,
                            address: fullAddr,
                            receiverName: a.receiver_name || '',
                            receiverPhone: a.receiver_phone || '',
                            isDefault: !!a.is_default
                        });
                    });
                }

                const petsMap = {};
                if (Array.isArray(petsRes.data)) {
                    petsRes.data.forEach((p, idx) => {
                        if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                        const specName = p.species === 'cat' ? 'Mèo' : (p.species === 'dog' ? 'Chó' : (p.species === 'rabbit' ? 'Thỏ' : 'Thú cưng'));
                        petsMap[p.customer_id].push({
                            id: p.pet_code || `PET-${String(idx + 1).padStart(3, '0')}`,
                            dbId: p.id,
                            name: p.pet_name || 'Bé cưng',
                            species: specName,
                            breed: p.breed || 'Chưa cập nhật',
                            weight: p.weight ? String(p.weight) : '4.0',
                            vaccine: p.vaccination_history || 'Đầy đủ sổ tiêm',
                            alertNote: p.allergy && p.allergy !== 'Không' ? `Cảnh báo dị ứng: ${p.allergy}` : (p.routine || 'Bình thường')
                        });
                    });
                }

                const ordersMap = {};
                if (Array.isArray(ordersRes.data)) {
                    ordersRes.data.forEach(o => {
                        if (!ordersMap[o.customer_id]) ordersMap[o.customer_id] = [];
                        const dateStr = o.created_at ? formatDateTime(o.created_at) : '2026-09-25 14:30';
                        const totalStr = o.total_amount ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '0 đ';
                        let st = 'Hoàn tất';
                        let stClass = 'badge-success';
                        if (o.order_status === 'PENDING' || o.order_status === 'PROCESSING') {
                            st = 'Đang giao';
                            stClass = 'badge-info';
                        } else if (o.order_status === 'CANCELLED') {
                            st = 'Đã hủy';
                            stClass = 'badge-danger';
                        }
                        ordersMap[o.customer_id].push({
                            id: o.order_code || `ORD-${o.id.slice(0, 4)}`,
                            rawId: o.id,
                            date: dateStr,
                            total: totalStr,
                            payment: o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
                            status: st,
                            statusClass: stClass
                        });
                    });
                }

                const apptsMap = {};
                if (Array.isArray(apptsRes.data)) {
                    apptsRes.data.forEach(app => {
                        if (!apptsMap[app.customer_id]) apptsMap[app.customer_id] = [];
                        const sName = app.service?.service_name || 'Dịch vụ Spa & Grooming';
                        const staffName = app.staff?.full_name || 'KTV PawPal';
                        const appDate = app.appointment_date ? formatDate(app.appointment_date) : '2026-09-25';
                        const appTime = app.appointment_time ? app.appointment_time.slice(0, 5) : '09:00';
                        let st = 'Chờ xác nhận';
                        let stClass = 'badge-warning';
                        if (app.appointment_status === 'COMPLETED') { st = 'Hoàn tất'; stClass = 'badge-success'; }
                        else if (app.appointment_status === 'CONFIRMED' || app.appointment_status === 'IN_PROGRESS') { st = 'Đang thực hiện'; stClass = 'badge-info'; }
                        else if (app.appointment_status === 'CANCELLED') { st = 'Đã hủy'; stClass = 'badge-danger'; }

                        apptsMap[app.customer_id].push({
                            id: app.appointment_code || `AP-${app.id.slice(0, 4)}`,
                            rawId: app.id,
                            date: `${appDate} ${appTime}`,
                            service: sName,
                            staff: staffName,
                            status: st,
                            statusClass: stClass
                        });
                    });
                }

                const complaintsMap = {};
                if (Array.isArray(ticketsRes.data)) {
                    ticketsRes.data.forEach(t => {
                        const uId = t.user_id || t.customer_id;
                        if (!uId) return;
                        if (!complaintsMap[uId]) complaintsMap[uId] = [];
                        const tDate = t.created_at ? formatDateTime(t.created_at) : '2026-09-27 10:00';
                        const rawStatus = String(t.status || '').trim().toLowerCase();
                        let st = 'Đang xử lý';
                        let stClass = 'badge-warning';
                        if (['resolved', 'closed', 'completed', 'done', 'đã giải quyết'].includes(rawStatus)) {
                            st = 'Đã giải quyết';
                            stClass = 'badge-success';
                        } else if (['pending', 'new', 'open', 'chờ xử lý', 'chờ xác nhận'].includes(rawStatus)) {
                            st = 'Chưa xử lý';
                            stClass = 'badge-danger';
                        }
                        complaintsMap[uId].push({
                            id: `TK-${t.id.slice(0, 4)}`,
                            rawId: t.id,
                            date: tDate,
                            issue: t.title || 'Phản ánh chất lượng dịch vụ',
                            level: t.priority === 'HIGH' ? 'Cao' : (t.priority === 'URGENT' ? 'Khẩn cấp' : 'Trung bình'),
                            status: st,
                            statusClass: stClass
                        });
                    });
                }

                const freshDb = {};
                if (Array.isArray(custRes.data) && custRes.data.length > 0) {
                    custRes.data.forEach((c, idx) => {
                        const custKey = `CUST-${String(idx + 1).padStart(3, '0')}`;
                        const prof = profMap[c.id] || {};
                        const mem = memMap[c.id] || {};
                        const points = mem.total_paw_points || 0;

                        let tier = 'SILVER';
                        let tierName = 'Bạc';
                        let tierBadge = 'badge-tier-silver';
                        if (points >= 3000) { tier = 'DIAMOND'; tierName = 'Kim Cương'; tierBadge = 'badge-tier-diamond'; }
                        else if (points >= 1000) { tier = 'GOLD'; tierName = 'Vàng'; tierBadge = 'badge-tier-gold'; }
                        else if (points >= 300) { tier = 'SILVER'; tierName = 'Bạc'; tierBadge = 'badge-tier-silver'; }

                        const addrs = addrMap[c.id] || [];
                        if (addrs.length === 0) {
                            addrs.push({ address: 'Tiếp nhận trực tiếp tại quầy PawPal Pet Center', isDefault: true });
                        }

                        const cPets = petsMap[c.id] || [];
                        const cOrders = ordersMap[c.id] || [];
                        const cAppts = apptsMap[c.id] || [];
                        const cComplaints = complaintsMap[c.id] || [];

                        let emergency = null;
                        const pendingComp = cComplaints.find(comp => comp.status !== 'Đã giải quyết');
                        if (pendingComp) {
                            emergency = `Ticket ${pendingComp.id} · ${pendingComp.status}: ${pendingComp.issue}`;
                        }

                        let isLocked = c.account_status === 'LOCKED';
                        let isTemp = c.is_temporary;

                        freshDb[custKey] = {
                            id: custKey,
                            dbId: c.id,
                            name: prof.full_name || ('Khách hàng ' + (c.phone_main || '')),
                            phone: c.phone_main || '—',
                            email: c.email || 'Chưa cập nhật',
                            gender: (prof.gender === 'FEMALE' || prof.gender === 'Nữ') ? 'Nữ' : ((prof.gender === 'MALE' || prof.gender === 'Nam') ? 'Nam' : 'Khác'),
                            dob: prof.date_of_birth ? formatDate(prof.date_of_birth) : 'Chưa cập nhật',
                            dobRaw: prof.date_of_birth || '',
                            tier,
                            tierName,
                            tierBadgeClass: tierBadge,
                            points,
                            status: isLocked ? 'LOCKED' : (isTemp ? 'TEMP' : 'ACTIVE'),
                            authStatus: isLocked ? 'Tài khoản bị khóa' : (isTemp ? 'Chưa kích hoạt' : 'Đã kích hoạt'),
                            note: c.note || 'Khách hàng PawPal Pet Center.',
                            emergencyAlert: emergency,
                            addresses: addrs,
                            pets: cPets,
                            orders: cOrders,
                            bookings: cAppts,
                            complaints: cComplaints
                        };
                    });
                }

                customerDatabase = freshDb;

                // Nạp lịch sử giao dịch điểm Pawpoint từ Supabase
                if (Array.isArray(pointsTxRes.data) && pointsTxRes.data.length > 0) {
                    pawpointHistory = pointsTxRes.data.map(pt => {
                        const cObj = Object.values(customerDatabase).find(c => c.dbId === pt.customer_id) || {};
                        const tTime = pt.created_at ? formatDateTime(pt.created_at) : '2026-09-25 14:30';
                        const ptsNum = Number(pt.points) || 0;
                        return {
                            id: `PWH-${pt.id.slice(0, 4)}`,
                            rawId: pt.id,
                            time: tTime,
                            custId: cObj.id || 'CUST-001',
                            custName: cObj.name || 'Khách hàng',
                            phone: cObj.phone || '—',
                            type: ptsNum >= 0 ? 'ADD' : 'SUB',
                            points: Math.abs(ptsNum),
                            balance: pt.balance_after || cObj.points || 0,
                            reason: pt.description || 'Giao dịch điểm Pawpoint'
                        };
                    });
                } else {
                    pawpointHistory = [];
                }
                populateCustomerDatalists();
            } catch (err) {
                console.error('[Customers] Lỗi nạp dữ liệu từ Supabase:', err);
            }
        }

        // Nạp danh sách gợi ý sổ ra cho người dùng (Tìm kiếm, Pawpoint, Giống loài)
        function populateCustomerDatalists() {
            const searchDatalist = document.getElementById('customerSearchDatalist');
            const adjustDatalist = document.getElementById('adjustCustomerDatalist');
            const breedDatalist = document.getElementById('quickAddBreedDatalist');
            const petBreedDatalist = document.getElementById('petBreedDatalist');

            const customers = Object.values(customerDatabase);

            if (searchDatalist) {
                searchDatalist.innerHTML = '';
                customers.forEach(c => {
                    const opt = document.createElement('option');
                    const petNames = (c.pets && c.pets.length > 0) ? ` (Bé: ${c.pets.map(p => p.name).join(', ')})` : '';
                    opt.value = `${c.name} - ${c.phone}`;
                    opt.label = `${c.tierName} • ${(c.points || 0).toLocaleString('vi-VN')} pts${petNames}`;
                    searchDatalist.appendChild(opt);
                });
            }

            if (adjustDatalist) {
                adjustDatalist.innerHTML = '';
                customers.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = `${c.name} - ${c.phone}`;
                    opt.label = `Số dư: ${(c.points || 0).toLocaleString('vi-VN')} pts (${c.tierName})`;
                    adjustDatalist.appendChild(opt);
                });
            }

            const commonBreeds = [
                'Poodle', 'Corgi', 'Golden Retriever', 'Phốc sóc (Pomeranian)', 
                'Husky', 'Alaska', 'Pug', 'Chihuahua', 'Shiba Inu', 'Bulldog Pháp',
                'Mèo Anh lông ngắn (ALN)', 'Mèo Anh lông dài (ALD)', 'Mèo Ba Tư (Persian)',
                'Mèo Xiêm', 'Mèo Ragdoll', 'Mèo Munchkin', 'Mèo Sphynx', 'Thỏ Minilop'
            ];

            if (breedDatalist) {
                breedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
            }
            if (petBreedDatalist) {
                petBreedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
            }
        }

        // ====================================================================
        // CƠ CHẾ ĐÁNH GIÁ VÀ THĂNG HẠNG THÀNH VIÊN TỰ ĐỘNG
        // ====================================================================
        function evaluateCustomerTier(cust) {
            if (!cust) return { changed: false };
            const pts = Number(cust.points) || 0;
            let newTier = 'SILVER';
            let newTierName = 'Bạc';
            let newBadgeClass = 'badge-tier-silver';

            if (pts >= 2000) {
                newTier = 'DIAMOND';
                newTierName = 'Kim Cương';
                newBadgeClass = 'badge-tier-diamond';
            } else if (pts >= 800) {
                newTier = 'GOLD';
                newTierName = 'Vàng';
                newBadgeClass = 'badge-tier-gold';
            } else if (pts >= 300) {
                newTier = 'SILVER';
                newTierName = 'Bạc';
                newBadgeClass = 'badge-tier-silver';
            }

            const oldTier = cust.tier;
            if (oldTier !== newTier) {
                const oldTierName = cust.tierName || oldTier;
                cust.tier = newTier;
                cust.tierName = newTierName;
                cust.tierBadgeClass = newBadgeClass;
                return { changed: true, oldTier, oldTierName, newTier, newTierName };
            }
            return { changed: false };
        }

        function toUnaccent(str) {
            if (!str) return '';
            return String(str)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
                .toLowerCase()
                .trim();
        }

        function matchSearch(sourceText, searchTerm) {
            if (!searchTerm) return true;
            if (!sourceText) return false;
            const src = String(sourceText).toLowerCase();
            const query = String(searchTerm).toLowerCase().trim();
            if (src.includes(query)) return true;
            return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
        }

        function renderPawpointHistory() {
            const tbody = document.getElementById('pawpointHistoryTbody');
            if (!tbody) return;

            const query = (document.getElementById('pawpointSearchInput')?.value || '').trim();
            const filterType = document.getElementById('pawpointFilterType')?.value || 'ALL';

            const filtered = pawpointHistory.filter(item => {
                let matchQuery = !query;
                if (query) {
                    const qParts = query.includes(' - ') ? query.split(' - ').map(s => s.trim()) : [query];
                    matchQuery = qParts.some(part => 
                        matchSearch(item.custName, part) ||
                        matchSearch(item.phone, part) ||
                        matchSearch(item.reason, part)
                    );
                }
                const matchType = (filterType === 'ALL') || (item.type === filterType);
                return matchQuery && matchType;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Không tìm thấy lịch sử biến động điểm phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(item => {
                const sign = item.type === 'ADD' ? '+' : '-';
                const colorClass = item.type === 'ADD' ? 'text-success' : 'text-danger';
                return `
                    <tr>
                        <td>${item.time}</td>
                        <td><strong>${item.custName}</strong> <span style="color: var(--text-muted); font-size: 12px;">(${item.phone})</span></td>
                        <td><strong class="${colorClass}">${sign}${item.points} pts</strong></td>
                        <td>${Number(item.balance).toLocaleString('vi-VN')} pts</td>
                        <td>${item.reason}</td>
                    </tr>
                `;
            }).join('');
        }

        function showToast(msg, type = 'success') {
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
        }

        // Tự động đồng bộ bé cưng sang kho dữ liệu pets module khi thêm khách mới hoặc thêm pet
        function syncNewPetToPetsModule(newPet, custId, custName, custPhone) {
            try {
                const savedPets = sessionStorage.getItem('pawpal_admin_pets_data');
                let petsData = savedPets ? JSON.parse(savedPets) : null;
                if (petsData) {
                    const newPetId = newPet.id || ('PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0'));
                    newPet.id = newPetId;
                    const spec = newPet.species === 'Mèo' || newPet.species === 'CAT' ? 'cat' : (newPet.species === 'Thỏ' ? 'rabbit' : 'dog');
                    petsData[newPetId] = {
                        name: newPet.name,
                        code: newPetId,
                        species: spec,
                        speciesBreed: `${newPet.species} ${newPet.breed || ''}`.trim(),
                        breed: newPet.breed || 'Chưa cập nhật',
                        gender: 'Đực',
                        weight: newPet.weight ? `${newPet.weight} kg` : '3.5 kg',
                        weightNum: parseFloat(newPet.weight) || 3.5,
                        dob: 'Chưa cập nhật',
                        color: 'Chưa cập nhật',
                        allergy: 'Không',
                        notes: 'Tiếp nhận ban đầu tại quầy cùng khách hàng.',
                        alert: newPet.alertNote && newPet.alertNote !== 'Bình thường' ? newPet.alertNote : '',
                        ownerName: custName,
                        ownerPhone: custPhone,
                        custId: custId,
                        avatar: spec === 'cat' ? '/assets/images/publics/catcute1.jpg' : '/assets/images/publics/dogcute1.jpg',
                        status: 'Đang nuôi',
                        vaccinated: false,
                        isHotel: false,
                        weightHistory: [],
                        vaccines: [],
                        carelogs: [],
                        history: []
                    };
                    sessionStorage.setItem('pawpal_admin_pets_data', JSON.stringify(petsData));
                }
            } catch(err) {
                console.warn('Lỗi đồng bộ thú cưng sang pets module:', err);
            }
        }

        // Hàm định dạng ô Thú cưng trên bảng theo Phương án 1 (hiển thị bé chính + số lượng bé phụ)
        function formatCustomerPetsCell(pets) {
            if (!pets || pets.length === 0) {
                return `<span class="customer-pet-sub">Chưa có thú cưng</span>`;
            }
            if (pets.length === 1) {
                const p = pets[0];
                const breedText = p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó');
                return `
                    <div class="customer-pet-cell">${p.name}</div>
                    <div class="customer-pet-sub">${breedText}</div>
                `;
            }
            const mainPet = pets[0];
            const moreCount = pets.length - 1;
            const allBreeds = pets.map(p => p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó')).filter(Boolean).join(', ');
            const fullTooltip = pets.map(p => `${p.name} (${p.breed || p.species})`).join(', ');

            return `
                <div class="customer-pet-cell">${mainPet.name} <span class="customer-pet-more">(+${moreCount} bé)</span></div>
                <div class="customer-pet-sub" title="${fullTooltip}">${allBreeds}</div>
            `;
        }

        // State tạm cho danh sách địa chỉ đang chỉnh sửa trong modal
        let currentEditingAddresses = [];
        let currentEditingPetCustId = null;

        // 2. Chuyển đổi giữa 3 Sub-tabs khi bấm nút trên Header Bar
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(custName) {
            if (!deepBreadcrumbEl) return;
            if (custName) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${custName}</span>
                `;
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        function switchSubtab(targetSubtab, updateHistory = true) {
            headerSubtabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
            });

            subtabPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
            });

            // Khi ở tab Hồ sơ, luôn hiển thị đường dẫn tinh gọn / [Tên khách hàng]
            if (targetSubtab === 'tab-profile') {
                const currentName = sessionStorage.getItem('pawpal_admin_customer_name') || 
                                    document.getElementById('drawerCustomerName')?.textContent?.trim() || 
                                    'Nguyễn Văn An';
                updateBreadcrumb(currentName);
            } else {
                updateBreadcrumb(null);
            }

            sessionStorage.setItem('pawpal_admin_customer_subtab', targetSubtab);
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
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSubtab = btn.getAttribute('data-subtab');
                switchSubtab(targetSubtab, true);
            });
        });

        const handleCustomersHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validTabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handleCustomersHashChange);

        // 3. Chuyển đổi giữa 5 tabs con trong Drawer Hồ sơ
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        function switchDrawerTab(targetPanelId) {
            drawerTabs.forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
            });

            drawerPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === targetPanelId);
            });

            sessionStorage.setItem('pawpal_admin_customer_drawertab', targetPanelId);
            if (window.lucide) lucide.createIcons();
        }

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetPanelId);
            });
        });

        // ====================================================================
        // HÀM RENDER ĐẦY ĐỦ 5 TAB CON TRONG DRAWER THEO TỪNG KHÁCH HÀNG
        // ====================================================================
        function renderDrawerCustomerProfile(custId) {
            let data = customerDatabase[custId];
            if (!data) {
                // Tạo record mặc định nếu là khách mới
                data = {
                    id: custId,
                    name: 'Khách hàng ' + custId,
                    phone: '0900000000',
                    email: 'khachhang@email.com',
                    gender: 'Nam',
                    dob: '01/01/1990',
                    tier: 'SILVER',
                    tierName: 'Bạc',
                    tierBadgeClass: 'badge-tier-silver',
                    points: 0,
                    status: 'ACTIVE',
                    authStatus: 'Đã kích hoạt',
                    note: 'Chưa có ghi chú đặc biệt.',
                    emergencyAlert: null,
                    addresses: [{ address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }],
                    pets: [],
                    orders: [],
                    bookings: [],
                    complaints: []
                };
                customerDatabase[custId] = data;
            }

            // Headline
            const headlineName = document.getElementById('drawerCustomerName');
            const headlineTier = document.getElementById('drawerCustomerTier');
            const headlinePhoneBadge = document.querySelector('.drawer-user-headline .badge-success');
            if (headlineName) headlineName.textContent = data.name;
            if (headlineTier) {
                headlineTier.textContent = data.tierName;
                headlineTier.className = `admin-badge ${data.tierBadgeClass}`;
            }
            if (headlinePhoneBadge) headlinePhoneBadge.textContent = data.phone;

            // Nút thao tác một chạm (Gọi điện, Zalo)
            const btnCall = document.querySelector('.drawer-action-buttons a[href^="tel:"]');
            const btnZalo = document.querySelector('.drawer-action-buttons a[href*="zalo.me"]');
            if (btnCall) btnCall.href = `tel:${data.phone}`;
            if (btnZalo) btnZalo.href = `https://zalo.me/${data.phone}`;

            // Banner cảnh báo khẩn cấp
            const banner = document.getElementById('custEmergencyBanner');
            const alertText = document.getElementById('custEmergencyAlertText');
            if (data.emergencyAlert) {
                if (banner) banner.style.display = 'flex';
                if (alertText) alertText.textContent = data.emergencyAlert;
            } else {
                if (banner) banner.style.display = 'none';
            }

            // Tab 1: Cá nhân
            if (document.getElementById('profileValCustId')) document.getElementById('profileValCustId').textContent = data.id;
            if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = data.name;
            if (document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = data.phone;
            if (document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = data.email;
            if (document.getElementById('profileValGender')) document.getElementById('profileValGender').textContent = data.gender;
            if (document.getElementById('profileValDob')) document.getElementById('profileValDob').textContent = data.dob || 'Chưa cập nhật';
            if (document.getElementById('drawerCustNote')) document.getElementById('drawerCustNote').value = data.note || '';

            // Sổ địa chỉ
            renderDrawerAddresses(custId);

            // Tab 2: Thú cưng
            renderDrawerPets(custId);

            // Tab 3: Đơn hàng
            renderDrawerOrders(custId);

            // Tab 4: Lịch hẹn
            renderDrawerBookings(custId);

            // Tab 5: Khiếu nại
            renderDrawerComplaints(custId);

            // Cập nhật số đếm badge đỏ trên các tabs con
            const badgeOrders = document.getElementById('badgeCountOrders');
            const badgeBookings = document.getElementById('badgeCountBookings');
            const badgeComplaints = document.getElementById('badgeCountComplaints');
            if (badgeOrders) {
                badgeOrders.textContent = data.orders.length;
                badgeOrders.style.display = data.orders.length > 0 ? 'inline-flex' : 'none';
            }
            if (badgeBookings) {
                badgeBookings.textContent = data.bookings.length;
                badgeBookings.style.display = data.bookings.length > 0 ? 'inline-flex' : 'none';
            }
            if (badgeComplaints) {
                badgeComplaints.textContent = data.complaints.length;
                badgeComplaints.style.display = data.complaints.length > 0 ? 'inline-flex' : 'none';
            }

            updateBreadcrumb(data.name);
        }

        // Render Sổ địa chỉ
        function renderDrawerAddresses(custId) {
            const container = document.getElementById('profileValAddressContainer');
            if (!container) return;
            const list = customerDatabase[custId]?.addresses || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
            ];

            container.innerHTML = list.map(item => `
                <div class="drawer-address-row" style="${!item.isDefault ? 'color: var(--text-muted);' : ''}">
                    <span class="admin-badge ${item.isDefault ? 'badge-success' : 'badge-neutral'}" style="font-size: 11px; padding: 2px 7px;">
                        ${item.isDefault ? 'Mặc định' : 'Phụ'}
                    </span>
                    <span>${item.address}</span>
                </div>
            `).join('');
        }

        // Render Danh sách thú cưng kèm NÚT SỬA và XÓA (Thuần text, đúng Forest Palette)
        function renderDrawerPets(custId) {
            const container = document.getElementById('petCardsListContainer');
            if (!container) return;
            const pets = customerDatabase[custId]?.pets || [];

            if (pets.length === 0) {
                container.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
                        Khách hàng chưa có bé cưng nào trong danh sách theo dõi. Bấm <strong>Thêm bé cưng</strong> để tạo mới.
                    </div>
                `;
                return;
            }

            container.innerHTML = pets.map((pet, idx) => `
                <div class="pet-detail-card" data-pet-id="${pet.id || ('PET-' + idx)}">
                    <div class="pet-card-head">
                        <div class="pet-card-head-left">
                            <span class="pet-card-name">${pet.name} (Mã: ${pet.id || ('PET-' + (idx+1))})</span>
                            <span class="admin-badge ${pet.alertNote && pet.alertNote !== 'Bình thường' ? 'badge-warning' : 'badge-neutral'}">
                                ${pet.alertNote || 'Bình thường'}
                            </span>
                        </div>
                        <div class="pet-card-actions">
                            <button type="button" class="btn-pet-action btn-pet-view-profile" data-pet-id="${pet.id || ('PET-' + (idx+1))}" data-pet-name="${pet.name}">Xem hồ sơ bé</button>
                            <button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${custId}" data-pet-index="${idx}">Sửa</button>
                            <button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${custId}" data-pet-index="${idx}">Xóa</button>
                        </div>
                    </div>
                    <div class="pet-card-body">
                        <div><strong>Loài:</strong> ${pet.species} ${pet.breed ? '(' + pet.breed + ')' : ''}</div>
                        <div><strong>Cân nặng:</strong> ${pet.weight ? pet.weight + ' kg' : 'Chưa cân'}</div>
                        <div><strong>Tiền sử tiêm chủng:</strong> ${pet.vaccine || 'Chưa cập nhật'}</div>
                        <div><strong>Tính cách / Lưu ý:</strong> ${pet.alertNote || 'Bình thường'}</div>
                    </div>
                </div>
            `).join('');

            // Gán sự kiện Xem hồ sơ bé cưng -> Chuyển sang phân hệ Thú cưng
            container.querySelectorAll('.btn-pet-view-profile').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const petId = btn.getAttribute('data-pet-id');
                    const petName = btn.getAttribute('data-pet-name') || 'Bé cưng';
                    sessionStorage.setItem('pawpal_admin_pet_id', petId);
                    sessionStorage.setItem('pawpal_admin_pet_name', petName);
                    sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                    showToast(`Chuyển đến hồ sơ bé ${petName} (${petId}) tại phân hệ Thú cưng!`);
                    const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Thú cưng"]');
                    if (sidebarBtn) sidebarBtn.click();
                });
            });

            // Gán sự kiện Sửa cho từng thẻ Pet
            container.querySelectorAll('.btn-pet-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cId = btn.getAttribute('data-cust-id');
                    const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                    openEditPetModal(cId, pIdx);
                });
            });

            // Gán sự kiện Xóa cho từng thẻ Pet
            container.querySelectorAll('.btn-pet-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cId = btn.getAttribute('data-cust-id');
                    const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                    const pet = customerDatabase[cId]?.pets[pIdx];
                    showCustomerConfirmModal({
                        title: 'Xác nhận xóa thú cưng',
                        message: `Bạn có chắc chắn muốn xóa bé cưng <strong>${pet?.name || ''}</strong> khỏi hồ sơ của khách hàng này trên CSDL?`,
                        acceptText: 'Xóa thú cưng',
                        onAccept: async () => {
                            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                            if (!client) {
                                showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                                return;
                            }
                            try {
                                if (pet?.dbId) {
                                    const { error: delErr } = await client.from('pet_profile').delete().eq('id', pet.dbId);
                                    if (delErr) {
                                        console.error('[Customers] Lỗi xóa thú cưng:', delErr);
                                        showToast('Không thể xóa thú cưng khỏi CSDL!', 'danger');
                                        return;
                                    }
                                }
                                await loadCustomersModuleData();
                                renderDrawerPets(cId);
                                renderCustomersTable();
                                updateCustomerKPIs();
                                showToast(`Đã xóa bé cưng ${pet?.name || ''} khỏi CSDL thành công!`, 'success');
                            } catch (err) {
                                console.error('[Customers] Lỗi xóa thú cưng:', err);
                                showToast('Đã xảy ra lỗi khi xóa thú cưng!', 'danger');
                            }
                        }
                    });
                });
            });
        }

        // Render Tab Đơn hàng
        function renderDrawerOrders(custId) {
            const tbody = document.getElementById('drawerOrdersTbody');
            if (!tbody) return;
            let orders = [...(customerDatabase[custId]?.orders || [])];

            // Tự động hợp nhất các đơn hàng thực tế từ phân hệ Bán hàng
            try {
                const rawOrders = sessionStorage.getItem('pawpal_admin_orders_data');
                if (rawOrders) {
                    const allOrders = JSON.parse(rawOrders);
                    const custObj = customerDatabase[custId];
                    const custName = custObj?.name?.toLowerCase();
                    const custPhone = custObj?.phone;
                    const custIdMap = { 'CUST-001': 'USER-001', 'CUST-002': 'USER-002', 'CUST-003': 'USER-003', 'CUST-004': 'USER-004', 'CUST-005': 'USER-005' };
                    const mappedUserId = custIdMap[custId];

                    const matchedOrders = allOrders.filter(o =>
                        o.userId === custId ||
                        o.userId === mappedUserId ||
                        (custPhone && o.phone && o.phone.replace(/[^0-9]/g, '') === custPhone.replace(/[^0-9]/g, '')) ||
                        (custName && o.customerName && o.customerName.toLowerCase() === custName)
                    );

                    matchedOrders.forEach(mo => {
                        if (!orders.some(ord => ord.id === mo.id)) {
                            orders.unshift({
                                id: mo.id,
                                date: formatDate(mo.createdAt),
                                total: Number(mo.total).toLocaleString('vi-VN') + ' đ',
                                payment: mo.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
                                status: mo.status === 'completed' ? 'Hoàn tất' : mo.status === 'shipping' ? 'Đang giao' : mo.status === 'confirmed' ? 'Đang chuẩn bị' : 'Chờ xác nhận',
                                statusClass: mo.status === 'completed' ? 'badge-success' : mo.status === 'shipping' ? 'badge-info' : 'badge-warning'
                            });
                        }
                    });
                }
            } catch (e) {}

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch sử mua hàng.</td></tr>`;
                return;
            }

            tbody.innerHTML = orders.map(ord => `
                <tr>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-order-code" data-order-id="${ord.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${ord.id}</a>
                    </td>
                    <td>${ord.date}</td>
                    <td>${ord.total}</td>
                    <td><span class="admin-badge badge-success">${ord.payment}</span></td>
                    <td><span class="admin-badge ${ord.statusClass}">${ord.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết đơn</button></td>
                </tr>
            `).join('');

            const jumpToOrder = (ordId) => {
                sessionStorage.setItem('pawpal_admin_order_id', ordId);
                sessionStorage.setItem('pawpal_admin_order_selected_id', ordId);
                sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail');
                sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
                showToast(`Mở chi tiết đơn hàng ${ordId} tại phân hệ Bán hàng!`);
                setTimeout(() => {
                    window.location.hash = '#tab-order-detail';
                }, 300);
            };

            tbody.querySelectorAll('.btn-jump-order-code, .btn-view-order-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const ordId = btn.getAttribute('data-order-id');
                    jumpToOrder(ordId);
                });
            });
        }

        // Render Tab Lịch hẹn
        function renderDrawerBookings(custId) {
            const tbody = document.getElementById('drawerBookingsTbody');
            if (!tbody) return;
            const bookings = customerDatabase[custId]?.bookings || [];

            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch hẹn dịch vụ nào.</td></tr>`;
                return;
            }

            tbody.innerHTML = bookings.map(b => `
                <tr>
                    <td><strong>${b.id}</strong></td>
                    <td>${b.date}</td>
                    <td>${b.service}</td>
                    <td>${b.staff}</td>
                    <td><span class="admin-badge ${b.statusClass}">${b.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${b.id}">Xem nhật ký</button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-view-booking-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const bId = btn.getAttribute('data-booking-id');
                    sessionStorage.setItem('pawpal_admin_booking_id', bId);
                    showToast(`Mở nhật ký quy trình chăm sóc lịch hẹn ${bId} tại phân hệ Dịch vụ!`);
                    const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
                    if (menuBtn) menuBtn.click();
                });
            });
        }

        // Render Tab Khiếu nại
        function renderDrawerComplaints(custId) {
            const tbody = document.getElementById('drawerComplaintsTbody');
            if (!tbody) return;
            const complaints = customerDatabase[custId]?.complaints || [];

            if (complaints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng không có phản ánh hay khiếu nại nào.</td></tr>`;
                return;
            }

            tbody.innerHTML = complaints.map(c => `
                <tr>
                    <td><strong>${c.id}</strong></td>
                    <td>${c.date}</td>
                    <td>${c.issue}</td>
                    <td><span class="admin-badge badge-danger">${c.level}</span></td>
                    <td><span class="admin-badge ${c.statusClass}">${c.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${c.id}">Mở Ticket xử lý</button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-view-ticket-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tId = btn.getAttribute('data-ticket-id');
                    sessionStorage.setItem('pawpal_admin_ticket_id', tId);
                    sessionStorage.setItem('pawpal_admin_complaint_selected_id', tId);
                    showToast(`Chuyển đến xử lý Ticket khiếu nại ${tId} tại phân hệ Khiếu nại!`);
                    const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
                    if (menuBtn) menuBtn.click();
                });
            });
        }

        // 4. Mở Hồ sơ khi click vào Họ tên hoặc nút Xem trong dropdown
        document.querySelectorAll('.btn-open-profile-drawer').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = trigger.getAttribute('data-id');

                // Đóng tất cả dropdown nếu đang mở
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                const custName = customerDatabase[custId]?.name || custId;
                sessionStorage.setItem('pawpal_admin_customer_name', custName);

                // Render toàn bộ hồ sơ khách hàng
                renderDrawerCustomerProfile(custId);

                // Kích hoạt sub-tab Hồ sơ trên Header Bar
                switchSubtab('tab-profile');
            });
        });

        // ====================================================================
        // 5. GLOBAL DROPDOWN TÁC VỤ 3 CHẤM (DIRECT BODY PORTAL - KHÔNG BỊ TRÀN/CẮT)
        // ====================================================================
        let globalActionDropdown = document.getElementById('customerGlobalActionDropdown');
        if (!globalActionDropdown) {
            globalActionDropdown = document.createElement('div');
            globalActionDropdown.id = 'customerGlobalActionDropdown';
            globalActionDropdown.className = 'action-dropdown-menu';
            globalActionDropdown.innerHTML = `
                <button type="button" class="dropdown-item" data-action="profile">
                    Xem hồ sơ 360°
                </button>
                <button type="button" class="dropdown-item" data-action="edit">
                    Sửa hồ sơ
                </button>
                <button type="button" class="dropdown-item" data-action="adjust-points">
                    Điều chỉnh điểm
                </button>
                <button type="button" class="dropdown-item" data-action="toggle-lock">
                    <span id="globalDropdownLockText">Khóa tài khoản</span>
                </button>
            `;
            document.body.appendChild(globalActionDropdown);
        }

        let activeMoreBtn = null;

        function closeGlobalDropdown() {
            if (globalActionDropdown) {
                globalActionDropdown.style.display = 'none';
                globalActionDropdown.classList.remove('show');
            }
            if (activeMoreBtn) {
                activeMoreBtn.classList.remove('active');
                activeMoreBtn = null;
            }
        }

        function toggleGlobalDropdown(btn) {
            if (!btn || !globalActionDropdown) return;
            const custId = btn.getAttribute('data-id');
            const cust = customerDatabase[custId];
            if (!cust) return;

            // Nếu đang mở chính nút này thì bấm vào sẽ đóng
            if (activeMoreBtn === btn && globalActionDropdown.style.display === 'flex') {
                closeGlobalDropdown();
                return;
            }

            closeGlobalDropdown();
            activeMoreBtn = btn;
            btn.classList.add('active');

            globalActionDropdown.setAttribute('data-id', custId);
            const lockItem = globalActionDropdown.querySelector('[data-action="toggle-lock"]');
            const lockText = globalActionDropdown.querySelector('#globalDropdownLockText');
            if (lockItem && lockText) {
                if (cust.status === 'LOCKED') {
                    lockItem.className = 'dropdown-item text-success';
                    lockText.textContent = 'Mở khóa tài khoản';
                } else {
                    lockItem.className = 'dropdown-item text-danger';
                    lockText.textContent = 'Khóa tài khoản';
                }
            }

            // Tính toán vị trí hiển thị chuẩn xác không phụ thuộc bất kỳ thẻ cha nào
            const rect = btn.getBoundingClientRect();
            const menuWidth = 180;
            const menuHeight = 160;

            let left = rect.right - menuWidth;
            if (left < 10) left = 10;
            if (left + menuWidth > window.innerWidth - 10) {
                left = window.innerWidth - menuWidth - 10;
            }

            let top = rect.bottom + 6;
            // Nếu nút ở gần mép dưới màn hình thì mở ngược lên trên
            if (top + menuHeight > window.innerHeight - 10) {
                top = rect.top - menuHeight - 6;
            }

            globalActionDropdown.style.position = 'fixed';
            globalActionDropdown.style.top = `${top}px`;
            globalActionDropdown.style.left = `${left}px`;
            globalActionDropdown.style.zIndex = '99999';
            globalActionDropdown.style.display = 'flex';
            globalActionDropdown.classList.add('show');
        }

        // Bắt sự kiện thao tác trên menu dropdown
        globalActionDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const custId = globalActionDropdown.getAttribute('data-id');
            closeGlobalDropdown();

            if (!custId || !customerDatabase[custId]) return;

            if (action === 'profile') {
                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_name', customerDatabase[custId].name || custId);
                renderDrawerCustomerProfile(custId);
                switchSubtab('tab-profile');
            } else if (action === 'edit') {
                openEditCustomerModal(custId);
            } else if (action === 'adjust-points') {
                openAdjustPointsModal(customerDatabase[custId].phone);
            } else if (action === 'toggle-lock') {
                const custObj = customerDatabase[custId];
                if (!custObj || !custObj.dbId) return;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                const isLocking = custObj.status !== 'LOCKED';
                const newStatus = isLocking ? 'LOCKED' : 'ACTIVE';

                (async () => {
                    try {
                        const { error: lockErr } = await client
                            .from('customer')
                            .update({ account_status: newStatus })
                            .eq('id', custObj.dbId);

                        if (lockErr) {
                            console.error('[Customers] Lỗi cập nhật trạng thái:', lockErr);
                            showToast('Không thể cập nhật trạng thái tài khoản trên CSDL!', 'danger');
                            return;
                        }

                        await loadCustomersModuleData();
                        renderCustomersTable();
                        updateCustomerKPIs();
                        showToast(isLocking ? `Đã khóa tài khoản khách hàng ${custObj.name}!` : `Đã mở khóa tài khoản khách hàng ${custObj.name}!`, 'success');
                    } catch (err) {
                        console.error('[Customers] Lỗi cập nhật trạng thái:', err);
                        showToast('Đã xảy ra lỗi khi cập nhật trạng thái!', 'danger');
                    }
                })();
            }
        });

        // Đóng dropdown khi click ra ngoài hoặc khi cuộn trang
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-action-more') && !e.target.closest('#customerGlobalActionDropdown')) {
                closeGlobalDropdown();
            }
        });

        window.addEventListener('resize', closeGlobalDropdown);
        const scrollContainer = document.querySelector('.table-responsive-wrapper');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', closeGlobalDropdown);
        }

        // ====================================================================
        // RENDER BẢNG DỮ LIỆU KHÁCH HÀNG VÀ PHÂN TRANG ĐỘNG (CHUẨN 10 DÒNG/TRANG)
        // ====================================================================
        let currentCustomerPage = 1;
        const CUSTOMER_PAGE_SIZE = 10;
        let currentCustomerFilter = 'ALL'; // ALL, MEMBER, TEMP, LOCKED, COMPLAINT

        function updateCustomerKPIs() {
            const totalEl = document.getElementById('custStatTotal');
            const memberEl = document.getElementById('custStatMember');
            const guestEl = document.getElementById('custStatGuest');
            const lockedEl = document.getElementById('custStatLocked');
            const complaintEl = document.getElementById('custStatComplaint');

            const allCusts = Object.values(customerDatabase);
            const totalCount = allCusts.length;
            const memberCount = allCusts.filter(c => c.status === 'ACTIVE').length;
            const guestCount = allCusts.filter(c => c.status === 'TEMP').length;
            const lockedCount = allCusts.filter(c => c.status === 'LOCKED').length;
            const complaintCount = allCusts.filter(c => c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status === 'Đang xử lý'))).length;

            if (totalEl) totalEl.textContent = totalCount.toLocaleString('vi-VN');
            if (memberEl) memberEl.textContent = memberCount.toLocaleString('vi-VN');
            if (guestEl) guestEl.textContent = guestCount.toLocaleString('vi-VN');
            if (lockedEl) lockedEl.textContent = lockedCount.toLocaleString('vi-VN');
            if (complaintEl) complaintEl.textContent = complaintCount.toLocaleString('vi-VN');
        }

        function renderCustomerPagination(totalPages) {
            const pagBar = document.getElementById('customerPaginationBar');
            const pagControls = document.getElementById('customerPaginationControls');
            if (!pagBar || !pagControls) return;

            if (totalPages <= 1) {
                pagBar.style.display = 'none';
                return;
            }
            pagBar.style.display = 'flex';

            let html = '';
            const prevDisabled = currentCustomerPage === 1 ? 'disabled' : '';
            html += `<button type="button" class="pagination-btn ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>`;

            for (let p = 1; p <= totalPages; p++) {
                const activeClass = p === currentCustomerPage ? 'active' : '';
                html += `<button type="button" class="pagination-btn ${activeClass}" data-page="${p}">${p}</button>`;
            }

            const nextDisabled = currentCustomerPage === totalPages ? 'disabled' : '';
            html += `<button type="button" class="pagination-btn ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>`;

            pagControls.innerHTML = html;

            pagControls.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pageAction = btn.getAttribute('data-page');
                    if (pageAction === 'prev') {
                        if (currentCustomerPage > 1) {
                            currentCustomerPage--;
                            renderCustomersTable();
                        }
                    } else if (pageAction === 'next') {
                        if (currentCustomerPage < totalPages) {
                            currentCustomerPage++;
                            renderCustomersTable();
                        }
                    } else {
                        const targetP = parseInt(pageAction, 10);
                        if (targetP && targetP !== currentCustomerPage) {
                            currentCustomerPage = targetP;
                            renderCustomersTable();
                        }
                    }
                });
            });
        }

        function isRealPetAlert(note) {
            if (!note || note === 'Bình thường') return false;
            const l = note.toLowerCase().trim();
            if (l.includes('thân thiện') || l.includes('ngoan') || l.includes('dễ chăm sóc') || l.includes('dễ thương') || l.includes('năng động') || l.includes('bình thường') || l.includes('lông dài')) {
                return false;
            }
            return true;
        }

        function clearAllCustomerFilters() {
            const searchInput = document.getElementById('custSearchInput');
            const filterTier = document.getElementById('custFilterTier');
            const filterStatus = document.getElementById('custFilterStatus');
            const btnClearCustSearch = document.getElementById('btnClearCustSearch');
            const btnCustClearFilters = document.getElementById('btnCustClearFilters');

            if (searchInput) searchInput.value = '';
            if (btnClearCustSearch) btnClearCustSearch.style.display = 'none';
            if (btnCustClearFilters) btnCustClearFilters.style.display = 'none';
            if (filterTier) filterTier.value = 'ALL';
            if (filterStatus) filterStatus.value = 'ALL';

            currentCustomerFilter = 'ALL';
            currentCustomerPage = 1;

            const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
            if (btnFilterComplaint) btnFilterComplaint.classList.remove('active');
            document.querySelectorAll('#tab-customer-list .kpi-card, .customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
            renderCustomersTable();
        }

        function renderCustomersTable() {
            const tbody = document.getElementById('customerTableTbody');
            if (!tbody) return;

            const query = (document.getElementById('custSearchInput')?.value || '').trim();
            const selectedTier = document.getElementById('custFilterTier')?.value || 'ALL';
            const btnCustClearFilters = document.getElementById('btnCustClearFilters');

            const isAnyFilterActive = Boolean(
                query ||
                selectedTier !== 'ALL' ||
                currentCustomerFilter !== 'ALL'
            );
            if (btnCustClearFilters) {
                btnCustClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
            }

            const allCusts = Object.values(customerDatabase);

            const filtered = allCusts.filter(c => {
                let matchQuery = !query;
                if (query) {
                    const qParts = query.includes(' - ') ? query.split(' - ').map(s => s.trim()) : [query];
                    matchQuery = qParts.some(part => 
                        matchSearch(c.id, part) ||
                        matchSearch(c.name, part) ||
                        matchSearch(c.phone, part) ||
                        matchSearch(c.email, part) ||
                        (c.pets && c.pets.some(p => matchSearch(p.name, part) || matchSearch(p.breed, part) || matchSearch(p.species, part)))
                    );
                }

                const matchTier = (selectedTier === 'ALL') || (c.tier === selectedTier);

                let matchCategory = true;
                if (currentCustomerFilter === 'MEMBER') {
                    matchCategory = (c.status === 'ACTIVE');
                } else if (currentCustomerFilter === 'TEMP') {
                    matchCategory = (c.status === 'TEMP');
                } else if (currentCustomerFilter === 'LOCKED') {
                    matchCategory = (c.status === 'LOCKED');
            } else if (currentCustomerFilter === 'COMPLAINT') {
                    matchCategory = Boolean(c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status !== 'Đã giải quyết')));
                }

                return matchSearch && matchTier && matchCategory;
            });

            const totalPages = Math.ceil(filtered.length / CUSTOMER_PAGE_SIZE) || 1;
            if (currentCustomerPage > totalPages) currentCustomerPage = totalPages;

            const startIdx = (currentCustomerPage - 1) * CUSTOMER_PAGE_SIZE;
            const pageItems = filtered.slice(startIdx, startIdx + CUSTOMER_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px; font-size: 13.5px;">
                            Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại. 
                            <button type="button" id="btnResetCustomerFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                        </td>
                    </tr>
                `;
                document.getElementById('btnResetCustomerFilters')?.addEventListener('click', clearAllCustomerFilters);
                renderCustomerPagination(0);
                return;
            }

            tbody.innerHTML = pageItems.map(c => {
                const isLocked = (c.status === 'LOCKED');
                const activeComplaint = c.complaints && c.complaints.find(tc => tc.status !== 'Đã giải quyết');
                const hasEmergency = Boolean(c.emergencyAlert || activeComplaint);
                const alertPet = (c.pets && Array.isArray(c.pets)) ? c.pets.find(p => isRealPetAlert(p.alertNote)) : null;
                const hasPetAlert = Boolean(alertPet);

                // Vạch border-left duy nhất ở td:first-child theo AGENTS.md
                let firstTdBorder = 'border-left: 3px solid transparent;';
                if (hasEmergency) {
                    firstTdBorder = 'border-left: 3px solid #DC2626 !important;';
                } else if (hasPetAlert) {
                    firstTdBorder = 'border-left: 3px solid #D97706 !important;';
                }

                const rowLockedClass = isLocked ? 'row-locked' : '';
                const rowComplaintClass = hasEmergency ? 'row-highlight-complaint' : '';

                let alertBadgeHtml = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
                if (hasEmergency) {
                    const ticket = activeComplaint || (c.complaints && c.complaints[0]);
                    const ticketId = ticket?.id || '';
                    const ticketStatus = ticket?.status || 'Chưa xử lý';
                    alertBadgeHtml = `<span class="alert-indicator text-danger">• ${ticketId} · ${ticketStatus}</span>`;
                } else if (hasPetAlert && alertPet) {
                    alertBadgeHtml = `<span class="alert-indicator text-warning">• ${alertPet.name}: ${alertPet.alertNote}</span>`;
                }

                let statusBadgeHtml = '<span class="admin-badge badge-success">Đang hoạt động</span>';
                if (isLocked) {
                    statusBadgeHtml = '<span class="admin-badge badge-danger">Bị khóa</span>';
                } else if (c.status === 'TEMP') {
                    statusBadgeHtml = '<span class="admin-badge badge-neutral">Tạm thời</span>';
                }

                const lockBtnText = isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
                const lockBtnClass = isLocked ? 'text-success btn-unlock-user' : 'text-danger btn-lock-user';

                return `
                    <tr class="${rowLockedClass} ${rowComplaintClass}" data-id="${c.id}">
                        <td style="${firstTdBorder}"><strong>${c.id}</strong></td>
                        <td>
                            <div class="user-name-cell">
                                <a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${c.id}">${c.name}</a>
                            </div>
                            <div class="user-sub-cell">${c.email && c.email !== 'Chưa cập nhật' ? c.email : 'Khách tiếp nhận tại quầy'}</div>
                        </td>
                        <td><strong>${c.phone}</strong></td>
                        <td>
                            ${formatCustomerPetsCell(c.pets)}
                        </td>
                        <td>
                            <span class="admin-badge ${c.tierBadgeClass || 'badge-tier-silver'}">${c.tierName || 'Bạc'}</span>
                            <span class="points-val">${(c.points || 0).toLocaleString('vi-VN')} pts</span>
                        </td>
                        <td>${alertBadgeHtml}</td>
                        <td>${statusBadgeHtml}</td>
                        <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                            <button type="button" class="btn-action-more" data-id="${c.id}" title="Tác vụ">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');

            renderCustomerPagination(totalPages);
        }

        // Event delegation trên toàn bộ bảng khách hàng
        const customerTable = document.getElementById('customerDataTable');
        if (customerTable) {
            customerTable.addEventListener('click', (e) => {
                const btnMore = e.target.closest('.btn-action-more');
                if (btnMore) {
                    e.stopPropagation();
                    toggleGlobalDropdown(btnMore);
                    return;
                }

                const userLink = e.target.closest('.user-name-link');
                if (userLink) {
                    e.stopPropagation();
                    const custId = userLink.getAttribute('data-id');
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    sessionStorage.setItem('pawpal_admin_customer_name', customerDatabase[custId]?.name || '');
                    renderDrawerCustomerProfile(custId);
                    switchSubtab('tab-profile');
                    closeGlobalDropdown();
                    return;
                }
            });
        }

        // 6. Modal Tiếp nhận tại quầy (Quick Add) kèm Chống trùng SĐT
        const modalAdd = document.getElementById('modalAddCustomer');
        const btnOpenAdd = document.getElementById('btnOpenAddCustomerModal');
        const btnCloseAdd = document.getElementById('btnCloseAddCustomer');
        const btnCancelAdd = document.getElementById('btnCancelAddCustomer');
        const formAdd = document.getElementById('formAddCustomerQuick');
        const quickAddPhoneInput = document.getElementById('quickAddPhone');
        const quickAddPhoneAlert = document.getElementById('quickAddPhoneAlert');
        const quickAddDupName = document.getElementById('quickAddDupName');
        const quickAddDupId = document.getElementById('quickAddDupId');
        const btnOpenDupCustomer = document.getElementById('btnOpenDupCustomer');
        let dupFoundCustId = null;

        if (btnOpenAdd && modalAdd) {
            btnOpenAdd.addEventListener('click', () => {
                modalAdd.style.display = 'flex';
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
                dupFoundCustId = null;
            });
        }
        function closeAddModal() {
            if (modalAdd) modalAdd.style.display = 'none';
            if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
            dupFoundCustId = null;
        }
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

        if (quickAddPhoneInput) {
            quickAddPhoneInput.addEventListener('input', () => {
                const cleanPhone = quickAddPhoneInput.value.replace(/[^0-9]/g, '').trim();
                if (cleanPhone.length >= 9) {
                    const existing = Object.values(customerDatabase).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone);
                    if (existing) {
                        dupFoundCustId = existing.id;
                        if (quickAddDupName) quickAddDupName.textContent = existing.name;
                        if (quickAddDupId) quickAddDupId.textContent = existing.id;
                        if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'block';
                        return;
                    }
                }
                dupFoundCustId = null;
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
            });
        }

        if (btnOpenDupCustomer) {
            btnOpenDupCustomer.addEventListener('click', () => {
                if (dupFoundCustId) {
                    // Lưu lại trước khi đóng modal vì closeAddModal sẽ reset biến này.
                    const existingCustomerId = dupFoundCustId;
                    const existingCustomer = customerDatabase[existingCustomerId];
                    closeAddModal();
                    sessionStorage.setItem('pawpal_admin_customer_id', existingCustomerId);
                    sessionStorage.setItem('pawpal_admin_customer_name', existingCustomer?.name || '');
                    renderDrawerCustomerProfile(existingCustomerId);
                    switchSubtab('tab-profile');
                }
            });
        }

        if (formAdd) {
            formAdd.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (dupFoundCustId) {
                    showToast(`Số điện thoại này đã thuộc về khách hàng ${customerDatabase[dupFoundCustId]?.name}! Vui lòng kiểm tra lại.`, 'warning');
                    return;
                }

                const nameInput = document.getElementById('quickAddName');
                const name = (nameInput?.value || '').replace(/\s+/g, ' ').trim();
                const phone = (document.getElementById('quickAddPhone')?.value || '').trim();
                const phoneInput = document.getElementById('quickAddPhone');
                const petNameInput = document.getElementById('quickAddPetName');
                const rawPetName = petNameInput?.value || '';
                const petName = rawPetName.replace(/\s+/g, ' ').trim();
                // Pet là trường không bắt buộc; chuỗi chỉ có khoảng trắng được xem như bỏ trống.
                if (rawPetName && !petName) {
                    if (petNameInput) petNameInput.value = '';
                }
                const petSpecies = document.getElementById('quickAddPetSpecies')?.value || 'DOG';
                const petBreed = document.getElementById('quickAddPetBreed')?.value || 'Chưa cập nhật';
                const petWeightInput = document.getElementById('quickAddPetWeight');
                const petWeightRaw = (petWeightInput?.value || '').trim();
                const petWeight = petWeightRaw === '' ? '' : Number(petWeightRaw);
                const validationErrors = [];
                const nameError = !name ? 'Họ tên là thông tin bắt buộc.' : (name.length < 2 ? 'Họ tên phải có ít nhất 2 ký tự.' : '');
                const phoneError = /^\d{10}$/.test(phone) ? '' : 'Số điện thoại phải gồm đúng 10 chữ số.';
                const weightError = petWeightRaw !== '' && (!Number.isFinite(petWeight) || petWeight <= 0) ? 'Cân nặng phải là số lớn hơn 0.' : '';
                if (nameInput) nameInput.setCustomValidity(nameError);
                if (phoneInput) phoneInput.setCustomValidity(phoneError);
                if (petWeightInput) petWeightInput.setCustomValidity(weightError);
                if (nameError) validationErrors.push(nameError);
                if (phoneError) validationErrors.push(phoneError);
                if (weightError) validationErrors.push(weightError);
                if (validationErrors.length) {
                    [nameInput, phoneInput, petWeightInput].find(input => input && input.validationMessage)?.reportValidity();
                    showToast(validationErrors.join(' '), 'warning');
                    return;
                }
                const initialAddress = document.getElementById('quickAddAddress')?.value || 'Tiếp nhận trực tiếp tại quầy Pawpal Center';

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const activationToken = (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
                    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    // 1. Tạo bản ghi khách hàng vào bảng customer
                    const { data: newCust, error: custErr } = await client.from('customer').insert({
                        email: null,
                        phone_main: phone || null,
                        account_status: 'ACTIVE',
                        is_temporary: true,
                        note: 'Khách tiếp nhận nhanh tại quầy.',
                        activation_token: activationToken,
                        activation_token_expires_at: activationExpiresAt
                    }).select().single();

                    if (custErr || !newCust) {
                        console.error('[Customers] Lỗi tạo customer:', custErr);
                        showToast('Không thể tạo hồ sơ khách hàng trên CSDL!', 'danger');
                        return;
                    }

                    // 2. Tạo hồ sơ cá nhân customer_profile
                    await client.from('customer_profile').insert({
                        customer_id: newCust.id,
                        full_name: name,
                        gender: 'OTHER'
                    });

                    // 3. Khởi tạo hội viên customer_membership
                    await client.from('customer_membership').insert({
                        customer_id: newCust.id,
                        total_paw_points: 0
                    });

                    // 4. Lưu địa chỉ nếu có
                    if (initialAddress && initialAddress.trim()) {
                        await client.from('customer_address').insert({
                            customer_id: newCust.id,
                            receiver_name: name,
                            receiver_phone: phone || '',
                            street_address: initialAddress.trim(),
                            is_default: true
                        });
                    }

                    // Ghi nhận yêu cầu SMS để bộ phận tích hợp SMS gửi đúng số và đúng liên kết.
                    await client.from('customer_activation_sms').insert({
                        customer_id: newCust.id,
                        phone: phone,
                        activation_url: `${window.location.origin}/pages/public/activate-account.html?token=${encodeURIComponent(activationToken)}`,
                        status: 'pending'
                    });

                    // 5. Lưu thú cưng nếu có
                    if (petName && petName.trim()) {
                        const spec = petSpecies === 'CAT' ? 'cat' : (petSpecies === 'OTHER' ? 'other' : 'dog');
                        await client.from('pet_profile').insert({
                            customer_id: newCust.id,
                            pet_name: petName.trim(),
                            species: spec,
                            breed: petBreed || 'Chưa cập nhật',
                            weight: petWeight === '' ? null : petWeight
                        });
                    }

                    // Nạp lại toàn bộ dữ liệu từ Supabase
                    await loadCustomersModuleData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã tạo thành công hồ sơ khách hàng ${name} vào CSDL!`, 'success');
                    formAdd.reset();
                    closeAddModal();
                } catch (err) {
                    console.error('[Customers] Lỗi tạo khách hàng:', err);
                    showToast('Đã xảy ra lỗi khi tạo khách hàng!', 'danger');
                }
            });
        }

        // 7. Modal Điều chỉnh Pawpoint (Hỗ trợ cả CỘNG ĐIỂM và TRỪ ĐIỂM, ghi trực tiếp vào Supabase)
        const modalAdjust = document.getElementById('modalAdjustPoints');
        const btnOpenAdjust = document.getElementById('btnOpenAdjustPointsModal');
        const btnCloseAdjust = document.getElementById('btnCloseAdjustPoints');
        const btnCancelAdjust = document.getElementById('btnCancelAdjustPoints');
        const formAdjust = document.getElementById('formAdjustPoints');

        if (btnOpenAdjust && modalAdjust) {
            btnOpenAdjust.addEventListener('click', () => {
                populateCustomerDatalists();
                modalAdjust.style.display = 'flex';
            });
        }
        function closeAdjustModal() {
            if (modalAdjust) modalAdjust.style.display = 'none';
        }
        if (btnCloseAdjust) btnCloseAdjust.addEventListener('click', closeAdjustModal);
        if (btnCancelAdjust) btnCancelAdjust.addEventListener('click', closeAdjustModal);
        
        // Gợi ý thông tin khách hàng thời gian thực khi nhập Tên hoặc SĐT điều chỉnh điểm
        const adjustPhoneInput = document.getElementById('adjustPhone');
        if (adjustPhoneInput) {
            function handleAdjustLookup() {
                const raw = (adjustPhoneInput.value || '').trim();
                const hint = document.getElementById('adjustPhoneCustomerHint');
                if (!hint) return;

                if (!raw) {
                    hint.style.display = 'none';
                    return;
                }

                let clean = raw.replace(/[^0-9]/g, '').trim();
                let matched = null;

                if (raw.includes(' - ')) {
                    const [nPart, pPart] = raw.split(' - ').map(s => s.trim().toLowerCase());
                    matched = Object.values(customerDatabase).find(c => 
                        (c.phone && c.phone.toLowerCase() === pPart) || 
                        (c.name && c.name.toLowerCase() === nPart)
                    );
                    if (matched && matched.phone) {
                        adjustPhoneInput.value = matched.phone;
                        clean = matched.phone.replace(/[^0-9]/g, '').trim();
                    }
                } else if (clean.length >= 9) {
                    matched = Object.values(customerDatabase).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === clean);
                } else {
                    matched = Object.values(customerDatabase).find(c => c.name && c.name.toLowerCase().includes(raw.toLowerCase()));
                }

                if (matched) {
                    hint.innerHTML = `Khách hàng: <strong>${matched.name}</strong> (${matched.tierName}) — Số dư: <strong>${(matched.points || 0).toLocaleString('vi-VN')} pts</strong>`;
                    hint.style.display = 'block';
                } else {
                    hint.style.display = 'none';
                }
            }

            adjustPhoneInput.addEventListener('input', handleAdjustLookup);
            adjustPhoneInput.addEventListener('change', handleAdjustLookup);
        }

        if (formAdjust) {
            formAdjust.addEventListener('submit', async (e) => {
                e.preventDefault();
                const phone = document.getElementById('adjustPhone')?.value || '';
                const type = document.getElementById('adjustType')?.value || 'ADD';
                const pts = parseInt(document.getElementById('adjustPointsVal')?.value || '0', 10);
                const reason = document.getElementById('adjustReason')?.value || 'Điều chỉnh điểm';

                if (pts <= 0) {
                    showToast('Vui lòng nhập số điểm lớn hơn 0!', 'warning');
                    return;
                }

                // Tìm khách hàng có số điện thoại hoặc tên này
                const cleanPhone = phone.replace(/[^0-9]/g, '').trim();
                let matchedCust = Object.values(customerDatabase).find(c => 
                    (cleanPhone.length >= 9 && c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone) ||
                    (c.name && c.name.toLowerCase() === phone.toLowerCase().trim())
                );
                if (!matchedCust && phone.includes(' - ')) {
                    const [nPart, pPart] = phone.split(' - ').map(s => s.trim().toLowerCase());
                    matchedCust = Object.values(customerDatabase).find(c => 
                        (c.phone && c.phone.toLowerCase() === pPart) || 
                        (c.name && c.name.toLowerCase() === nPart)
                    );
                }
                if (!matchedCust) {
                    showToast(`Không tìm thấy khách hàng với thông tin "${phone}"! Vui lòng chọn từ danh sách gợi ý.`, 'warning');
                    return;
                }

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const custDbId = matchedCust.dbId;
                    const currentBalance = Number(matchedCust.points) || 0;
                    const newBalance = type === 'ADD' ? (currentBalance + pts) : Math.max(0, currentBalance - pts);
                    const ptsSigned = type === 'ADD' ? pts : -pts;

                    // 1. Cập nhật số điểm trong customer_membership
                    if (custDbId) {
                        const { error: memErr } = await client
                            .from('customer_membership')
                            .update({ total_paw_points: newBalance })
                            .eq('customer_id', custDbId);

                        if (memErr) {
                            console.warn('[Customers] Lỗi cập nhật customer_membership, thử upsert:', memErr);
                            await client
                                .from('customer_membership')
                                .upsert({ customer_id: custDbId, total_paw_points: newBalance });
                        }

                        // 2. Ghi nhật ký giao dịch điểm vào paw_point_transaction
                        await client.from('paw_point_transaction').insert({
                            customer_id: custDbId,
                            points: ptsSigned,
                            balance_after: newBalance,
                            description: reason
                        });
                    }

                    // Nạp lại toàn bộ dữ liệu từ Supabase
                    await loadCustomersModuleData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    renderPawpointHistory();

                    const currentOpenCustId = sessionStorage.getItem('pawpal_admin_customer_id');
                    if (currentOpenCustId === matchedCust.id) {
                        renderDrawerCustomerProfile(matchedCust.id);
                    }

                    showToast(`Đã ${type === 'ADD' ? 'cộng' : 'trừ'} ${pts} Pawpoint cho khách hàng ${matchedCust.name}! Số dư mới: ${newBalance.toLocaleString('vi-VN')} pts`, 'success');
                    formAdjust.reset();
                    const hint = document.getElementById('adjustPhoneCustomerHint');
                    if (hint) hint.style.display = 'none';
                    closeAdjustModal();
                } catch (err) {
                    console.error('[Customers] Lỗi điều chỉnh điểm:', err);
                    showToast('Đã xảy ra lỗi khi điều chỉnh điểm!', 'danger');
                }
            });
        }

        // 8. Tác vụ Khóa / Mở khóa tài khoản từ menu 3 chấm
        document.querySelectorAll('.btn-lock-user, .btn-unlock-user').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isLock = btn.classList.contains('btn-lock-user');
                const custId = btn.getAttribute('data-id');
                const custObj = customerDatabase[custId];
                if (!custObj || !custObj.dbId) return;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const newStatus = isLock ? 'LOCKED' : 'ACTIVE';
                    const { error: lockErr } = await client
                        .from('customer')
                        .update({ account_status: newStatus })
                        .eq('id', custObj.dbId);

                    if (lockErr) {
                        console.error('[Customers] Lỗi cập nhật trạng thái:', lockErr);
                        showToast('Không thể cập nhật trạng thái trên CSDL!', 'danger');
                        return;
                    }

                    await loadCustomersModuleData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(isLock ? `Đã khóa tài khoản khách hàng ${custObj.name}!` : `Đã mở khóa tài khoản khách hàng ${custObj.name}!`, 'success');
                } catch (err) {
                    console.error('[Customers] Lỗi cập nhật trạng thái:', err);
                    showToast('Đã xảy ra lỗi khi cập nhật trạng thái!', 'danger');
                }

                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
                if (window.lucide) lucide.createIcons();
            });
        });

        // 9. QUẢN LÝ SỔ ĐỊA CHỈ TRONG MODAL 3
        function updateAddressValuesFromDOM() {
            const container = document.getElementById('editCustAddressList');
            if (!container) return;
            const cards = container.querySelectorAll('.address-row-card');
            cards.forEach((card, idx) => {
                if (currentEditingAddresses[idx]) {
                    const input = card.querySelector('.address-input-val');
                    if (input) currentEditingAddresses[idx].address = input.value;
                }
            });
        }

        function renderModalAddressList() {
            const container = document.getElementById('editCustAddressList');
            if (!container) return;

            // Đảm bảo luôn có ít nhất 1 địa chỉ được đánh dấu mặc định
            if (currentEditingAddresses.length > 0 && !currentEditingAddresses.some(a => a.isDefault)) {
                currentEditingAddresses[0].isDefault = true;
            }

            container.innerHTML = currentEditingAddresses.map((item, index) => `
                <div class="address-row-card ${item.isDefault ? 'is-default' : ''}" data-index="${index}">
                    <div class="address-row-meta">
                        <label class="address-radio-label">
                            <input type="radio" name="default_address_radio" value="${index}" ${item.isDefault ? 'checked' : ''}>
                            <span class="default-badge ${item.isDefault ? 'active' : ''}">
                                ${item.isDefault ? 'Địa chỉ mặc định' : 'Đặt làm mặc định'}
                            </span>
                        </label>
                        ${currentEditingAddresses.length > 1 && !item.isDefault ? `
                            <button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>
                        ` : ''}
                    </div>
                    <input type="text" class="admin-input address-input-val" value="${item.address}" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP..." required>
                </div>
            `).join('');

            // Sự kiện chọn radio làm địa chỉ mặc định
            container.querySelectorAll('input[name="default_address_radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const chosenIdx = parseInt(e.target.value, 10);
                    updateAddressValuesFromDOM();
                    currentEditingAddresses.forEach((addr, idx) => {
                        addr.isDefault = (idx === chosenIdx);
                    });
                    renderModalAddressList();
                });
            });

            // Sự kiện xóa địa chỉ
            container.querySelectorAll('.btn-remove-address').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const delIdx = parseInt(btn.getAttribute('data-index'), 10);
                    updateAddressValuesFromDOM();
                    currentEditingAddresses.splice(delIdx, 1);
                    if (!currentEditingAddresses.some(a => a.isDefault) && currentEditingAddresses.length > 0) {
                        currentEditingAddresses[0].isDefault = true;
                    }
                    renderModalAddressList();
                });
            });
        }

        // Bắt sự kiện nút Thêm địa chỉ trong modal
        const btnAddAddressItem = document.getElementById('btnAddAddressItem');
        if (btnAddAddressItem) {
            btnAddAddressItem.addEventListener('click', () => {
                updateAddressValuesFromDOM();
                const isFirst = currentEditingAddresses.length === 0;
                currentEditingAddresses.push({
                    address: '',
                    isDefault: isFirst
                });
                renderModalAddressList();
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#editCustAddressList .address-input-val');
                    if (inputs.length > 0) {
                        inputs[inputs.length - 1].focus();
                    }
                }, 50);
            });
        }

        // 10. MODAL 3: CHỈNH SỬA HỒ SƠ KHÁCH HÀNG (HỌ TÊN, SĐT, EMAIL, GIỚI TÍNH, NGÀY SINH, HẠNG THÀNH VIÊN, ĐỊA CHỈ)
        const modalEdit = document.getElementById('modalEditCustomer');
        const btnOpenEdit = document.getElementById('btnOpenEditProfileModal');
        const btnCloseEdit = document.getElementById('btnCloseEditCustomer');
        const btnCancelEdit = document.getElementById('btnCancelEditCustomer');
        const formEdit = document.getElementById('formEditCustomer');

        function openEditCustomerModal(custId) {
            if (!modalEdit) return;
            const currentId = custId || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const data = customerDatabase[currentId] || {};

            if (document.getElementById('editCustId')) document.getElementById('editCustId').value = currentId;
            if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = data.name || '';
            if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = data.phone || '';
            if (document.getElementById('editCustEmail')) document.getElementById('editCustEmail').value = data.email || '';
            if (document.getElementById('editCustGender')) document.getElementById('editCustGender').value = data.gender || 'Nam';
            if (document.getElementById('editCustTier')) document.getElementById('editCustTier').value = data.tier || 'GOLD';
            
            const dob = data.dob || '';
            if (dob && dob.includes('/')) {
                const parts = dob.split('/');
                if (parts.length === 3 && document.getElementById('editCustDob')) {
                    document.getElementById('editCustDob').value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            // Nạp danh sách địa chỉ cho khách hàng
            const existingAddresses = data.addresses || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
            ];
            currentEditingAddresses = JSON.parse(JSON.stringify(existingAddresses));
            renderModalAddressList();

            modalEdit.style.display = 'flex';
        }

        function closeEditModal() {
            if (modalEdit) modalEdit.style.display = 'none';
        }

        if (btnOpenEdit) {
            btnOpenEdit.addEventListener('click', () => openEditCustomerModal());
        }
        if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

        // Nút Sửa hồ sơ từ menu 3 chấm ngoài bảng danh sách
        document.querySelectorAll('.btn-edit-user-table').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = btn.getAttribute('data-id');
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
                openEditCustomerModal(custId);
            });
        });

        if (formEdit) {
            formEdit.addEventListener('submit', async (e) => {
                e.preventDefault();
                const custId = document.getElementById('editCustId')?.value || 'CUST-001';
                const newName = document.getElementById('editCustFullName')?.value || '';
                const newPhone = document.getElementById('editCustPhone')?.value || '';
                const newEmail = document.getElementById('editCustEmail')?.value || '';
                const newGender = document.getElementById('editCustGender')?.value || 'Nam';
                const newTier = document.getElementById('editCustTier')?.value || 'GOLD';
                const newDobRaw = document.getElementById('editCustDob')?.value || '';

                // Cập nhật giá trị địa chỉ từ DOM
                updateAddressValuesFromDOM();
                const validAddresses = currentEditingAddresses.filter(a => a.address.trim() !== '');
                if (validAddresses.length === 0) {
                    showToast('Vui lòng nhập ít nhất một địa chỉ nhận hàng!', 'warning');
                    return;
                }
                if (!validAddresses.some(a => a.isDefault)) {
                    validAddresses[0].isDefault = true;
                }

                const custObj = customerDatabase[custId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    if (custDbId) {
                        // 1. Cập nhật bảng customer
                        await client.from('customer').update({
                            email: newEmail || null,
                            phone_main: newPhone || null
                        }).eq('id', custDbId);

                        // 2. Cập nhật bảng customer_profile
                        const genderVal = (newGender === 'Nữ' || newGender === 'FEMALE') ? 'FEMALE' : ((newGender === 'Nam' || newGender === 'MALE') ? 'MALE' : 'OTHER');
                        await client.from('customer_profile').upsert({
                            customer_id: custDbId,
                            full_name: newName,
                            gender: genderVal,
                            date_of_birth: newDobRaw || null
                        });

                        // 3. Cập nhật sổ địa chỉ customer_address
                        await client.from('customer_address').delete().eq('customer_id', custDbId);
                        const addrInserts = validAddresses.map(a => ({
                            customer_id: custDbId,
                            receiver_name: newName,
                            receiver_phone: newPhone,
                            street_address: a.address,
                            is_default: !!a.isDefault
                        }));
                        if (addrInserts.length > 0) {
                            await client.from('customer_address').insert(addrInserts);
                        }
                    }

                    // Nạp lại toàn bộ dữ liệu từ Supabase
                    await loadCustomersModuleData();
                    renderDrawerCustomerProfile(custId);
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã cập nhật thành công hồ sơ của khách hàng ${newName} vào CSDL!`, 'success');
                    closeEditModal();
                } catch (err) {
                    console.error('[Customers] Lỗi cập nhật hồ sơ khách hàng:', err);
                    showToast('Đã xảy ra lỗi khi cập nhật hồ sơ!', 'danger');
                }
            });
        }

        // 11. MODAL 4: THÊM THÚ CƯNG MỚI (ADD PET)
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const btnCloseAddPet = document.getElementById('btnCloseAddPet');
        const btnCancelAddPet = document.getElementById('btnCancelAddPet');
        const formAddPet = document.getElementById('formAddPet');

        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                modalAddPet.style.display = 'flex';
            });
        }
        function closeAddPetModal() {
            if (modalAddPet) modalAddPet.style.display = 'none';
        }
        if (btnCloseAddPet) btnCloseAddPet.addEventListener('click', closeAddPetModal);
        if (btnCancelAddPet) btnCancelAddPet.addEventListener('click', closeAddPetModal);

        if (formAddPet) {
            formAddPet.addEventListener('submit', async (e) => {
                e.preventDefault();
                const petName = document.getElementById('addPetName')?.value || 'Bé cưng';
                const species = document.getElementById('addPetSpecies')?.value || 'Chó';
                const breed = document.getElementById('addPetBreed')?.value || '';
                const weight = document.getElementById('addPetWeight')?.value || '';
                const vaccine = document.getElementById('addPetVaccine')?.value || 'Chưa cập nhật';
                const alertNote = document.getElementById('addPetAlert')?.value || 'Bình thường';

                const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                const custObj = customerDatabase[currentCustId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const spec = (species === 'Mèo' || species === 'CAT') ? 'cat' : ((species === 'Thỏ' || species === 'RABBIT') ? 'rabbit' : ((species === 'Khác' || species === 'OTHER') ? 'other' : 'dog'));

                    if (custDbId) {
                        const { error: petErr } = await client.from('pet_profile').insert({
                            customer_id: custDbId,
                            pet_name: petName,
                            species: spec,
                            breed: breed || 'Chưa cập nhật',
                            weight: weight ? parseFloat(weight) : null,
                            vaccination_history: vaccine || 'Chưa cập nhật',
                            allergy: (alertNote && alertNote !== 'Bình thường') ? alertNote : 'Không'
                        });

                        if (petErr) {
                            console.error('[Customers] Lỗi thêm thú cưng:', petErr);
                            showToast('Không thể thêm thú cưng vào CSDL!', 'danger');
                            return;
                        }
                    }

                    // Nạp lại toàn bộ dữ liệu từ Supabase
                    await loadCustomersModuleData();
                    renderDrawerPets(currentCustId);
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã thêm thành công bé cưng ${petName} vào CSDL!`, 'success');
                    formAddPet.reset();
                    closeAddPetModal();
                } catch (err) {
                    console.error('[Customers] Lỗi thêm thú cưng:', err);
                    showToast('Đã xảy ra lỗi khi thêm thú cưng!', 'danger');
                }
            });
        }

        // 12. MODAL 5: CHỈNH SỬA THÔNG TIN THÚ CƯNG (EDIT PET)
        const modalEditPet = document.getElementById('modalEditPet');
        const btnCloseEditPet = document.getElementById('btnCloseEditPet');
        const btnCancelEditPet = document.getElementById('btnCancelEditPet');
        const formEditPet = document.getElementById('formEditPet');
        let currentEditPetIndex = null;

        function openEditPetModal(custId, petIndex) {
            if (!modalEditPet) return;
            currentEditingPetCustId = custId;
            currentEditPetIndex = petIndex;
            const pet = customerDatabase[custId]?.pets[petIndex];
            if (!pet) return;

            if (document.getElementById('editPetId')) document.getElementById('editPetId').value = pet.id || '';
            if (document.getElementById('editPetName')) document.getElementById('editPetName').value = pet.name || '';
            if (document.getElementById('editPetSpecies')) document.getElementById('editPetSpecies').value = pet.species || 'Chó';
            if (document.getElementById('editPetBreed')) document.getElementById('editPetBreed').value = pet.breed || '';
            if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weight || '';
            if (document.getElementById('editPetVaccine')) document.getElementById('editPetVaccine').value = pet.vaccine || '';
            if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.alertNote || 'Bình thường';

            modalEditPet.style.display = 'flex';
        }

        function closeEditPetModal() {
            if (modalEditPet) modalEditPet.style.display = 'none';
        }
        if (btnCloseEditPet) btnCloseEditPet.addEventListener('click', closeEditPetModal);
        if (btnCancelEditPet) btnCancelEditPet.addEventListener('click', closeEditPetModal);

        if (formEditPet) {
            formEditPet.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!currentEditingPetCustId || currentEditPetIndex === null) return;
                const pet = customerDatabase[currentEditingPetCustId]?.pets[currentEditPetIndex];
                if (!pet) return;

                const newPetName = document.getElementById('editPetName')?.value || pet.name;
                const newSpecies = document.getElementById('editPetSpecies')?.value || pet.species;
                const newBreed = document.getElementById('editPetBreed')?.value || '';
                const newWeight = document.getElementById('editPetWeight')?.value || '';
                const newVaccine = document.getElementById('editPetVaccine')?.value || 'Chưa cập nhật';
                const newAlert = document.getElementById('editPetAlert')?.value || 'Bình thường';

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const spec = (newSpecies === 'Mèo' || newSpecies === 'CAT') ? 'cat' : ((newSpecies === 'Thỏ' || newSpecies === 'RABBIT') ? 'rabbit' : ((newSpecies === 'Khác' || newSpecies === 'OTHER') ? 'other' : 'dog'));
                    if (pet.dbId) {
                        const { error: petErr } = await client.from('pet_profile').update({
                            pet_name: newPetName,
                            species: spec,
                            breed: newBreed || 'Chưa cập nhật',
                            weight: newWeight ? parseFloat(newWeight) : null,
                            vaccination_history: newVaccine || 'Chưa cập nhật',
                            allergy: (newAlert && newAlert !== 'Bình thường') ? newAlert : 'Không'
                        }).eq('id', pet.dbId);

                        if (petErr) {
                            console.error('[Customers] Lỗi cập nhật thú cưng:', petErr);
                            showToast('Không thể cập nhật thú cưng trên CSDL!', 'danger');
                            return;
                        }
                    }

                    await loadCustomersModuleData();
                    renderDrawerPets(currentEditingPetCustId);
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã cập nhật thành công thông tin bé cưng ${newPetName} vào CSDL!`, 'success');
                    closeEditPetModal();
                } catch (err) {
                    console.error('[Customers] Lỗi cập nhật thú cưng:', err);
                    showToast('Đã xảy ra lỗi khi cập nhật thú cưng!', 'danger');
                }
            });
        }

        // 13. Lưu ghi chú khách hàng trong Drawer
        const btnSaveNote = document.getElementById('btnSaveCustomerNote');
        if (btnSaveNote) {
            btnSaveNote.addEventListener('click', async () => {
                const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                const noteVal = document.getElementById('drawerCustNote')?.value || '';
                const custObj = customerDatabase[currentCustId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    if (custDbId) {
                        const { error: noteErr } = await client.from('customer').update({ note: noteVal }).eq('id', custDbId);
                        if (noteErr) {
                            console.error('[Customers] Lỗi lưu ghi chú:', noteErr);
                            showToast('Không thể lưu ghi chú vào CSDL!', 'danger');
                            return;
                        }
                    }
                    await loadCustomersModuleData();
                    showToast('Đã lưu thành công ghi chú khách hàng vào CSDL!', 'success');
                } catch (err) {
                    console.error('[Customers] Lỗi lưu ghi chú:', err);
                    showToast('Đã xảy ra lỗi khi lưu ghi chú!', 'danger');
                }
            });
        }

        // 14. Gửi lại SMS kích hoạt tài khoản
        const btnResendSms = document.getElementById('btnResendSmsToken');
        if (btnResendSms) {
            btnResendSms.addEventListener('click', () => {
                const phone = document.getElementById('profileValPhone')?.textContent || 'khách hàng';
                showToast(`Đã gửi lại tin nhắn SMS chứa liên kết tạo mật khẩu đến số ${phone}!`);
            });
        }

        // 15. Điều hướng liên kết chéo trên đầu Hồ sơ (Cross-module quick actions)
        document.querySelector('.btn-link-service')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetBooking = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                petName: (cust.pets && cust.pets.length > 0) ? cust.pets[0].name : '',
                pets: cust.pets || []
            };
            sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify(presetBooking));
            showToast(`Đã thiết lập thông tin đặt lịch cho ${cust.name}, chuyển sang phân hệ Dịch vụ!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-order')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const defaultAddr = cust.addresses?.find(a => a.isDefault)?.address || cust.addresses?.[0]?.address || '';
            const presetOrder = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                address: defaultAddr
            };
            sessionStorage.setItem('pawpal_admin_order_preset', JSON.stringify(presetOrder));
            sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
            sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
            showToast(`Đã thiết lập thông tin lên đơn cho ${cust.name}, chuyển sang phân hệ Bán hàng!`);
            setTimeout(() => {
                window.location.hash = '#tab-order-list';
            }, 300);
        });

        document.querySelector('.btn-link-complaint')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetComplaint = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || ''
            };
            sessionStorage.setItem('pawpal_admin_complaint_preset', JSON.stringify(presetComplaint));
            showToast(`Mở phiếu tiếp nhận khiếu nại cho ${cust.name} tại phân hệ Khiếu nại!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
            if (btn) btn.click();
        });

        // 16. THANH THÔNG BÁO KHÁCH HÀNG CÓ KHIẾU NẠI (DẢI MỎNG ALERT TONE, THUẦN CHỮ)
        function renderComplaintBar() {
            const container = document.getElementById('custComplaintItemsContainer');
            const bar = document.getElementById('custComplaintAlertBar');
            if (!container) return;

            const activeComplaints = [];
            Object.values(customerDatabase).forEach(cust => {
                if (cust.complaints && cust.complaints.length > 0) {
                    cust.complaints.filter(tc => tc.status === 'Đang xử lý').forEach(tc => {
                        activeComplaints.push({
                            id: cust.id,
                            name: cust.name,
                            ticket: tc.id,
                            reason: tc.issue
                        });
                    });
                }
            });

            if (activeComplaints.length === 0) {
                if (bar) bar.style.display = 'none';
                return;
            }

            if (bar) bar.style.display = 'flex';

            container.innerHTML = activeComplaints.map(item => `
                <div class="complaint-item-tag" data-id="${item.id}" title="Xem hồ sơ ${item.name} (${item.ticket})">
                    <span class="tag-ticket">${item.ticket}</span>
                    <span class="tag-cust">${item.name}</span>
                    <span class="tag-reason">(${item.reason})</span>
                </div>
            `).join('');

            container.querySelectorAll('.complaint-item-tag').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const custId = tag.getAttribute('data-id');
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    renderDrawerCustomerProfile(custId);
                    switchSubtab('tab-profile');
                });
            });
        }

        function persistCustomersData() {
            // Placeholder cho đồng bộ local cache nếu cần
        }

        function persistPawpointHistory() {
            // Placeholder cho đồng bộ local cache nếu cần
        }

        // 17. Bộ lọc bảng và tương tác thẻ KPI 1 chạm
        const filterStatusSelect = document.getElementById('custFilterStatus');
        const filterTierSelect = document.getElementById('custFilterTier');
        const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
        const btnComplaintStripFilter = document.getElementById('btnFilterComplaintQuick');
        const searchInput = document.getElementById('custSearchInput');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });

            searchInput.addEventListener('change', () => {
                const val = (searchInput.value || '').trim();
                if (val.includes(' - ')) {
                    const [nPart, pPart] = val.split(' - ').map(s => s.trim().toLowerCase());
                    const matched = Object.values(customerDatabase).find(c => 
                        (c.phone && c.phone.toLowerCase() === pPart) || 
                        (c.name && c.name.toLowerCase() === nPart)
                    );
                    if (matched) {
                        sessionStorage.setItem('pawpal_admin_customer_id', matched.id);
                        sessionStorage.setItem('pawpal_admin_customer_name', matched.name);
                        renderDrawerCustomerProfile(matched.id);
                    }
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterStatusSelect) {
            filterStatusSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'ALL') currentCustomerFilter = 'ALL';
                else if (val === 'ACTIVE') currentCustomerFilter = 'MEMBER';
                else if (val === 'TEMP') currentCustomerFilter = 'TEMP';
                else if (val === 'LOCKED') currentCustomerFilter = 'LOCKED';
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterTierSelect) {
            filterTierSelect.addEventListener('change', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnFilterComplaint) {
            btnFilterComplaint.addEventListener('click', () => {
                if (currentCustomerFilter === 'COMPLAINT') {
                    currentCustomerFilter = 'ALL';
                    btnFilterComplaint.classList.remove('active');
                } else {
                    currentCustomerFilter = 'COMPLAINT';
                    btnFilterComplaint.classList.add('active');
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnComplaintStripFilter) {
            btnComplaintStripFilter.addEventListener('click', () => {
                currentCustomerFilter = 'COMPLAINT';
                if (btnFilterComplaint) btnFilterComplaint.classList.add('active');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => {
                    c.classList.toggle('active', c.getAttribute('data-kpi-filter') === 'COMPLAINT');
                });
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        document.getElementById('btnCustClearFilters')?.addEventListener('click', clearAllCustomerFilters);

        document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentCustomerFilter = filter;
                if (btnFilterComplaint) {
                    btnFilterComplaint.classList.toggle('active', filter === 'COMPLAINT');
                }
                if (filterStatusSelect) {
                    if (filter === 'ALL') filterStatusSelect.value = 'ALL';
                    else if (filter === 'LOCKED') filterStatusSelect.value = 'LOCKED';
                    else if (filter === 'TEMP') filterStatusSelect.value = 'TEMP';
                    else if (filter === 'MEMBER') filterStatusSelect.value = 'ACTIVE';
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        });

        // ====================================================================
        // XUẤT BÁO CÁO DỮ LIỆU KHÁCH HÀNG VÀ LỊCH SỬ PAWPOINT (CSV / EXCEL UTF-8 BOM)
        // ====================================================================
        function getCustomersInCurrentFilter() {
            const query = (document.getElementById('custSearchInput')?.value || '').trim();
            const selectedTier = document.getElementById('custFilterTier')?.value || 'ALL';
            const selectedStatus = document.getElementById('custFilterStatus')?.value || 'ALL';
            const matchSearch = (value, term) => String(value || '').toLowerCase().includes(String(term || '').toLowerCase());

            return Object.values(customerDatabase).filter(c => {
                const matchesQuery = !query || [c.id, c.name, c.phone, c.email, ...(c.pets || []).flatMap(p => [p.name, p.breed, p.species])]
                    .some(value => matchSearch(value, query));
                const matchesTier = selectedTier === 'ALL' || c.tier === selectedTier;
                const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
                const matchesCategory = currentCustomerFilter !== 'COMPLAINT' || Boolean(c.emergencyAlert || (c.complaints || []).some(t => t.status !== 'Đã giải quyết'));
                return matchesQuery && matchesTier && matchesStatus && matchesCategory;
            });
        }

        function exportCustomersToCSV() {
            const allCusts = getCustomersInCurrentFilter();
            if (!allCusts || allCusts.length === 0) {
                showToast('Không có dữ liệu khách hàng để xuất!', 'warning');
                return;
            }

            const headers = [
                'Mã khách hàng',
                'Họ và tên',
                'Số điện thoại',
                'Email',
                'Giới tính',
                'Ngày sinh',
                'Hạng thành viên',
                'Điểm Pawpoint',
                'Trạng thái tài khoản',
                'Số lượng thú cưng',
                'Danh sách thú cưng',
                'Địa chỉ mặc định',
                'Ghi chú'
            ];

            const rows = allCusts.map(c => {
                const petsList = (c.pets || []).map(p => `${p.name} (${p.species || 'Chó/Mèo'})`).join('; ');
                const defaultAddr = (c.addresses || []).find(a => a.isDefault)?.address || (c.addresses?.[0]?.address || '');
                const statusText = c.status === 'ACTIVE' ? 'Đang hoạt động' : (c.status === 'TEMP' ? 'Tài khoản tạm' : 'Bị khóa');

                return [
                    c.id || '',
                    c.name || '',
                    c.phone || '',
                    c.email || '',
                    c.gender || '',
                    c.dob || '',
                    c.tierName || c.tier || '',
                    c.points || 0,
                    statusText,
                    (c.pets || []).length,
                    petsList,
                    defaultAddr,
                    c.note || ''
                ];
            });

            const csvRows = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ];

            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            link.setAttribute('href', url);
            link.setAttribute('download', `Pawpal_Danh_Sach_Khach_Hang_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`Đã xuất báo cáo ${allCusts.length} khách hàng theo bộ lọc hiện tại ra file CSV!`);
        }

        function exportPawpointHistoryToCSV() {
            if (!pawpointHistory || pawpointHistory.length === 0) {
                showToast('Không có lịch sử điểm để xuất!', 'warning');
                return;
            }

            const headers = [
                'Mã giao dịch',
                'Thời gian',
                'Mã khách hàng',
                'Tên khách hàng',
                'Số điện thoại',
                'Loại giao dịch',
                'Số điểm',
                'Số dư sau giao dịch',
                'Lý do điều chỉnh'
            ];

            const rows = pawpointHistory.map(item => [
                item.id || '',
                item.time || '',
                item.custId || '',
                item.custName || '',
                item.phone || '',
                item.type === 'ADD' ? 'Cộng điểm' : 'Trừ điểm',
                (item.type === 'ADD' ? '+' : '-') + item.points + ' pts',
                Number(item.balance).toLocaleString('vi-VN') + ' pts',
                item.reason || ''
            ]);

            const csvRows = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ];

            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            link.setAttribute('href', url);
            link.setAttribute('download', `Pawpal_Lich_Su_Pawpoint_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`Đã xuất lịch sử ${pawpointHistory.length} giao dịch Pawpoint ra file CSV!`);
        }

        document.getElementById('btnExportCustomerReport')?.addEventListener('click', exportCustomersToCSV);
        document.getElementById('btnExportPawpointHistory')?.addEventListener('click', exportPawpointHistoryToCSV);

        const pawpointSearchInput = document.getElementById('pawpointSearchInput');
        if (pawpointSearchInput) {
            pawpointSearchInput.addEventListener('input', renderPawpointHistory);
        }
        const pawpointFilterType = document.getElementById('pawpointFilterType');
        if (pawpointFilterType) {
            pawpointFilterType.addEventListener('change', renderPawpointHistory);
        }

        // 18. THIẾT LẬP KÊNH ĐỒNG BỘ REALTIME TỪ SUPABASE
        function setupCustomersRealtimeSubscription() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) return;

                if (window._custRealtimeChannel) {
                    client.removeChannel(window._custRealtimeChannel);
                }

                window._custRealtimeChannel = client.channel('admin_customers_realtime')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer' }, async () => {
                        await loadCustomersModuleData();
                        renderCustomersTable();
                        updateCustomerKPIs();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profile' }, async () => {
                        await loadCustomersModuleData();
                        renderCustomersTable();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_membership' }, async () => {
                        await loadCustomersModuleData();
                        renderCustomersTable();
                        updateCustomerKPIs();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_address' }, async () => {
                        await loadCustomersModuleData();
                        const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                        if (currentOpenId) renderDrawerAddresses(currentOpenId);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_profile' }, async () => {
                        await loadCustomersModuleData();
                        renderCustomersTable();
                        const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                        if (currentOpenId) renderDrawerPets(currentOpenId);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, async () => {
                        await loadCustomersModuleData();
                        renderComplaintBar();
                        renderCustomersTable();
                        updateCustomerKPIs();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'paw_point_transaction' }, async () => {
                        await loadCustomersModuleData();
                        renderPawpointHistory();
                    })
                    .subscribe();
            } catch (err) {
                console.warn('[Customers] Không thể thiết lập Supabase Realtime:', err);
            }
        }

        // Nạp 100% dữ liệu từ Supabase Live Database
        await loadCustomersModuleData();

        // Khởi tạo render bảng, 5 thẻ KPI, dải khiếu nại và lịch sử Pawpoint
        renderCustomersTable();
        updateCustomerKPIs();
        renderComplaintBar();
        renderPawpointHistory();

        // 19. KHỞI TẠO VÀ KHÔI PHỤC TRẠNG THÁI KHI F5 / RELOAD
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

        const firstCustId = Object.keys(customerDatabase)[0] || 'CUST-001';
        const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id') || firstCustId;
        renderDrawerCustomerProfile(savedCustId);

        if (initialSubtab !== 'tab-list') {
            switchSubtab(initialSubtab);
        }

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab)) {
            switchDrawerTab(savedDrawerTab);
        }

        // Kích hoạt lắng nghe Realtime Supabase
        setupCustomersRealtimeSubscription();

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();
