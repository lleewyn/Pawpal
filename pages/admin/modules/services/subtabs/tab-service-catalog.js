// tab-service-catalog.js - Subtab Bảng giá và Danh mục Dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let currentCatalogGroup = 'spa';
    let catalogPage=1;
    let catalogSearchTerm = '';
    let catalogFilterStatus = 'ALL';
    let currentEditingServiceSteps = [];
    let selectedPetTypes = [];
    let availablePetSpecies = [];
    let editingVariantRows = [];
    const esc = (s) => (PawpalServices.escapeHtml ? PawpalServices.escapeHtml(s) : String(s || ''));

    function renderVariantEditor(service) {
        editingVariantRows = service?.priceRows || [];
        const editor = document.getElementById('serviceVariantEditor');
        const legacy = document.getElementById('formReplaceServicePrices').closest('.form-group-item');
        legacy.hidden = editingVariantRows.length > 0;
        legacy.style.display = editingVariantRows.length ? 'none' : '';
        editor.hidden = !editingVariantRows.length;
        editor.style.display = editingVariantRows.length ? '' : 'none';
        editor.innerHTML = editingVariantRows.length ? `<label class="form-label-clean">Biến thể và giá dịch vụ</label><div style="overflow-x:auto;overscroll-behavior:contain"><table class="admin-table" style="min-width:0;width:100%;table-layout:fixed"><thead><tr><th style="width:44%">Biến thể</th><th>Giá niêm yết</th>${service.group==='spa'?'<th>Thời lượng (phút)</th>':''}</tr></thead><tbody>${editingVariantRows.map((p,i)=>`<tr><td><strong>${esc(p.variant_code||'')}</strong><div style="color:var(--text-muted);font-size:11.5px">${esc(p.variant_condition||'')}${p.distance_from!=null?` · ${Number(p.distance_from)}–${Number(p.distance_to)} km`:''}</div></td><td><input type="number" min="0" step="1" class="admin-input" aria-label="Giá ${esc(p.variant_code)}" data-variant-price="${i}" value="${Number(p.unit_price)}"/></td>${service.group==='spa'?`<td><input type="number" min="1" max="10080" step="1" class="admin-input" aria-label="Thời lượng ${esc(p.variant_code)}" data-variant-duration="${i}" value="${Number(p.duration_minutes||service.durationMinutes)}"/></td>`:''}</tr>`).join('')}</tbody></table></div>` : '';
    }

    function parsePetTypes(str) {
        if (!str) return [];
        if (Array.isArray(str)) return str;
        const parts = String(str)
            .split(/[\/,]| và | & /i)
            .map(s => s.trim())
            .filter(Boolean);
        return parts.length > 0 ? Array.from(new Set(parts)) : [];
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
                <span>${esc(tag)}</span>
                <button type="button" class="btn-remove-pet-type-tag" data-tag="${esc(tag)}" style="background: none; border: none; color: #236B48; cursor: pointer; padding: 0 2px; font-size: 12px; font-weight: 700; line-height: 1;">✕</button>
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
        availablePetSpecies=(PawpalServices.state.liveSpecies||[]).map(s=>s.species_name);
        let list = availablePetSpecies.filter(s => !q || s.toLowerCase().includes(q));

        let html = '';
        if (list.length === 0 && q) {
            html = '<div style="padding:9px 12px;">Không tìm thấy loài trong danh mục.</div>';
        } else {
            html = list.map(s => {
                const isSelected = selectedPetTypes.includes(s);
                return `
                    <div class="pet-type-dropdown-item" data-species="${esc(s)}" style="padding: 8px 12px; font-size: 13px; color: #203A2C; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F4F2; transition: background 0.15s ease;" onmouseover="this.style.background='#EEF5F1'" onmouseout="this.style.background='transparent'">
                        <span style="font-weight: ${isSelected ? '600' : '400'}; color: ${isSelected ? '#236B48' : '#203A2C'};">${esc(s)}</span>
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
                if (availablePetSpecies.includes(val) && !selectedPetTypes.includes(val)) {
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

    function getDefaultStepsForGroup() { return []; }

    function renderServiceSteps() {
        const container = document.getElementById('serviceStepsListContainer');
        if (!container) return;

        if (currentEditingServiceSteps.length === 0) {
            container.innerHTML = `
                <div style="font-size: 12.5px; color: var(--text-muted); padding: 8px 12px; background: #FAFDFB; border-radius: 9px; text-align: center;">
                    Chưa có bước quy trình nào. Nhập các bước thực tế bên dưới.
                </div>
            `;
            return;
        }

        container.innerHTML = currentEditingServiceSteps.map((step, idx) => `
            <div class="service-step-item" style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: #EEF5F1; border-radius: 9px; margin-bottom: 6px; gap: 8px;">
                <div style="font-size: 12.5px; color: #203A2C;">
                    <strong style="color: #236B48; margin-right: 6px;">Bước ${idx + 1}:</strong>
                    <span>${esc(step)}</span>
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
        let pager=document.getElementById('servicesCatalogPagination');
        if(!pager){pager=document.createElement('div');pager.id='servicesCatalogPagination';pager.className='pagination-container';pager.style.cssText='display:flex;justify-content:center;gap:4px;background:transparent;border:none;padding:2px 0;margin-top:-6px;';tbody.closest('.service-master-card').after(pager);}
        pager.replaceChildren();
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

        const pages=Math.ceil(filtered.length/10);catalogPage=Math.min(Math.max(catalogPage,1),Math.max(pages,1));
        if(pages>1)for(const [label,page] of [['<',catalogPage-1],...Array.from({length:pages},(_,i)=>[String(i+1),i+1]),['>',catalogPage+1]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.className='btn-pagination'+(String(catalogPage)===label?' active':'');button.disabled=page<1||page>pages;button.onclick=()=>{catalogPage=page;renderCatalogTable();};pager.append(button);}
        filtered=filtered.slice((catalogPage-1)*10,catalogPage*10);
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
            const minPrice = svc.minPrice != null ? svc.minPrice.toLocaleString('vi-VN')+' đ' : 'Chưa có giá theo cân nặng';
            const groupName = svc.group === 'hotel' ? 'Pet Hotel' : (svc.group === 'taxi' ? 'Pet Taxi' : 'Spa và Grooming');
            const stepCount = svc.steps?.length || 0;

            return `
                <tr class="${isHidden ? 'row-locked' : ''}" data-service-code="${esc(svc.code || svc.id)}">
                    <td style="text-align: center;">
                        ${svc.image ? `<img src="${esc(svc.image)}" class="service-thumb-cell" alt="${esc(svc.name)}" style="width:38px;height:38px;border-radius:9px;object-fit:cover;">` : '—'}
                    </td>
                    <td>
                        <span style="font-weight: 600; color: #203A2C; font-size: 13px;">${esc(svc.code || svc.id)}</span>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${esc(svc.name)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(svc.desc || '')}</div>
                    </td>
                    <td>${esc(groupName)}</td>
                    <td>${esc(svc.petType || 'Chưa khai báo')}</td>
                    <td>${esc(svc.duration || 'Chưa khai báo')}</td>
                    <td style="font-weight: 600; color: #236B48;">${esc(minPrice)}</td>
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

        if(!svc)return;
        const sName = svc.name;
        const sCode = svc ? (svc.code || svc.id) : 'SPA02';
        const sGroup = svc ? (svc.group === 'hotel' ? 'Pet Hotel' : (svc.group === 'taxi' ? 'Pet Taxi' : 'Spa và Grooming')) : 'Spa và Grooming';
        const sDuration = svc?.duration || 'Chưa khai báo';
        const sCommission = svc.commission ?? 'Chưa cấu hình';

        if (titleEl) titleEl.textContent = `Quy trình chuẩn: ${sName}`;
        if (metaEl) {
            metaEl.textContent = `Mã gói ${sCode} • Nhóm ${sGroup} • Thời lượng ${sDuration} • Hoa hồng KTV ${sCommission}%`;
        }

        const steps = svc.steps || [];
        if(container&&!steps.length){container.textContent='Chưa có quy trình được lưu cho dịch vụ này.';modal.classList.add('active');modal.style.display='flex';return;}

        if (container) {
            container.innerHTML = steps.map((step, idx) => {
                const stepNum = idx + 1;
                return `
                    <div class="sop-flow-step-item">
                        <div class="sop-flow-step-badge">Bước ${stepNum}</div>
                        <div class="sop-flow-step-content">
                            <div class="sop-flow-step-title">${esc(step)}</div>
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

    function configureCatalogForm() {
        const select=document.getElementById('formServiceStaffLevel');
        select?.replaceChildren(new Option('Không yêu cầu cấp độ',''),...(PawpalServices.state.liveLevels||[]).map(l=>new Option(l.level_name,l.id)));
        availablePetSpecies=(PawpalServices.state.liveSpecies||[]).map(s=>s.species_name);
    }
    function openCreateServiceModal() {
        configureCatalogForm();
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
            const randNum = crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase();
            idInput.value = `${prefix}${randNum}`;
        }

        document.getElementById('formServiceDuration').value='';
        document.getElementById('formServiceBenefits').value='';
        document.getElementById('formServiceAmenities').value='';
        renderVariantEditor(null);
        for(const id of ['formPriceUnder5','formPrice5To10','formPrice10To20','formPriceOver20','formServiceCommission'])document.getElementById(id).value='';
        document.getElementById('formReplaceServicePrices').checked=false;
        currentEditingServiceSteps=[];renderServiceSteps();selectedPetTypes=[];
        renderPetTypeTags();

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    function openEditServiceModal(serviceCode) {
        configureCatalogForm();
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
            if (durationInput) durationInput.value = svc.durationMinutes || '';
            document.getElementById('formServiceBenefits').value=svc.benefits||'';
            document.getElementById('formServiceAmenities').value=svc.amenities||'';
            renderVariantEditor(svc);
            if (descInput) descInput.value = svc.desc || '';
            if (commInput) commInput.value = svc.commission ?? '';
            if (staffLevelSelect) staffLevelSelect.value = svc.staffLevelId || '';
            if (statusSelect) statusSelect.value = svc.status || 'Đang phục vụ';

            document.getElementById('formReplaceServicePrices').checked=false;
            selectedPetTypes = parsePetTypes(svc.petType);
            renderPetTypeTags();

            const prices = svc.prices || {};
            const pUnder5 = document.getElementById('formPriceUnder5');
            const p5To10 = document.getElementById('formPrice5To10');
            const p10To20 = document.getElementById('formPrice10To20');
            const pOver20 = document.getElementById('formPriceOver20');

            if (pUnder5) pUnder5.value = /^\d/.test(prices.under5||'') ? prices.under5 : '';
            if (p5To10) p5To10.value = /^\d/.test(prices.to10||'') ? prices.to10 : '';
            if (p10To20) p10To20.value = /^\d/.test(prices.to20||'') ? prices.to20 : '';
            if (pOver20) pOver20.value = /^\d/.test(prices.over20||'') ? prices.over20 : '';

            currentEditingServiceSteps = (svc.steps && svc.steps.length > 0) ? [...svc.steps] : getDefaultStepsForGroup(svc.group);
            renderServiceSteps();
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    async function handleSaveService() {
        const btn=document.getElementById('btnSubmitServiceForm');if(btn.disabled)return;btn.disabled=true;
        try {
            const input=id=>document.getElementById(id)?.value.trim()||'';
            const code=input('formServiceId'),old=(PawpalServices.state.servicesData||[]).find(s=>s.code===input('editServiceCodeHidden'));
            const duration=input('formServiceDuration');if(!/^\d+\s*(phút)?$/i.test(duration))throw Error('Thời lượng phải là số phút nguyên dương.');
            const group=input('formServiceGroup');
            const details={service_code:code,service_name:input('formServiceName'),duration_minutes:parseInt(duration,10),category_code:group==='Hotel'?'pet_hotel':group==='Taxi'?'pet_taxi':'grooming_spa',description:input('formServiceDesc'),status:input('formServiceStatus')==='Đang phục vụ'?'active':'inactive',commission_rate:input('formServiceCommission')||null,staff_level_id:input('formServiceStaffLevel')||null,steps:currentEditingServiceSteps,species_ids:selectedPetTypes.map(name=>PawpalServices.state.liveSpecies.find(s=>s.species_name===name)?.id)};
            details.benefits=input('formServiceBenefits');details.amenities=input('formServiceAmenities');
            if(editingVariantRows.length){
                if(old?.group!==(group==='Hotel'?'hotel':group==='Taxi'?'taxi':'spa'))throw Error('Dịch vụ đã có biến thể; vui lòng giữ đúng nhóm dịch vụ.');
                details.variant_updates=editingVariantRows.map((p,i)=>{
                    const raw=document.querySelector(`[data-variant-price="${i}"]`).value;
                    const mins=document.querySelector(`[data-variant-duration="${i}"]`)?.value;
                    if(!/^\d+$/.test(raw)||(mins!==undefined&&!/^\d+$/.test(mins)))throw Error('Giá và thời lượng phải là số nguyên hợp lệ.');
                    return {id:p.id,updated_at:p.updated_at,unit_price:Number(raw),duration_minutes:mins===undefined?null:Number(mins)};
                });
            }
            if(!details.species_ids.length||details.species_ids.some(id=>!id))throw Error('Vui lòng chọn loài được hỗ trợ từ danh mục.');
            let prices=null;
            if(document.getElementById('formReplaceServicePrices').checked){
                if(group!=='Spa')throw Error('Giá khách sạn và xe đưa đón được cấu hình ở bảng giá riêng.');
                const values=['formPriceUnder5','formPrice5To10','formPrice10To20','formPriceOver20'].map(id=>{const raw=input(id);if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(raw))throw Error('Nhập đủ bốn mức giá bằng số nguyên không âm.');return Number(raw.replace(/\./g,''));});
                prices=values.map((unit_price,i)=>({weight_from:[0,5,10,20][i],weight_to:[5,10,20,null][i],unit_price}));
            }
            const modal=document.getElementById('modalServiceForm');
            const request=JSON.stringify(details)+JSON.stringify(prices);
            if(modal.dataset.requestSignature!==request){modal.dataset.requestSignature=request;modal.dataset.requestId=crypto.randomUUID();}
            const id=old?.dbId||modal.dataset.requestId;
            const {data,error}=await window.getSupabaseClient().rpc('save_admin_service_catalog',{p_id:id,p_expected_updated_at:old?.updatedAt||null,p_details:details,p_prices:prices});
            if(error)throw error;if(data!==id)throw Error('Không xác minh được dịch vụ đã lưu.');
            await PawpalServices.loadCatalogData({force:true});renderCatalogTable();
            modal.classList.remove('active');modal.style.display='none';delete modal.dataset.requestSignature;delete modal.dataset.requestId;
            PawpalServices.showToast('Đã lưu dịch vụ và các cấu hình liên quan.');
        }catch(error){PawpalServices.showToast('Không thể lưu dịch vụ: '+PawpalServices.errorMessage(error),'danger');}
        finally{btn.disabled=false;}
    }

    function initCatalogSubtab() {
        // Tabs chuyển nhóm dịch vụ
        document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCatalogGroup = btn.getAttribute('data-group') || btn.getAttribute('data-catalog-group') || 'spa';catalogPage=1;
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
                    catalogSearchTerm = searchInput.value.trim();catalogPage=1;
                    renderCatalogTable();
                }, 300);
            });
        }

        const filterStatus = document.getElementById('catalogFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                catalogFilterStatus = filterStatus.value;catalogPage=1;
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
