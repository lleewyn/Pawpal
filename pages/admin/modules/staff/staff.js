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
        if (s.includes('bảo mẫu') || s.includes('hotel') || s.includes('lưu trú')) return 'Caregiver';
        return 'Groomer';
    }

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
        return 'Kỹ thuật viên Grooming';
    }

    async function loadStaffModuleData() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return;

            const { data: staffData, error: staffErr } = await client
                .from('staff')
                .select('*')
                .order('created_at', { ascending: true });

            if (!staffErr && Array.isArray(staffData) && staffData.length > 0) {
                PawpalStaff.state.mockStaff = staffData.map((s, idx) => {
                    const formattedRole = mapDbRoleToStaffRole(s.role, s.specialization);
                    const formattedPosition = mapDbRoleToPosition(s.role, s.specialization);
                    const joinDateFormatted = s.hire_date ? formatDateVN(s.hire_date) : '01/01/2024';
                    const code = `EMP-${String(idx + 1).padStart(3, '0')}`;

                    return {
                        id: code,
                        rawId: s.id,
                        name: s.full_name || 'Nhân viên PawPal',
                        position: formattedPosition,
                        role: formattedRole,
                        phone: s.phone_number || s.phone || '0901234567',
                        email: s.email || `${(s.full_name || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '')}@pawpal.vn`,
                        shift: s.shift || (idx % 2 === 0 ? 'MORNING' : 'AFTERNOON'),
                        status: s.status === 'locked' ? 'RESIGNED' : (s.status === 'leave' ? 'LEAVE' : (s.status === 'pause' ? 'PAUSE' : 'ACTIVE')),
                        join_date: joinDateFormatted,
                        dob: s.dob ? formatDateVN(s.dob) : '01/01/1998',
                        address: s.address || 'TP. Hồ Chí Minh',
                        branch_name: 'Chi nhánh Quận 1',
                        avatar: `/assets/images/staff/emp-00${(idx % 6) + 1}.jpg`,
                        skillScore: s.skill_score || 90,
                        skillResult: (s.skill_score || 90) >= 80 ? 'PASS' : ((s.skill_score || 90) >= 60 ? 'RETRAIN' : 'FAIL'),
                        skillExam: (s.skill_score || 90) >= 80 ? `Đạt (${s.skill_score || 90}đ)` : `Cần đào tạo (${s.skill_score || 90}đ)`,
                        serviceLocked: Boolean(s.service_locked || s.serviceLocked),
                        note: s.specialization || '',
                        requested_count: 8,
                        customer_reviews: []
                    };
                });
            }

            // Tạo danh sách assessments mẫu đồng bộ
            if (PawpalStaff.state.mockAssessments.length === 0 && PawpalStaff.state.mockStaff.length > 0) {
                PawpalStaff.state.mockAssessments = PawpalStaff.state.mockStaff.map((s, i) => ({
                    id: `ASM-${String(i + 1).padStart(3, '0')}`,
                    date: `${String(20 - (i % 8)).padStart(2, '0')}/09/2026`,
                    staff_id: s.id,
                    name: s.name,
                    position: s.position,
                    type: s.role === 'Groomer' ? 'Grooming' : 'Chăm sóc',
                    score: s.skillScore || 85,
                    result: s.skillResult || 'PASS',
                    evaluator: 'Lê Lệ Quyên',
                    note: s.skillResult === 'PASS' ? 'Thao tác chuẩn xác' : 'Cần đào tạo lại'
                }));
            }

            // Bàn làm việc workstations
            PawpalStaff.state.mockWorkstations = [
                { id: 'WS-01', name: 'Bàn Grooming 01', status: 'IN_SERVICE', staffName: 'Nguyễn Văn An', customerName: 'Trần Thị Mai', petName: 'Milu (Poodle)', serviceName: 'Tắm sấy tạo kiểu' },
                { id: 'WS-02', name: 'Bàn Grooming 02', status: 'IDLE', staffName: 'Lê Thị Bình', customerName: '', petName: '', serviceName: '' },
                { id: 'WS-03', name: 'Phòng Spa Thảo dược', status: 'IN_SERVICE', staffName: 'Hoàng Nam', customerName: 'Phạm Thu Trang', petName: 'Mimi (Mèo ALN)', serviceName: 'Spa sục khoáng' },
                { id: 'WS-04', name: 'Bàn Grooming 04', status: 'IDLE', staffName: 'Hữu Phúc', customerName: '', petName: '', serviceName: '' }
            ];

            if (PawpalStaff.state.mockStaff.length > 0 && !PawpalStaff.state.mockStaff.some(s => s.id === PawpalStaff.state.selectedStaffId)) {
                PawpalStaff.state.selectedStaffId = PawpalStaff.state.mockStaff[0].id;
            }
        } catch (err) {
            console.error('[PawpalStaff] Lỗi kết nối CSDL Supabase:', err);
        }
    }
    PawpalStaff.loadStaffModuleData = loadStaffModuleData;

    function updateBreadcrumb(staffName) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (staffName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${staffName}</span>
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

        document.querySelectorAll('.subtab-content').forEach(section => {
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

    async function initStaffModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-staff-list">Nhân sự</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-schedule" style="position: relative;">
                    Lịch làm việc
                    <span class="tab-badge-count" id="schedulePendingBadge" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-assessment">Đánh giá</button>
            `;

            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetSubtab = btn.getAttribute('data-subtab');
                    switchSubtab(targetSubtab, true);
                });
            });
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

        window.addEventListener('hashchange', () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        });
    }

    PawpalStaff.init = initStaffModule;
    window.initStaffModule = initStaffModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
