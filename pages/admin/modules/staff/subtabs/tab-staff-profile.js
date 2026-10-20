// tab-staff-profile.js - Subtab Hồ sơ nhân sự 360° Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function openStaffProfile(staffId) {
        PawpalStaff.state.selectedStaffId = staffId;
        sessionStorage.setItem('pawpal_admin_staff_selected_id', staffId);
        if (PawpalStaff.switchSubtab) {
            PawpalStaff.switchSubtab('tab-staff-profile');
        }
    }

    function renderStaffProfile(staffId) {
        if (!PawpalStaff.state.isLoaded) return;
        const staffList = PawpalStaff.state.mockStaff || [];
        const staff = staffId ? staffList.find(s => s.id === staffId || s.rawId === staffId) : null;
        const root = document.getElementById('subtab-tab-staff-profile');
        if (!root) return;

        if (!staff) {
            root.querySelectorAll('[id^="viewStaff"]').forEach(el => {
                if (el.id === 'viewStaffName' || el.id === 'viewStaffFullName') {
                    el.textContent = staffId ? 'Không tìm thấy hồ sơ nhân sự' : 'Chưa chọn nhân sự';
                } else el.textContent = '—';
            });
            PawpalStaff.updateBreadcrumb?.(staffId ? 'Không tìm thấy' : 'Chi tiết');
            return;
        }

        const status = {ACTIVE:'Đang làm việc',LEAVE:'Nghỉ phép',PAUSE:'Tạm nghỉ',RESIGNED:'Nghỉ việc'}[staff?.status] || 'Chưa cập nhật';
        const hasAcc = Boolean(staff?.authUserId);
        const isAccActive = staff?.accountStatus === 'ACTIVE' || staff?.accountStatus === 'dang_hoat_dong';
        const isAccPaused = staff?.accountStatus === 'tam_khoa' || staff?.accountStatus === 'PAUSED';
        const accStatusText = hasAcc ? (isAccActive ? 'Đang hoạt động' : (isAccPaused ? 'Tạm khóa' : 'Đã khóa')) : 'Chưa cấp tài khoản';
        const accBadgeClass = hasAcc ? (isAccActive ? 'badge-success' : (isAccPaused ? 'badge-warning' : 'badge-danger')) : 'badge-neutral';

        const lastLoginFormatted = staff?.lastLoginAt ? PawpalStaff.formatDateVN(staff.lastLoginAt) : 'Chưa đăng nhập';

        const values = {
            viewStaffName: staff?.name || 'Chưa có nhân viên',
            viewStaffFullName: staff?.name,
            viewStaffCode: staff?.id,
            viewStaffId: staff?.id,
            viewStaffPosition: staff?.position,
            viewStaffJobTitle: staff?.position,
            viewStaffPhone: staff?.phone,
            viewStaffEmail: staff?.email,
            viewStaffDob: staff?.dob,
            viewStaffJoinDate: staff?.join_date,
            viewStaffAddress: staff?.address,
            viewStaffRole: staff?.role,
            viewStaffStatusBadge: status,
            viewStaffWorkStatus: status,
            viewStaffCurrentShift: {MORNING:'Ca sáng',AFTERNOON:'Ca chiều',EVENING:'Ca tối',NIGHT:'Ca khuya'}[staff?.shift] || 'Chưa phân ca',
            viewStaffLastLogin: lastLoginFormatted,
            viewStaffMonthlyHours: staff?.monthlyHours ? `${staff.monthlyHours} giờ` : 'Chưa có dữ liệu',
            viewStaffNightShifts: staff?.nightShifts ? `${staff.nightShifts} ca` : '0 ca',
            viewStaffCompletedServices: staff?.completedServices ? `${staff.completedServices} ca` : 'Chưa có ca',
            viewStaffPunctuality: staff?.punctuality ? `${staff.punctuality}%` : 'Chưa có dữ liệu',
            viewStaffBaseSalary: (() => {
                const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN').toUpperCase();
                const canView = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR' || userRole === 'ACCOUNTANT';
                return canView ? (staff?.base_salary ? `${Number(staff.base_salary).toLocaleString('vi-VN')} đ` : 'Chưa cấu hình') : '••• (Bảo mật)';
            })(),
            viewStaffServiceCommission: (() => {
                const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN').toUpperCase();
                const canView = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR' || userRole === 'ACCOUNTANT';
                return canView ? (staff?.commission ? `${Number(staff.commission).toLocaleString('vi-VN')} đ` : 'Chưa có dữ liệu') : '••• (Bảo mật)';
            })(),
            viewStaffRequestedBonus: staff?.requestedBonus ? `+${Number(staff.requestedBonus).toLocaleString('vi-VN')} đ` : '0 đ',
            viewStaffSafetyBonus: staff?.safetyBonus ? `+${Number(staff.safetyBonus).toLocaleString('vi-VN')} đ` : '0 đ',
            viewStaffTotalIncome: (() => {
                const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN').toUpperCase();
                const canView = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR' || userRole === 'ACCOUNTANT';
                return canView ? (staff?.totalIncome ? `${Number(staff.totalIncome).toLocaleString('vi-VN')} đ` : 'Chưa tổng hợp') : '••• (Bảo mật)';
            })(),
            viewStaffCsatScore: staff?.rating ? `${staff.rating}/5.0` : 'Chưa có đánh giá',
            viewStaffCsatReviews: staff?.reviewCount ? `Từ ${staff.reviewCount} lượt đánh giá` : 'Chưa có đánh giá',
            viewStaffRequestedCount: staff?.requestedCount ? `${staff.requestedCount} lượt` : '0 lượt',
            viewStaffZeroComplaintRate: staff?.zeroComplaintRate || '100%'
        };

        const accBadgeEl = document.getElementById('viewStaffAccountStatus');
        if (accBadgeEl) {
            accBadgeEl.textContent = accStatusText;
            accBadgeEl.className = 'admin-badge ' + accBadgeClass;
        }

        root.querySelectorAll('[id^="viewStaff"]').forEach(el => {
            if (el.id === 'viewStaffAccountStatus') return;
            if (el.id === 'viewStaffCustomerReviewsList' || el.id === 'viewStaffAssessmentHistory') el.textContent = 'Chưa có dữ liệu được ghi nhận.';
            else if (el.id !== 'viewStaffSafetyBadge') el.textContent = values[el.id] || '—';
        });
        if (staff) { PawpalStaff.state.selectedStaffId = staff.id; PawpalStaff.updateBreadcrumb?.(staff.name); }
    }

    function initStaffProfileSubtab() {
        // Tab switching bên trong Drawer Hồ sơ
        document.querySelectorAll('.staff-profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                document.querySelectorAll('.staff-profile-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.staff-profile-panel').forEach(p => {
                    p.classList.toggle('active', p.id === `spPanel-${targetTab}`);
                });
            });
        });

        // Nút khóa an toàn trong hồ sơ
        const btnToggleLock = document.getElementById('btnStaffProfileToggleLock') || document.getElementById('btnProfileToggleSafetyLock');
        if (btnToggleLock) {
            btnToggleLock.addEventListener('click', () => {
                const staffId = PawpalStaff.state?.selectedStaffId;
                if (staffId && PawpalStaff.subtabs.list?.openReassignModal) {
                    PawpalStaff.subtabs.list.openReassignModal(staffId);
                }
            });
        }

        // Nút sửa nhân sự từ hồ sơ
        const btnEditProfile = document.getElementById('btnStaffProfileEdit') || document.getElementById('btnProfileEditStaff');
        if (btnEditProfile) {
            btnEditProfile.addEventListener('click', () => {
                const staffId = PawpalStaff.state?.selectedStaffId;
                if (staffId && PawpalStaff.subtabs.list?.openStaffModal) {
                    PawpalStaff.subtabs.list.openStaffModal(staffId);
                }
            });
        }

        const initialStaffId = sessionStorage.getItem('pawpal_admin_staff_selected_id') || 'EMP-001';
        renderStaffProfile(initialStaffId);
    }

    PawpalStaff.subtabs.profile = {
        init: initStaffProfileSubtab,
        openStaffProfile,
        renderStaffProfile
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffProfileSubtab);
    } else {
        initStaffProfileSubtab();
    }
})();
