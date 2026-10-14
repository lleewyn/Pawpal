// tab-pet-reminders.js - Subtab Nhắc lịch chăm sóc, tiêm chủng & tái khám Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let remCurrentPage = 1;
    const REMINDERS_PER_PAGE = 10;
    let currentSendingReminderId = 'REM-001';

    function getRemindersData() {
        const reminders = [];
        const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const todayTime = Date.parse(today + 'T00:00:00+07:00');
        const completed = (PawpalPets.state.appointments || []).filter(a => a.appointment_status === 'COMPLETED');
        for (const pet of Object.values(PawpalPets.state.petsData || {})) {
            if (pet.isArchived) continue;
            const history = completed.filter(a => a.pet_id === pet.rawId);
            for (const rule of [{type:'BATH',days:14,pattern:/tắm|bath/i,label:'chưa tắm sấy'}, {type:'GROOM',days:30,pattern:/cắt tỉa|groom|tạo kiểu|style/i,label:'chưa cắt tỉa'}]) {
                const last = history.filter(a => rule.pattern.test(a.service?.service_name || '')).sort((a,b) => String(b.appointment_date).localeCompare(String(a.appointment_date)))[0];
                if (!last?.appointment_date) continue;
                const days = Math.floor((todayTime - Date.parse(last.appointment_date.slice(0,10)+'T00:00:00+07:00'))/86400000);
                if (!Number.isFinite(days) || days <= rule.days) continue;
                reminders.push({id:`${pet.rawId}:${rule.type}`,petId:pet.code,petName:pet.name,speciesBreed:pet.speciesBreed,ownerName:pet.ownerName,ownerPhone:pet.ownerPhone,custId:pet.custId,type:rule.type,typeText:`Quá ${days} ngày ${rule.label}`,typeBadgeClass:'badge-warning',typeBadgeStyle:'',lastDateText:PawpalPets.formatDate(last.appointment_date),status:'UNSENT',statusText:'Chưa ghi nhận gửi tin',statusBadgeClass:'badge-neutral'});
            }
        }
        return reminders;
    }
    let remindersData = [];

    function updateReminderKPIs() {
        if (!PawpalPets.state.isLoaded && !PawpalPets.state.loadError) return;
        remindersData = getRemindersData();
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
        if (!PawpalPets.state.isLoaded || PawpalPets.state.loadError) {
            if (PawpalPets.state.loadError) reminderTableTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;">Không thể tải nhắc lịch. Vui lòng tải lại trang.</td></tr>';
            else if (!reminderTableTbody.querySelector('.skeleton-row')) window.PawpalAdmin?.renderTableSkeleton?.(reminderTableTbody, {columns:6});
            return;
        }
        remindersData = getRemindersData();
        delete reminderTableTbody.dataset.loadingSkeleton;
        updateReminderKPIs();
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
            const canContact = Boolean(item.custId && String(item.ownerPhone || '').replace(/\D/g, '').length >= 9);
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
                            data-phone="${item.ownerPhone}"
                            ${canContact ? '' : 'disabled title="Chưa có chủ nuôi hoặc số điện thoại hợp lệ"'}>
                            ${canContact ? (item.status === 'SENT' ? 'Gửi lại' : 'Gửi tin') : 'Thiếu liên hệ'}
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

                const pet = btnReminder.getAttribute('data-pet') || 'Bé cưng';
                const owner = btnReminder.getAttribute('data-owner') || 'Chủ nuôi';
                const phone = btnReminder.getAttribute('data-phone') || '';
                if (!currentItem?.custId || phone.replace(/\D/g, '').length < 9) {
                    PawpalPets.showToast('Chưa có chủ nuôi hoặc số điện thoại hợp lệ để gửi nhắc lịch.', 'warning');
                    return;
                }

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

        btnSubmitSendReminder?.addEventListener('click', () => {
            PawpalPets.showToast('Mở Zalo và gửi nội dung đã sao chép cho chủ nuôi.', 'info');
        });
        btnBatchSend?.addEventListener('click', () => {
            PawpalPets.showToast('Chưa kết nối dịch vụ gửi tin đồng loạt. Vui lòng mở Zalo của từng chủ nuôi.', 'info');
        });
    }
    window.addEventListener('pawpal:pets-data-loaded', () => { renderRemindersTable(); updateReminderKPIs(); });

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
