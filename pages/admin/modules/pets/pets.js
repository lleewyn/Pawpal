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

                const fetchPetsList = async () => {
                    const [custAccRes, custProfRes, petsRes] = await Promise.all([
                        client.from('customer').select('id, email, phone_main, account_status'),
                        client.from('customer_profile').select('id, customer_id, full_name, gender'),
                        client.from('pet_profile').select('id, customer_id, pet_code, pet_name, avatar_url, species, breed, gender, date_of_birth, color, routine, weight, vaccination_history, allergy, status, created_at').order('created_at', { ascending: false })
                    ]);
                    for (const res of [custAccRes, custProfRes, petsRes]) {
                        if (res.error) throw res.error;
                    }
                    return {
                        custAcc: custAccRes.data || [],
                        custProf: custProfRes.data || [],
                        pets: petsRes.data || []
                    };
                };

                const data = window.PawpalDataStore?.fetch
                    ? await window.PawpalDataStore.fetch('pets:list', fetchPetsList, {
                        ttlMs: window.PawpalDataStore.TTL.LIST,
                        force
                    })
                    : await fetchPetsList();

                const custAccData = data.custAcc || [];
                const custProfData = data.custProf || [];
                const petsDataList = data.pets || [];

                PawpalPets.state.weightTimeout = false;
                PawpalPets.state.weightLoadError = null;

                const profiles = new Map(custProfData.map(profile => [profile.customer_id, profile]));
                const custMap = Object.fromEntries(custAccData.map(customer => [customer.id, {
                    id: customer.id,
                    name: profiles.get(customer.id)?.full_name || 'Chưa cập nhật tên',
                    phone: customer.phone_main || '',
                    email: customer.email || ''
                }]));

                // Hồ sơ chủ nuôi có thể đọc được dù bảng tài khoản bị giới hạn bởi RLS.
                // Giữ khóa customer_id chuẩn, không bỏ mất tên chỉ vì thiếu hàng customer trong response.
                custProfData.forEach(profile => {
                    if (!profile.customer_id || custMap[profile.customer_id]) return;
                    custMap[profile.customer_id] = {
                        id: profile.customer_id,
                        name: profile.full_name || 'Chưa cập nhật tên',
                        phone: '',
                        email: ''
                    };
                });

                // 3. Map hồ sơ pet_profile (chi tiết cân nặng, lịch hẹn, care logs sẽ tải on-demand)
                const petsMap = {};
                if (Array.isArray(petsDataList) && petsDataList.length > 0) {
                    const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };

                    petsDataList.forEach((p, idx) => {
                        const code = p.pet_code || (p.id ? `PET-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `PET-${String(idx + 1).padStart(3, '0')}`);
                        const spec = (p.species || 'dog').toLowerCase();
                        // Không đưa mã số/giá trị placeholder vào tên giống hiển thị.
                        const rawBreed = String(p.breed || '').trim();
                        const invalidBreed = !rawBreed || /^\d+$/.test(rawBreed) || /^(?:null|undefined|unknown|chưa rõ|chưa cập nhật)$/i.test(rawBreed);
                        const br = invalidBreed ? 'Chưa cập nhật' : rawBreed;
                        const specBreed = `${speciesNameMap[spec] || 'Chó'} ${br}`.trim();
                        const wNum = Number(p.weight);
                        const allg = p.allergy && p.allergy !== 'Không' ? p.allergy : '';
                        const isArch = p.status === 'INACTIVE' || p.status === 'ARCHIVED' || p.status === 'tam_ngung' || p.status === 'da_an';
                        
                        const ownerObj = custMap[p.customer_id] || {};
                        const ownerName = ownerObj.name || (p.customer_id ? 'Chưa tải được thông tin chủ nuôi' : 'Thiếu liên kết chủ nuôi');
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

                        const vaccinesList = (p.vaccination_history || '').split('\n\n').filter(Boolean).map(record => {
                            const field = label => record.split('\n').find(line => line.startsWith(label + ': '))?.slice(label.length + 2) || '';
                            const legacy = record.match(/^Đã tiêm (.+) \((\d{2}\/\d{2}\/\d{4})\)$/);
                            return {
                                title: field('Loại') || legacy?.[1] || record,
                                status: field('Trạng thái') || 'Chưa xác nhận',
                                date: field('Ngày ghi nhận') || legacy?.[2] || 'Chưa cập nhật',
                                nextDate: field('Ngày tái chủng'),
                                place: field('Nguồn đối chiếu') || 'Chưa cập nhật'
                            };
                        });

                        petsMap[code] = {
                            id: code,
                            rawId: p.id,
                            code: code,
                            name: p.pet_name || 'Bé cưng',
                            species: spec,
                            speciesBreed: specBreed,
                            breed: br,
                            gender: (p.gender === 'FEMALE' || p.gender === 'female' || p.gender === 'Cái' || p.gender === 'nu') ? 'Cái' : ((p.gender === 'MALE' || p.gender === 'male' || p.gender === 'Đực' || p.gender === 'nam') ? 'Đực' : 'Chưa rõ'),
                            weight: Number.isFinite(wNum) && wNum > 0 ? `${wNum} kg` : 'Chưa cập nhật',
                            weightNum: wNum,
                            dob: dobFormatted,
                            dobRaw: p.date_of_birth || '',
                            color: p.color || 'Chưa cập nhật',
                            allergy: allg || 'Không ghi nhận',
                            allergies: allg,
                            notes: routine || '',
                            groomerNotes: routine || '',
                            alert: alertParts.join(' • '),
                            ownerName: ownerName,
                            ownerPhone: ownerObj.phone || '',
                            custId: p.customer_id || '',
                            avatar: p.avatar_url || (spec === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg'),
                            status: statusStr,
                            vaccinated: vaccinesList.some(v => /dại|rabies/i.test(v.title) && ['Đã tiêm đủ', 'Đã thực hiện', 'Đạt chuẩn'].includes(v.status)),
                            isHotel: p.status === 'HOTEL',
                            isArchived: isArch,
                            weightHistory: [],
                            vaccines: vaccinesList,
                            carelogs: [],
                            history: [],
                            _detailsLoaded: false
                        };
                    });
                }
                PawpalPets.state.petsData = petsMap;
                PawpalPets.state.customersData = custMap;
                PawpalPets.state.appointments = [];
                PawpalPets.state.careLogs = [];
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

    // Helper lazy-fetch chi tiết hồ sơ 1 thú cưng (Cân nặng, Care log, Lịch hẹn)
    PawpalPets.fetchPetProfileDetails = async function(pet, { force = false } = {}) {
        if (!pet || !pet.rawId) return pet;
        if (!force && pet._detailsLoaded) return pet;

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) return pet;

        try {
            const fetchDetails = async () => {
                const [wRes, cRes, aRes] = await Promise.all([
                    client.from('pet_weight_history')
                        .select('id, pet_id, weight, measured_at, recorded_by_name, created_at')
                        .eq('pet_id', pet.rawId)
                        .order('measured_at', { ascending: false })
                        .limit(30),
                    client.from('care_log')
                        .select('id, appointment_id, pet_id, description, health_status, recorded_at, created_at')
                        .eq('pet_id', pet.rawId)
                        .order('recorded_at', { ascending: false })
                        .limit(30),
                    client.from('appointment')
                        .select('id, appointment_code, customer_id, pet_id, appointment_date, appointment_time, appointment_status, total_price, service:service_id(service_name), staff:staff_id(full_name)')
                        .eq('pet_id', pet.rawId)
                        .order('appointment_date', { ascending: false })
                        .limit(30)
                ]);
                return {
                    weight: wRes.data || [],
                    careLogs: cRes.data || [],
                    appts: aRes.data || []
                };
            };

            const details = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch(`pets:details:${pet.rawId}`, fetchDetails, {
                    ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                    force
                })
                : await fetchDetails();

            // Map weight history
            pet.weightHistory = (details.weight || []).map(record => {
                const measuredAt = record.measured_at || record.created_at;
                const measuredWeight = Number(record.weight);
                return {
                    date: formatDate(measuredAt),
                    weight: `${measuredWeight} kg`,
                    tier: measuredWeight < 5 ? 'Dưới 5 kg' : (measuredWeight <= 10 ? 'Từ 5 đến 10 kg' : 'Trên 10 kg'),
                    by: record.recorded_by_name || 'Nhân viên PawPal',
                    measuredAt: new Date(measuredAt).getTime()
                };
            });

            // Map care logs
            pet.carelogs = (details.careLogs || []).map(cl => ({
                time: cl.recorded_at ? formatDateTime(cl.recorded_at) : '',
                service: cl.description || 'Chưa có ghi chú',
                ktv: 'Kỹ thuật viên PawPal',
                imgBefore: '',
                imgAfter: '',
                checkText: cl.health_status ? `Tình trạng: ${cl.health_status}` : 'Chưa ghi nhận',
                appStatus: 'Đã ghi nhận',
                careId: cl.id
            }));

            // Map history appointments
            pet.history = (details.appts || []).map(app => {
                const sName = app.service?.service_name || 'Dịch vụ Spa và Grooming';
                const appDate = app.appointment_date ? formatDate(app.appointment_date) : '';
                const appTime = app.appointment_time ? app.appointment_time.slice(0, 5) : '';
                const priceStr = app.total_price != null ? Number(app.total_price).toLocaleString('vi-VN') + 'đ' : 'Chưa cập nhật';
                const stRaw = (app.appointment_status || '').toUpperCase();
                let stText = 'Chờ xác nhận';
                if (stRaw === 'COMPLETED' || stRaw === 'DA_HOAN_TAT' || stRaw === 'DA_HOAN_THANH') stText = 'Đã hoàn thành';
                else if (stRaw === 'CONFIRMED' || stRaw === 'DA_XAC_NHAN') stText = 'Đã xác nhận';
                else if (stRaw === 'IN_PROGRESS' || stRaw === 'DANG_THUC_HIEN') stText = 'Đang thực hiện';
                else if (stRaw === 'CANCELLED' || stRaw === 'DA_HUY') stText = 'Đã hủy';

                return {
                    id: app.appointment_code || `BK-${app.id.slice(0, 4)}`,
                    rawId: app.id,
                    service: sName,
                    time: `${appDate} ${appTime}`,
                    weight: 'Chưa ghi nhận',
                    price: priceStr,
                    status: stText
                };
            });

            pet._detailsLoaded = true;
        } catch (e) {
            console.warn('[PawpalPets] Lỗi tải chi tiết bé cưng:', e);
        }
        return pet;
    };

    // Helper lazy-fetch care logs cho subtab Care Log
    PawpalPets.fetchCareLogsTab = async function({ force = false, limit = 100 } = {}) {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) return [];

        const fetchLogs = async () => {
            const [logsRes, apptsRes] = await Promise.all([
                client.from('care_log')
                    .select('id, appointment_id, pet_id, description, health_status, recorded_at, created_at')
                    .order('recorded_at', { ascending: false })
                    .limit(limit),
                client.from('appointment')
                    .select('id, customer_id, pet_id')
                    .limit(500)
            ]);
            return {
                logs: logsRes.data || [],
                appts: apptsRes.data || []
            };
        };

        const res = window.PawpalDataStore?.fetch
            ? await window.PawpalDataStore.fetch(`pets:carelogs:recent:${limit}`, fetchLogs, {
                ttlMs: window.PawpalDataStore.TTL.LIST,
                force
            })
            : await fetchLogs();

        PawpalPets.state.careLogs = res.logs || [];
        if (res.appts?.length > 0) {
            PawpalPets.state.appointments = res.appts;
        }
        return PawpalPets.state.careLogs;
    };

    // Helper lazy-fetch appointments cho subtab Nhắc lịch (Reminders)
    PawpalPets.fetchRemindersAppointments = async function({ force = false } = {}) {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) return [];

        const fetchAppts = async () => {
            const { data } = await client.from('appointment')
                .select('id, appointment_code, customer_id, pet_id, appointment_date, appointment_status, service:service_id(service_name)')
                .eq('appointment_status', 'COMPLETED')
                .order('appointment_date', { ascending: false })
                .limit(500);
            return data || [];
        };

        const appts = window.PawpalDataStore?.fetch
            ? await window.PawpalDataStore.fetch('pets:appointments:completed', fetchAppts, {
                ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                force
            })
            : await fetchAppts();

        PawpalPets.state.appointments = appts;
        return appts;
    };

    PawpalPets.getPet = function(idOrCode) {
        if (!idOrCode) return null;
        const db = PawpalPets.state?.petsData || {};
        if (db[idOrCode]) return db[idOrCode];
        return Object.values(db).find(p => p.rawId === idOrCode || p.code === idOrCode || p.id === idOrCode) || null;
    };

    PawpalPets.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(petName) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Thú cưng') return;
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (!document.getElementById('subtab-tab-pet-profile')?.classList.contains('active')) petName = null;
        if (petName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalPets.escapeHtml(petName)}</span>
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
            const refresh = () => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Thú cưng',
                        invalidatePattern: 'pets:*',
                        onActiveRefresh: async () => {
                            await loadPetsModuleData({ force: true });
                            PawpalPets.subtabs.list?.renderPetsTable?.();
                            PawpalPets.subtabs.list?.updatePetKPIs?.();
                            const selected = sessionStorage.getItem('pawpal_admin_pet_id');
                            PawpalPets.subtabs.profile?.openPetProfile?.(PawpalPets.state.petsData[selected] ? selected : Object.keys(PawpalPets.state.petsData)[0], false);
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Thú cưng') {
                    loadPetsModuleData({ force: true }).then(() => {
                        PawpalPets.subtabs.list?.renderPetsTable?.();
                        PawpalPets.subtabs.list?.updatePetKPIs?.();
                    });
                }
            };
            ['pet_profile', 'customer', 'customer_profile', 'appointment', 'care_log', 'pet_weight_history'].forEach(table => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
            });
            channel.subscribe();
            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-pets-live');
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
