// staff.js - Phân hệ Quản trị Nhân sự Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    window.PawpalStaffModule = PawpalStaff;
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    // State dùng chung
    PawpalStaff.state = {
        mockStaff: [],
        mockAssessments: [],
        mockRoster: {},
        mockLeaveSwapRequests: [],
        mockWorkstations: [],
        selectedStaffId: sessionStorage.getItem('pawpal_admin_staff_selected_id') || 'EMP-001'
    };

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }
    PawpalStaff.escapeHtml = escapeHtml;

    // Helper định dạng ngày giờ chuẩn Việt Nam
    function formatDateVN(dateInput) {
        if (!dateInput) return '—';
        if (typeof dateInput === 'string') {
            const s = dateInput.trim();
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
            const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        }
        const dateObj = new Date(dateInput);
        if (isNaN(dateObj.getTime())) return String(dateInput);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
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
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(-8px);
            max-width: 360px;
            line-height: 1.45;
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
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    function showStaffConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmStaffAction');
        const titleEl = document.getElementById('confirmStaffActionTitle');
        const msgEl = document.getElementById('confirmStaffActionMessage');
        const btnAccept = document.getElementById('btnAcceptStaffConfirm');
        const btnCancel = document.getElementById('btnCancelStaffConfirm');
        const btnClose = document.getElementById('btnCloseConfirmStaffModal');

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
            modal.classList.remove('active');
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

        modal.classList.add('active');
    }

    // Export helpers
    PawpalStaff.formatDateVN = formatDateVN;
    PawpalStaff.toUnaccent = toUnaccent;
    PawpalStaff.matchSearch = matchSearch;
    PawpalStaff.showToast = showToast;
    PawpalStaff.showStaffConfirmModal = showStaffConfirmModal;

    function mapDbRoleToStaffRole(dbRole, specialization = '') {
        const r = (dbRole || '').toUpperCase();
        const s = (specialization || '').toLowerCase();
        if (r === 'ADMIN') return 'Admin';
        if (r === 'VET' || s.includes('bác sĩ') || s.includes('thú y')) return 'Veterinarian';
        if (r === 'DRIVER' || s.includes('tài xế') || s.includes('taxi')) return 'Driver';
        if (r === 'RECEPTIONIST' || s.includes('lễ tân')) return 'Receptionist';
        if (r === 'CSKH' || s.includes('cskh') || s.includes('chăm sóc khách')) return 'CSKH';
        if (r === 'CAREGIVER' || s.includes('bảo mẫu') || s.includes('hotel') || s.includes('lưu trú')) return 'Caregiver';
        if (r === 'GROOMER' || s.includes('groom') || s.includes('cắt tỉa') || s.includes('spa')) return 'Groomer';
        if (!r && !s) return 'Chưa phân loại';
        return r || 'Chưa phân loại';
    }

    function mapPositionToDbRole(pos) {
        const p = (pos || '').toLowerCase();
        if (p.includes('quản trị') || p.includes('admin')) return 'ADMIN';
        if (p.includes('lễ tân') || p.includes('receptionist')) return 'RECEPTIONIST';
        if (p.includes('bảo mẫu') || p.includes('hotel') || p.includes('lưu trú') || p.includes('caregiver')) return 'CAREGIVER';
        if (p.includes('chăm sóc khách') || p.includes('cskh')) return 'CSKH';
        if (p.includes('tài xế') || p.includes('taxi') || p.includes('driver')) return 'DRIVER';
        if (p.includes('bác sĩ') || p.includes('thú y') || p.includes('vet')) return 'VET';
        if (p.includes('groom') || p.includes('cắt tỉa') || p.includes('spa')) return 'GROOMER';
        return 'STAFF';
    }
    PawpalStaff.mapPositionToDbRole = mapPositionToDbRole;

    function mapDbRoleToPosition(dbRole, specialization) {
        if (specialization) return specialization;
        const role = mapDbRoleToStaffRole(dbRole, specialization);
        if (role === 'Admin') return 'Quản trị viên';
        if (role === 'Groomer') return 'Kỹ thuật viên Grooming';
        if (role === 'Veterinarian') return 'Bác sĩ thú y';
        if (role === 'Driver') return 'Tài xế Taxi Pet';
        if (role === 'Caregiver') return 'Bảo mẫu Pet Hotel';
        if (role === 'Receptionist') return 'Lễ tân tiếp đón';
        if (role === 'CSKH') return 'Chuyên viên CSKH';
        if (role === 'Chưa phân loại') return 'Chưa phân loại';
        return role;
    }

    // Đồng bộ Supabase Live Database qua PawpalDataStore
    async function fetchStaffRaw({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const { data, error } = await client
                .from('staff')
                .select('id, full_name, role, specialization, phone_number, email, shift, status, account_status, hire_date, dob, address, skill_score, service_locked, system_role, permissions, last_login_at')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('staff:list', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                force
            });
        }
        return fetcher();
    }

    async function fetchSchedulesRaw({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return [];
            // Giới hạn phạm vi ngày: +/- 30 ngày quanh hiện tại để tránh full-table scan lịch cũ nhiều năm
            const now = new Date();
            const fromDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
            const toDate = new Date(now.getTime() + 45 * 86400000).toISOString().slice(0, 10);
            try {
                const { data, error } = await client
                    .from('staff_schedule')
                    .select('id, staff_id, work_date, shift, start_time, end_time, work_location, schedule_status')
                    .gte('work_date', fromDate)
                    .lte('work_date', toDate);
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.warn('[PawpalStaff] Lỗi nạp staff_schedule có bộ lọc ngày, thử fallback:', err);
                const fallback = await client.from('staff_schedule').select('*').limit(300);
                return fallback.data || [];
            }
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('staff:schedules', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL,
                force
            });
        }
        return fetcher();
    }

    async function fetchShiftRequestsRaw({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return [];
            const { data, error } = await client
                .from('staff_shift_request')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) {
                console.warn('[PawpalStaff] Lỗi nạp staff_shift_request:', error);
                return [];
            }
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('staff:shift_requests', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.LIST,
                force
            });
        }
        return fetcher();
    }

    async function loadStaffModuleData({ force = false } = {}) {
        try {
            const [staffData, schedules, requests] = await Promise.all([
                fetchStaffRaw({ force }),
                fetchSchedulesRaw({ force }),
                fetchShiftRequestsRaw({ force })
            ]);

            if (Array.isArray(staffData)) {
                PawpalStaff.state.mockStaff = staffData.map((s, idx) => {
                    const formattedRole = mapDbRoleToStaffRole(s.role, s.specialization);
                    const formattedPosition = mapDbRoleToPosition(s.role, s.specialization);
                    const joinDateFormatted = s.hire_date ? formatDateVN(s.hire_date) : 'Chưa cập nhật';
                    const code = s.staff_code || s.employee_code || (s.id ? `EMP-${s.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `EMP-${String(idx + 1).padStart(3, '0')}`);

                    const rawStatus = (s.status || s.employment_status || '').toUpperCase();
                    let mappedStatus = 'ACTIVE';
                    if (rawStatus === 'RESIGNED' || rawStatus === 'TERMINATED') mappedStatus = 'RESIGNED';
                    else if (rawStatus === 'LOCKED' || s.account_status === 'locked' || s.account_status === 'LOCKED') mappedStatus = 'LOCKED';
                    else if (rawStatus === 'LEAVE') mappedStatus = 'LEAVE';
                    else if (rawStatus === 'PAUSE') mappedStatus = 'PAUSE';
                    else if (rawStatus === 'ACTIVE' || !rawStatus) mappedStatus = 'ACTIVE';
                    else mappedStatus = rawStatus;

                    return {
                        id: code,
                        rawId: s.id,
                        name: s.full_name || 'Nhân viên PawPal',
                        position: formattedPosition,
                        role: formattedRole,
                        phone: s.phone_number || s.phone || '—',
                        email: s.email || 'Chưa cập nhật',
                        shift: s.shift || '',
                        status: mappedStatus,
                        accountStatus: s.account_status || (mappedStatus === 'LOCKED' ? 'LOCKED' : 'ACTIVE'),
                        join_date: joinDateFormatted,
                        dob: s.dob ? formatDateVN(s.dob) : 'Chưa cập nhật',
                        address: s.address || 'Chưa cập nhật',
                        branch_name: 'Chi nhánh Quận 1',
                        avatar: `/assets/images/staff/emp-00${(idx % 6) + 1}.jpg`,
                        skillScore: s.skill_score ?? null,
                        skillResult: s.skill_score == null ? null : (s.skill_score >= 80 ? 'PASS' : (s.skill_score >= 60 ? 'RETRAIN' : 'FAIL')),
                        skillExam: s.skill_score == null ? 'Chưa đánh giá' : `${s.skill_score}/100`,
                        serviceLocked: Boolean(s.service_locked || s.serviceLocked),
                        note: s.specialization || '',
                        requested_count: 8,
                        customer_reviews: [],
                        authUserId: s.auth_user_id || null,
                        systemRole: s.system_role || 'STAFF',
                        permissions: s.permissions || [],
                        lastLoginAt: s.last_login_at || null
                    };
                });
            }

            PawpalStaff.state.mockAssessments = PawpalStaff.state.mockStaff
                .filter(s => s.skillScore !== null && s.skillScore !== undefined)
                .map((s, idx) => ({
                    id: `ASM-00${idx + 1}`,
                    date: '15/10/2026',
                    staff_id: s.id,
                    name: s.name,
                    position: s.position,
                    type: s.position.includes('Groom') ? 'Grooming' : (s.position.includes('Spa') ? 'Spa' : 'CSKH'),
                    score: s.skillScore || 90,
                    result: s.skillResult || 'PASS',
                    evaluator: 'Lê Lệ Quyên',
                    note: s.skillResult === 'PASS' ? 'Thao tác chuẩn xác theo quy chuẩn an toàn SOP' : 'Cần đào tạo lại kỹ thuật cắt tỉa chuyên sâu'
                }));
            PawpalStaff.state.mockWorkstations = [];

            const requestStaff = id => PawpalStaff.state.mockStaff.find(staff => staff.rawId === id);
            const requestShiftLabel = { ALL: 'Cả ngày', MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối' };
            PawpalStaff.state.mockLeaveSwapRequests = (requests || []).map(row => ({
                ...row,
                type: row.request_type,
                staffName: requestStaff(row.staff_id)?.name || 'Chưa tải được tên nhân viên',
                swapWithName: requestStaff(row.target_staff_id)?.name || '',
                date: row.request_type === 'SWAP' ? PawpalStaff.formatDateVN(row.start_date) + ' → ' + PawpalStaff.formatDateVN(row.target_date)
                    : row.start_date === row.end_date ? PawpalStaff.formatDateVN(row.start_date)
                    : PawpalStaff.formatDateVN(row.start_date) + ' – ' + PawpalStaff.formatDateVN(row.end_date),
                shiftLabel: row.request_type === 'SWAP' ? (requestShiftLabel[row.shift] || row.shift) + ' → ' + (requestShiftLabel[row.target_shift] || row.target_shift)
                    : (requestShiftLabel[row.shift] || row.shift)
            }));

            PawpalStaff.state.scheduleError = false;
            PawpalStaff.state.schedules = schedules || [];
            PawpalStaff.state.mockRoster = {};
            (schedules || []).forEach(row => {
                if (row.schedule_status === 'OFF') return;
                const date = String(row.schedule_date || row.work_date || row.date || row.start_time || '').slice(0, 10);
                const staff = PawpalStaff.state.mockStaff.find(staff => staff.rawId === row.staff_id);
                const shift = row.shift || row.shift_type;
                if (!staff || !date || !shift) return;
                const roster = PawpalStaff.state.mockRoster[date] ||= {};
                (roster[staff.id] ||= []).push(shift);
            });
            PawpalStaff.state.isLoaded = true;
            PawpalStaff.state.loadError = null;

            if (PawpalStaff.state.mockStaff.length > 0 && !PawpalStaff.state.mockStaff.some(s => s.id === PawpalStaff.state.selectedStaffId)) {
                PawpalStaff.state.selectedStaffId = PawpalStaff.state.mockStaff[0].id;
            }

            if (PawpalStaff.subtabs?.list?.updateStaffKpis) {
                PawpalStaff.subtabs.list.updateStaffKpis();
            }
            if (PawpalStaff.subtabs?.assessment?.updateAssessmentKPIs) {
                PawpalStaff.subtabs.assessment.updateAssessmentKPIs();
            }

            window.dispatchEvent(new CustomEvent('pawpal:staff-data-loaded', { detail: { count: PawpalStaff.state.mockStaff.length } }));
        } catch (err) {
            PawpalStaff.state.loadError = 'Không thể tải dữ liệu nhân sự.';
            window.dispatchEvent(new CustomEvent('pawpal:staff-data-loaded'));
            console.error('[PawpalStaff] Lỗi kết nối CSDL Supabase:', err);
        }
    }
    PawpalStaff.loadStaffModuleData = loadStaffModuleData;

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'staff') {
                window.PawpalDataStore.invalidate('staff:list*');
                window.PawpalDataStore.invalidate('services:staff*');
            } else if (mutation.entity === 'staff_schedule') {
                window.PawpalDataStore.invalidate('staff:schedules*');
                window.PawpalDataStore.invalidate('dashboard:*');
            } else if (mutation.entity === 'staff_shift_request') {
                window.PawpalDataStore.invalidate('staff:shift_requests*');
            }
        });
    }

    PawpalStaff.invalidateCache = function() {
        if (window.PawpalDataStore) {
            window.PawpalDataStore.invalidate('staff:*');
        }
    };

    function updateBreadcrumb(staffName) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (staffName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(staffName)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalStaff.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(targetSubtab, updateHistory = true) {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');

        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
            });
        }

        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Nhân sự') return;
        document.getElementById('subtab-tab-staff-list')?.closest('.admin-module-wrapper')?.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === `subtab-${targetSubtab}`);
        });

        sessionStorage.setItem('pawpal_admin_staff_active_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = '#' + targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }

        if (targetSubtab === 'tab-staff-profile') {
            const currentStaff = (PawpalStaff.state?.mockStaff || []).find(s => s.id === PawpalStaff.state?.selectedStaffId);
            updateBreadcrumb(currentStaff ? currentStaff.name : 'Nhân viên');
            if (PawpalStaff.subtabs.profile?.renderStaffProfile) {
                PawpalStaff.subtabs.profile.renderStaffProfile(PawpalStaff.state?.selectedStaffId);
            }
        } else {
            updateBreadcrumb(null);
        }

        if (targetSubtab === 'tab-staff-list' && PawpalStaff.subtabs.list) {
            PawpalStaff.subtabs.list.renderStaffList();
            PawpalStaff.subtabs.list.renderStaffAlertBar();
        } else if (targetSubtab === 'tab-staff-schedule' && PawpalStaff.subtabs.schedule) {
            PawpalStaff.subtabs.schedule.renderScheduleTable();
        } else if (targetSubtab === 'tab-staff-assessment' && PawpalStaff.subtabs.assessment) {
            PawpalStaff.subtabs.assessment.renderAssessmentList();
        }

        if (window.lucide) lucide.createIcons();
    }
    PawpalStaff.switchSubtab = switchSubtab;

    function openStaffProfile(staffId) {
        PawpalStaff.state.selectedStaffId = staffId;
        sessionStorage.setItem('pawpal_admin_staff_selected_id', staffId);
        switchSubtab('tab-staff-profile');
    }
    PawpalStaff.openStaffProfile = openStaffProfile;
    let _isStaffListenersInitialized = false;

    async function initStaffModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        await loadStaffModuleData();

        if (PawpalStaff.subtabs.list?.renderStaffList) {
            PawpalStaff.subtabs.list.renderStaffList();
            PawpalStaff.subtabs.list.renderStaffAlertBar();
        }
        if (PawpalStaff.subtabs.schedule?.renderScheduleTable) {
            PawpalStaff.subtabs.schedule.renderScheduleTable();
        }
        if (PawpalStaff.subtabs.assessment?.renderAssessmentList) {
            PawpalStaff.subtabs.assessment.renderAssessmentList();
        }

        const savedSubtab = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';
        const validTabs = ['tab-staff-list', 'tab-staff-profile', 'tab-staff-schedule', 'tab-staff-assessment'];

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-staff-list', false);
        }

        if (!_isStaffListenersInitialized) {
            _isStaffListenersInitialized = true;

            setupStaffRealtimeSync();

            window.addEventListener('admin:subtab-change', (e) => {
                if (e.detail?.module === 'Nhân sự' && validTabs.includes(e.detail.tabId)) {
                    switchSubtab(e.detail.tabId, false);
                }
            });

            // Đóng modalConfirmStaffAction qua data-close-modal, backdrop click, Escape key
            document.querySelectorAll('[data-close-modal="modalConfirmStaffAction"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const modal = document.getElementById('modalConfirmStaffAction');
                    if (modal) modal.classList.remove('active');
                });
            });

            const modalConfirmStaff = document.getElementById('modalConfirmStaffAction');
            if (modalConfirmStaff) {
                modalConfirmStaff.addEventListener('click', (e) => {
                    if (e.target === modalConfirmStaff) {
                        modalConfirmStaff.classList.remove('active');
                    }
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('modalConfirmStaffAction');
                    if (modal && modal.classList.contains('active')) {
                        modal.classList.remove('active');
                    }
                }
            });
        }

        // URL Auto-open v=modal8 hoặc modal=8 hoặc modal=confirm
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal8' || urlParams.get('modal') === '8' || urlParams.get('modal') === 'confirm') {
            setTimeout(() => {
                showStaffConfirmModal({
                    title: 'Xác nhận khóa an toàn tay nghề',
                    message: 'Khóa an toàn sẽ tạm ngừng gán ca mới cho nhân sự cho đến khi hoàn thành sát hạch nghiệp vụ. Bạn có đồng ý?',
                    confirmText: 'Xác nhận khóa',
                    isDanger: true
                });
            }, 300);
        }
    }

    let _staffRealtimeChannel = null;
    function setupStaffRealtimeSync() {
        if (_staffRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const triggerStaffSync = (pattern) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Nhân sự',
                        invalidatePattern: pattern || 'staff:*',
                        onActiveRefresh: async () => {
                            await loadStaffModuleData({ force: true });
                            PawpalStaff.subtabs?.list?.renderStaffTable?.();
                            PawpalStaff.subtabs?.list?.updateStaffKPIs?.();
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Nhân sự') {
                    loadStaffModuleData({ force: true }).then(() => {
                        PawpalStaff.subtabs?.list?.renderStaffTable?.();
                        PawpalStaff.subtabs?.list?.updateStaffKPIs?.();
                    });
                }
            };

            _staffRealtimeChannel = client.channel('admin-staff-live-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => triggerStaffSync('staff:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_schedule' }, () => triggerStaffSync('staff:schedules*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_shift_request' }, () => triggerStaffSync('staff:shifts*'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-staff-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_staffRealtimeChannel) {
                    client.removeChannel(_staffRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-staff-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Staff] Lỗi mở kênh realtime:', e);
        }
    }

    PawpalStaff.init = initStaffModule;
    window.initStaffModule = initStaffModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
