// pets.js - Phân hệ Quản lý Thú cưng Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    window.PawpalPetsModule = PawpalPets;
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    // Helper: Định dạng ngày giờ
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

    // Helper: Toast Notification chuẩn AGENTS.md
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

    // Helper: Confirm Modal Thú cưng
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

    // Export helpers sang namespace
    PawpalPets.formatDateTime = formatDateTime;
    PawpalPets.formatDate = formatDate;
    PawpalPets.formatTime = formatTime;
    PawpalPets.isValidPetBirthDate = isValidPetBirthDate;
    PawpalPets.toUnaccent = toUnaccent;
    PawpalPets.matchSearch = matchSearch;
    PawpalPets.showToast = showToast;
    PawpalPets.showPetConfirmModal = showPetConfirmModal;

    // State chung
    PawpalPets.state = {
        petsData: {},
        customersData: {}
    };

    // Nạp dữ liệu 100% Supabase Live Database
    async function loadPetsModuleData() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client) {
                // 1. Nạp khách hàng
                const [custAccRes, custProfRes] = await Promise.all([
                    client.from('customer').select('*'),
                    client.from('customer_profile').select('*')
                ]);

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
                PawpalPets.state.customersData = custMap;

                // 2. Nạp lịch hẹn, nhật ký, thú cưng, lịch sử cân nặng
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

                // 3. Map hồ sơ pet_profile
                const petsMap = {};
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
                        const weightLogs = petWeightHistoryMap[p.id] || [];

                        const vaccinesList = [
                            {
                                title: 'Vắc-xin phòng dại và bệnh truyền nhiễm định kỳ',
                                status: p.vaccination_history && !p.vaccination_history.toLowerCase().includes('chưa') ? 'Đã tiêm đủ' : 'Chưa cập nhật',
                                date: p.vaccination_history || 'Đã tiêm phòng đầy đủ',
                                nextDate: 'Hằng năm',
                                place: 'Sổ tiêm đối chiếu tại quầy'
                            }
                        ];

                        petsMap[code] = {
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
                PawpalPets.state.petsData = petsMap;
            }
        } catch (err) {
            console.warn('[PawpalPets] Lỗi tải dữ liệu Supabase:', err);
        }
    }
    PawpalPets.loadPetsModuleData = loadPetsModuleData;

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(petName) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
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
    PawpalPets.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(targetSubtab, updateHistory = true) {
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        subtabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
        });

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
    PawpalPets.switchSubtab = switchSubtab;

    // Helper mở hồ sơ từ bất kỳ subtab nào
    function openPetProfile(petId) {
        if (PawpalPets.subtabs?.profile?.openPetProfile) {
            PawpalPets.subtabs.profile.openPetProfile(petId);
        } else {
            sessionStorage.setItem('pawpal_admin_pet_id', petId);
            switchSubtab('tab-pet-profile');
        }
    }
    PawpalPets.openPetProfile = openPetProfile;

    async function initPetsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Render 4 subtab lên Header Bar
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

            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetSubtab = btn.getAttribute('data-subtab');
                    switchSubtab(targetSubtab, true);
                });
            });
        }

        // Tải dữ liệu ban đầu từ Supabase
        await loadPetsModuleData();

        // Khởi tạo các subtab con nếu đã load vào DOM
        if (PawpalPets.subtabs.list?.renderPetsTable) {
            PawpalPets.subtabs.list.renderPetsTable();
            PawpalPets.subtabs.list.updatePetKPIs();
        }
        if (PawpalPets.subtabs.carelog?.renderCarelogsTable) {
            PawpalPets.subtabs.carelog.renderCarelogsTable();
        }
        if (PawpalPets.subtabs.reminders?.renderRemindersTable) {
            PawpalPets.subtabs.reminders.renderRemindersTable();
        }

        // Khôi phục subtab active từ URL hash hoặc sessionStorage
        const savedSubtab = sessionStorage.getItem('pawpal_admin_pet_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';
        const validTabs = ['tab-pet-list', 'tab-pet-profile', 'tab-pet-carelog', 'tab-pet-reminders'];

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-pet-list', false);
        }

        // Hash change listener
        window.addEventListener('hashchange', () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        });
    }

    PawpalPets.init = initPetsModule;
    window.initPetsModule = initPetsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPetsModule);
    } else {
        initPetsModule();
    }
})();
