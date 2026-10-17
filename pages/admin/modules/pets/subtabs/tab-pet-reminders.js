// tab-pet-reminders.js - Subtab Nhắc lịch chăm sóc, tiêm chủng & tái khám Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let remCurrentPage = 1;
    const REMINDERS_PER_PAGE = 10;
    let currentSendingReminderId = 'REM-001';
    const esc = (s) => (PawpalPets.escapeHtml ? PawpalPets.escapeHtml(s) : String(s || ''));

    function getSentReminders() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_admin_pet_reminders_sent') || '{}');
        } catch (e) {
            return {};
        }
    }

    function markReminderSent(remId, channel = 'ZALO') {
        const sentMap = getSentReminders();
        sentMap[remId] = {
            sentAt: new Date().toISOString(),
            channel
        };
        try {
            localStorage.setItem('pawpal_admin_pet_reminders_sent', JSON.stringify(sentMap));
        } catch (e) {}
    }

    function getRemindersData() {
        const reminders = [];
        const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const todayTime = Date.parse(today + 'T00:00:00+07:00');

        if ((!PawpalPets.state.appointments || PawpalPets.state.appointments.length === 0) && typeof PawpalPets.fetchRemindersAppointments === 'function' && !PawpalPets.state._remindersFetching) {
            PawpalPets.state._remindersFetching = true;
            PawpalPets.fetchRemindersAppointments().then(() => {
                PawpalPets.state._remindersFetching = false;
                renderRemindersTable();
                updateRemindersKPIs();
            }).catch(() => {
                PawpalPets.state._remindersFetching = false;
            });
        }

        const completed = (PawpalPets.state.appointments || []).filter(a => a.appointment_status === 'COMPLETED');
        const sentMap = getSentReminders();

        for (const pet of Object.values(PawpalPets.state.petsData || {})) {
            if (pet.isArchived) continue;
            const history = completed.filter(a => a.pet_id === pet.rawId);

            // Nhắc Spa & Grooming
            for (const rule of [{type:'BATH',days:14,pattern:/tắm|bath/i,label:'chưa tắm sấy'}, {type:'GROOM',days:30,pattern:/cắt tỉa|groom|tạo kiểu|style/i,label:'chưa cắt tỉa'}]) {
                const last = history.filter(a => rule.pattern.test(a.service?.service_name || '')).sort((a,b) => String(b.appointment_date).localeCompare(String(a.appointment_date)))[0];
                if (!last?.appointment_date) continue;
                const days = Math.floor((todayTime - Date.parse(last.appointment_date.slice(0,10)+'T00:00:00+07:00'))/86400000);
                if (!Number.isFinite(days) || days <= rule.days) continue;
                const remId = `${pet.rawId}:${rule.type}`;
                const isSent = Boolean(sentMap[remId]);
                reminders.push({
                    id: remId,
                    rawId: pet.rawId,
                    petId: pet.code,
                    petName: pet.name,
                    speciesBreed: pet.speciesBreed,
                    ownerName: pet.ownerName,
                    ownerPhone: pet.ownerPhone,
                    custId: pet.custId,
                    type: rule.type,
                    typeText: `Quá ${days} ngày ${rule.label}`,
                    typeBadgeClass: 'badge-warning',
                    typeBadgeStyle: '',
                    lastDateText: PawpalPets.formatDate(last.appointment_date),
                    status: isSent ? 'SENT' : 'UNSENT',
                    statusText: isSent ? 'Đã liên hệ' : 'Chưa ghi nhận gửi tin',
                    statusBadgeClass: isSent ? 'badge-success' : 'badge-neutral'
                });
            }

            // Nhắc Pet Hotel: Lưu trú trên 45 ngày trước
            const lastHotel = history.filter(a => /hotel|lưu trú|khách sạn/i.test(a.service?.service_name || '')).sort((a,b) => String(b.appointment_date).localeCompare(String(a.appointment_date)))[0];
            if (lastHotel?.appointment_date) {
                const daysHotel = Math.floor((todayTime - Date.parse(lastHotel.appointment_date.slice(0,10)+'T00:00:00+07:00'))/86400000);
                if (daysHotel > 45) {
                    const remId = `${pet.rawId}:HOTEL`;
                    const isSent = Boolean(sentMap[remId]);
                    reminders.push({
                        id: remId,
                        rawId: pet.rawId,
                        petId: pet.code,
                        petName: pet.name,
                        speciesBreed: pet.speciesBreed,
                        ownerName: pet.ownerName,
                        ownerPhone: pet.ownerPhone,
                        custId: pet.custId,
                        type: 'HOTEL',
                        typeText: `Quá ${daysHotel} ngày chưa lưu trú`,
                        typeBadgeClass: 'badge-info',
                        typeBadgeStyle: 'background-color: #E0F2FE; color: #0369A1;',
                        lastDateText: PawpalPets.formatDate(lastHotel.appointment_date),
                        status: isSent ? 'SENT' : 'UNSENT',
                        statusText: isSent ? 'Đã liên hệ' : 'Chưa ghi nhận gửi tin',
                        statusBadgeClass: isSent ? 'badge-success' : 'badge-neutral'
                    });
                }
            }

            // Cảnh báo tiêm chủng dại (chưa có ghi nhận vaccine dại)
            const hasRabies = /dại|rabies/i.test(pet.vaccinationHistory || pet.vaccine || '');
            if (!hasRabies) {
                const remId = `${pet.rawId}:HOTEL_VACCINE`;
                const isSent = Boolean(sentMap[remId]);
                reminders.push({
                    id: remId,
                    rawId: pet.rawId,
                    petId: pet.code,
                    petName: pet.name,
                    speciesBreed: pet.speciesBreed,
                    ownerName: pet.ownerName,
                    ownerPhone: pet.ownerPhone,
                    custId: pet.custId,
                    type: 'HOTEL_VACCINE',
                    typeText: 'Chưa có xác nhận vaccine dại',
                    typeBadgeClass: 'badge-warning',
                    typeBadgeStyle: 'background-color: #FEF3C7; color: #92400E;',
                    lastDateText: 'Chưa xác nhận',
                    status: isSent ? 'SENT' : 'UNSENT',
                    statusText: isSent ? 'Đã liên hệ' : 'Chưa ghi nhận gửi tin',
                    statusBadgeClass: isSent ? 'badge-success' : 'badge-neutral'
                });
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
                return `PawPal mến chào Sen ${ownerName}! Bé ${petName} đã đến kỳ tắm sấy và chăm sóc vệ sinh định kỳ tại PawPal Pet Center. Sen liên hệ với tiệm để được tư vấn và xếp lịch hẹn chu đáo nhất cho bé nhé!`;
            case 'GROOM':
                return `PawPal thân gửi Sen ${ownerName}! Bộ lông của bé ${petName} đã đến kỳ cắt tỉa tạo kiểu và gỡ rối định kỳ để bé luôn gọn gàng, thoáng mát. Sen đặt lịch làm đẹp cho bé tại PawPal nhé!`;
            case 'HOTEL':
                return `PawPal mến chào Sen ${ownerName}! Quý khách có kế hoạch đi xa hoặc công tác sắp tới? Phòng lưu trú Pet Hotel tại PawPal sẵn sàng đón tiếp bé ${petName} với camera 24/7 và chế độ chăm sóc tận tình. Sen liên hệ đặt phòng sớm nhé!`;
            case 'HOTEL_VACCINE':
                return `PawPal thông báo đến Sen ${ownerName}: Bé ${petName} cần được kiểm tra và cập nhật sổ tiêm chủng định kỳ tại cơ sở thú y. Để đảm bảo điều kiện an toàn dịch tễ khi lưu trú Pet Hotel, Sen nhớ kiểm tra lại lịch tiêm của bé nhé!`;
            case 'SHOP':
                return `PawPal nhắc nhỏ Sen ${ownerName}: Khẩu phần dinh dưỡng và đồ dùng chăm sóc của bé ${petName} dự kiến sắp cần bổ sung. Tiệm luôn sẵn sàng các sản phẩm chất lượng để phục vụ bé ạ!`;
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
            <tr data-rem-id="${esc(item.id)}">
                <td style="${borderStyle}">
                    <strong style="color: var(--text-heading);">${esc(item.petName)}</strong>
                    <div style="font-size: 12px; color: var(--text-muted);">${esc(item.speciesBreed)} • Mã: ${esc(item.petId)}</div>
                </td>
                <td>
                    <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${esc(item.custId)}">${esc(item.ownerName)}</a>
                    <div style="font-size: 12px; color: var(--text-muted);">${esc(item.ownerPhone)}</div>
                </td>
                <td>
                    <span class="admin-badge ${esc(item.typeBadgeClass)}" ${item.typeBadgeStyle ? `style="${item.typeBadgeStyle}"` : ''}>
                        ${esc(item.typeText)}
                    </span>
                </td>
                <td>${esc(item.lastDateText)}</td>
                <td>
                    <span class="admin-badge ${esc(item.statusBadgeClass)}">
                        ${esc(item.statusText)}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"
                            data-rem-id="${esc(item.id)}"
                            data-pet="${esc(item.petName)}"
                            data-owner="${esc(item.ownerName)}"
                            data-phone="${esc(item.ownerPhone)}"
                            ${canContact ? '' : 'disabled title="Chưa có chủ nuôi hoặc số điện thoại hợp lệ"'}>
                            ${canContact ? (item.status === 'SENT' ? 'Gửi lại' : 'Gửi tin') : 'Thiếu liên hệ'}
                        </button>
                        <button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa" 
                            data-id="${esc(item.petId)}" 
                            data-raw-id="${esc(item.rawId)}"
                            data-pet="${esc(item.petName)}"
                            data-owner="${esc(item.ownerName)}"
                            data-phone="${esc(item.ownerPhone)}">
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

        let remSearchTimer = null;
        if (reminderSearchInput) {
            reminderSearchInput.addEventListener('input', () => {
                clearTimeout(remSearchTimer);
                remSearchTimer = setTimeout(() => {
                    remCurrentPage = 1;
                    renderRemindersTable();
                }, 300);
            });
        }
        if (reminderFilterType) reminderFilterType.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });
        if (reminderFilterStatus) reminderFilterStatus.addEventListener('change', () => { remCurrentPage = 1; renderRemindersTable(); });

        renderRemindersTable();
        updateReminderKPIs();

        document.addEventListener('click', (e) => {
            // P-07: Xử lý nút Đặt lịch trực tiếp theo đúng pet của dòng được bấm
            const btnQuickBook = e.target.closest('.btn-quick-book-spa');
            if (btnQuickBook) {
                const rawId = btnQuickBook.getAttribute('data-raw-id');
                const petId = btnQuickBook.getAttribute('data-id');
                const targetId = rawId || petId;
                if (!targetId) {
                    PawpalPets.showToast('Không xác định được thú cưng để đặt lịch.', 'warning');
                    return;
                }
                PawpalPets.subtabs.list?.handleCreateServiceForPet?.(targetId);
                return;
            }

            // Chuyển sang tab hồ sơ khách hàng tương ứng
            const btnJumpCust = e.target.closest('.btn-jump-customer');
            if (btnJumpCust) {
                const custId = btnJumpCust.getAttribute('data-cust-id');
                if (custId && window.PawpalAdmin?.navigateToModule) {
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    window.PawpalAdmin.navigateToModule('customers', 'profile');
                }
                return;
            }

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

        // P-06: Ghi nhận trạng thái đã gửi/liên hệ
        btnSubmitSendReminder?.addEventListener('click', () => {
            if (currentSendingReminderId) {
                markReminderSent(currentSendingReminderId, 'ZALO');
                PawpalPets.showToast('Đã ghi nhận liên hệ nhắc lịch qua Zalo cho chủ nuôi!', 'success');
                modalSendReminder?.classList.remove('open');
                renderRemindersTable();
            } else {
                PawpalPets.showToast('Mở Zalo và gửi nội dung đã sao chép cho chủ nuôi.', 'info');
            }
        });
        btnOpenZaloChat?.addEventListener('click', () => {
            if (currentSendingReminderId) {
                markReminderSent(currentSendingReminderId, 'ZALO');
                renderRemindersTable();
            }
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
