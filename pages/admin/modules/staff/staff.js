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

        // 1. Render 4 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-staff-list">Nhân sự</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-schedule">Lịch làm việc</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-assessment">Đánh giá nghiệp vụ</button>
            `;
        }

        // ---------------------------------------------------------
        // 1. DATA MOCK (Do chưa có backend/DB thật)
        // ---------------------------------------------------------
        const mockStaff = [
            { id: 'EMP-001', name: 'Lê Lệ Quyên', position: 'Admin', role: 'Admin', phone: '0901234567', email: 'quyen.le@pawpal.vn', shift: 'MORNING', status: 'ACTIVE', join_date: '2024-01-10', dob: '1996-08-15', address: '68 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh' },
            { id: 'EMP-002', name: 'Nguyễn Văn A', position: 'Groomer', role: 'Groomer', phone: '0912345678', email: 'a.nguyen@pawpal.vn', shift: 'AFTERNOON', status: 'ACTIVE', join_date: '2025-02-15', dob: '1998-04-12', address: '124 Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh' },
            { id: 'EMP-003', name: 'Trần Thị B', position: 'Lễ tân', role: 'Receptionist', phone: '0987654321', email: 'b.tran@pawpal.vn', shift: 'MORNING', status: 'LEAVE', join_date: '2025-05-20', dob: '2000-11-20', address: '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh' },
            { id: 'EMP-004', name: 'Lê Văn C', position: 'Bác sĩ/Bảo mẫu', role: 'Veterinarian', phone: '0909090909', email: 'c.le@pawpal.vn', shift: 'EVENING', status: 'ACTIVE', join_date: '2024-11-01', dob: '1994-07-08', address: '88 Hoàng Hoa Thám, Bình Thạnh, TP. Hồ Chí Minh' },
            { id: 'EMP-005', name: 'Phạm Thị D', position: 'CSKH', role: 'CSKH', phone: '0911223344', email: 'd.pham@pawpal.vn', shift: 'AFTERNOON', status: 'PAUSE', join_date: '2026-01-15', dob: '1999-03-25', address: '15/2 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh' },
            { id: 'EMP-006', name: 'Hoàng Văn E', position: 'Tài xế Taxi Pet', role: 'Driver', phone: '0933445566', email: 'e.hoang@pawpal.vn', shift: 'ALL', status: 'RESIGNED', join_date: '2023-06-10', dob: '1992-12-05', address: '204 Nguyễn Thị Minh Khai, Quận 3, TP. Hồ Chí Minh' }
        ];

        const mockAssessments = [
            { date: '2026-09-20', staff_id: 'EMP-002', name: 'Nguyễn Văn A', type: 'Grooming', score: 85, result: 'PASS', evaluator: 'Lê Lệ Quyên' },
            { date: '2026-09-22', staff_id: 'EMP-003', name: 'Trần Thị B', type: 'CSKH', score: 55, result: 'RETRAIN', evaluator: 'Lê Lệ Quyên' },
            { date: '2026-09-25', staff_id: 'EMP-006', name: 'Hoàng Văn E', type: 'Taxi Pet', score: 40, result: 'FAIL', evaluator: 'Lê Lệ Quyên' }
        ];

        let selectedStaffId = sessionStorage.getItem('pawpal_admin_staff_selected_id') || 'EMP-001';

        // ---------------------------------------------------------
        // 2. CHUYỂN ĐỔI SUB-TAB & DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

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
                let shiftText = staff.shift === 'MORNING' ? 'Ca sáng (08:00 - 12:00)' : staff.shift === 'AFTERNOON' ? 'Ca chiều (13:00 - 17:00)' : staff.shift === 'EVENING' ? 'Ca tối (17:30 - 21:30)' : 'Không phân ca';
                elShift.textContent = shiftText;
            }
            if (elWorkStatus) {
                elWorkStatus.textContent = staff.status === 'ACTIVE' ? 'Đang làm việc' : (staff.status === 'LEAVE' ? 'Nghỉ phép' : (staff.status === 'PAUSE' ? 'Tạm nghỉ' : 'Nghỉ việc'));
                elWorkStatus.className = 'info-value ' + (staff.status === 'ACTIVE' ? 'text-success' : 'text-danger');
            }

            // Cập nhật Breadcrumb nếu đang ở tab profile
            const activeTabBtn = subtabsContainer ? subtabsContainer.querySelector('.header-subtab-btn.active') : null;
            if (activeTabBtn && activeTabBtn.getAttribute('data-subtab') === 'tab-staff-profile') {
                updateBreadcrumb(staff.name);
            }
        }

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

            // Re-render data tương ứng
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

            // Lưu state
            sessionStorage.setItem('pawpal_admin_staff_active_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            if (window.lucide) lucide.createIcons();
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

        // Phục hồi subtab từ URL hash hoặc session
        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
        const initialSubtab = (currentHash && document.getElementById('subtab-' + currentHash)) 
            ? currentHash 
            : (savedSubtab && document.getElementById('subtab-' + savedSubtab))
                ? savedSubtab 
                : 'tab-staff-list';

        switchSubtab(initialSubtab);

    // ---------------------------------------------------------
    // 3. RENDER SUB-TAB 1: DANH SÁCH NHÂN VIÊN
    // ---------------------------------------------------------
    function renderStaffList() {
        const tbody = document.getElementById('staffListTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        mockStaff.forEach(staff => {
            let statusBadge = '';
            if(staff.status === 'ACTIVE') statusBadge = '<span class="admin-badge badge-active">Đang làm việc</span>';
            else if(staff.status === 'LEAVE') statusBadge = '<span class="admin-badge badge-leave">Nghỉ phép</span>';
            else if(staff.status === 'PAUSE') statusBadge = '<span class="admin-badge badge-pause">Tạm nghỉ</span>';
            else statusBadge = '<span class="admin-badge badge-resigned">Nghỉ việc</span>';

            let shiftText = staff.shift === 'MORNING' ? 'Ca sáng' : staff.shift === 'AFTERNOON' ? 'Ca chiều' : staff.shift === 'EVENING' ? 'Ca tối' : 'Không có ca';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${staff.id}</td>
                <td><a href="javascript:void(0)" class="user-link-text btn-view-profile" data-id="${staff.id}">${staff.name}</a></td>
                <td>${staff.position}</td>
                <td>${staff.role}</td>
                <td>${staff.phone}</td>
                <td>${shiftText}</td>
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

    // Menu thao tác 3 chấm
    function attachActionDropdowns() {
        const triggers = document.querySelectorAll('.btn-staff-action');
        const dropdown = document.getElementById('staffActionDropdown');
        if(!dropdown) return;

        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                // Ẩn tất cả dropdown khác nếu có
                document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');
                
                const rect = trigger.getBoundingClientRect();
                dropdown.style.display = 'flex';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = (rect.right - 170) + 'px'; // width 170
                dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
            });
        });

        document.addEventListener('click', (e) => {
            if(!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-staff-action')) {
                dropdown.style.display = 'none';
            }
        });
    }

    // Modal Thêm/Sửa
    const staffModal = document.getElementById('staffModalOverlay');
    document.getElementById('btnOpenAddStaffModal')?.addEventListener('click', () => {
        document.getElementById('staffModalTitle').innerText = 'Thêm nhân viên mới';
        // Reset form
        staffModal.classList.add('active');
    });
    document.getElementById('btnCancelStaff')?.addEventListener('click', () => staffModal.classList.remove('active'));
    document.getElementById('btnDismissStaffModal')?.addEventListener('click', () => staffModal.classList.remove('active'));
    document.getElementById('btnSaveStaff')?.addEventListener('click', () => {
        alert('Lưu nhân viên thành công!');
        staffModal.classList.remove('active');
    });

    // Drawer Hồ sơ & Chuyển sang Subtab Hồ sơ riêng
    const drawer = document.getElementById('staffProfileDrawerOverlay');
    function attachProfileDrawerEvents() {
        document.querySelectorAll('.btn-view-profile').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = link.getAttribute('data-id');
                const staff = mockStaff.find(s => s.id === id);
                if(staff) {
                    selectedStaffId = staff.id;
                    sessionStorage.setItem('pawpal_admin_staff_selected_id', staff.id);
                    switchSubtab('tab-staff-profile');
                }
            });
        });
    }
    
    function closeStaffDrawer() {
        if (drawer) drawer.style.display = 'none';
        updateBreadcrumb(null);
    }

    document.getElementById('btnCloseStaffDrawer')?.addEventListener('click', closeStaffDrawer);
    drawer?.addEventListener('click', (e) => {
        if(e.target === drawer) closeStaffDrawer();
    });

    // Thao tác từ dropdown 3 chấm: Xem hồ sơ
    document.getElementById('menuActionViewProfile')?.addEventListener('click', () => {
        const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
        if (id) {
            selectedStaffId = id;
            sessionStorage.setItem('pawpal_admin_staff_selected_id', id);
            document.getElementById('staffActionDropdown').style.display = 'none';
            switchSubtab('tab-staff-profile');
        }
    });

    // Các nút thao tác trong Subtab Hồ sơ riêng
    document.getElementById('btnProfileEditStaff')?.addEventListener('click', () => {
        document.getElementById('staffModalTitle').innerText = 'Chỉnh sửa nhân viên';
        staffModal.classList.add('active');
    });

    document.getElementById('btnProfileAssignShift')?.addEventListener('click', () => {
        shiftModal.classList.add('active');
    });

    document.getElementById('btnProfileAddAssessment')?.addEventListener('click', () => {
        assessModal.classList.add('active');
    });

    // ---------------------------------------------------------
    // 4. RENDER SUB-TAB 2: LỊCH LÀM VIỆC
    // ---------------------------------------------------------
    function renderScheduleTable() {
        const tbody = document.getElementById('scheduleTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        mockStaff.forEach(staff => {
            // Giả lập ca
            let m = staff.shift === 'MORNING' ? 'assigned' : (staff.status === 'LEAVE' ? 'leave' : '');
            let a = staff.shift === 'AFTERNOON' ? 'assigned' : '';
            let e = staff.shift === 'EVENING' ? 'assigned' : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-main);">${staff.name}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${staff.position}</div>
                </td>
                <td><div class="shift-cell ${m}" data-shift="MORNING" data-id="${staff.id}"></div></td>
                <td><div class="shift-cell ${a}" data-shift="AFTERNOON" data-id="${staff.id}"></div></td>
                <td><div class="shift-cell ${e}" data-shift="EVENING" data-id="${staff.id}"></div></td>
            `;
            tbody.appendChild(tr);
        });

        attachShiftCellEvents();
    }

    const shiftModal = document.getElementById('shiftModalOverlay');
    function attachShiftCellEvents() {
        document.querySelectorAll('.shift-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                shiftModal.classList.add('active');
            });
        });
    }
    document.getElementById('btnCancelShiftModal')?.addEventListener('click', () => shiftModal.classList.remove('active'));
    document.getElementById('btnDismissShiftModal')?.addEventListener('click', () => shiftModal.classList.remove('active'));
    document.getElementById('btnSaveShift')?.addEventListener('click', () => {
        alert('Lưu lịch làm việc thành công!');
        shiftModal.classList.remove('active');
    });

    // ---------------------------------------------------------
    // 5. RENDER SUB-TAB 3: ĐÁNH GIÁ NGHIỆP VỤ
    // ---------------------------------------------------------
    function renderAssessmentList() {
        const tbody = document.getElementById('assessmentListTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        mockAssessments.forEach(ass => {
            let resBadge = '';
            if(ass.result === 'PASS') resBadge = '<span class="admin-badge badge-active">Đạt</span>';
            else if(ass.result === 'RETRAIN') resBadge = '<span class="admin-badge badge-leave">Cần đào tạo</span>';
            else resBadge = '<span class="admin-badge badge-resigned">Không đạt</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ass.date}</td>
                <td>${ass.staff_id}</td>
                <td>${ass.name}</td>
                <td>${ass.type}</td>
                <td><strong>${ass.score}</strong></td>
                <td>${resBadge}</td>
                <td>${ass.evaluator}</td>
                <td style="text-align: center;">
                    <button class="btn-action-trigger btn-edit-assess" data-id="${ass.staff_id}">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    const assessModal = document.getElementById('assessmentModalOverlay');
    document.getElementById('btnOpenAddAssessmentModal')?.addEventListener('click', () => {
        assessModal.classList.add('active');
    });
    document.getElementById('btnCancelAssessmentModal')?.addEventListener('click', () => assessModal.classList.remove('active'));
    document.getElementById('btnSaveAssessment')?.addEventListener('click', () => {
        alert('Đã lưu kết quả đánh giá!');
        assessModal.classList.remove('active');
    });

    // ---------------------------------------------------------
    // Khởi tạo render lần đầu (Phòng trường hợp tab đã active sẵn)
    // ---------------------------------------------------------
    renderStaffList();
    renderScheduleTable();
    renderAssessmentList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
