// tab-pet-reminders.js - Subtab Nhắc lịch chăm sóc, tiêm chủng & tái khám Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let remCurrentPage = 1;
    const REMINDERS_PER_PAGE = 10;
    let currentSendingReminderId = 'REM-001';

    const defaultRemindersData = [
        {
            id: 'REM-001',
            petId: 'PET-001',
            petName: 'Bé Milu',
            speciesBreed: 'Chó Corgi',
            ownerName: 'Nguyễn Văn An',
            ownerPhone: '0912345678',
            custId: 'CUST-001',
            type: 'BATH',
            typeText: 'Quá 18 ngày chưa tắm sấy',
            typeBadgeClass: 'badge-warning',
            typeBadgeStyle: '',
            lastDateText: '09/09/2026 (18 ngày trước)',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-002',
            petId: 'PET-003',
            petName: 'Bé Boss',
            speciesBreed: 'Chó Golden Retriever',
            ownerName: 'Lê Thị Bình',
            ownerPhone: '0987654321',
            custId: 'CUST-002',
            type: 'GROOM',
            typeText: 'Quá 36 ngày chưa chải lông và cắt móng',
            typeBadgeClass: 'badge-danger',
            typeBadgeStyle: '',
            lastDateText: '22/08/2026 (36 ngày trước)',
            status: 'SENT',
            statusText: 'Đã gửi Zalo hôm qua',
            statusBadgeClass: 'badge-success'
        },
        {
            id: 'REM-003',
            petId: 'PET-002',
            petName: 'Bé Mimi',
            speciesBreed: 'Mèo Anh lông ngắn',
            ownerName: 'Nguyễn Văn An',
            ownerPhone: '0912345678',
            custId: 'CUST-001',
            type: 'HOTEL',
            typeText: 'Gửi Pet Hotel cuối tuần',
            typeBadgeClass: 'badge-tier-gold',
            typeBadgeStyle: '',
            lastDateText: 'Khách quen gửi thứ 7 hằng tuần',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-004',
            petId: 'PET-005',
            petName: 'Bé Trà Sữa',
            speciesBreed: 'Chó Poodle Toy',
            ownerName: 'Hoàng Minh Tuấn',
            ownerPhone: '0903112233',
            custId: 'CUST-005',
            type: 'GROOM',
            typeText: 'Quá 32 ngày chưa cắt tỉa lông tạo kiểu',
            typeBadgeClass: 'badge-danger',
            typeBadgeStyle: '',
            lastDateText: '26/08/2026 (32 ngày trước)',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-005',
            petId: 'PET-007',
            petName: 'Bé Mochi',
            speciesBreed: 'Phốc Sóc (Pomeranian)',
            ownerName: 'Bùi Thu Trang',
            ownerPhone: '0938776655',
            custId: 'CUST-008',
            type: 'BATH',
            typeText: 'Quá 16 ngày chưa tắm sấy',
            typeBadgeClass: 'badge-warning',
            typeBadgeStyle: '',
            lastDateText: '12/09/2026 (16 ngày trước)',
            status: 'SENT',
            statusText: 'Đã gửi Zalo sáng nay',
            statusBadgeClass: 'badge-success'
        },
        {
            id: 'REM-006',
            petId: 'PET-009',
            petName: 'Bé Đậu Đậu',
            speciesBreed: 'Poodle Standard',
            ownerName: 'Đặng Thùy Linh',
            ownerPhone: '0945678123',
            custId: 'CUST-010',
            type: 'HOTEL',
            typeText: 'Gửi Pet Hotel cuối tuần',
            typeBadgeClass: 'badge-tier-gold',
            typeBadgeStyle: '',
            lastDateText: 'Khách quen đặt phòng cuối tuần',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-007',
            petId: 'PET-004',
            petName: 'Bé Cún Lu',
            speciesBreed: 'Chó cỏ lai',
            ownerName: 'Trần Đình Trọng',
            ownerPhone: '0977889900',
            custId: 'CUST-004',
            type: 'HOTEL_VACCINE',
            typeText: 'Cảnh báo sổ tiêm ngoài quá hạn trước khi nhận Hotel',
            typeBadgeClass: 'badge-danger',
            typeBadgeStyle: 'color: #8F2424; background: #F7DCDC;',
            lastDateText: 'Sổ tiêm ngoài quá hạn: 15/10/2025',
            status: 'UNSENT',
            statusText: 'Cần nhắc chủ',
            statusBadgeClass: 'badge-warning'
        },
        {
            id: 'REM-008',
            petId: 'PET-006',
            petName: 'Bé Bông',
            speciesBreed: 'Mèo Ba Tư lông dài',
            ownerName: 'Phan Tuyết Mai',
            ownerPhone: '0911223344',
            custId: 'CUST-007',
            type: 'GROOM',
            typeText: 'Quá 40 ngày chưa chải xả rối và cạo đệm chân',
            typeBadgeClass: 'badge-danger',
            typeBadgeStyle: '',
            lastDateText: '20/08/2026 (40 ngày trước)',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-009',
            petId: 'PET-010',
            petName: 'Bé Kem',
            speciesBreed: 'Chó Samoyed tuyết',
            ownerName: 'Vũ Đức Thành',
            ownerPhone: '0988776655',
            custId: 'CUST-009',
            type: 'BATH',
            typeText: 'Mùa rụng lông cần tắm sấy xả tơ chuyên sâu',
            typeBadgeClass: 'badge-warning',
            typeBadgeStyle: '',
            lastDateText: '05/09/2026 (24 ngày trước)',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        },
        {
            id: 'REM-010',
            petId: 'PET-008',
            petName: 'Bé Bơ',
            speciesBreed: 'Thỏ Minilop',
            ownerName: 'Nguyễn Văn An',
            ownerPhone: '0912345678',
            custId: 'CUST-001',
            type: 'SHOP_REFILL',
            typeText: 'Dự đoán hết cỏ Timothy và hạt nén dinh dưỡng',
            typeBadgeClass: 'badge-neutral',
            typeBadgeStyle: '',
            lastDateText: 'Mua đơn gần nhất: 29/08/2026',
            status: 'UNSENT',
            statusText: 'Chưa gửi',
            statusBadgeClass: 'badge-neutral'
        }
    ];

    function getRemindersData() {
        const saved = sessionStorage.getItem('pawpal_admin_pet_reminders');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    const seen = new Set();
                    return parsed.filter(item => {
                        const key = `${item.petId || item.petName}|${item.type || item.typeText}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                }
            } catch(e) {}
        }
        return JSON.parse(JSON.stringify(defaultRemindersData));
    }

    let remindersData = getRemindersData();

    function persistRemindersData() {
        sessionStorage.setItem('pawpal_admin_pet_reminders', JSON.stringify(remindersData));
    }

    function updateReminderKPIs() {
        const kpiBathEl = document.getElementById('remKpiValBath');
        const kpiGroomEl = document.getElementById('remKpiValGroom');
        const kpiHotelEl = document.getElementById('remKpiValHotel');
        const kpiVaccineAlertEl = document.getElementById('remKpiValVaccineAlert');

        const countBath = remindersData.filter(r => r.type === 'BATH').length;
        const countGroom = remindersData.filter(r => r.type === 'GROOM').length;
        const countHotel = remindersData.filter(r => r.type === 'HOTEL').length;
        const countVaccine = remindersData.filter(r => r.type === 'HOTEL_VACCINE').length;

        if (kpiBathEl) kpiBathEl.textContent = `${countBath} bé`;
        if (kpiGroomEl) kpiGroomEl.textContent = `${countGroom} bé`;
        if (kpiHotelEl) kpiHotelEl.textContent = `${countHotel} khách`;
        if (kpiVaccineAlertEl) kpiVaccineAlertEl.textContent = `${countVaccine} bé`;
    }

    function buildReminderText(templateKey, petName, ownerName) {
        switch(templateKey) {
            case 'SPA_BATH':
                return `PawPal mến chào Sen ${ownerName}! Bé ${petName} đã hơn 2 tuần chưa ghé spa làm đẹp rồi đó ạ. PawPal gửi tặng bé voucher ưu đãi 10% dịch vụ Spa trong tuần này. Sen đặt lịch ngay cho bé nhé!`;
            case 'GROOM':
                return `PawPal thân gửi Sen ${ownerName}! Bộ lông của bé ${petName} đã đến kỳ cắt tỉa tạo kiểu và gỡ rối định kỳ để bé luôn gọn gàng, thoáng mát. Tiệm đang có sẵn khung giờ đẹp hôm nay và ngày mai, Sen đặt lịch tạo kiểu cho bé nhé!`;
            case 'HOTEL':
                return `PawPal mến chào Sen ${ownerName}! Cuối tuần này Sen có kế hoạch du lịch hoặc về quê không ạ? Phòng Pet Hotel chuẩn 5 sao tại PawPal đã sẵn sàng phục vụ bé ${petName} với camera xem trực tiếp 24/7 và chế độ chăm sóc tận tình. Sen liên hệ đặt phòng sớm nhé!`;
            case 'HOTEL_VACCINE':
                return `PawPal thông báo đến Sen ${ownerName}: Sổ tiêm phòng dại định kỳ của bé ${petName} sắp đến hạn tái chủng tại phòng khám thú y. Để đảm bảo điều kiện an toàn dịch tễ khi bé lưu trú tại Pet Hotel dịp tới, Sen nhớ đưa bé đi tiêm phòng ở cơ sở thú y gần nhất nhé!`;
            case 'SHOP':
                return `PawPal nhắc nhỏ Sen ${ownerName}: Khẩu phần thức ăn hạt và cát vệ sinh của bé ${petName} dự kiến sắp hết. PawPal đang có ưu đãi freeship và quà tặng hấp dẫn cho đơn hàng phụ kiện hoặc thức ăn cho bé hôm nay ạ!`;
            default:
                return `PawPal mến chào Sen ${ownerName}! Bé ${petName} đã đến kỳ chăm sóc định kỳ tại PawPal. Sen liên hệ với tiệm để được tư vấn và xếp lịch thuận tiện nhất nhé!`;
        }
    }

    function renderReminderPagination(totalItems, totalPages) {
        const paginationBar = document.getElementById('remPaginationBar');
        const pageNumbersContainer = document.getElementById('remPageNumbersContainer');
        const prevBtn = document.getElementById('remPrevPageBtn');
        const nextBtn = document.getElementById('remNextPageBtn');

        if (!paginationBar || !pageNumbersContainer) return;

        if (totalItems === 0) {
            paginationBar.style.display = 'none';
        } else {
            paginationBar.style.display = 'flex';
        }

        if (prevBtn) {
            prevBtn.classList.toggle('disabled', remCurrentPage <= 1);
            prevBtn.disabled = remCurrentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.classList.toggle('disabled', remCurrentPage >= totalPages);
            nextBtn.disabled = remCurrentPage >= totalPages;
        }

        pageNumbersContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `pagination-btn ${i === remCurrentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                if (remCurrentPage !== i) {
                    remCurrentPage = i;
                    renderRemindersTable();
                }
            });
            pageNumbersContainer.appendChild(btn);
        }
    }

    function renderRemindersTable() {
        const reminderTableTbody = document.getElementById('reminderTableTbody');
        const reminderSearchInput = document.getElementById('reminderSearchInput');
        const reminderFilterType = document.getElementById('reminderFilterType');
        const reminderFilterStatus = document.getElementById('reminderFilterStatus');

        if (!reminderTableTbody) return;
        const query = (reminderSearchInput?.value || '').trim();
        const typeFilter = reminderFilterType?.value || 'ALL';
        const statusFilter = reminderFilterStatus?.value || 'ALL';

        const filtered = remindersData.filter(item => {
            const matchSearchCondition = !query || 
                PawpalPets.matchSearch(item.petName, query) ||
                PawpalPets.matchSearch(item.ownerName, query) ||
                PawpalPets.matchSearch(item.ownerPhone, query) ||
                PawpalPets.matchSearch(item.speciesBreed, query) ||
                PawpalPets.matchSearch(item.petId, query);

            const matchType = (typeFilter === 'ALL') || (item.type === typeFilter);
            const matchStatus = (statusFilter === 'ALL') || (item.status === statusFilter);
            return matchSearchCondition && matchType && matchStatus;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / REMINDERS_PER_PAGE) || 1;
        if (remCurrentPage > totalPages) remCurrentPage = totalPages;
        if (remCurrentPage < 1) remCurrentPage = 1;

        renderReminderPagination(totalItems, totalPages);

        if (totalItems === 0) {
            reminderTableTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        Không tìm thấy lịch nhắc chăm sóc nào phù hợp với bộ lọc.
                    </td>
                </tr>
            `;
            return;
        }

        const pagedReminders = filtered.slice((remCurrentPage - 1) * REMINDERS_PER_PAGE, remCurrentPage * REMINDERS_PER_PAGE);

        reminderTableTbody.innerHTML = pagedReminders.map(item => {
            const isAlertRow = (item.type === 'HOTEL_VACCINE');
            const borderStyle = isAlertRow ? 'border-left: 3px solid #D97706;' : 'border-left: 3px solid transparent;';

            return `
            <tr data-rem-id="${item.id}">
                <td style="${borderStyle}">
                    <strong style="color: var(--text-heading);">${item.petName}</strong>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.speciesBreed} • Mã: ${item.petId}</div>
                </td>
                <td>
                    <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${item.custId}">${item.ownerName}</a>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.ownerPhone}</div>
                </td>
                <td>
                    <span class="admin-badge ${item.typeBadgeClass}" ${item.typeBadgeStyle ? `style="${item.typeBadgeStyle}"` : ''}>
                        ${item.typeText}
                    </span>
                </td>
                <td>${item.lastDateText}</td>
                <td>
                    <span class="admin-badge ${item.statusBadgeClass}">
                        ${item.statusText}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"
                            data-rem-id="${item.id}"
                            data-pet="${item.petName}"
                            data-owner="${item.ownerName}"
                            data-phone="${item.ownerPhone}">
                            ${item.status === 'SENT' ? 'Gửi lại' : 'Gửi tin'}
                        </button>
                        <button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa" 
                            data-id="${item.petId}" 
                            data-pet="${item.petName}"
                            data-owner="${item.ownerName}"
                            data-phone="${item.ownerPhone}">
                            Đặt lịch
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    function initRemindersTab() {
        const reminderSearchInput = document.getElementById('reminderSearchInput');
        const reminderFilterType = document.getElementById('reminderFilterType');
        const reminderFilterStatus = document.getElementById('reminderFilterStatus');
        const modalSendReminder = document.getElementById('modalSendReminder');
        const reminderTemplateSelect = document.getElementById('reminderTemplateSelect');
        const btnCopyReminderText = document.getElementById('btnCopyReminderText');
        const btnOpenZaloChat = document.getElementById('btnOpenZaloChat');
        const btnSubmitSendReminder = document.getElementById('btnSubmitSendReminder');
        const btnBatchSend = document.getElementById('btnBatchSendReminder');
        const remPrevBtn = document.getElementById('remPrevPageBtn');
        const remNextBtn = document.getElementById('remNextPageBtn');

        if (remPrevBtn) {
            remPrevBtn.addEventListener('click', () => {
                if (remCurrentPage > 1) {
                    remCurrentPage--;
                    renderRemindersTable();
                }
            });
        }

        if (remNextBtn) {
            remNextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(remindersData.length / REMINDERS_PER_PAGE) || 1;
                if (remCurrentPage < totalPages) {
                    remCurrentPage++;
                    renderRemindersTable();
                }
            });
        }

        if (reminderSearchInput) reminderSearchInput.addEventListener('input', () => { remCurrentPage = 1; renderRemindersTable(); });
        if (reminderFilterType) reminderFilterType.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });
        if (reminderFilterStatus) reminderFilterStatus.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });

        renderRemindersTable();
        updateReminderKPIs();

        document.addEventListener('click', (e) => {
            const btnReminder = e.target.closest('.btn-open-reminder-modal');
            if (btnReminder && modalSendReminder) {
                currentSendingReminderId = btnReminder.getAttribute('data-rem-id') || 'REM-001';
                const currentItem = remindersData.find(r => r.id === currentSendingReminderId);

                const pet = btnReminder.getAttribute('data-pet') || 'Milu';
                const owner = btnReminder.getAttribute('data-owner') || 'Nguyễn Văn An';
                const phone = btnReminder.getAttribute('data-phone') || '0912345678';

                const ownerInput = document.getElementById('reminderModalOwner');
                const petInput = document.getElementById('reminderModalPet');
                const contentInput = document.getElementById('reminderMessageContent');

                if (ownerInput) ownerInput.value = `${owner} (${phone})`;
                if (petInput) petInput.value = pet;

                let defaultTpl = 'SPA_BATH';
                if (currentItem) {
                    if (currentItem.type === 'GROOM') defaultTpl = 'GROOM';
                    else if (currentItem.type === 'HOTEL') defaultTpl = 'HOTEL';
                    else if (currentItem.type === 'HOTEL_VACCINE') defaultTpl = 'HOTEL_VACCINE';
                    else if (currentItem.type === 'SHOP_REFILL') defaultTpl = 'SHOP';
                }

                if (reminderTemplateSelect) reminderTemplateSelect.value = defaultTpl;
                if (contentInput) contentInput.value = buildReminderText(defaultTpl, pet, owner);
                if (btnOpenZaloChat) {
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    btnOpenZaloChat.href = `https://zalo.me/${cleanPhone}`;
                }

                modalSendReminder.classList.add('open');
            }
        });

        if (reminderTemplateSelect) {
            reminderTemplateSelect.addEventListener('change', (e) => {
                const currentItem = remindersData.find(r => r.id === currentSendingReminderId);
                const owner = currentItem ? currentItem.ownerName : 'Quý khách';
                const pet = currentItem ? currentItem.petName : 'bé';
                const contentInput = document.getElementById('reminderMessageContent');
                if (contentInput) {
                    contentInput.value = buildReminderText(e.target.value, pet, owner);
                }
            });
        }

        if (btnCopyReminderText) {
            btnCopyReminderText.addEventListener('click', () => {
                const contentInput = document.getElementById('reminderMessageContent');
                if (contentInput && contentInput.value) {
                    navigator.clipboard.writeText(contentInput.value).then(() => {
                        PawpalPets.showToast('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm!');
                    }).catch(() => {
                        contentInput.select();
                        document.execCommand('copy');
                        PawpalPets.showToast('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm!');
                    });
                }
            });
        }

        if (btnSubmitSendReminder) {
            btnSubmitSendReminder.addEventListener('click', () => {
                const targetRem = remindersData.find(r => r.id === currentSendingReminderId);
                if (targetRem) {
                    targetRem.status = 'SENT';
                    targetRem.statusText = 'Đã gửi Zalo vừa xong';
                    targetRem.statusBadgeClass = 'badge-success';
                    persistRemindersData();
                }
                renderRemindersTable();
                updateReminderKPIs();
                PawpalPets.showToast(`Đã gửi tin nhắn chăm sóc thành công tới chủ nuôi bé ${targetRem ? targetRem.petName : ''} qua Zalo Official Account!`);
                if (modalSendReminder) modalSendReminder.classList.remove('open');
            });
        }

        if (btnBatchSend) {
            btnBatchSend.addEventListener('click', () => {
                const unsentList = remindersData.filter(r => r.status === 'UNSENT');
                if (unsentList.length === 0) {
                    PawpalPets.showToast('Tất cả khách hàng trong danh sách đã được gửi tin nhắn chăm sóc gần đây!');
                    return;
                }

                PawpalPets.showPetConfirmModal({
                    title: 'Gửi tin nhắn chăm sóc Zalo ZNS',
                    message: `Bạn có chắc chắn muốn gửi tin nhắn chăm sóc tự động qua Zalo ZNS cho ${unsentList.length} bé cưng đang đến chu kỳ làm đẹp?`,
                    confirmText: 'Gửi tin nhắn Zalo',
                    onConfirm: () => {
                        unsentList.forEach(r => {
                            r.status = 'SENT';
                            r.statusText = 'Đã gửi Zalo vừa xong';
                            r.statusBadgeClass = 'badge-success';
                        });
                        persistRemindersData();
                        renderRemindersTable();
                        updateReminderKPIs();
                        PawpalPets.showToast(`Đã gửi tin nhắn chăm sóc đồng loạt thành công tới ${unsentList.length} chủ nuôi qua Zalo Official Account!`, 'success');
                    }
                });
            });
        }
    }

    PawpalPets.subtabs.reminders = {
        init: initRemindersTab,
        renderRemindersTable,
        updateReminderKPIs
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRemindersTab);
    } else {
        initRemindersTab();
    }
})();
