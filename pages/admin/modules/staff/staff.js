// staff.js - Logic cho phân hệ Nhân sự Pawpal-er
(function() {
    function initStaffModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Render 4 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
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
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-assessment">Đánh giá nghiệp vụ</button>
            `;
        }

        // ---------------------------------------------------------
        // 1. DATA MOCK & TRẠNG THÁI HỆ THỐNG (Định nghĩa toàn bộ ở đầu file)
        // ---------------------------------------------------------
        const mockStaff = [
            { 
                id: 'EMP-001', 
                name: 'Lê Lệ Quyên', 
                position: 'Quản trị viên', 
                role: 'Admin', 
                phone: '0901234567', 
                email: 'quyen.le@pawpal.vn', 
                shift: 'MORNING', 
                status: 'ACTIVE', 
                join_date: '2024-01-10', 
                dob: '1996-08-15', 
                address: '68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
                skillScore: 95,
                skillResult: 'PASS',
                skillExam: 'Đạt (95đ)',
                serviceLocked: false,
                note: 'Quản lý toàn diện cơ sở và giám sát nghiệp vụ'
            },
            { 
                id: 'EMP-002', 
                name: 'Nguyễn Văn A', 
                position: 'Groomer', 
                role: 'Groomer', 
                phone: '0912345678', 
                email: 'a.nguyen@pawpal.vn', 
                shift: 'AFTERNOON', 
                status: 'ACTIVE', 
                join_date: '2025-02-15', 
                dob: '1998-04-12', 
                address: '124 Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh',
                skillScore: 85,
                skillResult: 'PASS',
                skillExam: 'Đạt (85đ)',
                serviceLocked: false,
                note: 'Chuyên cắt tạo kiểu Poodle và Corgi'
            },
            { 
                id: 'EMP-003', 
                name: 'Trần Thị B', 
                position: 'Lễ tân', 
                role: 'Receptionist', 
                phone: '0987654321', 
                email: 'b.tran@pawpal.vn', 
                shift: 'MORNING', 
                status: 'LEAVE', 
                join_date: '2025-05-20', 
                dob: '2000-11-20', 
                address: '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
                skillScore: 55,
                skillResult: 'RETRAIN',
                skillExam: 'Cần đào tạo (55đ)',
                serviceLocked: true,
                note: 'Đang nghỉ phép và cần củng cố quy trình đón tiếp'
            },
            { 
                id: 'EMP-004', 
                name: 'Lê Văn C', 
                position: 'Bác sĩ/Bảo mẫu', 
                role: 'Veterinarian', 
                phone: '0909090909', 
                email: 'c.le@pawpal.vn', 
                shift: 'NIGHT', 
                status: 'ACTIVE', 
                join_date: '2024-11-01', 
                dob: '1994-07-08', 
                address: '88 Hoàng Hoa Thám, Bình Thạnh, TP. Hồ Chí Minh',
                skillScore: 90,
                skillResult: 'PASS',
                skillExam: 'Đạt (90đ)',
                serviceLocked: false,
                note: 'Phụ trách cấp cứu 24/7 và lưu trú đêm'
            },
            { 
                id: 'EMP-005', 
                name: 'Phạm Thị D', 
                position: 'CSKH', 
                role: 'CSKH', 
                phone: '0911223344', 
                email: 'd.pham@pawpal.vn', 
                shift: 'AFTERNOON', 
                status: 'PAUSE', 
                join_date: '2026-01-15', 
                dob: '1999-03-25', 
                address: '15/2 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh',
                skillScore: 78,
                skillResult: 'PASS',
                skillExam: 'Đạt (78đ)',
                serviceLocked: false,
                note: 'Tạm nghỉ việc cá nhân 2 tuần'
            },
            { 
                id: 'EMP-006', 
                name: 'Hoàng Văn E', 
                position: 'Tài xế Taxi Pet', 
                role: 'Driver', 
                phone: '0933445566', 
                email: 'e.hoang@pawpal.vn', 
                shift: 'ALL', 
                status: 'RESIGNED', 
                join_date: '2023-06-10', 
                dob: '1992-12-05', 
                address: '204 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh',
                skillScore: 40,
                skillResult: 'FAIL',
                skillExam: 'Không đạt (40đ)',
                serviceLocked: true,
                note: 'Đã hoàn tất thủ tục nghỉ việc'
            },
            { 
                id: 'EMP-007', 
                name: 'Trần Văn Hùng', 
                position: 'Groomer', 
                role: 'Groomer', 
                phone: '0945678901', 
                email: 'hung.tran@pawpal.vn', 
                shift: 'AFTERNOON', 
                status: 'ACTIVE', 
                join_date: '2026-02-01', 
                dob: '2001-05-18', 
                address: '56 Phan Đăng Lưu, Phú Nhuận, TP. Hồ Chí Minh',
                skillScore: 58,
                skillResult: 'RETRAIN',
                skillExam: 'Cần đào tạo (58đ)',
                serviceLocked: true,
                note: 'Cần kèm cặp tạo kiểu kéo cong trước khi nhận khách độc lập'
            },
            { 
                id: 'EMP-008', 
                name: 'Nguyễn Thị Thảo', 
                position: 'Groomer', 
                role: 'Groomer', 
                phone: '0978901234', 
                email: 'thao.nguyen@pawpal.vn', 
                shift: 'MORNING', 
                status: 'ACTIVE', 
                join_date: '2024-08-12', 
                dob: '1997-10-30', 
                address: '310 Hai Bà Trưng, Tân Định, Quận 1, TP. Hồ Chí Minh',
                skillScore: 92,
                skillResult: 'PASS',
                skillExam: 'Đạt (92đ)',
                serviceLocked: false,
                note: 'Tay nghề cao, phụ trách đào tạo nội bộ'
            },
            { 
                id: 'EMP-009', 
                name: 'Vũ Đình Trọng', 
                position: 'Bác sĩ/Bảo mẫu', 
                role: 'Veterinarian', 
                phone: '0967891234', 
                email: 'trong.vu@pawpal.vn', 
                shift: 'MORNING', 
                status: 'ACTIVE', 
                join_date: '2025-01-08', 
                dob: '1993-02-14', 
                address: '72 Điện Biên Phủ, Bình Thạnh, TP. Hồ Chí Minh',
                skillScore: 88,
                skillResult: 'PASS',
                skillExam: 'Đạt (88đ)',
                serviceLocked: false,
                note: 'Khám lâm sàng và xét nghiệm nhanh'
            },
            { 
                id: 'EMP-010', 
                name: 'Đỗ Bảo Ngọc', 
                position: 'Lễ tân', 
                role: 'Receptionist', 
                phone: '0988776655', 
                email: 'ngoc.do@pawpal.vn', 
                shift: 'EVENING', 
                status: 'ACTIVE', 
                join_date: '2025-09-01', 
                dob: '2002-09-09', 
                address: '18 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
                skillScore: 82,
                skillResult: 'PASS',
                skillExam: 'Đạt (82đ)',
                serviceLocked: false,
                note: 'Điều phối đặt lịch hẹn và trực ca tối'
            }
        ];

        const mockAssessments = [
            { id: 'ASM-001', date: '2026-09-20', staff_id: 'EMP-002', name: 'Nguyễn Văn A', position: 'Groomer', type: 'Grooming', score: 85, result: 'PASS', evaluator: 'Lê Lệ Quyên', note: 'Kỹ thuật cắt kéo cong Poodle chuẩn xác, thao tác dứt khoát' },
            { id: 'ASM-002', date: '2026-09-22', staff_id: 'EMP-003', name: 'Trần Thị B', position: 'Lễ tân', type: 'CSKH', score: 55, result: 'RETRAIN', evaluator: 'Lê Lệ Quyên', note: 'Chưa nắm vững quy trình xử lý phàn nàn và điều phối lịch khẩn cấp' },
            { id: 'ASM-003', date: '2026-09-24', staff_id: 'EMP-007', name: 'Trần Văn Hùng', position: 'Groomer', type: 'Grooming', score: 58, result: 'RETRAIN', evaluator: 'Lê Lệ Quyên', note: 'Cần kèm cặp tạo kiểu kéo cong trước khi nhận khách độc lập' },
            { id: 'ASM-004', date: '2026-09-25', staff_id: 'EMP-006', name: 'Hoàng Văn E', position: 'Tài xế Taxi Pet', type: 'Taxi Pet', score: 40, result: 'FAIL', evaluator: 'Lê Lệ Quyên', note: 'Không kiểm tra lồng an toàn trước khi đón thú cưng' },
            { id: 'ASM-005', date: '2026-09-26', staff_id: 'EMP-008', name: 'Nguyễn Thị Thảo', position: 'Groomer', type: 'Grooming', score: 92, result: 'PASS', evaluator: 'Lê Lệ Quyên', note: 'Tay nghề Master Grooming xuất sắc, kỹ năng định hình form chuẩn' },
            { id: 'ASM-006', date: '2026-09-27', staff_id: 'EMP-004', name: 'Lê Văn C', position: 'Bác sĩ/Bảo mẫu', type: 'Lưu trú 24/7', score: 90, result: 'PASS', evaluator: 'Lê Lệ Quyên', note: 'Quy trình theo dõi camera đêm và xử lý triệu chứng co giật đạt chuẩn thú y' },
            { id: 'ASM-007', date: '2026-09-28', staff_id: 'EMP-009', name: 'Vũ Đình Trọng', position: 'Bác sĩ/Bảo mẫu', type: 'Thú y', score: 88, result: 'PASS', evaluator: 'Lê Lệ Quyên', note: 'Khám lâm sàng và xét nghiệm da nấm chuẩn đoán chính xác' }
        ];

        // Biến trạng thái toàn cục phân hệ
        let selectedStaffId = sessionStorage.getItem('pawpal_admin_staff_selected_id') || 'EMP-001';

        // Trạng thái lọc danh sách nhân sự (Subtab 1)
        let currentKpiFilter = 'ALL';
        let filterRetrainActive = false;
        let filterLockActive = false;
        let alertFilterQuickActive = false;

        // Trạng thái lịch làm việc (Subtab 3 - Giai đoạn 2)
        let currentScheduleDate = '2026-09-28';
        let currentScheduleViewMode = 'DAY'; // 'DAY' hoặc 'WEEK'
        let scheduleFilterPos = 'ALL';
        let scheduleFilterShf = 'ALL';

        // Dữ liệu Roster (Phân ca theo ngày thực tế)
        const mockRoster = {
            '2026-09-28': {
                'EMP-001': ['MORNING'],
                'EMP-002': ['AFTERNOON'],
                'EMP-003': ['LEAVE'],
                'EMP-004': ['NIGHT'],
                'EMP-005': ['PAUSE'],
                'EMP-006': ['RESIGNED'],
                'EMP-007': ['AFTERNOON'],
                'EMP-008': ['MORNING'],
                'EMP-009': ['MORNING'],
                'EMP-010': ['EVENING']
            }
        };

        // Biến trạng thái Modal phân ca
        let modalActiveDate = currentScheduleDate;
        let modalActiveShift = 'MORNING';
        let modalCurrentAssignedIds = [];

        // GIAI ĐOẠN 3: DỮ LIỆU ĐƠN NGHỈ PHÉP VÀ ĐỔI CA (LEAVE & SHIFT SWAP)
        const mockLeaveSwapRequests = [
            {
                id: 'REQ-001',
                type: 'LEAVE',
                staffId: 'EMP-003',
                staffName: 'Trần Thị B',
                staffPos: 'Lễ tân',
                leaveType: 'SICK',
                leaveTypeLabel: 'Nghỉ ốm và Khám bệnh',
                startDate: '2026-09-28',
                endDate: '2026-09-28',
                scope: 'ALL',
                scopeLabel: 'Cả ngày',
                replacementId: '',
                replacementName: 'Chưa có người thay',
                reason: 'Khám chuyên khoa định kỳ tại bệnh viện',
                status: 'PENDING',
                createdAt: '28/09/2026 08:30'
            },
            {
                id: 'REQ-002',
                type: 'SWAP',
                staffId: 'EMP-002',
                staffName: 'Nguyễn Văn A',
                staffPos: 'Groomer',
                swapWithId: 'EMP-008',
                swapWithName: 'Nguyễn Thị Thảo',
                dateFrom: '2026-09-29',
                shiftFrom: 'AFTERNOON',
                shiftFromLabel: 'Ca chiều (13:00 - 17:00)',
                dateTo: '2026-09-29',
                shiftTo: 'MORNING',
                shiftToLabel: 'Ca sáng (08:00 - 12:00)',
                reason: 'Bận việc gia đình buổi chiều, đổi ca sáng với Thảo',
                status: 'PENDING',
                createdAt: '28/09/2026 09:15'
            },
            {
                id: 'REQ-003',
                type: 'LEAVE',
                staffId: 'EMP-005',
                staffName: 'Phạm Thị D',
                staffPos: 'CSKH',
                leaveType: 'PERSONAL',
                leaveTypeLabel: 'Việc riêng gia đình',
                startDate: '2026-09-25',
                endDate: '2026-10-02',
                scope: 'ALL',
                scopeLabel: 'Cả ngày (1 tuần)',
                replacementId: '',
                replacementName: '',
                reason: 'Gia đình có việc hiếu',
                status: 'APPROVED',
                createdAt: '24/09/2026 14:00'
            }
        ];

        let currentReqFilter = 'ALL';
        let activeLeaveSwapMode = 'LEAVE';

        // ---------------------------------------------------------
        // 2. HELPER FUNCTIONS & RENDERING LOGIC
        // ---------------------------------------------------------
        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function getStaffShiftsForDate(dateStr, staffId) {
            if (!mockRoster[dateStr]) {
                const staff = mockStaff.find(s => s.id === staffId);
                if (!staff) return [];
                if (staff.status === 'LEAVE') return ['LEAVE'];
                if (staff.status === 'PAUSE') return ['PAUSE'];
                if (staff.status === 'RESIGNED') return ['RESIGNED'];
                return staff.shift === 'ALL' ? ['MORNING', 'AFTERNOON'] : (staff.shift ? [staff.shift] : []);
            }
            return mockRoster[dateStr][staffId] || [];
        }

        function updateKpiCounters() {
            const statTotal = document.getElementById('statTotalStaff');
            const statActive = document.getElementById('statActiveStaff');
            const statLeave = document.getElementById('statLeaveStaff');
            const statPause = document.getElementById('statPauseStaff');
            const statRetrain = document.getElementById('statRetrainStaff');

            if (statTotal) statTotal.textContent = mockStaff.length;
            if (statActive) statActive.textContent = mockStaff.filter(s => s.status === 'ACTIVE').length;
            if (statLeave) statLeave.textContent = mockStaff.filter(s => s.status === 'LEAVE').length;
            if (statPause) statPause.textContent = mockStaff.filter(s => s.status === 'PAUSE').length;
            if (statRetrain) statRetrain.textContent = mockStaff.filter(s => s.skillResult === 'RETRAIN').length;
        }

        function renderStaffAlertBar() {
            const container = document.getElementById('staffAlertItemsContainer');
            if (!container) return;

            const alerts = [];

            // 1. Kiểm tra thiếu hụt nhân sự ca làm việc
            const afternoonGroomers = mockStaff.filter(s => s.role === 'Groomer' && s.shift === 'AFTERNOON' && s.status === 'ACTIVE');
            const availableAfternoonGroomers = afternoonGroomers.filter(s => !s.serviceLocked);
            if (afternoonGroomers.length > 0 && availableAfternoonGroomers.length < afternoonGroomers.length) {
                const lockedStaff = afternoonGroomers.filter(s => s.serviceLocked).map(s => s.name).join(', ');
                alerts.push({
                    type: 'danger',
                    shortText: `Ca chiều thiếu Groomer (1/2 khả dụng, ${lockedStaff} tạm khóa)`,
                    fullText: `Ca chiều thiếu Groomer: Chỉ có ${availableAfternoonGroomers.length}/${afternoonGroomers.length} nhân sự sẵn sàng làm việc (${lockedStaff} đang khóa nhận việc)`
                });
            }

            // 2. Nhân sự cần đào tạo lại
            const retrainStaff = mockStaff.filter(s => s.skillResult === 'RETRAIN');
            if (retrainStaff.length > 0) {
                const retrainIds = retrainStaff.map(s => s.id).join(', ');
                alerts.push({
                    type: 'warning',
                    shortText: `${retrainStaff.length} nhân viên cần đào tạo lại (${retrainIds})`,
                    fullText: `${retrainStaff.length} nhân viên cần đào tạo lại tay nghề trước ngày 05/10 (${retrainIds})`
                });
            }

            // 3. Nhân sự nghỉ phép
            const leaveStaff = mockStaff.filter(s => s.status === 'LEAVE');
            if (leaveStaff.length > 0) {
                const names = leaveStaff.map(s => s.name).join(', ');
                alerts.push({
                    type: 'info',
                    shortText: `${leaveStaff.length} nhân viên nghỉ phép hôm nay (${names})`,
                    fullText: `${leaveStaff.length} nhân viên đang nghỉ phép hôm nay (${names})`
                });
            }

            // 4. Đơn xin nghỉ phép và đổi ca chờ duyệt (Giai đoạn 3)
            const pendingReqs = mockLeaveSwapRequests.filter(r => r.status === 'PENDING');
            if (pendingReqs.length > 0) {
                alerts.push({
                    type: 'warning',
                    shortText: `${pendingReqs.length} đơn xin nghỉ và đổi ca chờ duyệt`,
                    fullText: `Có ${pendingReqs.length} đơn xin nghỉ phép và đề xuất đổi ca đang chờ quản trị viên phê duyệt`
                });
            }

            let tagsHtml = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" title="${a.fullText}">${a.shortText}</span>
            `).join('');

            // Ký hiệu 3 chấm (...) thuần chữ (không phải button)
            if (alerts.length > 1) {
                tagsHtml += `<span class="alert-dots-text">...</span>`;
            }

            container.innerHTML = tagsHtml;

            const alertBar = document.getElementById('staffAlertBar');
            if (alertBar) {
                alertBar.style.display = alerts.length > 0 ? 'flex' : 'none';
            }
        }

        function updateBreadcrumb(staffName) {
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

        function renderStaffProfile(staffId) {
            const staff = mockStaff.find(s => s.id === staffId) || mockStaff[0];
            if (!staff) return;
            selectedStaffId = staff.id;
            sessionStorage.setItem('pawpal_admin_staff_selected_id', staff.id);

            // Cập nhật Headline
            const elName = document.getElementById('viewStaffName');
            const elCode = document.getElementById('viewStaffCode');
            const elPos = document.getElementById('viewStaffPosition');
            const elBadge = document.getElementById('viewStaffStatusBadge');
            const elSafetyBadge = document.getElementById('viewStaffSafetyBadge');
            const btnLockToggle = document.getElementById('btnProfileToggleSafetyLock');

            if (elName) elName.textContent = staff.name;
            if (elCode) elCode.textContent = staff.id;
            if (elPos) elPos.textContent = staff.position;
            if (elBadge) {
                if (staff.status === 'ACTIVE') {
                    elBadge.className = 'admin-badge badge-active';
                    elBadge.textContent = 'Đang làm việc';
                } else if (staff.status === 'LEAVE') {
                    elBadge.className = 'admin-badge badge-leave';
                    elBadge.textContent = 'Nghỉ phép';
                } else if (staff.status === 'PAUSE') {
                    elBadge.className = 'admin-badge badge-pause';
                    elBadge.textContent = 'Tạm nghỉ';
                } else {
                    elBadge.className = 'admin-badge badge-resigned';
                    elBadge.textContent = 'Nghỉ việc';
                }
            }

            // Huy hiệu khóa an toàn nhận việc
            if (elSafetyBadge) {
                if (staff.serviceLocked) {
                    elSafetyBadge.style.display = 'inline-flex';
                    elSafetyBadge.className = 'admin-badge badge-locked';
                    elSafetyBadge.textContent = 'Tạm khóa nhận việc';
                } else {
                    elSafetyBadge.style.display = 'none';
                }
            }

            // Nút chuyển trạng thái khóa nhận việc
            if (btnLockToggle) {
                btnLockToggle.textContent = staff.serviceLocked ? 'Mở khóa nhận việc' : 'Khóa nhận việc';
            }

            // Thông tin cá nhân
            const elFullName = document.getElementById('viewStaffFullName');
            const elId = document.getElementById('viewStaffId');
            const elPhone = document.getElementById('viewStaffPhone');
            const elEmail = document.getElementById('viewStaffEmail');
            const elDob = document.getElementById('viewStaffDob');
            const elJoin = document.getElementById('viewStaffJoinDate');
            const elAddress = document.getElementById('viewStaffAddress');

            if (elFullName) elFullName.textContent = staff.name;
            if (elId) elId.textContent = staff.id;
            if (elPhone) elPhone.textContent = staff.phone;
            if (elEmail) elEmail.textContent = staff.email;
            if (elDob) elDob.textContent = staff.dob || '--';
            if (elJoin) elJoin.textContent = staff.join_date || '--';
            if (elAddress) elAddress.textContent = staff.address || 'Chưa cập nhật';

            // Thông tin công việc
            const elJob = document.getElementById('viewStaffJobTitle');
            const elRole = document.getElementById('viewStaffRole');
            const elShift = document.getElementById('viewStaffCurrentShift');
            const elWorkStatus = document.getElementById('viewStaffWorkStatus');

            if (elJob) elJob.textContent = staff.position;
            if (elRole) elRole.textContent = staff.role;
            if (elShift) {
                let shiftText = staff.shift === 'MORNING' ? 'Ca sáng (08:00 - 12:00)' : staff.shift === 'AFTERNOON' ? 'Ca chiều (13:00 - 17:00)' : staff.shift === 'EVENING' ? 'Ca tối (17:30 - 21:30)' : staff.shift === 'NIGHT' ? 'Ca khuya (22:00 - 06:00)' : 'Không phân ca';
                elShift.textContent = shiftText;
            }
            if (elWorkStatus) {
                elWorkStatus.textContent = staff.status === 'ACTIVE' ? 'Đang làm việc' : (staff.status === 'LEAVE' ? 'Nghỉ phép' : (staff.status === 'PAUSE' ? 'Tạm nghỉ' : 'Nghỉ việc'));
                elWorkStatus.className = 'info-value ' + (staff.status === 'ACTIVE' ? 'text-success' : 'text-danger');
            }

            // Công ca và năng suất tháng hiện tại (Giai đoạn 4)
            const elMonthlyHours = document.getElementById('viewStaffMonthlyHours');
            const elNightShifts = document.getElementById('viewStaffNightShifts');
            const elCompletedServices = document.getElementById('viewStaffCompletedServices');
            const elPunctuality = document.getElementById('viewStaffPunctuality');

            if (elMonthlyHours) {
                elMonthlyHours.textContent = staff.monthlyHours || (staff.shift === 'NIGHT' ? '184.0h' : (staff.status === 'LEAVE' ? '128.0h' : (staff.status === 'RESIGNED' ? '0.0h' : '168.0h')));
            }
            if (elNightShifts) {
                elNightShifts.textContent = staff.nightShiftsCount !== undefined ? `${staff.nightShiftsCount} ca` : (staff.shift === 'NIGHT' ? '14 ca' : (staff.role === 'Veterinarian' ? '6 ca' : '2 ca'));
            }
            if (elCompletedServices) {
                elCompletedServices.textContent = staff.completedServicesCount !== undefined ? `${staff.completedServicesCount} lượt` : (staff.role === 'Groomer' ? '68 lượt' : (staff.role === 'Veterinarian' ? '45 ca' : (staff.role === 'Driver' ? '52 chuyến' : '38 lượt')));
            }
            if (elPunctuality) {
                elPunctuality.textContent = staff.punctualityRate || (staff.serviceLocked ? '92.0%' : '98.5%');
            }

            // Lịch sử đánh giá nghiệp vụ gần nhất của nhân viên (Giai đoạn 4)
            const elAssessHistory = document.getElementById('viewStaffAssessmentHistory');
            if (elAssessHistory) {
                elAssessHistory.innerHTML = '';
                const staffAssessments = mockAssessments.filter(a => a.staff_id === staff.id);
                if (staffAssessments.length === 0) {
                    elAssessHistory.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); padding: 10px 0;">Chưa có dữ liệu đánh giá nghiệp vụ cho nhân viên này.</div>';
                } else {
                    staffAssessments.forEach(ass => {
                        const isPass = ass.result === 'PASS';
                        const isRetrain = ass.result === 'RETRAIN';
                        const colorStyle = isPass ? 'color: #166534;' : (isRetrain ? 'color: #D97706;' : 'color: #DC2626;');
                        const resultText = isPass ? 'Đạt' : (isRetrain ? 'Cần đào tạo' : 'Không đạt');

                        const item = document.createElement('div');
                        item.className = 'history-item';
                        item.innerHTML = `
                            <div class="history-item-left">
                                <span style="font-weight: 600; color: var(--text-main);">${escapeHtml(ass.type)}</span>
                                <span style="font-size: 11.5px; color: var(--text-muted);">${ass.date} • ${escapeHtml(ass.evaluator || 'Lê Lệ Quyên')}${ass.note ? ' • ' + escapeHtml(ass.note) : ''}</span>
                            </div>
                            <div class="history-item-right" style="font-weight: 700; ${colorStyle}">
                                ${ass.score}/100 (${resultText})
                            </div>
                        `;
                        elAssessHistory.appendChild(item);
                    });
                }
            }

            // Cập nhật Breadcrumb nếu đang ở tab profile
            const activeTabBtn = subtabsContainer ? subtabsContainer.querySelector('.header-subtab-btn.active') : null;
            if (activeTabBtn && activeTabBtn.getAttribute('data-subtab') === 'tab-staff-profile') {
                updateBreadcrumb(staff.name);
            }
        }

        // ---------------------------------------------------------
        // 3. RENDER SUB-TAB 1: DANH SÁCH NHÂN VIÊN VÀ BỘ LỌC
        // ---------------------------------------------------------
        function getFilteredStaffList() {
            const searchInput = document.getElementById('staffSearchInput');
            const filterPos = document.getElementById('staffFilterPosition');
            const filterStatus = document.getElementById('staffFilterStatus');
            const filterShift = document.getElementById('staffFilterShift');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedPos = (filterPos && filterPos.value) ? filterPos.value : 'ALL';
            const selectedStatus = (filterStatus && filterStatus.value) ? filterStatus.value : 'ALL';
            const selectedShift = (filterShift && filterShift.value) ? filterShift.value : 'ALL';

            return mockStaff.filter(staff => {
                if (searchTerm) {
                    const match = (staff.id && staff.id.toLowerCase().includes(searchTerm)) ||
                                  (staff.name && staff.name.toLowerCase().includes(searchTerm)) ||
                                  (staff.phone && staff.phone.toLowerCase().includes(searchTerm)) ||
                                  (staff.position && staff.position.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }

                if (selectedPos !== 'ALL' && staff.role !== selectedPos) return false;
                if (selectedStatus !== 'ALL' && staff.status !== selectedStatus) return false;
                if (selectedShift !== 'ALL' && staff.shift !== selectedShift) return false;

                if (currentKpiFilter === 'ACTIVE' && staff.status !== 'ACTIVE') return false;
                if (currentKpiFilter === 'LEAVE' && staff.status !== 'LEAVE') return false;
                if (currentKpiFilter === 'PAUSE' && staff.status !== 'PAUSE') return false;
                if (currentKpiFilter === 'RETRAIN' && staff.skillResult !== 'RETRAIN') return false;

                if (filterRetrainActive && staff.skillResult !== 'RETRAIN') return false;
                if (filterLockActive && !staff.serviceLocked) return false;
                if (alertFilterQuickActive && !(staff.skillResult === 'RETRAIN' || staff.serviceLocked || staff.status === 'LEAVE')) return false;

                return true;
            });
        }

        function renderStaffList() {
            const tbody = document.getElementById('staffListTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const list = getFilteredStaffList();

            if (list.length === 0) {
                const emptyTr = document.createElement('tr');
                emptyTr.innerHTML = `
                    <td colspan="8" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy nhân viên nào phù hợp với điều kiện lọc hiện tại.
                    </td>
                `;
                tbody.appendChild(emptyTr);
                return;
            }

            list.forEach(staff => {
                let statusBadge = '';
                if (staff.status === 'ACTIVE') statusBadge = '<span class="admin-badge badge-active">Đang làm việc</span>';
                else if (staff.status === 'LEAVE') statusBadge = '<span class="admin-badge badge-leave">Nghỉ phép</span>';
                else if (staff.status === 'PAUSE') statusBadge = '<span class="admin-badge badge-pause">Tạm nghỉ</span>';
                else statusBadge = '<span class="admin-badge badge-resigned">Nghỉ việc</span>';

                let shiftText = staff.shift === 'MORNING' ? 'Ca sáng' : staff.shift === 'AFTERNOON' ? 'Ca chiều' : staff.shift === 'EVENING' ? 'Ca tối' : staff.shift === 'NIGHT' ? 'Ca khuya' : 'Toàn thời gian';

                let skillBadge = '';
                if (staff.skillResult === 'PASS') {
                    skillBadge = `<span class="admin-badge badge-pass">${staff.skillExam}</span>`;
                } else if (staff.skillResult === 'RETRAIN') {
                    skillBadge = `<span class="admin-badge badge-retrain">${staff.skillExam}</span>`;
                } else {
                    skillBadge = `<span class="admin-badge badge-fail">${staff.skillExam}</span>`;
                }

                let lockStatusText = staff.serviceLocked 
                    ? `<div style="font-size: 11px; color: #DC2626; font-weight: 500; margin-top: 3px;">Tạm khóa nhận việc</div>`
                    : `<div style="font-size: 11px; color: #4F7A65; margin-top: 3px;">Sẵn sàng nhận lịch</div>`;

                const tr = document.createElement('tr');

                if (staff.status === 'RESIGNED') {
                    tr.classList.add('row-locked');
                }
                if (staff.skillResult === 'FAIL') {
                    tr.classList.add('row-highlight-danger');
                } else if (staff.skillResult === 'RETRAIN' || staff.serviceLocked) {
                    tr.classList.add('row-highlight-warning');
                }

                tr.innerHTML = `
                    <td>${staff.id}</td>
                    <td><a href="javascript:void(0)" class="user-link-text btn-view-profile" data-id="${staff.id}">${staff.name}</a></td>
                    <td>${staff.position}</td>
                    <td>${staff.phone}</td>
                    <td>${shiftText}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            ${skillBadge}
                            ${lockStatusText}
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button class="btn-action-trigger btn-staff-action" data-id="${staff.id}">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachActionDropdowns();
            attachProfileDrawerEvents();
        }

        function attachActionDropdowns() {
            const triggers = document.querySelectorAll('.btn-staff-action');
            const dropdown = document.getElementById('staffActionDropdown');
            if (!dropdown) return;

            triggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');
                    
                    const rect = trigger.getBoundingClientRect();
                    dropdown.style.display = 'flex';
                    dropdown.style.top = (rect.bottom + 4) + 'px';
                    dropdown.style.left = (rect.right - 180) + 'px';
                    dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-staff-action')) {
                    dropdown.style.display = 'none';
                }
            });
        }

        function attachProfileDrawerEvents() {
            document.querySelectorAll('.btn-view-profile').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = link.getAttribute('data-id');
                    const staff = mockStaff.find(s => s.id === id);
                    if (staff) {
                        selectedStaffId = staff.id;
                        sessionStorage.setItem('pawpal_admin_staff_selected_id', staff.id);
                        switchSubtab('tab-staff-profile');
                    }
                });
            });
        }

        // ---------------------------------------------------------
        // 4. RENDER SUB-TAB 2: LỊCH LÀM VIỆC & KIỂM SOÁT ĐỊNH BIÊN CA (GIAI ĐOẠN 2)
        // ---------------------------------------------------------
        function updateShiftQuotas(dateStr) {
            const morningAssigned = [];
            const afternoonAssigned = [];
            const eveningAssigned = [];
            const nightAssigned = [];

            mockStaff.forEach(s => {
                const shifts = getStaffShiftsForDate(dateStr, s.id);
                if (shifts.includes('MORNING') && s.status !== 'LEAVE' && s.status !== 'RESIGNED') {
                    morningAssigned.push(s);
                }
                if (shifts.includes('AFTERNOON') && s.status !== 'LEAVE' && s.status !== 'RESIGNED') {
                    afternoonAssigned.push(s);
                }
                if (shifts.includes('EVENING') && s.status !== 'LEAVE' && s.status !== 'RESIGNED') {
                    eveningAssigned.push(s);
                }
                if (shifts.includes('NIGHT') && s.status !== 'LEAVE' && s.status !== 'RESIGNED') {
                    nightAssigned.push(s);
                }
            });

            // 1. Ca sáng
            const mCountEl = document.getElementById('quotaMorningCount');
            const mBadgeEl = document.getElementById('quotaMorningBadge');
            const mNoteEl = document.getElementById('quotaMorningNote');
            if (mCountEl) mCountEl.textContent = `${morningAssigned.length} / 4 nhân sự`;
            if (mBadgeEl) {
                if (morningAssigned.length >= 4) {
                    mBadgeEl.className = 'quota-status-pill pill-ok';
                    mBadgeEl.textContent = 'Đạt định biên';
                } else {
                    mBadgeEl.className = 'quota-status-pill pill-warning';
                    mBadgeEl.textContent = `Thiếu ${4 - morningAssigned.length} nhân sự`;
                }
            }
            if (mNoteEl) mNoteEl.textContent = '1 Lễ tân • 2 Groomer • 1 Thú y';

            // 2. Ca chiều
            const aCountEl = document.getElementById('quotaAfternoonCount');
            const aBadgeEl = document.getElementById('quotaAfternoonBadge');
            const aNoteEl = document.getElementById('quotaAfternoonNote');
            
            const lockedAfternoonGroomers = afternoonAssigned.filter(s => s.role === 'Groomer' && s.serviceLocked);

            if (aCountEl) aCountEl.textContent = `${afternoonAssigned.length} / 3 nhân sự`;
            if (aBadgeEl) {
                if (lockedAfternoonGroomers.length > 0) {
                    aBadgeEl.className = 'quota-status-pill pill-warning';
                    aBadgeEl.textContent = 'Thiếu 1 Groomer';
                } else if (afternoonAssigned.length >= 3) {
                    aBadgeEl.className = 'quota-status-pill pill-ok';
                    aBadgeEl.textContent = 'Đạt định biên';
                } else {
                    aBadgeEl.className = 'quota-status-pill pill-warning';
                    aBadgeEl.textContent = `Thiếu ${3 - afternoonAssigned.length} nhân sự`;
                }
            }
            if (aNoteEl) {
                if (lockedAfternoonGroomers.length > 0) {
                    aNoteEl.textContent = `${lockedAfternoonGroomers[0].name} đang tạm khóa`;
                } else {
                    aNoteEl.textContent = '1 Lễ tân • 2 Groomer';
                }
            }

            // 3. Ca tối
            const eCountEl = document.getElementById('quotaEveningCount');
            const eBadgeEl = document.getElementById('quotaEveningBadge');
            const eNoteEl = document.getElementById('quotaEveningNote');
            if (eCountEl) eCountEl.textContent = `${eveningAssigned.length} / 2 nhân sự`;
            if (eBadgeEl) {
                if (eveningAssigned.length >= 2) {
                    eBadgeEl.className = 'quota-status-pill pill-ok';
                    eBadgeEl.textContent = 'Đạt định biên';
                } else {
                    eBadgeEl.className = 'quota-status-pill pill-ok';
                    eBadgeEl.textContent = 'Tối thiểu 1/2';
                }
            }
            if (eNoteEl) eNoteEl.textContent = '1 Lễ tân • 1 CSKH';

            // 4. Ca khuya (24/7 trực đêm và cấp cứu)
            const nCountEl = document.getElementById('quotaNightCount');
            const nBadgeEl = document.getElementById('quotaNightBadge');
            const nNoteEl = document.getElementById('quotaNightNote');
            if (nCountEl) nCountEl.textContent = `${nightAssigned.length} / 1 nhân sự`;
            if (nBadgeEl) {
                if (nightAssigned.length >= 1) {
                    nBadgeEl.className = 'quota-status-pill pill-ok';
                    nBadgeEl.textContent = 'Đạt định biên';
                } else {
                    nBadgeEl.className = 'quota-status-pill pill-warning';
                    nBadgeEl.textContent = 'Thiếu trực đêm!';
                }
            }
            if (nNoteEl) nNoteEl.textContent = '1 Bác sĩ/Bảo mẫu trực 24/7';
        }

        function getWeekDays(dateStr) {
            const curr = new Date(dateStr);
            const day = curr.getDay();
            const diffToMon = (day === 0 ? -6 : 1) - day;
            const monday = new Date(curr);
            monday.setDate(curr.getDate() + diffToMon);

            const weekDays = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                const isoStr = d.toISOString().split('T')[0];
                const dayNum = d.getDate().toString().padStart(2, '0');
                const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');
                weekDays.push({
                    dateStr: isoStr,
                    label: i === 6 ? `CN (${dayNum}/${monthNum})` : `T${i + 2} (${dayNum}/${monthNum})`
                });
            }
            return weekDays;
        }

        function renderScheduleDayTable() {
            const tbody = document.getElementById('scheduleTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const filteredStaff = mockStaff.filter(s => {
                if (scheduleFilterPos !== 'ALL' && s.role !== scheduleFilterPos) return false;
                if (scheduleFilterShf !== 'ALL') {
                    const shifts = getStaffShiftsForDate(currentScheduleDate, s.id);
                    if (!shifts.includes(scheduleFilterShf)) return false;
                }
                return true;
            });

            if (filteredStaff.length === 0) {
                const emptyTr = document.createElement('tr');
                emptyTr.innerHTML = `
                    <td colspan="7" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không có nhân viên nào được phân công phù hợp với điều kiện lọc hiện tại.
                    </td>
                `;
                tbody.appendChild(emptyTr);
                return;
            }

            filteredStaff.forEach(staff => {
                const shifts = getStaffShiftsForDate(currentScheduleDate, staff.id);

                function createCell(shiftKey, shiftTimeLabel) {
                    if (staff.status === 'RESIGNED') {
                        return `<div class="shift-cell empty" style="cursor: not-allowed; opacity: 0.5;">--</div>`;
                    }
                    if (shifts.includes('LEAVE') || staff.status === 'LEAVE') {
                        return `<div class="shift-cell leave" data-shift="${shiftKey}" data-id="${staff.id}">
                            <span class="shift-cell-title">Nghỉ phép</span>
                            <span class="shift-cell-time">Cả ngày</span>
                        </div>`;
                    }
                    if (shifts.includes(shiftKey)) {
                        if (staff.serviceLocked) {
                            return `<div class="shift-cell locked-warning" data-shift="${shiftKey}" data-id="${staff.id}">
                                <span class="shift-cell-title">Tạm khóa</span>
                                <span class="shift-cell-time">Cần kèm cặp</span>
                            </div>`;
                        }
                        return `<div class="shift-cell assigned" data-shift="${shiftKey}" data-id="${staff.id}">
                            <span class="shift-cell-title">Đi làm</span>
                            <span class="shift-cell-time">${shiftTimeLabel}</span>
                        </div>`;
                    }
                    return `<div class="shift-cell empty" data-shift="${shiftKey}" data-id="${staff.id}">+ Xếp ca</div>`;
                }

                const mCell = createCell('MORNING', '08:00 - 12:00');
                const aCell = createCell('AFTERNOON', '13:00 - 17:00');
                const eCell = createCell('EVENING', '17:30 - 21:30');
                const nCell = createCell('NIGHT', '22:00 - 06:00');

                let totalHours = 0;
                if (shifts.includes('MORNING') && !shifts.includes('LEAVE') && staff.status !== 'LEAVE') totalHours += 4;
                if (shifts.includes('AFTERNOON') && !shifts.includes('LEAVE') && staff.status !== 'LEAVE') totalHours += 4;
                if (shifts.includes('EVENING') && !shifts.includes('LEAVE') && staff.status !== 'LEAVE') totalHours += 4;
                if (shifts.includes('NIGHT') && !shifts.includes('LEAVE') && staff.status !== 'LEAVE') totalHours += 8;

                let hoursBadge = '';
                if (totalHours === 0) {
                    hoursBadge = '<span class="hours-badge hours-zero">0.0 giờ</span>';
                } else if (totalHours <= 8) {
                    hoursBadge = `<span class="hours-badge hours-normal">${totalHours}.0 giờ</span>`;
                } else {
                    hoursBadge = `<span class="hours-badge hours-overload">${totalHours}.0 giờ (Quá tải)</span>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 500;">${staff.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading); cursor: pointer;" class="btn-view-profile" data-id="${staff.id}">${staff.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${staff.position}</div>
                    </td>
                    <td>${mCell}</td>
                    <td>${aCell}</td>
                    <td>${eCell}</td>
                    <td>${nCell}</td>
                    <td style="text-align: center;">${hoursBadge}</td>
                `;
                tbody.appendChild(tr);
            });

            attachShiftCellEvents();
            attachProfileDrawerEvents();
        }

        function renderScheduleWeekTable() {
            const theadRow = document.getElementById('scheduleWeekHeaderRow');
            const tbody = document.getElementById('scheduleWeekTableBody');
            if (!theadRow || !tbody) return;

            const weekDays = getWeekDays(currentScheduleDate);

            theadRow.innerHTML = `
                <th style="width: 90px;">Mã NV</th>
                <th style="width: 170px;">Họ tên và Chức vụ</th>
                ${weekDays.map(w => `<th style="text-align: center; width: 105px;">${w.label}</th>`).join('')}
                <th style="text-align: center; width: 110px;">Tổng tuần</th>
            `;

            tbody.innerHTML = '';

            const filteredStaff = mockStaff.filter(s => {
                if (scheduleFilterPos !== 'ALL' && s.role !== scheduleFilterPos) return false;
                return true;
            });

            filteredStaff.forEach(staff => {
                let totalWeekHours = 0;

                const dayCellsHtml = weekDays.map(w => {
                    const shifts = getStaffShiftsForDate(w.dateStr, staff.id);
                    if (staff.status === 'RESIGNED') {
                        return `<td><div class="week-day-cell"><span class="week-shift-pill week-pill-empty">--</span></div></td>`;
                    }
                    if (shifts.includes('LEAVE') || (w.dateStr === '2026-09-28' && staff.status === 'LEAVE')) {
                        return `<td><div class="week-day-cell"><span class="week-shift-pill week-pill-leave" data-date="${w.dateStr}" data-id="${staff.id}">Nghỉ phép</span></div></td>`;
                    }

                    if (shifts.length === 0) {
                        return `<td><div class="week-day-cell"><span class="week-shift-pill week-pill-empty" data-date="${w.dateStr}" data-id="${staff.id}">Nghỉ</span></div></td>`;
                    }

                    const pills = shifts.map(sh => {
                        const shiftHours = sh === 'NIGHT' ? 8 : 4;
                        totalWeekHours += shiftHours;
                        if (staff.serviceLocked && sh === 'AFTERNOON') {
                            return `<span class="week-shift-pill week-pill-locked" data-date="${w.dateStr}" data-shift="${sh}" data-id="${staff.id}">Chiều (Khóa)</span>`;
                        }
                        if (sh === 'MORNING') return `<span class="week-shift-pill week-pill-morning" data-date="${w.dateStr}" data-shift="${sh}" data-id="${staff.id}">Sáng (4h)</span>`;
                        if (sh === 'AFTERNOON') return `<span class="week-shift-pill week-pill-afternoon" data-date="${w.dateStr}" data-shift="${sh}" data-id="${staff.id}">Chiều (4h)</span>`;
                        if (sh === 'EVENING') return `<span class="week-shift-pill week-pill-evening" data-date="${w.dateStr}" data-shift="${sh}" data-id="${staff.id}">Tối (4h)</span>`;
                        if (sh === 'NIGHT') return `<span class="week-shift-pill week-pill-night" data-date="${w.dateStr}" data-shift="${sh}" data-id="${staff.id}">Khuya (8h)</span>`;
                        return '';
                    }).join('');

                    return `<td><div class="week-day-cell">${pills}</div></td>`;
                }).join('');

                let weekHoursBadge = '';
                if (totalWeekHours === 0) {
                    weekHoursBadge = '<span class="hours-badge hours-zero">0h</span>';
                } else if (totalWeekHours <= 40) {
                    weekHoursBadge = `<span class="hours-badge hours-normal">${totalWeekHours}.0h</span>`;
                } else {
                    weekHoursBadge = `<span class="hours-badge hours-overload">${totalWeekHours}.0h (Tăng ca)</span>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 500;">${staff.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading); cursor: pointer;" class="btn-view-profile" data-id="${staff.id}">${staff.name}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${staff.position}</div>
                    </td>
                    ${dayCellsHtml}
                    <td style="text-align: center;">${weekHoursBadge}</td>
                `;
                tbody.appendChild(tr);
            });

            tbody.querySelectorAll('.week-shift-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const d = pill.getAttribute('data-date') || currentScheduleDate;
                    const sh = pill.getAttribute('data-shift') || 'MORNING';
                    const id = pill.getAttribute('data-id');
                    openShiftModal(d, sh, id);
                });
            });

            attachProfileDrawerEvents();
        }

        function renderScheduleTable() {
            updateShiftQuotas(currentScheduleDate);

            const dayWrapper = document.getElementById('scheduleDayViewWrapper');
            const weekWrapper = document.getElementById('scheduleWeekViewWrapper');
            const groupShiftFilter = document.getElementById('groupFilterShiftDay');

            if (currentScheduleViewMode === 'DAY') {
                if (dayWrapper) dayWrapper.style.display = 'block';
                if (weekWrapper) weekWrapper.style.display = 'none';
                if (groupShiftFilter) groupShiftFilter.style.display = 'flex';
                renderScheduleDayTable();
            } else {
                if (dayWrapper) dayWrapper.style.display = 'none';
                if (weekWrapper) weekWrapper.style.display = 'block';
                if (groupShiftFilter) groupShiftFilter.style.display = 'none';
                renderScheduleWeekTable();
            }
        }

        function checkShiftConflicts(targetStaffId) {
            const banner = document.getElementById('shiftAlertBanner');
            if (!banner) return;

            const staff = mockStaff.find(s => s.id === targetStaffId);
            if (!staff) {
                banner.style.display = 'none';
                return;
            }

            if (staff.status === 'LEAVE') {
                banner.style.display = 'block';
                banner.style.color = '#DC2626';
                banner.textContent = `Cảnh báo: Nhân viên ${staff.name} đang trong trạng thái Nghỉ phép, không thể phân ca!`;
                return;
            }

            if (staff.serviceLocked) {
                banner.style.display = 'block';
                banner.style.color = '#DC2626';
                banner.textContent = `Lưu ý an toàn: ${staff.name} đang bị tạm khóa nhận việc độc lập do cần đào tạo lại. Chỉ được phân ca kèm cặp!`;
                return;
            }

            const currentDayShifts = getStaffShiftsForDate(modalActiveDate, staff.id);
            const otherShifts = currentDayShifts.filter(sh => sh !== modalActiveShift);
            
            const addedHours = modalActiveShift === 'NIGHT' ? 8 : 4;
            let currentDayHours = 0;
            otherShifts.forEach(sh => {
                currentDayHours += (sh === 'NIGHT' ? 8 : 4);
            });
            const totalProjectedHours = currentDayHours + addedHours;

            if (totalProjectedHours > 8) {
                banner.style.display = 'block';
                banner.style.color = '#DC2626';
                banner.textContent = `Cảnh báo quá giờ: ${staff.name} sẽ làm ${totalProjectedHours}.0 giờ trong ngày (vượt định mức an toàn tối đa 8.0 giờ)!`;
                return;
            } else if (totalProjectedHours === 8 && otherShifts.length > 0) {
                banner.style.display = 'block';
                banner.style.color = '#B45309';
                banner.textContent = `Lưu ý: ${staff.name} sẽ đạt mức tối đa 8.0 giờ làm việc trong ngày.`;
                return;
            }

            banner.style.display = 'none';
        }

        function renderModalStaffLists() {
            const availContainer = document.getElementById('shiftAvailableStaff');
            const assignContainer = document.getElementById('shiftAssignedStaff');
            if (!availContainer || !assignContainer) return;

            availContainer.innerHTML = '';
            assignContainer.innerHTML = '';

            const availableStaff = mockStaff.filter(s => !modalCurrentAssignedIds.includes(s.id) && s.status !== 'RESIGNED');
            const assignedStaff = mockStaff.filter(s => modalCurrentAssignedIds.includes(s.id));

            if (availableStaff.length === 0) {
                availContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">Không còn nhân viên khả dụng.</div>';
            } else {
                availableStaff.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'shift-staff-item';
                    item.innerHTML = `
                        <div class="shift-staff-item-info">
                            <span class="shift-staff-name">${s.name} ${s.serviceLocked ? '<span style="color: #DC2626; font-size: 10.5px;">(Khóa nhận việc)</span>' : ''}</span>
                            <span class="shift-staff-pos">${s.position} • ${s.status === 'LEAVE' ? '<span style="color: #B45309;">Nghỉ phép</span>' : 'Sẵn sàng'}</span>
                        </div>
                        <button type="button" class="btn-shift-action btn-add-to-shift" data-id="${s.id}">+ Thêm vào ca</button>
                    `;
                    availContainer.appendChild(item);
                });
            }

            if (assignedStaff.length === 0) {
                assignContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">Chưa có nhân viên nào trong ca này.</div>';
            } else {
                assignedStaff.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'shift-staff-item';
                    item.innerHTML = `
                        <div class="shift-staff-item-info">
                            <span class="shift-staff-name">${s.name}</span>
                            <span class="shift-staff-pos">${s.position} • ${modalActiveShift === 'NIGHT' ? '8.0' : '4.0'} giờ</span>
                        </div>
                        <button type="button" class="btn-shift-action btn-remove-from-shift" data-id="${s.id}" style="border-color: #F3DCB7; color: #DC2626;">Gỡ khỏi ca</button>
                    `;
                    assignContainer.appendChild(item);
                });
            }

            availContainer.querySelectorAll('.btn-add-to-shift').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    checkShiftConflicts(id);
                    modalCurrentAssignedIds.push(id);
                    renderModalStaffLists();
                });
            });

            assignContainer.querySelectorAll('.btn-remove-from-shift').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    modalCurrentAssignedIds = modalCurrentAssignedIds.filter(x => x !== id);
                    renderModalStaffLists();
                    const banner = document.getElementById('shiftAlertBanner');
                    if (banner) banner.style.display = 'none';
                });
            });
        }

        function openShiftModal(dateStr, shiftKey, preselectedStaffId) {
            modalActiveDate = dateStr || currentScheduleDate;
            modalActiveShift = shiftKey || 'MORNING';

            const dateInput = document.getElementById('shiftInputDate');
            const shiftSelect = document.getElementById('shiftInputShift');
            const banner = document.getElementById('shiftAlertBanner');

            if (dateInput) dateInput.value = modalActiveDate;
            if (shiftSelect) shiftSelect.value = modalActiveShift;
            if (banner) banner.style.display = 'none';

            if (!mockRoster[modalActiveDate]) {
                mockRoster[modalActiveDate] = {};
                mockStaff.forEach(s => {
                    mockRoster[modalActiveDate][s.id] = getStaffShiftsForDate(modalActiveDate, s.id);
                });
            }

            modalCurrentAssignedIds = [];
            mockStaff.forEach(s => {
                const shifts = getStaffShiftsForDate(modalActiveDate, s.id);
                if (shifts.includes(modalActiveShift) && s.status !== 'LEAVE') {
                    modalCurrentAssignedIds.push(s.id);
                }
            });

            if (preselectedStaffId && !modalCurrentAssignedIds.includes(preselectedStaffId)) {
                checkShiftConflicts(preselectedStaffId);
            }

            renderModalStaffLists();
            const shiftModalEl = document.getElementById('shiftModalOverlay');
            if (shiftModalEl) shiftModalEl.classList.add('active');
        }

        function attachShiftCellEvents() {
            document.querySelectorAll('.shift-cell').forEach(cell => {
                cell.addEventListener('click', () => {
                    const shift = cell.getAttribute('data-shift') || 'MORNING';
                    const staffId = cell.getAttribute('data-id');
                    openShiftModal(currentScheduleDate, shift, staffId);
                });
            });
        }

        // ---------------------------------------------------------
        // 5. GIAI ĐOẠN 3: XỬ LÝ ĐƠN NGHỈ PHÉP VÀ ĐỔI CA (LEAVE & SHIFT SWAP)
        // ---------------------------------------------------------
        function updatePendingRequestsCounters() {
            const pendingCount = mockLeaveSwapRequests.filter(r => r.status === 'PENDING').length;
            const badgeEl = document.getElementById('schedulePendingBadge');
            const trayCountEl = document.getElementById('trayPendingCount');
            const filterCountEl = document.getElementById('countFilterReqPending');

            if (badgeEl) {
                badgeEl.textContent = pendingCount;
                badgeEl.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
            }
            if (trayCountEl) trayCountEl.textContent = pendingCount;
            if (filterCountEl) filterCountEl.textContent = pendingCount;
        }

        function renderLeaveRequestsList() {
            const container = document.getElementById('leaveRequestsListContainer');
            if (!container) return;
            container.innerHTML = '';

            const filteredList = mockLeaveSwapRequests.filter(r => {
                if (currentReqFilter !== 'ALL' && r.status !== currentReqFilter) return false;
                return true;
            });

            if (filteredList.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không có đơn nào phù hợp với điều kiện lọc hiện tại.
                    </div>
                `;
                return;
            }

            filteredList.forEach(req => {
                let typeBadge = req.type === 'LEAVE'
                    ? '<span class="admin-badge badge-leave" style="font-size: 11px;">Nghỉ phép</span>'
                    : '<span class="admin-badge badge-info" style="font-size: 11px;">Đổi ca</span>';

                let statusBadge = '';
                if (req.status === 'PENDING') statusBadge = '<span class="admin-badge badge-req-pending">Chờ duyệt</span>';
                else if (req.status === 'APPROVED') statusBadge = '<span class="admin-badge badge-req-approved">Đã duyệt</span>';
                else statusBadge = '<span class="admin-badge badge-req-rejected">Từ chối</span>';

                let detailsHtml = '';
                if (req.type === 'LEAVE') {
                    const dateText = req.startDate === req.endDate ? req.startDate : `${req.startDate} đến ${req.endDate}`;
                    const repText = req.replacementName ? `<span style="color: #236B48; font-weight: 500;">Người thay: ${req.replacementName}</span>` : '<span style="color: #B45309;">Chưa có người trực thay</span>';
                    detailsHtml = `
                        <div class="leave-req-desc">
                            <div><strong>Thời gian:</strong> ${dateText} (${req.scopeLabel})</div>
                            <div><strong>Loại nghỉ:</strong> ${req.leaveTypeLabel} • ${repText}</div>
                            <div class="leave-req-reason">Lý do: "${req.reason}"</div>
                        </div>
                    `;
                } else {
                    const returnText = req.shiftTo === 'NONE' ? 'Trực hộ (Không nhận ca bù)' : `${req.dateTo} (${req.shiftToLabel})`;
                    detailsHtml = `
                        <div class="leave-req-desc">
                            <div><strong>Ca xin đổi:</strong> ${req.dateFrom} (${req.shiftFromLabel})</div>
                            <div><strong>Đổi với:</strong> <span style="font-weight: 600; color: var(--text-heading);">${req.swapWithName}</span> ➔ Ca nhận lại: ${returnText}</div>
                            <div class="leave-req-reason">Lý do: "${req.reason}"</div>
                        </div>
                    `;
                }

                let actionsHtml = '';
                if (req.status === 'PENDING') {
                    actionsHtml = `
                        <div class="leave-req-actions">
                            <button type="button" class="btn-req-action btn-req-reject" data-id="${req.id}">Từ chối</button>
                            <button type="button" class="btn-req-action btn-req-approve" data-id="${req.id}">Duyệt đơn và Áp dụng</button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="leave-req-actions">
                            <span style="font-size: 11.5px; color: var(--text-muted); margin-right: auto;">Đã xử lý xong</span>
                            <button type="button" class="btn-req-action btn-req-delete" data-id="${req.id}">Xóa đơn</button>
                        </div>
                    `;
                }

                const item = document.createElement('div');
                item.className = 'leave-req-item';
                item.innerHTML = `
                    <div class="leave-req-top">
                        <div class="leave-req-code-group">
                            <span class="leave-req-code">${req.id}</span>
                            ${typeBadge}
                            <span class="leave-req-time">Gửi lúc ${req.createdAt}</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="leave-req-body">
                        <div>
                            <div class="leave-req-staff-name">${req.staffName}</div>
                            <div class="leave-req-staff-pos">${req.staffPos} (${req.staffId})</div>
                        </div>
                        ${detailsHtml}
                    </div>
                    ${actionsHtml}
                `;
                container.appendChild(item);
            });

            // Gán sự kiện duyệt / từ chối / xóa
            container.querySelectorAll('.btn-req-approve').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    approveLeaveSwapRequest(id);
                });
            });

            container.querySelectorAll('.btn-req-reject').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    rejectLeaveSwapRequest(id);
                });
            });

            container.querySelectorAll('.btn-req-delete').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const idx = mockLeaveSwapRequests.findIndex(r => r.id === id);
                    if (idx !== -1) {
                        mockLeaveSwapRequests.splice(idx, 1);
                        updatePendingRequestsCounters();
                        renderStaffAlertBar();
                        renderLeaveRequestsList();
                    }
                });
            });
        }

        function approveLeaveSwapRequest(reqId) {
            const req = mockLeaveSwapRequests.find(r => r.id === reqId);
            if (!req) return;

            req.status = 'APPROVED';

            if (req.type === 'LEAVE') {
                // Áp dụng nghỉ phép lên Roster
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);

                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    if (!mockRoster[dateStr]) {
                        mockRoster[dateStr] = {};
                        mockStaff.forEach(s => {
                            mockRoster[dateStr][s.id] = getStaffShiftsForDate(dateStr, s.id);
                        });
                    }

                    if (req.scope === 'ALL') {
                        mockRoster[dateStr][req.staffId] = ['LEAVE'];
                        if (req.replacementId) {
                            const staff = mockStaff.find(s => s.id === req.staffId);
                            const repShift = staff?.shift || 'MORNING';
                            if (!mockRoster[dateStr][req.replacementId]) mockRoster[dateStr][req.replacementId] = [];
                            if (!mockRoster[dateStr][req.replacementId].includes(repShift)) {
                                mockRoster[dateStr][req.replacementId].push(repShift);
                            }
                        }
                    } else {
                        if (!mockRoster[dateStr][req.staffId]) mockRoster[dateStr][req.staffId] = [];
                        mockRoster[dateStr][req.staffId] = mockRoster[dateStr][req.staffId].filter(sh => sh !== req.scope);
                        if (req.replacementId) {
                            if (!mockRoster[dateStr][req.replacementId]) mockRoster[dateStr][req.replacementId] = [];
                            if (!mockRoster[dateStr][req.replacementId].includes(req.scope)) {
                                mockRoster[dateStr][req.replacementId].push(req.scope);
                            }
                        }
                    }
                }
            } else if (req.type === 'SWAP') {
                // Áp dụng hoán đổi ca lên Roster
                if (!mockRoster[req.dateFrom]) {
                    mockRoster[req.dateFrom] = {};
                    mockStaff.forEach(s => {
                        mockRoster[req.dateFrom][s.id] = getStaffShiftsForDate(req.dateFrom, s.id);
                    });
                }
                // Gỡ ca khỏi NV 1
                mockRoster[req.dateFrom][req.staffId] = (mockRoster[req.dateFrom][req.staffId] || []).filter(sh => sh !== req.shiftFrom);
                // Gán ca cho NV 2
                if (!mockRoster[req.dateFrom][req.swapWithId]) mockRoster[req.dateFrom][req.swapWithId] = [];
                if (!mockRoster[req.dateFrom][req.swapWithId].includes(req.shiftFrom)) {
                    mockRoster[req.dateFrom][req.swapWithId].push(req.shiftFrom);
                }

                // Ngày nhận lại (nếu có)
                if (req.shiftTo && req.shiftTo !== 'NONE') {
                    if (!mockRoster[req.dateTo]) {
                        mockRoster[req.dateTo] = {};
                        mockStaff.forEach(s => {
                            mockRoster[req.dateTo][s.id] = getStaffShiftsForDate(req.dateTo, s.id);
                        });
                    }
                    mockRoster[req.dateTo][req.swapWithId] = (mockRoster[req.dateTo][req.swapWithId] || []).filter(sh => sh !== req.shiftTo);
                    if (!mockRoster[req.dateTo][req.staffId]) mockRoster[req.dateTo][req.staffId] = [];
                    if (!mockRoster[req.dateTo][req.staffId].includes(req.shiftTo)) {
                        mockRoster[req.dateTo][req.staffId].push(req.shiftTo);
                    }
                }
            }

            updatePendingRequestsCounters();
            renderStaffAlertBar();
            renderScheduleTable();
            renderLeaveRequestsList();
            alert(`Đã duyệt đơn ${req.id} và cập nhật lịch làm việc thành công!`);
        }

        function rejectLeaveSwapRequest(reqId) {
            const req = mockLeaveSwapRequests.find(r => r.id === reqId);
            if (!req) return;
            req.status = 'REJECTED';
            updatePendingRequestsCounters();
            renderStaffAlertBar();
            renderLeaveRequestsList();
            alert(`Đã từ chối đơn ${req.id}.`);
        }

        function openLeaveSwapModal(defaultStaffId) {
            const modal = document.getElementById('leaveSwapModalOverlay');
            if (!modal) return;

            const leaveStaffSelect = document.getElementById('leaveInputStaff');
            const leaveRepSelect = document.getElementById('leaveInputReplacement');
            const swapStaffFrom = document.getElementById('swapInputStaffFrom');
            const swapStaffTo = document.getElementById('swapInputStaffTo');

            const activeStaff = mockStaff.filter(s => s.status !== 'RESIGNED');

            function populateSelect(selectEl, selectedVal, includeNone) {
                if (!selectEl) return;
                let html = includeNone ? '<option value="">-- Chưa có người thay --</option>' : '';
                activeStaff.forEach(s => {
                    const sel = s.id === selectedVal ? 'selected' : '';
                    html += `<option value="${s.id}" ${sel}>${s.name} (${s.position})</option>`;
                });
                selectEl.innerHTML = html;
            }

            const currentTargetStaff = defaultStaffId || selectedStaffId;
            populateSelect(leaveStaffSelect, currentTargetStaff, false);
            populateSelect(leaveRepSelect, '', true);
            populateSelect(swapStaffFrom, currentTargetStaff, false);
            populateSelect(swapStaffTo, activeStaff.find(s => s.id !== currentTargetStaff)?.id, false);

            const startInput = document.getElementById('leaveInputStartDate');
            const endInput = document.getElementById('leaveInputEndDate');
            const swapDateFrom = document.getElementById('swapInputDateFrom');
            const swapDateTo = document.getElementById('swapInputDateTo');

            if (startInput) startInput.value = currentScheduleDate;
            if (endInput) endInput.value = currentScheduleDate;
            if (swapDateFrom) swapDateFrom.value = currentScheduleDate;
            if (swapDateTo) swapDateTo.value = currentScheduleDate;

            switchLeaveSwapMode('LEAVE');
            modal.classList.add('active');
        }

        function switchLeaveSwapMode(mode) {
            activeLeaveSwapMode = mode;
            const btnLeave = document.getElementById('btnTabModeLeave');
            const btnSwap = document.getElementById('btnTabModeSwap');
            const formLeave = document.getElementById('formSectionLeave');
            const formSwap = document.getElementById('formSectionSwap');

            if (mode === 'LEAVE') {
                btnLeave?.classList.add('active');
                btnSwap?.classList.remove('active');
                if (formLeave) formLeave.style.display = 'block';
                if (formSwap) formSwap.style.display = 'none';
            } else {
                btnSwap?.classList.add('active');
                btnLeave?.classList.remove('active');
                if (formLeave) formLeave.style.display = 'none';
                if (formSwap) formSwap.style.display = 'block';
            }
        }

        function handleCreateLeaveSwapRequest(approveImmediately = false) {
            const newId = 'REQ-' + String(mockLeaveSwapRequests.length + 1).padStart(3, '0');
            const now = new Date();
            const timeStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            if (activeLeaveSwapMode === 'LEAVE') {
                const staffId = document.getElementById('leaveInputStaff')?.value;
                const staff = mockStaff.find(s => s.id === staffId);
                const leaveType = document.getElementById('leaveInputType')?.value;
                const leaveTypeLabel = document.getElementById('leaveInputType')?.selectedOptions[0]?.text || 'Nghỉ phép';
                const startDate = document.getElementById('leaveInputStartDate')?.value || currentScheduleDate;
                const endDate = document.getElementById('leaveInputEndDate')?.value || startDate;
                const scope = document.getElementById('leaveInputScope')?.value || 'ALL';
                const scopeLabel = document.getElementById('leaveInputScope')?.selectedOptions[0]?.text || 'Cả ngày';
                const replacementId = document.getElementById('leaveInputReplacement')?.value;
                const replacement = mockStaff.find(s => s.id === replacementId);
                const reason = document.getElementById('leaveInputReason')?.value || 'Nghỉ phép cá nhân';

                const newReq = {
                    id: newId,
                    type: 'LEAVE',
                    staffId: staffId,
                    staffName: staff?.name || 'Nhân viên',
                    staffPos: staff?.position || '',
                    leaveType: leaveType,
                    leaveTypeLabel: leaveTypeLabel,
                    startDate: startDate,
                    endDate: endDate,
                    scope: scope,
                    scopeLabel: scopeLabel,
                    replacementId: replacementId || '',
                    replacementName: replacement ? replacement.name : '',
                    reason: reason,
                    status: approveImmediately ? 'APPROVED' : 'PENDING',
                    createdAt: timeStr
                };

                mockLeaveSwapRequests.unshift(newReq);

                if (approveImmediately) {
                    approveLeaveSwapRequest(newId);
                } else {
                    updatePendingRequestsCounters();
                    renderStaffAlertBar();
                    alert(`Đã tạo đơn xin nghỉ phép ${newId} (trạng thái Chờ duyệt)!`);
                }
            } else {
                const staffFromId = document.getElementById('swapInputStaffFrom')?.value;
                const staffFrom = mockStaff.find(s => s.id === staffFromId);
                const staffToId = document.getElementById('swapInputStaffTo')?.value;
                const staffTo = mockStaff.find(s => s.id === staffToId);
                const dateFrom = document.getElementById('swapInputDateFrom')?.value || currentScheduleDate;
                const shiftFrom = document.getElementById('swapInputShiftFrom')?.value || 'MORNING';
                const shiftFromLabel = document.getElementById('swapInputShiftFrom')?.selectedOptions[0]?.text || 'Ca sáng';
                const dateTo = document.getElementById('swapInputDateTo')?.value || currentScheduleDate;
                const shiftTo = document.getElementById('swapInputShiftTo')?.value || 'MORNING';
                const shiftToLabel = document.getElementById('swapInputShiftTo')?.selectedOptions[0]?.text || 'Ca sáng';
                const reason = document.getElementById('swapInputReason')?.value || 'Đổi ca làm việc';

                const newReq = {
                    id: newId,
                    type: 'SWAP',
                    staffId: staffFromId,
                    staffName: staffFrom?.name || 'Nhân viên',
                    staffPos: staffFrom?.position || '',
                    swapWithId: staffToId,
                    swapWithName: staffTo?.name || 'Đồng nghiệp',
                    dateFrom: dateFrom,
                    shiftFrom: shiftFrom,
                    shiftFromLabel: shiftFromLabel,
                    dateTo: dateTo,
                    shiftTo: shiftTo,
                    shiftToLabel: shiftToLabel,
                    reason: reason,
                    status: approveImmediately ? 'APPROVED' : 'PENDING',
                    createdAt: timeStr
                };

                mockLeaveSwapRequests.unshift(newReq);

                if (approveImmediately) {
                    approveLeaveSwapRequest(newId);
                } else {
                    updatePendingRequestsCounters();
                    renderStaffAlertBar();
                    alert(`Đã gửi đề xuất đổi ca ${newId} (trạng thái Chờ duyệt)!`);
                }
            }

            document.getElementById('leaveSwapModalOverlay')?.classList.remove('active');
        }

        function openLeaveRequestsTray() {
            renderLeaveRequestsList();
            const modal = document.getElementById('leaveRequestsTrayModal');
            if (modal) modal.classList.add('active');
        }

        // ---------------------------------------------------------
        // 6. RENDER SUB-TAB 4: ĐÁNH GIÁ NGHIỆP VỤ VÀ TỰ ĐỘNG KHÓA AN TOÀN
        // ---------------------------------------------------------
        function updateAssessmentKpiCounters() {
            const statAssessed = document.getElementById('statAssessed');
            const statPass = document.getElementById('statPass');
            const statRetrain = document.getElementById('statRetrain');
            const statNotAssessed = document.getElementById('statNotAssessed');

            if (statAssessed) statAssessed.textContent = mockAssessments.length;
            if (statPass) statPass.textContent = mockAssessments.filter(a => a.result === 'PASS').length;
            if (statRetrain) statRetrain.textContent = mockAssessments.filter(a => a.result === 'RETRAIN').length;

            const assessedStaffIds = new Set(mockAssessments.map(a => a.staff_id));
            const notAssessedCount = mockStaff.filter(s => !assessedStaffIds.has(s.id) || s.skillExam === 'Chưa kiểm tra').length;
            if (statNotAssessed) statNotAssessed.textContent = notAssessedCount;
        }

        function renderAssessmentList() {
            const tbody = document.getElementById('assessmentListTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('assessmentSearchInput');
            const filterTypeEl = document.getElementById('assessmentFilterType');
            const filterResultEl = document.getElementById('assessmentFilterResult');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedType = (filterTypeEl && filterTypeEl.value) ? filterTypeEl.value : 'ALL';
            const selectedResult = (filterResultEl && filterResultEl.value) ? filterResultEl.value : 'ALL';

            const filteredAssessments = mockAssessments.filter(ass => {
                if (searchTerm) {
                    const match = (ass.staff_id && ass.staff_id.toLowerCase().includes(searchTerm)) ||
                                  (ass.name && ass.name.toLowerCase().includes(searchTerm)) ||
                                  (ass.type && ass.type.toLowerCase().includes(searchTerm)) ||
                                  (ass.evaluator && ass.evaluator.toLowerCase().includes(searchTerm)) ||
                                  (ass.note && ass.note.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }
                if (selectedType !== 'ALL' && ass.type !== selectedType) return false;
                if (selectedResult !== 'ALL' && ass.result !== selectedResult) return false;
                return true;
            });

            if (filteredAssessments.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                        Không tìm thấy dữ liệu đánh giá nghiệp vụ phù hợp với bộ lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                updateAssessmentKpiCounters();
                return;
            }

            filteredAssessments.forEach(ass => {
                let resBadge = '';
                let rowHighlightClass = '';

                if (ass.result === 'PASS') {
                    resBadge = '<span class="admin-badge badge-active">Đạt</span>';
                } else if (ass.result === 'RETRAIN') {
                    resBadge = '<span class="admin-badge badge-leave">Cần đào tạo</span>';
                    rowHighlightClass = 'row-highlight-warning';
                } else {
                    resBadge = '<span class="admin-badge badge-resigned">Không đạt</span>';
                    rowHighlightClass = 'row-highlight-danger';
                }

                const tr = document.createElement('tr');
                if (rowHighlightClass) {
                    tr.className = rowHighlightClass;
                }
                tr.innerHTML = `
                    <td>${ass.date}</td>
                    <td><strong>${escapeHtml(ass.staff_id)}</strong></td>
                    <td>${escapeHtml(ass.name)}</td>
                    <td>${escapeHtml(ass.type)}</td>
                    <td style="text-align: center; font-weight: 700;">${ass.score}</td>
                    <td>${resBadge}</td>
                    <td>${escapeHtml(ass.evaluator || 'Lê Lệ Quyên')}</td>
                    <td style="color: var(--text-muted); font-size: 12.5px;">${escapeHtml(ass.note || '—')}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-edit-assess" data-id="${ass.staff_id}" data-type="${escapeHtml(ass.type)}" title="Xem hoặc Cập nhật đánh giá">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Gắn sự kiện nút ba chấm trong bảng đánh giá
            tbody.querySelectorAll('.btn-edit-assess').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const staffId = btn.getAttribute('data-id');
                    const assessType = btn.getAttribute('data-type');
                    openAssessmentModal(staffId, assessType);
                });
            });

            updateAssessmentKpiCounters();
        }

        function openAssessmentModal(targetStaffId = null, prefillType = null) {
            const staffSelect = document.getElementById('assessInputStaff');
            const dateInput = document.getElementById('assessInputDate');
            const typeSelect = document.getElementById('assessInputType');
            const scoreInput = document.getElementById('assessInputScore');
            const resultSelect = document.getElementById('assessInputResult');
            const noteInput = document.getElementById('assessInputNote');

            if (staffSelect) {
                staffSelect.innerHTML = mockStaff.map(s => `
                    <option value="${s.id}">${escapeHtml(s.name)} (${s.id}) - ${escapeHtml(s.position)}</option>
                `).join('');
                if (targetStaffId) {
                    staffSelect.value = targetStaffId;
                } else if (selectedStaffId) {
                    staffSelect.value = selectedStaffId;
                }
            }

            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }

            if (typeSelect && prefillType) {
                typeSelect.value = prefillType;
            }

            if (scoreInput) scoreInput.value = '85';
            if (resultSelect) resultSelect.value = 'PASS';
            if (noteInput) noteInput.value = '';

            const assessModalEl = document.getElementById('assessmentModalOverlay');
            if (assessModalEl) assessModalEl.classList.add('active');
        }

        function handleSaveAssessment() {
            const staffSelect = document.getElementById('assessInputStaff');
            const dateInput = document.getElementById('assessInputDate');
            const typeSelect = document.getElementById('assessInputType');
            const scoreInput = document.getElementById('assessInputScore');
            const resultSelect = document.getElementById('assessInputResult');
            const noteInput = document.getElementById('assessInputNote');
            const assessModalEl = document.getElementById('assessmentModalOverlay');

            const staffId = (staffSelect && staffSelect.value) ? staffSelect.value : selectedStaffId;
            const staff = mockStaff.find(s => s.id === staffId);
            if (!staff) {
                alert('Không tìm thấy thông tin nhân viên được chọn!');
                return;
            }

            const assessDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];
            const type = typeSelect ? typeSelect.value : 'Grooming';
            const score = scoreInput ? parseInt(scoreInput.value || '0', 10) : 0;
            const note = (noteInput && noteInput.value) ? noteInput.value.trim() : '';

            // Tự động phân loại kết quả dựa trên điểm số
            let result = 'PASS';
            if (score >= 80) {
                result = 'PASS';
            } else if (score >= 60) {
                result = 'RETRAIN';
            } else {
                result = 'FAIL';
            }
            if (resultSelect && resultSelect.value) {
                result = resultSelect.value;
            }

            staff.skillScore = score;
            staff.skillResult = result;
            staff.skillExam = result === 'PASS' 
                ? `Đạt (${score}đ)` 
                : (result === 'RETRAIN' ? `Cần đào tạo (${score}đ)` : `Không đạt (${score}đ)`);

            // Cơ chế khóa an toàn tự động (Automatic Safety Lock)
            let safetyLockMessage = '';
            if (result === 'PASS') {
                staff.serviceLocked = false;
                safetyLockMessage = `\nĐã tự động MỞ KHÓA nhận việc độc lập cho nhân viên ${staff.name}.`;
            } else {
                staff.serviceLocked = true;
                safetyLockMessage = `\nĐã kích hoạt TỰ ĐỘNG KHÓA AN TOÀN nhận dịch vụ cho nhân viên ${staff.name} do chưa đạt điểm chuẩn (≥ 80đ).`;
            }

            // Lưu vào mockAssessments
            const newAssId = 'ASM-' + String(mockAssessments.length + 1).padStart(3, '0');
            mockAssessments.unshift({
                id: newAssId,
                date: assessDate,
                staff_id: staff.id,
                name: staff.name,
                position: staff.position,
                type: type,
                score: score,
                result: result,
                evaluator: 'Lê Lệ Quyên',
                note: note || (result === 'PASS' ? 'Nghiệp vụ chuẩn xác' : 'Yêu cầu kèm cặp chuyên môn')
            });

            updateKpiCounters();
            updateAssessmentKpiCounters();
            renderStaffAlertBar();
            renderStaffList();
            renderAssessmentList();

            // Cập nhật tức thì hồ sơ chi tiết nếu đang mở nhân viên này
            if (selectedStaffId === staff.id) {
                renderStaffProfileDetail(staff);
            }

            if (assessModalEl) assessModalEl.classList.remove('active');
            alert(`Đã lưu kết quả đánh giá nghiệp vụ cho nhân viên ${staff.name} (${staff.id})!${safetyLockMessage}`);
        }

        // ---------------------------------------------------------
        // 6. CHUYỂN ĐỔI SUB-TAB & DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

        function switchSubtab(targetSubtab) {
            headerSubtabBtns.forEach(btn => {
                if (btn.getAttribute('data-subtab') === targetSubtab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            sections.forEach(sec => {
                if (sec.id === `subtab-${targetSubtab}`) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            if (targetSubtab === 'tab-staff-list') {
                renderStaffList();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-staff-profile') {
                renderStaffProfile(selectedStaffId);
                const currentStaff = mockStaff.find(s => s.id === selectedStaffId) || mockStaff[0];
                updateBreadcrumb(currentStaff ? currentStaff.name : null);
            } else if (targetSubtab === 'tab-staff-schedule') {
                renderScheduleTable();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-staff-assessment') {
                renderAssessmentList();
                updateBreadcrumb(null);
            }

            sessionStorage.setItem('pawpal_admin_staff_active_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-subtab');
                if (target) {
                    switchSubtab(target);
                }
            });
        });

        // ---------------------------------------------------------
        // 7. GẮN SỰ KIỆN CHO CÁC PHẦN TỬ TRÊN GIAO DIỆN
        // ---------------------------------------------------------

        // KPI Card click (Lọc 1 chạm)
        document.querySelectorAll('.kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentKpiFilter = card.getAttribute('data-kpi-filter') || 'ALL';
                renderStaffList();
            });
        });

        // Tìm kiếm và bộ lọc Subtab 1
        document.getElementById('staffSearchInput')?.addEventListener('input', renderStaffList);
        document.getElementById('staffFilterPosition')?.addEventListener('change', renderStaffList);
        document.getElementById('staffFilterStatus')?.addEventListener('change', renderStaffList);
        document.getElementById('staffFilterShift')?.addEventListener('change', renderStaffList);

        // Nút Toggle: Cần đào tạo lại
        const btnFilterRetrain = document.getElementById('btnFilterRetrainOnly');
        btnFilterRetrain?.addEventListener('click', () => {
            filterRetrainActive = !filterRetrainActive;
            btnFilterRetrain.classList.toggle('active', filterRetrainActive);
            renderStaffList();
        });

        // Nút Toggle: Đang khóa nhận việc
        const btnFilterLock = document.getElementById('btnFilterLockOnly');
        btnFilterLock?.addEventListener('click', () => {
            filterLockActive = !filterLockActive;
            btnFilterLock.classList.toggle('active', filterLockActive);
            renderStaffList();
        });

        // Nút Lọc nhanh trên thanh cảnh báo chủ động
        const btnFilterAlertQuick = document.getElementById('btnFilterStaffAlertQuick');
        btnFilterAlertQuick?.addEventListener('click', () => {
            alertFilterQuickActive = !alertFilterQuickActive;
            btnFilterAlertQuick.textContent = alertFilterQuickActive ? 'Hiện tất cả' : 'Lọc danh sách';
            btnFilterAlertQuick.classList.toggle('active', alertFilterQuickActive);
            renderStaffList();
        });

        // Modal Thêm/Sửa nhân sự
        const staffModal = document.getElementById('staffModalOverlay');
        document.getElementById('btnOpenAddStaffModal')?.addEventListener('click', () => {
            const titleEl = document.getElementById('staffModalTitle');
            if (titleEl) titleEl.innerText = 'Thêm nhân viên mới';
            staffModal?.classList.add('active');
        });
        document.getElementById('btnCancelStaff')?.addEventListener('click', () => staffModal?.classList.remove('active'));
        document.getElementById('btnDismissStaffModal')?.addEventListener('click', () => staffModal?.classList.remove('active'));
        document.getElementById('btnSaveStaff')?.addEventListener('click', () => {
            alert('Lưu thông tin nhân viên thành công!');
            staffModal?.classList.remove('active');
            updateKpiCounters();
            renderStaffAlertBar();
            renderStaffList();
        });

        // Thao tác từ dropdown 3 chấm
        document.getElementById('menuActionViewProfile')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            if (id) {
                selectedStaffId = id;
                sessionStorage.setItem('pawpal_admin_staff_selected_id', id);
                const dropdown = document.getElementById('staffActionDropdown');
                if (dropdown) dropdown.style.display = 'none';
                switchSubtab('tab-staff-profile');
            }
        });

        document.getElementById('menuActionToggleLock')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            const staff = mockStaff.find(s => s.id === id);
            if (staff) {
                staff.serviceLocked = !staff.serviceLocked;
                const dropdown = document.getElementById('staffActionDropdown');
                if (dropdown) dropdown.style.display = 'none';
                
                updateKpiCounters();
                renderStaffAlertBar();
                renderStaffList();
                
                const actionMsg = staff.serviceLocked 
                    ? `Đã tạm khóa nhận việc an toàn cho nhân viên ${staff.name}!` 
                    : `Đã mở khóa nhận việc cho nhân viên ${staff.name}!`;
                alert(actionMsg);
            }
        });

        // Nút Khóa / Mở nhận việc trực tiếp trong Subtab Hồ sơ
        document.getElementById('btnProfileToggleSafetyLock')?.addEventListener('click', () => {
            const staff = mockStaff.find(s => s.id === selectedStaffId);
            if (staff) {
                staff.serviceLocked = !staff.serviceLocked;
                renderStaffProfile(staff.id);
                updateKpiCounters();
                renderStaffAlertBar();
                
                const actionMsg = staff.serviceLocked 
                    ? `Đã tạm khóa nhận việc an toàn cho nhân viên ${staff.name}!` 
                    : `Đã mở khóa nhận việc cho nhân viên ${staff.name}!`;
                alert(actionMsg);
            }
        });

        // Các nút trong Subtab Hồ sơ riêng
        document.getElementById('btnProfileEditStaff')?.addEventListener('click', () => {
            const titleEl = document.getElementById('staffModalTitle');
            if (titleEl) titleEl.innerText = 'Chỉnh sửa nhân viên';
            staffModal?.classList.add('active');
        });

        document.getElementById('btnProfileAssignShift')?.addEventListener('click', () => {
            openShiftModal(currentScheduleDate, 'MORNING', selectedStaffId);
        });

        document.getElementById('btnProfileAddAssessment')?.addEventListener('click', () => {
            openAssessmentModal(selectedStaffId);
        });

        // Sự kiện Modal Phân ca (Subtab 3)
        const shiftModalEl = document.getElementById('shiftModalOverlay');
        document.getElementById('shiftInputDate')?.addEventListener('change', (e) => {
            modalActiveDate = e.target.value;
            openShiftModal(modalActiveDate, modalActiveShift);
        });

        document.getElementById('shiftInputShift')?.addEventListener('change', (e) => {
            modalActiveShift = e.target.value;
            openShiftModal(modalActiveDate, modalActiveShift);
        });

        document.getElementById('btnCancelShiftModal')?.addEventListener('click', () => shiftModalEl?.classList.remove('active'));
        document.getElementById('btnDismissShiftModal')?.addEventListener('click', () => shiftModalEl?.classList.remove('active'));

        document.getElementById('btnSaveShift')?.addEventListener('click', () => {
            if (!mockRoster[modalActiveDate]) mockRoster[modalActiveDate] = {};

            mockStaff.forEach(s => {
                if (!mockRoster[modalActiveDate][s.id]) {
                    mockRoster[modalActiveDate][s.id] = getStaffShiftsForDate(modalActiveDate, s.id);
                }
                const hasShift = modalCurrentAssignedIds.includes(s.id);
                if (hasShift) {
                    if (!mockRoster[modalActiveDate][s.id].includes(modalActiveShift)) {
                        mockRoster[modalActiveDate][s.id].push(modalActiveShift);
                    }
                } else {
                    mockRoster[modalActiveDate][s.id] = mockRoster[modalActiveDate][s.id].filter(sh => sh !== modalActiveShift);
                }
            });

            shiftModalEl?.classList.remove('active');
            renderScheduleTable();
            renderStaffAlertBar();
            alert(`Đã lưu lịch phân ca cho ngày ${modalActiveDate}!`);
        });

        document.getElementById('btnOpenAssignShiftModal')?.addEventListener('click', () => {
            openShiftModal(currentScheduleDate, 'MORNING');
        });

        document.querySelectorAll('.quota-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetShift = card.getAttribute('data-target-shift') || 'MORNING';
                openShiftModal(currentScheduleDate, targetShift);
            });
        });

        const btnViewDay = document.getElementById('btnScheduleViewDay');
        const btnViewWeek = document.getElementById('btnScheduleViewWeek');

        btnViewDay?.addEventListener('click', () => {
            currentScheduleViewMode = 'DAY';
            btnViewDay.classList.add('active');
            btnViewWeek.classList.remove('active');
            renderScheduleTable();
        });

        btnViewWeek?.addEventListener('click', () => {
            currentScheduleViewMode = 'WEEK';
            btnViewWeek.classList.add('active');
            btnViewDay.classList.remove('active');
            renderScheduleTable();
        });

        const scheduleDatePicker = document.getElementById('scheduleDatePicker');
        scheduleDatePicker?.addEventListener('change', (e) => {
            currentScheduleDate = e.target.value;
            renderScheduleTable();
        });

        document.getElementById('btnToday')?.addEventListener('click', () => {
            currentScheduleDate = '2026-09-28';
            if (scheduleDatePicker) scheduleDatePicker.value = currentScheduleDate;
            renderScheduleTable();
        });

        document.getElementById('btnPrevDay')?.addEventListener('click', () => {
            const d = new Date(currentScheduleDate);
            d.setDate(d.getDate() - (currentScheduleViewMode === 'WEEK' ? 7 : 1));
            currentScheduleDate = d.toISOString().split('T')[0];
            if (scheduleDatePicker) scheduleDatePicker.value = currentScheduleDate;
            renderScheduleTable();
        });

        document.getElementById('btnNextDay')?.addEventListener('click', () => {
            const d = new Date(currentScheduleDate);
            d.setDate(d.getDate() + (currentScheduleViewMode === 'WEEK' ? 7 : 1));
            currentScheduleDate = d.toISOString().split('T')[0];
            if (scheduleDatePicker) scheduleDatePicker.value = currentScheduleDate;
            renderScheduleTable();
        });

        document.getElementById('scheduleFilterPosition')?.addEventListener('change', (e) => {
            scheduleFilterPos = e.target.value;
            renderScheduleTable();
        });

        document.getElementById('scheduleFilterShift')?.addEventListener('change', (e) => {
            scheduleFilterShf = e.target.value;
            renderScheduleTable();
        });

        // Sự kiện Đánh giá nghiệp vụ (Subtab 4 - Giai đoạn 4)
        const assessModalEl = document.getElementById('assessmentModalOverlay');
        document.getElementById('btnOpenAddAssessmentModal')?.addEventListener('click', () => {
            openAssessmentModal();
        });
        document.getElementById('btnCancelAssessmentModal')?.addEventListener('click', () => assessModalEl?.classList.remove('active'));
        document.getElementById('btnDismissAssessmentModal')?.addEventListener('click', () => assessModalEl?.classList.remove('active'));
        document.getElementById('btnSaveAssessment')?.addEventListener('click', handleSaveAssessment);
        document.getElementById('btnSendAssessNotify')?.addEventListener('click', handleSaveAssessment);

        // Real-time listener: Tự động phân loại kết quả (Đạt / Cần đào tạo / Không đạt) khi nhập điểm
        const assessScoreInput = document.getElementById('assessInputScore');
        const assessResultSelect = document.getElementById('assessInputResult');
        assessScoreInput?.addEventListener('input', () => {
            const scoreVal = parseInt(assessScoreInput.value, 10);
            if (!isNaN(scoreVal) && assessResultSelect) {
                if (scoreVal >= 80) {
                    assessResultSelect.value = 'PASS';
                } else if (scoreVal >= 60) {
                    assessResultSelect.value = 'RETRAIN';
                } else {
                    assessResultSelect.value = 'FAIL';
                }
            }
        });

        // Bộ lọc bảng đánh giá nghiệp vụ
        document.getElementById('assessmentSearchInput')?.addEventListener('input', () => {
            renderAssessmentList();
        });
        document.getElementById('assessmentFilterType')?.addEventListener('change', () => {
            renderAssessmentList();
        });
        document.getElementById('assessmentFilterResult')?.addEventListener('change', () => {
            renderAssessmentList();
        });

        // =========================================================
        // SỰ KIỆN GIAI ĐOẠN 3: ĐƠN NGHỈ PHÉP VÀ ĐỔI CA
        // =========================================================
        const leaveModalEl = document.getElementById('leaveSwapModalOverlay');
        const leaveTrayModalEl = document.getElementById('leaveRequestsTrayModal');

        document.getElementById('btnOpenLeaveSwapModal')?.addEventListener('click', () => {
            openLeaveSwapModal();
        });

        document.getElementById('btnOpenLeaveModalFromTray')?.addEventListener('click', () => {
            leaveTrayModalEl?.classList.remove('active');
            openLeaveSwapModal();
        });

        document.getElementById('btnOpenLeaveRequestsTray')?.addEventListener('click', () => {
            openLeaveRequestsTray();
        });

        document.getElementById('btnCancelLeaveSwapModal')?.addEventListener('click', () => {
            leaveModalEl?.classList.remove('active');
        });

        document.getElementById('btnDismissLeaveSwapModal')?.addEventListener('click', () => {
            leaveModalEl?.classList.remove('active');
        });

        document.getElementById('btnTabModeLeave')?.addEventListener('click', () => {
            switchLeaveSwapMode('LEAVE');
        });

        document.getElementById('btnTabModeSwap')?.addEventListener('click', () => {
            switchLeaveSwapMode('SWAP');
        });

        document.getElementById('btnSubmitLeavePending')?.addEventListener('click', () => {
            handleCreateLeaveSwapRequest(false);
        });

        document.getElementById('btnApproveLeaveImmediately')?.addEventListener('click', () => {
            handleCreateLeaveSwapRequest(true);
        });

        document.getElementById('btnCancelLeaveRequestsTray')?.addEventListener('click', () => {
            leaveTrayModalEl?.classList.remove('active');
        });

        document.getElementById('btnDismissLeaveRequestsTray')?.addEventListener('click', () => {
            leaveTrayModalEl?.classList.remove('active');
        });

        // Bộ lọc trạng thái đơn trong tray modal
        const reqFilterBtns = [
            { id: 'btnFilterReqAll', filter: 'ALL' },
            { id: 'btnFilterReqPending', filter: 'PENDING' },
            { id: 'btnFilterReqApproved', filter: 'APPROVED' },
            { id: 'btnFilterReqRejected', filter: 'REJECTED' }
        ];

        reqFilterBtns.forEach(item => {
            const btn = document.getElementById(item.id);
            btn?.addEventListener('click', () => {
                currentReqFilter = item.filter;
                reqFilterBtns.forEach(b => document.getElementById(b.id)?.classList.remove('active'));
                btn.classList.add('active');
                renderLeaveRequestsList();
            });
        });

        // =========================================================
        // 9. CROSS-MODULE API (PAWPAL STAFF MANAGER)
        // =========================================================
        window.PawpalStaffManager = {
            getAllStaff: () => [...mockStaff],
            getStaffById: (id) => mockStaff.find(s => s.id === id) || null,
            getStaffByName: (name) => mockStaff.find(s => s.name.toLowerCase() === name.toLowerCase()) || null,
            isStaffLocked: (id) => {
                const staff = mockStaff.find(s => s.id === id);
                return staff ? Boolean(staff.serviceLocked) : false;
            },
            getStaffStatus: (id) => {
                const staff = mockStaff.find(s => s.id === id);
                return staff ? staff.status : null;
            },
            getAvailableStaffForService: (serviceType, shift) => {
                return mockStaff.filter(s => {
                    if (s.status !== 'ACTIVE') return false;
                    if (s.serviceLocked) return false;
                    if (shift && s.shift !== shift) return false;
                    return true;
                });
            },
            getStaffSchedule: (id, dateStr) => {
                return getStaffShiftsForDate(dateStr || currentScheduleDate, id);
            }
        };

        // ---------------------------------------------------------
        // 8. KHỞI TẠO VÀ PHỤC HỒI SUBTAB
        // ---------------------------------------------------------
        updateKpiCounters();
        updateAssessmentKpiCounters();
        updatePendingRequestsCounters();
        renderStaffAlertBar();

        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
        const initialSubtab = (currentHash && document.getElementById('subtab-' + currentHash)) 
            ? currentHash 
            : (savedSubtab && document.getElementById('subtab-' + savedSubtab))
                ? savedSubtab 
                : 'tab-staff-list';

        // Expose Staff Manager for cross-module integration
        window.PawpalStaffManager = {
            getAllStaff: () => mockStaff,
            getStaffByName: (name) => {
                if (!name) return null;
                const clean = name.split('(')[0].trim().toLowerCase();
                return mockStaff.find(s => s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase()));
            },
            toggleSafetyLock: (name, isLocked) => {
                const s = window.PawpalStaffManager.getStaffByName(name);
                if (s) {
                    s.serviceLocked = (isLocked !== undefined) ? isLocked : !s.serviceLocked;
                    try {
                        localStorage.setItem('pawpal_staff_locked_' + s.id, s.serviceLocked ? '1' : '0');
                        localStorage.setItem('pawpal_staff_locked_name_' + s.name.toLowerCase(), s.serviceLocked ? '1' : '0');
                    } catch (e) {}
                    return s;
                }
                return null;
            }
        };

        // Đồng bộ trạng thái khóa từ localStorage nếu có
        mockStaff.forEach(s => {
            try {
                const stored = localStorage.getItem('pawpal_staff_locked_' + s.id) || localStorage.getItem('pawpal_staff_locked_name_' + s.name.toLowerCase());
                if (stored !== null) s.serviceLocked = stored === '1';
            } catch(e) {}
        });

        switchSubtab(initialSubtab);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
