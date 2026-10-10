// tab-pet-carelog.js - Subtab Nhật ký chăm sóc & Bàn làm việc Groomer/Hotel Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    const careDraftStorageKey = 'pawpal_pet_carelog_drafts';
    const maxPetPhotoBytes = 5 * 1024 * 1024;
    let currentPhotoTargetImg = null;

    const checklistState = {
        chkEar: false,
        chkNail: false,
        chkAnal: false,
        chkSkin: false
    };

    const queuePresets = {
        'CL-001': {
            before: '/assets/images/publics/dogcute3.jpg',
            after: '/assets/images/publics/dogcute1.jpg',
            msg: 'Lông vùng nách bé hơi rối nhẹ, tiệm đã gỡ và xịt dưỡng mượt mà. Vệ sinh tai sạch bóng, móng chân sau đã mài tròn nhẵn.',
            status: 'Đang làm',
            statusClass: 'badge-warning'
        },
        'CL-002': {
            before: '/assets/images/publics/dogcute6.jpg',
            after: '/assets/images/publics/dogcute1.jpg',
            msg: 'Bé Trà Sữa cắt tỉa tạo kiểu Poodle mặt gấu bông rất ngoan, tai sạch và móng đã mài nhẵn.',
            status: 'Hoàn thiện',
            statusClass: 'badge-success'
        },
        'CL-003': {
            before: '/assets/images/publics/catcute8.jpg',
            after: '/assets/images/publics/catcute7.jpg',
            msg: 'Bé Bông ngoan ngoãn khi vệ sinh tai và cắt mài móng, đã làm sạch kẽ chân.',
            status: 'Đang làm',
            statusClass: 'badge-warning'
        },
        'CL-004': {
            before: '/assets/images/publics/catcute5.jpg',
            after: '/assets/images/publics/catcute5.jpg',
            msg: 'Bé Mimi phòng VIP 03 đã ăn hết khẩu phần pate cá hồi chiều nay, vận động vui vẻ trong khu vui chơi chung.',
            status: 'Đang lưu trú',
            statusClass: 'badge-neutral'
        }
    };

    const availablePhotos = [
        { url: '/assets/images/publics/dogcute1.jpg', label: 'Cún Poodle nâu' },
        { url: '/assets/images/publics/dogcute3.jpg', label: 'Cún Corgi vàng' },
        { url: '/assets/images/publics/dogcute4.jpg', label: 'Cún Golden' },
        { url: '/assets/images/publics/dogcute6.jpg', label: 'Cún Poodle trắng' },
        { url: '/assets/images/publics/dogcute7.jpg', label: 'Cún Phốc sóc' },
        { url: '/assets/images/publics/catcute1.jpg', label: 'Mèo Ba tư' },
        { url: '/assets/images/publics/catcute3.jpg', label: 'Mèo Munchkin' },
        { url: '/assets/images/publics/catcute5.jpg', label: 'Mèo ALN xám' },
        { url: '/assets/images/publics/catcute7.jpg', label: 'Mèo trắng mắt xanh' },
        { url: '/assets/images/publics/cat5.jpg', label: 'Kiểm tra tai' },
        { url: '/assets/images/publics/handpaw.jpg', label: 'Kiểm tra móng' },
        { url: '/assets/images/publics/spa.jpg', label: 'Kiểm tra tuyến hôi' },
        { url: '/assets/images/publics/pet2.jpg', label: 'Kiểm tra da lông' }
    ];

    function readCareDrafts() {
        try { return JSON.parse(localStorage.getItem(careDraftStorageKey) || '{}'); } catch (e) { return {}; }
    }

    function restoreCareDraft(careId) {
        const draft = readCareDrafts()[careId];
        if (!draft) return false;
        const wbBeforeImg = document.getElementById('wbBeforeImgPreview');
        const wbAfterImg = document.getElementById('wbAfterImgPreview');
        const wbOwnerMsg = document.getElementById('wbOwnerMessage');
        const wbStatusBadge = document.getElementById('wbStatusBadge');

        if (wbBeforeImg && draft.before) wbBeforeImg.src = draft.before;
        if (wbAfterImg && draft.after) wbAfterImg.src = draft.after;
        if (wbOwnerMsg) wbOwnerMsg.value = draft.message || '';
        if (draft.checklist) {
            Object.keys(checklistState).forEach((key) => {
                if (typeof draft.checklist[key] === 'boolean') {
                    checklistState[key] = draft.checklist[key];
                    const checkbox = document.getElementById(key);
                    if (checkbox) checkbox.checked = draft.checklist[key];
                }
            });
        }
        if (wbStatusBadge) {
            wbStatusBadge.textContent = 'Bản nháp';
            wbStatusBadge.className = 'admin-badge badge-neutral';
        }
        return true;
    }

    function openPhotoPicker(targetImgEl, title) {
        currentPhotoTargetImg = targetImgEl;
        const modalSelectPhoto = document.getElementById('modalSelectPhoto');
        const titleEl = document.getElementById('selectPhotoModalTitle');
        const photoPickerGrid = document.getElementById('photoPickerGrid');

        if (titleEl && title) titleEl.textContent = title;
        if (photoPickerGrid) {
            photoPickerGrid.innerHTML = availablePhotos.map(p => `
                <div class="photo-picker-item" data-url="${p.url}" title="${p.label}">
                    <img src="${p.url}" alt="${p.label}">
                </div>
            `).join('');
        }
        if (modalSelectPhoto) modalSelectPhoto.classList.add('open');
    }

    function initCarelogTab() {
        const queueItems = document.querySelectorAll('.queue-card-item');
        const wbFormTitle = document.getElementById('wbFormTitle');
        const wbStatusBadge = document.getElementById('wbStatusBadge');
        const wbFormSub = document.getElementById('wbFormSub');
        const wbBeforeImg = document.getElementById('wbBeforeImgPreview');
        const wbAfterImg = document.getElementById('wbAfterImgPreview');
        const wbOwnerMsg = document.getElementById('wbOwnerMessage');
        const btnUploadBefore = document.getElementById('btnUploadBeforePhoto');
        const btnUploadAfter = document.getElementById('btnUploadAfterPhoto');
        const btnUploadPetPhoto = document.getElementById('btnUploadPetPhoto');
        const petPhotoFileInput = document.getElementById('petPhotoFileInput');
        const photoPickerGrid = document.getElementById('photoPickerGrid');
        const modalSelectPhoto = document.getElementById('modalSelectPhoto');
        const btnPreviewCustomerDiary = document.getElementById('btnPreviewCustomerDiary');
        const modalPreviewAppDiary = document.getElementById('modalPreviewAppDiary');
        const btnSaveDraft = document.getElementById('btnSaveDraftCareLog');
        const btnCompleteAndSend = document.getElementById('btnCompleteAndSendCareLog');

        ['chkEar', 'chkNail', 'chkAnal', 'chkSkin'].forEach((checkId) => {
            const checkbox = document.getElementById(checkId);
            if (!checkbox) return;
            checklistState[checkId] = checkbox.checked === true;
            checkbox.addEventListener('change', (event) => {
                checklistState[checkId] = event.currentTarget.checked;
                event.currentTarget.closest('.checklist-detail-row')?.classList.remove('checklist-row-invalid');
            });
        });

        queueItems.forEach(item => {
            item.addEventListener('click', () => {
                queueItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const careId = item.getAttribute('data-care-id') || 'CL-001';
                const preset = queuePresets[careId] || queuePresets['CL-001'];
                const petName = item.querySelector('.queue-pet-name')?.textContent || 'Bé cưng';

                if (wbFormTitle) wbFormTitle.textContent = `Cập nhật nhật ký ca: ${petName}`;
                if (wbStatusBadge) {
                    wbStatusBadge.textContent = preset.status;
                    wbStatusBadge.className = `admin-badge ${preset.statusClass}`;
                }

                if (wbBeforeImg) wbBeforeImg.src = preset.before;
                if (wbAfterImg) wbAfterImg.src = preset.after;
                if (wbOwnerMsg) wbOwnerMsg.value = preset.msg;
                restoreCareDraft(careId);

                const subTexts = Array.from(item.querySelectorAll('.queue-card-sub')).map(el => el.textContent.trim());
                if (wbFormSub && subTexts.length > 0) {
                    wbFormSub.textContent = `${subTexts[0]} • Mã lịch hẹn: BK-2609 • ${subTexts[1] || ''}`;
                }
            });
        });

        if (btnUploadBefore) {
            btnUploadBefore.addEventListener('click', () => {
                openPhotoPicker(document.getElementById('wbBeforeImgPreview'), 'Chọn ảnh Trước khi làm dịch vụ');
            });
        }

        if (btnUploadAfter) {
            btnUploadAfter.addEventListener('click', () => {
                openPhotoPicker(document.getElementById('wbAfterImgPreview'), 'Chọn ảnh Sau khi hoàn thiện');
            });
        }

        if (btnUploadPetPhoto && petPhotoFileInput) {
            btnUploadPetPhoto.addEventListener('click', () => petPhotoFileInput.click());
            petPhotoFileInput.addEventListener('change', () => {
                const file = petPhotoFileInput.files?.[0];
                petPhotoFileInput.value = '';
                if (!file) return;
                if (!file.type || !file.type.startsWith('image/')) {
                    PawpalPets.showToast('File không hợp lệ. Vui lòng chọn tệp hình ảnh.', 'warning');
                    return;
                }
                if (file.size > maxPetPhotoBytes) {
                    PawpalPets.showToast('Ảnh vượt quá giới hạn 5 MB.', 'warning');
                    return;
                }
                if (!currentPhotoTargetImg) return;
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        currentPhotoTargetImg.src = reader.result;
                        currentPhotoTargetImg.closest('.photo-upload-placeholder, .checklist-detail-row')?.classList.remove('photo-upload-invalid', 'checklist-row-invalid');
                        if (modalSelectPhoto) modalSelectPhoto.classList.remove('open');
                        PawpalPets.showToast('Đã cập nhật ảnh thành công!');
                    }
                };
                reader.onerror = () => PawpalPets.showToast('Không thể đọc tệp hình ảnh.', 'danger');
                reader.readAsDataURL(file);
            });
        }

        if (photoPickerGrid) {
            photoPickerGrid.addEventListener('click', (e) => {
                const item = e.target.closest('.photo-picker-item');
                if (item && currentPhotoTargetImg) {
                    const url = item.getAttribute('data-url');
                    currentPhotoTargetImg.src = url;
                    currentPhotoTargetImg.closest('.photo-upload-placeholder, .checklist-detail-row')?.classList.remove('photo-upload-invalid', 'checklist-row-invalid');
                    if (modalSelectPhoto) modalSelectPhoto.classList.remove('open');
                    PawpalPets.showToast('Đã cập nhật ảnh kiểm chứng thành công!');
                }
            });
        }

        const changeButtons = document.querySelectorAll('.btn-change-check-photo');
        if (changeButtons[0]) changeButtons[0].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbEarImg'), 'Chọn ảnh kiểm tra Tai'));
        if (changeButtons[1]) changeButtons[1].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbNailImg'), 'Chọn ảnh kiểm tra Móng'));
        if (changeButtons[2]) changeButtons[2].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbAnalImg'), 'Chọn ảnh kiểm tra Tuyến hôi'));
        if (changeButtons[3]) changeButtons[3].addEventListener('click', () => openPhotoPicker(document.getElementById('thumbSkinImg'), 'Chọn ảnh kiểm tra Da lông'));

        // Preview giao diện Sen App
        if (btnPreviewCustomerDiary && modalPreviewAppDiary) {
            btnPreviewCustomerDiary.addEventListener('click', () => {
                const activeItem = document.querySelector('.queue-card-item.active');
                const petName = activeItem?.querySelector('.queue-pet-name')?.textContent || 'Bé Milu';
                const subTexts = Array.from(activeItem?.querySelectorAll('.queue-card-sub') || []).map(el => el.textContent.trim());

                const beforeSrc = document.getElementById('wbBeforeImgPreview')?.src || '/assets/images/publics/dogcute3.jpg';
                const afterSrc = document.getElementById('wbAfterImgPreview')?.src || '/assets/images/publics/dogcute1.jpg';
                const message = document.getElementById('wbOwnerMessage')?.value || 'Bé rất ngoan và hoàn thành tốt dịch vụ!';

                const petAvatarEl = document.getElementById('appDiaryPetAvatar');
                if (petAvatarEl) petAvatarEl.src = afterSrc || '/assets/images/publics/dogcute1.jpg';

                const avatarWrapEl = document.getElementById('appDiaryAvatarWrap');
                const avatarLiveDotEl = document.getElementById('appDiaryAvatarLiveDot');
                const petNameEl = document.getElementById('appDiaryPetName');
                if (petNameEl) petNameEl.textContent = petName;

                const petCodeEl = document.getElementById('appDiaryPetCode');
                const careId = activeItem?.getAttribute('data-care-id') || 'CL-001';
                if (petCodeEl) petCodeEl.textContent = careId === 'CL-002' ? 'PET-002' : (careId === 'CL-003' ? 'PET-003' : 'PET-001');

                const petMetaEl = document.getElementById('appDiaryPetMeta');
                if (petMetaEl && subTexts[0]) {
                    const parts = subTexts[0].split('•');
                    const species = parts[0]?.trim() || 'Chó • Poodle';
                    petMetaEl.innerHTML = `
                        <span class="preview-pet-meta-tag">${species}</span>
                        <span class="preview-pet-meta-tag">5.2 kg</span>
                        <span class="preview-pet-meta-tag">2 tuổi</span>
                    `;
                }

                const liveBannerEl = document.getElementById('appDiaryLiveBanner');
                const liveTextEl = document.getElementById('appDiaryLiveText');
                const liveDotEl = document.getElementById('appDiaryLivePulseDot');
                const currentStatus = document.getElementById('wbStatusBadge')?.textContent || 'Đang làm';
                const isFinished = currentStatus === 'Hoàn thiện' || currentStatus === 'Đã hoàn tất';

                if (avatarWrapEl) {
                    if (isFinished) avatarWrapEl.classList.remove('avatar-in-spa');
                    else avatarWrapEl.classList.add('avatar-in-spa');
                }
                if (avatarLiveDotEl) avatarLiveDotEl.style.display = isFinished ? 'none' : 'block';

                if (liveBannerEl && liveTextEl) {
                    if (isFinished) {
                        liveBannerEl.classList.add('status-finished');
                        liveTextEl.textContent = 'Đã hoàn tất';
                        if (liveDotEl) liveDotEl.style.display = 'none';
                    } else {
                        liveBannerEl.classList.remove('status-finished');
                        liveTextEl.textContent = 'Đang làm Spa';
                        if (liveDotEl) liveDotEl.style.display = 'inline-block';
                    }
                }

                const serviceNameEl = document.getElementById('appDiaryServiceName');
                if (serviceNameEl) {
                    if (subTexts[0] && subTexts[0].includes('Dịch vụ:')) {
                        serviceNameEl.textContent = subTexts[0].split('Dịch vụ:')[1]?.trim() || 'Tắm sấy và Cắt tỉa tạo kiểu';
                    } else {
                        serviceNameEl.textContent = 'Tắm sấy và Cắt tỉa tạo kiểu';
                    }
                }

                const serviceDateEl = document.getElementById('appDiaryServiceDate');
                if (serviceDateEl) {
                    const today = new Date();
                    serviceDateEl.textContent = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
                }

                const stepperBadgeEl = document.getElementById('appDiaryStepperBadge');
                const progressBarEl = document.getElementById('appDiaryProgressBar');
                const step1El = document.getElementById('appDiaryStep1');
                const step2El = document.getElementById('appDiaryStep2');
                const step3El = document.getElementById('appDiaryStep3');
                const step4El = document.getElementById('appDiaryStep4');

                if (isFinished) {
                    if (stepperBadgeEl) {
                        stepperBadgeEl.className = 'preview-stepper-status-badge status-finished';
                        stepperBadgeEl.textContent = 'Đã hoàn tất';
                    }
                    if (progressBarEl) progressBarEl.style.width = '84%';
                    if (step1El) { step1El.className = 'preview-stepper-step done'; step1El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                    if (step2El) { step2El.className = 'preview-stepper-step done'; step2El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                    if (step3El) { step3El.className = 'preview-stepper-step done'; step3El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                    if (step4El) { step4El.className = 'preview-stepper-step done'; step4El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                } else {
                    if (stepperBadgeEl) {
                        stepperBadgeEl.className = 'preview-stepper-status-badge';
                        stepperBadgeEl.textContent = 'Tiến trình trực tiếp';
                    }
                    if (progressBarEl) progressBarEl.style.width = '56%';
                    if (step1El) { step1El.className = 'preview-stepper-step done'; step1El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                    if (step2El) { step2El.className = 'preview-stepper-step done'; step2El.querySelector('.preview-step-circle').innerHTML = '<span>✓</span>'; }
                    if (step3El) { step3El.className = 'preview-stepper-step active'; step3El.querySelector('.preview-step-circle').innerHTML = '<span>3</span>'; }
                    if (step4El) { step4El.className = 'preview-stepper-step pending'; step4El.querySelector('.preview-step-circle').innerHTML = '<span>4</span>'; }
                }

                if (document.getElementById('appDiaryImgBefore')) document.getElementById('appDiaryImgBefore').src = beforeSrc;
                if (document.getElementById('appDiaryImgAfter')) document.getElementById('appDiaryImgAfter').src = afterSrc;

                const chkEarVal = checklistState.chkEar;
                const chkNailVal = checklistState.chkNail;
                const chkAnalVal = checklistState.chkAnal;
                const chkSkinVal = checklistState.chkSkin;
                const passedCount = [chkEarVal, chkNailVal, chkAnalVal, chkSkinVal].filter(Boolean).length;

                const scoreEl = document.getElementById('appDiaryHygieneScore');
                if (scoreEl) {
                    scoreEl.textContent = `${passedCount}/4 mục đạt chuẩn`;
                    scoreEl.style.color = passedCount === 4 ? '#165335' : '#D97706';
                }

                function setCheckIcon(elId, passed) {
                    const el = document.getElementById(elId);
                    if (!el) return;
                    el.textContent = passed ? '✓' : '!';
                    el.style.background = passed ? '#DCEEE2' : '#FEE2E2';
                    el.style.color = passed ? '#165335' : '#DC2626';
                }

                setCheckIcon('appDiaryCheckEar', chkEarVal);
                setCheckIcon('appDiaryCheckNail', chkNailVal);
                setCheckIcon('appDiaryCheckAnal', chkAnalVal);
                setCheckIcon('appDiaryCheckSkin', chkSkinVal);

                let groomerName = 'KTV Hoàng Tuấn';
                if (subTexts[1] && subTexts[1].includes('KTV:')) {
                    groomerName = subTexts[1].split('KTV:')[1]?.trim() || 'KTV Hoàng Tuấn';
                }
                const techTitleEl = document.getElementById('appDiaryTechnicianTitle');
                if (techTitleEl) techTitleEl.textContent = `Lời dặn dò từ chuyên viên (${groomerName}):`;

                if (document.getElementById('appDiaryStep1Staff')) document.getElementById('appDiaryStep1Staff').textContent = `Chăm sóc: ${groomerName}`;
                if (document.getElementById('appDiaryStep2Staff')) document.getElementById('appDiaryStep2Staff').textContent = `Chăm sóc: ${groomerName}`;
                if (document.getElementById('appDiaryStep3Staff')) document.getElementById('appDiaryStep3Staff').textContent = `Chăm sóc: ${groomerName}`;

                const isCat = (subTexts[0] || '').toLowerCase().includes('mèo') || petName.toLowerCase().includes('mèo');
                const step1ImgEl = document.getElementById('appDiaryStep1Img');
                const step2ImgEl = document.getElementById('appDiaryStep2Img');
                const step3ImgEl = document.getElementById('appDiaryStep3Img');
                if (step1ImgEl) step1ImgEl.src = isCat ? '/assets/images/services/spa/process/chai_long_meo1.jpeg' : '/assets/images/services/spa/process/process_chai_long_chai_long.jpg';
                if (step2ImgEl) step2ImgEl.src = isCat ? '/assets/images/services/spa/process/tam_meo.jpg' : '/assets/images/services/spa/process/tam_cho1.jpg';
                if (step3ImgEl) step3ImgEl.src = isCat ? '/assets/images/services/spa/process/process_cat_long_cat_long_meo.jpg' : '/assets/images/services/spa/process/process_cat_long_cat_long.jpg';

                if (document.getElementById('appDiaryMessage')) document.getElementById('appDiaryMessage').textContent = message;

                modalPreviewAppDiary.classList.add('open');
            });
        }

        // Lưu nháp
        if (btnSaveDraft) {
            btnSaveDraft.addEventListener('click', async () => {
                const activeItem = document.querySelector('.queue-card-item.active');
                const careId = activeItem?.getAttribute('data-care-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'current';
                const drafts = readCareDrafts();
                drafts[careId] = {
                    careId,
                    message: document.getElementById('wbOwnerMessage')?.value.trim() || '',
                    before: document.getElementById('wbBeforeImgPreview')?.src || '',
                    after: document.getElementById('wbAfterImgPreview')?.src || '',
                    checklist: { ...checklistState },
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(careDraftStorageKey, JSON.stringify(drafts));
                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Bản nháp';
                    wbBadge.className = 'admin-badge badge-neutral';
                }
                if (activeItem) {
                    const itemBadge = activeItem.querySelector('.admin-badge');
                    if (itemBadge) {
                        itemBadge.textContent = 'Bản nháp';
                        itemBadge.className = 'admin-badge badge-neutral';
                    }
                }
                PawpalPets.showToast('Đã lưu bản nháp nhật ký ca làm. Chưa gửi sang ứng dụng của chủ nuôi.');
            });
        }

        // Hoàn thiện và gửi app
        if (btnCompleteAndSend) {
            btnCompleteAndSend.addEventListener('click', async () => {
                const hasImageSource = (element) => Boolean(element?.getAttribute('src')?.trim());
                const missingEvidence = [];
                const beforeImage = document.getElementById('wbBeforeImgPreview');
                const afterImage = document.getElementById('wbAfterImgPreview');
                if (!hasImageSource(beforeImage)) missingEvidence.push({ element: beforeImage, message: 'Vui lòng thêm ảnh trước khi làm.' });
                if (!hasImageSource(afterImage)) missingEvidence.push({ element: afterImage, message: 'Vui lòng thêm ảnh sau khi hoàn thiện.' });

                const checklistImages = [
                    ['chkEar', 'thumbEarImg', 'Tai'],
                    ['chkNail', 'thumbNailImg', 'Móng'],
                    ['chkAnal', 'thumbAnalImg', 'Tuyến hôi'],
                    ['chkSkin', 'thumbSkinImg', 'Da lông']
                ];
                checklistImages.forEach(([checkId, imageId, label]) => {
                    if (checklistState[checkId] === true && !hasImageSource(document.getElementById(imageId))) {
                        missingEvidence.push({ element: document.getElementById(imageId), message: `Vui lòng thêm ảnh kiểm chứng mục ${label}.` });
                    }
                });

                if (missingEvidence.length > 0) {
                    document.querySelectorAll('.checklist-row-invalid, .photo-upload-invalid').forEach((el) => el.classList.remove('checklist-row-invalid', 'photo-upload-invalid'));
                    missingEvidence.forEach(({ element }) => {
                        const row = element?.closest('.checklist-detail-row');
                        if (row) row.classList.add('checklist-row-invalid');
                        else element?.closest('.photo-upload-placeholder')?.classList.add('photo-upload-invalid');
                    });
                    PawpalPets.showToast(missingEvidence[0].message, 'warning');
                    missingEvidence[0].element?.closest('.checklist-detail-row, .photo-upload-placeholder')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    return;
                }

                const incompleteChecklist = Object.entries(checklistState)
                    .filter(([, isChecked]) => isChecked !== true)
                    .map(([checkId]) => document.getElementById(checkId));
                if (incompleteChecklist.length > 0) {
                    incompleteChecklist.forEach((checkbox) => {
                        checkbox?.closest('.checklist-detail-row')?.classList.add('checklist-row-invalid');
                    });
                    PawpalPets.showToast('Vui lòng hoàn tất đủ 4 mục checklist trước khi gửi.', 'warning');
                    incompleteChecklist[0]?.focus();
                    return;
                }

                const ownerMessageInput = document.getElementById('wbOwnerMessage');
                const normalizedOwnerMessage = ownerMessageInput?.value.trim() || '';
                if (ownerMessageInput) ownerMessageInput.value = normalizedOwnerMessage;

                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Hoàn thiện';
                    wbBadge.className = 'admin-badge badge-success';
                }
                const activeItem = document.querySelector('.queue-card-item.active');
                if (activeItem) {
                    const itemBadge = activeItem.querySelector('.admin-badge');
                    if (itemBadge) {
                        itemBadge.textContent = 'Hoàn thiện';
                        itemBadge.className = 'admin-badge badge-success';
                    }
                }

                const petName = activeItem?.querySelector('.queue-pet-name')?.textContent?.replace('Bé ', '').trim() || 'Milu';
                const pet = Object.values(PawpalPets.state.petsData || {}).find(p => p.name.toLowerCase() === petName.toLowerCase()) || Object.values(PawpalPets.state.petsData || {})[0];
                
                if (pet) {
                    const drafts = readCareDrafts();
                    const activeCareId = activeItem?.getAttribute('data-care-id');
                    if (activeCareId) {
                        delete drafts[activeCareId];
                        localStorage.setItem(careDraftStorageKey, JSON.stringify(drafts));
                    }
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const beforeSrc = document.getElementById('wbBeforeImgPreview')?.src || pet.avatar;
                    const afterSrc = document.getElementById('wbAfterImgPreview')?.src || pet.avatar;
                    const ownerMsg = normalizedOwnerMessage;

                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && pet.rawId) {
                            await client.from('care_log').insert({
                                pet_id: pet.rawId,
                                description: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                                health_status: '4/4 mục đạt chuẩn. ' + ownerMsg,
                                recorded_at: now.toISOString()
                            });
                        }
                    } catch (clErr) {
                        console.error('Supabase insert care_log error:', clErr);
                    }

                    const newCareLog = {
                        time: timeStr,
                        service: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                        ktv: 'Hoàng Tuấn • Bàn 2',
                        imgBefore: beforeSrc,
                        imgAfter: afterSrc,
                        checkText: '4/4 mục đạt chuẩn',
                        appStatus: 'Đã gửi app cho chủ',
                        careId: 'CL-' + Date.now()
                    };

                    if (!pet.carelogs) pet.carelogs = [];
                    pet.carelogs.unshift(newCareLog);

                    try {
                        const trackerLogs = JSON.parse(localStorage.getItem('pawpal_pet_tracker_logs') || '{}');
                        const pId = pet.code || pet.id;
                        if (!trackerLogs[pId]) trackerLogs[pId] = { sessions: [], currentSession: null };
                        
                        const completedSession = {
                            id: 'SS-' + Date.now(),
                            serviceName: 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                            date: timeStr.split(' ')[0],
                            time: timeStr.split(' ')[1] || '',
                            status: 'Đã hoàn thành',
                            technician: 'Hoàng Tuấn • Bàn 2',
                            petName: pet.name,
                            photos: [beforeSrc, afterSrc],
                            beforePhoto: beforeSrc,
                            afterPhoto: afterSrc,
                            checklist: {
                                ear: checklistState.chkEar,
                                nail: checklistState.chkNail,
                                anal: checklistState.chkAnal,
                                skin: checklistState.chkSkin
                            },
                            ownerMessage: ownerMsg
                        };
                        
                        if (!trackerLogs[pId].sessions) trackerLogs[pId].sessions = [];
                        trackerLogs[pId].sessions.unshift(completedSession);
                        trackerLogs[pId].currentSession = null;
                        localStorage.setItem('pawpal_pet_tracker_logs', JSON.stringify(trackerLogs));
                    } catch (e) {}

                    const currentOpenId = sessionStorage.getItem('pawpal_admin_pet_id');
                    if (currentOpenId === pet.code && PawpalPets.subtabs.profile) {
                        PawpalPets.subtabs.profile.renderPetSubtabs(pet);
                    }
                }

                PawpalPets.showToast('Hoàn thiện ca làm! Nhật ký và ảnh đã đồng bộ sang ứng dụng của chủ nuôi.');
            });
        }
    }

    PawpalPets.subtabs.carelog = {
        init: initCarelogTab
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCarelogTab);
    } else {
        initCarelogTab();
    }
})();
