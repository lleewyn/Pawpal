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
        const staffList = PawpalStaff.state?.mockStaff || [];
        const staff = staffList.find(s => s.id === staffId || s.rawId === staffId) || staffList[0];
        if (!staff) return;

        PawpalStaff.state.selectedStaffId = staff.id;
        sessionStorage.setItem('pawpal_admin_staff_selected_id', staff.id);

        if (PawpalStaff.updateBreadcrumb) {
            PawpalStaff.updateBreadcrumb(staff.name);
        }

        // Cập nhật Headline hồ sơ
        const nameEl = document.getElementById('staffProfileHeadlineName');
        const codeEl = document.getElementById('staffProfileHeadlineCode');
        const posEl = document.getElementById('staffProfileHeadlinePosition');
        const statusEl = document.getElementById('staffProfileHeadlineStatus');
        const avatarEl = document.getElementById('staffProfileHeadlineAvatar');

        if (nameEl) nameEl.textContent = staff.name;
        if (codeEl) codeEl.textContent = staff.id;
        if (posEl) posEl.textContent = staff.position;
        if (avatarEl) {
            avatarEl.src = staff.avatar || '/assets/images/staff/emp-001.jpg';
            avatarEl.style.borderRadius = '50%';
        }
        if (statusEl) {
            let statusText = 'Đang làm việc';
            let badgeClass = 'badge-success';
            if (staff.status === 'LEAVE') { statusText = 'Nghỉ phép'; badgeClass = 'badge-warning'; }
            else if (staff.status === 'PAUSE') { statusText = 'Tạm nghỉ'; badgeClass = 'badge-neutral'; }
            else if (staff.status === 'RESIGNED') { statusText = 'Nghỉ việc'; badgeClass = 'badge-danger'; }
            statusEl.className = `admin-badge ${badgeClass}`;
            statusEl.textContent = statusText;
        }

        // Tab 1: Tổng quan
        const phoneEl = document.getElementById('spOverviewPhone');
        const emailEl = document.getElementById('spOverviewEmail');
        const branchEl = document.getElementById('spOverviewBranch');
        const joinDateEl = document.getElementById('spOverviewJoinDate');
        const dobEl = document.getElementById('spOverviewDob');
        const addressEl = document.getElementById('spOverviewAddress');
        const skillScoreEl = document.getElementById('spOverviewSkillScore');
        const lockStatusEl = document.getElementById('spOverviewLockStatus');

        if (phoneEl) phoneEl.textContent = staff.phone || '—';
        if (emailEl) emailEl.textContent = staff.email || '—';
        if (branchEl) branchEl.textContent = staff.branch_name || 'Chi nhánh Quận 1';
        if (joinDateEl) joinDateEl.textContent = staff.join_date || '—';
        if (dobEl) dobEl.textContent = staff.dob || '—';
        if (addressEl) addressEl.textContent = staff.address || 'TP. Hồ Chí Minh';
        if (skillScoreEl) skillScoreEl.textContent = `${staff.skillScore || 90}/100 điểm (${staff.skillExam || 'Đạt tiêu chuẩn'})`;
        if (lockStatusEl) {
            lockStatusEl.textContent = staff.serviceLocked ? 'Đang tạm khóa nhận việc' : 'Sẵn sàng nhận lịch hẹn';
            lockStatusEl.className = staff.serviceLocked ? 'text-danger' : 'text-success';
        }

        // Tab 2: Lịch trực & Chấm công
        const shiftEl = document.getElementById('spScheduleShift');
        if (shiftEl) {
            shiftEl.textContent = staff.shift === 'MORNING' ? 'Ca sáng (07:30 - 15:30)' : (staff.shift === 'AFTERNOON' ? 'Ca chiều (13:30 - 21:30)' : 'Ca tối');
        }

        // Tab 3: Hiệu suất & CSAT
        const csatScoreEl = document.getElementById('spPerformanceCsatScore');
        const completedCountEl = document.getElementById('spPerformanceCompletedCount');
        const reviewsContainer = document.getElementById('spPerformanceReviewsList');

        if (csatScoreEl) csatScoreEl.textContent = '5.0 / 5.0 ★';
        if (completedCountEl) completedCountEl.textContent = `${staff.requested_count || 8} ca phục vụ`;

        if (reviewsContainer) {
            const reviews = staff.customer_reviews || [];
            if (reviews.length === 0) {
                reviewsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 12px 0;">Chưa có nhận xét từ khách hàng.</div>';
            } else {
                reviewsContainer.innerHTML = reviews.map(r => `
                    <div class="staff-review-card" style="padding: 10px 0; border-bottom: 1px solid var(--border-neutral);">
                        <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
                            <strong>${r.customer_name}</strong>
                            <span style="color: #D97706;">${'★'.repeat(r.rating || 5)}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${r.service_name} • ${r.date}</div>
                        <div style="font-size: 12.5px; margin-top: 4px;">"${escapeHtml(r.comment)}"</div>
                    </div>
                `).join('');
            }
        }

        // Tab 4: Tài khoản hệ thống
        const sysRoleEl = document.getElementById('spAccountSystemRole');
        const accStatusEl = document.getElementById('spAccountStatus');
        const lastLoginEl = document.getElementById('spAccountLastLogin');

        if (sysRoleEl) sysRoleEl.textContent = staff.system_role === 'ADMIN' ? 'Quản trị viên (ADMIN)' : 'Nhân sự (STAFF)';
        if (accStatusEl) {
            accStatusEl.textContent = staff.account_status === 'ACTIVE' ? 'Đã kích hoạt' : 'Chưa cấp tài khoản';
            accStatusEl.className = staff.account_status === 'ACTIVE' ? 'admin-badge badge-success' : 'admin-badge badge-neutral';
        }
        if (lastLoginEl) lastLoginEl.textContent = staff.last_login_at || 'Chưa đăng nhập';
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
        const btnToggleLock = document.getElementById('btnStaffProfileToggleLock');
        if (btnToggleLock) {
            btnToggleLock.addEventListener('click', () => {
                const staffId = PawpalStaff.state?.selectedStaffId;
                if (staffId && PawpalStaff.subtabs.list?.openReassignModal) {
                    PawpalStaff.subtabs.list.openReassignModal(staffId);
                }
            });
        }

        // Nút sửa nhân sự từ hồ sơ
        const btnEditProfile = document.getElementById('btnStaffProfileEdit');
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
