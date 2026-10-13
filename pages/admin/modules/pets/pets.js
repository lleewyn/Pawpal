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
        customersData: {},
        isLoaded: false,
        loadError: null,
        appointments: [],
        careLogs: []
    };

    // Cache TTL 90 giây — không fetch lại khi chuyển phân hệ
    let _petsLastFetchedAt = 0;
    const PETS_CACHE_TTL_MS = 90_000;
    let _petsFetchPromise = null;

    // Nạp dữ liệu 100% Supabase Live Database
    async function loadPetsModuleData({ force = false } = {}) {
        if (_petsFetchPromise) return _petsFetchPromise;

        if (!force && Date.now() - _petsLastFetchedAt < PETS_CACHE_TTL_MS) {
            return;
        }

        _petsFetchPromise = (async () => {
            try {
                PawpalPets.state.loadError = null;
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');

                const loadCareLogs = async () => {
                    const logs = [];
                    for (let offset = 0; ; offset += 1000) {
                        const result = await client.from('care_log').select('id, appointment_id, pet_id, description, health_status, recorded_at, created_at').order('id').range(offset, offset + 999);
                        if (result.error) return result;
                        logs.push(...(result.data || []));
                        if ((result.data || []).length < 1000) return { data: logs, error: null };
                    }
                };
                // Tải song song 100% tất cả bảng dữ liệu (Triệt tiêu hoàn toàn Waterfall)
                const [custAccRes, custProfRes, apptsRes, careLogsRes, petsRes, weightHistoryRes] = await Promise.all([
                    client.from('customer').select('id, email, phone_main, account_status'),
                    client.from('customer_profile').select('id, customer_id, full_name, gender'),
                    client.from('appointment').select('id, appointment_code, customer_id, pet_id, appointment_date, appointment_time, appointment_status, total_price, service:service_id(service_name), staff:staff_id(full_name)').limit(500),
                    loadCareLogs(),
                    client.from('pet_profile').select('id, customer_id, pet_code, pet_name, avatar_url, species, breed, gender, date_of_birth, color, routine, weight, vaccination_history, allergy, status, created_at').order('created_at', { ascending: false }),
                    Promise.resolve(client.from('pet_weight_history').select('id, pet_id, weight, measured_at, recorded_by_name, created_at')).catch(() => ({ data: [] }))
                ]);
                for (const result of [custAccRes, custProfRes, apptsRes, careLogsRes, petsRes]) {
                    if (result.error) throw result.error;
                }
                const profiles = new Map((custProfRes.data || []).map(profile => [profile.customer_id, profile]));
                const custMap = Object.fromEntries((custAccRes.data || []).map(customer => [customer.id, {
                    id: customer.id,
                    name: profiles.get(customer.id)?.full_name || 'Chưa cập nhật tên',
                    phone: customer.phone_main || '',
                    email: customer.email || ''
                }]));

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
                        const appTime = app.appointment_time ? app.appointment_time.slice(0, 5) : '';
                        const priceStr = app.total_price != null ? Number(app.total_price).toLocaleString('vi-VN') + 'đ' : 'Chưa cập nhật';
                        
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
                            weight: 'Chưa ghi nhận',
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
                            service: cl.description || 'Chưa có ghi chú',
                            ktv: 'Kỹ thuật viên PawPal',
                            imgBefore: '',
                            imgAfter: '',
                            checkText: cl.health_status ? `Tình trạng: ${cl.health_status}` : 'Chưa ghi nhận',
                            appStatus: 'Đã ghi nhận',
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
                        // Không đưa mã số/giá trị placeholder vào tên giống hiển thị.
                        const rawBreed = String(p.breed || '').trim();
                        const invalidBreed = !rawBreed || /^\d+$/.test(rawBreed) || /^(?:null|undefined|unknown|chưa rõ|chưa cập nhật)$/i.test(rawBreed);
                        const br = invalidBreed ? 'Chưa cập nhật' : rawBreed;
                        const specBreed = `${speciesNameMap[spec] || 'Chó'} ${br}`.trim();
                        const wNum = Number(p.weight);
                        const allg = p.allergy && p.allergy !== 'Không' ? p.allergy : '';
                        const isArch = p.status === 'INACTIVE' || p.status === 'ARCHIVED';
                        
                        const ownerObj = custMap[p.customer_id] || {};
                        const ownerName = ownerObj.name || 'Chưa cập nhật chủ nuôi';
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

                        const vaccinesList = p.vaccination_history ? [
                            {
                                title: 'Vắc-xin phòng dại và bệnh truyền nhiễm định kỳ',
                                status: p.vaccination_history && !p.vaccination_history.toLowerCase().includes('chưa') ? 'Đã tiêm đủ' : 'Chưa cập nhật',
                                date: p.vaccination_history,
                                nextDate: 'Hằng năm',
                                place: 'Sổ tiêm đối chiếu tại quầy'
                            }
                        ] : [];

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
                            notes: routine || '',
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
                PawpalPets.state.customersData = custMap;
                PawpalPets.state.appointments = apptsRes.data || [];
                PawpalPets.state.careLogs = careLogsRes.data || [];
                PawpalPets.state.isLoaded = true;
                _petsLastFetchedAt = Date.now();
            } catch (err) {
                PawpalPets.state.loadError = 'Không thể tải dữ liệu thú cưng. Vui lòng tải lại trang.';
                console.warn('[PawpalPets] Lỗi tải dữ liệu Supabase:', err);
            } finally {
                _petsFetchPromise = null;
                window.dispatchEvent(new CustomEvent('pawpal:pets-data-loaded'));
            }
        })();

        return _petsFetchPromise;
    }
    PawpalPets.loadPetsModuleData = loadPetsModuleData;

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(petName) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Thú cưng') return;
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (!document.getElementById('subtab-tab-pet-profile')?.classList.contains('active')) petName = null;
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
        window.scrollTo(0, 0);
        const contentArea = document.querySelector('.admin-preview-content');
        if (contentArea) contentArea.scrollTop = 0;

        const root = document.getElementById('subtab-tab-pet-list')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Thú cưng') return;
        if (!root.querySelector(`#subtab-${targetSubtab}`)) return;
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = root.querySelectorAll('.subtab-content');

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
    let _isPetsInit = false;

    async function initPetsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
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
        const savedPetId = sessionStorage.getItem('pawpal_admin_pet_id');
        const petId = PawpalPets.state.petsData[savedPetId] ? savedPetId : Object.keys(PawpalPets.state.petsData)[0];
        PawpalPets.subtabs.profile?.openPetProfile?.(petId, false);

        if (_isPetsInit) return; // Đã gắn event listeners rồi, không gắn lặp lại
        _isPetsInit = true;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client?.channel) {
            const channel = client.channel('admin-pets-live');
            const refresh = async () => {
                await loadPetsModuleData({ force: true });
                PawpalPets.subtabs.list?.renderPetsTable?.();
                PawpalPets.subtabs.list?.updatePetKPIs?.();
                const selected = sessionStorage.getItem('pawpal_admin_pet_id');
                PawpalPets.subtabs.profile?.openPetProfile?.(PawpalPets.state.petsData[selected] ? selected : Object.keys(PawpalPets.state.petsData)[0], false);
            };
            ['pet_profile', 'customer', 'customer_profile', 'appointment', 'care_log', 'pet_weight_history'].forEach(table => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
            });
            channel.subscribe();
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

        // Bộ xử lý đóng modal toàn cục cho phân hệ Thú cưng (Hỗ trợ nút Đóng, Hủy, click backdrop và phím Escape)
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                e.preventDefault();
                const modalId = closeBtn.getAttribute('data-close-modal');
                const targetModal = document.getElementById(modalId);
                if (targetModal) {
                    targetModal.classList.remove('open');
                    targetModal.classList.remove('show');
                }
                return;
            }

            if (e.target.classList.contains('admin-modal-backdrop') && e.target.classList.contains('open')) {
                e.target.classList.remove('open');
                e.target.classList.remove('show');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.admin-modal-backdrop.open');
                if (openModal) {
                    openModal.classList.remove('open');
                    openModal.classList.remove('show');
                }
            }
        });

        // Lắng nghe sự kiện đổi subtab từ router cha
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Thú cưng' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });
    }

    PawpalPets.init = initPetsModule;
    window.initPetsModule = initPetsModule;

    // Chỉ tự khởi động nếu module chạy độc lập mà không qua router admin.js
    if (!window._pawpalAdminLoaded && !document.querySelector('.admin-layout')) {
        initPetsModule();
    }
})();
