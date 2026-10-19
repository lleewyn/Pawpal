// tab-service-catalog.js - Subtab Bảng giá và Danh mục Dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let currentCatalogGroup = 'spa';
    let catalogSearchTerm = '';
    let catalogFilterStatus = 'ALL';
    let currentEditingServiceSteps = [];
    let selectedPetTypes = ['Chó', 'Mèo'];
    const DEFAULT_PET_SPECIES = ['Chó', 'Mèo', 'Thỏ', 'Hamster', 'Bọ ú', 'Chim cảnh', 'Thú nhỏ'];
    let availablePetSpecies = [...DEFAULT_PET_SPECIES];
    const esc = (s) => (PawpalServices.escapeHtml ? PawpalServices.escapeHtml(s) : String(s || ''));

    function parsePetTypes(str) {
        if (!str) return ['Chó', 'Mèo'];
        if (Array.isArray(str)) return str;
        const parts = String(str)
            .split(/[\/,]| và | & /i)
            .map(s => s.trim())
            .filter(Boolean);
        return parts.length > 0 ? Array.from(new Set(parts)) : ['Chó', 'Mèo'];
    }

    function renderPetTypeTags() {
        const container = document.getElementById('servicePetTypeTagsContainer');
        const hiddenInput = document.getElementById('formServicePetType');
        const textInput = document.getElementById('formServicePetTypeInput');
        if (!container) return;

        container.querySelectorAll('.pet-type-tag-chip').forEach(c => c.remove());

        selectedPetTypes.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'pet-type-tag-chip';
            chip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; background: #EEF5F1; color: #236B48; padding: 3px 8px; border-radius: 9px; font-size: 12px; font-weight: 500;';
            chip.innerHTML = `
                <span>${tag}</span>
                <button type="button" class="btn-remove-pet-type-tag" data-tag="${tag}" style="background: none; border: none; color: #236B48; cursor: pointer; padding: 0 2px; font-size: 12px; font-weight: 700; line-height: 1;">✕</button>
            `;
            if (textInput) {
                container.insertBefore(chip, textInput);
            } else {
                container.appendChild(chip);
            }
        });

        if (hiddenInput) {
            hiddenInput.value = selectedPetTypes.join(', ');
        }

        container.querySelectorAll('.btn-remove-pet-type-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagToRemove = btn.getAttribute('data-tag');
                selectedPetTypes = selectedPetTypes.filter(t => t !== tagToRemove);
                renderPetTypeTags();
                renderPetTypeDropdown('');
            });
        });
    }

    function renderPetTypeDropdown(filterText = '') {
        const dropdown = document.getElementById('servicePetTypeDropdown');
        if (!dropdown) return;

        const q = (filterText || '').trim().toLowerCase();
        let list = availablePetSpecies.filter(s => !q || s.toLowerCase().includes(q));

        let html = '';
        if (list.length === 0 && q) {
            html += `
                <div class="pet-type-dropdown-item btn-add-custom-species" data-species="${filterText.trim()}" style="padding: 9px 12px; font-size: 13px; color: #236B48; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F4F2;">
                    <span>Thêm mới loài "${filterText.trim()}"</span>
                </div>
            `;
        } else {
            html = list.map(s => {
                const isSelected = selectedPetTypes.includes(s);
                return `
                    <div class="pet-type-dropdown-item" data-species="${s}" style="padding: 8px 12px; font-size: 13px; color: #203A2C; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F4F2; transition: background 0.15s ease;" onmouseover="this.style.background='#EEF5F1'" onmouseout="this.style.background='transparent'">
                        <span style="font-weight: ${isSelected ? '600' : '400'}; color: ${isSelected ? '#236B48' : '#203A2C'};">${s}</span>
                        ${isSelected ? '<span style="font-size: 11.5px; color: #236B48; font-weight: 600;">✓ Đã chọn</span>' : '<span style="font-size: 11.5px; color: var(--text-muted);">Thêm</span>'}
                    </div>
                `;
            }).join('');
        }

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';

        dropdown.querySelectorAll('.pet-type-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const spec = item.getAttribute('data-species');
                if (spec) {
                    if (selectedPetTypes.includes(spec)) {
                        selectedPetTypes = selectedPetTypes.filter(t => t !== spec);
                    } else {
                        selectedPetTypes.push(spec);
                        if (!availablePetSpecies.includes(spec)) availablePetSpecies.push(spec);
                    }
                    renderPetTypeTags();
                    const textInput = document.getElementById('formServicePetTypeInput');
                    if (textInput) {
                        textInput.value = '';
                        textInput.focus();
                    }
                    renderPetTypeDropdown('');
                }
            });
        });
    }

    function initPetTypeTagSelector() {
        const wrapper = document.getElementById('servicePetTypeTagWrapper');
        const container = document.getElementById('servicePetTypeTagsContainer');
        const textInput = document.getElementById('formServicePetTypeInput');
        const dropdown = document.getElementById('servicePetTypeDropdown');
        if (!wrapper || !container || !textInput) return;

        // Đồng bộ loài từ CSDL nếu có
        const servicesData = PawpalServices.state?.servicesData || [];
        servicesData.forEach(s => {
            if (s.petType) {
                const types = parsePetTypes(s.petType);
                types.forEach(t => {
                    if (!availablePetSpecies.includes(t)) availablePetSpecies.push(t);
                });
            }
        });

        container.addEventListener('click', () => {
            textInput.focus();
            renderPetTypeDropdown(textInput.value);
        });

        textInput.addEventListener('focus', () => {
            renderPetTypeDropdown(textInput.value);
        });

        textInput.addEventListener('input', () => {
            renderPetTypeDropdown(textInput.value);
        });

        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const val = textInput.value.replace(/,/g, '').trim();
                if (val && !selectedPetTypes.includes(val)) {
                    selectedPetTypes.push(val);
                    if (!availablePetSpecies.includes(val)) availablePetSpecies.push(val);
                    renderPetTypeTags();
                    textInput.value = '';
                    renderPetTypeDropdown('');
                }
            } else if (e.key === 'Backspace' && !textInput.value && selectedPetTypes.length > 0) {
                selectedPetTypes.pop();
                renderPetTypeTags();
                renderPetTypeDropdown('');
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                if (dropdown) dropdown.style.display = 'none';
            }
        });
    }

    const SOP_PRESETS = {
        SOP_SPA_FULL: [
            'Khám da lông và tư vấn liệu trình',
            'Vệ sinh tai, mắt và bấm móng',
            'Chải gỡ rối và cạo đệm chân',
            'Tắm thảo dược khử khuẩn lần 1',
            'Tắm dưỡng mượt lông lần 2',
            'Sấy khô và chải phồng tự nhiên',
            'Thoa tinh dầu dưỡng và xịt thơm'
        ],
        SOP_GROOMING_STYLE: [
            'Tiếp nhận và thảo luận mẫu tạo kiểu',
            'Vệ sinh thân thể và tắm sấy cơ bản',
            'Cắt tỉa định hình form toàn thân',
            'Tỉa chi tiết vùng mặt và chân tròn',
            'Khử khuẩn dụng cụ và vệ sinh tai',
            'Kiểm tra form dáng và bàn giao'
        ],
        SOP_PET_HOTEL: [
            'Tiếp nhận phòng và kiểm tra sức khỏe',
            'Bữa ăn sáng và cấp nước sạch',
            'Giờ vui chơi tự do có giám sát',
            'Bữa ăn chiều và kiểm tra chuồng',
            'Chải lông và vệ sinh đệm nằm',
            'Chụp ảnh gửi chủ nuôi báo cáo ngày'
        ],
        SOP_PET_TAXI: [
            'Tiếp nhận tại nhà và kiểm tra lồng vận chuyển',
            'Di chuyển an toàn theo lộ trình định vị',
            'Bàn giao tại cơ sở hoặc điểm đến',
            'Khử khuẩn khoang xe và lồng vận chuyển'
        ]
    };

    function getDefaultStepsForGroup(group) {
        if (group === 'hotel') return [...SOP_PRESETS.SOP_PET_HOTEL];
        if (group === 'taxi') return [...SOP_PRESETS.SOP_PET_TAXI];
        return [...SOP_PRESETS.SOP_SPA_FULL];
    }

    function renderServiceSteps() {
        const container = document.getElementById('serviceStepsListContainer');
        if (!container) return;

        if (currentEditingServiceSteps.length === 0) {
            container.innerHTML = `
                <div style="font-size: 12.5px; color: var(--text-muted); padding: 8px 12px; background: #FAFDFB; border-radius: 9px; text-align: center;">
                    Chưa có bước quy trình nào. Vui lòng chọn mẫu có sẵn hoặc thêm bước bên dưới.
                </div>
            `;
            return;
        }

        container.innerHTML = currentEditingServiceSteps.map((step, idx) => `
            <div class="service-step-item" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: #EEF5F1; border-radius: 9px; margin-bottom: 6px; gap: 8px;">
                <div style="font-size: 12.5px; color: #203A2C;">
                    <strong style="color: #236B48; margin-right: 6px;">Bước ${idx + 1}:</strong>
                    <span>${step}</span>
                </div>
                <button type="button" class="btn-remove-sop-step" data-step-index="${idx}" style="background: none; border: none; color: #DC2626; font-size: 12px; font-weight: 500; cursor: pointer; padding: 2px 6px;">Xóa</button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-remove-sop-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const idx = parseInt(btn.getAttribute('data-step-index'), 10);
                if (!isNaN(idx)) {
                    currentEditingServiceSteps.splice(idx, 1);
                    renderServiceSteps();
                }
            });
        });
    }

    function renderCatalogTable() {
        const tbody = document.getElementById('servicesCatalogTableBody');
        if (!tbody) return;
        if (PawpalServices.state.loadError || !PawpalServices.state.isLoaded) {
            if (PawpalServices.state.loadError) {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:28px;">Không thể tải dữ liệu dịch vụ. Vui lòng tải lại trang.</td></tr>';
            }
            return;
        }
        delete tbody.dataset.loadingSkeleton;


        const servicesData = PawpalServices.state?.servicesData || [];
        const toUnaccent = PawpalServices.toUnaccent || (str => str);

        let filtered = servicesData.filter(svc => {
            const svcGrp = (svc.group || svc.category || 'spa').toLowerCase();
            if (svcGrp !== currentCatalogGroup.toLowerCase()) {
                return false;
            }

            if (catalogSearchTerm) {
                const termUnaccent = toUnaccent(catalogSearchTerm);
                const termRaw = catalogSearchTerm.toLowerCase().trim();
                const matchName = toUnaccent(svc.name || '').includes(termUnaccent) || (svc.name || '').toLowerCase().includes(termRaw);
                const matchCode = (svc.code || svc.id || '').toLowerCase().includes(termRaw);
                if (!matchName && !matchCode) return false;
            }

            if (catalogFilterStatus !== 'ALL') {
                if (catalogFilterStatus === 'Đang phục vụ' && svc.status !== 'Đang phục vụ') return false;
                if (catalogFilterStatus === 'Tạm ẩn' && svc.status !== 'Tạm ẩn') return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px;">
                        Không có dịch vụ nào phù hợp với bộ lọc trong danh mục này.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(svc => {
            const isHidden = svc.status === 'Tạm ẩn';
            const prices = svc.prices || {
                under5: '120.000',
                to10: '150.000',
                to20: '200.000',
                over20: '250.000'
            };

            const minPrice = prices.under5 || '120.000';
            const groupName = svc.group === 'hotel' ? 'Pet Hotel' : (svc.group === 'taxi' ? 'Pet Taxi' : 'Spa và Grooming');
            const stepCount = (svc.steps && svc.steps.length) || (svc.group === 'taxi' ? 4 : (svc.group === 'hotel' ? 6 : 7));

            return `
                <tr class="${isHidden ? 'row-locked' : ''}" data-service-code="${esc(svc.code || svc.id)}">
                    <td style="text-align: center;">
                        <img src="${esc(svc.image || '/assets/images/services/spa/process/spa01.webp')}" class="service-thumb-cell" alt="${esc(svc.name)}" style="width: 38px; height: 38px; border-radius: 9px; object-fit: cover;">
                    </td>
                    <td>
                        <span style="font-weight: 600; color: #203A2C; font-size: 13px;">${esc(svc.code || svc.id)}</span>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${esc(svc.name)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(svc.desc || 'Chăm sóc toàn diện')}</div>
                    </td>
                    <td>${esc(groupName)}</td>
                    <td>${esc(svc.petType || 'Chó và Mèo')}</td>
                    <td>${esc(svc.duration || '60 phút')}</td>
                    <td style="font-weight: 600; color: #236B48;">${esc(minPrice)} đ</td>
                    <td>
                        <button type="button" class="btn-view-sop-pill btn-view-service-sop" data-service-code="${esc(svc.code || svc.id)}" title="Xem quy trình chuẩn SOP">${stepCount} bước</button>
                    </td>
                    <td>
                        ${(svc.averageRating != null && svc.reviewCount > 0) ? `
                            <button type="button" class="catalog-rating-link btn-view-service-reviews" data-service-id="${esc(svc.dbId)}" data-service-code="${esc(svc.code || svc.id)}" data-service-name="${esc(svc.name)}" title="Xem ${svc.reviewCount} lượt đánh giá của ${esc(svc.name)}" style="background: transparent; border: none; outline: none; padding: 2px 4px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="star-rating-pill" style="font-size: 12.5px; font-weight: 700; color: #D97706;">${svc.averageRating.toFixed(1)} ★</span>
                                <span class="reviews-count-text" style="font-size: 11.5px; color: var(--text-muted);">· ${svc.reviewCount} lượt</span>
                            </button>
                        ` : `
                            <span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có đánh giá</span>
                        `}
                    </td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${isHidden ? 'badge-neutral' : 'badge-success'}">${esc(svc.status || 'Đang phục vụ')}</span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-edit-catalog-service" data-service-code="${esc(svc.code || svc.id)}">Sửa</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-view-service-reviews').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sId = btn.getAttribute('data-service-id');
                const sCode = btn.getAttribute('data-service-code');
                const sName = btn.getAttribute('data-service-name');
                if (PawpalServices.subtabs?.reviews?.filterByService) {
                    PawpalServices.subtabs.reviews.filterByService(sId, sCode, sName);
                }
                PawpalServices.switchSubtab('tab-service-reviews');
            });
        });

        tbody.querySelectorAll('.btn-view-service-sop').forEach(btn => {
            btn.addEventListener('click', () => {
                const sCode = btn.getAttribute('data-service-code');
                openSopDetailsModal(sCode);
            });
        });

        tbody.querySelectorAll('.btn-edit-catalog-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const sCode = btn.getAttribute('data-service-code');
                openEditServiceModal(sCode);
            });
        });
    }

    function openSopDetailsModal(serviceCode) {
        const servicesData = PawpalServices.state?.servicesData || [];
        const svc = servicesData.find(s => s.code === serviceCode || s.id === serviceCode);
        const modal = document.getElementById('modalViewSopDetails');
        if (!modal) return;

        const titleEl = document.getElementById('sopViewerTitle');
        const metaEl = document.getElementById('sopViewerMeta');
        const container = document.getElementById('sopViewerStepsList');

        const sName = svc ? svc.name : 'Gói cắt tỉa tạo kiểu';
        const sCode = svc ? (svc.code || svc.id) : 'SPA02';
        const sGroup = svc ? (svc.group === 'hotel' ? 'Pet Hotel' : (svc.group === 'taxi' ? 'Pet Taxi' : 'Spa và Grooming')) : 'Spa và Grooming';
        const sDuration = svc ? (svc.duration || '60 phút') : '90 phút';
        const sCommission = svc ? (svc.commission || 15) : 15;

        if (titleEl) titleEl.textContent = `Quy trình chuẩn: ${sName}`;
        if (metaEl) {
            metaEl.innerHTML = `Mã gói ${sCode} • Nhóm ${sGroup} • Thời lượng ${sDuration} • Hoa hồng KTV ${sCommission}%`;
        }

        const steps = (svc && svc.steps && svc.steps.length > 0) ? svc.steps : getDefaultStepsForGroup(svc ? svc.group : 'spa');

        if (container) {
            container.innerHTML = steps.map((step, idx) => {
                const stepNum = idx + 1;
                return `
                    <div class="sop-flow-step-item">
                        <div class="sop-flow-step-badge">Bước ${stepNum}</div>
                        <div class="sop-flow-step-content">
                            <div class="sop-flow-step-title">${step}</div>
                            <div style="font-size: 11.5px; color: var(--text-muted);">Áp dụng quy chuẩn kỹ thuật và giám sát Care-Log PawPal.</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    function openCreateServiceModal() {
        const modal = document.getElementById('modalServiceForm');
        if (!modal) return;

        const titleEl = document.getElementById('serviceFormModalTitle');
        if (titleEl) titleEl.textContent = 'Thêm dịch vụ mới';

        const hiddenCode = document.getElementById('editServiceCodeHidden');
        if (hiddenCode) hiddenCode.value = '';

        const form = document.getElementById('formServiceItem');
        if (form) form.reset();

        // Đặt mặc định theo group đang chọn
        const groupSelect = document.getElementById('formServiceGroup');
        if (groupSelect) {
            groupSelect.value = currentCatalogGroup === 'hotel' ? 'Hotel' : (currentCatalogGroup === 'taxi' ? 'Taxi' : 'Spa');
        }

        const idInput = document.getElementById('formServiceId');
        if (idInput) {
            const prefix = currentCatalogGroup === 'hotel' ? 'HTL' : (currentCatalogGroup === 'taxi' ? 'TXI' : 'SPA');
            const randNum = Math.floor(10 + Math.random() * 90);
            idInput.value = `${prefix}${randNum}`;
        }

        const durationInput = document.getElementById('formServiceDuration');
        if (durationInput) {
            durationInput.value = currentCatalogGroup === 'hotel' ? 'Theo ngày' : (currentCatalogGroup === 'taxi' ? 'Theo km' : '60 phút');
        }

        const pUnder5 = document.getElementById('formPriceUnder5');
        const p5To10 = document.getElementById('formPrice5To10');
        const p10To20 = document.getElementById('formPrice10To20');
        const pOver20 = document.getElementById('formPriceOver20');

        if (currentCatalogGroup === 'hotel') {
            if (pUnder5) pUnder5.value = '200.000';
            if (p5To10) p5To10.value = '280.000';
            if (p10To20) p10To20.value = '350.000';
            if (pOver20) pOver20.value = '450.000';
        } else if (currentCatalogGroup === 'taxi') {
            if (pUnder5) pUnder5.value = '50.000';
            if (p5To10) p5To10.value = '70.000';
            if (p10To20) p10To20.value = '100.000';
            if (pOver20) pOver20.value = '130.000';
        } else {
            if (pUnder5) pUnder5.value = '120.000';
            if (p5To10) p5To10.value = '150.000';
            if (p10To20) p10To20.value = '200.000';
            if (pOver20) pOver20.value = '250.000';
        }

        currentEditingServiceSteps = getDefaultStepsForGroup(currentCatalogGroup);
        renderServiceSteps();

        selectedPetTypes = ['Chó', 'Mèo'];
        renderPetTypeTags();

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    function openEditServiceModal(serviceCode) {
        const servicesData = PawpalServices.state?.servicesData || [];
        const svc = servicesData.find(s => s.code === serviceCode || s.id === serviceCode);
        const modal = document.getElementById('modalServiceForm');
        if (!modal) return;

        const titleEl = document.getElementById('serviceFormModalTitle');
        if (titleEl) titleEl.textContent = 'Chỉnh sửa dịch vụ';

        const hiddenCode = document.getElementById('editServiceCodeHidden');
        if (hiddenCode) hiddenCode.value = serviceCode || '';

        if (svc) {
            const idInput = document.getElementById('formServiceId');
            const groupSelect = document.getElementById('formServiceGroup');
            const nameInput = document.getElementById('formServiceName');
            const durationInput = document.getElementById('formServiceDuration');
            const descInput = document.getElementById('formServiceDesc');
            const commInput = document.getElementById('formServiceCommission');
            const staffLevelSelect = document.getElementById('formServiceStaffLevel');
            const statusSelect = document.getElementById('formServiceStatus');

            if (idInput) idInput.value = svc.code || svc.id || '';
            if (groupSelect) groupSelect.value = svc.group === 'hotel' ? 'Hotel' : (svc.group === 'taxi' ? 'Taxi' : 'Spa');
            if (nameInput) nameInput.value = svc.name || '';
            if (durationInput) durationInput.value = svc.duration || '60 phút';
            if (descInput) descInput.value = svc.desc || '';
            if (commInput) commInput.value = svc.commission || 15;
            if (staffLevelSelect) staffLevelSelect.value = svc.staffLevel || 'Junior Groomer';
            if (statusSelect) statusSelect.value = svc.status || 'Đang phục vụ';

            selectedPetTypes = parsePetTypes(svc.petType);
            renderPetTypeTags();

            const prices = svc.prices || {};
            const pUnder5 = document.getElementById('formPriceUnder5');
            const p5To10 = document.getElementById('formPrice5To10');
            const p10To20 = document.getElementById('formPrice10To20');
            const pOver20 = document.getElementById('formPriceOver20');

            if (pUnder5) pUnder5.value = prices.under5 || '120.000';
            if (p5To10) p5To10.value = prices.to10 || '150.000';
            if (p10To20) p10To20.value = prices.to20 || '200.000';
            if (pOver20) pOver20.value = prices.over20 || '250.000';

            currentEditingServiceSteps = (svc.steps && svc.steps.length > 0) ? [...svc.steps] : getDefaultStepsForGroup(svc.group);
            renderServiceSteps();
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    async function handleSaveService() {
        const idInput = document.getElementById('formServiceId');
        const nameInput = document.getElementById('formServiceName');
        const durationInput = document.getElementById('formServiceDuration');
        const groupSelect = document.getElementById('formServiceGroup');
        const petTypeInput = document.getElementById('formServicePetType');
        const descInput = document.getElementById('formServiceDesc');
        const statusSelect = document.getElementById('formServiceStatus');
        const hiddenCode = document.getElementById('editServiceCodeHidden');

        const sCode = idInput?.value.trim();
        const sName = nameInput?.value.trim();
        const sDuration = durationInput?.value.trim();

        if (!sCode || !sName || !sDuration) {
            alert('Vui lòng điền đầy đủ Mã dịch vụ, Tên dịch vụ và Thời lượng thực hiện.');
            return;
        }

        const groupVal = (groupSelect?.value || 'Spa').toLowerCase();
        const groupKey = groupVal === 'hotel' ? 'hotel' : (groupVal === 'taxi' ? 'taxi' : 'spa');

        const pUnder5 = document.getElementById('formPriceUnder5')?.value.trim() || '120.000';
        const p5To10 = document.getElementById('formPrice5To10')?.value.trim() || '150.000';
        const p10To20 = document.getElementById('formPrice10To20')?.value.trim() || '200.000';
        const pOver20 = document.getElementById('formPriceOver20')?.value.trim() || '250.000';

        const serviceObj = {
            id: sCode,
            code: sCode,
            name: sName,
            group: groupKey,
            category: groupKey,
            petType: selectedPetTypes.join(', ') || 'Chó, Mèo',
            duration: sDuration,
            desc: descInput?.value.trim() || '',
            status: statusSelect?.value || 'Đang phục vụ',
            commission: parseInt(document.getElementById('formServiceCommission')?.value, 10) || 15,
            staffLevel: document.getElementById('formServiceStaffLevel')?.value || 'Junior Groomer',
            prices: {
                under5: pUnder5,
                to10: p5To10,
                to20: p10To20,
                over20: pOver20
            },
            steps: [...currentEditingServiceSteps],
            image: groupKey === 'hotel' ? '/assets/images/services/hotel/deluxe.webp' : (groupKey === 'taxi' ? '/assets/images/services/taxi/car.webp' : '/assets/images/services/spa/process/spa01.webp')
        };

        const servicesData = PawpalServices.state?.servicesData || [];
        const isEditing = Boolean(hiddenCode?.value);

        // Ghi Supabase trước; không đổi state hoặc báo thành công khi CSDL lỗi.
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) {
            PawpalServices.showToast?.('Không có kết nối CSDL để lưu dịch vụ.', 'danger');
            return;
        }
        try {
            const { data, error } = await db.from('service').upsert({
                    service_code: sCode,
                    service_name: sName,
                    // Giá trị phải khớp enum service_category_enum trên Supabase.
                    service_category: groupKey === 'hotel' ? 'PET_HOTEL' : (groupKey === 'taxi' ? 'PET_TAXI' : 'GROOMING_SPA'),
                    estimated_duration: parseInt(sDuration, 10) || 60,
                    description: serviceObj.desc,
                    status: serviceObj.status === 'Đang phục vụ' ? 'ACTIVE' : 'INACTIVE',
                    checklist: serviceObj.steps
                }, { onConflict: 'service_code' }).select('id, service_code').single();
            if (error) throw error;
            if (!data?.id || data.service_code !== sCode) throw new Error('Không xác minh được dịch vụ đã lưu.');

            // Ma trận giá là bảng quan hệ riêng, không nằm trong bảng service.
            // Đóng hiệu lực mức giá cũ trước khi tạo bộ giá mới để vẫn giữ lịch sử.
            const amount = (value) => Number(String(value || '').replace(/[^\d]/g, ''));
            const priceRows = [
                [0, 5, amount(pUnder5)],
                [5, 10, amount(p5To10)],
                [10, 20, amount(p10To20)],
                // Schema dùng numeric giới hạn; 999.99 vẫn biểu diễn đúng khoảng trên 20 kg
                // mà không làm tràn cột weight_to.
                [20, 999.99, amount(pOver20)]
            ].map(([weight_from, weight_to, unit_price]) => ({
                service_id: data.id,
                weight_from,
                weight_to,
                unit_price,
                effective_from: new Date().toISOString(),
                effective_to: null,
                status: 'ACTIVE'
            }));
            if (priceRows.some(row => !Number.isSafeInteger(row.unit_price) || row.unit_price < 0)) {
                throw new Error('Giá dịch vụ không hợp lệ.');
            }
            const now = new Date().toISOString();
            const { error: archivePriceError } = await db.from('service_price_matrix')
                .update({ status: 'INACTIVE', effective_to: now })
                .eq('service_id', data.id)
                .eq('status', 'ACTIVE')
                .is('effective_to', null);
            if (archivePriceError) throw archivePriceError;
            const { data: savedPrices, error: priceError } = await db.from('service_price_matrix')
                .insert(priceRows)
                .select('id, unit_price');
            if (priceError) {
                // Rollback: khôi phục trạng thái ACTIVE cho bộ giá vừa bị lưu trữ
                await db.from('service_price_matrix')
                    .update({ status: 'ACTIVE', effective_to: null })
                    .eq('service_id', data.id)
                    .eq('effective_to', now);
                throw priceError;
            }
            if (savedPrices?.length !== priceRows.length) throw new Error('Không xác minh được ma trận giá đã lưu.');
            await PawpalServices.loadServicesData({ force: true });
        } catch (err) {
            PawpalServices.showToast?.('Không thể lưu dịch vụ: ' + err.message, 'danger');
            return;
        }

        // Đóng modal
        const modal = document.getElementById('modalServiceForm');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }

        if (PawpalServices.showToast) {
            PawpalServices.showToast(isEditing ? 'Đã cập nhật dịch vụ thành công!' : 'Đã thêm dịch vụ mới thành công!');
        }

        renderCatalogTable();
    }

    function initCatalogSubtab() {
        // Tabs chuyển nhóm dịch vụ
        document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCatalogGroup = btn.getAttribute('data-group') || btn.getAttribute('data-catalog-group') || 'spa';
                renderCatalogTable();
            });
        });

        // Tìm kiếm và lọc trạng thái
        const searchInput = document.getElementById('catalogSearchInput');
        let catalogSearchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(catalogSearchTimer);
                catalogSearchTimer = setTimeout(() => {
                    catalogSearchTerm = searchInput.value.trim();
                    renderCatalogTable();
                }, 300);
            });
        }

        const filterStatus = document.getElementById('catalogFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                catalogFilterStatus = filterStatus.value;
                renderCatalogTable();
            });
        }

        // Nút mở modal thêm dịch vụ mới
        const btnOpenCreateService = document.getElementById('btnOpenCreateServiceModal');
        if (btnOpenCreateService) {
            btnOpenCreateService.addEventListener('click', openCreateServiceModal);
        }

        // Nút lưu dịch vụ trong modal
        const btnSubmitService = document.getElementById('btnSubmitServiceForm');
        if (btnSubmitService) {
            btnSubmitService.addEventListener('click', handleSaveService);
            btnSubmitService.dataset.catalogSaveBound = 'true';
        }

        // Chọn mẫu SOP có sẵn
        const presetSelect = document.getElementById('serviceSopPresetSelect');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                const val = presetSelect.value;
                if (SOP_PRESETS[val]) {
                    currentEditingServiceSteps = [...SOP_PRESETS[val]];
                    renderServiceSteps();
                }
            });
        }

        // Thêm bước mới
        const btnAddStep = document.getElementById('btnAddStepToService');
        const inputNewStep = document.getElementById('newServiceStepInput');
        if (btnAddStep && inputNewStep) {
            btnAddStep.addEventListener('click', () => {
                const txt = inputNewStep.value.trim();
                if (txt) {
                    currentEditingServiceSteps.push(txt);
                    inputNewStep.value = '';
                    renderServiceSteps();
                }
            });

            inputNewStep.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    btnAddStep.click();
                }
            });
        }

        initPetTypeTagSelector();
        renderCatalogTable();
    }

    PawpalServices.subtabs.catalog = {
        init: initCatalogSubtab,
        renderCatalogTable,
        openEditServiceModal,
        openCreateServiceModal,
        openSopDetailsModal
    };

    // Nội dung subtab được admin render động. Bắt tại document (capture) để
    // form được thay thế vẫn lưu đúng một lần và không bị listener cũ gọi lặp.
    window.__pawpalCatalogSaveHandler = handleSaveService;
    if (!window.__pawpalCatalogSaveCaptureBound) {
        window.__pawpalCatalogSaveCaptureBound = true;
        document.addEventListener('click', (event) => {
            const button = event.target.closest?.('#btnSubmitServiceForm');
            if (!button) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            window.__pawpalCatalogSaveHandler?.();
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalogSubtab);
    } else {
        initCatalogSubtab();
    }
})();
