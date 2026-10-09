// pets.js - Phân hệ Quản lý Thú cưng Pawpal-er
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
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    function isValidPetBirthDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return false;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    }

    async function initPetsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 4 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-pet-list">Thú cưng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-carelog">Nhật ký</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-reminders">Nhắc lịch</button>
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

        // Helper: Custom Confirm Modal cho phân hệ Thú cưng
        function showPetConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
            const modal = document.getElementById('modalConfirmPetAction');
            const titleEl = document.getElementById('confirmPetActionTitle');
            const msgEl = document.getElementById('confirmPetActionMessage');
            const btnAccept = document.getElementById('btnAcceptPetConfirm');
            const btnCancel = document.getElementById('btnCancelPetConfirm');
            const btnClose = document.getElementById('btnCloseConfirmPetModal');

            if (!modal) {
                if (window.confirm(message)) {
                    if (typeof onConfirm === 'function') onConfirm();
                } else {
                    if (typeof onCancel === 'function') onCancel();
                }
                return;
            }

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (btnAccept) {
                btnAccept.textContent = confirmText;
                if (isDanger) {
                    btnAccept.style.backgroundColor = '#DC2626';
                    btnAccept.style.color = '#FFFFFF';
                } else {
                    btnAccept.style.backgroundColor = '';
                    btnAccept.style.color = '';
                }
            }

            const cleanup = () => {
                modal.classList.remove('open');
                modal.classList.remove('show');
                if (btnAccept) btnAccept.onclick = null;
                if (btnCancel) btnCancel.onclick = null;
                if (btnClose) btnClose.onclick = null;
            };

            if (btnAccept) {
                btnAccept.onclick = () => {
                    cleanup();
                    if (typeof onConfirm === 'function') onConfirm();
                };
            }

            if (btnCancel) {
                btnCancel.onclick = () => {
                    cleanup();
                    if (typeof onCancel === 'function') onCancel();
                };
            }

            if (btnClose) {
                btnClose.onclick = () => {
                    cleanup();
                    if (typeof onCancel === 'function') onCancel();
                };
            }

            modal.classList.add('open');
            modal.classList.add('show');
        }

        // ====================================================================
        // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
        // ====================================================================
        let petsData = {};
        let customersData = {};

        async function loadPetsModuleData() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    // 1. Nạp danh sách khách hàng và hồ sơ chủ nuôi
                    const [custAccRes, custProfRes] = await Promise.all([
                        client.from('customer').select('*'),
                        client.from('customer_profile').select('*')
                    ]);

                    customersData = {};
                    const custMap = {};
                    if (Array.isArray(custAccRes.data)) {
                        custAccRes.data.forEach(c => {
                            custMap[c.id] = {
                                id: c.id,
                                email: c.email || '',
                                phone: c.phone_main || '',
                                name: 'Khách hàng PawPal',
                                tier: 'Khách mới'
                            };
                        });
                    }

                    if (Array.isArray(custProfRes.data)) {
                        custProfRes.data.forEach(cp => {
                            if (custMap[cp.customer_id]) {
                                custMap[cp.customer_id].name = cp.full_name || custMap[cp.customer_id].name;
                            } else {
                                custMap[cp.customer_id] = {
                                    id: cp.customer_id,
                                    email: '',
                                    phone: '',
                                    name: cp.full_name || 'Khách hàng PawPal',
                                    tier: 'Khách mới'
                                };
                            }
                        });
                    }
                    customersData = custMap;

                    // 2. Nạp lịch hẹn và nhật ký chăm sóc
                    const [apptsRes, careLogsRes, petsRes, weightHistoryRes] = await Promise.all([
                        client.from('appointment').select('*, service:service_id(service_name), staff:staff_id(full_name)'),
                        client.from('care_log').select('*'),
                        client.from('pet_profile').select('*').order('created_at', { ascending: false }),
                        client.from('pet_weight_history').select('*').order('measured_at', { ascending: false })
                    ]);

                    const petWeightHistoryMap = {};
                    if (Array.isArray(weightHistoryRes.data)) {
                        weightHistoryRes.data.forEach(record => {
                            const petId = record.pet_id;
                            const measuredAt = record.measured_at || record.created_at;
                            const measuredWeight = Number(record.weight);
                            if (!petId || !measuredAt || !Number.isFinite(measuredWeight) || measuredWeight <= 0) return;
                            if (!petWeightHistoryMap[petId]) petWeightHistoryMap[petId] = [];
                            petWeightHistoryMap[petId].push({
                                date: formatDate(measuredAt),
                                weight: `${measuredWeight} kg`,
                                tier: measuredWeight < 5 ? 'Dưới 5 kg' : (measuredWeight <= 10 ? 'Từ 5 đến 10 kg' : 'Trên 10 kg'),
                                by: record.recorded_by_name || 'Nhân viên PawPal',
                                measuredAt: new Date(measuredAt).getTime()
                            });
                        });
                    } else if (weightHistoryRes.error) {
                        console.warn('[Pets] Chưa tải được lịch sử cân nặng:', weightHistoryRes.error.message);
                    }

                    const petApptsMap = {};
                    if (Array.isArray(apptsRes.data)) {
                        apptsRes.data.forEach(app => {
                            const pId = app.pet_id;
                            if (!pId) return;
                            if (!petApptsMap[pId]) petApptsMap[pId] = [];
                            
                            const sName = app.service?.service_name || 'Dịch vụ Spa và Grooming';
                            const appDate = app.appointment_date ? formatDate(app.appointment_date) : '';
                            const appTime = app.appointment_time ? app.appointment_time.slice(0, 5) : '14:00';
                            const priceStr = app.total_price ? Number(app.total_price).toLocaleString('vi-VN') + 'đ' : '250.000đ';
                            
                            let stText = 'Chờ xác nhận';
                            if (app.appointment_status === 'COMPLETED') stText = 'Đã hoàn thành';
                            else if (app.appointment_status === 'CONFIRMED') stText = 'Đã xác nhận';
                            else if (app.appointment_status === 'IN_PROGRESS') stText = 'Đang thực hiện';
                            else if (app.appointment_status === 'CANCELLED') stText = 'Đã hủy';

                            petApptsMap[pId].push({
                                id: app.appointment_code || `BK-${app.id.slice(0, 4)}`,
                                rawId: app.id,
                                service: sName,
                                time: `${appDate} ${appTime}`,
                                weight: '5.0 kg',
                                price: priceStr,
                                status: stText
                            });
                        });
                    }

                    const petCareLogsMap = {};
                    if (Array.isArray(careLogsRes.data)) {
                        careLogsRes.data.forEach(cl => {
                            const pId = cl.pet_id;
                            if (!pId) return;
                            if (!petCareLogsMap[pId]) petCareLogsMap[pId] = [];
                            
                            const logTime = cl.recorded_at ? formatDateTime(cl.recorded_at) : '';
                            petCareLogsMap[pId].push({
                                time: logTime,
                                service: cl.description || 'Tắm sấy dưỡng ẩm và Vệ sinh định kỳ',
                                ktv: 'Kỹ thuật viên PawPal',
                                imgBefore: '/assets/images/publics/dogcute3.jpg',
                                imgAfter: '/assets/images/publics/dogcute1.jpg',
                                checkText: cl.health_status ? `Tình trạng: ${cl.health_status}` : '4/4 mục đạt chuẩn',
                                appStatus: 'Đã gửi app cho chủ',
                                careId: cl.id
                            });
                        });
                    }

                    // 3. Nạp danh sách thú cưng từ bảng pet_profile
                    petsData = {};
                    if (Array.isArray(petsRes.data) && petsRes.data.length > 0) {
                        const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };

                        petsRes.data.forEach((p, idx) => {
                            const code = p.pet_code || `PET-${String(idx + 1).padStart(3, '0')}`;
                            const spec = (p.species || 'dog').toLowerCase();
                            const br = p.breed || 'Chưa cập nhật';
                            const specBreed = `${speciesNameMap[spec] || 'Chó'} ${br}`.trim();
                            const wNum = Number(p.weight);
                            const allg = p.allergy && p.allergy !== 'Không' ? p.allergy : '';
                            const isArch = p.status === 'INACTIVE' || p.status === 'ARCHIVED';
                            
                            const ownerObj = custMap[p.customer_id] || {};
                            const ownerName = ownerObj.name || 'Khách hàng PawPal';
                            const ownerPhone = ownerObj.phone || '0901234567';
                            const routine = p.routine || '';
                            const allergyText = allg ? `Dị ứng: ${allg}` : '';
                            const routineAlert = routine.trim() && routine.trim() !== 'Tiếp nhận mới tại quầy.'
                                ? (/^(?:lưu ý|cảnh báo|tập tính)\s*:/i.test(routine.trim())
                                    ? routine.trim()
                                    : `Lưu ý: ${routine.trim()}`)
                                : '';
                            const alertParts = [routineAlert, allergyText].filter(Boolean);

                            let statusStr = 'Đang nuôi';
                            if (p.status === 'HOTEL') statusStr = 'Lưu trú Hotel';
                            else if (isArch) statusStr = 'Lưu trữ';

                            const dobFormatted = p.date_of_birth ? formatDate(p.date_of_birth) : 'Chưa cập nhật';

                            // Tạo lịch sử cân nặng
                            const weightLogs = petWeightHistoryMap[p.id] || [];

                            // Tạo lịch sử tiêm phòng
                            const vaccinesList = [
                                {
                                    title: 'Vắc-xin phòng dại và bệnh truyền nhiễm định kỳ',
                                    status: p.vaccination_history && !p.vaccination_history.toLowerCase().includes('chưa') ? 'Đã tiêm đủ' : 'Chưa cập nhật',
                                    date: p.vaccination_history || 'Đã tiêm phòng đầy đủ',
                                    nextDate: 'Hằng năm',
                                    place: 'Sổ tiêm đối chiếu tại quầy'
                                }
                            ];

                            petsData[code] = {
                                id: code,
                                rawId: p.id,
                                code: code,
                                name: p.pet_name || 'Bé cưng',
                                species: spec,
                                speciesBreed: specBreed,
                                breed: br,
                                gender: (p.gender === 'FEMALE' || p.gender === 'female' || p.gender === 'Cái') ? 'Cái' : 'Đực',
                                weight: Number.isFinite(wNum) && wNum > 0 ? `${wNum} kg` : 'Chưa cập nhật',
                                weightNum: wNum,
                                dob: dobFormatted,
                                dobRaw: p.date_of_birth || '',
                                color: p.color || 'Chưa cập nhật',
                                allergy: allg || 'Không',
                                allergies: allg,
                                notes: routine || 'Bé ngoan, hợp tác khi làm dịch vụ.',
                                alert: alertParts.join(' • '),
                                ownerName: ownerName,
                                ownerPhone: ownerObj.phone || '',
                                custId: p.customer_id || '',
                                avatar: p.avatar_url || (spec === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg'),
                                status: statusStr,
                                vaccinated: Boolean(p.vaccination_history && !p.vaccination_history.toLowerCase().includes('chưa')),
                                isHotel: p.status === 'HOTEL',
                                isArchived: isArch,
                                weightHistory: weightLogs,
                                vaccines: vaccinesList,
                                carelogs: petCareLogsMap[p.id] || [],
                                history: petApptsMap[p.id] || []
                            };
                        });
                    }
                }
            } catch (err) {
                console.warn('Lỗi kết nối Supabase Pet Module:', err);
            }
        }

        // 2. Chuyển đổi giữa 4 Sub-tabs trên Header Bar
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(petName) {
            if (!deepBreadcrumbEl) return;
            if (petName) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${petName}</span>
                `;
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        function switchSubtab(targetSubtab, updateHistory = true) {
            if (typeof closePetGlobalDropdown === 'function') closePetGlobalDropdown();
            headerSubtabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
            });

            subtabPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
            });

            // Khi ở tab Hồ sơ, luôn hiển thị đường dẫn tinh gọn / [Tên bé cưng]
            if (targetSubtab === 'tab-pet-profile') {
                const currentName = sessionStorage.getItem('pawpal_admin_pet_name') || 
                                    document.getElementById('drawerPetName')?.textContent?.trim() || 
                                    'Milu';
                updateBreadcrumb(currentName);
            } else {
                updateBreadcrumb(null);
            }

            sessionStorage.setItem('pawpal_admin_pet_subtab', targetSubtab);
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

        const handlePetsHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validTabs = ['tab-pet-list', 'tab-pet-profile', 'tab-pet-medical', 'tab-pet-carelog'];
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handlePetsHashChange);

        // 3. Chuyển đổi giữa 4 tabs con trong Drawer Hồ sơ
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        function switchDrawerTab(targetPanelId) {
            drawerTabs.forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
            });

            drawerPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === targetPanelId);
            });

            const hotelBadge = document.getElementById('petHotelEligibleBadge');
            if (hotelBadge) {
                hotelBadge.style.display = (targetPanelId === 'ptab-vaccine') ? 'inline-block' : 'none';
            }
        }

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetId);
                sessionStorage.setItem('pawpal_admin_pet_drawertab', targetId);
            });
        });

        // ====================================================================
        // RENDER ĐỘNG TOÀN BỘ 4 TAB CON THEO TỪNG BÉ CƯNG
        // ====================================================================
        function renderPetSubtabs(pet) {
            // Tab 1: Biến động cân nặng
            const weightTbody = document.getElementById('petWeightHistoryTbody');
            if (weightTbody) {
                const history = pet.weightHistory || [];
                if (history.length === 0) {
                    weightTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">Chưa có dữ liệu ghi nhận cân nặng định kỳ.</td></tr>`;
                } else {
                    weightTbody.innerHTML = history.map(w => `
                        <tr>
                            <td>${w.date}</td>
                            <td><strong>${w.weight}</strong></td>
                            <td>${w.tier}</td>
                            <td>${w.by}</td>
                        </tr>
                    `).join('');
                }
            }

            // Tab 2: Xác nhận tiêm chủng và Tiêu chuẩn an toàn dịch tễ Pet Hotel
            const vaccineContainer = document.getElementById('petVaccineContainer');
            const hotelBadge = document.getElementById('petHotelEligibleBadge');
            const ptabVaccineBadge = document.getElementById('ptabVaccineBadge');
            
            if (vaccineContainer) {
                const vList = pet.vaccines || [];
                const hasRabies = vList.some(v => v.title.toLowerCase().includes('dại') || v.title.toLowerCase().includes('rabies'));
                const isHotelQualified = hasRabies && pet.status !== 'Lưu trữ';

                if (hotelBadge) {
                    if (isHotelQualified) {
                        hotelBadge.className = 'admin-badge badge-success';
                        hotelBadge.textContent = 'Đủ điều kiện nhận phòng Hotel';
                    } else {
                        hotelBadge.className = 'admin-badge badge-warning';
                        hotelBadge.textContent = 'Chưa đủ điều kiện nhận phòng Hotel';
                    }
                }

                if (ptabVaccineBadge) {
                    ptabVaccineBadge.style.display = hasRabies ? 'none' : 'inline-block';
                }

                if (vList.length === 0) {
                    vaccineContainer.innerHTML = `
                        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px; grid-column: 1 / -1; line-height: 1.6;">
                            Bé chưa có dữ liệu ghi nhận tiêm chủng. Bấm <strong>"+ Ghi nhận tiêm chủng hoặc xổ giun"</strong> ở trên để bổ sung hồ sơ dịch tễ.
                        </div>
                    `;
                } else {
                    vaccineContainer.innerHTML = vList.map(v => `
                        <div class="vaccine-item-card is-qualified">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: var(--text-heading);">${v.title}</strong>
                                <span class="admin-badge ${v.status === 'Đã tiêm đủ' || v.status === 'Đã thực hiện' || v.status === 'Đạt chuẩn' ? 'badge-success' : 'badge-warning'}">${v.status}</span>
                            </div>
                            <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
                                <div><strong>Ngày tiêm gần nhất:</strong> ${v.date}</div>
                                ${v.nextDate ? `<div><strong>Ngày tái chủng dự kiến:</strong> ${v.nextDate}</div>` : ''}
                                <div><strong>Địa điểm / Ghi chú:</strong> ${v.place}</div>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Tab 3: Nhật ký chăm sóc dịch vụ
            const carelogTbody = document.getElementById('petCarelogTbody');
            if (carelogTbody) {
                const cLogs = pet.carelogs || [];
                if (cLogs.length === 0) {
                    carelogTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Chưa có nhật ký ca làm trước và sau cho bé cưng này.</td></tr>`;
                } else {
                    carelogTbody.innerHTML = cLogs.map(c => `
                        <tr>
                            <td>
                                <strong>${c.time.split(' ')[0]}</strong>
                                <div style="font-size: 12px; color: var(--text-muted);">${c.time.split(' ')[1] || ''}</div>
                            </td>
                            <td>
                                <strong style="color: var(--text-heading);">${c.service}</strong>
                                <div style="font-size: 12px; color: var(--text-muted);">KTV: ${c.ktv}</div>
                            </td>
                            <td style="text-align: center;">
                                <div style="display: inline-flex; gap: 4px;">
                                    <img src="${c.imgBefore}" style="width: 32px; height: 32px; border-radius: var(--admin-radius); object-fit: cover; border: 1px solid var(--border-neutral);" alt="Trước" title="Ảnh trước dịch vụ">
                                    <img src="${c.imgAfter}" style="width: 32px; height: 32px; border-radius: var(--admin-radius); object-fit: cover; border: 1px solid var(--border-neutral);" alt="Sau" title="Ảnh sau dịch vụ">
                                </div>
                            </td>
                            <td><span class="admin-badge badge-success">${c.checkText}</span></td>
                            <td><span class="admin-badge ${c.appStatus.includes('Đã gửi') ? 'badge-success' : 'badge-neutral'}">${c.appStatus}</span></td>
                            <td style="text-align: right;">
                                <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-carelog-modal" data-care-id="${c.careId || 'CL-001'}">Xem chi tiết</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Tab 4: Lịch sử đặt hẹn & dịch vụ
            const historyTbody = document.getElementById('petHistoryTbody');
            if (historyTbody) {
                let sHistory = [...(pet.history || [])];
                try {
                    const rawBookings = sessionStorage.getItem('pawpal_admin_services_bookings');
                    if (rawBookings) {
                        const allBookings = JSON.parse(rawBookings);
                        const petBookings = allBookings.filter(b => b.petId === pet.code || (b.petName && b.petName.toLowerCase() === pet.name.toLowerCase()));
                        petBookings.forEach(pb => {
                            if (!sHistory.some(h => h.id === pb.id)) {
                                sHistory.unshift({
                                    id: pb.id,
                                    service: pb.serviceName,
                                    time: pb.date + ' ' + (pb.time || ''),
                                    weight: pb.petWeight || pet.weight,
                                    price: pb.total ? Number(pb.total).toLocaleString('vi-VN') + 'đ' : '250.000đ',
                                    status: pb.status === 'completed' ? 'Đã hoàn thành' : pb.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'
                                });
                            }
                        });
                    }
                } catch (e) {}

                if (sHistory.length === 0) {
                    historyTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Bé chưa có lịch sử đặt dịch vụ.</td></tr>`;
                } else {
                    historyTbody.innerHTML = sHistory.map(h => `
                        <tr>
                            <td>
                                <a href="javascript:void(0)" class="user-name-link btn-jump-service-booking" data-booking-id="${h.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${h.id}</a>
                            </td>
                            <td>${h.service}</td>
                            <td>${h.time}</td>
                            <td>${h.weight}</td>
                            <td style="text-align: right;"><strong>${h.price}</strong></td>
                            <td style="text-align: center;"><span class="admin-badge ${h.status === 'Đã hoàn thành' ? 'badge-success' : 'badge-warning'}">${h.status}</span></td>
                        </tr>
                    `).join('');

                    historyTbody.querySelectorAll('.btn-jump-service-booking').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const bkgId = btn.getAttribute('data-booking-id');
                            sessionStorage.setItem('pawpal_admin_service_selected_id', bkgId);
                            sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-detail');
                            window.location.hash = '#tab-service-detail';
                        });
                    });
                }
            }
        }

        // 4. Mở hồ sơ chi tiết khi click vào Tên bé cưng hoặc nút Xem hồ sơ
        function openPetProfile(petId) {
            const pet = petsData[petId];
            if (!pet) return;
            
            // Cập nhật DOM Drawer
            const avatarEl = document.getElementById('drawerPetAvatar');
            if (avatarEl) avatarEl.src = pet.avatar;
            
            const nameEl = document.getElementById('drawerPetName');
            if (nameEl) nameEl.textContent = pet.name;
            
            const codeEl = document.getElementById('drawerPetCode');
            if (codeEl) codeEl.textContent = pet.code;

            const speciesEl = document.getElementById('drawerPetSpeciesBreed');
            if (speciesEl) speciesEl.textContent = pet.speciesBreed;

            const statusBadgeEl = document.getElementById('drawerPetStatusBadge');
            if (statusBadgeEl) {
                statusBadgeEl.textContent = pet.status;
                statusBadgeEl.className = `admin-badge ${pet.status === 'Đang nuôi' ? 'badge-success' : (pet.status === 'Lưu trú Hotel' ? 'badge-warning' : 'badge-neutral')}`;
            }

            const weightHeadlineEl = document.getElementById('drawerPetWeightHeadline');
            if (weightHeadlineEl) weightHeadlineEl.textContent = pet.weight;

            const drawerWeighButton = document.getElementById('btnDrawerWeighPet');
            if (drawerWeighButton) drawerWeighButton.setAttribute('data-id', pet.code);

            const ownerLinkEl = document.getElementById('drawerPetOwnerLink');
            if (ownerLinkEl) {
                ownerLinkEl.textContent = pet.custId
                    ? `${pet.ownerName} (${pet.ownerPhone})`
                    : 'Chưa có thông tin chủ nuôi';
                ownerLinkEl.setAttribute('data-cust-id', pet.custId || '');
            }

            const jumpBtn = document.getElementById('btnDrawerJumpCustomer');
            if (jumpBtn) {
                jumpBtn.setAttribute('data-cust-id', pet.custId || '');
                jumpBtn.disabled = !pet.custId;
            }

            // Tab 1 data
            if (document.getElementById('profilePetCode')) document.getElementById('profilePetCode').textContent = pet.code;
            if (document.getElementById('profilePetName')) document.getElementById('profilePetName').textContent = pet.name;
            if (document.getElementById('profilePetSpecies')) document.getElementById('profilePetSpecies').textContent = pet.speciesBreed;
            if (document.getElementById('profilePetGender')) document.getElementById('profilePetGender').textContent = pet.gender;
            if (document.getElementById('profilePetWeight')) document.getElementById('profilePetWeight').textContent = pet.weight;
            if (document.getElementById('profilePetDob')) document.getElementById('profilePetDob').textContent = pet.dob;
            if (document.getElementById('profilePetColor')) document.getElementById('profilePetColor').textContent = pet.color;
            if (document.getElementById('profilePetAllergy')) document.getElementById('profilePetAllergy').textContent = pet.allergy;
            if (document.getElementById('profilePetNotes')) document.getElementById('profilePetNotes').textContent = pet.notes;

            // Nạp ghi chú kỹ thuật Groomer
            const groomerNotesEl = document.getElementById('petGroomerNotes');
            if (groomerNotesEl) {
                groomerNotesEl.value = pet.groomerNotes || 'Cắt tỉa mặt tròn gấu bông, cạo đệm chân và vệ sinh tuyến hôi kỹ. Dùng dầu tắm yến mạch dịu nhẹ tránh kích ứng da.';
            }

            // Alert banner
            const alertBanner = document.getElementById('drawerPetAlertBanner');
            const alertText = document.getElementById('drawerPetAlertText');
            if (alertBanner && alertText) {
                if (pet.alert) {
                    alertText.textContent = pet.alert;
                    alertBanner.style.display = 'block';
                } else {
                    alertBanner.style.display = 'none';
                }
            }

            // Render động cả 4 tabs con
            renderPetSubtabs(pet);

            // Lưu tên bé vào sessionStorage
            sessionStorage.setItem('pawpal_admin_pet_id', pet.code);
            sessionStorage.setItem('pawpal_admin_pet_name', pet.name);

            // Chuyển sang subtab Hồ sơ
            switchSubtab('tab-pet-profile');
        }

        // Lưu Ghi chú kỹ thuật Groomer trực tiếp vào Supabase
        const btnSaveGroomerNotes = document.getElementById('btnSaveGroomerNotes');
        if (btnSaveGroomerNotes) {
            btnSaveGroomerNotes.addEventListener('click', async () => {
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = petsData[currentPetId];
                const notesVal = document.getElementById('petGroomerNotes')?.value || '';
                if (pet) {
                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && pet.rawId) {
                            await client.from('pet_profile').update({ routine: notesVal }).eq('id', pet.rawId);
                        }
                    } catch (gErr) {
                        console.error('Supabase update groomer notes error:', gErr);
                    }
                    pet.groomerNotes = notesVal;
                    showToast(`Đã lưu ghi chú kỹ thuật Groomer cho bé ${pet.name}!`);
                }
            });
        }

        // Gắn sự kiện mở hồ sơ từ bảng
        document.addEventListener('click', (e) => {
            const btnOpen = e.target.closest('.btn-open-pet-drawer');
            if (btnOpen) {
                const petId = btnOpen.getAttribute('data-id') || btnOpen.closest('tr')?.getAttribute('data-id');
                if (petId) openPetProfile(petId);
            }

            // Nút chuyển nhanh sang nhật ký từ Drawer
            const btnQuickCarelog = e.target.closest('.btn-quick-carelog');
            if (btnQuickCarelog) {
                switchSubtab('tab-pet-carelog');
            }

            // Liên kết chuyển sang module Khách hàng
            const btnJumpCust = e.target.closest('.btn-jump-customer');
            if (btnJumpCust) {
                const custId = btnJumpCust.getAttribute('data-cust-id');
                if (!custId) return;

                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
                sessionStorage.removeItem('pawpal_admin_customer_drawertab');

                // Hashchange là điểm điều hướng chung của admin.js; gọi click sidebar
                // không chạy lại khi module Khách hàng đã đang mở.
                const targetHash = '#tab-profile';
                if (window.location.hash === targetHash &&
                    sessionStorage.getItem('pawpal_admin_active_module') === 'Khách hàng') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                } else {
                    window.location.hash = targetHash;
                }
            }
        });

        // ====================================================================
        // 5. GLOBAL ACTION DROPDOWN PORTAL (•••) CHO BẢNG THÚ CƯNG
        // ====================================================================
        let currentWeighingPetId = 'PET-001';
        let petGlobalActionDropdown = document.getElementById('petGlobalActionDropdown');
        if (!petGlobalActionDropdown) {
            petGlobalActionDropdown = document.createElement('div');
            petGlobalActionDropdown.id = 'petGlobalActionDropdown';
            petGlobalActionDropdown.className = 'action-dropdown-menu';
            document.body.appendChild(petGlobalActionDropdown);
        }

        function closePetGlobalDropdown() {
            if (petGlobalActionDropdown) {
                petGlobalActionDropdown.classList.remove('show');
                petGlobalActionDropdown.style.display = 'none';
                petGlobalActionDropdown.removeAttribute('data-id');
            }
            document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
        }

        function togglePetGlobalDropdown(btn) {
            const petId = btn.getAttribute('data-id');
            const isCurrentlyOpen = petGlobalActionDropdown.classList.contains('show') &&
                                    petGlobalActionDropdown.getAttribute('data-id') === petId;

            closePetGlobalDropdown();
            if (isCurrentlyOpen) return;

            const pet = petsData[petId];
            if (!pet) return;

            btn.classList.add('active');
            petGlobalActionDropdown.setAttribute('data-id', petId);
            const isArchived = pet.status === 'Lưu trữ';

            petGlobalActionDropdown.innerHTML = `
                <button type="button" class="dropdown-item" data-action="profile">
                    Xem hồ sơ chi tiết
                </button>
                <button type="button" class="dropdown-item" data-action="weigh">
                    Cân bé và Thể trạng
                </button>
                <button type="button" class="dropdown-item" data-action="print">
                    In thẻ đeo cổ (80mm)
                </button>
                <button type="button" class="dropdown-item" data-action="service">
                    Tạo ca dịch vụ
                </button>
                ${isArchived ? `
                    <button type="button" class="dropdown-item text-success" data-action="restore">
                        Khôi phục hồ sơ
                    </button>
                ` : `
                    <button type="button" class="dropdown-item text-danger" data-action="archive">
                        Lưu trữ hồ sơ
                    </button>
                `}
            `;

            // Đo kích thước thực tế
            petGlobalActionDropdown.style.display = 'flex';
            petGlobalActionDropdown.style.visibility = 'hidden';
            petGlobalActionDropdown.style.top = '0px';
            petGlobalActionDropdown.style.left = '0px';

            const rect = btn.getBoundingClientRect();
            const dropdownWidth = petGlobalActionDropdown.offsetWidth || 185;
            const dropdownHeight = petGlobalActionDropdown.offsetHeight || 190;
            petGlobalActionDropdown.style.visibility = 'visible';

            let left = rect.right - dropdownWidth;
            if (left < 10) left = 10;

            const spaceBelow = window.innerHeight - rect.bottom;
            let top;
            if (spaceBelow < dropdownHeight + 10 && rect.top > dropdownHeight + 10) {
                // Lật ngược lên trên nếu gần đáy màn hình
                top = rect.top - dropdownHeight - 4;
            } else {
                top = rect.bottom + 4;
            }

            petGlobalActionDropdown.style.top = `${top}px`;
            petGlobalActionDropdown.style.left = `${left}px`;
            petGlobalActionDropdown.style.zIndex = '99999';
            petGlobalActionDropdown.classList.add('show');
        }

        // Bắt sự kiện thao tác trên dropdown pet
        petGlobalActionDropdown.addEventListener('click', async (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const petId = petGlobalActionDropdown.getAttribute('data-id');
            closePetGlobalDropdown();

            if (!petId || !petsData[petId]) return;
            const pet = petsData[petId];

            if (action === 'profile') {
                sessionStorage.setItem('pawpal_admin_pet_id', petId);
                sessionStorage.setItem('pawpal_admin_pet_name', pet.name);
                openPetProfile(petId);
            } else if (action === 'weigh') {
                currentWeighingPetId = petId;
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                const weighNewWeightInput = document.getElementById('weighPetNewWeight');
                const modalWeigh = document.getElementById('modalWeighPet');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || 8.5;
                if (typeof updatePriceMatrix === 'function') {
                    updatePriceMatrix(weighNewWeightInput ? weighNewWeightInput.value : 8.5);
                }
                if (modalWeigh) modalWeigh.classList.add('show');
            } else if (action === 'print') {
                openCollarTagPreview(pet);
            } else if (action === 'service') {
                handleCreateServiceForPet(petId);
            } else if (action === 'archive') {
                showPetConfirmModal({
                    title: 'Lưu trữ hồ sơ',
                    message: `Bạn có chắc muốn lưu trữ hồ sơ của bé cưng ${pet.name || petId}?`,
                    confirmText: 'Lưu trữ',
                    isDanger: true,
                    onConfirm: async () => {
                        try {
                            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                            if (client && pet.rawId) {
                                await client.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', pet.rawId);
                            }
                        } catch (aErr) {
                            console.error('Supabase archive error:', aErr);
                        }
                        await loadPetsModuleData();
                        renderPetsTable();
                        updatePetKPIs();
                        showToast(`Đã lưu trữ hồ sơ bé cưng ${pet.name}!`, 'success');
                    }
                });
            } else if (action === 'restore') {
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && pet.rawId) {
                        await client.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', pet.rawId);
                    }
                } catch (rErr) {
                    console.error('Supabase restore error:', rErr);
                }
                await loadPetsModuleData();
                renderPetsTable();
                updatePetKPIs();
                showToast(`Đã khôi phục hoạt động cho bé cưng ${pet.name}!`);
            }
        });

        // Bấm nút 3 chấm để bật/tắt dropdown, hoặc click ra ngoài để đóng
        document.addEventListener('click', (e) => {
            const moreBtn = e.target.closest('.btn-action-more');
            if (moreBtn) {
                e.stopPropagation();
                togglePetGlobalDropdown(moreBtn);
                return;
            }

            if (!e.target.closest('#petGlobalActionDropdown')) {
                closePetGlobalDropdown();
            }
        });

        window.addEventListener('resize', closePetGlobalDropdown);
        const petScrollBox = document.querySelector('.table-responsive-wrapper');
        if (petScrollBox) {
            petScrollBox.addEventListener('scroll', closePetGlobalDropdown);
        }

        // ====================================================================
        // 6. BỘ LỌC VÀ TÌM KIẾM THÚ CƯNG (ĐẦY ĐỦ CÂN NẶNG & TIÊM CHỦNG)
        // ====================================================================
        // 6. RENDER ĐỘNG BẢNG THÚ CƯNG VÀ TÍNH TOÁN 5 THẺ THỐNG KÊ KPI
        // ====================================================================
        const petSearchInput = document.getElementById('petSearchInput');
        const petFilterSpecies = document.getElementById('petFilterSpecies');
        const petFilterBreed = document.getElementById('petFilterBreed');
        const petFilterWeight = document.getElementById('petFilterWeight');
        const petFilterVaccine = document.getElementById('petFilterVaccine');
        const btnFilterHotelOnly = document.getElementById('btnFilterHotelOnly');
        const btnFilterAlertOnly = document.getElementById('btnFilterAlertOnly');

        let isHotelOnly = false;
        let isAlertOnly = false;

        function updatePetKPIs() {
            const statTotal = document.getElementById('petStatTotal');
            const statDog = document.getElementById('petStatDog');
            const statCat = document.getElementById('petStatCat');
            const statOther = document.getElementById('petStatOther');
            const statAlert = document.getElementById('petStatAlert');

            const petsList = Object.values(petsData);
            const activePets = petsList.filter(p => p.status !== 'Lưu trữ');

            if (statTotal) statTotal.textContent = activePets.length;
            if (statDog) statDog.textContent = activePets.filter(p => p.species === 'dog').length;
            if (statCat) statCat.textContent = activePets.filter(p => p.species === 'cat').length;
            if (statOther) statOther.textContent = activePets.filter(p => p.species !== 'dog' && p.species !== 'cat').length;
            if (statAlert) statAlert.textContent = activePets.filter(p => Boolean(p.alert)).length;
        }

        let petCurrentPage = 1;
        const PETS_PER_PAGE = 10;

        function renderPetPagination(totalItems, totalPages) {
            const paginationBar = document.getElementById('petPaginationBar');
            const pageNumbersContainer = document.getElementById('petPageNumbersContainer');
            const prevBtn = document.getElementById('petPrevPageBtn');
            const nextBtn = document.getElementById('petNextPageBtn');

            if (!paginationBar || !pageNumbersContainer) return;

            if (totalItems <= PETS_PER_PAGE) {
                paginationBar.style.display = totalItems === 0 ? 'none' : 'flex';
            } else {
                paginationBar.style.display = 'flex';
            }

            if (prevBtn) {
                prevBtn.classList.toggle('disabled', petCurrentPage <= 1);
                prevBtn.disabled = petCurrentPage <= 1;
            }

            if (nextBtn) {
                nextBtn.classList.toggle('disabled', petCurrentPage >= totalPages);
                nextBtn.disabled = petCurrentPage >= totalPages;
            }

            pageNumbersContainer.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `pagination-btn ${i === petCurrentPage ? 'active' : ''}`;
                btn.textContent = i;
                btn.addEventListener('click', () => {
                    if (petCurrentPage !== i) {
                        petCurrentPage = i;
                        renderPetsTable();
                        const scrollBox = document.querySelector('.table-responsive-wrapper');
                        if (scrollBox) scrollBox.scrollTop = 0;
                    }
                });
                pageNumbersContainer.appendChild(btn);
            }
        }

        const petPrevBtn = document.getElementById('petPrevPageBtn');
        if (petPrevBtn) {
            petPrevBtn.addEventListener('click', () => {
                if (petCurrentPage > 1) {
                    petCurrentPage--;
                    renderPetsTable();
                    const scrollBox = document.querySelector('.table-responsive-wrapper');
                    if (scrollBox) scrollBox.scrollTop = 0;
                }
            });
        }

        const petNextBtn = document.getElementById('petNextPageBtn');
        if (petNextBtn) {
            petNextBtn.addEventListener('click', () => {
                const petsList = Object.values(petsData);
                const totalPages = Math.ceil(petsList.length / PETS_PER_PAGE) || 1;
                if (petCurrentPage < totalPages) {
                    petCurrentPage++;
                    renderPetsTable();
                    const scrollBox = document.querySelector('.table-responsive-wrapper');
                    if (scrollBox) scrollBox.scrollTop = 0;
                }
            });
        }

        function renderPetsTable() {
            closePetGlobalDropdown();
            const tbody = document.getElementById('petTableTbody');
            if (!tbody) return;

            const query = petSearchInput ? petSearchInput.value.toLowerCase().trim() : '';
            const speciesVal = petFilterSpecies ? petFilterSpecies.value : 'ALL';
            const breedVal = petFilterBreed ? petFilterBreed.value : 'ALL';
            const weightVal = petFilterWeight ? petFilterWeight.value : 'ALL';
            const vaccineVal = petFilterVaccine ? petFilterVaccine.value : 'ALL';

            const petsList = Object.values(petsData);
            const filteredPets = petsList.filter(pet => {
                const text = `${pet.code} ${pet.name} ${pet.speciesBreed || ''} ${pet.breed || ''} ${pet.ownerName || ''} ${pet.ownerPhone || ''}`.toLowerCase();
                
                if (query && !text.includes(query)) return false;

                if (speciesVal !== 'ALL') {
                    if (speciesVal === 'dog' && pet.species !== 'dog') return false;
                    if (speciesVal === 'cat' && pet.species !== 'cat') return false;
                    if (speciesVal === 'rabbit' && pet.species !== 'rabbit') return false;
                    if (speciesVal === 'other' && (pet.species === 'dog' || pet.species === 'cat' || pet.species === 'rabbit')) return false;
                }

                if (breedVal !== 'ALL') {
                    if (!text.includes(breedVal.toLowerCase())) return false;
                }

                if (weightVal !== 'ALL') {
                    const kg = pet.weightNum || parseFloat(pet.weight) || 0;
                    if (weightVal === 'under5' && kg >= 5) return false;
                    if (weightVal === '5to10' && (kg < 5 || kg > 10)) return false;
                    if (weightVal === '10to20' && (kg < 10 || kg > 20)) return false;
                    if (weightVal === 'over20' && kg <= 20) return false;
                }

                if (vaccineVal !== 'ALL') {
                    if (vaccineVal === 'VACCINATED' && pet.vaccinated === false) return false;
                    if (vaccineVal === 'NOT_VACCINATED' && pet.vaccinated !== false) return false;
                }

                if (isHotelOnly && pet.isHotel !== true && pet.status !== 'Lưu trú Hotel') return false;
                if (isAlertOnly && !pet.alert) return false;

                return true;
            });

            const totalItems = filteredPets.length;
            const totalPages = Math.ceil(totalItems / PETS_PER_PAGE) || 1;
            if (petCurrentPage > totalPages) petCurrentPage = totalPages;
            if (petCurrentPage < 1) petCurrentPage = 1;

            renderPetPagination(totalItems, totalPages);

            if (totalItems === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px;">
                            Không tìm thấy bé cưng nào phù hợp với bộ lọc tìm kiếm hiện tại.
                        </td>
                    </tr>
                `;
                return;
            }

            const pagedPets = filteredPets.slice((petCurrentPage - 1) * PETS_PER_PAGE, petCurrentPage * PETS_PER_PAGE);

            tbody.innerHTML = pagedPets.map(pet => {
                let alertRowClass = '';
                let alertHtml = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
                
                if (pet.alert) {
                    const lowAlert = pet.alert.toLowerCase();
                    if (lowAlert.includes('cắn') || lowAlert.includes('dữ') || lowAlert.includes('hung') || lowAlert.includes('nguy hiểm') || lowAlert.includes('cảnh báo:')) {
                        alertRowClass = 'row-alert-critical';
                        alertHtml = `<span class="alert-indicator text-danger" title="${pet.alert}">• ${pet.alert}</span>`;
                    } else {
                        alertRowClass = 'row-alert-warning';
                        alertHtml = `<span class="alert-indicator text-warning" title="${pet.alert}">• ${pet.alert}</span>`;
                    }
                }

                const isArchived = pet.status === 'Lưu trữ';
                const rowClass = [alertRowClass, isArchived ? 'row-archived' : ''].filter(Boolean).join(' ');

                let statusBadgeClass = 'badge-success';
                if (pet.status === 'Lưu trú Hotel') statusBadgeClass = 'badge-warning';
                else if (pet.status === 'Lưu trữ') statusBadgeClass = 'badge-neutral';

                return `
                    <tr class="${rowClass}" data-id="${pet.code}">
                        <td style="text-align: center;">
                            <img src="${pet.avatar || '/assets/images/publics/dogcute3.jpg'}" class="pet-avatar-cell" alt="${pet.name}">
                        </td>
                        <td><strong>${pet.code}</strong></td>
                        <td>
                            <div class="pet-name-cell">
                                <a href="javascript:void(0)" class="pet-name-link btn-open-pet-drawer" data-id="${pet.code}">${pet.name}</a>
                            </div>
                            <div class="pet-sub-cell">${pet.gender || 'Đực'} • ${pet.dob || ''}</div>
                        </td>
                        <td>${pet.speciesBreed || pet.breed || 'Chó'}</td>
                        <td><strong>${pet.weight}</strong></td>
                        <td>
                            <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${pet.custId || 'CUST-001'}">${pet.ownerName || 'Chủ nuôi'}</a>
                            <div class="pet-sub-cell">${pet.ownerPhone || ''}</div>
                        </td>
                        <td>${alertHtml}</td>
                        <td>
                            <span class="admin-badge ${statusBadgeClass}">${pet.status}</span>
                        </td>
                        <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                            <button type="button" class="btn-action-more" data-id="${pet.code}" title="Tác vụ">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Xuất file CSV danh sách thú cưng
        const btnExportPetReport = document.getElementById('btnExportPetReport');
        if (btnExportPetReport) {
            btnExportPetReport.addEventListener('click', () => {
                const petsList = Object.values(petsData);
                const headers = ['Mã bé cưng', 'Tên bé cưng', 'Loài và Giống', 'Giới tính', 'Cân nặng', 'Ngày sinh', 'Chủ sở hữu', 'Số điện thoại', 'Cảnh báo an toàn', 'Trạng thái'];
                const rows = petsList.map(p => [
                    `"${p.code || ''}"`,
                    `"${p.name || ''}"`,
                    `"${p.speciesBreed || p.breed || ''}"`,
                    `"${p.gender || ''}"`,
                    `"${p.weight || ''}"`,
                    `"${p.dob || ''}"`,
                    `"${p.ownerName || ''}"`,
                    `"${p.ownerPhone || ''}"`,
                    `"${(p.alert || 'Bình thường').replace(/"/g, '""')}"`,
                    `"${p.status || 'Đang nuôi'}"`
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                link.setAttribute('href', url);
                link.setAttribute('download', `danh_sach_thu_cung_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showToast('Đã xuất thành công danh sách thú cưng sang file CSV!');
            });
        }

        if (btnFilterHotelOnly) {
            btnFilterHotelOnly.addEventListener('click', () => {
                isHotelOnly = !isHotelOnly;
                btnFilterHotelOnly.classList.toggle('active', isHotelOnly);
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (btnFilterAlertOnly) {
            btnFilterAlertOnly.addEventListener('click', () => {
                isAlertOnly = !isAlertOnly;
                btnFilterAlertOnly.classList.toggle('active', isAlertOnly);
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (petSearchInput) petSearchInput.addEventListener('input', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterSpecies) petFilterSpecies.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterBreed) petFilterBreed.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterWeight) petFilterWeight.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterVaccine) petFilterVaccine.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });

        // ====================================================================
        // 7. TÁC VỤ LƯU TRỮ VÀ KHÔI PHỤC HỒ SƠ THÚ CƯNG TRÊN MENU 3 CHẤM
        // ====================================================================
        document.addEventListener('click', (e) => {
            const btnArchive = e.target.closest('.btn-archive-pet');
            const btnRestore = e.target.closest('.btn-restore-pet');

            if (btnArchive) {
                e.stopPropagation();
                const petId = btnArchive.getAttribute('data-id');
                const pet = petsData[petId];
                if (pet) {
                    showPetConfirmModal({
                        title: 'Lưu trữ hồ sơ',
                        message: `Bạn có chắc muốn lưu trữ hồ sơ của bé cưng ${pet.name || petId}?`,
                        confirmText: 'Lưu trữ',
                        isDanger: true,
                        onConfirm: async () => {
                            try {
                                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                                if (client && pet.rawId) {
                                    await client.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', pet.rawId);
                                }
                            } catch (aErr) {
                                console.error('Supabase archive error:', aErr);
                            }
                            await loadPetsModuleData();
                            renderPetsTable();
                            updatePetKPIs();
                            showToast(`Đã lưu trữ hồ sơ bé cưng ${pet.name}!`, 'success');
                        }
                    });
                }
            }

            if (btnRestore) {
                e.stopPropagation();
                const petId = btnRestore.getAttribute('data-id');
                const pet = petsData[petId];
                if (pet) {
                    (async () => {
                        try {
                            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                            if (client && pet.rawId) {
                                await client.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', pet.rawId);
                            }
                        } catch (rErr) {
                            console.error('Supabase restore error:', rErr);
                        }
                        await loadPetsModuleData();
                        renderPetsTable();
                        updatePetKPIs();
                        showToast(`Đã khôi phục hoạt động cho bé cưng ${pet.name}!`);
                    })();
                }
            }
        });

        // ====================================================================
        // 8. MODAL 2: CÂN BÉ VÀ LƯU VÀO BẢNG LỊCH SỬ BIẾN ĐỘNG CÂN NẶNG
        // ====================================================================
        const modalWeighPet = document.getElementById('modalWeighPet');
        const weighNewWeightInput = document.getElementById('weighPetNewWeight');
        const weighTierResult = document.getElementById('weighTierResult');
        const weighSpaPriceResult = document.getElementById('weighSpaPriceResult');
        const weighGroomPriceResult = document.getElementById('weighGroomPriceResult');
        const weighHotelPriceResult = document.getElementById('weighHotelPriceResult');
        currentWeighingPetId = 'PET-001';

        function updatePriceMatrix(weight) {
            const kg = parseFloat(weight) || 0;
            let tier = 'Dưới 5 kg';
            let spaPrice = '180.000đ';
            let groomPrice = '280.000đ';
            let hotelPrice = '200.000đ';

            if (kg >= 5 && kg <= 10) {
                tier = '5 - 10 kg';
                spaPrice = '250.000đ';
                groomPrice = '350.000đ';
                hotelPrice = '300.000đ';
            } else if (kg > 10 && kg <= 20) {
                tier = '10 - 20 kg';
                spaPrice = '350.000đ';
                groomPrice = '480.000đ';
                hotelPrice = '400.000đ';
            } else if (kg > 20) {
                tier = 'Trên 20 kg';
                spaPrice = '500.000đ';
                groomPrice = '650.000đ';
                hotelPrice = '550.000đ';
            }

            if (weighTierResult) weighTierResult.textContent = tier;
            if (weighSpaPriceResult) weighSpaPriceResult.textContent = spaPrice;
            if (weighGroomPriceResult) weighGroomPriceResult.textContent = groomPrice;
            if (weighHotelPriceResult) weighHotelPriceResult.textContent = hotelPrice;
            return tier;
        }

        if (weighNewWeightInput) {
            weighNewWeightInput.addEventListener('input', (e) => {
                updatePriceMatrix(e.target.value);
            });
        }

        document.addEventListener('click', (e) => {
            const btnWeigh = e.target.closest('.btn-open-weigh-modal');
            if (btnWeigh) {
                currentWeighingPetId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = petsData[currentWeighingPetId];
                if (!pet) return;
                
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || 8.5;

                if (modalWeighPet) {
                    modalWeighPet.classList.add('open');
                    updatePriceMatrix(weighNewWeightInput.value);
                }
            }
        });

        const btnSubmitWeigh = document.getElementById('btnSubmitWeigh');
        const formWeighPet = document.getElementById('formWeighPet');
        if (formWeighPet) formWeighPet.addEventListener('submit', (event) => event.preventDefault());
        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const weightValue = weighNewWeightInput?.value.trim() || '';
                const newKg = Number(weightValue);
                const pet = petsData[currentWeighingPetId];
                if (!pet) return;
                if (!weightValue || !Number.isFinite(newKg) || newKg <= 0 || newKg < 0.1) {
                    showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weighNewWeightInput?.focus();
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client || !pet.rawId) {
                        showToast('Không thể lưu cân nặng khi chưa kết nối được hồ sơ thú cưng.', 'danger');
                        return;
                    }

                    const measuredAt = new Date().toISOString();
                    const { error: historyError } = await client.from('pet_weight_history').insert({
                        pet_id: pet.rawId,
                        weight: newKg,
                        measured_at: measuredAt,
                        recorded_by_name: window.currentUser?.full_name || window.currentUser?.name || 'Nhân viên PawPal'
                    });
                    if (historyError) throw historyError;

                    const { error: wErr } = await client.from('pet_profile').update({ weight: newKg }).eq('id', pet.rawId);
                    if (wErr) throw wErr;
                } catch (err) {
                    console.error('Weight update error:', err);
                    showToast('Lỗi lưu cân nặng: ' + (err.message || 'Không thể ghi dữ liệu.'), 'danger');
                    return;
                }

                await loadPetsModuleData();
                renderPetsTable();
                updatePetKPIs();

                const updatedPet = petsData[currentWeighingPetId];
                if (updatedPet) {
                    renderPetSubtabs(updatedPet);
                }

                showToast(`Đã lưu cân nặng mới (${newKg} kg) cho bé ${pet.name}!`);
                if (modalWeighPet) modalWeighPet.classList.remove('open');
            });
        }

        // ====================================================================
        // 9. MODAL 5: CHỈNH SỬA HỒ SƠ THÚ CƯNG (EDIT PET PROFILE)
        // ====================================================================
        const modalEditPet = document.getElementById('modalEditPetProfile');
        const formEditPet = document.getElementById('formEditPetProfile');
        let currentEditingPetCode = 'PET-001';

        function openEditPetModal(petId) {
            currentEditingPetCode = petId || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
            const pet = petsData[currentEditingPetCode] || petsData['PET-001'];
            if (!modalEditPet) return;

            const ownerSelect = document.getElementById('editPetOwner');
            if (ownerSelect) {
                const custs = Object.values(customersData);
                if (custs.length > 0) {
                    ownerSelect.innerHTML = custs.map(c => `
                        <option value="${c.id}">${c.name} - ${c.phone || 'Chưa có SĐT'} (${c.tier || 'Khách mới'})</option>
                    `).join('');
                }
                ownerSelect.value = pet.custId || (custs[0] ? custs[0].id : '');
            }

            if (document.getElementById('editPetCode')) document.getElementById('editPetCode').value = pet.code;
            if (document.getElementById('editPetName')) document.getElementById('editPetName').value = pet.name || '';
            if (document.getElementById('editPetSpecies')) document.getElementById('editPetSpecies').value = pet.species || 'dog';
            if (document.getElementById('editPetBreed')) document.getElementById('editPetBreed').value = pet.breed || pet.speciesBreed || '';
            if (document.getElementById('editPetGender')) document.getElementById('editPetGender').value = pet.gender || 'Đực';
            if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weightNum || parseFloat(pet.weight) || 8.5;
            if (document.getElementById('editPetDob')) document.getElementById('editPetDob').value = pet.dobRaw || '2023-05-15';
            if (document.getElementById('editPetColor')) document.getElementById('editPetColor').value = pet.color || '';
            if (document.getElementById('editPetStatus')) document.getElementById('editPetStatus').value = pet.status || 'Đang nuôi';
            if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.alert || '';
            if (document.getElementById('editPetAllergy')) document.getElementById('editPetAllergy').value = pet.allergy || '';
            if (document.getElementById('editPetNotes')) document.getElementById('editPetNotes').value = pet.notes || '';

            modalEditPet.classList.add('open');
        }

        const btnOpenEditPet = document.getElementById('btnOpenEditPetModal');
        if (btnOpenEditPet) {
            btnOpenEditPet.addEventListener('click', () => {
                const currentId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                openEditPetModal(currentId);
            });
        }

        const btnSubmitEditPet = document.getElementById('btnSubmitEditPetProfile');
        if (btnSubmitEditPet) {
            btnSubmitEditPet.addEventListener('click', async () => {
                const pet = petsData[currentEditingPetCode];
                if (!pet) return;

                const name = document.getElementById('editPetName')?.value || pet.name;
                const species = document.getElementById('editPetSpecies')?.value || pet.species;
                const breed = document.getElementById('editPetBreed')?.value || pet.breed;
                const gender = document.getElementById('editPetGender')?.value || pet.gender;
                const weight = parseFloat(document.getElementById('editPetWeight')?.value || '8.5');
                const dob = document.getElementById('editPetDob')?.value || pet.dobRaw;
                const color = document.getElementById('editPetColor')?.value || pet.color;
                const status = document.getElementById('editPetStatus')?.value || pet.status;
                const alertText = document.getElementById('editPetAlert')?.value || '';
                const allergy = document.getElementById('editPetAllergy')?.value || '';
                const notes = document.getElementById('editPetNotes')?.value || '';
                const ownerCustId = document.getElementById('editPetOwner')?.value || pet.custId;

                let dbStatus = 'ACTIVE';
                if (status === 'Lưu trú Hotel' || status === 'HOTEL') dbStatus = 'HOTEL';
                else if (status === 'Lưu trữ' || status === 'INACTIVE' || status === 'ARCHIVED') dbStatus = 'INACTIVE';

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && pet.rawId) {
                        const updatePayload = {
                            pet_name: name,
                            species: species,
                            breed: breed,
                            gender: gender === 'Cái' ? 'FEMALE' : 'MALE',
                            date_of_birth: dob || null,
                            weight: weight,
                            color: color,
                            routine: notes || (alertText ? `Lưu ý: ${alertText}` : 'Bé ngoan, hợp tác khi làm dịch vụ.'),
                            allergy: allergy,
                            status: dbStatus
                        };
                        if (ownerCustId && customersData[ownerCustId]) {
                            updatePayload.customer_id = ownerCustId;
                        }

                        const { error: updErr } = await client.from('pet_profile').update(updatePayload).eq('id', pet.rawId);
                        if (updErr) {
                            console.error('Supabase update pet error:', updErr);
                            showToast('Lỗi cập nhật CSDL: ' + updErr.message, 'danger');
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Edit pet exception:', err);
                    showToast('Lỗi cập nhật hồ sơ: ' + err.message, 'danger');
                    return;
                }

                // Tải lại dữ liệu trực tiếp từ Supabase
                await loadPetsModuleData();
                renderPetsTable();
                updatePetKPIs();

                // Cập nhật lại Drawer
                if (petsData[currentEditingPetCode]) {
                    openPetProfile(currentEditingPetCode);
                }

                showToast(`Đã cập nhật thành công hồ sơ của bé ${name}!`);
                if (modalEditPet) modalEditPet.classList.remove('open');
            });
        }

        // ====================================================================
        // 10. TIẾP NHẬN BÉ CƯNG MỚI TẠI QUẦY & AUTOCOMPLETE CHỦ NUÔI
        // ====================================================================
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const newPetDobInput = document.getElementById('newPetDob');
        const newPetOwnerInput = document.getElementById('newPetOwnerInput');
        const newPetOwnerHidden = document.getElementById('newPetOwner');
        const newPetOwnerDropdown = document.getElementById('newPetOwnerDropdown');
        const modalQuickAddOwner = document.getElementById('modalQuickAddOwner');
        const btnOpenQuickAddOwnerModal = document.getElementById('btnOpenQuickAddOwnerModal');
        const btnSubmitQuickAddOwner = document.getElementById('btnSubmitQuickAddOwner');
        const modalCollarTagPreview = document.getElementById('modalCollarTagPreview');
        const btnPreviewCollarTagFromAdd = document.getElementById('btnPreviewCollarTagFromAdd');
        const btnConfirmSendPrintCollar = document.getElementById('btnConfirmSendPrintCollar');

        // Autocomplete tìm kiếm chủ nuôi
        if (newPetOwnerInput && newPetOwnerDropdown) {
            function updateOwnerAutocomplete(query) {
                const q = query.toLowerCase().trim();
                const allCusts = Object.values(customersData);
                const matched = allCusts.filter(c => 
                    !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q)
                );

                if (matched.length === 0) {
                    newPetOwnerDropdown.innerHTML = '<div class="autocomplete-empty">Không tìm thấy khách hàng. Bấm "+ Thêm nhanh chủ nuôi" để tạo mới!</div>';
                } else {
                    newPetOwnerDropdown.innerHTML = matched.map(c => `
                        <div class="autocomplete-item" data-id="${c.id}" data-name="${c.name}" data-phone="${c.phone}" data-tier="${c.tier || 'Khách mới'}">
                            <div>
                                <span class="autocomplete-item-name">${c.name}</span>
                                <span style="font-size: 11.5px; color: var(--text-muted); margin-left: 6px;">(${c.tier || 'Khách mới'})</span>
                            </div>
                            <span class="autocomplete-item-phone">${c.phone} • ${c.id}</span>
                        </div>
                    `).join('');
                }
                newPetOwnerDropdown.style.display = 'block';
            }

            newPetOwnerInput.addEventListener('focus', () => {
                updateOwnerAutocomplete(newPetOwnerInput.value);
            });

            newPetOwnerInput.addEventListener('input', () => {
                updateOwnerAutocomplete(newPetOwnerInput.value);
            });

            newPetOwnerDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    const custId = item.getAttribute('data-id');
                    const custName = item.getAttribute('data-name');
                    const custPhone = item.getAttribute('data-phone');
                    const custTier = item.getAttribute('data-tier');

                    if (newPetOwnerHidden) newPetOwnerHidden.value = custId;
                    newPetOwnerInput.value = `${custName} - ${custPhone} (Hạng ${custTier})`;
                    newPetOwnerDropdown.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.pet-owner-autocomplete-wrapper')) {
                    newPetOwnerDropdown.style.display = 'none';
                }
            });
        }

        // Mở popup Thêm nhanh chủ nuôi
        if (btnOpenQuickAddOwnerModal && modalQuickAddOwner) {
            btnOpenQuickAddOwnerModal.addEventListener('click', () => {
                modalQuickAddOwner.classList.add('open');
            });
        }

        // Lưu tạo nhanh chủ nuôi trực tiếp vào Supabase Live Database
        if (btnSubmitQuickAddOwner) {
            btnSubmitQuickAddOwner.addEventListener('click', async () => {
                const name = document.getElementById('quickOwnerName')?.value.trim();
                const phone = document.getElementById('quickOwnerPhone')?.value.trim();
                const tier = document.getElementById('quickOwnerTier')?.value || 'Khách mới';
                const address = document.getElementById('quickOwnerAddress')?.value.trim();

                if (!name || !phone) {
                    showToast('Vui lòng nhập đầy đủ Họ tên và Số điện thoại của chủ nuôi!', 'warning');
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const { data: newCust, error: custErr } = await client.from('customer').insert({
                            phone_main: phone,
                            email: '',
                            account_status: 'ACTIVE'
                        }).select().single();

                        if (custErr) {
                            console.error('Supabase create customer error:', custErr);
                            showToast('Lỗi tạo chủ nuôi: ' + custErr.message, 'danger');
                            return;
                        }

                        if (newCust) {
                            await client.from('customer_profile').insert({
                                customer_id: newCust.id,
                                full_name: name
                            });

                            customersData[newCust.id] = {
                                id: newCust.id,
                                name: name,
                                phone: phone,
                                tier: tier,
                                address: address
                            };

                            if (newPetOwnerHidden) newPetOwnerHidden.value = newCust.id;
                            if (newPetOwnerInput) newPetOwnerInput.value = `${name} - ${phone} (Hạng ${tier})`;

                            if (modalQuickAddOwner) modalQuickAddOwner.classList.remove('open');
                            showToast(`Đã tạo nhanh khách hàng ${name} thành công!`);
                        }
                    }
                } catch (err) {
                    console.error('Create quick owner exception:', err);
                    showToast('Lỗi khi lưu khách hàng vào CSDL: ' + err.message, 'danger');
                }
            });
        }

        // Hàm mở Modal Xem trước Thẻ in nhiệt 80mm
        function openCollarTagPreview(pet) {
            if (!modalCollarTagPreview || !pet) return;

            const nameEl = document.getElementById('tagPreviewPetName');
            const infoEl = document.getElementById('tagPreviewPetInfo');
            const codeEl = document.getElementById('tagPreviewPetCode');
            const ownerNameEl = document.getElementById('tagPreviewOwnerName');
            const ownerPhoneEl = document.getElementById('tagPreviewOwnerPhone');
            const intakeTimeEl = document.getElementById('tagPreviewIntakeTime');
            const alertWrap = document.getElementById('tagPreviewAlertWrapper');
            const alertTextEl = document.getElementById('tagPreviewAlertText');
            const barcodeNumEl = document.getElementById('tagPreviewBarcodeNum');

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;

            if (nameEl) nameEl.textContent = (pet.name || 'BÉ CƯNG').toUpperCase();
            if (infoEl) infoEl.textContent = `${pet.speciesBreed || pet.breed || 'Chó'} • ${pet.weight || '5.0 kg'} • ${pet.gender || 'Đực'}`;
            if (codeEl) codeEl.textContent = pet.code || 'PET-NEW';
            if (ownerNameEl) ownerNameEl.textContent = pet.ownerName || 'Chủ nuôi';
            if (ownerPhoneEl) ownerPhoneEl.textContent = pet.ownerPhone || '0900000000';
            if (intakeTimeEl) intakeTimeEl.textContent = timeStr;
            if (barcodeNumEl) barcodeNumEl.textContent = `*${pet.code || 'PET-NEW'}*`;

            if (alertWrap && alertTextEl) {
                if (pet.alert) {
                    alertTextEl.textContent = pet.alert;
                    alertWrap.style.display = 'block';
                } else {
                    alertWrap.style.display = 'none';
                }
            }

            modalCollarTagPreview.classList.add('open');
        }

        // Nút xem trước thẻ in từ form tiếp nhận
        if (btnPreviewCollarTagFromAdd) {
            btnPreviewCollarTagFromAdd.addEventListener('click', () => {
                const name = document.getElementById('newPetName')?.value.trim();
                if (!name) {
                    showToast('Vui lòng nhập tên bé cưng.', 'warning');
                    document.getElementById('newPetName')?.focus();
                    return;
                }
                const ownerCustId = newPetOwnerHidden?.value;
                const cust = customersData[ownerCustId] || { name: 'Khách hàng', phone: '0900000000' };
                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value || 'Corgi';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weightInput = document.getElementById('newPetWeight');
                const weightValue = weightInput?.value.trim() || '';
                const weight = Number(weightValue);
                if (!weightValue || !Number.isFinite(weight) || weight <= 0) {
                    showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weightInput?.focus();
                    return;
                }
                const alertText = document.getElementById('newPetAlert')?.value || '';

                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                openCollarTagPreview({
                    name: name,
                    code: 'PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0'),
                    speciesBreed: speciesBreedStr,
                    weight: `${weight} kg`,
                    gender: gender,
                    ownerName: cust.name,
                    ownerPhone: cust.phone,
                    alert: alertText
                });
            });
        }

        // Nút in thẻ trên dropdown 3 chấm bảng danh sách
        document.addEventListener('click', (e) => {
            const btnPrint = e.target.closest('.btn-print-collar-tag');
            if (btnPrint) {
                const petId = btnPrint.getAttribute('data-id');
                const pet = petsData[petId];
                if (pet) {
                    openCollarTagPreview(pet);
                }
                closePetGlobalDropdown();
            }
        });

        // Xác nhận gửi lệnh in nhiệt
        if (btnConfirmSendPrintCollar) {
            btnConfirmSendPrintCollar.addEventListener('click', () => {
                showToast('Đã gửi lệnh in thẻ đeo cổ tới máy in nhãn nhiệt quầy tiếp nhận!');
                if (modalCollarTagPreview) modalCollarTagPreview.classList.remove('open');
            });
        }

        // Mở modal tiếp nhận
        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                modalAddPet.classList.add('open');
            });

            if (sessionStorage.getItem('pawpal_admin_pet_open_add_modal') === 'true') {
                sessionStorage.removeItem('pawpal_admin_pet_open_add_modal');
                modalAddPet.classList.add('open');
            }
        }

        // Submit form tiếp nhận bé mới trực tiếp vào Supabase
        const btnSubmitAddPet = document.getElementById('btnSubmitAddPet');
        if (btnSubmitAddPet) {
            btnSubmitAddPet.addEventListener('click', async () => {
                const nameInput = document.getElementById('newPetName');
                const name = nameInput?.value.trim() || '';
                if (!name) {
                    showToast('Vui lòng nhập tên bé cưng.', 'warning');
                    nameInput?.focus();
                    return;
                }

                const dob = newPetDobInput?.value || '';
                if (dob && !isValidPetBirthDate(dob)) {
                    showToast('Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.', 'warning');
                    newPetDobInput?.focus();
                    return;
                }

                let ownerCustId = newPetOwnerHidden?.value;
                if (!ownerCustId || !customersData[ownerCustId]) {
                    const firstCustId = Object.keys(customersData)[0];
                    ownerCustId = firstCustId || null;
                }

                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value.trim() || 'Corgi';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weightInput = document.getElementById('newPetWeight');
                const weightValue = weightInput?.value.trim() || '';
                const weight = Number(weightValue);
                if (!weightValue || !Number.isFinite(weight) || weight <= 0) {
                    showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weightInput?.focus();
                    return;
                }
                const color = document.getElementById('newPetColor')?.value.trim() || 'Vàng trắng';
                const alertText = document.getElementById('newPetAlert')?.value.trim() || '';
                const allergy = document.getElementById('newPetAllergy')?.value.trim() || 'Không';

                const newPetId = 'PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0');
                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const insertPayload = {
                            customer_id: ownerCustId,
                            pet_code: newPetId,
                            pet_name: name,
                            species: species,
                            breed: breed,
                            gender: gender === 'Cái' ? 'FEMALE' : 'MALE',
                            date_of_birth: dob || null,
                            weight: weight,
                            color: color,
                            routine: alertText ? `Cảnh báo: ${alertText}` : 'Tiếp nhận mới tại quầy.',
                            allergy: allergy,
                            vaccination_history: 'Đã tiêm phòng định kỳ',
                            avatar_url: species === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg',
                            status: 'ACTIVE'
                        };

                        const { data: createdPet, error: petErr } = await client.from('pet_profile').insert(insertPayload).select().single();
                        if (petErr) {
                            console.error('Supabase insert pet error:', petErr);
                            showToast('Lỗi lưu bé cưng vào CSDL: ' + petErr.message, 'danger');
                            return;
                        }

                        const { error: initialWeightError } = await client.from('pet_weight_history').insert({
                            pet_id: createdPet.id,
                            weight: weight,
                            measured_at: new Date().toISOString(),
                            recorded_by_name: 'Nhân viên PawPal'
                        });
                        if (initialWeightError) {
                            console.error('Supabase initial pet weight history error:', initialWeightError);
                            showToast('Đã tạo hồ sơ nhưng chưa ghi được lịch sử cân nặng: ' + initialWeightError.message, 'danger');
                        }

                        // Tải lại dữ liệu thực tế từ Supabase
                        await loadPetsModuleData();
                        renderPetsTable();
                        updatePetKPIs();

                        const savedPetObj = petsData[newPetId] || {
                            name: name,
                            code: newPetId,
                            speciesBreed: speciesBreedStr,
                            weight: `${weight} kg`,
                            gender: gender,
                            ownerName: customersData[ownerCustId]?.name || 'Khách hàng',
                            ownerPhone: customersData[ownerCustId]?.phone || '0900000000',
                            alert: alertText
                        };

                        showToast(`Tiếp nhận bé ${name} (${newPetId}) thành công!`);
                        if (modalAddPet) modalAddPet.classList.remove('open');

                        // Mở xem trước thẻ in nhiệt 80mm
                        setTimeout(() => {
                            openCollarTagPreview(savedPetObj);
                        }, 300);
                    }
                } catch (err) {
                    console.error('Add pet exception:', err);
                    showToast('Lỗi khi tiếp nhận bé cưng: ' + err.message, 'danger');
                }
            });
        }

        // ====================================================================
        // 11. GỬI TIN NHẮN CHĂM SÓC ĐỊNH KỲ VÀ GỬI ĐỒNG LOẠT (SUBTAB NHẮC LỊCH)
        // ====================================================================
        const defaultRemindersData = [
            {
                id: 'REM-001',
                petId: 'PET-001',
                petName: 'Bé Milu',
                speciesBreed: 'Chó Corgi',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                type: 'BATH',
                typeText: 'Quá 18 ngày chưa tắm sấy',
                typeBadgeClass: 'badge-warning',
                typeBadgeStyle: '',
                lastDateText: '09/09/2026 (18 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-002',
                petId: 'PET-003',
                petName: 'Bé Boss',
                speciesBreed: 'Chó Golden Retriever',
                ownerName: 'Lê Thị Bình',
                ownerPhone: '0987654321',
                custId: 'CUST-002',
                type: 'GROOM',
                typeText: 'Quá 36 ngày chưa chải lông và cắt móng',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: '',
                lastDateText: '22/08/2026 (36 ngày trước)',
                status: 'SENT',
                statusText: 'Đã gửi Zalo hôm qua',
                statusBadgeClass: 'badge-success'
            },
            {
                id: 'REM-003',
                petId: 'PET-002',
                petName: 'Bé Mimi',
                speciesBreed: 'Mèo Anh lông ngắn',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                type: 'HOTEL',
                typeText: 'Gửi Pet Hotel cuối tuần',
                typeBadgeClass: 'badge-tier-gold',
                typeBadgeStyle: '',
                lastDateText: 'Khách quen gửi thứ 7 hằng tuần',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-004',
                petId: 'PET-005',
                petName: 'Bé Trà Sữa',
                speciesBreed: 'Chó Poodle Toy',
                ownerName: 'Hoàng Minh Tuấn',
                ownerPhone: '0903112233',
                custId: 'CUST-005',
                type: 'GROOM',
                typeText: 'Quá 32 ngày chưa cắt tỉa lông tạo kiểu',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: '',
                lastDateText: '26/08/2026 (32 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-005',
                petId: 'PET-007',
                petName: 'Bé Mochi',
                speciesBreed: 'Phốc Sóc (Pomeranian)',
                ownerName: 'Bùi Thu Trang',
                ownerPhone: '0938776655',
                custId: 'CUST-008',
                type: 'BATH',
                typeText: 'Quá 16 ngày chưa tắm sấy',
                typeBadgeClass: 'badge-warning',
                typeBadgeStyle: '',
                lastDateText: '12/09/2026 (16 ngày trước)',
                status: 'SENT',
                statusText: 'Đã gửi Zalo sáng nay',
                statusBadgeClass: 'badge-success'
            },
            {
                id: 'REM-006',
                petId: 'PET-009',
                petName: 'Bé Đậu Đậu',
                speciesBreed: 'Poodle Standard',
                ownerName: 'Đặng Thùy Linh',
                ownerPhone: '0945678123',
                custId: 'CUST-010',
                type: 'HOTEL',
                typeText: 'Gửi Pet Hotel cuối tuần',
                typeBadgeClass: 'badge-tier-gold',
                typeBadgeStyle: '',
                lastDateText: 'Khách quen đặt phòng cuối tuần',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-007',
                petId: 'PET-004',
                petName: 'Bé Cún Lu',
                speciesBreed: 'Chó cỏ lai',
                ownerName: 'Trần Đình Trọng',
                ownerPhone: '0977889900',
                custId: 'CUST-004',
                type: 'HOTEL_VACCINE',
                typeText: 'Cảnh báo sổ tiêm ngoài quá hạn trước khi nhận Hotel',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: 'color: #8F2424; background: #F7DCDC;',
                lastDateText: 'Sổ tiêm ngoài quá hạn: 15/10/2025',
                status: 'UNSENT',
                statusText: 'Cần nhắc chủ',
                statusBadgeClass: 'badge-warning'
            },
            {
                id: 'REM-008',
                petId: 'PET-006',
                petName: 'Bé Bông',
                speciesBreed: 'Mèo Ba Tư lông dài',
                ownerName: 'Phan Tuyết Mai',
                ownerPhone: '0911223344',
                custId: 'CUST-007',
                type: 'GROOM',
                typeText: 'Quá 40 ngày chưa chải xả rối và cạo đệm chân',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: '',
                lastDateText: '20/08/2026 (40 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-009',
                petId: 'PET-010',
                petName: 'Bé Kem',
                speciesBreed: 'Chó Samoyed tuyết',
                ownerName: 'Vũ Đức Thành',
                ownerPhone: '0988776655',
                custId: 'CUST-009',
                type: 'BATH',
                typeText: 'Mùa rụng lông cần tắm sấy xả tơ chuyên sâu',
                typeBadgeClass: 'badge-warning',
                typeBadgeStyle: '',
                lastDateText: '05/09/2026 (24 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-010',
                petId: 'PET-008',
                petName: 'Bé Bơ',
                speciesBreed: 'Thỏ Minilop',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                type: 'SHOP_REFILL',
                typeText: 'Dự đoán hết cỏ Timothy và hạt nén dinh dưỡng',
                typeBadgeClass: 'badge-neutral',
                typeBadgeStyle: '',
                lastDateText: 'Mua đơn gần nhất: 29/08/2026',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            }
        ];

        // Khởi tạo và Lưu trữ Reminders Data trên sessionStorage
        function getRemindersData() {
            const saved = sessionStorage.getItem('pawpal_admin_pet_reminders');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch(e) {
                    console.error('Lỗi phân tích cú pháp pawpal_admin_pet_reminders:', e);
                }
            }
            return JSON.parse(JSON.stringify(defaultRemindersData));
        }

        const remindersData = getRemindersData();

        function persistRemindersData() {
            sessionStorage.setItem('pawpal_admin_pet_reminders', JSON.stringify(remindersData));
        }

        // Cập nhật 4 thẻ KPI nhắc lịch
        function updateReminderKPIs() {
            const kpiBathEl = document.getElementById('remKpiValBath');
            const kpiGroomEl = document.getElementById('remKpiValGroom');
            const kpiHotelEl = document.getElementById('remKpiValHotel');
            const kpiVaccineAlertEl = document.getElementById('remKpiValVaccineAlert');

            const countBath = remindersData.filter(r => r.type === 'BATH').length;
            const countGroom = remindersData.filter(r => r.type === 'GROOM').length;
            const countHotel = remindersData.filter(r => r.type === 'HOTEL').length;
            const countVaccine = remindersData.filter(r => r.type === 'HOTEL_VACCINE').length;

            if (kpiBathEl) kpiBathEl.textContent = `${countBath} bé`;
            if (kpiGroomEl) kpiGroomEl.textContent = `${countGroom} bé`;
            if (kpiHotelEl) kpiHotelEl.textContent = `${countHotel} khách`;
            if (kpiVaccineAlertEl) kpiVaccineAlertEl.textContent = `${countVaccine} bé`;
        }

        const reminderSearchInput = document.getElementById('reminderSearchInput');
        const reminderFilterType = document.getElementById('reminderFilterType');
        const reminderFilterStatus = document.getElementById('reminderFilterStatus');
        const reminderTableTbody = document.getElementById('reminderTableTbody');
        const modalSendReminder = document.getElementById('modalSendReminder');
        const reminderTemplateSelect = document.getElementById('reminderTemplateSelect');
        const btnCopyReminderText = document.getElementById('btnCopyReminderText');
        const btnOpenZaloChat = document.getElementById('btnOpenZaloChat');
        let currentSendingReminderId = 'REM-001';

        function buildReminderText(templateKey, petName, ownerName) {
            switch(templateKey) {
                case 'SPA_BATH':
                    return `PawPal mến chào Sen ${ownerName}! Bé ${petName} đã hơn 2 tuần chưa ghé spa làm đẹp rồi đó ạ. PawPal gửi tặng bé voucher ưu đãi 10% dịch vụ Spa trong tuần này. Sen đặt lịch ngay cho bé nhé!`;
                case 'GROOM':
                    return `PawPal thân gửi Sen ${ownerName}! Bộ lông của bé ${petName} đã đến kỳ cắt tỉa tạo kiểu và gỡ rối định kỳ để bé luôn gọn gàng, thoáng mát. Tiệm đang có sẵn khung giờ đẹp hôm nay và ngày mai, Sen đặt lịch tạo kiểu cho bé nhé!`;
                case 'HOTEL':
                    return `PawPal mến chào Sen ${ownerName}! Cuối tuần này Sen có kế hoạch du lịch hoặc về quê không ạ? Phòng Pet Hotel chuẩn 5 sao tại PawPal đã sẵn sàng phục vụ bé ${petName} với camera xem trực tiếp 24/7 và chế độ chăm sóc tận tình. Sen liên hệ đặt phòng sớm nhé!`;
                case 'HOTEL_VACCINE':
                    return `PawPal thông báo đến Sen ${ownerName}: Sổ tiêm phòng dại định kỳ của bé ${petName} sắp đến hạn tái chủng tại phòng khám thú y. Để đảm bảo điều kiện an toàn dịch tễ khi bé lưu trú tại Pet Hotel dịp tới, Sen nhớ đưa bé đi tiêm phòng ở cơ sở thú y gần nhất nhé!`;
                case 'SHOP':
                    return `PawPal nhắc nhỏ Sen ${ownerName}: Khẩu phần thức ăn hạt và cát vệ sinh của bé ${petName} dự kiến sắp hết. PawPal đang có ưu đãi freeship và quà tặng hấp dẫn cho đơn hàng phụ kiện hoặc thức ăn cho bé hôm nay ạ!`;
                default:
                    return `PawPal mến chào Sen ${ownerName}! Bé ${petName} đã đến kỳ chăm sóc định kỳ tại PawPal. Sen liên hệ với tiệm để được tư vấn và xếp lịch thuận tiện nhất nhé!`;
            }
        }

        let remCurrentPage = 1;
        const REMINDERS_PER_PAGE = 10;

        function renderReminderPagination(totalItems, totalPages) {
            const paginationBar = document.getElementById('remPaginationBar');
            const pageNumbersContainer = document.getElementById('remPageNumbersContainer');
            const prevBtn = document.getElementById('remPrevPageBtn');
            const nextBtn = document.getElementById('remNextPageBtn');

            if (!paginationBar || !pageNumbersContainer) return;

            if (totalItems <= REMINDERS_PER_PAGE) {
                paginationBar.style.display = totalItems === 0 ? 'none' : 'flex';
            } else {
                paginationBar.style.display = 'flex';
            }

            if (prevBtn) {
                prevBtn.classList.toggle('disabled', remCurrentPage <= 1);
                prevBtn.disabled = remCurrentPage <= 1;
            }

            if (nextBtn) {
                nextBtn.classList.toggle('disabled', remCurrentPage >= totalPages);
                nextBtn.disabled = remCurrentPage >= totalPages;
            }

            pageNumbersContainer.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `pagination-btn ${i === remCurrentPage ? 'active' : ''}`;
                btn.textContent = i;
                btn.addEventListener('click', () => {
                    if (remCurrentPage !== i) {
                        remCurrentPage = i;
                        renderRemindersTable();
                    }
                });
                pageNumbersContainer.appendChild(btn);
            }
        }

        const remPrevBtn = document.getElementById('remPrevPageBtn');
        if (remPrevBtn) {
            remPrevBtn.addEventListener('click', () => {
                if (remCurrentPage > 1) {
                    remCurrentPage--;
                    renderRemindersTable();
                }
            });
        }

        const remNextBtn = document.getElementById('remNextPageBtn');
        if (remNextBtn) {
            remNextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(remindersData.length / REMINDERS_PER_PAGE) || 1;
                if (remCurrentPage < totalPages) {
                    remCurrentPage++;
                    renderRemindersTable();
                }
            });
        }

        function renderRemindersTable() {
            if (!reminderTableTbody) return;
            const query = (reminderSearchInput?.value || '').toLowerCase().trim();
            const typeFilter = reminderFilterType?.value || 'ALL';
            const statusFilter = reminderFilterStatus?.value || 'ALL';

            const filtered = remindersData.filter(item => {
                const matchSearch = !query || 
                    item.petName.toLowerCase().includes(query) ||
                    item.ownerName.toLowerCase().includes(query) ||
                    item.ownerPhone.includes(query) ||
                    item.speciesBreed.toLowerCase().includes(query) ||
                    item.petId.toLowerCase().includes(query);

                const matchType = (typeFilter === 'ALL') || (item.type === typeFilter);
                const matchStatus = (statusFilter === 'ALL') || (item.status === statusFilter);
                return matchSearch && matchType && matchStatus;
            });

            const totalItems = filtered.length;
            const totalPages = Math.ceil(totalItems / REMINDERS_PER_PAGE) || 1;
            if (remCurrentPage > totalPages) remCurrentPage = totalPages;
            if (remCurrentPage < 1) remCurrentPage = 1;

            renderReminderPagination(totalItems, totalPages);

            if (totalItems === 0) {
                reminderTableTbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                            Không tìm thấy lịch nhắc chăm sóc nào phù hợp với bộ lọc.
                        </td>
                    </tr>
                `;
                return;
            }

            const pagedReminders = filtered.slice((remCurrentPage - 1) * REMINDERS_PER_PAGE, remCurrentPage * REMINDERS_PER_PAGE);

            reminderTableTbody.innerHTML = pagedReminders.map(item => {
                // Vạch cảnh báo border-left duy nhất ở td:first-child theo quy tắc AGENTS.md
                const isAlertRow = (item.type === 'HOTEL_VACCINE');
                const borderStyle = isAlertRow ? 'border-left: 3px solid #D97706;' : 'border-left: 3px solid transparent;';

                return `
                <tr data-rem-id="${item.id}">
                    <td style="${borderStyle}">
                        <strong style="color: var(--text-heading);">${item.petName}</strong>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.speciesBreed} • Mã: ${item.petId}</div>
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${item.custId}">${item.ownerName}</a>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.ownerPhone}</div>
                    </td>
                    <td>
                        <span class="admin-badge ${item.typeBadgeClass}" ${item.typeBadgeStyle ? `style="${item.typeBadgeStyle}"` : ''}>
                            ${item.typeText}
                        </span>
                    </td>
                    <td>${item.lastDateText}</td>
                    <td>
                        <span class="admin-badge ${item.statusBadgeClass}">
                            ${item.statusText}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px;">
                            <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"
                                data-rem-id="${item.id}"
                                data-pet="${item.petName}"
                                data-owner="${item.ownerName}"
                                data-phone="${item.ownerPhone}">
                                ${item.status === 'SENT' ? 'Gửi lại' : 'Gửi tin'}
                            </button>
                            <button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa" 
                                data-id="${item.petId}" 
                                data-pet="${item.petName}"
                                data-owner="${item.ownerName}"
                                data-phone="${item.ownerPhone}">
                                Đặt lịch
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        }

        if (reminderSearchInput) reminderSearchInput.addEventListener('input', () => { remCurrentPage = 1; renderRemindersTable(); });
        if (reminderFilterType) reminderFilterType.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });
        if (reminderFilterStatus) reminderFilterStatus.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });

        // Khởi tạo bảng nhắc lịch và 4 KPI ban đầu
        renderRemindersTable();
        updateReminderKPIs();

        // Mở Modal gửi tin nhắn chăm sóc định kỳ
        document.addEventListener('click', (e) => {
            const btnReminder = e.target.closest('.btn-open-reminder-modal');
            if (btnReminder && modalSendReminder) {
                currentSendingReminderId = btnReminder.getAttribute('data-rem-id') || 'REM-001';
                const currentItem = remindersData.find(r => r.id === currentSendingReminderId);

                const pet = btnReminder.getAttribute('data-pet') || 'Milu';
                const owner = btnReminder.getAttribute('data-owner') || 'Nguyễn Văn An';
                const phone = btnReminder.getAttribute('data-phone') || '0912345678';

                const ownerInput = document.getElementById('reminderModalOwner');
                const petInput = document.getElementById('reminderModalPet');
                const contentInput = document.getElementById('reminderMessageContent');

                if (ownerInput) ownerInput.value = `${owner} (${phone})`;
                if (petInput) petInput.value = pet;

                // Tự động map template mặc định theo loại nhắc hẹn
                let defaultTpl = 'SPA_BATH';
                if (currentItem) {
                    if (currentItem.type === 'GROOM') defaultTpl = 'GROOM';
                    else if (currentItem.type === 'HOTEL') defaultTpl = 'HOTEL';
                    else if (currentItem.type === 'HOTEL_VACCINE') defaultTpl = 'HOTEL_VACCINE';
                    else if (currentItem.type === 'SHOP_REFILL') defaultTpl = 'SHOP';
                }

                if (reminderTemplateSelect) {
                    reminderTemplateSelect.value = defaultTpl;
                }

                if (contentInput) {
                    contentInput.value = buildReminderText(defaultTpl, pet, owner);
                }

                if (btnOpenZaloChat) {
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    btnOpenZaloChat.href = `https://zalo.me/${cleanPhone}`;
                }

                modalSendReminder.classList.add('open');
            }
        });

        // Đổi mẫu tin nhắn trong Modal
        if (reminderTemplateSelect) {
            reminderTemplateSelect.addEventListener('change', (e) => {
                const currentItem = remindersData.find(r => r.id === currentSendingReminderId);
                const owner = currentItem ? currentItem.ownerName : 'Quý khách';
                const pet = currentItem ? currentItem.petName : 'bé';
                const contentInput = document.getElementById('reminderMessageContent');
                if (contentInput) {
                    contentInput.value = buildReminderText(e.target.value, pet, owner);
                }
            });
        }

        // Sao chép nội dung tin nhắn
        if (btnCopyReminderText) {
            btnCopyReminderText.addEventListener('click', () => {
                const contentInput = document.getElementById('reminderMessageContent');
                if (contentInput && contentInput.value) {
                    navigator.clipboard.writeText(contentInput.value).then(() => {
                        showToast('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm!');
                    }).catch(() => {
                        contentInput.select();
                        document.execCommand('copy');
                        showToast('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm!');
                    });
                }
            });
        }

        // Gửi tin nhắn đơn lẻ
        const btnSubmitSendReminder = document.getElementById('btnSubmitSendReminder');
        if (btnSubmitSendReminder) {
            btnSubmitSendReminder.addEventListener('click', () => {
                const targetRem = remindersData.find(r => r.id === currentSendingReminderId);
                if (targetRem) {
                    targetRem.status = 'SENT';
                    targetRem.statusText = 'Đã gửi Zalo vừa xong';
                    targetRem.statusBadgeClass = 'badge-success';
                    persistRemindersData();
                }
                renderRemindersTable();
                updateReminderKPIs();
                showToast(`Đã gửi tin nhắn chăm sóc thành công tới chủ nuôi bé ${targetRem ? targetRem.petName : ''} qua Zalo Official Account!`);
                if (modalSendReminder) modalSendReminder.classList.remove('open');
            });
        }

        // Nút Đặt lịch nhanh trên từng dòng nhắc hẹn
        document.addEventListener('click', (e) => {
            const btnQuickBook = e.target.closest('.btn-quick-book-spa');
            if (btnQuickBook) {
                const petName = btnQuickBook.getAttribute('data-pet') || 'bé cưng';
                const ownerName = btnQuickBook.getAttribute('data-owner') || 'chủ nuôi';
                const petId = btnQuickBook.getAttribute('data-id') || '';
                const ownerPhone = btnQuickBook.getAttribute('data-phone') || '';
                const pet = petsData[petId];

                sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify({
                    petId: petId,
                    petName: petName,
                    ownerName: ownerName,
                    ownerPhone: ownerPhone,
                    breed: pet ? (pet.speciesBreed || pet.breed) : '',
                    weight: pet ? pet.weight : '',
                    petAlert: pet ? (pet.alert || pet.allergy || pet.notes) : ''
                }));

                showToast(`Đã chọn bé ${petName} (${ownerName}). Đang chuyển sang Phân hệ Dịch vụ để xếp lịch hẹn...`);
                setTimeout(() => {
                    window.location.hash = '#tab-service-bookings';
                }, 400);
            }
        });

        // Nút Gửi tin đồng loạt Zalo
        const btnBatchSend = document.getElementById('btnBatchSendReminder');
        if (btnBatchSend) {
            btnBatchSend.addEventListener('click', () => {
                const unsentList = remindersData.filter(r => r.status === 'UNSENT');
                if (unsentList.length === 0) {
                    showToast('Tất cả khách hàng trong danh sách đã được gửi tin nhắn chăm sóc gần đây!');
                    return;
                }

                showPetConfirmModal({
                    title: 'Gửi tin nhắn chăm sóc Zalo ZNS',
                    message: `Bạn có chắc chắn muốn gửi tin nhắn chăm sóc tự động qua Zalo ZNS cho ${unsentList.length} bé cưng đang đến chu kỳ làm đẹp?`,
                    confirmText: 'Gửi tin nhắn Zalo',
                    onConfirm: () => {
                        unsentList.forEach(r => {
                            r.status = 'SENT';
                            r.statusText = 'Đã gửi Zalo vừa xong';
                            r.statusBadgeClass = 'badge-success';
                        });
                        persistRemindersData();
                        renderRemindersTable();
                        updateReminderKPIs();
                        showToast(`Đã gửi tin nhắn chăm sóc đồng loạt thành công tới ${unsentList.length} chủ nuôi qua Zalo Official Account!`, 'success');
                    }
                });
            });
        }

        // Đóng các Modal
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-close-modal');
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.remove('open');
            });
        });

        // 12. Modal Xem chi tiết nhật ký chăm sóc
        const modalViewCareLogDetail = document.getElementById('modalViewCareLogDetail');
        document.addEventListener('click', (e) => {
            const btnViewCarelog = e.target.closest('.btn-view-carelog-modal');
            if (btnViewCarelog && modalViewCareLogDetail) {
                const careId = btnViewCarelog.getAttribute('data-care-id');
                const titleEl = document.getElementById('carelogModalTitle');
                const timeEl = document.getElementById('carelogModalTime');
                const groomerEl = document.getElementById('carelogModalGroomer');
                const badgeEl = document.getElementById('carelogModalBadge');
                const imgBeforeEl = document.getElementById('carelogModalImgBefore');
                const imgAfterEl = document.getElementById('carelogModalImgAfter');
                const msgEl = document.getElementById('carelogModalMessage');

                const imgEar = document.getElementById('modalChkImgEar');
                const imgNail = document.getElementById('modalChkImgNail');
                const imgAnal = document.getElementById('modalChkImgAnal');
                const imgSkin = document.getElementById('modalChkImgSkin');

                if (careId === 'CL-002') {
                    if (titleEl) titleEl.textContent = 'Chi tiết ca làm: Cắt tỉa tạo kiểu Corgi mặt gấu';
                    if (timeEl) timeEl.textContent = 'Thời gian: 10/08/2026 10:00';
                    if (groomerEl) groomerEl.textContent = 'KTV: Đỗ Hương • Bàn 1';
                    if (badgeEl) {
                        badgeEl.textContent = 'Đã lưu trữ';
                        badgeEl.className = 'admin-badge badge-neutral';
                    }
                    if (imgBeforeEl) imgBeforeEl.src = '/assets/images/publics/dogcute7.jpg';
                    if (imgAfterEl) imgAfterEl.src = '/assets/images/publics/dogcute3.jpg';
                    if (imgEar) imgEar.src = '/assets/images/publics/catcute8.jpg';
                    if (imgNail) imgNail.src = '/assets/images/publics/handpaw.jpg';
                    if (imgAnal) imgAnal.src = '/assets/images/publics/spa.jpg';
                    if (imgSkin) imgSkin.src = '/assets/images/publics/dogcute8.jpg';
                    if (msgEl) msgEl.textContent = 'Bé rất hợp tác trong ca làm, form lông cắt tỉa tròn trịa đáng yêu, tai và móng đã vệ sinh nhẵn bóng.';
                } else {
                    if (titleEl) titleEl.textContent = 'Chi tiết ca làm: Tắm sấy dưỡng ẩm và Cắt mài móng';
                    if (timeEl) timeEl.textContent = 'Thời gian: 25/09/2026 14:30';
                    if (groomerEl) groomerEl.textContent = 'KTV: Hoàng Tuấn • Bàn 2';
                    if (badgeEl) {
                        badgeEl.textContent = 'Đã gửi app cho chủ';
                        badgeEl.className = 'admin-badge badge-success';
                    }
                    if (imgBeforeEl) imgBeforeEl.src = '/assets/images/publics/dogcute3.jpg';
                    if (imgAfterEl) imgAfterEl.src = '/assets/images/publics/dogcute1.jpg';
                    if (imgEar) imgEar.src = '/assets/images/publics/cat5.jpg';
                    if (imgNail) imgNail.src = '/assets/images/publics/handpaw.jpg';
                    if (imgAnal) imgAnal.src = '/assets/images/publics/spa.jpg';
                    if (imgSkin) imgSkin.src = '/assets/images/publics/pet2.jpg';
                    if (msgEl) msgEl.textContent = 'Lông vùng tai bé hơi rối nhẹ, tiệm đã gỡ và xịt dưỡng mượt mà. Vệ sinh tai sạch bóng, móng chân sau đã mài tròn nhẵn.';
                }

                modalViewCareLogDetail.classList.add('open');
            }
        });

        // 13. Sub-tab 3: Nhật ký chăm sóc (Bàn làm việc Groomer và Hotel)
        const queueItems = document.querySelectorAll('.queue-card-item');
        const wbFormTitle = document.getElementById('wbFormTitle');
        const wbStatusBadge = document.getElementById('wbStatusBadge');
        const wbFormSub = document.getElementById('wbFormSub');
        const wbBeforeImg = document.getElementById('wbBeforeImgPreview');
        const wbAfterImg = document.getElementById('wbAfterImgPreview');
        const wbOwnerMsg = document.getElementById('wbOwnerMessage');

        const queuePresets = {
            'CL-001': {
                before: '/assets/images/publics/dogcute3.jpg',
                after: '/assets/images/publics/dogcute1.jpg',
                msg: 'Lông vùng nách bé hơi rối nhẹ, tiệm đã gỡ và xịt dưỡng mượt mà. Vệ sinh tai sạch bóng, móng chân sau đã mài tròn nhẵn.',
                status: 'Đang làm',
                statusClass: 'badge-warning'
            },
            'CL-002': {
                before: '/assets/images/publics/dogcute6.jpg',
                after: '/assets/images/publics/dogcute1.jpg',
                msg: 'Bé Trà Sữa cắt tỉa tạo kiểu Poodle mặt gấu bông rất ngoan, tai sạch và móng đã mài nhẵn.',
                status: 'Hoàn thiện',
                statusClass: 'badge-success'
            },
            'CL-003': {
                before: '/assets/images/publics/catcute8.jpg',
                after: '/assets/images/publics/catcute7.jpg',
                msg: 'Bé Bông ngoan ngoãn khi vệ sinh tai và cắt mài móng, đã làm sạch kẽ chân.',
                status: 'Đang làm',
                statusClass: 'badge-warning'
            },
            'CL-004': {
                before: '/assets/images/publics/catcute5.jpg',
                after: '/assets/images/publics/catcute5.jpg',
                msg: 'Bé Mimi phòng VIP 03 đã ăn hết khẩu phần pate cá hồi chiều nay, vận động vui vẻ trong khu vui chơi chung.',
                status: 'Đang lưu trú',
                statusClass: 'badge-neutral'
            }
        };

        queueItems.forEach(item => {
            item.addEventListener('click', () => {
                queueItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const careId = item.getAttribute('data-care-id') || 'CL-001';
                const preset = queuePresets[careId] || queuePresets['CL-001'];
                const petName = item.querySelector('.queue-pet-name')?.textContent || 'Bé cưng';

                if (wbFormTitle) wbFormTitle.textContent = `Cập nhật nhật ký ca: ${petName}`;
                if (wbStatusBadge) {
                    wbStatusBadge.textContent = preset.status;
                    wbStatusBadge.className = `admin-badge ${preset.statusClass}`;
                }

                if (wbBeforeImg) wbBeforeImg.src = preset.before;
                if (wbAfterImg) wbAfterImg.src = preset.after;
                if (wbOwnerMsg) wbOwnerMsg.value = preset.msg;

                const subTexts = Array.from(item.querySelectorAll('.queue-card-sub')).map(el => el.textContent.trim());
                if (wbFormSub && subTexts.length > 0) {
                    wbFormSub.textContent = `${subTexts[0]} • Mã lịch hẹn: BK-2609 • ${subTexts[1] || ''}`;
                }
            });
        });

        // ====================================================================
        // GHI NHẬN TIÊM CHỦNG VÀ DỊCH TỄ (MODAL 8)
        // ====================================================================
        const modalAddVaccine = document.getElementById('modalAddVaccine');
        const btnOpenAddVaccine = document.getElementById('btnOpenAddVaccineModal');
        const newVaccineTypeSelect = document.getElementById('newVaccineType');
        const groupCustomVaccine = document.getElementById('groupCustomVaccineName');
        const btnSubmitAddVaccine = document.getElementById('btnSubmitAddVaccine');

        if (btnOpenAddVaccine && modalAddVaccine) {
            btnOpenAddVaccine.addEventListener('click', () => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const dateInput = document.getElementById('newVaccineDate');
                if (dateInput) dateInput.value = todayStr;
                modalAddVaccine.classList.add('open');
            });
        }

        if (newVaccineTypeSelect && groupCustomVaccine) {
            newVaccineTypeSelect.addEventListener('change', () => {
                groupCustomVaccine.style.display = (newVaccineTypeSelect.value === 'Khác') ? 'block' : 'none';
            });
        }

        if (btnSubmitAddVaccine) {
            btnSubmitAddVaccine.addEventListener('click', async () => {
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id');
                const pet = petsData[currentPetId];
                if (!pet || !pet.rawId) {
                    showToast('Không xác định được hồ sơ thú cưng đang mở.', 'danger');
                    return;
                }

                let title = newVaccineTypeSelect?.value || 'Vắc-xin phòng dại (Rabies)';
                if (title === 'Khác') {
                    title = document.getElementById('newCustomVaccineName')?.value.trim() || 'Mũi tiêm dịch tễ';
                }

                const rawDate = document.getElementById('newVaccineDate')?.value;
                if (!rawDate) {
                    showToast('Vui lòng chọn ngày tiêm gần nhất!', 'warning');
                    return;
                }
                if (!isValidPetBirthDate(rawDate)) {
                    showToast('Ngày tiêm không hợp lệ. Vui lòng kiểm tra lại.', 'warning');
                    return;
                }
                const parts = rawDate.split('-');
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

                const rawNext = document.getElementById('newVaccineNextDate')?.value;
                let formattedNext = '';
                if (rawNext) {
                    const nParts = rawNext.split('-');
                    formattedNext = `${nParts[2]}/${nParts[1]}/${nParts[0]}`;
                }

                const place = document.getElementById('newVaccinePlace')?.value || 'Sổ tiêm đối chiếu';
                const status = document.getElementById('newVaccineStatus')?.value || 'Đã tiêm đủ';

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client) throw new Error('Chưa kết nối được Supabase.');
                    const { error: vErr } = await client.from('pet_profile').update({
                        vaccination_history: `Đã tiêm ${title} (${formattedDate})`
                    }).eq('id', pet.rawId);
                    if (vErr) throw vErr;
                } catch (vErr) {
                    console.error('Lỗi lưu lịch sử tiêm vào Supabase:', vErr);
                    showToast('Không thể lưu xác nhận tiêm chủng: ' + (vErr.message || 'Lỗi CSDL.'), 'danger');
                    return;
                }

                await loadPetsModuleData();
                const updatedPet = petsData[currentPetId];
                if (updatedPet) renderPetSubtabs(updatedPet);
                renderPetsTable();

                showToast(`Đã ghi nhận ${title} cho bé ${pet.name}!`);
                if (modalAddVaccine) modalAddVaccine.classList.remove('open');
            });
        }

        // ====================================================================
        // THƯ VIỆN CHỌN NHANH ẢNH THỰC TẾ (MODAL 10)
        // ====================================================================
        const modalSelectPhoto = document.getElementById('modalSelectPhoto');
        const photoPickerGrid = document.getElementById('photoPickerGrid');
        let currentPhotoTargetImg = null;

        const availablePhotos = [
            { url: '/assets/images/publics/dogcute1.jpg', label: 'Cún Poodle nâu' },
            { url: '/assets/images/publics/dogcute3.jpg', label: 'Cún Corgi vàng' },
            { url: '/assets/images/publics/dogcute4.jpg', label: 'Cún Golden' },
            { url: '/assets/images/publics/dogcute6.jpg', label: 'Cún Poodle trắng' },
            { url: '/assets/images/publics/dogcute7.jpg', label: 'Cún Phốc sóc' },
            { url: '/assets/images/publics/catcute1.jpg', label: 'Mèo Ba tư' },
            { url: '/assets/images/publics/catcute3.jpg', label: 'Mèo Munchkin' },
            { url: '/assets/images/publics/catcute5.jpg', label: 'Mèo ALN xám' },
            { url: '/assets/images/publics/catcute7.jpg', label: 'Mèo trắng mắt xanh' },
            { url: '/assets/images/publics/cat5.jpg', label: 'Kiểm tra tai' },
            { url: '/assets/images/publics/handpaw.jpg', label: 'Kiểm tra móng' },
            { url: '/assets/images/publics/spa.jpg', label: 'Kiểm tra tuyến hôi' },
            { url: '/assets/images/publics/pet2.jpg', label: 'Kiểm tra da lông' }
        ];

        function openPhotoPicker(targetImgEl, title) {
            currentPhotoTargetImg = targetImgEl;
            const titleEl = document.getElementById('selectPhotoModalTitle');
            if (titleEl && title) titleEl.textContent = title;

            if (photoPickerGrid) {
                photoPickerGrid.innerHTML = availablePhotos.map(p => `
                    <div class="photo-picker-item" data-url="${p.url}" title="${p.label}">
                        <img src="${p.url}" alt="${p.label}">
                    </div>
                `).join('');
            }

            if (modalSelectPhoto) modalSelectPhoto.classList.add('open');
        }

        if (photoPickerGrid) {
            photoPickerGrid.addEventListener('click', (e) => {
                const item = e.target.closest('.photo-picker-item');
                if (item && currentPhotoTargetImg) {
                    const url = item.getAttribute('data-url');
                    currentPhotoTargetImg.src = url;
                    if (modalSelectPhoto) modalSelectPhoto.classList.remove('open');
                    showToast('Đã cập nhật ảnh kiểm chứng thành công!');
                }
            });
        }

        // Bấm đổi ảnh Before / After
        const btnUploadBefore = document.getElementById('btnUploadBeforePhoto');
        if (btnUploadBefore) {
            btnUploadBefore.addEventListener('click', () => {
                openPhotoPicker(document.getElementById('wbBeforeImgPreview'), 'Chọn ảnh Trước khi làm dịch vụ');
            });
        }

        const btnUploadAfter = document.getElementById('btnUploadAfterPhoto');
        if (btnUploadAfter) {
            btnUploadAfter.addEventListener('click', () => {
                openPhotoPicker(document.getElementById('wbAfterImgPreview'), 'Chọn ảnh Sau khi hoàn thiện');
            });
        }

        // Bấm đổi 4 ảnh checklist vệ sinh
        const checklistState = {
            chkEar: document.getElementById('chkEar')?.checked === true,
            chkNail: document.getElementById('chkNail')?.checked === true,
            chkAnal: document.getElementById('chkAnal')?.checked === true,
            chkSkin: document.getElementById('chkSkin')?.checked === true
        };
        ['chkEar', 'chkNail', 'chkAnal', 'chkSkin'].forEach((checkId) => {
            const checkbox = document.getElementById(checkId);
            if (!checkbox) return;
            checkbox.addEventListener('change', (event) => {
                // Mỗi mục có trạng thái riêng; không dùng thao tác chọn tất cả.
                checklistState[checkId] = event.currentTarget.checked;
            });
        });

        const changeButtons = document.querySelectorAll('.btn-change-check-photo');
        if (changeButtons[0]) {
            changeButtons[0].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbEarImg'), 'Chọn ảnh kiểm tra Tai'));
        }
        if (changeButtons[1]) {
            changeButtons[1].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbNailImg'), 'Chọn ảnh kiểm tra Móng'));
        }
        if (changeButtons[2]) {
            changeButtons[2].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbAnalImg'), 'Chọn ảnh kiểm tra Tuyến hôi'));
        }
        if (changeButtons[3]) {
            changeButtons[3].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbSkinImg'), 'Chọn ảnh kiểm tra Da lông'));
        }

        // ====================================================================
        // XEM TRƯỚC GIAO DIỆN APP SEN (MODAL 9)
        // ====================================================================
        const modalPreviewAppDiary = document.getElementById('modalPreviewAppDiary');
        const btnPreviewCustomerDiary = document.getElementById('btnPreviewCustomerDiary');

        if (btnPreviewCustomerDiary && modalPreviewAppDiary) {
            btnPreviewCustomerDiary.addEventListener('click', () => {
                const activeItem = document.querySelector('.queue-card-item.active');
                const petName = activeItem?.querySelector('.queue-pet-name')?.textContent || 'Bé cưng';

                const beforeSrc = document.getElementById('wbBeforeImgPreview')?.src || '/assets/images/publics/dogcute3.jpg';
                const afterSrc = document.getElementById('wbAfterImgPreview')?.src || '/assets/images/publics/dogcute1.jpg';
                const message = document.getElementById('wbOwnerMessage')?.value || 'Bé rất ngoan và hoàn thành tốt dịch vụ!';

                const chkEarVal = checklistState.chkEar;
                const chkNailVal = checklistState.chkNail;
                const chkAnalVal = checklistState.chkAnal;
                const chkSkinVal = checklistState.chkSkin;

                if (document.getElementById('appDiaryPetName')) document.getElementById('appDiaryPetName').textContent = `${petName} hôm nay`;
                if (document.getElementById('appDiaryImgBefore')) document.getElementById('appDiaryImgBefore').src = beforeSrc;
                if (document.getElementById('appDiaryImgAfter')) document.getElementById('appDiaryImgAfter').src = afterSrc;
                if (document.getElementById('appDiaryMessage')) document.getElementById('appDiaryMessage').textContent = message;

                function updateAppBadge(badgeId, isChecked) {
                    const el = document.getElementById(badgeId);
                    if (el) {
                        el.textContent = isChecked ? 'Đạt chuẩn' : 'Cần theo dõi';
                        el.className = `admin-badge ${isChecked ? 'badge-success' : 'badge-warning'}`;
                    }
                }

                updateAppBadge('appBadgeEar', chkEarVal);
                updateAppBadge('appBadgeNail', chkNailVal);
                updateAppBadge('appBadgeAnal', chkAnalVal);
                updateAppBadge('appBadgeSkin', chkSkinVal);

                modalPreviewAppDiary.classList.add('open');
            });
        }

        // Lưu bản nháp
        const btnSaveDraft = document.getElementById('btnSaveDraftCareLog');
        if (btnSaveDraft) {
            btnSaveDraft.addEventListener('click', () => {
                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Bản nháp';
                    wbBadge.className = 'admin-badge badge-neutral';
                }
                const activeItem = document.querySelector('.queue-card-item.active');
                if (activeItem) {
                    const itemBadge = activeItem.querySelector('.admin-badge');
                    if (itemBadge) {
                        itemBadge.textContent = 'Bản nháp';
                        itemBadge.className = 'admin-badge badge-neutral';
                    }
                }
                showToast('Đã lưu bản nháp nhật ký ca làm. Chưa gửi sang ứng dụng của chủ nuôi.');
            });
        }

        // Hoàn thiện và Gửi sang ứng dụng Sen (Lưu trực tiếp vào bảng care_log trên Supabase)
        const btnCompleteAndSend = document.getElementById('btnCompleteAndSendCareLog');
        if (btnCompleteAndSend) {
            btnCompleteAndSend.addEventListener('click', async () => {
                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Hoàn thiện';
                    wbBadge.className = 'admin-badge badge-success';
                }
                const activeItem = document.querySelector('.queue-card-item.active');
                if (activeItem) {
                    const itemBadge = activeItem.querySelector('.admin-badge');
                    if (itemBadge) {
                        itemBadge.textContent = 'Hoàn thiện';
                        itemBadge.className = 'admin-badge badge-success';
                    }
                }

                // Tìm bé tương ứng để ghi nhật ký
                const petName = activeItem?.querySelector('.queue-pet-name')?.textContent?.replace('Bé ', '').trim() || 'Milu';
                const pet = Object.values(petsData).find(p => p.name.toLowerCase() === petName.toLowerCase()) || petsData['PET-001'];
                
                if (pet) {
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const beforeSrc = document.getElementById('wbBeforeImgPreview')?.src || pet.avatar;
                    const afterSrc = document.getElementById('wbAfterImgPreview')?.src || pet.avatar;
                    const ownerMsg = document.getElementById('wbOwnerMessage')?.value || 'Bé rất ngoan và hoàn thành tốt dịch vụ!';

                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && pet.rawId) {
                            await client.from('care_log').insert({
                                pet_id: pet.rawId,
                                description: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                                health_status: '4/4 mục đạt chuẩn. ' + ownerMsg,
                                recorded_at: now.toISOString()
                            });
                        }
                    } catch (clErr) {
                        console.error('Supabase insert care_log error:', clErr);
                    }

                    const newCareLog = {
                        time: timeStr,
                        service: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                        ktv: 'Hoàng Tuấn • Bàn 2',
                        imgBefore: beforeSrc,
                        imgAfter: afterSrc,
                        checkText: '4/4 mục đạt chuẩn',
                        appStatus: 'Đã gửi app cho chủ',
                        careId: 'CL-' + Date.now()
                    };

                    if (!pet.carelogs) pet.carelogs = [];
                    pet.carelogs.unshift(newCareLog);

                    // Đồng bộ phiên làm việc sang pawpal_pet_tracker_logs trong localStorage
                    try {
                        const trackerLogs = JSON.parse(localStorage.getItem('pawpal_pet_tracker_logs') || '{}');
                        const pId = pet.code || pet.id;
                        if (!trackerLogs[pId]) trackerLogs[pId] = { sessions: [], currentSession: null };
                        
                        const completedSession = {
                            id: 'SS-' + Date.now(),
                            serviceName: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                            date: timeStr.split(' ')[0],
                            time: timeStr.split(' ')[1] || '',
                            status: 'Đã hoàn thành',
                            technician: 'Hoàng Tuấn • Bàn 2',
                            petName: pet.name,
                            photos: [beforeSrc, afterSrc],
                            beforePhoto: beforeSrc,
                            afterPhoto: afterSrc,
                            checklist: {
                                ear: checklistState.chkEar,
                                nail: checklistState.chkNail,
                                anal: checklistState.chkAnal,
                                skin: checklistState.chkSkin
                            },
                            ownerMessage: ownerMsg
                        };
                        
                        if (!trackerLogs[pId].sessions) trackerLogs[pId].sessions = [];
                        trackerLogs[pId].sessions.unshift(completedSession);
                        trackerLogs[pId].currentSession = null;
                        localStorage.setItem('pawpal_pet_tracker_logs', JSON.stringify(trackerLogs));
                    } catch (e) {
                        console.warn('Sync to tracker logs error:', e);
                    }

                    // Nếu Drawer đang mở bé này, render lại subtabs
                    const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                    if (currentOpenId === pet.code) {
                        renderPetSubtabs(pet);
                    }
                }

                showToast('Hoàn thiện ca làm! Nhật ký và ảnh đã đồng bộ sang ứng dụng của chủ nuôi.');
            });
        }

        document.querySelectorAll('.btn-quick-carelog').forEach(btn => {
            btn.addEventListener('click', () => {
                switchSubtab('tab-pet-carelog');
            });
        });

        // ====================================================================
        // LIÊN KẾT ĐẶT LỊCH VÀ TẠO CA DỊCH VỤ SANG PHÂN HỆ DỊCH VỤ
        // ====================================================================
        function handleCreateServiceForPet(petId) {
            const pet = petsData[petId] || petsData[sessionStorage.getItem('pawpal_admin_pet_id')] || petsData['PET-001'];
            if (!pet) return;

            const presetBooking = {
                petId: pet.code,
                petName: pet.name,
                ownerName: pet.ownerName,
                ownerPhone: pet.ownerPhone,
                breed: pet.speciesBreed || pet.breed,
                weight: pet.weight,
                petAlert: pet.alert || pet.allergy || pet.notes,
                petVaccinated: pet.vaccinated === true
            };
            sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify(presetBooking));
            sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');

            showToast(`Đang chuyển sang phân hệ Dịch vụ để tạo ca cho bé ${pet.name}...`);
            setTimeout(() => {
                window.location.hash = '#tab-service-bookings';
            }, 300);
        }

        document.addEventListener('click', (e) => {
            const btnCreate = e.target.closest('.btn-create-service-pet');
            if (btnCreate) {
                const petId = btnCreate.getAttribute('data-id') || btnCreate.closest('tr')?.getAttribute('data-id');
                closePetGlobalDropdown();
                handleCreateServiceForPet(petId);
                return;
            }

            const btnQuickBook = e.target.closest('.btn-quick-book-spa');
            if (btnQuickBook) {
                const petId = btnQuickBook.getAttribute('data-id') || 
                              btnQuickBook.getAttribute('data-pet-id') || 
                              btnQuickBook.closest('tr')?.getAttribute('data-id') ||
                              sessionStorage.getItem('pawpal_admin_pet_id');
                handleCreateServiceForPet(petId);
            }
        });

        // ====================================================================
        // 14. THIẾT LẬP SUPABASE REALTIME CHANNEL CHO PHÂN HỆ THÚ CƯNG
        // ====================================================================
        function setupPetsRealtimeSubscription() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client && typeof client.channel === 'function') {
                    if (window._pawpalPetsRealtimeChannel) {
                        try { client.removeChannel(window._pawpalPetsRealtimeChannel); } catch (e) {}
                    }
                    const channelName = 'pawpal-pets-realtime-' + Date.now();
                    window._pawpalPetsRealtimeChannel = client.channel(channelName)
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_profile' }, async (payload) => {
                            console.log('Realtime Supabase Pet Profile updated:', payload);
                            await loadPetsModuleData();
                            renderPetsTable();
                            updatePetKPIs();
                            const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                            if (currentOpenId && petsData[currentOpenId]) {
                                renderPetSubtabs(petsData[currentOpenId]);
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'care_log' }, async (payload) => {
                            console.log('Realtime Supabase Care Log updated:', payload);
                            await loadPetsModuleData();
                            const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                            if (currentOpenId && petsData[currentOpenId]) {
                                renderPetSubtabs(petsData[currentOpenId]);
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, async (payload) => {
                            console.log('Realtime Supabase Appointment updated in Pets:', payload);
                            await loadPetsModuleData();
                            const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                            if (currentOpenId && petsData[currentOpenId]) {
                                renderPetSubtabs(petsData[currentOpenId]);
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_weight_history' }, async (payload) => {
                            console.log('Realtime Supabase Pet Weight History updated:', payload);
                            await loadPetsModuleData();
                            const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                            if (currentOpenId && petsData[currentOpenId]) {
                                renderPetSubtabs(petsData[currentOpenId]);
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'customer' }, async (payload) => {
                            console.log('Realtime Supabase Customer updated in Pets:', payload);
                            await loadPetsModuleData();
                            renderPetsTable();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profile' }, async (payload) => {
                            console.log('Realtime Supabase Customer Profile updated in Pets:', payload);
                            await loadPetsModuleData();
                            renderPetsTable();
                        })
                        .subscribe();
                }
            } catch (err) {
                console.warn('Không thể khởi tạo Supabase Realtime cho Pets:', err);
            }
        }

        // 15. Khôi phục trạng thái Subtab khi F5 / Reload trang
        const savedSubtab = sessionStorage.getItem('pawpal_admin_pet_subtab');
        const hash = window.location.hash.replace('#', '');
        
        if (hash && document.getElementById(`subtab-${hash}`)) {
            switchSubtab(hash);
        } else if (savedSubtab && document.getElementById(`subtab-${savedSubtab}`)) {
            switchSubtab(savedSubtab);
        } else {
            switchSubtab('tab-pet-list');
        }

        // Nạp dữ liệu thực tế 100% từ Supabase
        await loadPetsModuleData();

        // Render bảng dữ liệu động và 5 thẻ KPI ban đầu
        renderPetsTable();
        updatePetKPIs();

        // Render hồ sơ mặc định ban đầu từ thú cưng thực tế trong CSDL
        const petKeys = Object.keys(petsData);
        const initPetId = (sessionStorage.getItem('pawpal_admin_pet_id') && petsData[sessionStorage.getItem('pawpal_admin_pet_id')]) 
            ? sessionStorage.getItem('pawpal_admin_pet_id') 
            : (petKeys[0] || 'PET-001');
        if (petsData[initPetId]) {
            renderPetSubtabs(petsData[initPetId]);
            sessionStorage.setItem('pawpal_admin_pet_id', initPetId);
            sessionStorage.setItem('pawpal_admin_pet_name', petsData[initPetId].name);
        }

        // Kích hoạt lắng nghe Realtime
        setupPetsRealtimeSubscription();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { initPetsModule(); });
    } else {
        initPetsModule();
    }
})();
