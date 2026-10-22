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

    let assessmentPage=1,assessmentStaffId=null;
    function renderStaffProfile(staffId) {
        if (!PawpalStaff.state.isLoaded) return;
        const staffList = PawpalStaff.state.staff || [];
        const staff = staffId ? staffList.find(s => s.id === staffId || s.rawId === staffId) : null;
        const root = document.getElementById('subtab-tab-staff-profile');
        if (!root) return;

        if (!staff) {
            const badge=root.querySelector('#viewStaffSafetyBadge');if(badge)badge.style.display='none';
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
        const now=Date.now(),localNow=new Date(now+7*3600000),year=localNow.getUTCFullYear(),month=localNow.getUTCMonth();
        const monthStart=Date.UTC(year,month,1)-7*3600000,monthEnd=Date.UTC(year,month+1,1)-7*3600000;
        const schedules=PawpalStaff.getStaffWorkingSchedules(staff.rawId);
        const nearest=schedules.find(s=>Date.parse(s.end_at)>now)||schedules[schedules.length-1];
        const monthSchedules=schedules.filter(s=>Date.parse(s.start_at)<monthEnd&&Date.parse(s.end_at)>monthStart);
        const monthlyHours=monthSchedules.reduce((sum,s)=>sum+Math.max(0,Math.min(monthEnd,Date.parse(s.end_at))-Math.max(monthStart,Date.parse(s.start_at))),0)/3600000;
        const formatTime=value=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});

        const values = {
            viewStaffName: staff?.name || 'Chưa có nhân viên',
            viewStaffFullName: staff?.name,
            viewStaffCode: staff?.id,
            viewStaffId: staff?.id,
            viewStaffPosition: staff?.position==='cham_soc_thu_cung'?'Chăm sóc thú cưng':staff?.position,
            viewStaffJobTitle: staff?.position==='cham_soc_thu_cung'?'Chăm sóc thú cưng':staff?.position,
            viewStaffPhone: staff?.phone,
            viewStaffEmail: staff?.email,
            viewStaffDob: staff?.dob,
            viewStaffJoinDate: staff?.join_date,
            viewStaffAddress: staff?.address,
            viewStaffRole: staff.roles?.map(role=>role.code==='ADMIN'?'Quản trị viên':role.name||role.code).join(', ')||'Chưa phân vai trò',
            viewStaffStatusBadge: status,
            viewStaffWorkStatus: status,
            viewStaffCurrentShift: nearest?formatTime(nearest.start_at)+' – '+formatTime(nearest.end_at):'Chưa có ca làm việc còn hiệu lực',
            viewStaffLastLogin: lastLoginFormatted,
            viewStaffMonthlyHours: new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(monthlyHours)+' giờ',
            viewStaffNightShifts: monthSchedules.length+' ca',
            viewStaffCompletedServices: staff?.completedServices!=null ? `${staff.completedServices} ca` : 'Chưa có dữ liệu',
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
            viewStaffRequestedBonus: staff?.requestedBonus!=null ? `${Number(staff.requestedBonus).toLocaleString('vi-VN')} đ` : 'Chưa có dữ liệu',
            viewStaffSafetyBonus: staff?.safetyBonus!=null ? `${Number(staff.safetyBonus).toLocaleString('vi-VN')} đ` : 'Chưa có dữ liệu',
            viewStaffTotalIncome: (() => {
                const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN').toUpperCase();
                const canView = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'HR' || userRole === 'ACCOUNTANT';
                return canView ? (staff?.totalIncome ? `${Number(staff.totalIncome).toLocaleString('vi-VN')} đ` : 'Chưa tổng hợp') : '••• (Bảo mật)';
            })(),
            viewStaffCsatScore: staff?.rating ? `${staff.rating}/5.0` : 'Chưa có đánh giá',
            viewStaffCsatReviews: staff?.reviewCount ? `Từ ${staff.reviewCount} lượt đánh giá` : 'Chưa có đánh giá',
            viewStaffRequestedCount: staff?.requestedCount!=null ? `${staff.requestedCount} lượt` : 'Chưa có dữ liệu',
            viewStaffZeroComplaintRate: staff?.zeroComplaintRate || 'Chưa có dữ liệu'
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
        const safety=root.querySelector('#viewStaffSafetyBadge');if(safety){safety.style.display=staff.serviceLocked?'':'none';safety.textContent='Đang khóa phân công';}
        if(assessmentStaffId!==staff.id){assessmentStaffId=staff.id;assessmentPage=1;}
        const history=root.querySelector('#viewStaffAssessmentHistory'),assessments=(PawpalStaff.state.assessments||[]).filter(a=>a.staff_id===staff.id||a.raw?.staff_id===staff.rawId);
        if(history){
            history.replaceChildren();const pages=Math.max(1,Math.ceil(assessments.length/10));assessmentPage=Math.min(assessmentPage,pages);
            const text=(tag,content,css)=>{const node=document.createElement(tag);node.textContent=content;node.className=css||'';return node;};
            if(!assessments.length)history.append(text('p','Chưa có lịch sử đánh giá.','staff-profile-history-meta'));
            for(const item of assessments.slice((assessmentPage-1)*10,assessmentPage*10)){
                const row=document.createElement('article');row.className='staff-profile-assessment';row.dataset.assessmentId=item.id;
                const title=text('div',item.date+' · '+item.type,'staff-profile-history-title');
                const result=({PASS:'Đạt tiêu chuẩn',RETRAIN:'Cần đào tạo lại',FAIL:'Không đạt'})[item.result]||item.result;
                row.append(title,text('div',item.score+'/100 · '+result,'staff-profile-history-score'),text('div','Người đánh giá: '+(item.evaluator||'—'),'staff-profile-history-meta'));
                if(item.note)row.append(text('p',item.note,'staff-profile-history-meta'));history.append(row);
            }
            if(pages>1){const pager=document.createElement('div');pager.className='staff-calendar-pager';for(const [label,page] of [['<',assessmentPage-1],[String(assessmentPage),assessmentPage],['>',assessmentPage+1]]){const button=text('button',label,'admin-btn admin-btn-secondary');button.type='button';button.disabled=page<1||page>pages;button.onclick=()=>{assessmentPage=page;renderStaffProfile(staff.id);};pager.append(button);}history.append(pager);}
        }
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
        document.getElementById('btnProfileAssignShift')?.addEventListener('click',()=>{
            const staff=PawpalStaff.state.staff.find(s=>s.id===PawpalStaff.state.selectedStaffId);
            if(staff)PawpalStaff.subtabs.schedule?.openShiftModal(null,null,staff.rawId);
        });
        document.getElementById('btnProfileAddAssessment')?.addEventListener('click',()=>{
            if(PawpalStaff.state.selectedStaffId)PawpalStaff.subtabs.assessment?.openAssessmentModal(PawpalStaff.state.selectedStaffId);
        });

        const initialStaffId = sessionStorage.getItem('pawpal_admin_staff_selected_id');
        renderStaffProfile(initialStaffId);
    }

    PawpalStaff.subtabs.profile = {
        init: initStaffProfileSubtab,
        openStaffProfile,
        renderStaffProfile
    };

    window.addEventListener('pawpal:staff-data-loaded',()=>{
        const root=document.getElementById('subtab-tab-staff-profile');if(!root?.classList.contains('active'))return;
        if(PawpalStaff.state.loadError){root.querySelectorAll('[id^="viewStaff"]').forEach(node=>node.textContent='—');const name=root.querySelector('#viewStaffName');if(name)name.textContent='Không thể tải hồ sơ nhân sự';const badge=root.querySelector('#viewStaffSafetyBadge');if(badge)badge.style.display='none';return;}
        renderStaffProfile(PawpalStaff.state.selectedStaffId);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffProfileSubtab);
    } else {
        initStaffProfileSubtab();
    }
})();
