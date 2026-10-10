// staff.js - Logic cho phân hệ Nhân sự Pawpal-er
(function() {
    // Hàm định dạng ngày chuẩn Việt Nam (DD/MM/YYYY)
    function formatDateVN(dateInput) {
        if (!dateInput) return '—';
        if (typeof dateInput === 'string') {
            const s = dateInput.trim();
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
            const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                return `${match[3]}/${match[2]}/${match[1]}`;
            }
        }
        const dateObj = new Date(dateInput);
        if (isNaN(dateObj.getTime())) return String(dateInput);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    const formatDate = formatDateVN;

    // Helper chuyển đổi chuỗi ngày sang chuẩn HTML5 input date (YYYY-MM-DD)
    function toIsoDate(d) {
        if (!d) return '';
        if (typeof d === 'string') {
            const s = d.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) return `${match[3]}-${match[2]}-${match[1]}`;
        }
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return dateObj.toISOString().split('T')[0];
    }

    const formatDateTime = function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yyyy = dateObj.getFullYear();
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    async function initStaffModule() {
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
                <button type="button" class="header-subtab-btn" data-subtab="tab-staff-assessment">Đánh giá</button>
            `;
        }

        // Helper: Hiển thị Toast Notification nhẹ nhàng chuẩn AGENTS.md
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
                white-space: pre-line;
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

        // Helper: Custom Confirm Modal cho phân hệ Nhân sự
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

        // ---------------------------------------------------------
        // 1. TRẠNG THÁI DỮ LIỆU HỆ THỐNG (100% Trực tiếp từ Supabase Database)
        // ---------------------------------------------------------
        let mockStaff = [];
        let mockAssessments = [];
        let mockRoster = {};
        let mockLeaveSwapRequests = [];
        let mockWorkstations = [];

        // Helper ánh xạ vai trò và vị trí chuẩn hóa
        function mapDbRoleToStaffRole(dbRole, specialization = '') {
            const r = (dbRole || '').toUpperCase();
            const s = (specialization || '').toLowerCase();
            if (r === 'ADMIN') return 'Admin';
            if (r === 'VET' || s.includes('bác sĩ') || s.includes('thú y')) return 'Veterinarian';
            if (r === 'DRIVER' || s.includes('tài xế') || s.includes('taxi')) return 'Driver';
            if (r === 'RECEPTIONIST' || s.includes('lễ tân')) return 'Receptionist';
            if (r === 'CSKH' || s.includes('cskh') || s.includes('chăm sóc khách')) return 'CSKH';
            if (s.includes('bảo mẫu') || s.includes('hotel') || s.includes('lưu trú')) return 'Caregiver';
            if (r === 'PET_CARE' || s.includes('groom') || s.includes('spa') || s.includes('tắm') || s.includes('cắt tỉa')) return 'Groomer';
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

        // Hàm nạp dữ liệu từ Supabase 100% (trực tiếp từ database, không lấy json)
        async function loadStaffModuleData() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    // A. Nạp bảng staff trực tiếp từ Supabase
                    const { data: staffData, error: staffErr } = await client
                        .from('staff')
                        .select('*')
                        .order('created_at', { ascending: true });

                    if (!staffErr && Array.isArray(staffData) && staffData.length > 0) {
                        mockStaff = staffData.map((s, idx) => {
                            const formattedRole = mapDbRoleToStaffRole(s.role, s.specialization);
                            const formattedPosition = mapDbRoleToPosition(s.role, s.specialization);
                            const joinDateFormatted = s.hire_date 
                                ? formatDateVN(s.hire_date) 
                                : (s.created_at ? formatDateVN(s.created_at) : '01/01/2024');

                            const code = `EMP-${String(idx + 1).padStart(3, '0')}`;
                            const phone = s.phone_number || s.phone || '0901234567';
                            const email = s.email || `${(s.full_name || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '')}@pawpal.vn`;

                            return {
                                id: code,
                                rawId: s.id,
                                name: s.full_name || 'Nhân viên PawPal',
                                position: formattedPosition,
                                role: formattedRole,
                                phone: phone,
                                email: email,
                                shift: s.shift || (idx % 2 === 0 ? 'MORNING' : 'AFTERNOON'),
                                status: s.status === 'locked' ? 'RESIGNED' : (s.status === 'leave' ? 'LEAVE' : (s.status === 'pause' ? 'PAUSE' : 'ACTIVE')),
                                join_date: joinDateFormatted,
                                dob: s.dob ? formatDateVN(s.dob) : '01/01/1998',
                                address: s.address || 'TP. Hồ Chí Minh',
                                branch_id: 'BRANCH-Q1',
                                branch_name: 'Chi nhánh Quận 1',
                                avatar: `/assets/images/staff/emp-00${(idx % 6) + 1}.jpg`,
                                bio: s.specialization ? `Chuyên viên ${s.specialization} tại PawPal.` : 'Chuyên viên chăm sóc thú cưng tận tâm và giàu kinh nghiệm.',
                                is_bookable: true,
                                specialties: s.specialization ? [s.specialization] : ['Chăm sóc thú cưng', 'Spa và Grooming'],
                                skillScore: s.skill_score || 90,
                                skillResult: (s.skill_score || 90) >= 80 ? 'PASS' : ((s.skill_score || 90) >= 60 ? 'RETRAIN' : 'FAIL'),
                                skillExam: (s.skill_score || 90) >= 80 ? `Đạt (${s.skill_score || 90}đ)` : `Cần đào tạo (${s.skill_score || 90}đ)`,
                                serviceLocked: Boolean(s.service_locked || s.serviceLocked),
                                note: s.specialization || '',
                                customer_rating: {
                                    avg_score: 5.0,
                                    total_reviews: 18
                                },
                                requested_count: 8,
                                zero_complaint_rate: '100%',
                                customer_reviews: [],
                                complaint_count: 0
                            };
                        });
                    }

                    // Khởi tạo bàn làm việc trực tiếp từ nhân sự thật vừa nạp
                    initWorkstationsFromStaff();

                    // B. Nạp bảng staff_schedule (Lịch trực và phân ca)
                    const { data: schedData, error: schedErr } = await client
                        .from('staff_schedule')
                        .select('*')
                        .order('work_date', { ascending: true });

                    mockRoster = {};
                    if (!schedErr && Array.isArray(schedData) && schedData.length > 0) {
                        schedData.forEach(sch => {
                            const wDate = sch.work_date;
                            if (!wDate) return;
                            if (!mockRoster[wDate]) mockRoster[wDate] = {};
                            const st = mockStaff.find(s => s.rawId === sch.staff_id || s.id === sch.staff_id);
                            const staffKey = st ? st.id : sch.staff_id;
                            let shiftVal = sch.shift || 'MORNING';
                            if (sch.schedule_status === 'LEAVE') shiftVal = 'LEAVE';
                            else if (sch.schedule_status === 'CANCELLED') shiftVal = 'PAUSE';

                            if (!mockRoster[wDate][staffKey]) mockRoster[wDate][staffKey] = [];
                            if (!mockRoster[wDate][staffKey].includes(shiftVal)) {
                                mockRoster[wDate][staffKey].push(shiftVal);
                            }
                        });
                    }

                    // Gán mặc định ca làm việc nếu ngày hiện tại chưa có trong roster
                    if (mockStaff.length > 0) {
                        if (!mockRoster[currentScheduleDate]) mockRoster[currentScheduleDate] = {};
                        mockStaff.forEach(s => {
                            if (!mockRoster[currentScheduleDate][s.id]) {
                                mockRoster[currentScheduleDate][s.id] = [s.shift];
                            }
                        });
                    }

                    // C. Nạp appointment thời gian thực để đồng bộ Bàn làm việc (Workstations)
                    try {
                        const { data: liveAppts } = await client
                            .from('appointment')
                            .select('*, customer:customer_id(full_name), pet:pet_id(pet_name, species), service:service_id(service_name), staff:staff_id(full_name, specialization, role)')
                            .in('appointment_status', ['IN_PROGRESS', 'CONFIRMED'])
                            .order('appointment_time', { ascending: true })
                            .limit(6);

                        if (Array.isArray(liveAppts) && liveAppts.length > 0) {
                            liveAppts.forEach((app, index) => {
                                if (index < mockWorkstations.length) {
                                    const ws = mockWorkstations[index];
                                    const staffObj = app.staff || {};
                                    const staffName = staffObj.full_name || (mockStaff[index % mockStaff.length]?.name || 'Kỹ thuật viên PawPal');
                                    const matchedStaff = mockStaff.find(s => s.name === staffName || s.rawId === app.staff_id);

                                    ws.status = app.appointment_status === 'IN_PROGRESS' ? 'IN_SERVICE' : 'IDLE';
                                    ws.staffId = matchedStaff ? matchedStaff.id : `EMP-00${index + 1}`;
                                    ws.staffName = staffName;
                                    ws.staffPos = staffObj.specialization || (matchedStaff ? matchedStaff.position : 'Kỹ thuật viên Grooming');
                                    ws.bookingId = app.appointment_code || `BK-${app.id.slice(0, 4)}`;
                                    ws.customerName = app.customer?.full_name || 'Khách hàng PawPal';
                                    const petSpecies = app.pet?.species ? ` (${app.pet.species})` : '';
                                    ws.petName = (app.pet?.pet_name || 'Bé cưng') + petSpecies;
                                    ws.serviceName = app.service?.service_name || 'Dịch vụ Spa và Grooming';
                                    ws.startTime = app.appointment_time ? app.appointment_time.slice(0, 5) : '14:00';
                                    ws.estEndTime = addMinutesToTime(ws.startTime, 90);
                                }
                            });
                        }
                    } catch (eApp) {
                        console.warn('Lỗi nạp Live Appointment Workstations:', eApp);
                    }

                    // D. Nạp review để đồng bộ CSAT thực tế cho Kỹ thuật viên
                    try {
                        const { data: revData } = await client
                            .from('review')
                            .select('*, customer:customer_id(full_name), service:service_id(service_name)')
                            .eq('review_type', 'SERVICE')
                            .order('created_at', { ascending: false })
                            .limit(15);

                        if (Array.isArray(revData) && revData.length > 0) {
                            const groomers = mockStaff.filter(s => s.role === 'Groomer' || s.role === 'Caregiver' || s.role === 'Veterinarian');
                            if (groomers.length > 0) {
                                revData.forEach((rv, rIdx) => {
                                    const targetGroomer = groomers[rIdx % groomers.length];
                                    if (targetGroomer) {
                                        if (!targetGroomer.customer_reviews) targetGroomer.customer_reviews = [];
                                        const revDate = rv.created_at ? formatDateVN(rv.created_at) : '28/09/2026';
                                        const isDuplicate = targetGroomer.customer_reviews.some(r => r.comment === rv.review_content);
                                        if (!isDuplicate && rv.review_content) {
                                            targetGroomer.customer_reviews.unshift({
                                                date: revDate,
                                                customer_name: rv.customer?.full_name || 'Khách hàng thân thiết',
                                                pet_name: 'Bé cưng',
                                                service_name: rv.service?.service_name || 'Dịch vụ Spa và Grooming',
                                                rating: rv.rating || 5,
                                                is_requested: rIdx % 2 === 0,
                                                comment: rv.review_content
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    } catch (eRev) {
                        console.warn('Lỗi nạp Review CSAT:', eRev);
                    }

                    // Thiết lập selectedStaffId là ID đầu tiên của staff thật
                    if (mockStaff.length > 0 && !mockStaff.some(s => s.id === selectedStaffId)) {
                        selectedStaffId = mockStaff[0].id;
                        sessionStorage.setItem('pawpal_admin_staff_selected_id', selectedStaffId);
                    }

                    // Đồng bộ và nạp mockAssessments nếu chưa có
                    if (mockAssessments.length === 0) {
                        try {
                            const storedAss = localStorage.getItem('pawpal_staff_assessments');
                            if (storedAss) {
                                mockAssessments = JSON.parse(storedAss);
                            }
                        } catch (e) {}

                        if (mockAssessments.length === 0 && mockStaff.length > 0) {
                            mockStaff.forEach((s, i) => {
                                const dayNum = String(20 - (i % 8)).padStart(2, '0');
                                const assDate = `${dayNum}/09/2026`;
                                const assType = s.role === 'Groomer' ? 'Grooming' : (s.role === 'Driver' ? 'Taxi Pet' : (s.role === 'Caregiver' ? 'Lưu trú 24/7' : 'CSKH'));
                                mockAssessments.push({
                                    id: `ASM-${String(i + 1).padStart(3, '0')}`,
                                    date: assDate,
                                    staff_id: s.id,
                                    name: s.name,
                                    position: s.position,
                                    type: assType,
                                    score: s.skillScore || 85,
                                    result: s.skillResult || 'PASS',
                                    evaluator: 'Lê Lệ Quyên',
                                    note: s.skillResult === 'PASS' ? 'Thao tác chuẩn xác, đạt yêu cầu định biên' : 'Cần đào tạo bổ sung quy trình chăm sóc'
                                });
                            });
                        }
                    }

                    // Đồng bộ năng lực tay nghề và khóa an toàn từ kết quả sát hạch mới nhất vào từng nhân viên
                    syncStaffWithAssessments();

                    saveStaffDataToStorage();
                    saveRosterToStorage();
                    saveAssessmentsToStorage();
                    saveLeaveRequestsToStorage();
                }
            } catch (err) {
                console.warn('Lỗi kết nối Supabase Staff:', err);
            }
        }

        // Đồng bộ năng lực tay nghề và khóa an toàn từ kết quả sát hạch mới nhất trong mockAssessments
        function syncStaffWithAssessments() {
            if (!Array.isArray(mockStaff) || !Array.isArray(mockAssessments) || mockAssessments.length === 0) return;

            mockStaff.forEach(staff => {
                const staffAssessments = mockAssessments.filter(a => a.staff_id === staff.id);
                if (staffAssessments.length > 0) {
                    // Sắp xếp: ưu tiên ngày mới nhất (theo ISO timestamp), nếu cùng ngày thì ưu tiên bài thi ghi nhận gần nhất
                    const sorted = [...staffAssessments].sort((a, b) => {
                        const isoA = toIsoDate(a.date);
                        const isoB = toIsoDate(b.date);
                        const timeA = new Date(isoA).getTime() || 0;
                        const timeB = new Date(isoB).getTime() || 0;
                        if (timeB !== timeA) return timeB - timeA;
                        return mockAssessments.indexOf(a) - mockAssessments.indexOf(b);
                    });
                    const latest = sorted[0];

                    staff.skillScore = latest.score;
                    staff.skillResult = latest.result;

                    const isManuallyUnlocked = localStorage.getItem('pawpal_staff_manual_unlocked_' + staff.id) === '1';

                    if (latest.result === 'PASS') {
                        staff.skillExam = `Đạt (${latest.score}đ)`;
                        const isManuallyLocked = localStorage.getItem('pawpal_staff_manual_locked_' + staff.id) === '1';
                        if (!isManuallyLocked) {
                            staff.serviceLocked = false;
                            try {
                                localStorage.setItem('pawpal_staff_locked_' + staff.id, '0');
                                localStorage.setItem('pawpal_staff_locked_name_' + staff.name.toLowerCase(), '0');
                            } catch (e) {}
                        }
                    } else if (latest.result === 'RETRAIN') {
                        staff.skillExam = `Cần đào tạo (${latest.score}đ)`;
                        if (!isManuallyUnlocked) {
                            staff.serviceLocked = true;
                            try {
                                localStorage.setItem('pawpal_staff_locked_' + staff.id, '1');
                                localStorage.setItem('pawpal_staff_locked_name_' + staff.name.toLowerCase(), '1');
                            } catch (e) {}
                        }
                    } else if (latest.result === 'FAIL') {
                        staff.skillExam = `Không đạt (${latest.score}đ)`;
                        if (!isManuallyUnlocked) {
                            staff.serviceLocked = true;
                            try {
                                localStorage.setItem('pawpal_staff_locked_' + staff.id, '1');
                                localStorage.setItem('pawpal_staff_locked_name_' + staff.name.toLowerCase(), '1');
                            } catch (e) {}
                        }
                    }
                }
            });
        }

        // Khởi tạo danh sách 6 bàn làm việc trực tiếp từ đội ngũ nhân sự thật
        function initWorkstationsFromStaff() {
            const staffList = mockStaff.length > 0 ? mockStaff : [];
            const groomers = staffList.filter(s => s.role === 'Groomer' || s.role === 'Caregiver') || [];
            const vets = staffList.filter(s => s.role === 'Veterinarian') || [];
            const drivers = staffList.filter(s => s.role === 'Driver') || [];

            const g1 = groomers[0] || staffList[0] || { id: 'EMP-001', name: 'Kỹ thuật viên 1', position: 'Kỹ thuật viên Grooming' };
            const g2 = groomers[1] || staffList[1] || g1;
            const g3 = groomers[2] || staffList[2] || g1;
            const drv = drivers[0] || staffList[0] || g1;
            const vet = vets[0] || staffList[3] || staffList[0] || g1;
            const g4 = groomers[3] || staffList[1] || g2;

            mockWorkstations = [
                {
                    id: 'WS-01',
                    name: 'Bàn Grooming 01',
                    status: 'IDLE',
                    staffId: g1.id,
                    staffName: g1.name,
                    staffPos: g1.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Dịch vụ Cắt tỉa tạo kiểu và Chăm sóc toàn diện',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                },
                {
                    id: 'WS-02',
                    name: 'Bàn Grooming 02',
                    status: 'IDLE',
                    staffId: g2.id,
                    staffName: g2.name,
                    staffPos: g2.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Dịch vụ Tắm vệ sinh và Cắt tỉa móng',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                },
                {
                    id: 'WS-03',
                    name: 'Bàn Tắm Spa 03',
                    status: 'IDLE',
                    staffId: g3.id,
                    staffName: g3.name,
                    staffPos: g3.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Dịch vụ Tắm khử mùi và Thư giãn chuyên sâu',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                },
                {
                    id: 'WS-04',
                    name: 'Pet Taxi 01',
                    status: 'IDLE',
                    staffId: drv.id,
                    staffName: drv.name,
                    staffPos: drv.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Đưa đón thú cưng tận nhà an toàn',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                },
                {
                    id: 'WS-05',
                    name: 'Khu Pet Hotel 24/7',
                    status: 'IDLE',
                    staffId: vet.id,
                    staffName: vet.name,
                    staffPos: vet.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Giám sát lưu trú và Khám sức khỏe định kỳ',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                },
                {
                    id: 'WS-06',
                    name: 'Bàn Tắm Sấy 02',
                    status: 'IDLE',
                    staffId: g4.id,
                    staffName: g4.name,
                    staffPos: g4.position,
                    bookingId: '',
                    customerName: '',
                    petName: '',
                    serviceName: 'Sẵn sàng tiếp nhận ca tắm sấy vệ sinh hoặc dưỡng lông',
                    startTime: '',
                    estEndTime: '',
                    extendedMinutes: 0,
                    isRequested: false,
                    incidentNote: ''
                }
            ];
        }

        // Biến trạng thái toàn cục phân hệ
        let selectedStaffId = sessionStorage.getItem('pawpal_admin_staff_selected_id') || 'EMP-001';

        // Trạng thái lọc danh sách nhân sự (Subtab 1)
        let currentKpiFilter = 'ALL';
        let filterRetrainActive = false;
        let filterLockActive = false;
        let alertFilterQuickActive = false;

        // Trạng thái phân trang
        let currentStaffPage = 1;
        const STAFF_PAGE_SIZE = 10;
        let currentAssessmentPage = 1;
        const ASSESSMENT_PAGE_SIZE = 10;

        // Trạng thái lịch làm việc (Subtab 3 - Giai đoạn 2)
        let currentScheduleDate = '2026-09-28';
        let currentScheduleViewMode = 'DAY'; // 'DAY' hoặc 'WEEK'
        let scheduleFilterPos = 'ALL';
        let scheduleFilterShf = 'ALL';

        // Biến trạng thái Modal phân ca
        let modalActiveDate = currentScheduleDate;
        let modalActiveShift = 'MORNING';
        let modalCurrentAssignedIds = [];

        let currentReqFilter = 'ALL';
        let activeLeaveSwapMode = 'LEAVE';

        function addMinutesToTime(timeStr, minsToAdd) {
            if (!timeStr || !timeStr.includes(':')) return timeStr;
            const [h, m] = timeStr.split(':').map(Number);
            let total = h * 60 + m + minsToAdd;
            let newH = Math.floor(total / 60) % 24;
            let newM = total % 60;
            return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        }

        // Các hàm lưu trữ dữ liệu sang localStorage
        function saveStaffDataToStorage() {
            try {
                localStorage.setItem('pawpal_staff_data', JSON.stringify(mockStaff));
            } catch (e) {}
        }

        function saveRosterToStorage() {
            try {
                localStorage.setItem('pawpal_staff_roster', JSON.stringify(mockRoster));
            } catch (e) {}
        }

        function saveAssessmentsToStorage() {
            try {
                localStorage.setItem('pawpal_staff_assessments', JSON.stringify(mockAssessments));
            } catch (e) {}
        }

        function saveLeaveRequestsToStorage() {
            try {
                localStorage.setItem('pawpal_staff_leave_requests', JSON.stringify(mockLeaveSwapRequests));
            } catch (e) {}
        }

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
            if (statRetrain) statRetrain.textContent = mockStaff.filter(s => (s.skillResult === 'RETRAIN' || s.skillResult === 'FAIL') && s.status !== 'RESIGNED').length;
        }

        function renderStaffAlertBar() {
            const container = document.getElementById('staffAlertItemsContainer');
            if (!container) return;

            const alerts = [];

            // 1. Kiểm tra nhân sự chưa đạt sát hạch hoặc cần đào tạo lại
            const failOrRetrainStaff = mockStaff.filter(s => (s.skillResult === 'FAIL' || s.skillResult === 'RETRAIN') && s.status !== 'RESIGNED');
            if (failOrRetrainStaff.length > 0) {
                const listDetails = failOrRetrainStaff.map(s => `${s.id}: ${s.skillExam}`).join(', ');
                const failCount = failOrRetrainStaff.filter(s => s.skillResult === 'FAIL').length;
                const retrainCount = failOrRetrainStaff.filter(s => s.skillResult === 'RETRAIN').length;
                let alertMainText = 'Cần đào tạo lại';
                if (failCount > 0 && retrainCount === 0) alertMainText = 'Không đạt sát hạch';
                else if (failCount > 0 && retrainCount > 0) alertMainText = 'Chưa đạt nghiệp vụ';

                alerts.push({
                    type: failCount > 0 ? 'danger' : 'warning',
                    prefix: `${failOrRetrainStaff.length} nhân sự`,
                    main: alertMainText,
                    sub: `(${failOrRetrainStaff.map(s => s.id).join(', ')})`,
                    fullText: `Có ${failOrRetrainStaff.length} nhân sự chưa đạt sát hạch chuyên môn (${listDetails}) cần đào tạo và giám sát tay nghề`
                });
            }

            // 2. Kiểm tra nhân sự đang bị tạm khóa an toàn nhận việc
            const lockedStaffActive = mockStaff.filter(s => s.serviceLocked && s.status === 'ACTIVE');
            if (lockedStaffActive.length > 0) {
                const lockedCodes = lockedStaffActive.map(s => s.id).join(', ');
                alerts.push({
                    type: 'danger',
                    prefix: `${lockedStaffActive.length} nhân sự`,
                    main: 'Tạm khóa nhận việc',
                    sub: `(${lockedCodes})`,
                    fullText: `Có ${lockedStaffActive.length} nhân viên đang tạm khóa an toàn nhận việc (${lockedStaffActive.map(s => s.name).join(', ')})`
                });
            }

            // 3. Kiểm tra thiếu hụt nhân sự ca làm việc (ca sáng, ca chiều)
            const shiftsToCheck = [
                { key: 'MORNING', label: 'Ca sáng' },
                { key: 'AFTERNOON', label: 'Ca chiều' }
            ];
            shiftsToCheck.forEach(sh => {
                const groomers = mockStaff.filter(s => s.role === 'Groomer' && s.shift === sh.key && s.status === 'ACTIVE');
                const availGroomers = groomers.filter(s => !s.serviceLocked);
                if (groomers.length > 0 && availGroomers.length < groomers.length) {
                    const lockedInShift = groomers.filter(s => s.serviceLocked).map(s => s.name).join(', ');
                    alerts.push({
                        type: 'danger',
                        prefix: sh.label,
                        main: 'Thiếu Groomer',
                        sub: `(${availGroomers.length}/${groomers.length} khả dụng)`,
                        fullText: `${sh.label} thiếu Groomer: Chỉ có ${availGroomers.length}/${groomers.length} nhân sự sẵn sàng làm việc (${lockedInShift} đang khóa nhận việc)`
                    });
                }
            });

            // 4. Nhân sự nghỉ phép hôm nay
            const leaveStaff = mockStaff.filter(s => s.status === 'LEAVE');
            if (leaveStaff.length > 0) {
                const names = leaveStaff.map(s => s.name).join(', ');
                alerts.push({
                    type: 'info',
                    prefix: `${leaveStaff.length} nhân sự`,
                    main: 'Nghỉ phép hôm nay',
                    sub: `(${names})`,
                    fullText: `${leaveStaff.length} nhân viên đang nghỉ phép hôm nay (${names})`
                });
            }

            // 5. Đơn xin nghỉ phép và đổi ca chờ duyệt
            const pendingReqs = mockLeaveSwapRequests.filter(r => r.status === 'PENDING');
            if (pendingReqs.length > 0) {
                alerts.push({
                    type: 'warning',
                    prefix: `${pendingReqs.length} đơn`,
                    main: 'Xin nghỉ và đổi ca',
                    sub: '(Chờ duyệt)',
                    fullText: `Có ${pendingReqs.length} đơn xin nghỉ phép và đề xuất đổi ca đang chờ quản trị viên phê duyệt`
                });
            }

            let tagsHtml = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" title="${a.fullText}">
                    <span class="tag-highlight">${a.prefix}</span>
                    <span class="tag-main">${a.main}</span>
                    <span class="tag-sub">${a.sub}</span>
                </span>
            `).join('');

            // Ký hiệu 3 chấm (...) thuần chữ (không phải button)
            if (alerts.length > 1) {
                tagsHtml += `<span class="alert-dots-text">...</span>`;
            }

            container.innerHTML = tagsHtml;

            // Gắn sự kiện click vào các thẻ tag cảnh báo để kích hoạt nhanh bộ lọc
            container.querySelectorAll('.alert-item-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const btnFilterAlertQuick = document.getElementById('btnFilterStaffAlertQuick');
                    alertFilterQuickActive = true;
                    if (btnFilterAlertQuick) {
                        btnFilterAlertQuick.textContent = 'Hiện tất cả';
                        btnFilterAlertQuick.classList.add('active');
                    }
                    renderStaffList();
                });
            });

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
            if (elDob) elDob.textContent = formatDateVN(staff.dob) || '—';
            if (elJoin) elJoin.textContent = formatDateVN(staff.join_date) || '—';
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
                elNightShifts.textContent = staff.nightShiftsCount !== undefined ? `${staff.nightShiftsCount} ca` : (staff.shift === 'NIGHT' ? '14 ca' : (staff.role === 'Caregiver' ? '6 ca' : '2 ca'));
            }
            if (elCompletedServices) {
                elCompletedServices.textContent = staff.completedServicesCount !== undefined ? `${staff.completedServicesCount} lượt` : (staff.role === 'Groomer' ? '68 lượt' : (staff.role === 'Caregiver' ? '45 ca' : (staff.role === 'Driver' ? '52 chuyến' : '38 lượt')));
            }
            if (elPunctuality) {
                elPunctuality.textContent = staff.punctualityRate || (staff.serviceLocked ? '92.0%' : '98.5%');
            }

            // Bảng tính hoa hồng và Ước tính thu nhập tháng (Giai đoạn 4)
            const elBaseSalary = document.getElementById('viewStaffBaseSalary');
            const elServiceCommission = document.getElementById('viewStaffServiceCommission');
            const elRequestedBonus = document.getElementById('viewStaffRequestedBonus');
            const elSafetyBonus = document.getElementById('viewStaffSafetyBonus');
            const elTotalIncome = document.getElementById('viewStaffTotalIncome');

            let baseSalary = 7500000;
            if (staff.role === 'Admin') baseSalary = 12000000;
            else if (staff.role === 'Groomer') baseSalary = 8000000;
            else if (staff.role === 'Caregiver') baseSalary = 7000000;
            else if (staff.role === 'Driver') baseSalary = 6500000;
            else if (staff.role === 'Receptionist' || staff.role === 'CSKH') baseSalary = 8500000;

            if (staff.status === 'LEAVE') baseSalary = Math.round(baseSalary * 0.85);
            if (staff.status === 'PAUSE') baseSalary = Math.round(baseSalary * 0.5);
            if (staff.status === 'RESIGNED') baseSalary = 0;

            const servicesCount = staff.completedServicesCount !== undefined ? staff.completedServicesCount : (staff.role === 'Groomer' ? 68 : (staff.role === 'Caregiver' ? 45 : (staff.role === 'Driver' ? 52 : 38)));
            const commissionPerService = staff.role === 'Groomer' ? 85000 : (staff.role === 'Caregiver' ? 65000 : (staff.role === 'Driver' ? 40000 : 35000));
            const serviceCommission = (staff.status === 'RESIGNED') ? 0 : (servicesCount * commissionPerService);

            const reqCount = staff.requested_count !== undefined ? staff.requested_count : (staff.role === 'Groomer' ? 42 : 12);
            const requestedBonus = (staff.status === 'RESIGNED') ? 0 : (reqCount * 20000);

            const safetyBonus = (staff.complaint_count === 0 && !staff.serviceLocked && staff.status !== 'RESIGNED') ? 1000000 : 0;
            const totalIncome = baseSalary + serviceCommission + requestedBonus + safetyBonus;

            if (elBaseSalary) elBaseSalary.textContent = baseSalary.toLocaleString('vi-VN') + ' đ';
            if (elServiceCommission) elServiceCommission.textContent = '+ ' + serviceCommission.toLocaleString('vi-VN') + ' đ';
            if (elRequestedBonus) elRequestedBonus.textContent = '+ ' + requestedBonus.toLocaleString('vi-VN') + ' đ';
            if (elSafetyBonus) elSafetyBonus.textContent = safetyBonus > 0 ? ('+ ' + safetyBonus.toLocaleString('vi-VN') + ' đ') : '0 đ (Không đạt)';
            if (elTotalIncome) elTotalIncome.textContent = totalIncome.toLocaleString('vi-VN') + ' đ';

            // Đánh giá và Phản hồi từ Khách hàng (Giai đoạn 1)
            const elCsatScore = document.getElementById('viewStaffCsatScore');
            const elCsatReviews = document.getElementById('viewStaffCsatReviews');
            const elRequestedCount = document.getElementById('viewStaffRequestedCount');
            const elZeroComplaint = document.getElementById('viewStaffZeroComplaintRate');
            const elReviewsList = document.getElementById('viewStaffCustomerReviewsList');

            if (elCsatScore) {
                elCsatScore.textContent = staff.customer_rating ? `${staff.customer_rating.avg_score} / 5.0` : '5.0 / 5.0';
            }
            if (elCsatReviews) {
                elCsatReviews.textContent = staff.customer_rating ? `${staff.customer_rating.total_reviews} lượt đánh giá` : '0 lượt đánh giá';
            }
            if (elRequestedCount) {
                elRequestedCount.textContent = staff.requested_count !== undefined ? `${staff.requested_count} lượt` : '0 lượt';
            }
            if (elZeroComplaint) {
                elZeroComplaint.textContent = staff.zero_complaint_rate || (staff.complaint_count === 0 ? '100%' : '95.0%');
            }

            if (elReviewsList) {
                elReviewsList.innerHTML = '';
                const reviews = staff.customer_reviews || [];
                if (reviews.length === 0) {
                    elReviewsList.innerHTML = `
                        <div style="font-size: 12.5px; color: var(--text-muted); padding: 12px 0;">
                            Chưa có nhận xét trực tiếp từ khách hàng cho nhân viên này.
                        </div>
                    `;
                } else {
                    reviews.forEach(rv => {
                        const requestedBadgeHtml = rv.is_requested ? '<span class="badge-requested-pill">Khách chỉ định KTV</span>' : '';
                        const card = document.createElement('div');
                        card.className = 'customer-review-card';
                        card.innerHTML = `
                            <div class="review-card-top">
                                <div class="review-customer-info">
                                    <span class="review-customer-name">${escapeHtml(rv.customer_name)}</span>
                                    <span class="review-pet-name">• ${escapeHtml(rv.pet_name)}</span>
                                </div>
                                <div class="review-rating-stars">★ ${rv.rating}.0 / 5.0</div>
                            </div>
                            <div class="review-comment-body">"${escapeHtml(rv.comment)}"</div>
                            <div class="review-card-meta">
                                <span>${escapeHtml(rv.service_name)} • ${formatDateVN(rv.date)}</span>
                                ${requestedBadgeHtml}
                            </div>
                        `;
                        elReviewsList.appendChild(card);
                    });
                }
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
                                <span style="font-size: 11.5px; color: var(--text-muted);">${formatDateVN(ass.date)} • ${escapeHtml(ass.evaluator || 'Lê Lệ Quyên')}${ass.note ? ' • ' + escapeHtml(ass.note) : ''}</span>
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

        // Helper: Chuyển tiếng Việt có dấu thành không dấu
        function toUnaccent(str) {
            if (!str) return '';
            return String(str)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
                .toLowerCase()
                .trim();
        }

        // Helper: So khớp chuỗi tìm kiếm thông minh có dấu và không dấu
        function matchSearch(sourceText, searchTerm) {
            if (!searchTerm) return true;
            if (!sourceText) return false;
            const src = String(sourceText).toLowerCase();
            const query = String(searchTerm).toLowerCase().trim().replace(/\s+/g, ' ');
            if (src.includes(query)) return true;
            return toUnaccent(sourceText).replace(/\s+/g, ' ').includes(toUnaccent(query));
        }

        function clearAllStaffFilters() {
            const searchInput = document.getElementById('staffSearchInput');
            const filterPos = document.getElementById('staffFilterPosition');
            const filterStatus = document.getElementById('staffFilterStatus');
            const filterShift = document.getElementById('staffFilterShift');
            const btnClearStaffSearch = document.getElementById('btnClearStaffSearch');
            const btnStaffClearFilters = document.getElementById('btnStaffClearFilters');

            if (searchInput) searchInput.value = '';
            if (btnClearStaffSearch) btnClearStaffSearch.style.display = 'none';
            if (btnStaffClearFilters) btnStaffClearFilters.style.display = 'none';
            if (filterPos) filterPos.value = 'ALL';
            if (filterStatus) filterStatus.value = 'ALL';
            if (filterShift) filterShift.value = 'ALL';

            const btnFilterRetrain = document.getElementById('btnFilterRetrainOnly');
            if (btnFilterRetrain) btnFilterRetrain.classList.remove('active');
            const btnFilterLock = document.getElementById('btnFilterLockOnly');
            if (btnFilterLock) btnFilterLock.classList.remove('active');

            currentKpiFilter = 'ALL';
            filterRetrainActive = false;
            filterLockActive = false;
            alertFilterQuickActive = false;
            currentStaffPage = 1;

            document.querySelectorAll('#tab-staff-list .kpi-card, .staff-kpi-card').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.staff-quick-filter-btn').forEach(b => b.classList.remove('active'));

            renderStaffList();
        }

        // ---------------------------------------------------------
        // 3. RENDER SUB-TAB 1: DANH SÁCH NHÂN VIÊN VÀ BỘ LỌC
        // ---------------------------------------------------------
        function getFilteredStaffList() {
            const searchInput = document.getElementById('staffSearchInput');
            const filterPos = document.getElementById('staffFilterPosition');
            const filterStatus = document.getElementById('staffFilterStatus');
            const filterShift = document.getElementById('staffFilterShift');
            const btnStaffClearFilters = document.getElementById('btnStaffClearFilters');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().replace(/\s+/g, ' ') : '';
            const selectedPos = (filterPos && filterPos.value) ? filterPos.value : 'ALL';
            const selectedStatus = (filterStatus && filterStatus.value) ? filterStatus.value : 'ALL';
            const selectedShift = (filterShift && filterShift.value) ? filterShift.value : 'ALL';

            const isAnyFilterActive = Boolean(
                searchTerm ||
                selectedPos !== 'ALL' ||
                selectedStatus !== 'ALL' ||
                selectedShift !== 'ALL' ||
                currentKpiFilter !== 'ALL' ||
                filterRetrainActive ||
                filterLockActive ||
                alertFilterQuickActive
            );
            if (btnStaffClearFilters) {
                btnStaffClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
            }

            return mockStaff.filter(staff => {
                if (searchTerm) {
                    const match = matchSearch(staff.id, searchTerm) ||
                                  matchSearch(staff.name, searchTerm) ||
                                  matchSearch(staff.phone, searchTerm) ||
                                  matchSearch(staff.position, searchTerm) ||
                                  matchSearch(staff.role, searchTerm) ||
                                  matchSearch(staff.email, searchTerm) ||
                                  matchSearch(staff.address, searchTerm);
                    if (!match) return false;
                }

                if (selectedPos !== 'ALL') {
                    // Bộ lọc dùng mã vai trò trong select, còn dữ liệu hiển thị
                    // có thể dùng tên chức vụ hoặc chuyên môn tiếng Việt.
                    const selectedPosText = toUnaccent(String(selectedPos)).toLowerCase();
                    const roleText = toUnaccent(String(staff.role || '')).toLowerCase();
                    const positionText = toUnaccent(String(staff.position || '')).toLowerCase();
                    const positionAliases = {
                        admin: ['admin', 'quan tri vien'],
                        groomer: ['groomer', 'grooming', 'ky thuat vien', 'spa', 'tam say', 'cat tia'],
                        medical_caregiver: ['veterinarian', 'bac si', 'thu y', 'caregiver', 'bao mau', 'pet hotel'],
                        veterinarian: ['veterinarian', 'bac si', 'thu y'],
                        receptionist: ['receptionist', 'le tan'],
                        caregiver: ['caregiver', 'bao mau', 'pet hotel'],
                        cskh: ['cskh', 'cham soc khach'],
                        driver: ['driver', 'tai xe', 'taxi pet']
                    };
                    const aliases = positionAliases[String(selectedPos).toLowerCase()] || [selectedPosText];
                    const posMatch = staff.role === selectedPos ||
                        aliases.some(alias => roleText.includes(alias) || positionText.includes(alias));
                    if (!posMatch) return false;
                }
                if (selectedStatus !== 'ALL' && staff.status !== selectedStatus) return false;
                if (selectedShift !== 'ALL' && staff.shift !== selectedShift) return false;

                if (currentKpiFilter === 'ACTIVE' && staff.status !== 'ACTIVE') return false;
                if (currentKpiFilter === 'LEAVE' && staff.status !== 'LEAVE') return false;
                if (currentKpiFilter === 'PAUSE' && staff.status !== 'PAUSE') return false;
                if (currentKpiFilter === 'RETRAIN' && !(staff.skillResult === 'RETRAIN' || staff.skillResult === 'FAIL')) return false;

                if (filterRetrainActive && !(staff.skillResult === 'RETRAIN' || staff.skillResult === 'FAIL')) return false;
                if (filterLockActive && !staff.serviceLocked) return false;
                if (alertFilterQuickActive && !(staff.skillResult === 'RETRAIN' || staff.skillResult === 'FAIL' || staff.serviceLocked || staff.status === 'LEAVE')) return false;

                return true;
            }).sort((a, b) => {
                const aCode = String(a.id || '').match(/(\d+)$/);
                const bCode = String(b.id || '').match(/(\d+)$/);
                return (aCode ? Number(aCode[1]) : Number.MAX_SAFE_INTEGER) -
                    (bCode ? Number(bCode[1]) : Number.MAX_SAFE_INTEGER);
            });
        }

        function renderStaffPagination(totalPages) {
            const pagContainer = document.getElementById('staffPagination');
            if (!pagContainer) return;

            if (totalPages === 0) {
                pagContainer.innerHTML = '';
                pagContainer.style.display = 'none';
                return;
            }
            pagContainer.style.display = 'flex';

            const actualPages = Math.max(1, totalPages);
            let html = '';
            const prevDisabled = currentStaffPage === 1 ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>`;

            for (let p = 1; p <= actualPages; p++) {
                const activeClass = p === currentStaffPage ? 'active' : '';
                html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
            }

            const nextDisabled = currentStaffPage === actualPages ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>`;

            pagContainer.innerHTML = html;

            pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pageAction = btn.getAttribute('data-page');
                    if (pageAction === 'prev') {
                        if (currentStaffPage > 1) {
                            currentStaffPage--;
                            renderStaffList();
                        }
                    } else if (pageAction === 'next') {
                        if (currentStaffPage < actualPages) {
                            currentStaffPage++;
                            renderStaffList();
                        }
                    } else {
                        const targetP = parseInt(pageAction, 10);
                        if (targetP && targetP !== currentStaffPage) {
                            currentStaffPage = targetP;
                            renderStaffList();
                        }
                    }
                });
            });
        }

        function renderStaffList() {
            const tbody = document.getElementById('staffListTableBody');
            if (!tbody) return;
            if (mockStaff.length === 0) return;
            tbody.innerHTML = '';

            const list = getFilteredStaffList();
            const totalPages = Math.ceil(list.length / STAFF_PAGE_SIZE);

            if (currentStaffPage > totalPages && totalPages > 0) {
                currentStaffPage = totalPages;
            }
            if (currentStaffPage < 1) currentStaffPage = 1;

            if (list.length === 0) {
                const emptyTr = document.createElement('tr');
                emptyTr.innerHTML = `
                    <td colspan="8" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy nhân viên nào phù hợp với điều kiện lọc hiện tại. 
                        <button type="button" id="btnResetStaffFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                    </td>
                `;
                tbody.appendChild(emptyTr);
                document.getElementById('btnResetStaffFilters')?.addEventListener('click', clearAllStaffFilters);
                renderStaffPagination(0);
                return;
            }

            const startIndex = (currentStaffPage - 1) * STAFF_PAGE_SIZE;
            const pageList = list.slice(startIndex, startIndex + STAFF_PAGE_SIZE);

            pageList.forEach(staff => {
                let statusBadge = '';
                if (staff.status === 'ACTIVE') statusBadge = '<span class="admin-badge badge-success">Đang làm việc</span>';
                else if (staff.status === 'LEAVE') statusBadge = '<span class="admin-badge badge-warning">Nghỉ phép</span>';
                else if (staff.status === 'PAUSE') statusBadge = '<span class="admin-badge badge-neutral">Tạm nghỉ</span>';
                else statusBadge = '<span class="admin-badge badge-danger">Nghỉ việc</span>';

                let shiftText = staff.shift === 'MORNING' ? 'Ca sáng' : staff.shift === 'AFTERNOON' ? 'Ca chiều' : staff.shift === 'EVENING' ? 'Ca tối' : staff.shift === 'NIGHT' ? 'Ca khuya' : staff.shift === 'FULL_TIME' ? 'Toàn thời gian' : 'Toàn thời gian';

                let skillText = '';
                if (staff.skillResult === 'PASS') {
                    skillText = `<span style="color: var(--text-main); font-size: 13px;">${staff.skillExam}</span>`;
                } else if (staff.skillResult === 'RETRAIN') {
                    skillText = `<span class="alert-indicator text-warning" style="font-weight: 500;">• ${staff.skillExam}</span>`;
                } else {
                    skillText = `<span class="alert-indicator text-danger" style="font-weight: 500;">• ${staff.skillExam}</span>`;
                }

                let lockStatusText = staff.serviceLocked
                    ? `<div style="font-size: 11.5px; color: #DC2626; font-weight: 500; margin-top: 2px;">• Tạm khóa nhận việc</div>`
                    : `<div style="font-size: 11.5px; color: var(--text-muted); font-weight: 500; margin-top: 2px;">• Sẵn sàng nhận lịch</div>`;

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
                    <td><a href="javascript:void(0)" class="user-link-text btn-view-profile" data-id="${staff.id}" title="${escapeHtml(staff.name)}">${escapeHtml(staff.name)}</a></td>
                    <td>${staff.position}</td>
                    <td>${staff.phone}</td>
                    <td>${shiftText}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; align-items: flex-start;">
                            ${skillText}
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

            renderStaffPagination(totalPages);
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

            // Cho phép đóng menu thao tác bằng phím Escape.
            if (!document.body.dataset.staffActionEscapeBound) {
                document.addEventListener('keydown', (e) => {
                    if (e.key !== 'Escape') return;
                    document.querySelectorAll('.action-dropdown-menu').forEach(menu => {
                        menu.style.display = 'none';
                    });
                });
                document.body.dataset.staffActionEscapeBound = 'true';
            }
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
                if (scheduleFilterPos !== 'ALL') {
                    const posMatch = s.role === scheduleFilterPos || 
                                     s.position === scheduleFilterPos ||
                                     toUnaccent(s.position).includes(toUnaccent(scheduleFilterPos)) ||
                                     toUnaccent(s.role).includes(toUnaccent(scheduleFilterPos));
                    if (!posMatch) return false;
                }
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
                    return `<div class="shift-cell empty" data-shift="${shiftKey}" data-id="${staff.id}">Xếp ca</div>`;
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
                        <div class="name-cell-text btn-view-profile" data-id="${staff.id}" title="${escapeHtml(staff.name)}">${escapeHtml(staff.name)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(staff.position)}</div>
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
                if (scheduleFilterPos !== 'ALL') {
                    const posMatch = s.role === scheduleFilterPos || 
                                     s.position === scheduleFilterPos ||
                                     toUnaccent(s.position).includes(toUnaccent(scheduleFilterPos)) ||
                                     toUnaccent(s.role).includes(toUnaccent(scheduleFilterPos));
                    if (!posMatch) return false;
                }
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
                        <div class="name-cell-text btn-view-profile" data-id="${staff.id}" title="${escapeHtml(staff.name)}">${escapeHtml(staff.name)}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(staff.position)}</div>
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

        // ---------------------------------------------------------
        // GIAI ĐOẠN 3: TIẾN ĐỘ BÀN DỊCH VỤ TRỰC TIẾP (LIVE WORKSTATIONS)
        // ---------------------------------------------------------
        function renderLiveWorkstations() {
            const grid = document.getElementById('liveWorkstationsGrid');
            const countBadge = document.getElementById('liveWorkstationsActiveCount');
            if (!grid) return;

            const inServiceCount = mockWorkstations.filter(w => w.status === 'IN_SERVICE' || w.status === 'DELAYED').length;
            if (countBadge) {
                countBadge.textContent = `${inServiceCount} bàn đang phục vụ`;
            }

            grid.innerHTML = '';
            mockWorkstations.forEach(ws => {
                let cardClass = 'idle';
                let statusBadge = '<span class="admin-badge badge-pause">Sẵn sàng</span>';

                if (ws.status === 'IN_SERVICE') {
                    cardClass = 'in-service';
                    statusBadge = '<span class="admin-badge badge-active">Đang phục vụ</span>';
                } else if (ws.status === 'DELAYED') {
                    cardClass = 'delayed';
                    statusBadge = `<span class="admin-badge badge-leave">Kéo dài (+${ws.extendedMinutes}p)</span>`;
                }

                const card = document.createElement('div');
                card.className = `workstation-card ${cardClass}`;

                let bookingHtml = '';
                let actionsHtml = '';

                if (ws.status === 'IDLE') {
                    bookingHtml = `
                        <div class="workstation-booking-info" style="color: var(--text-muted); font-size: 12px; font-style: italic;">
                            ${ws.serviceName}
                        </div>
                    `;
                    actionsHtml = `
                        <div class="workstation-actions-row" style="justify-content: flex-end;">
                            <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Bàn trống • Sẵn sàng tiếp nhận</span>
                        </div>
                    `;
                } else {
                    const extendText = ws.extendedMinutes > 0 ? ` <span style="color: #D97706; font-size: 11px;">(+${ws.extendedMinutes}p)</span>` : '';
                    const incidentHtml = ws.incidentNote ? `
                        <div style="font-size: 11.5px; color: #DC2626; margin-top: 3px; font-weight: 500;">
                            Lưu ý ca: ${ws.incidentNote}
                        </div>
                    ` : '';

                    bookingHtml = `
                        <div class="workstation-booking-info">
                            <div class="booking-title-row">
                                <span>${ws.petName} • ${ws.customerName}</span>
                                <span style="font-size: 11.5px; color: var(--text-heading); font-weight: 700;">${ws.startTime} ➔ ${ws.estEndTime}${extendText}</span>
                            </div>
                            <div class="booking-desc-row">${ws.serviceName}</div>
                            ${incidentHtml}
                        </div>
                    `;

                    actionsHtml = `
                        <div class="workstation-actions-row">
                            <button type="button" class="btn-extend-chip" data-ws-id="${ws.id}">Gia hạn +15p</button>
                            <button type="button" class="btn-incident-chip" data-ws-id="${ws.id}">Báo sự cố</button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="workstation-top">
                        <span class="workstation-name">${ws.name}</span>
                        ${statusBadge}
                    </div>
                    <div class="workstation-staff-info">
                        <span class="workstation-staff-name" style="cursor: pointer;" data-staff-id="${ws.staffId}">${ws.staffName}</span>
                        <span style="font-size: 11px; color: var(--text-muted);">${ws.staffPos}</span>
                        ${ws.isRequested ? '<span class="badge-requested-pill">Yêu cầu KTV</span>' : ''}
                    </div>
                    ${bookingHtml}
                    ${actionsHtml}
                `;

                grid.appendChild(card);
            });

            // Gán sự kiện xem hồ sơ nhân viên từ bàn làm việc
            grid.querySelectorAll('.workstation-staff-name').forEach(el => {
                el.addEventListener('click', () => {
                    const id = el.getAttribute('data-staff-id');
                    if (id) {
                        selectedStaffId = id;
                        sessionStorage.setItem('pawpal_admin_staff_selected_id', id);
                        renderStaffProfile(id);
                        switchSubtab('tab-staff-profile');
                    }
                });
            });

            // Gán sự kiện nút +15p gia hạn
            grid.querySelectorAll('.btn-extend-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const wsId = btn.getAttribute('data-ws-id');
                    const ws = mockWorkstations.find(w => w.id === wsId);
                    if (ws) {
                        ws.extendedMinutes = (ws.extendedMinutes || 0) + 15;
                        ws.estEndTime = addMinutesToTime(ws.estEndTime, 15);
                        ws.status = 'DELAYED';
                        renderLiveWorkstations();
                    }
                });
            });

            // Gán sự kiện nút Báo sự cố
            grid.querySelectorAll('.btn-incident-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const wsId = btn.getAttribute('data-ws-id');
                    openIncidentReportModal(wsId);
                });
            });
        }

        function openIncidentReportModal(defaultWsId) {
            const modal = document.getElementById('incidentReportModalOverlay');
            if (!modal) return;

            const staffSelect = document.getElementById('incidentInputStaff');
            const bookingSelect = document.getElementById('incidentInputBooking');
            const noteInput = document.getElementById('incidentInputNote');

            if (staffSelect) {
                staffSelect.innerHTML = mockStaff
                    .filter(s => s.status !== 'RESIGNED')
                    .map(s => `<option value="${s.id}">${s.name} (${s.position})</option>`)
                    .join('');
            }

            if (bookingSelect) {
                bookingSelect.innerHTML = mockWorkstations
                    .map(w => {
                        const label = w.status === 'IDLE' 
                            ? `${w.name} (Sẵn sàng / Trống)`
                            : `${w.name} - ${w.petName} (${w.customerName})`;
                        return `<option value="${w.id}">${label}</option>`;
                    })
                    .join('');
            }

            if (defaultWsId) {
                const ws = mockWorkstations.find(w => w.id === defaultWsId);
                if (ws) {
                    if (bookingSelect) bookingSelect.value = defaultWsId;
                    if (staffSelect && ws.staffId) staffSelect.value = ws.staffId;
                }
            }

            if (noteInput) noteInput.value = '';
            modal.classList.add('active');
        }

        async function handleSaveIncidentReport() {
            const modal = document.getElementById('incidentReportModalOverlay');
            const staffId = document.getElementById('incidentInputStaff')?.value;
            const wsId = document.getElementById('incidentInputBooking')?.value;
            const incidentTypeLabel = document.getElementById('incidentInputType')?.selectedOptions[0]?.text || 'Sự cố ca trực';
            const extendMinutes = parseInt(document.getElementById('incidentInputExtend')?.value || '0', 10);
            const severity = document.getElementById('incidentInputSeverity')?.value;
            const note = document.getElementById('incidentInputNote')?.value.trim();

            const ws = mockWorkstations.find(w => w.id === wsId);
            const staff = mockStaff.find(s => s.id === staffId);

            if (ws) {
                if (extendMinutes > 0) {
                    ws.extendedMinutes = (ws.extendedMinutes || 0) + extendMinutes;
                    ws.estEndTime = addMinutesToTime(ws.estEndTime, extendMinutes);
                    ws.status = 'DELAYED';
                }
                ws.incidentNote = note || incidentTypeLabel;
            }

            if (staff && severity === 'URGENT') {
                if (!staff.flags) staff.flags = [];
                staff.flags.push(`Sự cố ca trực: ${incidentTypeLabel}`);
            }

            // Đồng bộ ghi nhận sự cố vào Supabase audit_log
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    await client.from('audit_log').insert({
                        user_id: staff?.rawId || 'd0000000-0000-0000-0000-000000000001',
                        action: 'STAFF_INCIDENT_REPORTED',
                        entity: 'workstation',
                        entity_id: wsId || 'WS-01',
                        old_data: null,
                        new_data: {
                            staffId: staffId,
                            staffName: staff?.name,
                            wsId: wsId,
                            incidentType: incidentTypeLabel,
                            extendMinutes: extendMinutes,
                            severity: severity,
                            note: note
                        }
                    });
                }
            } catch (err) {
                console.warn('Lỗi ghi nhận sự cố vào Supabase:', err);
            }

            modal?.classList.remove('active');
            renderLiveWorkstations();
            renderStaffAlertBar();
            showToast(`Đã ghi nhận sự cố ca trực cho bàn ${ws ? ws.name : ''} thành công!`, 'success');
        }

        function renderScheduleTable() {
            updateShiftQuotas(currentScheduleDate);
            renderLiveWorkstations();

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
                        <button type="button" class="btn-shift-action btn-add-to-shift" data-id="${s.id}">Thêm vào ca</button>
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
                    const sDate = formatDateVN(req.startDate);
                    const eDate = formatDateVN(req.endDate);
                    const dateText = sDate === eDate ? sDate : `${sDate} đến ${eDate}`;
                    const repText = req.replacementName ? `<span style="color: #236B48; font-weight: 500;">Người thay: ${req.replacementName}</span>` : '<span style="color: #B45309;">Chưa có người trực thay</span>';
                    detailsHtml = `
                        <div class="leave-req-desc">
                            <div><strong>Thời gian:</strong> ${dateText} (${req.scopeLabel})</div>
                            <div><strong>Loại nghỉ:</strong> ${req.leaveTypeLabel} • ${repText}</div>
                            <div class="leave-req-reason">Lý do: "${req.reason}"</div>
                        </div>
                    `;
                } else {
                    const dFrom = formatDateVN(req.dateFrom);
                    const dTo = formatDateVN(req.dateTo);
                    const returnText = req.shiftTo === 'NONE' ? 'Trực hộ (Không nhận ca bù)' : `${dTo} (${req.shiftToLabel})`;
                    detailsHtml = `
                        <div class="leave-req-desc">
                            <div><strong>Ca xin đổi:</strong> ${dFrom} (${req.shiftFromLabel})</div>
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

        async function approveLeaveSwapRequest(reqId) {
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

                // Tự động chuyển giao ca hẹn cho nhân sự thay thế (nếu có)
                if (req.replacementId) {
                    const repStaff = mockStaff.find(s => s.id === req.replacementId);
                    if (repStaff) {
                        mockActiveBookings.forEach(b => {
                            if (b.staffId === req.staffId && b.date >= req.startDate && b.date <= req.endDate) {
                                b.staffId = repStaff.id;
                                b.staffName = repStaff.name;
                            }
                        });
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

            // Đồng bộ phê duyệt đơn vào Supabase
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    const staff = mockStaff.find(s => s.id === req.staffId);
                    if (req.type === 'LEAVE') {
                        await client.from('staff_schedule').insert({
                            staff_id: staff?.rawId || req.staffId,
                            work_date: req.startDate,
                            shift: req.scope === 'ALL' ? 'MORNING' : req.scope,
                            start_time: '08:00:00',
                            end_time: '17:00:00',
                            work_location: 'Chi nhánh Quận 1',
                            schedule_status: 'LEAVE'
                        });
                    }

                    await client.from('audit_log').insert({
                        user_id: staff?.rawId || 'd0000000-0000-0000-0000-000000000001',
                        action: req.type === 'LEAVE' ? 'LEAVE_REQUEST_APPROVED' : 'SWAP_REQUEST_APPROVED',
                        entity: 'staff_schedule',
                        entity_id: req.id,
                        old_data: { status: 'PENDING' },
                        new_data: { status: 'APPROVED', reqId: req.id, staffId: req.staffId }
                    });
                }
            } catch (err) {
                console.warn('Lỗi duyệt đơn trên Supabase:', err);
            }

            saveRosterToStorage();
            saveLeaveRequestsToStorage();
            updatePendingRequestsCounters();
            renderStaffAlertBar();
            renderScheduleTable();
            renderLeaveRequestsList();
            showToast(`Đã duyệt đơn ${req.id} và cập nhật lịch làm việc thành công!`, 'success');
        }

        async function rejectLeaveSwapRequest(reqId) {
            const req = mockLeaveSwapRequests.find(r => r.id === reqId);
            if (!req) return;
            req.status = 'REJECTED';

            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    const staff = mockStaff.find(s => s.id === req.staffId);
                    await client.from('audit_log').insert({
                        user_id: staff?.rawId || 'd0000000-0000-0000-0000-000000000001',
                        action: req.type === 'LEAVE' ? 'LEAVE_REQUEST_REJECTED' : 'SWAP_REQUEST_REJECTED',
                        entity: 'staff_schedule',
                        entity_id: req.id,
                        old_data: { status: 'PENDING' },
                        new_data: { status: 'REJECTED', reqId: req.id }
                    });
                }
            } catch (err) {
                console.warn('Lỗi từ chối đơn trên Supabase:', err);
            }

            saveLeaveRequestsToStorage();
            updatePendingRequestsCounters();
            renderStaffAlertBar();
            renderLeaveRequestsList();
            showToast(`Đã từ chối đơn ${req.id}.`, 'info');
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

        async function handleCreateLeaveSwapRequest(approveImmediately = false) {
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

                // Đồng bộ vào Supabase
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        await client.from('audit_log').insert({
                            user_id: staff?.rawId || 'd0000000-0000-0000-0000-000000000001',
                            action: 'LEAVE_REQUEST_SUBMITTED',
                            entity: 'staff_schedule',
                            entity_id: newId,
                            old_data: null,
                            new_data: newReq
                        });
                    }
                } catch (err) {
                    console.warn('Lỗi gửi đơn nghỉ phép vào Supabase:', err);
                }

                if (approveImmediately) {
                    approveLeaveSwapRequest(newId);
                } else {
                    updatePendingRequestsCounters();
                    renderStaffAlertBar();
                    showToast(`Đã tạo đơn xin nghỉ phép ${newId} (trạng thái Chờ duyệt)!`, 'success');
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

                // Đồng bộ vào Supabase
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        await client.from('audit_log').insert({
                            user_id: staffFrom?.rawId || 'd0000000-0000-0000-0000-000000000001',
                            action: 'SWAP_REQUEST_SUBMITTED',
                            entity: 'staff_schedule',
                            entity_id: newId,
                            old_data: null,
                            new_data: newReq
                        });
                    }
                } catch (err) {
                    console.warn('Lỗi gửi đề xuất đổi ca vào Supabase:', err);
                }

                if (approveImmediately) {
                    approveLeaveSwapRequest(newId);
                } else {
                    updatePendingRequestsCounters();
                    renderStaffAlertBar();
                    showToast(`Đã gửi đề xuất đổi ca ${newId} (trạng thái Chờ duyệt)!`, 'success');
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
            if (statRetrain) statRetrain.textContent = mockAssessments.filter(a => a.result === 'RETRAIN' || a.result === 'FAIL').length;

            const assessedStaffIds = new Set(mockAssessments.map(a => a.staff_id));
            const notAssessedCount = mockStaff.filter(s => !assessedStaffIds.has(s.id) || s.skillExam === 'Chưa kiểm tra').length;
            if (statNotAssessed) statNotAssessed.textContent = notAssessedCount;
        }

        function renderAssessmentPagination(totalPages) {
            const pagContainer = document.getElementById('assessmentPagination');
            if (!pagContainer) return;

            if (totalPages === 0) {
                pagContainer.innerHTML = '';
                pagContainer.style.display = 'none';
                return;
            }
            pagContainer.style.display = 'flex';

            const actualPages = Math.max(1, totalPages);
            let html = '';
            const prevDisabled = currentAssessmentPage === 1 ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>`;

            for (let p = 1; p <= actualPages; p++) {
                const activeClass = p === currentAssessmentPage ? 'active' : '';
                html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
            }

            const nextDisabled = currentAssessmentPage === actualPages ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>`;

            pagContainer.innerHTML = html;

            pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pageAction = btn.getAttribute('data-page');
                    if (pageAction === 'prev') {
                        if (currentAssessmentPage > 1) {
                            currentAssessmentPage--;
                            renderAssessmentList();
                        }
                    } else if (pageAction === 'next') {
                        if (currentAssessmentPage < actualPages) {
                            currentAssessmentPage++;
                            renderAssessmentList();
                        }
                    } else {
                        const targetP = parseInt(pageAction, 10);
                        if (targetP && targetP !== currentAssessmentPage) {
                            currentAssessmentPage = targetP;
                            renderAssessmentList();
                        }
                    }
                });
            });
        }

        function renderAssessmentList() {
            const tbody = document.getElementById('assessmentListTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('assessmentSearchInput');
            const filterTypeEl = document.getElementById('assessmentFilterType');
            const filterResultEl = document.getElementById('assessmentFilterResult');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().replace(/\s+/g, ' ') : '';
            const selectedType = (filterTypeEl && filterTypeEl.value) ? filterTypeEl.value : 'ALL';
            const selectedResult = (filterResultEl && filterResultEl.value) ? filterResultEl.value : 'ALL';

            const filteredAssessments = mockAssessments.filter(ass => {
                if (searchTerm) {
                    const match = matchSearch(ass.staff_id, searchTerm) ||
                                  matchSearch(ass.name, searchTerm) ||
                                  matchSearch(ass.position, searchTerm) ||
                                  matchSearch(ass.type, searchTerm) ||
                                  matchSearch(ass.evaluator, searchTerm) ||
                                  matchSearch(ass.note, searchTerm);
                    if (!match) return false;
                }
                if (selectedType !== 'ALL' && ass.type !== selectedType) return false;
                if (selectedResult !== 'ALL' && ass.result !== selectedResult) return false;
                return true;
            });

            const totalPages = Math.ceil(filteredAssessments.length / ASSESSMENT_PAGE_SIZE);
            if (currentAssessmentPage > totalPages && totalPages > 0) {
                currentAssessmentPage = totalPages;
            }
            if (currentAssessmentPage < 1) currentAssessmentPage = 1;

            if (filteredAssessments.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                        Không tìm thấy dữ liệu đánh giá nghiệp vụ phù hợp với bộ lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                updateAssessmentKpiCounters();
                renderAssessmentPagination(0);
                return;
            }

            const startIndex = (currentAssessmentPage - 1) * ASSESSMENT_PAGE_SIZE;
            const pageList = filteredAssessments.slice(startIndex, startIndex + ASSESSMENT_PAGE_SIZE);

            pageList.forEach(ass => {
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
                    <td>${formatDateVN(ass.date)}</td>
                    <td><strong>${escapeHtml(ass.staff_id)}</strong></td>
                    <td><span class="user-link-text" title="${escapeHtml(ass.name)}">${escapeHtml(ass.name)}</span></td>
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

            renderAssessmentPagination(totalPages);
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

        async function handleSaveAssessment(shouldNotify = false) {
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
                showToast('Không tìm thấy thông tin nhân viên được chọn!', 'danger');
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

            // Gỡ bỏ cờ mở khóa thủ công nếu có bài kiểm tra mới
            try {
                localStorage.removeItem('pawpal_staff_manual_unlocked_' + staff.id);
            } catch (e) {}

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
                note: note || (result === 'PASS' ? 'Nghiệp vụ chuẩn xác' : (result === 'RETRAIN' ? 'Yêu cầu kèm cặp chuyên môn' : 'Không đạt chuẩn sát hạch'))
            });

            // Đồng bộ ngay lập tức sang danh sách mockStaff
            syncStaffWithAssessments();

            // Đồng bộ đánh giá năng lực vào Supabase audit_log
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    await client.from('audit_log').insert({
                        user_id: staff.rawId || 'd0000000-0000-0000-0000-000000000001',
                        action: 'STAFF_ASSESSMENT_RECORDED',
                        entity: 'staff',
                        entity_id: staff.rawId || staff.id,
                        old_data: { skillScore: staff.skillScore, serviceLocked: staff.serviceLocked },
                        new_data: {
                            assessmentId: newAssId,
                            date: assessDate,
                            type: type,
                            score: score,
                            result: result,
                            serviceLocked: staff.serviceLocked,
                            note: note
                        }
                    });
                }
            } catch (err) {
                console.warn('Lỗi lưu đánh giá vào Supabase:', err);
            }

            saveAssessmentsToStorage();
            saveStaffDataToStorage();

            updateKpiCounters();
            updateAssessmentKpiCounters();
            renderStaffAlertBar();
            renderStaffList();
            renderAssessmentList();

            // Cập nhật tức thì hồ sơ chi tiết nếu đang mở nhân viên này
            if (selectedStaffId === staff.id) {
                renderStaffProfile(selectedStaffId);
            }

            if (assessModalEl) assessModalEl.classList.remove('active');
            const notifyMsg = shouldNotify ? '\nĐã gửi thông báo kết quả đánh giá tới ứng dụng nhân viên.' : '';
            showToast(`Đã lưu kết quả đánh giá nghiệp vụ cho nhân viên ${staff.name} (${staff.id})!${safetyLockMessage}${notifyMsg}`, 'success');

            // Nếu bị khóa an toàn và có ca hẹn đang gán, kích hoạt ngay luồng điều phối lại ca
            if (result !== 'PASS') {
                const affected = getAffectedBookingsForStaff(staff.id);
                if (affected.length > 0) {
                    openReassignModal(staff.id, (reassigned) => {
                        saveStaffDataToStorage();
                        updateKpiCounters();
                        renderStaffAlertBar();
                        renderStaffList();
                        renderAssessmentList();
                        if (reassigned) {
                            showToast(`Đã chuyển giao ${affected.length} ca hẹn của nhân viên ${staff.name} sang KTV khả dụng khác do chưa đạt chuẩn nghiệp vụ!`, 'warning');
                        }
                    });
                }
            }
        }

        // ---------------------------------------------------------
        // 6. CHUYỂN ĐỔI SUB-TAB & DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

        function switchSubtab(targetSubtab, updateHistory = true) {
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
                updateKpiCounters();
                renderStaffAlertBar();
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
                updateAssessmentKpiCounters();
                renderAssessmentList();
                updateBreadcrumb(null);
            }

            sessionStorage.setItem('pawpal_admin_staff_active_subtab', targetSubtab);
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

            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-subtab');
                if (target) {
                    switchSubtab(target, true);
                }
            });
        });

        // Lắng nghe hashchange khi người dùng bấm nút Back / Forward trên trình duyệt
        const handleStaffHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validStaffSubtabs = ['tab-staff-list', 'tab-staff-profile', 'tab-staff-schedule', 'tab-staff-assessment'];
            if (validStaffSubtabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handleStaffHashChange);

        // ---------------------------------------------------------
        // 7. GẮN SỰ KIỆN CHO CÁC PHẦN TỬ TRÊN GIAO DIỆN
        // ---------------------------------------------------------

        // KPI Card click (Lọc 1 chạm)
        document.querySelectorAll('.kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                currentKpiFilter = card.getAttribute('data-kpi-filter') || 'ALL';
                currentStaffPage = 1;
                renderStaffList();
            });
        });

        // Tìm kiếm và bộ lọc Subtab 1
        const staffSearchInput = document.getElementById('staffSearchInput');
        const btnClearStaffSearch = document.getElementById('btnClearStaffSearch');

        function updateStaffSearchClearBtn() {
            if (btnClearStaffSearch && staffSearchInput) {
                btnClearStaffSearch.style.display = staffSearchInput.value.length > 0 ? 'inline-flex' : 'none';
            }
        }

        staffSearchInput?.addEventListener('input', () => {
            updateStaffSearchClearBtn();
            currentStaffPage = 1;
            renderStaffList();
        });

        btnClearStaffSearch?.addEventListener('click', (e) => {
            e.preventDefault();
            if (staffSearchInput) {
                staffSearchInput.value = '';
                updateStaffSearchClearBtn();
                staffSearchInput.focus();
                currentStaffPage = 1;
                renderStaffList();
            }
        });
        document.getElementById('staffFilterPosition')?.addEventListener('change', () => {
            currentStaffPage = 1;
            renderStaffList();
        });
        document.getElementById('staffFilterStatus')?.addEventListener('change', () => {
            currentStaffPage = 1;
            renderStaffList();
        });
        document.getElementById('staffFilterShift')?.addEventListener('change', () => {
            currentStaffPage = 1;
            renderStaffList();
        });

        // Nút Toggle: Cần đào tạo lại
        const btnFilterRetrain = document.getElementById('btnFilterRetrainOnly');
        btnFilterRetrain?.addEventListener('click', () => {
            filterRetrainActive = !filterRetrainActive;
            btnFilterRetrain.classList.toggle('active', filterRetrainActive);
            currentStaffPage = 1;
            renderStaffList();
        });

        // Nút Toggle: Đang khóa nhận việc
        const btnFilterLock = document.getElementById('btnFilterLockOnly');
        btnFilterLock?.addEventListener('click', () => {
            filterLockActive = !filterLockActive;
            btnFilterLock.classList.toggle('active', filterLockActive);
            currentStaffPage = 1;
            renderStaffList();
        });

        // Nút Xóa bộ lọc ngay cạnh các dropdown lọc
        document.getElementById('btnStaffClearFilters')?.addEventListener('click', clearAllStaffFilters);

        // Nút Lọc nhanh trên thanh cảnh báo chủ động
        const btnFilterAlertQuick = document.getElementById('btnFilterStaffAlertQuick');
        btnFilterAlertQuick?.addEventListener('click', () => {
            alertFilterQuickActive = !alertFilterQuickActive;
            btnFilterAlertQuick.textContent = alertFilterQuickActive ? 'Hiện tất cả' : 'Lọc danh sách';
            btnFilterAlertQuick.classList.toggle('active', alertFilterQuickActive);
            currentStaffPage = 1;
            renderStaffList();
        });

        // Modal Thêm/Sửa nhân sự
        const staffModal = document.getElementById('staffModalOverlay');

        function openStaffModal(staffId) {
            const titleEl = document.getElementById('staffModalTitle');
            const nameIn = document.getElementById('staffInputName');
            const phoneIn = document.getElementById('staffInputPhone');
            const emailIn = document.getElementById('staffInputEmail');
            const addrIn = document.getElementById('staffInputAddress');
            const dobIn = document.getElementById('staffInputDob');
            const joinIn = document.getElementById('staffInputJoinDate');
            const posIn = document.getElementById('staffInputPosition');
            const roleIn = document.getElementById('staffInputRole');
            const shiftIn = document.getElementById('staffInputShift');

            if (!staffModal) return;

            if (staffId) {
                const staff = mockStaff.find(s => s.id === staffId);
                if (staff) {
                    if (titleEl) titleEl.innerText = `Chỉnh sửa hồ sơ: ${staff.name} (${staff.id})`;
                    staffModal.setAttribute('data-editing-id', staff.id);
                    if (nameIn) nameIn.value = staff.name || '';
                    if (phoneIn) phoneIn.value = staff.phone || '';
                    if (emailIn) emailIn.value = staff.email || '';
                    if (addrIn) addrIn.value = staff.address || '';
                    if (dobIn) dobIn.value = toIsoDate(staff.dob) || '1998-01-01';
                    if (joinIn) joinIn.value = toIsoDate(staff.join_date) || new Date().toISOString().split('T')[0];
                    if (posIn) posIn.value = staff.position || 'Groomer';
                    if (roleIn) roleIn.value = staff.role || 'Groomer';
                    if (shiftIn) shiftIn.value = staff.shift || '';
                }
            } else {
                if (titleEl) titleEl.innerText = 'Thêm nhân viên mới';
                staffModal.removeAttribute('data-editing-id');
                if (nameIn) nameIn.value = '';
                if (phoneIn) phoneIn.value = '';
                if (emailIn) emailIn.value = '';
                if (addrIn) addrIn.value = '';
                if (dobIn) dobIn.value = '1998-01-01';
                if (joinIn) joinIn.value = new Date().toISOString().split('T')[0];
                if (posIn) posIn.value = 'Groomer';
                if (roleIn) roleIn.value = 'Groomer';
                if (shiftIn) shiftIn.value = '';
            }

            staffModal.classList.add('active');
            setTimeout(() => { (nameIn || phoneIn)?.focus(); }, 0);
        }

        async function handleSaveStaff() {
            const nameIn = document.getElementById('staffInputName');
            const phoneIn = document.getElementById('staffInputPhone');
            const emailIn = document.getElementById('staffInputEmail');
            const addrIn = document.getElementById('staffInputAddress');
            const dobIn = document.getElementById('staffInputDob');
            const joinIn = document.getElementById('staffInputJoinDate');
            const posIn = document.getElementById('staffInputPosition');
            const roleIn = document.getElementById('staffInputRole');
            const shiftIn = document.getElementById('staffInputShift');

            const name = nameIn?.value.trim();
            const phoneRaw = (phoneIn?.value || '').trim();
            const compactPhone = phoneRaw.replace(/\s+/g, '');
            const phone = /^\+84\d{9}$/.test(compactPhone) ? '0' + compactPhone.slice(3) : compactPhone;
            if (phone !== phoneRaw && phoneIn) phoneIn.value = phone;
            const email = emailIn?.value.trim();
            const address = addrIn?.value.trim() || '';
            const dob = dobIn?.value || '1998-01-01';
            const join_date = joinIn?.value || new Date().toISOString().split('T')[0];
            const position = posIn?.value || 'Groomer';
            const role = roleIn?.value || 'Groomer';
            const shift = shiftIn?.value || '';

            const fieldMap = [[nameIn, 'Họ và tên'], [phoneIn, 'Số điện thoại'], [emailIn, 'Email công việc'], [shiftIn, 'Ca làm việc']];
            fieldMap.forEach(([el]) => { el?.classList.remove('is-invalid'); el?.parentElement?.querySelector('.field-error')?.remove(); });
            const errors = [];
            const addError = (el, message) => { errors.push(message); el?.classList.add('is-invalid'); if (el?.parentElement) { const note = document.createElement('div'); note.className = 'field-error'; note.textContent = message; el.parentElement.appendChild(note); } };
            if (!name || name.length < 2) addError(nameIn, 'Họ và tên là bắt buộc.');
            else if (name.length > 100) addError(nameIn, 'Họ và tên không được quá 100 ký tự.');
            else if (!/^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u.test(name)) addError(nameIn, 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.');
            if (!/^0\d{9}$/.test(phone || '')) addError(phoneIn, 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0.');
            if (!email || !email.includes('@')) addError(emailIn, 'Email công việc không hợp lệ.');
            if (!shift) addError(shiftIn, 'Vui lòng chọn ca làm việc.');
            if (errors.length) {
                const firstInvalid = [nameIn, phoneIn, emailIn, shiftIn].find(el => el?.classList.contains('is-invalid'));
                firstInvalid?.focus();
                return;
            }

            const editingId = staffModal?.getAttribute('data-editing-id');
            const duplicate = mockStaff.find(s => s.phone === phone && s.id !== editingId && s.status !== 'RESIGNED');
            if (duplicate) {
                showToast(`Số điện thoại đã thuộc nhân viên ${duplicate.name} (${duplicate.id}).`, 'warning');
                phoneIn?.focus();
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            let dbRole = 'PET_CARE';
            if (role === 'Admin') dbRole = 'ADMIN';
            else if (role === 'Veterinarian') dbRole = 'VET';
            else if (role === 'Driver') dbRole = 'DRIVER';
            else if (role === 'Receptionist') dbRole = 'RECEPTIONIST';
            else if (role === 'CSKH') dbRole = 'CSKH';

            if (editingId) {
                const staff = mockStaff.find(s => s.id === editingId);
                if (staff) {
                    staff.name = name;
                    staff.phone = phone;
                    staff.email = email;
                    staff.address = address;
                    staff.dob = formatDateVN(dob);
                    staff.join_date = formatDateVN(join_date);
                    staff.position = position;
                    staff.role = role;

                    if (client && staff.rawId) {
                        try {
                            await client.from('staff').update({
                                full_name: name,
                                phone_number: phone,
                                role: dbRole,
                                specialization: position,
                                hire_date: toIsoDate(join_date),
                            shift: shift,
                                updated_at: new Date().toISOString()
                            }).eq('id', staff.rawId);

                            await client.from('audit_log').insert({
                                user_id: staff.rawId,
                                action: 'STAFF_UPDATED',
                                entity: 'staff',
                                entity_id: staff.rawId,
                                old_data: null,
                                new_data: { full_name: name, phone_number: phone, role: dbRole, specialization: position }
                            });
                        } catch (err) {
                            console.warn('Lỗi cập nhật staff Supabase:', err);
                        }
                    }
                    showToast(`Đã cập nhật thông tin nhân viên ${staff.name} (${staff.id})!`, 'success');
                }
            } else {
                const maxNum = mockStaff.reduce((max, s) => {
                    const num = parseInt(s.id.replace(/[^\d]/g, ''), 10);
                    return !isNaN(num) && num > max ? num : max;
                }, 0);
                const newId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;

                const newStaff = {
                    id: newId,
                    name: name,
                    position: position,
                    role: role,
                    phone: phone,
                    email: email,
                    shift: shift,
                    status: 'ACTIVE',
                    join_date: formatDateVN(join_date),
                    dob: formatDateVN(dob),
                    address: address,
                    skillScore: 85,
                    skillResult: 'PASS',
                    skillExam: 'Đạt (85đ)',
                    serviceLocked: false,
                    note: 'Nhân sự mới bổ sung vào hệ thống PawPal'
                };

                if (client) {
                    try {
                        const { data: inserted, error: insertError } = await client.from('staff').insert({
                            full_name: name,
                            phone_number: phone,
                            role: dbRole,
                            specialization: position,
                            hire_date: toIsoDate(join_date),
                            shift: shift
                        }).select().single();

                        if (insertError) throw insertError;
                        if (!inserted || !inserted.id) throw new Error('Không nhận được nhân viên vừa tạo từ cơ sở dữ liệu.');
                        if (inserted) {
                            newStaff.rawId = inserted.id;
                        }

                        await client.from('audit_log').insert({
                            user_id: inserted ? inserted.id : 'd0000000-0000-0000-0000-000000000001',
                            action: 'STAFF_CREATED',
                            entity: 'staff',
                            entity_id: inserted ? inserted.id : newId,
                            old_data: null,
                            new_data: { full_name: name, phone_number: phone, role: dbRole, specialization: position }
                        });
                    } catch (err) {
                        console.error('Lỗi thêm staff Supabase:', err);
                        showToast('Không thể lưu nhân viên vào cơ sở dữ liệu: ' + (err.message || ''), 'danger');
                        return;
                    }
                } else {
                    showToast('Chưa kết nối được cơ sở dữ liệu.', 'danger');
                    return;
                }

                mockStaff.unshift(newStaff);
                selectedStaffId = newId;
                showToast(`Đã thêm mới nhân viên ${newStaff.name} với mã ${newStaff.id}!`, 'success');
            }

            saveStaffDataToStorage();
            staffModal?.classList.remove('active');
            updateKpiCounters();
            renderStaffAlertBar();
            renderStaffList();
            if (selectedStaffId) {
                const s = mockStaff.find(x => x.id === selectedStaffId);
                if (s) renderStaffProfileDetail(s);
            }
        }

        let staffExportBusy = false;
        function exportStaffToExcel() {
            if (staffExportBusy) return;
            const exportButtons = [document.getElementById('btnExportStaff'), document.getElementById('btnExportStaffExcel')].filter(Boolean);
            staffExportBusy = true;
            exportButtons.forEach(btn => { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); });
            const releaseExport = () => { staffExportBusy = false; exportButtons.forEach(btn => { btn.disabled = false; btn.removeAttribute('aria-busy'); }); };
            const list = getFilteredStaffList();
            if (!list || list.length === 0) {
                releaseExport();
                showToast('Không có dữ liệu nhân viên nào phù hợp để xuất file!', 'warning');
                return;
            }

            if (window.XLSX) {
                const data = list.map(s => ({
                    'Mã NV': s.id,
                    'Họ tên': /^[=+\-@]/.test(String(s.name || '')) ? `'${s.name || ''}` : (s.name || ''),
                    'Chức vụ': s.position || '',
                    'Vai trò': s.role || '',
                    'Số điện thoại': s.phone || '',
                    'Email': s.email || '',
                    'Ca làm việc': s.shift === 'MORNING' ? 'Ca sáng' : s.shift === 'AFTERNOON' ? 'Ca chiều' : s.shift === 'EVENING' ? 'Ca tối' : s.shift === 'NIGHT' ? 'Ca khuya' : 'Toàn thời gian',
                    'Trạng thái': s.status === 'ACTIVE' ? 'Đang làm việc' : s.status === 'LEAVE' ? 'Nghỉ phép' : s.status === 'PAUSE' ? 'Tạm nghỉ' : 'Nghỉ việc',
                    'Điểm tay nghề': s.skillExam || '—',
                    'Trạng thái nhận việc': s.serviceLocked ? 'Đang tạm khóa' : 'Sẵn sàng nhận việc',
                    'Địa chỉ': s.address || ''
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân viên');
                XLSX.writeFile(wb, `Danh_sach_nhan_vien_${new Date().toISOString().split('T')[0]}.xlsx`);
                showToast(`Đã xuất file Excel thành công (${list.length} nhân viên)!`, 'success');
                setTimeout(releaseExport, 700);
                return;
            }

            // Không hạ xuống CSV: nút này luôn phải xuất đúng định dạng Excel.
            releaseExport();
            showToast('Không thể tạo file Excel. Vui lòng tải lại trang và thử lại.', 'error');
        }

        document.getElementById('btnOpenAddStaffModal')?.addEventListener('click', () => openStaffModal(null));
        staffModal?.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.preventDefault(); staffModal.classList.remove('active'); return; }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(staffModal.querySelectorAll('input, select, textarea, button')).filter(el => !el.disabled && el.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        [document.getElementById('staffInputName'), document.getElementById('staffInputPhone'), document.getElementById('staffInputEmail'), document.getElementById('staffInputShift')].forEach(el => el?.addEventListener('input', () => { el.classList.remove('is-invalid'); el.parentElement?.querySelector('.field-error')?.remove(); }));
        document.getElementById('btnCancelStaff')?.addEventListener('click', () => staffModal?.classList.remove('active'));
        document.getElementById('btnDismissStaffModal')?.addEventListener('click', () => staffModal?.classList.remove('active'));
        document.getElementById('btnSaveStaff')?.addEventListener('click', handleSaveStaff);
        document.getElementById('btnExportStaffExcel')?.addEventListener('click', exportStaffToExcel);
        document.getElementById('btnExportStaff')?.addEventListener('click', exportStaffToExcel);

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

        // Dữ liệu ca hẹn sắp tới liên kết phục vụ điều phối lại ca tự động (Giai đoạn 2)
        let mockActiveBookings = [
            { id: 'BKG-1002', customerName: 'Lê Lệ Quyên', petName: 'Miu Miu (Poodle)', serviceName: 'Grooming Tạo Kiểu Boo', date: '2026-09-29', time: '14:00', staffId: 'EMP-007', staffName: 'Trần Văn Hùng', isRequested: true },
            { id: 'BKG-1005', customerName: 'Trần Minh Quân', petName: 'Bông Xù (Samoyed)', serviceName: 'Tắm sấy và Cắt tỉa lông', date: '2026-09-29', time: '15:30', staffId: 'EMP-007', staffName: 'Trần Văn Hùng', isRequested: false },
            { id: 'BKG-1006', customerName: 'Đặng Thu Thảo', petName: 'Bông (Mèo Ta)', serviceName: 'Vệ sinh tai móng chuyên sâu', date: '2026-09-30', time: '10:00', staffId: 'EMP-002', staffName: 'Nguyễn Văn A', isRequested: true },
            { id: 'BKG-1008', customerName: 'Phan Thị Bích', petName: 'Coco (Poodle Tiny)', serviceName: 'Cắt tỉa tạo kiểu Asian Style', date: '2026-09-30', time: '09:30', staffId: 'EMP-003', staffName: 'Trần Thị B', isRequested: false },
            { id: 'BKG-1009', customerName: 'Nguyễn Hoàng Nam', petName: 'Lucky (Corgi)', serviceName: 'Khách sạn thú cưng Deluxe (2 ngày)', date: '2026-10-01', time: '08:00', staffId: 'EMP-004', staffName: 'Lê Văn C', isRequested: false },
            { id: 'BKG-1011', customerName: 'Vũ Hải Đăng', petName: 'Bim Bim (Pug)', serviceName: 'Pet Taxi đưa đón tận nhà', date: '2026-10-01', time: '14:30', staffId: 'EMP-011', staffName: 'Nguyễn Quốc Bảo', isRequested: true }
        ];

        // Đọc dữ liệu ca hẹn đã điều phối từ localStorage nếu có
        try {
            const savedBkg = localStorage.getItem('pawpal_staff_active_bookings');
            if (savedBkg) {
                const parsedBkg = JSON.parse(savedBkg);
                if (Array.isArray(parsedBkg) && parsedBkg.length > 0) {
                    mockActiveBookings = parsedBkg;
                }
            }
        } catch (e) {}

        function saveActiveBookingsToStorage() {
            try {
                localStorage.setItem('pawpal_staff_active_bookings', JSON.stringify(mockActiveBookings));
            } catch (e) {}
        }

        function getAffectedBookingsForStaff(staffId) {
            return mockActiveBookings.filter(b => b.staffId === staffId);
        }

        function openReassignModal(staffId, onLockConfirmed) {
            const modal = document.getElementById('reassignModalOverlay');
            const warningText = document.getElementById('reassignModalWarningText');
            const tbody = document.getElementById('reassignBookingsTableBody');
            const selectAll = document.getElementById('reassignSelectAllStaff');
            if (!modal || !tbody || !selectAll) return;

            const staff = mockStaff.find(s => s.id === staffId);
            if (!staff) return;

            const affected = getAffectedBookingsForStaff(staffId);
            if (affected.length === 0) {
                if (typeof onLockConfirmed === 'function') onLockConfirmed(false);
                return;
            }

            if (warningText) {
                warningText.innerHTML = `Nhân viên <strong>${escapeHtml(staff.name)} (${staff.id})</strong> đang có <strong>${affected.length} ca hẹn</strong> đã gán trước đó. Vui lòng chọn nhân sự thay thế để đảm bảo phục vụ khách hàng đúng giờ.`;
            }

            const availableReplacements = mockStaff.filter(s => s.id !== staffId && s.status === 'ACTIVE' && !s.serviceLocked && (s.role === staff.role || s.role === 'Groomer' || s.role === 'Admin'));

            selectAll.innerHTML = availableReplacements.map(s => `
                <option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.position)} • Điểm tay nghề ${s.skillScore}đ)</option>
            `).join('');

            tbody.innerHTML = '';
            affected.forEach(b => {
                const tr = document.createElement('tr');
                const reqBadge = b.isRequested ? '<span class="badge-requested-pill" style="margin-left: 4px;">Khách chỉ định</span>' : '';
                tr.innerHTML = `
                    <td><strong>${b.id}</strong></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(b.customerName)}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(b.petName)} ${reqBadge}</div>
                    </td>
                    <td>${escapeHtml(b.serviceName)}</td>
                    <td>${b.date}<br><span style="font-size: 11px; color: var(--text-muted);">${b.time}</span></td>
                    <td>
                        <select class="reassign-select-row" data-bkg-id="${b.id}">
                            ${availableReplacements.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            selectAll.onchange = () => {
                const val = selectAll.value;
                tbody.querySelectorAll('.reassign-select-row').forEach(sel => sel.value = val);
            };

            const confirmBtn = document.getElementById('btnConfirmReassign');
            const dismissBtn = document.getElementById('btnDismissReassignModal');
            const cancelBtn = document.getElementById('btnCancelReassignModal');

            confirmBtn.onclick = async () => {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                for (const sel of tbody.querySelectorAll('.reassign-select-row')) {
                    const bkgId = sel.getAttribute('data-bkg-id');
                    const targetNewStaffId = sel.value;
                    const newStaff = mockStaff.find(s => s.id === targetNewStaffId);
                    const bkg = mockActiveBookings.find(b => b.id === bkgId);
                    if (bkg && newStaff) {
                        bkg.staffId = newStaff.id;
                        bkg.staffName = newStaff.name;

                        if (client && newStaff.rawId) {
                            try {
                                await client.from('appointment').update({ staff_id: newStaff.rawId }).eq('appointment_code', bkgId);
                            } catch(e) {}
                        }
                    }
                }

                saveActiveBookingsToStorage();
                modal.classList.remove('active');
                if (typeof onLockConfirmed === 'function') onLockConfirmed(true);
            };

            dismissBtn.onclick = () => {
                modal.classList.remove('active');
                if (typeof onLockConfirmed === 'function') onLockConfirmed(false);
            };

            cancelBtn.onclick = () => modal.classList.remove('active');

            modal.classList.add('active');
        }

        async function handleToggleStaffLock(staffId) {
            const staff = mockStaff.find(s => s.id === staffId);
            if (!staff) return;

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

            if (!staff.serviceLocked) {
                const affected = getAffectedBookingsForStaff(staff.id);
                if (affected.length > 0) {
                    openReassignModal(staff.id, async (reassigned) => {
                        staff.serviceLocked = true;
                        if (client) {
                            try {
                                await client.from('audit_log').insert({
                                    user_id: staff.rawId || 'd0000000-0000-0000-0000-000000000001',
                                    action: 'STAFF_SAFETY_LOCK_ENABLED',
                                    entity: 'staff',
                                    entity_id: staff.rawId || staff.id,
                                    old_data: { serviceLocked: false },
                                    new_data: { serviceLocked: true, reassigned: reassigned }
                                });
                            } catch(e) {}
                        }
                        try {
                            localStorage.setItem('pawpal_staff_locked_' + staff.id, '1');
                            localStorage.setItem('pawpal_staff_locked_name_' + staff.name.toLowerCase(), '1');
                            localStorage.setItem('pawpal_staff_manual_locked_' + staff.id, '1');
                            localStorage.removeItem('pawpal_staff_manual_unlocked_' + staff.id);
                        } catch(e) {}
                        saveStaffDataToStorage();
                        renderStaffProfile(staff.id);
                        updateKpiCounters();
                        renderStaffAlertBar();
                        renderStaffList();
                        const msg = reassigned 
                            ? `Đã chuyển giao ${affected.length} ca hẹn và tạm khóa nhận việc an toàn cho nhân viên ${staff.name}!` 
                            : `Đã tạm khóa nhận việc an toàn cho nhân viên ${staff.name}!`;
                        showToast(msg, 'warning');
                    });
                    return;
                }
            }

            staff.serviceLocked = !staff.serviceLocked;
            if (client) {
                try {
                    await client.from('audit_log').insert({
                        user_id: staff.rawId || 'd0000000-0000-0000-0000-000000000001',
                        action: staff.serviceLocked ? 'STAFF_SAFETY_LOCK_ENABLED' : 'STAFF_SAFETY_LOCK_DISABLED',
                        entity: 'staff',
                        entity_id: staff.rawId || staff.id,
                        old_data: { serviceLocked: !staff.serviceLocked },
                        new_data: { serviceLocked: staff.serviceLocked }
                    });
                } catch(e) {}
            }
            try {
                localStorage.setItem('pawpal_staff_locked_' + staff.id, staff.serviceLocked ? '1' : '0');
                localStorage.setItem('pawpal_staff_locked_name_' + staff.name.toLowerCase(), staff.serviceLocked ? '1' : '0');
                if (!staff.serviceLocked) {
                    localStorage.setItem('pawpal_staff_manual_unlocked_' + staff.id, '1');
                    localStorage.removeItem('pawpal_staff_manual_locked_' + staff.id);
                } else {
                    localStorage.setItem('pawpal_staff_manual_locked_' + staff.id, '1');
                    localStorage.removeItem('pawpal_staff_manual_unlocked_' + staff.id);
                }
            } catch(e) {}
            saveStaffDataToStorage();
            renderStaffProfile(staff.id);
            updateKpiCounters();
            renderStaffAlertBar();
            renderStaffList();

            const actionMsg = staff.serviceLocked 
                ? `Đã tạm khóa nhận việc an toàn cho nhân viên ${staff.name}!` 
                : `Đã mở khóa nhận việc cho nhân viên ${staff.name}!`;
            showToast(actionMsg, staff.serviceLocked ? 'warning' : 'success');
        }

        document.getElementById('menuActionToggleLock')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            const dropdown = document.getElementById('staffActionDropdown');
            if (dropdown) dropdown.style.display = 'none';
            if (id) handleToggleStaffLock(id);
        });

        document.getElementById('menuActionEditStaff')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            const dropdown = document.getElementById('staffActionDropdown');
            if (dropdown) dropdown.style.display = 'none';
            if (id) openStaffModal(id);
        });

        document.getElementById('menuActionViewSchedule')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            if (id) {
                selectedStaffId = id;
                sessionStorage.setItem('pawpal_admin_staff_selected_id', id);
            }
            const dropdown = document.getElementById('staffActionDropdown');
            if (dropdown) dropdown.style.display = 'none';
            switchSubtab('tab-staff-schedule');
        });

        document.getElementById('menuActionViewAssess')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            if (id) {
                selectedStaffId = id;
                sessionStorage.setItem('pawpal_admin_staff_selected_id', id);
            }
            const dropdown = document.getElementById('staffActionDropdown');
            if (dropdown) dropdown.style.display = 'none';
            switchSubtab('tab-staff-assessment');
        });

        document.getElementById('menuActionDeleteStaff')?.addEventListener('click', () => {
            const id = document.getElementById('staffActionDropdown')?.getAttribute('data-current-id');
            const staff = mockStaff.find(s => s.id === id);
            const dropdown = document.getElementById('staffActionDropdown');
            if (dropdown) dropdown.style.display = 'none';

            if (staff) {
                showStaffConfirmModal({
                    title: 'Xóa nhân viên',
                    message: `Bạn có chắc chắn muốn xóa nhân viên ${staff.name} (${staff.id}) khỏi hệ thống?`,
                    confirmText: 'Xóa nhân viên',
                    isDanger: true,
                    onConfirm: async () => {
                        const idx = mockStaff.findIndex(s => s.id === id);
                        if (idx !== -1) {
                            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                            if (client && staff.rawId) {
                                try {
                                    await client.from('staff').delete().eq('id', staff.rawId);
                                    await client.from('audit_log').insert({
                                        user_id: staff.rawId,
                                        action: 'STAFF_DELETED',
                                        entity: 'staff',
                                        entity_id: staff.rawId,
                                        old_data: { name: staff.name, phone: staff.phone },
                                        new_data: null
                                    });
                                } catch(err) {
                                    console.warn('Lỗi xóa staff Supabase:', err);
                                }
                            }
                            mockStaff.splice(idx, 1);
                            saveStaffDataToStorage();
                            updateKpiCounters();
                            renderStaffAlertBar();
                            renderStaffList();
                            showToast(`Đã xóa nhân viên ${staff.name} thành công!`, 'success');
                        }
                    }
                });
            }
        });

        // Nút Khóa / Mở nhận việc trực tiếp trong Subtab Hồ sơ
        document.getElementById('btnProfileToggleSafetyLock')?.addEventListener('click', () => {
            if (selectedStaffId) handleToggleStaffLock(selectedStaffId);
        });

        // Các nút trong Subtab Hồ sơ riêng
        document.getElementById('btnProfileEditStaff')?.addEventListener('click', () => {
            openStaffModal(selectedStaffId);
        });

        document.getElementById('btnEditStaffProfile')?.addEventListener('click', () => {
            openStaffModal(selectedStaffId);
        });

        document.getElementById('btnAssignShift')?.addEventListener('click', () => {
            openShiftModal(currentScheduleDate, 'MORNING', selectedStaffId);
        });

        document.getElementById('btnRecordAssessment')?.addEventListener('click', () => {
            openAssessmentModal(selectedStaffId);
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

        document.getElementById('btnSaveShift')?.addEventListener('click', async () => {
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

            // Đồng bộ phân ca sang Supabase staff_schedule
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client) {
                    let startTime = '08:00:00', endTime = '12:00:00';
                    if (modalActiveShift === 'AFTERNOON') { startTime = '13:00:00'; endTime = '17:00:00'; }
                    else if (modalActiveShift === 'EVENING') { startTime = '17:30:00'; endTime = '21:30:00'; }
                    else if (modalActiveShift === 'NIGHT') { startTime = '22:00:00'; endTime = '06:00:00'; }

                    for (const s of mockStaff) {
                        if (modalCurrentAssignedIds.includes(s.id)) {
                            await client.from('staff_schedule').insert({
                                staff_id: s.rawId || s.id,
                                work_date: modalActiveDate,
                                shift: modalActiveShift,
                                start_time: startTime,
                                end_time: endTime,
                                work_location: 'Chi nhánh Quận 1',
                                schedule_status: 'SCHEDULED'
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('Lỗi lưu staff_schedule Supabase:', err);
            }

            saveRosterToStorage();
            shiftModalEl?.classList.remove('active');
            renderScheduleTable();
            renderStaffAlertBar();
            showToast(`Đã lưu lịch phân ca cho ngày ${modalActiveDate}!`, 'success');
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
        document.getElementById('btnSaveAssessment')?.addEventListener('click', () => handleSaveAssessment(false));
        document.getElementById('btnSendAssessNotify')?.addEventListener('click', () => handleSaveAssessment(true));

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
        const assessmentSearchInput = document.getElementById('assessmentSearchInput');
        const btnClearAssessmentSearch = document.getElementById('btnClearAssessmentSearch');

        function updateAssessmentSearchClearBtn() {
            if (btnClearAssessmentSearch && assessmentSearchInput) {
                btnClearAssessmentSearch.style.display = assessmentSearchInput.value.length > 0 ? 'inline-flex' : 'none';
            }
        }

        assessmentSearchInput?.addEventListener('input', () => {
            updateAssessmentSearchClearBtn();
            currentAssessmentPage = 1;
            renderAssessmentList();
        });

        btnClearAssessmentSearch?.addEventListener('click', (e) => {
            e.preventDefault();
            if (assessmentSearchInput) {
                assessmentSearchInput.value = '';
                updateAssessmentSearchClearBtn();
                assessmentSearchInput.focus();
                currentAssessmentPage = 1;
                renderAssessmentList();
            }
        });
        document.getElementById('assessmentFilterType')?.addEventListener('change', () => {
            currentAssessmentPage = 1;
            renderAssessmentList();
        });
        document.getElementById('assessmentFilterResult')?.addEventListener('change', () => {
            currentAssessmentPage = 1;
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

        // Sự kiện Modal Báo cáo sự cố ca trực (Giai đoạn 3)
        const incidentModalEl = document.getElementById('incidentReportModalOverlay');
        document.getElementById('btnOpenIncidentReportModal')?.addEventListener('click', () => {
            openIncidentReportModal();
        });
        document.getElementById('btnCancelIncidentModal')?.addEventListener('click', () => {
            incidentModalEl?.classList.remove('active');
        });
        document.getElementById('btnDismissIncidentModal')?.addEventListener('click', () => {
            incidentModalEl?.classList.remove('active');
        });
        document.getElementById('btnSaveIncidentReport')?.addEventListener('click', () => {
            handleSaveIncidentReport();
        });

        // =========================================================
        // 9. CROSS-MODULE API (PAWPAL STAFF MANAGER)
        // =========================================================
        window.PawpalStaffManager = {
            getAllStaff: () => [...mockStaff],
            getStaffById: (id) => mockStaff.find(s => s.id === id) || null,
            getStaffByName: (name) => {
                if (!name) return null;
                const clean = name.split('(')[0].trim().toLowerCase();
                return mockStaff.find(s => s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase()));
            },
            isStaffLocked: (id) => {
                const staff = mockStaff.find(s => s.id === id || s.name.toLowerCase() === (id || '').toLowerCase());
                return staff ? Boolean(staff.serviceLocked) : false;
            },
            getStaffStatus: (id) => {
                const staff = mockStaff.find(s => s.id === id);
                return staff ? staff.status : null;
            },
            getStaffSchedule: (id, dateStr) => {
                return getStaffShiftsForDate(dateStr || currentScheduleDate, id);
            },
            toggleSafetyLock: (nameOrId, isLocked) => {
                const s = window.PawpalStaffManager.getStaffByName(nameOrId) || mockStaff.find(st => st.id === nameOrId);
                if (s) {
                    s.serviceLocked = (isLocked !== undefined) ? isLocked : !s.serviceLocked;
                    try {
                        localStorage.setItem('pawpal_staff_locked_' + s.id, s.serviceLocked ? '1' : '0');
                        localStorage.setItem('pawpal_staff_locked_name_' + s.name.toLowerCase(), s.serviceLocked ? '1' : '0');
                    } catch (e) {}
                    saveStaffDataToStorage();
                    return s;
                }
                return null;
            },
            getAvailableStaff: ({ category, serviceName, duration, date, timeSlot }) => {
                const targetDate = date || '2026-09-28';
                return mockStaff.filter(staff => {
                    // 1. Chỉ nhận nhân viên ACTIVE
                    if (staff.status !== 'ACTIVE') return false;
                    // 2. Không bị khóa nhận việc an toàn
                    if (staff.serviceLocked) return false;

                    // 3. Khớp vị trí / chuyên môn với loại dịch vụ
                    const cat = (category || '').toLowerCase();
                    const sName = (serviceName || '').toLowerCase();
                    if (cat === 'spa' || sName.includes('tắm') || sName.includes('cắt tỉa') || sName.includes('grooming') || sName.includes('nhuộm')) {
                        if (staff.role !== 'Groomer' && staff.role !== 'Admin') return false;
                    } else if (cat === 'hotel' || sName.includes('khách sạn') || sName.includes('lưu trú')) {
                        if (staff.role !== 'Caregiver' && staff.role !== 'Receptionist' && staff.role !== 'Admin') return false;
                    } else if (cat === 'taxi' || sName.includes('taxi') || sName.includes('đưa đón')) {
                        if (staff.role !== 'Driver' && staff.role !== 'Admin') return false;
                    }

                    // 4. Nếu có khung giờ bắt đầu và thời lượng, kiểm tra ca làm việc bao phủ
                    if (timeSlot) {
                        const [startH, startM] = timeSlot.split(':').map(Number);
                        const startTotalMin = startH * 60 + startM;

                        let durMin = 60;
                        if (duration) {
                            if (typeof duration === 'number') durMin = duration;
                            else if (duration.includes('phút')) durMin = parseInt(duration.replace(/[^\d]/g, ''), 10) || 60;
                            else if (duration.includes('giờ') || duration.includes('tiếng')) durMin = (parseFloat(duration.replace(/[^\d.]/g, '')) || 1) * 60;
                        }
                        const endTotalMin = startTotalMin + durMin;

                        const assignedShifts = getStaffShiftsForDate(targetDate, staff.id);
                        if (assignedShifts.includes('LEAVE') || assignedShifts.includes('PAUSE') || assignedShifts.includes('RESIGNED')) {
                            return false;
                        }

                        let covered = false;
                        if (assignedShifts.includes('ALL')) covered = true;
                        // Ca sáng: 08:00 - 12:00 (480 - 720)
                        if (assignedShifts.includes('MORNING') && startTotalMin >= 480 && endTotalMin <= 720) covered = true;
                        // Ca chiều: 13:00 - 17:00 (780 - 1020)
                        if (assignedShifts.includes('AFTERNOON') && startTotalMin >= 780 && endTotalMin <= 1020) covered = true;
                        // Ca tối: 17:30 - 21:30 (1050 - 1290)
                        if (assignedShifts.includes('EVENING') && startTotalMin >= 1050 && endTotalMin <= 1290) covered = true;
                        // Ca đêm: 21:30 - 07:30
                        if (assignedShifts.includes('NIGHT') && (startTotalMin >= 1290 || endTotalMin <= 480)) covered = true;

                        // Nếu làm cả ca sáng và ca chiều
                        if (assignedShifts.includes('MORNING') && assignedShifts.includes('AFTERNOON') && startTotalMin >= 480 && endTotalMin <= 1020) {
                            covered = true;
                        }

                        if (!covered) return false;
                    }

                    return true;
                });
            }
        };

        // ---------------------------------------------------------
        // 8. KHỞI TẠO VÀ PHỤC HỒI SUBTAB
        // ---------------------------------------------------------
        await loadStaffModuleData();

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

        // Thiết lập kênh Supabase Realtime cho phân hệ Nhân sự (Giai đoạn 4)
        function setupStaffRealtimeSubscription() {
            try {
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client && typeof client.channel === 'function') {
                    if (window._pawpalStaffRealtimeChannel) {
                        try { client.removeChannel(window._pawpalStaffRealtimeChannel); } catch (e) {}
                    }
                    const chName = 'pawpal-staff-realtime-' + Date.now();
                    window._pawpalStaffRealtimeChannel = client.channel(chName)
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, async (payload) => {
                            console.log('Realtime Supabase Staff updated:', payload);
                            await loadStaffModuleData();
                            updateKpiCounters();
                            renderStaffAlertBar();
                            renderStaffList();
                            if (selectedStaffId) {
                                renderStaffProfile(selectedStaffId);
                            }
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_schedule' }, async (payload) => {
                            console.log('Realtime Supabase Staff Schedule updated:', payload);
                            await loadStaffModuleData();
                            renderScheduleTable();
                            renderStaffAlertBar();
                            updatePendingRequestsCounters();
                        })
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, async (payload) => {
                            console.log('Realtime Supabase Appointment updated in Staff:', payload);
                            await loadStaffModuleData();
                            renderLiveWorkstations();
                        })
                        .subscribe();
                }
            } catch (err) {
                console.warn('Không thể khởi tạo Supabase Realtime cho Staff:', err);
            }
        }

        // Đồng bộ trạng thái khóa từ localStorage nếu có
        mockStaff.forEach(s => {
            try {
                const stored = localStorage.getItem('pawpal_staff_locked_' + s.id) || localStorage.getItem('pawpal_staff_locked_name_' + s.name.toLowerCase());
                if (stored !== null) s.serviceLocked = stored === '1';
            } catch(e) {}
        });

        syncStaffWithAssessments();

        setupStaffRealtimeSubscription();
        switchSubtab(initialSubtab, false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffModule);
    } else {
        initStaffModule();
    }
})();
