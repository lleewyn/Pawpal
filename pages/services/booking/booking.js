
import { getPets, savePets } from '../../../scripts/api/petService.js';

let allServices = [];
let initDiagnostics = "Not initialized yet.";
const MEMBER_DISCOUNT_PERCENT = 0.05;
const MEMBER_DISCOUNT_TEXT = 'Ưu đãi hội viên';
let selectedService = null;
let bookingVouchers = null;
let appliedBookingVoucher = null;

function renderVoucherDropdown() {
    const dropdown = document.getElementById('bookingVoucherDropdown');
    const input = document.getElementById('bookingVoucherInput');
    if (!dropdown || !input) return;

    if (!bookingVouchers || bookingVouchers.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-muted small">Không có mã giảm giá nào</div>';
        return;
    }

    const validVouchers = bookingVouchers.filter(v =>
        v.active && (v.applicableFor.includes('all') || v.applicableFor.includes('services'))
    );

    if (validVouchers.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-muted small">Không có mã phù hợp cho dịch vụ</div>';
        return;
    }

    let html = '';
    validVouchers.forEach(v => {
        html += `
            <div class="dropdown-item voucher-dropdown-item" style="cursor:pointer; padding: 10px 16px; border-bottom: 1px solid #eee; white-space: normal;" data-code="${v.code}">
                <div class="fw-bold text-primary-custom" style="font-size: 0.95rem;">${v.code}</div>
                <div class="text-muted" style="font-size: 0.85rem; margin-top: 2px;">${v.description}</div>
                <div class="text-muted mt-1" style="font-size: 0.75rem; color: #e67e22 !important;">Đơn tối thiểu: ${v.minOrderValue.toLocaleString('vi-VN')}đ</div>
            </div>
        `;
    });
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.voucher-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            input.value = item.getAttribute('data-code');
            dropdown.style.display = 'none';
            handleApplyBookingVoucher();
        });
    });
}

async function handleApplyBookingVoucher() {
    const input = document.getElementById('bookingVoucherInput');
    const msg = document.getElementById('bookingVoucherMessage');
    const code = input.value.trim().toUpperCase();

    if (!code) {
        msg.textContent = 'Vui lòng nhập mã giảm giá';
        msg.style.color = '#dc2626';
        msg.style.display = 'block';
        return;
    }

    if (appliedBookingVoucher && appliedBookingVoucher.code === code) {
        appliedBookingVoucher = null;
        input.value = '';
        msg.textContent = 'Đã gỡ mã giảm giá';
        msg.style.color = '#4F7A65';
        msg.style.display = 'block';
        document.getElementById('btnApplyBookingVoucher').textContent = 'Áp dụng';
        updateSummary();
        if (document.getElementById('step4') && !document.getElementById('step4').classList.contains('d-none')) {
            renderStep4Confirm();
        }
        return;
    }

    if (!selectedService) {
        msg.textContent = 'Vui lòng chọn dịch vụ trước khi áp dụng mã';
        msg.style.color = '#dc2626';
        msg.style.display = 'block';
        return;
    }

    if (!bookingVouchers) {
        try {
            const res = await fetch('/data/vouchers.json');
            if (res.ok) bookingVouchers = await res.json();
            else bookingVouchers = [];
        } catch (e) {
            bookingVouchers = [];
        }
    }

    const voucher = bookingVouchers.find(v => v.code === code && v.active);
    if (!voucher) {
        msg.textContent = 'Mã không hợp lệ hoặc đã hết hạn';
        msg.style.color = '#dc2626';
        msg.style.display = 'block';
        return;
    }

    if (!voucher.applicableFor.includes('all') && !voucher.applicableFor.includes('services')) {
        msg.textContent = 'Mã không áp dụng cho dịch vụ';
        msg.style.color = '#dc2626';
        msg.style.display = 'block';
        return;
    }

    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let subtotal = basePrice;
    if (selectedService.category === 'hotel') {
        subtotal = basePrice * (bookingState.nights || 1);
        bookingState.addons.forEach(addon => {
            if (addon.perNight) subtotal += addon.price * (bookingState.nights || 1);
            else subtotal += addon.price;
        });
    }

    if (subtotal < voucher.minOrderValue) {
        msg.textContent = `Đơn tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ`;
        msg.style.color = '#dc2626';
        msg.style.display = 'block';
        return;
    }

    appliedBookingVoucher = voucher;
    msg.textContent = `Đã áp dụng mã: ${voucher.code}`;
    msg.style.color = '#165335';
    msg.style.display = 'block';
    document.getElementById('btnApplyBookingVoucher').textContent = 'Gỡ bỏ';
    updateSummary();
    if (document.getElementById('step4') && !document.getElementById('step4').classList.contains('d-none')) {
        renderStep4Confirm();
    }
}

const SESSION_STORAGE_KEY = 'pawpal_booking_session_state';
let goToStep = null;

let bookingState = {
    step: 1,
    ownerName: '',
    ownerPhone: '',
    petId: null,
    petName: '',
    petType: '',
    petBreed: '',
    petWeight: 0,
    petNote: '',
    serviceId: null,
    date: '',
    checkOutDate: '',
    nights: 1,
    timeSlot: '',
    staff: '',
    addons: []
};

let debounceSaveTimer = null;
function debouncedSaveBookingSession(delay = 120) {
    if (debounceSaveTimer) clearTimeout(debounceSaveTimer);
    debounceSaveTimer = setTimeout(() => {
        saveBookingSession(false);
    }, delay);
}

function saveBookingSession(updateUrlHash = true) {
    try {
        const stateToSave = {
            ...bookingState,
            selectedServiceId: selectedService?.serviceId || bookingState.serviceId || null,
            serviceName: selectedService?.name || bookingState.serviceName || '',
            serviceCategory: selectedService?.category || bookingState.serviceCategory || '',
            servicePrice: selectedService?.price || bookingState.servicePrice || 0,
            servicePrices: selectedService?.prices || bookingState.servicePrices || null,
            serviceDuration: selectedService?.duration || bookingState.serviceDuration || '',
            selectedServiceObj: selectedService ? {
                id: selectedService.id,
                dbId: selectedService.dbId || null,
                serviceId: selectedService.serviceId,
                name: selectedService.name,
                category: selectedService.category,
                price: selectedService.price,
                prices: selectedService.prices,
                priceDisplay: selectedService.priceDisplay || '',
                duration: selectedService.duration || '',
                description: selectedService.description || ''
            } : null,
            appliedVoucherCode: appliedBookingVoucher?.code || null
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
        if (updateUrlHash) {
            const targetHash = bookingState.step > 1 ? `#step=${bookingState.step}` : '';
            if (window.location.hash !== targetHash) {
                if (targetHash) {
                    history.replaceState(null, '', targetHash);
                } else if (window.location.hash.startsWith('#step=')) {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }
        }
    } catch (e) {
        console.warn('[booking] Could not save session state:', e);
    }
}

function loadBookingSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function clearBookingSession() {
    try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (window.location.hash.startsWith('#step=')) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    } catch (e) {}
}

function populateFormInputsFromState(state) {
    if (!state) return;
    const ownerNameEl = document.getElementById('ownerName');
    const ownerPhoneEl = document.getElementById('ownerPhone');
    const petNameEl = document.getElementById('petName');
    const petTypeEl = document.getElementById('petType');
    const petTypeOtherEl = document.getElementById('petTypeOther');
    const petTypeOtherGroup = document.getElementById('petTypeOtherGroup');
    const petBreedEl = document.getElementById('petBreed');
    const petWeightEl = document.getElementById('petWeight');
    const petNoteEl = document.getElementById('petNote');

    if (ownerNameEl && state.ownerName) ownerNameEl.value = state.ownerName;
    if (ownerPhoneEl && state.ownerPhone) ownerPhoneEl.value = state.ownerPhone;
    if (petNameEl && state.petName) petNameEl.value = state.petName;
    if (petBreedEl && state.petBreed && state.petBreed !== 'Chưa rõ') petBreedEl.value = state.petBreed;
    if (petWeightEl && state.petWeight) petWeightEl.value = state.petWeight;
    if (petNoteEl && state.petNote) petNoteEl.value = state.petNote;

    if (petTypeEl && state.petType) {
        const knownOptions = ['Chó', 'Mèo', 'Thỏ', 'Khác'];
        if (knownOptions.includes(state.petType)) {
            petTypeEl.value = state.petType;
        } else {
            petTypeEl.value = 'Khác';
            if (petTypeOtherGroup) petTypeOtherGroup.classList.remove('d-none');
            if (petTypeOtherEl) petTypeOtherEl.value = state.petType;
        }
    }

    const mName = document.getElementById('memberOwnerName');
    const mPhone = document.getElementById('memberOwnerPhone');
    if (mName && state.ownerName) mName.value = state.ownerName;
    if (mPhone && state.ownerPhone) mPhone.value = state.ownerPhone;
}

async function restoreBookingSession() {
    const saved = loadBookingSession();
    if (!saved) return;

    if (saved.ownerName) bookingState.ownerName = saved.ownerName;
    if (saved.ownerPhone) bookingState.ownerPhone = saved.ownerPhone;
    if (saved.petId) bookingState.petId = saved.petId;
    if (saved.petName) bookingState.petName = saved.petName;
    if (saved.petType) bookingState.petType = saved.petType;
    if (saved.petBreed) bookingState.petBreed = saved.petBreed;
    if (typeof saved.petWeight === 'number' && !isNaN(saved.petWeight)) bookingState.petWeight = saved.petWeight;
    if (saved.petNote) bookingState.petNote = saved.petNote;
    if (saved.serviceId || saved.selectedServiceId) bookingState.serviceId = saved.serviceId || saved.selectedServiceId;
    if (saved.date) bookingState.date = saved.date;
    if (saved.checkOutDate) bookingState.checkOutDate = saved.checkOutDate;
    if (saved.nights) bookingState.nights = saved.nights;
    if (saved.timeSlot) bookingState.timeSlot = saved.timeSlot;
    if (saved.staff) bookingState.staff = saved.staff;
    if (Array.isArray(saved.addons)) bookingState.addons = saved.addons;

    populateFormInputsFromState(saved);

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMemberUser = Boolean(currentUser && (!currentUser.is_temporary));

    if (isMemberUser && saved.petId) {
        const petCard = document.querySelector(`.pet-select-card[data-pet-id="${saved.petId}"]`);
        if (petCard) {
            document.querySelectorAll('.pet-select-card').forEach(c => c.classList.remove('selected'));
            petCard.classList.add('selected');
        }
    }

    validateStep1();

    // Match service from allServices or fallback to saved.selectedServiceObj
    const targetServiceId = String(saved.selectedServiceId || saved.serviceId || '').toLowerCase();
    const targetServiceName = String(saved.serviceName || (saved.selectedServiceObj && saved.selectedServiceObj.name) || '').toLowerCase();

    if (allServices && allServices.length > 0) {
        const foundSvc = allServices.find(s => 
            (targetServiceId && (String(s.serviceId).toLowerCase() === targetServiceId || String(s.id).toLowerCase() === targetServiceId || String(s.dbId || '').toLowerCase() === targetServiceId)) ||
            (targetServiceName && String(s.name).toLowerCase() === targetServiceName)
        );

        if (foundSvc) {
            selectedService = foundSvc;
            bookingState.serviceId = foundSvc.serviceId;
            const foundGroup = getServiceGroup(foundSvc);

            const tabs = document.querySelectorAll('.svc-type-tab');
            tabs.forEach(tab => {
                if (tab.dataset.type === foundGroup) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            renderServices(foundGroup);
            const step2Next = document.getElementById('step2Next');
            if (step2Next) step2Next.disabled = false;
        } else if (saved.selectedServiceObj) {
            selectedService = saved.selectedServiceObj;
        }
    } else if (saved.selectedServiceObj) {
        selectedService = saved.selectedServiceObj;
    }

    if (selectedService) {
        if (selectedService.category === 'hotel') {
            const checkInInput = document.getElementById('checkInDate');
            const checkOutInput = document.getElementById('checkOutDate');
            if (checkInInput && saved.date) checkInInput.value = saved.date;
            if (checkOutInput && saved.checkOutDate) checkOutInput.value = saved.checkOutDate;
            if (saved.nights && saved.nights > 0) {
                const nightsDisp = document.getElementById('hotelNightsDisplay');
                const nightsTxt = document.getElementById('hotelNightsText');
                if (nightsDisp) nightsDisp.classList.remove('d-none');
                if (nightsTxt) nightsTxt.textContent = `${saved.nights} đêm`;
                const calculatedPrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
                const totalPrice = calculatedPrice * saved.nights;
                const priceEl = document.getElementById('hotelTotalPrice');
                if (priceEl) priceEl.textContent = `Tạm tính: ${totalPrice.toLocaleString('vi-VN')}đ`;
            }

            if (Array.isArray(saved.addons)) {
                if (saved.addons.some(a => a.name.includes('dinh dưỡng'))) {
                    const chk = document.getElementById('addonMeal');
                    if (chk) chk.checked = true;
                }
                const walkAddon = saved.addons.find(a => a.name.includes('dạo'));
                if (walkAddon) {
                    const chk = document.getElementById('addonWalk');
                    if (chk) chk.checked = true;
                    const qtyEl = document.getElementById('addonWalkQty');
                    const qtyCtrl = document.getElementById('qtyWalkCtrl');
                    if (qtyCtrl) qtyCtrl.classList.remove('d-none');
                    const match = walkAddon.name.match(/x(\d+)/);
                    if (qtyEl && match) qtyEl.value = match[1];
                }
                const playAddon = saved.addons.find(a => a.name.includes('tương tác'));
                if (playAddon) {
                    const chk = document.getElementById('addonPlay');
                    if (chk) chk.checked = true;
                    const qtyEl = document.getElementById('addonPlayQty');
                    const qtyCtrl = document.getElementById('qtyPlayCtrl');
                    if (qtyCtrl) qtyCtrl.classList.remove('d-none');
                    const match = playAddon.name.match(/x(\d+)/);
                    if (qtyEl && match) qtyEl.value = match[1];
                }
                if (saved.addons.some(a => a.name.includes('Tắm vệ sinh'))) {
                    const chk = document.getElementById('addonBath');
                    if (chk) chk.checked = true;
                }
            }
        } else {
            const bookingDateInput = document.getElementById('bookingDate');
            if (bookingDateInput && saved.date) bookingDateInput.value = saved.date;
        }

        const timeslotGrid = document.getElementById('timeslotGrid');
        const staffList = document.getElementById('staffList');
        if (saved.date) {
            [timeslotGrid, staffList].forEach(el => {
                if (el) {
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                }
            });
            renderTimeslots();
            renderStaff();
        }
    }

    if (saved.appliedVoucherCode) {
        if (!bookingVouchers) {
            try {
                const res = await fetch('/data/vouchers.json');
                if (res.ok) bookingVouchers = await res.json();
                else bookingVouchers = [];
            } catch (e) {
                bookingVouchers = [];
            }
        }
        const voucher = bookingVouchers ? bookingVouchers.find(v => v.code === saved.appliedVoucherCode && v.active) : null;
        if (voucher) {
            appliedBookingVoucher = voucher;
            const input = document.getElementById('bookingVoucherInput');
            const msg = document.getElementById('bookingVoucherMessage');
            const btn = document.getElementById('btnApplyBookingVoucher');
            if (input) input.value = voucher.code;
            if (msg) {
                msg.textContent = `Đã áp dụng mã: ${voucher.code}`;
                msg.style.color = '#165335';
                msg.style.display = 'block';
            }
            if (btn) btn.textContent = 'Gỡ bỏ';
        }
    }

    validateStep3();
    updateSummary();

    let targetStep = saved.step || 1;
    const hashMatch = window.location.hash.match(/#step=([1-4])/);
    if (hashMatch) {
        targetStep = parseInt(hashMatch[1], 10);
    }

    if (typeof goToStep === 'function') {
        goToStep(targetStep);
    }

    updateSummary();
    saveBookingSession();
}

let holdTimerInterval = null;
let holdExpirationTime = null;
let heldSlot = '';

async function loadBookingConfig() {
    try {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) {
            console.warn('[booking] Supabase Client not initialized, falling back to mock booking config');
            const res = await fetch('/data/booking-config.json');
            const config = await res.json();
            window.PawPalBookingConfig = config;
            return config;
        }

        const { data: staffsData, error: staffsErr } = await db.from('staff')
            .select('*')
            .order('id', { ascending: true });

        const { data: scheduleData, error: scheduleErr } = await db.from('staff_schedule')
            .select('start_time, end_time');

        if (staffsErr) {
            throw new Error(staffsErr.message);
        }

        const defaultOperatingSlots = [
            "08:00", "09:00", "10:00", "11:00", "12:00",
            "13:00", "14:00", "15:00", "16:00", "17:00",
            "18:00", "19:00", "20:00"
        ];

        let generatedSlots = new Set(defaultOperatingSlots);
        if (scheduleData && scheduleData.length > 0) {
            scheduleData.forEach(schedule => {
                if (!schedule.start_time || !schedule.end_time) return;
                let startHour = parseInt(schedule.start_time.split(':')[0], 10);
                let endHour = parseInt(schedule.end_time.split(':')[0], 10);
                for (let i = startHour; i <= endHour; i++) {
                    let hourStr = i.toString().padStart(2, '0') + ':00';
                    generatedSlots.add(hourStr);
                }
            });
        }

        let finalSlots = Array.from(generatedSlots).sort();

        const staffsArray = (staffsData || []).map(s => ({
            id: s.id,
            name: s.full_name,
            desc: s.specialization || 'Chuyên viên PawPal'
        }));

        staffsArray.unshift({
            id: 'random',
            name: 'Phân bổ ngẫu nhiên',
            desc: 'PawPal tự động chọn chuyên viên trống lịch'
        });

        const config = {
            slots: finalSlots,
            staffs: staffsArray
        };
        window.PawPalBookingConfig = config;
        return config;
    } catch (error) {
        console.warn('[booking] Cannot load booking-config from Supabase, falling back to JSON:', error);
        const res = await fetch('/data/booking-config.json');
        const config = await res.json().catch(() => null);
        window.PawPalBookingConfig = config;
        return config;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== BOOKING MODULE INITIALIZING ===');

    setupStepActions();

    const earlySaved = loadBookingSession();
    if (earlySaved) {
        bookingState = { ...bookingState, ...earlySaved };
        if (earlySaved.selectedServiceObj) {
            selectedService = earlySaved.selectedServiceObj;
        }
        populateFormInputsFromState(earlySaved);
        updateSummary();
    }

    let earlyStep = bookingState.step || 1;
    const hashMatch = window.location.hash.match(/#step=([1-4])/);
    if (hashMatch) earlyStep = parseInt(hashMatch[1], 10);
    if (earlyStep > 1 && earlyStep <= 4) {
        goToStep(earlyStep);
    }
    document.documentElement.className = document.documentElement.className.replace(/booking-pre-step-\d/g, '').trim();

    await loadBookingConfig();

    const btnApplyBookingVoucher = document.getElementById('btnApplyBookingVoucher');
    if (btnApplyBookingVoucher) {
        btnApplyBookingVoucher.addEventListener('click', handleApplyBookingVoucher);
        const voucherInput = document.getElementById('bookingVoucherInput');
        const voucherDropdown = document.getElementById('bookingVoucherDropdown');

        voucherInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleApplyBookingVoucher();
        });

        voucherInput.addEventListener('focus', async () => {
            if (!bookingVouchers) {
                try {
                    const res = await fetch('/data/vouchers.json');
                    if (res.ok) bookingVouchers = await res.json();
                    else bookingVouchers = [];
                } catch (e) {
                    bookingVouchers = [];
                }
            }
            renderVoucherDropdown();
            voucherDropdown.style.display = 'block';
        });

        voucherDropdown.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });

        voucherDropdown.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        document.addEventListener('click', (e) => {
            if (voucherInput && voucherDropdown) {
                if (!voucherInput.contains(e.target) && !voucherDropdown.contains(e.target)) {
                    voucherDropdown.style.display = 'none';
                }
            }
        });
    }

    try {
        if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
            allServices = await window.DataLoader.loadServices();
            initDiagnostics = `DataLoader found. Loaded ${allServices.length} services.`;
            console.log(` Loaded ${allServices.length} services via DataLoader`);
            if (allServices.length === 0) {
                console.log('DataLoader returned empty, attempting direct load...');
                allServices = await loadServicesDirectly();
                initDiagnostics = `DataLoader empty. Direct loader loaded ${allServices.length} services.`;
            }
        } else {
            console.log('DataLoader not found. Attempting direct load...');
            allServices = await loadServicesDirectly();
            initDiagnostics = `Direct loader success. Loaded ${allServices.length} services.`;
        }
    } catch (error) {
        initDiagnostics = `Error loading services (direct fallback): ${error.message}`;
        console.error('Error loading services:', error);
        allServices = await loadServicesDirectly();
    }

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMemberUser = Boolean(currentUser && (!currentUser.is_temporary));
    if (isMemberUser) {
        const resolvedPets = await getPets(currentUser.id || currentUser.phone || currentUser.phone_main || null);
        const activePets = (Array.isArray(resolvedPets) ? resolvedPets : []).filter(p => !p.isArchived);

        if (activePets.length === 0) {
            document.getElementById('memberFlow').classList.add('d-none');
            document.getElementById('guestFlow').classList.remove('d-none');
            document.getElementById('guestInfoNote').classList.add('d-none');
            bookingState.isMemberWithNoPets = true;
            bookingState.isGuest = true;

            const ownerNameInput = document.getElementById('ownerName');
            const ownerPhoneInput = document.getElementById('ownerPhone');

            const resolvedName = resolveCurrentUserName(currentUser);
            const resolvedPhone = resolveCurrentUserPhone(currentUser);

            if (ownerNameInput && !ownerNameInput.value) ownerNameInput.value = resolvedName;
            if (ownerPhoneInput && !ownerPhoneInput.value) ownerPhoneInput.value = resolvedPhone;

            if (!bookingState.ownerName) bookingState.ownerName = resolvedName;
            if (!bookingState.ownerPhone) bookingState.ownerPhone = resolvedPhone;

            setupGuestValidation();
            bindQuickAddPetModal(currentUser);
        } else {
            document.getElementById('memberFlow').classList.remove('d-none');
            document.getElementById('guestFlow').classList.add('d-none');
            document.getElementById('guestInfoNote').classList.add('d-none');
            await loadMemberPets(currentUser);
            bindQuickAddPetModal(currentUser);
        }
    } else {
        document.getElementById('memberFlow').classList.add('d-none');
        document.getElementById('guestFlow').classList.remove('d-none');
        document.getElementById('guestInfoNote').classList.remove('d-none');
        setupGuestValidation();
        bindQuickAddPetModal(currentUser);
    }

    setupServiceSelection();
    setupScheduleSelection();
    setupConfirmation();
    validateStep1();

    const urlParams = new URLSearchParams(window.location.search);
    const preselectedServiceId = urlParams.get('service');
    if (preselectedServiceId && allServices.length > 0) {
        const found = allServices.find(s => s.serviceId === preselectedServiceId);
        if (found) {
            selectedService = found;
            bookingState.serviceId = preselectedServiceId;
            const foundGroup = getServiceGroup(found);

            const tabs = document.querySelectorAll('.svc-type-tab');
            tabs.forEach(tab => {
                if (tab.dataset.type === foundGroup) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            const step2Next = document.getElementById('step2Next');
            if (step2Next) step2Next.disabled = false;

            renderServices(foundGroup);
            updateSummary();
        }
    }

    await restoreBookingSession();
});

function resolveCurrentUserName(user) {
    if (!user) return '';
    if (user.name) return user.name;
    if (user.full_name) return user.full_name;
    if (user.displayName) return user.displayName;
    if (Array.isArray(user.customer_profile) && user.customer_profile[0]?.full_name) {
        return user.customer_profile[0].full_name;
    }
    if (user.customer_profile?.full_name) return user.customer_profile.full_name;
    if (user.profile?.full_name) return user.profile.full_name;
    if (user.profile?.name) return user.profile.name;
    return '';
}

function resolveCurrentUserPhone(user) {
    if (!user) return '';
    return user.phone || user.phone_main || user.phoneNumber || user.phone_number || '';
}

async function loadMemberPets(user) {
    const mNameInput = document.getElementById('memberOwnerName');
    const mPhoneInput = document.getElementById('memberOwnerPhone');
    const resolvedName = resolveCurrentUserName(user);
    const resolvedPhone = resolveCurrentUserPhone(user);

    if (mNameInput && !mNameInput.value) mNameInput.value = resolvedName;
    if (mPhoneInput && !mPhoneInput.value) mPhoneInput.value = resolvedPhone;

    if (!bookingState.ownerName) bookingState.ownerName = resolvedName;
    if (!bookingState.ownerPhone) bookingState.ownerPhone = resolvedPhone;

    ['memberOwnerName', 'memberOwnerPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                validateGuestInput(id, false);
                validateStep1();
                bookingState.ownerName = document.getElementById('memberOwnerName')?.value.trim() || '';
                bookingState.ownerPhone = document.getElementById('memberOwnerPhone')?.value.trim() || '';
                debouncedSaveBookingSession();
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id, true);
                validateStep1();
                bookingState.ownerName = document.getElementById('memberOwnerName')?.value.trim() || '';
                bookingState.ownerPhone = document.getElementById('memberOwnerPhone')?.value.trim() || '';
                saveBookingSession(false);
            });
        }
    });

    const listContainer = document.getElementById('memberPetList');
    if (!listContainer) return;

    const renderEmpty = () => {
        listContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; background: rgba(0,0,0,0.03); border-radius: 8px;">
                <p style="margin: 0; color: var(--text-light);">B?n ch?a c? h? s? b? c?ng n?o.</p>
                <button type="button" class="btn-green-outline btn-sm" id="addPetInlineBtn" style="margin-top: 10px; display: inline-block; padding: 6px 14px; font-size: 0.85rem;">+ Thêm hồ sơ bé cưng</button>
            </div>
        `;
    };

    let activePets = [];
    try {
        const supabasePets = await getPets(user?.id || user?.phone || user?.phone_main || null);
        const dedupedPets = [];
        const seen = new Set();
        const buildSignature = (pet) => [
            String(pet?.name || '').trim().toLowerCase(),
            String(pet?.species || '').trim().toLowerCase(),
            String(pet?.breed || '').trim().toLowerCase(),
            String(pet?.dob || '').trim().toLowerCase(),
            String(pet?.weight || '').trim().toLowerCase(),
            String(pet?.userId || pet?.userLegacyId || pet?.phone || pet?.ownerPhone || '').trim().toLowerCase()
        ].join('|');
        (Array.isArray(supabasePets) ? supabasePets : []).forEach((pet) => {
            if (!pet || pet.isArchived) return;
            const signature = buildSignature(pet);
            const key = String(pet.pet_code || pet._supabaseId || pet._id || pet.legacyId || pet.id || signature);
            const compoundKey = `${key}::${signature}`;
            if (seen.has(compoundKey) || seen.has(signature)) return;
            seen.add(signature);
            seen.add(compoundKey);
            dedupedPets.push(pet);
        });
        activePets = dedupedPets;
        if (activePets.length > 0) {
        }
    } catch (error) {
        console.warn('[booking] Load pets from Supabase failed, fallback to localStorage:', error);
    }

    if (activePets.length === 0) {
        const allPets = JSON.parse('[]' || '[]');
        activePets = allPets.filter(p => !p.isArchived && String(p.userId) === String(user.id));
    }

    if (activePets.length === 0) {
        renderEmpty();
        setupInlineAddPetButton(user);
        return;
    }
    const DEFAULT_PET_AVATARS = {
        dog: '/assets/images/publics/dogcute.jpg',
        cat: '/assets/images/publics/catcute.jpg',
        rabbit: '/assets/images/publics/pet1.jpg',
        other: '/assets/images/publics/pet.jpg'
    };

    function getPetAvatar(pet) {
        if (pet.avatar && !pet.avatar.includes('dogcute3') && !pet.avatar.includes('catcute5')) {
            return pet.avatar;
        }
        return DEFAULT_PET_AVATARS[pet.species] || DEFAULT_PET_AVATARS.other;
    }

    function getSpeciesAndBreed(pet) {
        let speciesName = '';
        const sp = String(pet.species || '').toLowerCase().trim();
        if (sp === 'dog' || sp === 'chó') speciesName = 'Chó';
        else if (sp === 'cat' || sp === 'mèo') speciesName = 'Mèo';
        else if (sp === 'rabbit' || sp === 'thỏ') speciesName = 'Thỏ';
        else if (sp === 'other' || sp === 'khác') speciesName = pet.otherSpecies || 'Khác';
        else speciesName = pet.species || 'Thú cưng';

        const breed = (pet.breed || '').trim();
        if (breed) {
            if (breed.toLowerCase().startsWith(speciesName.toLowerCase())) {
                return breed;
            }
            return `${speciesName} ${breed}`;
        }
        return speciesName;
    }

    listContainer.innerHTML = activePets.map(pet => `
        <div class="pet-select-card" data-pet-id="${pet.id}" data-name="${pet.name}" data-type="${pet.species}" data-breed="${pet.breed}" data-weight="${pet.weight}" tabindex="0" role="button">
            <div class="pet-avatar-placeholder">
                <img src="${getPetAvatar(pet)}" alt="${pet.name}">
            </div>
            <div class="pet-select-details">
                <span class="pet-select-name">${pet.name}</span>
                <span class="pet-select-meta">${getSpeciesAndBreed(pet)} • ${pet.weight}kg</span>
            </div>
        </div>
    `).join('');

    listContainer.querySelectorAll('.pet-select-card').forEach(card => {
        card.addEventListener('click', () => {
            listContainer.querySelectorAll('.pet-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            bookingState.petId = card.dataset.petId;
            bookingState.petName = card.dataset.name;
            bookingState.petType = card.dataset.type;
            bookingState.petBreed = card.dataset.breed;
            bookingState.petWeight = parseFloat(card.dataset.weight);

            validateStep1();
            saveBookingSession();
        });
    });

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'pet-select-card pet-select-card-add';
    addCard.innerHTML = `
        <div class="pet-avatar-placeholder add-icon">+</div>
        <div class="pet-select-details">
            <span class="pet-select-name">Thêm bé mới</span>
            <span class="pet-select-meta">Tạo hồ sơ nhanh</span>
        </div>
    `;
    addCard.addEventListener('click', () => openQuickAddPetModal(user));
    listContainer.appendChild(addCard);

    setupInlineAddPetButton(user);
}

function setupInlineAddPetButton(user) {
    const btn = document.getElementById('addPetInlineBtn');
    if (btn && !btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => openQuickAddPetModal(user));
    }
}

function openQuickAddPetModal(user) {
    const modal = document.getElementById('quickAddPetModal');
    if (!modal) return;
    const nameEl = document.getElementById('quickPetName');
    const speciesEl = document.getElementById('quickPetSpecies');
    const breedEl = document.getElementById('quickPetBreed');
    const weightEl = document.getElementById('quickPetWeight');
    const noteEl = document.getElementById('quickPetNote');
    const ownerNameEl = document.getElementById('quickPetOwnerName');
    const ownerPhoneEl = document.getElementById('quickPetOwnerPhone');
    if (ownerNameEl) ownerNameEl.value = resolveCurrentUserName(user);
    if (ownerPhoneEl) ownerPhoneEl.value = resolveCurrentUserPhone(user);
    if (nameEl) nameEl.value = '';
    if (speciesEl) speciesEl.value = 'cat';
    if (breedEl) breedEl.value = '';
    if (weightEl) weightEl.value = '';
    if (noteEl) noteEl.value = '';
    modal.classList.add('active');
}

async function createPetInline(user) {
    const name = document.getElementById('quickPetName')?.value.trim();
    const species = document.getElementById('quickPetSpecies')?.value || 'other';
    const breed = document.getElementById('quickPetBreed')?.value.trim() || '';
    const weight = parseFloat(document.getElementById('quickPetWeight')?.value || '0');
    const note = document.getElementById('quickPetNote')?.value.trim() || '';
    const ownerName = document.getElementById('quickPetOwnerName')?.value.trim() || resolveCurrentUserName(user);
    const ownerPhone = document.getElementById('quickPetOwnerPhone')?.value.trim() || resolveCurrentUserPhone(user);

    if (!name || !weight || Number.isNaN(weight) || weight <= 0) {
        alert('Vui lòng nhập tên bé và cân nặng hợp lệ.');
        return false;
    }

    const existing = await getPets(user?.id || user?.phone || user?.phone_main || null);
    const petId = `PET-${Date.now()}`;
    const newPet = {
        id: petId,
        name,
        species,
        breed,
        weight,
        notes: note,
        ownerName,
        ownerPhone,
        userId: user?.id || null,
        isArchived: false,
        createdAt: new Date().toISOString()
    };

    const nextPets = [newPet, ...existing.filter((p) => String(p.id) !== String(petId))];
    const saved = await savePets(nextPets);
    if (!saved) {
        alert('Không thể lưu hồ sơ bé cưng lúc này. Vui lòng thử lại.');
        return false;
    }

    const modal = document.getElementById('quickAddPetModal');
    if (modal) modal.classList.remove('active');
    await loadMemberPets(user);
    bookingState.petId = newPet.id;
    bookingState.petName = newPet.name;
    bookingState.petType = newPet.species;
    bookingState.petBreed = newPet.breed;
    bookingState.petWeight = newPet.weight;
    validateStep1();
    saveBookingSession();
    return true;
}

function bindQuickAddPetModal(user) {
    const modal = document.getElementById('quickAddPetModal');
    if (!modal || modal.dataset.bound === 'true') return;
    modal.dataset.bound = 'true';

    const close = () => modal.classList.remove('active');
    document.getElementById('closeQuickAddPetModal')?.addEventListener('click', close);
    document.getElementById('cancelQuickAddPet')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
    document.getElementById('saveQuickAddPet')?.addEventListener('click', async () => {
        const ok = await createPetInline(user);
        if (ok) close();
    });
}

function setupGuestValidation() {
    const inputs = ['ownerName', 'ownerPhone', 'petName', 'petType', 'petTypeOther', 'petWeight', 'petBreed', 'petNote'];
    
    const syncGuestState = (immediate = false) => {
        const ownerName = document.getElementById('ownerName')?.value.trim() || '';
        const ownerPhone = document.getElementById('ownerPhone')?.value.trim() || '';
        const petName = document.getElementById('petName')?.value.trim() || '';
        const petTypeVal = document.getElementById('petType')?.value || '';
        const petTypeOtherVal = document.getElementById('petTypeOther')?.value.trim() || '';
        const petBreed = document.getElementById('petBreed')?.value.trim() || '';
        const petWeight = parseFloat(document.getElementById('petWeight')?.value) || 0;
        const petNote = document.getElementById('petNote')?.value.trim() || '';

        bookingState.ownerName = ownerName;
        bookingState.ownerPhone = ownerPhone;
        bookingState.petName = petName;
        bookingState.petType = (petTypeVal === 'Khác' && petTypeOtherVal) ? petTypeOtherVal : petTypeVal;
        bookingState.petBreed = petBreed || 'Chưa rõ';
        bookingState.petWeight = petWeight;
        bookingState.petNote = petNote;
        
        if (immediate) {
            saveBookingSession(false);
        } else {
            debouncedSaveBookingSession();
        }
    };

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                validateGuestInput(id, false);
                validateStep1();
                syncGuestState(false);
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id, true);
                validateStep1();
                syncGuestState(true);
            });
        }
    });

    const petTypeEl = document.getElementById('petType');
    const petTypeOtherGroup = document.getElementById('petTypeOtherGroup');
    if (petTypeEl) {
        petTypeEl.addEventListener('change', () => {
            if (petTypeEl.value === 'Khác') {
                petTypeOtherGroup && petTypeOtherGroup.classList.remove('d-none');
            } else {
                petTypeOtherGroup && petTypeOtherGroup.classList.add('d-none');
                const otherErr = document.getElementById('petTypeOtherErr');
                const otherWarn = document.getElementById('petTypeOtherWarn');
                if (otherErr) { otherErr.textContent = ''; otherErr.classList.add('d-none'); }
                if (otherWarn) { otherWarn.classList.add('d-none'); }
            }
            validateStep1();
            syncGuestState();
        });
        if (petTypeEl.value === 'Khác') petTypeOtherGroup && petTypeOtherGroup.classList.remove('d-none');
    }
}

function validateGuestInput(id, isBlur = false) {
    const el = document.getElementById(id);
    const errEl = document.getElementById(`${id}Err`);
    if (!el || !errEl) return;

    let isValid = true;
    let errMsg = '';

    const val = el.value.trim();

    if ((id === 'ownerName' || id === 'memberOwnerName') && !val) {
        isValid = false;
        errMsg = 'Vui lòng nhập họ và tên';
    } else if (id === 'ownerPhone' || id === 'memberOwnerPhone') {
        const phoneRegex = /^0[0-9]{9}$/;
        if (!val) {
            isValid = false;
            errMsg = 'Vui lòng nhập số điện thoại';
        } else if (!phoneRegex.test(val)) {
            isValid = false;
            errMsg = 'SĐT không hợp lệ (10 chữ số bắt đầu bằng 0)';
        }
    } else if (id === 'petName' && !val) {
        isValid = false;
        errMsg = 'Vui lòng nhập tên bé';
    } else if (id === 'petTypeOther') {
        const petTypeSelect = document.getElementById('petType');
        const warnEl = document.getElementById('petTypeOtherWarn');
        if (petTypeSelect && petTypeSelect.value === 'Khác') {
            if (!val) {
                isValid = false;
                errMsg = 'Vui lòng nhập loài cụ thể';
            } else {
                const safeRe = /^[\p{L}\s\-']+$/u;
                if (!safeRe.test(val)) {
                    if (warnEl) { warnEl.classList.remove('d-none'); }
                } else {
                    if (warnEl) { warnEl.classList.add('d-none'); }
                }
            }
        }
    } else if (id === 'petType' && !val) {
        isValid = false;
        errMsg = 'Vui lòng chọn loại thú cưng';
    } else if (id === 'petWeight') {
        const weightVal = parseFloat(val);
        if (!val) {
            isValid = false;
            errMsg = 'Vui lòng nhập cân nặng';
        } else if (isNaN(weightVal) || weightVal <= 0) {
            isValid = false;
            errMsg = 'Cân nặng phải lớn hơn 0';
        }
    }

    if (!isValid) {
        if (isBlur || el.classList.contains('is-invalid')) {
            el.classList.add('is-invalid');
            errEl.textContent = errMsg;
            errEl.classList.remove('d-none');
        }
    } else {
        el.classList.remove('is-invalid');
        errEl.textContent = '';
        errEl.classList.add('d-none');
    }

    return isValid;
}

function validateStep1() {
    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    let isValid = false;

    const isMemberFlow = Boolean(currentUser && (!currentUser.is_temporary) && !bookingState.isMemberWithNoPets && !bookingState.isGuest);

    if (isMemberFlow) {
        const mName = document.getElementById('memberOwnerName')?.value.trim() || bookingState.ownerName || '';
        const mPhone = document.getElementById('memberOwnerPhone')?.value.trim() || bookingState.ownerPhone || '';
        const phoneRegex = /^0[0-9]{9}$/;

        const hasPet = Boolean(bookingState.petId || bookingState.petName);
        isValid = Boolean(hasPet && mName && mPhone && phoneRegex.test(mPhone));
    } else {
        const ownerName = document.getElementById('ownerName')?.value.trim() || bookingState.ownerName || '';
        const ownerPhone = document.getElementById('ownerPhone')?.value.trim() || bookingState.ownerPhone || '';
        const petName = document.getElementById('petName')?.value.trim() || bookingState.petName || '';
        const petType = document.getElementById('petType')?.value || bookingState.petType || '';
        const petTypeOtherVal = document.getElementById('petTypeOther')?.value.trim() || '';
        const petWeight = parseFloat(document.getElementById('petWeight')?.value) || bookingState.petWeight || 0;

        const phoneRegex = /^0[0-9]{9}$/;
        isValid = Boolean(ownerName && ownerPhone && phoneRegex.test(ownerPhone) && petName && petType && !isNaN(petWeight) && petWeight > 0);
        if (isValid && petType === 'Khác') {
            isValid = Boolean(petTypeOtherVal.length > 0 || (bookingState.petType && bookingState.petType !== 'Khác'));
        }
    }

    const step1Next = document.getElementById('step1Next');
    if (step1Next) step1Next.disabled = !isValid;
    return isValid;
}

function setupServiceSelection() {
    const listContainer = document.getElementById('svcSelectList');
    const tabs = document.querySelectorAll('.svc-type-tab');
    const searchInput = document.getElementById('svcSearchInput');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (searchInput) searchInput.value = '';
            renderServices(tab.dataset.type);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeTab = document.querySelector('.svc-type-tab.active');
            const type = activeTab ? activeTab.dataset.type : 'spa';
            renderServices(type, e.target.value);
        });
    }
}

function getServiceGroup(service) {
    const category = String(service?.category || '').toLowerCase().trim();
    const rawCategory = String(service?.rawCategory || '').toLowerCase().trim();
    const name = String(service?.name || '').toLowerCase().trim();

    if (['spa', 'hotel', 'taxi'].includes(category)) return category;
    if (rawCategory.includes('spa') || name.includes('tắm') || name.includes('spa') || name.includes('groom')) return 'spa';
    if (rawCategory.includes('hotel') || name.includes('phòng') || name.includes('lưu trú') || name.includes('daycare') || name.includes('qua đêm')) return 'hotel';
    if (rawCategory.includes('taxi') || name.includes('taxi') || name.includes('đưa đón')) return 'taxi';
    return 'spa';
}

function renderServices(type, searchQuery = '') {
    const listContainer = document.getElementById('svcSelectList');
    if (!listContainer) return;

    let filtered = allServices.filter(s => getServiceGroup(s) === type);

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query)
        );
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <p style="text-align: center; color: var(--text-light); padding: 20px;">
                Không tìm thấy dịch vụ nào phù hợp với tìm kiếm của bạn.
            </p>
        `;
        return;
    }

    listContainer.innerHTML = filtered.map(service => {
        const calculatedPrice = calculateDynamicPrice(service, bookingState.petWeight);
        const formattedPrice = calculatedPrice.toLocaleString('vi-VN');
        const priceUnit = service.priceDisplay.includes('đêm') ? ' / đêm' : '';

        const memberPrice = Math.round(calculatedPrice * (1 - MEMBER_DISCOUNT_PERCENT));
        const formattedMemberPrice = memberPrice.toLocaleString('vi-VN');

        const isSelected = bookingState.serviceId === service.serviceId ? 'selected' : '';

        return `
            <div class="svc-select-card ${isSelected}" data-id="${service.serviceId}" tabindex="0" role="button">
                <div class="svc-select-radio"></div>
                <div class="svc-select-info">
                    <span class="svc-select-name">${service.name}</span>
                    <p class="svc-select-meta" style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--color-text-light);">${service.description}</p>
                </div>
                <div class="svc-select-price">
                    <div class="svc-price-main">${formattedPrice}đ${priceUnit}</div>
                    <div class="svc-price-duration" style="color: var(--color-primary); font-size: 0.82rem; font-weight: 600; margin-top: 3px;">Hội viên: ${formattedMemberPrice}đ</div>
                </div>
            </div>
        `;
    }).join('');

    listContainer.querySelectorAll('.svc-select-card').forEach(card => {
        card.addEventListener('click', () => {
            listContainer.querySelectorAll('.svc-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            bookingState.serviceId = card.dataset.id;
            selectedService = allServices.find(s => s.serviceId === bookingState.serviceId);

            document.getElementById('step2Next').disabled = false;
            updateSummary();
            saveBookingSession();
        });
    });
}

function calculateDynamicPrice(service, weight) {
    if (!service) return 0;
    if (!service.prices) return service.price || 0;

    let targetPrice = service.price || 0;
    if (weight < 5 && service.prices['< 5kg']) targetPrice = service.prices['< 5kg'];
    else if (weight >= 5 && weight < 10 && service.prices['5 - 10kg']) targetPrice = service.prices['5 - 10kg'];
    else if (weight >= 10 && weight < 20 && service.prices['10 - 20kg']) targetPrice = service.prices['10 - 20kg'];
    else if (weight >= 20 && service.prices['> 20kg']) targetPrice = service.prices['> 20kg'];

    return targetPrice;
}

function setupScheduleSelection() {
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    const bookingDateInput = document.getElementById('bookingDate');

    const todayStr = new Date().toISOString().split('T')[0];
    if (checkInInput) checkInInput.min = todayStr;
    if (checkOutInput) checkOutInput.min = todayStr;
    if (bookingDateInput) bookingDateInput.min = todayStr;

    const timeslotGrid = document.getElementById('timeslotGrid');
    const staffList = document.getElementById('staffList');

    function setScheduleLocked(locked) {
        [timeslotGrid, staffList].forEach(el => {
            if (!el) return;
            el.style.opacity = locked ? '0.4' : '';
            el.style.pointerEvents = locked ? 'none' : '';
        });
    }

    const hasDate = Boolean(bookingState.date);
    setScheduleLocked(!hasDate);

    if (checkInInput && checkOutInput) {
        const onDateChange = () => {
            const inDate = checkInInput.value;
            const outDate = checkOutInput.value;

            if (inDate && outDate) {
                const diffTime = new Date(outDate) - new Date(inDate);
                const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (nights > 0) {
                    bookingState.date = inDate;
                    bookingState.checkOutDate = outDate;
                    bookingState.nights = nights;

                    document.getElementById('hotelNightsDisplay').classList.remove('d-none');
                    document.getElementById('hotelNightsText').textContent = `${nights} đêm`;

                    const calculatedPrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
                    const totalPrice = calculatedPrice * nights;
                    document.getElementById('hotelTotalPrice').textContent = `Tạm tính: ${totalPrice.toLocaleString('vi-VN')}đ`;

                    setScheduleLocked(false);
                    renderTimeslots();
                    validateStep3();
                    updateSummary();
                    saveBookingSession();
                } else {
                    alert('Ngày check-out phải sau ngày check-in.');
                    checkOutInput.value = '';
                    document.getElementById('hotelNightsDisplay').classList.add('d-none');
                    setScheduleLocked(true);
                    validateStep3();
                    saveBookingSession();
                }
            } else {
                setScheduleLocked(true);
            }
        };

        checkInInput.addEventListener('change', onDateChange);
        checkOutInput.addEventListener('change', onDateChange);
    }

    if (bookingDateInput) {
        bookingDateInput.addEventListener('change', () => {
            bookingState.date = bookingDateInput.value;
            setScheduleLocked(!bookingDateInput.value);
            renderTimeslots();
            renderStaff();
            validateStep3();
            saveBookingSession();
        });
    }

    const addonCheckboxes = ['addonMeal', 'addonWalk', 'addonPlay', 'addonBath'];
    addonCheckboxes.forEach(id => {
        const chk = document.getElementById(id);
        if (chk) {
            chk.addEventListener('change', () => {
                const qtyCtrl = document.getElementById(`qty${id.replace('addon', '')}Ctrl`);
                if (qtyCtrl) {
                    chk.checked ? qtyCtrl.classList.remove('d-none') : qtyCtrl.classList.add('d-none');
                }
                updateAddons();
                updateSummary();
                saveBookingSession();
            });
        }
    });
}

function updateAddons() {
    bookingState.addons = [];

    if (document.getElementById('addonMeal')?.checked) {
        bookingState.addons.push({ name: 'Chăm sóc dinh dưỡng', price: 30000, perNight: true });
    }

    if (document.getElementById('addonWalk')?.checked) {
        const qty = parseInt(document.getElementById('addonWalkQty')?.value || '1');
        bookingState.addons.push({ name: `Dắt đi dạo x${qty} lượt`, price: 40000 * qty, perNight: false });
    }

    if (document.getElementById('addonPlay')?.checked) {
        const qty = parseInt(document.getElementById('addonPlayQty')?.value || '1');
        bookingState.addons.push({ name: `Chơi tương tác x${qty} lượt`, price: 20000 * qty, perNight: false });
    }

    if (document.getElementById('addonBath')?.checked) {
        const bathPrice = Math.round(120000 * 0.8);
        bookingState.addons.push({ name: 'Tắm vệ sinh lưu trú', price: bathPrice, perNight: false });
    }
    saveBookingSession();
}

window.updateAddonQty = function (id, delta) {
    const input = document.getElementById(id);
    if (!input) return;

    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;

    updateAddons();
    updateSummary();
    saveBookingSession();
};

function renderTimeslots() {
    const grid = document.getElementById('timeslotGrid');
    if (!grid) return;

    const slots = (window.PawPalBookingConfig && Array.isArray(window.PawPalBookingConfig.slots))
        ? window.PawPalBookingConfig.slots
        : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    const now = new Date();
    const isToday = bookingState.date === now.toISOString().split('T')[0];

    const existingBookings = JSON.parse('[]' || '[]');

    grid.innerHTML = slots.map(slot => {
        let isTooSoon = false;

        if (isToday) {
            const [hours, minutes] = slot.split(':');
            const slotTime = new Date();
            slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const diffMinutes = (slotTime - now) / (1000 * 60);
            if (diffMinutes < 120) {
                isTooSoon = true;
            }
        }

        const isBusy = existingBookings.some(b => b.date === bookingState.date && b.timeStart === slot);

        let statusClass = 'open';
        if (isTooSoon) statusClass = 'soon';
        else if (isBusy) statusClass = 'busy';

        const disabled = isTooSoon || isBusy ? 'disabled' : '';
        const tooSoonClass = isTooSoon ? 'too-soon' : '';

        return `<button class="timeslot-btn slot-${statusClass} ${tooSoonClass}" ${disabled} data-slot="${slot}">${slot}</button>`;
    }).join('');

    grid.querySelectorAll('.timeslot-btn').forEach(btn => {
        const slot = btn.dataset.slot;
        if (bookingState.timeSlot && bookingState.timeSlot === slot) {
            btn.classList.add('selected');
        }
        if (heldSlot && heldSlot === slot) {
            btn.classList.add('held');
        }
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.disabled) return;

            grid.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));

            btn.classList.add('selected');
            btn.classList.add('held');

            bookingState.timeSlot = btn.dataset.slot;

            startHoldTimer(bookingState.timeSlot);

            renderStaff();
            validateStep3();
            updateSummary();
            saveBookingSession();
        });
    });
}

function startHoldTimer(slot) {
    if (holdTimerInterval) {
        clearInterval(holdTimerInterval);
    }
    if (heldSlot) {
        const prevBtn = document.querySelector(`.timeslot-btn[data-slot="${heldSlot}"]`);
        if (prevBtn) {
            prevBtn.classList.remove('held');
        }
        heldSlot = '';
    }

    const holdBanner = document.getElementById('bookingHoldBanner');
    holdBanner.classList.remove('d-none');

    const duration = 15 * 60;
    let timeRemaining = duration;

    const updateTimerDisplay = () => {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        holdBanner.innerHTML = `️ <strong>Đang giữ chỗ tạm thời:</strong> Khung giờ <strong>${slot}</strong> đã được khóa riêng cho bạn. Vui lòng xác nhận trong <strong>${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</strong>.`;
    };

    updateTimerDisplay();
    heldSlot = slot;
    const currentBtn = document.querySelector(`.timeslot-btn[data-slot="${slot}"]`);
    if (currentBtn) currentBtn.classList.add('held');

    holdTimerInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
            clearInterval(holdTimerInterval);
            holdBanner.innerHTML = ` <strong>Hết thời gian giữ chỗ!</strong> Khung giờ <strong>${slot}</strong> đã tự động giải phóng. Vui lòng chọn lại.`;
            holdBanner.style.color = '#856404';
            holdBanner.style.background = '#fff3cd';
            holdBanner.style.borderColor = '#ffeeba';

            bookingState.timeSlot = '';
            document.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
            const heldBtn = document.querySelector(`.timeslot-btn[data-slot="${slot}"]`);
            if (heldBtn) heldBtn.classList.remove('held');
            heldSlot = '';
            document.getElementById('step3Next').disabled = true;
            updateSummary();
            saveBookingSession();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function renderStaff() {
    const listContainer = document.getElementById('staffList');
    if (!listContainer) return;

    // Lấy danh sách nhân viên từ Staff Module hoặc LocalStorage hoặc Fallback
    let rawStaffList = [];
    if (window.PawpalStaffManager && typeof window.PawpalStaffManager.getAllStaff === 'function') {
        rawStaffList = window.PawpalStaffManager.getAllStaff();
    } else {
        try {
            const saved = localStorage.getItem('pawpal_staff_data');
            if (saved) rawStaffList = JSON.parse(saved);
        } catch(e) {}
    }

    if (!rawStaffList || rawStaffList.length === 0) {
        rawStaffList = [
            { id: 'EMP-001', name: 'Lê Lệ Quyên', role: 'Admin', position: 'Quản trị viên', status: 'ACTIVE', shift: 'MORNING', skillExam: 'Đạt (95đ)', serviceLocked: false },
            { id: 'EMP-002', name: 'Nguyễn Văn A', role: 'Groomer', position: 'Groomer', status: 'ACTIVE', shift: 'AFTERNOON', skillExam: 'Đạt (85đ)', serviceLocked: false },
            { id: 'EMP-004', name: 'Lê Văn C', role: 'Veterinarian', position: 'Bác sĩ/Bảo mẫu', status: 'ACTIVE', shift: 'NIGHT', skillExam: 'Đạt (90đ)', serviceLocked: false },
            { id: 'EMP-008', name: 'Nguyễn Thị Thảo', role: 'Groomer', position: 'Groomer', status: 'ACTIVE', shift: 'MORNING', skillExam: 'Đạt (92đ)', serviceLocked: false },
            { id: 'EMP-009', name: 'Vũ Đình Trọng', role: 'Veterinarian', position: 'Bác sĩ/Bảo mẫu', status: 'ACTIVE', shift: 'MORNING', skillExam: 'Đạt (88đ)', serviceLocked: false },
            { id: 'EMP-010', name: 'Đỗ Bảo Ngọc', role: 'Receptionist', position: 'Lễ tân & Chăm sóc', status: 'ACTIVE', shift: 'EVENING', skillExam: 'Đạt (82đ)', serviceLocked: false },
            { id: 'EMP-011', name: 'Nguyễn Quốc Bảo', role: 'Driver', position: 'Tài xế Taxi Pet', status: 'ACTIVE', shift: 'ALL', skillExam: 'Đạt (90đ)', serviceLocked: false }
        ];
    }

    // Lấy Roster từ LocalStorage
    let roster = {};
    try {
        const savedRos = localStorage.getItem('pawpal_staff_roster');
        if (savedRos) roster = JSON.parse(savedRos);
    } catch(e) {}

    // Thông tin dịch vụ hiện tại
    const serviceCategory = (selectedService?.category || '').toLowerCase();
    const serviceName = (selectedService?.name || '').toLowerCase();
    const serviceDuration = selectedService?.duration || bookingState.serviceDuration || '60 phút';
    const chosenDate = bookingState.date || '2026-09-28';
    const chosenSlot = bookingState.timeSlot;

    // Cập nhật Tiêu đề chọn nhân viên phù hợp theo từng loại dịch vụ
    const staffLabelEl = document.querySelector('#staffSelection .timeslot-label');
    if (staffLabelEl) {
        if (serviceCategory === 'spa' || serviceName.includes('tắm') || serviceName.includes('cắt tỉa') || serviceName.includes('groom')) {
            staffLabelEl.innerHTML = 'Chọn chuyên viên Grooming và Spa <span class="required">*</span>';
        } else if (serviceCategory === 'hotel' || serviceName.includes('khách sạn') || serviceName.includes('lưu trú')) {
            staffLabelEl.innerHTML = 'Chọn bảo mẫu và Bác sĩ thú y trực lưu trú <span class="required">*</span>';
        } else if (serviceCategory === 'taxi' || serviceName.includes('taxi') || serviceName.includes('đưa đón')) {
            staffLabelEl.innerHTML = 'Chọn tài xế xe chuyên dụng đưa đón <span class="required">*</span>';
        } else {
            staffLabelEl.innerHTML = 'Chọn nhân viên thực hiện <span class="required">*</span>';
        }
    }

    // Tính thời gian kết thúc của dịch vụ nếu đã chọn khung giờ
    let startMin = null;
    let endMin = null;
    if (chosenSlot) {
        const [h, m] = chosenSlot.split(':').map(Number);
        startMin = h * 60 + m;
        let durMin = 60;
        if (serviceDuration.includes('phút')) {
            durMin = parseInt(serviceDuration.replace(/[^\d]/g, ''), 10) || 60;
        } else if (serviceDuration.includes('giờ') || serviceDuration.includes('tiếng')) {
            durMin = (parseFloat(serviceDuration.replace(/[^\d.]/g, '')) || 1) * 60;
        }
        endMin = startMin + durMin;
    }

    // Lọc và tính trạng thái cho từng nhân viên
    const mappedStaffs = [];

    // Luôn có tùy chọn "Phân bổ ngẫu nhiên" ở đầu
    mappedStaffs.push({
        id: 'random',
        name: 'Phân bổ ngẫu nhiên',
        desc: 'PawPal tự động chọn chuyên viên trống lịch',
        isAvailable: true,
        tag: 'Tự động'
    });

    rawStaffList.forEach(staff => {
        // 1. Kiểm tra phù hợp chuyên môn cho từng loại dịch vụ (Spa, Hotel, Taxi)
        let matchRole = false;
        if (serviceCategory === 'spa' || serviceName.includes('tắm') || serviceName.includes('cắt tỉa') || serviceName.includes('grooming') || serviceName.includes('nhuộm')) {
            if (staff.role === 'Groomer' || staff.role === 'Admin') matchRole = true;
        } else if (serviceCategory === 'hotel' || serviceName.includes('khách sạn') || serviceName.includes('lưu trú')) {
            if (staff.role === 'Veterinarian' || staff.role === 'Receptionist') matchRole = true;
        } else if (serviceCategory === 'taxi' || serviceName.includes('taxi') || serviceName.includes('đưa đón')) {
            if (staff.role === 'Driver') matchRole = true;
        } else if (serviceCategory === 'vet' || serviceName.includes('khám') || serviceName.includes('thú y') || serviceName.includes('tiêm')) {
            if (staff.role === 'Veterinarian' || staff.role === 'Admin') matchRole = true;
        } else {
            matchRole = true;
        }

        if (!matchRole) return; // Không hiển thị nhân viên sai chuyên môn

        // 2. Kiểm tra trạng thái làm việc & khóa an toàn
        let isAvailable = true;
        let reason = '';

        if (staff.status === 'RESIGNED') {
            return; // Ẩn nhân viên đã nghỉ việc
        } else if (staff.status === 'LEAVE') {
            isAvailable = false;
            reason = 'Đang nghỉ phép';
        } else if (staff.status === 'PAUSE') {
            isAvailable = false;
            reason = 'Tạm nghỉ';
        } else if (staff.serviceLocked) {
            isAvailable = false;
            reason = 'Tạm khóa đào tạo';
        }

        // 3. Kiểm tra ca làm việc bao phủ khung giờ thực hiện dịch vụ
        if (isAvailable && startMin !== null && endMin !== null) {
            let shifts = [];
            if (roster[chosenDate] && roster[chosenDate][staff.id]) {
                shifts = roster[chosenDate][staff.id];
            } else {
                shifts = [staff.shift || 'MORNING'];
            }

            if (shifts.includes('LEAVE') || shifts.includes('PAUSE') || shifts.includes('RESIGNED')) {
                isAvailable = false;
                reason = 'Nghỉ phép ngày này';
            } else {
                let covered = false;
                if (shifts.includes('ALL')) covered = true;
                if (shifts.includes('MORNING') && startMin >= 480 && endMin <= 720) covered = true;
                if (shifts.includes('AFTERNOON') && startMin >= 780 && endMin <= 1020) covered = true;
                if (shifts.includes('EVENING') && startMin >= 1050 && endMin <= 1290) covered = true;
                if (shifts.includes('NIGHT') && (startMin >= 1290 || endMin <= 480)) covered = true;

                if (shifts.includes('MORNING') && shifts.includes('AFTERNOON') && startMin >= 480 && endMin <= 1020) {
                    covered = true;
                }

                if (!covered) {
                    isAvailable = false;
                    const shiftLabels = shifts.map(sh => {
                        if (sh === 'MORNING') return 'Ca sáng (08:00 - 12:00)';
                        if (sh === 'AFTERNOON') return 'Ca chiều (13:00 - 17:00)';
                        if (sh === 'EVENING') return 'Ca tối (17:30 - 21:30)';
                        return 'Ca khác';
                    }).join(', ');
                    reason = `Trực ${shiftLabels || 'khung giờ khác'}`;
                }
            }
        }

        let descText = staff.position || 'Chuyên viên';
        if (staff.skillExam) descText += ` • ${staff.skillExam}`;
        if (!isAvailable && reason) {
            descText = reason;
        } else if (isAvailable && chosenSlot) {
            descText = `Trống lịch • Phù hợp (${serviceDuration})`;
        }

        mappedStaffs.push({
            id: staff.id,
            name: staff.name,
            desc: descText,
            isAvailable: isAvailable,
            reason: reason
        });
    });

    listContainer.innerHTML = mappedStaffs.map(staff => {
        const isSelected = bookingState.staff === staff.name ? 'selected' : '';
        const isRandom = staff.id === 'random' || staff.name.toLowerCase().includes('ngẫu nhiên');
        const words = staff.name.split(' ').filter(Boolean);
        const initials = isRandom ? 'PB' : words.map(w => w[0]).slice(-2).join('').toUpperCase();
        const disabledClass = !staff.isAvailable ? 'disabled-staff' : '';
        const statusBadge = staff.isAvailable 
            ? `<span style="color: #236B48; font-size: 0.76rem; font-weight: 500;">${staff.desc}</span>` 
            : `<span style="color: #DC2626; font-size: 0.76rem; font-weight: 500;">${staff.desc}</span>`;

        return `
            <div class="staff-card ${isSelected} ${disabledClass}" data-name="${staff.name}" data-available="${staff.isAvailable ? '1' : '0'}" tabindex="0" role="button" ${!staff.isAvailable ? 'style="opacity: 0.55; cursor: not-allowed;"' : ''}>
                <div class="staff-card-avatar" ${!staff.isAvailable ? 'style="background: #E5E7EB; color: #9CA3AF;"' : ''}>${initials}</div>
                <div class="staff-card-info">
                    <span class="staff-select-name">${staff.name}</span>
                    <span class="staff-card-status">${statusBadge}</span>
                </div>
            </div>
        `;
    }).join('');

    // Nếu nhân viên đang chọn không khả dụng trong khung giờ mới chọn, tự động chuyển về 'Phân bổ ngẫu nhiên'
    if (bookingState.staff && bookingState.staff !== 'Phân bổ ngẫu nhiên') {
        const currentSelected = mappedStaffs.find(s => s.name === bookingState.staff);
        if (!currentSelected || !currentSelected.isAvailable) {
            bookingState.staff = 'Phân bổ ngẫu nhiên';
            const randomCard = listContainer.querySelector('.staff-card[data-name="Phân bổ ngẫu nhiên"]');
            if (randomCard) {
                listContainer.querySelectorAll('.staff-card').forEach(c => c.classList.remove('selected'));
                randomCard.classList.add('selected');
            }
            updateSummary();
            saveBookingSession();
        }
    }

    listContainer.querySelectorAll('.staff-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.getAttribute('data-available') === '0') {
                return; // Không cho phép chọn nhân viên bận / không khả dụng
            }
            listContainer.querySelectorAll('.staff-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            bookingState.staff = card.dataset.name;
            validateStep3();
            updateSummary();
            saveBookingSession();
        });
    });
}

function validateStep3() {
    let isValid = false;
    if (selectedService.category === 'hotel') {
        isValid = bookingState.date !== '' && bookingState.checkOutDate !== '' && bookingState.timeSlot !== '' && bookingState.staff !== '';
    } else {
        isValid = bookingState.date !== '' && bookingState.timeSlot !== '' && bookingState.staff !== '';
    }
    document.getElementById('step3Next').disabled = !isValid;
}

function setupStepActions() {
    const nextButtons = {
        1: document.getElementById('step1Next'),
        2: document.getElementById('step2Next'),
        3: document.getElementById('step3Next')
    };

    const backButtons = {
        2: document.getElementById('step2Back'),
        3: document.getElementById('step3Back'),
        4: document.getElementById('step4Back')
    };

    const panels = {
        1: document.getElementById('step1'),
        2: document.getElementById('step2'),
        3: document.getElementById('step3'),
        4: document.getElementById('step4')
    };

    const stepsIndicator = document.querySelectorAll('#bookingStepper .step');

    goToStep = (targetStep) => {
        Object.values(panels).forEach(p => p.classList.remove('active'));
        if (panels[targetStep]) panels[targetStep].classList.add('active');

        stepsIndicator.forEach((indicator, index) => {
            const stepNum = index + 1;
            if (stepNum < targetStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (stepNum === targetStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });

        bookingState.step = targetStep;

        if (targetStep === 2) {
            const categoryToRender = selectedService ? getServiceGroup(selectedService) : 'spa';
            const tabs = document.querySelectorAll('.svc-type-tab');
            tabs.forEach(tab => {
                if (tab.dataset.type === categoryToRender) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            renderServices(categoryToRender);
        } else if (targetStep === 3) {
            const timeSlotLabel = document.getElementById('timeSlotLabel');
            if (selectedService && selectedService.category === 'hotel') {
                if (timeSlotLabel) timeSlotLabel.innerHTML = 'Chọn giờ check-in <span class="required">*</span>';
                document.getElementById('hotelDateRange').classList.remove('d-none');
                document.getElementById('hotelAddonsSection').classList.remove('d-none');
                document.getElementById('spaSchedule').classList.remove('d-none');
                const spaDateGroup = document.querySelector('#spaSchedule .booking-date');
                if (spaDateGroup) spaDateGroup.classList.add('d-none');
                renderTimeslots();
                renderStaff();
            } else {
                if (timeSlotLabel) timeSlotLabel.innerHTML = 'Chọn khung giờ <span class="required">*</span>';
                document.getElementById('hotelDateRange').classList.add('d-none');
                document.getElementById('hotelAddonsSection').classList.add('d-none');
                document.getElementById('spaSchedule').classList.remove('d-none');
                const spaDateGroup = document.querySelector('#spaSchedule .booking-date');
                if (spaDateGroup) spaDateGroup.classList.remove('d-none');
                renderTimeslots();
                renderStaff();
            }
        } else if (targetStep === 4) {
            renderStep4Confirm();
            setupConfirmation();
        }

        updateSummary();
        saveBookingSession();
    };

    // Next click
    nextButtons[1].addEventListener('click', () => {
        const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
        const isMemberUser = Boolean(currentUser && (!currentUser.is_temporary));
        if (!isMemberUser) {
            bookingState.ownerName = document.getElementById('ownerName').value.trim();
            bookingState.ownerPhone = document.getElementById('ownerPhone').value.trim();
            bookingState.petName = document.getElementById('petName').value.trim();
            const petTypeVal = document.getElementById('petType').value;
            const petTypeOtherVal = document.getElementById('petTypeOther')?.value.trim() || '';
            bookingState.petType = petTypeVal === 'Khác' && petTypeOtherVal ? petTypeOtherVal : petTypeVal;
            bookingState.petBreed = document.getElementById('petBreed').value.trim() || 'Chưa rõ';
            bookingState.petWeight = parseFloat(document.getElementById('petWeight').value);
            bookingState.petNote = document.getElementById('petNote').value.trim();
        } else {
            const mName = document.getElementById('memberOwnerName')?.value.trim();
            const mPhone = document.getElementById('memberOwnerPhone')?.value.trim();
            if (mName) bookingState.ownerName = mName;
            if (mPhone) bookingState.ownerPhone = mPhone;
            bookingState.petNote = '';
        }
        goToStep(2);
    });

    nextButtons[2].addEventListener('click', () => goToStep(3));
    nextButtons[3].addEventListener('click', () => {
        goToStep(4);
    });

    backButtons[2].addEventListener('click', () => goToStep(1));
    backButtons[3].addEventListener('click', () => goToStep(2));
    backButtons[4].addEventListener('click', () => goToStep(3));

    stepsIndicator.forEach(indicator => {
        indicator.addEventListener('click', () => {
            const stepNum = parseInt(indicator.dataset.step, 10);
            if (!stepNum) return;
            if (stepNum < bookingState.step) {
                goToStep(stepNum);
            } else if (stepNum === 2 && !document.getElementById('step1Next')?.disabled) {
                goToStep(2);
            } else if (stepNum === 3 && selectedService && !document.getElementById('step1Next')?.disabled) {
                goToStep(3);
            } else if (stepNum === 4 && selectedService && !document.getElementById('step1Next')?.disabled && !document.getElementById('step3Next')?.disabled) {
                goToStep(4);
            }
        });
    });
}

function updateSummary() {
    const summaryEmpty = document.getElementById('summaryEmpty');
    const summaryContent = document.getElementById('summaryContent');

    if (!selectedService) {
        summaryEmpty.classList.remove('d-none');
        summaryContent.classList.add('d-none');
        return;
    }

    summaryEmpty.classList.add('d-none');
    summaryContent.classList.remove('d-none');

    const sumService = document.getElementById('sumService');
    const sumPet = document.getElementById('sumPet');
    const sumOwner = document.getElementById('sumOwner');
    const sumStaff = document.getElementById('sumStaff');
    const sumDate = document.getElementById('sumDate');

    sumService.classList.remove('d-none');
    document.getElementById('sumServiceVal').textContent = selectedService.name;

    if (bookingState.petName) {
        sumPet.classList.remove('d-none');
        document.getElementById('sumPetVal').textContent = `${bookingState.petName} (${bookingState.petWeight}kg)`;
    } else {
        sumPet.classList.add('d-none');
    }

    if (bookingState.ownerName) {
        sumOwner.classList.remove('d-none');
        document.getElementById('sumOwnerVal').textContent = `${bookingState.ownerName} • ${bookingState.ownerPhone}`;
    } else {
        sumOwner.classList.add('d-none');
    }

    if (bookingState.staff) {
        sumStaff.classList.remove('d-none');
        document.getElementById('sumStaffVal').textContent = bookingState.staff;
    } else {
        sumStaff.classList.add('d-none');
    }

    if (bookingState.date) {
        sumDate.classList.remove('d-none');
        let dateText = formatDate(bookingState.date);
        if (selectedService.category === 'hotel' && bookingState.checkOutDate) {
            dateText += ` $\\rightarrow$ ${formatDate(bookingState.checkOutDate)} (${bookingState.nights} đêm)`;
        } else if (bookingState.timeSlot) {
            dateText += ` lúc ${bookingState.timeSlot}`;
        }
        document.getElementById('sumDateVal').textContent = dateText;
    } else {
        sumDate.classList.add('d-none');
    }

    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let subtotal = basePrice;

    if (selectedService.category === 'hotel') {
        subtotal = basePrice * (bookingState.nights || 1);
        bookingState.addons.forEach(addon => {
            if (addon.perNight) {
                subtotal += addon.price * (bookingState.nights || 1);
            } else {
                subtotal += addon.price;
            }
        });
    }

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = Boolean(currentUser && (!currentUser.is_temporary));

    let memberDiscount = 0;
    if (isMember) {
        memberDiscount = Math.round(subtotal * MEMBER_DISCOUNT_PERCENT);
    }

    let voucherDiscount = 0;
    if (appliedBookingVoucher) {
        if (appliedBookingVoucher.type === 'fixed') {
            voucherDiscount = appliedBookingVoucher.value;
        } else if (appliedBookingVoucher.type === 'percentage') {
            voucherDiscount = Math.round(subtotal * (appliedBookingVoucher.value / 100));
            if (appliedBookingVoucher.maxDiscount && voucherDiscount > appliedBookingVoucher.maxDiscount) {
                voucherDiscount = appliedBookingVoucher.maxDiscount;
            }
        }
    }

    let totalDiscount = memberDiscount + voucherDiscount;
    const finalPrice = Math.max(0, subtotal - totalDiscount);
    const prefix = (!bookingState.petWeight && selectedService.prices) ? 'Từ ' : '';

    const sumSubtotalRow = document.getElementById('sumSubtotalRow');
    const sumDiscountRow = document.getElementById('sumDiscountRow');

    if (isMember || appliedBookingVoucher) {
        sumSubtotalRow.classList.remove('d-none');
        document.getElementById('sumSubtotalVal').textContent = `${prefix}${subtotal.toLocaleString('vi-VN')}đ`;

        sumDiscountRow.classList.remove('d-none');
        let discountLabel = '';
        if (isMember && appliedBookingVoucher) {
            discountLabel = `Ưu đãi hội viên và Voucher`;
        } else if (isMember) {
            discountLabel = `${MEMBER_DISCOUNT_TEXT} (-${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}%)`;
        } else {
            discountLabel = `Voucher (-${appliedBookingVoucher.code})`;
        }

        document.getElementById('sumDiscountLabel').textContent = discountLabel;
        document.getElementById('sumDiscountVal').textContent = `-${totalDiscount.toLocaleString('vi-VN')}đ`;
    } else {
        sumSubtotalRow.classList.add('d-none');
        sumDiscountRow.classList.add('d-none');
    }

    document.getElementById('sumPriceVal').textContent = `${prefix}${finalPrice.toLocaleString('vi-VN')}đ`;
}

function renderStep4Confirm() {
    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let subtotal = basePrice;

    let billLines = `
        <div class="summary-row">
            <span class="sum-label">${selectedService.name} (Giá gốc)</span>
            <span class="sum-value">${selectedService.price.toLocaleString('vi-VN')}đ</span>
        </div>
    `;

    if (selectedService.category === 'hotel') {
        const nights = bookingState.nights || 1;
        subtotal = basePrice * nights;
        billLines = `
            <div class="summary-row">
                <span class="sum-label">${selectedService.name} (${basePrice.toLocaleString('vi-VN')}đ × ${nights} đêm)</span>
                <span class="sum-value">${subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
        `;

        bookingState.addons.forEach(addon => {
            const cost = addon.perNight ? addon.price * nights : addon.price;
            billLines += `
                <div class="summary-row">
                    <span class="sum-label">${addon.name}</span>
                    <span class="sum-value">+${cost.toLocaleString('vi-VN')}đ</span>
                </div>
            `;
            subtotal += cost;
        });
    } else {
        subtotal = basePrice;
    }

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = Boolean(currentUser && (!currentUser.is_temporary));

    const discount = isMember ? Math.round(subtotal * MEMBER_DISCOUNT_PERCENT) : 0;

    let voucherDiscount = 0;
    if (appliedBookingVoucher) {
        if (appliedBookingVoucher.type === 'fixed') {
            voucherDiscount = appliedBookingVoucher.value;
        } else if (appliedBookingVoucher.type === 'percentage') {
            voucherDiscount = Math.round(subtotal * (appliedBookingVoucher.value / 100));
            if (appliedBookingVoucher.maxDiscount && voucherDiscount > appliedBookingVoucher.maxDiscount) {
                voucherDiscount = appliedBookingVoucher.maxDiscount;
            }
        }
    }

    let totalDiscount = discount + voucherDiscount;
    const finalTotal = Math.max(0, subtotal - totalDiscount);

    if (isMember) {
        billLines += `
            <div class="summary-row" style="color: #27ae60;">
                <span class="sum-label">Khấu trừ thành viên (Bạc -${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}%)</span>
                <span class="sum-value">-${discount.toLocaleString('vi-VN')}đ</span>
            </div>
        `;
    }

    if (appliedBookingVoucher) {
        billLines += `
            <div class="summary-row" style="color: #27ae60;">
                <span class="sum-label">Voucher (${appliedBookingVoucher.code})</span>
                <span class="sum-value">-${voucherDiscount.toLocaleString('vi-VN')}đ</span>
            </div>
        `;
    }

    const petWeightDisplay = bookingState.petWeight ? `${bookingState.petWeight}kg` : 'chưa xác định';

    const container = document.getElementById('confirmSummary');
    container.innerHTML = `
        <div class="confirm-bill-card">
            <h4>Chi tiết hóa đơn</h4>
            
            ${billLines}
            
            <div class="summary-divider" style="margin: 14px 0;"></div>
            
            <div class="summary-row price-row" style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary-dark); margin-top: 6px;">
                <span class="sum-label" style="font-size: 0.95rem; font-weight: 700;">Tổng tiền hóa đơn:</span>
                <span class="sum-value" style="color: var(--color-primary); font-size: 1.3rem;">${finalTotal.toLocaleString('vi-VN')} VNĐ</span>
            </div>

            <div class="summary-row price-row" style="font-size: 0.95rem; font-weight: 600; margin-top: 6px;">
                <span class="sum-label">Chi phí đặt cọc:</span>
                <span class="sum-value" style="color: #16a34a; font-size: 1.15rem;">0 VNĐ</span>
            </div>

            <div class="alert-bill-note">
                <div class="alert-bill-title">Lưu ý về chi phí và dịch vụ phát sinh:</div>
                <ul class="alert-bill-list">
                    <li>Mức giá tạm tính theo số cân khai báo (${petWeightDisplay}), nhân viên sẽ cân lại bé tại quầy để áp dụng giá chuẩn xác nhất.</li>
                    <li>Có thể phát sinh phụ phí nếu bé bị bết rối lông nặng, nhiều ve rận/bọ chét hoặc cần gói vệ sinh đặc trị chuyên sâu.</li>
                    <li>Chuyên viên tiếp nhận luôn kiểm tra thể trạng bé và <strong>thông báo xác nhận chi phí phát sinh trước khi thực hiện</strong> dịch vụ.</li>
                </ul>
            </div>
        </div>
    `;
}

function setupConfirmation() {
    const policyChk = document.getElementById('policyCheck');
    const confirmBtn = document.getElementById('confirmBookingBtn');

    if (policyChk && confirmBtn) {
        confirmBtn.disabled = !policyChk.checked;

        if (!confirmBtn.dataset.listenerAttached) {
            confirmBtn.dataset.listenerAttached = 'true';

            const syncState = () => {
                confirmBtn.disabled = !policyChk.checked;
            };

            policyChk.addEventListener('change', syncState);
            policyChk.addEventListener('input', syncState);
            policyChk.addEventListener('click', syncState);

            confirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirmBtn.disabled) return;
                processBookingSubmit();
            });
        }
    }
}

async function processBookingSubmit() {
    const confirmBtn = document.getElementById('confirmBookingBtn');

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span>Đang xử lý đặt lịch...`;
    }

    const bookings = JSON.parse('[]' || '[]');
    const newBookingId = 'BP-' + Math.floor(100000 + Math.random() * 900000);

    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let totalPrice = basePrice;
    if (selectedService.category === 'hotel') {
        totalPrice = basePrice * (bookingState.nights || 1);
        bookingState.addons.forEach(addon => {
            totalPrice += addon.perNight ? addon.price * (bookingState.nights || 1) : addon.price;
        });
    }

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = Boolean(currentUser && (!currentUser.is_temporary));

    if (isMember) {
        bookingState.ownerName = bookingState.ownerName || resolveCurrentUserName(currentUser);
        bookingState.ownerPhone = bookingState.ownerPhone || resolveCurrentUserPhone(currentUser);
    }

    const finalPrice = isMember ? Math.round(totalPrice * (1 - MEMBER_DISCOUNT_PERCENT)) : totalPrice;

    const bookingRecord = {
        id: newBookingId,
        appointment_code: null,
        userId: currentUser ? currentUser.id : null,
        petId: bookingState.petId || null,
        ownerName: bookingState.ownerName,
        ownerPhone: bookingState.ownerPhone,
        petName: bookingState.petName,
        petEmoji: bookingState.petType === 'Mèo' ? '' : (bookingState.petType === 'Chó' ? '' : (bookingState.petType === 'Thỏ' ? '' : (bookingState.petType === 'Chuột Hamster' ? '' : ''))),
        petEmoji: '',
        petWeight: bookingState.petWeight,
        service: selectedService.category === 'hotel' ? 'Pet Hotel' : (selectedService.category === 'taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
        serviceName: selectedService.name,
        package: selectedService.name,
        date: bookingState.date,
        dateEnd: selectedService.category === 'hotel' ? bookingState.checkOutDate : null,
        time: bookingState.timeSlot || null,
        timeStart: bookingState.timeSlot || null,
        timeEnd: bookingState.timeSlot ? calculateEndTime(bookingState.timeSlot, selectedService.duration) : null,
        staff: bookingState.staff || (selectedService.category === 'hotel' ? 'Bảo mẫu khách sạn' : (selectedService.category === 'taxi' ? 'Tài xế chuyên dụng' : 'Chuyên viên Spa')),
        branch: 'PawPal Chi nhánh Quận 1',
        price: finalPrice,
        status: 'upcoming',
        note: bookingState.petNote || null,
        changeCount: 0,
        cancelCount: 0,
        createdAt: new Date().toISOString()
    };

    let finalBookingId = newBookingId;
    let customerId = currentUser ? currentUser.id : null;

    if (window.getSupabaseClient || window.SupabaseClient) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        const dbUser = currentUser || { phone: bookingState.ownerPhone, name: bookingState.ownerName };

        customerId = await getSupabaseCustomerId(dbUser);

        let finalPetId = bookingState.petId || null;
        if (customerId && !finalPetId) {
            try {
                const petName = bookingState.petName || 'Bé cưng';
                const { data: existingPets } = await db.from('pet_profile')
                    .select('id')
                    .eq('customer_id', customerId)
                    .ilike('pet_name', petName)
                    .limit(1);
                
                if (existingPets && existingPets.length > 0) {
                    finalPetId = existingPets[0].id;
                } else {
                    const petPayload = {
                        customer_id: customerId,
                        pet_code: `PET-${Date.now()}`,
                        pet_name: petName,
                        species: bookingState.petType || 'other',
                        breed: bookingState.petBreed || '',
                        weight: parseFloat(bookingState.petWeight) || 0,
                        status: 'ACTIVE'
                    };
                    const { data: insertedPet } = await db.from('pet_profile').insert([petPayload]).select('id').limit(1);
                    if (insertedPet && insertedPet[0]) {
                        finalPetId = insertedPet[0].id;
                    }
                }
            } catch (e) {
                console.warn('[Booking] Could not check or create pet in Supabase', e);
            }
        }

        bookingRecord.petId = finalPetId;

        const synced = await insertBookingToSupabase(bookingRecord, dbUser);
        if (synced) {
            bookingRecord._supabaseId = synced.id;
            bookingRecord.appointment_code = synced.appointment_code || bookingRecord.appointment_code;
            bookingRecord.id = synced.appointment_code || bookingRecord.id;
            bookingRecord._source = 'supabase';
            finalBookingId = bookingRecord.id;
        }
    }

    let generatedToken = null;
    if (!currentUser) {
        generatedToken = 'token-temp-' + Math.floor(100000 + Math.random() * 900000);
        const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
        tokens.push({
            token: generatedToken,
            phone: bookingState.ownerPhone,
            createdAt: Date.now()
        });
        localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens));
        try {
            showTempAccountActivationToast(bookingState.ownerPhone, generatedToken);
        } catch (err) {
            console.warn('showTempAccountActivationToast not available', err);
        }
    }

    if (holdTimerInterval) {
        clearInterval(holdTimerInterval);
    }
    sessionStorage.setItem('last_booking_id', finalBookingId);
    clearBookingSession();

    setTimeout(() => {
        confirmBtn.innerHTML = ` Đặt lịch thành công!`;
        let url = `/booking-success?code=${finalBookingId}`;
        if (generatedToken) url += `&token=${generatedToken}`;
        window.location.href = url;
    }, 1200);
}

function showTempAccountActivationToast(phone, token) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-custom toast-success';
    toast.style.minWidth = '320px';

    const origin = window.location.origin || 'http://localhost:3000';
    const setupUrl = `${origin}/pages/public/login/login.html?action=guest-activate&phone=${encodeURIComponent(phone)}`;

    toast.innerHTML = `
        <div class="toast-content" style="flex-direction: column; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="toast-icon"></span>
                <strong>[SMS Gateway] Gửi đến ${phone}:</strong>
            </div>
            <div style="font-size: 0.85rem; line-height: 1.4; color: rgba(255,255,255,0.95);">
                Chào mừng bạn đến với PawPal! Tài khoản tạm của bạn đã được khởi tạo. Đặt mật khẩu ngay trong 48h để nhận 50 điểm thưởng và quản lý lịch hẹn trực tuyến: 
                <a href="${setupUrl}" target="_blank" style="color: #f1c40f; text-decoration: underline; word-break: break-all;">${setupUrl}</a>
            </div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
}

function calculateEndTime(startTime, durationStr) {
    if (!startTime) return null;
    const [h, m] = startTime.split(':').map(Number);
    let durationMinutes = 60;

    if (durationStr.includes('phút')) {
        durationMinutes = parseInt(durationStr.replace(/[^\d]/g, ''));
    } else if (durationStr.includes('giờ') || durationStr.includes('tiếng')) {
        durationMinutes = parseFloat(durationStr.replace(/[^\d.]/g, '')) * 60;
    }

    const totalMin = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;

    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

function normalizePhone(phone) {
    if (!phone) return '';
    const digits = String(phone).replace(/[^0-9]/g, '');
    if (digits.startsWith('84') && digits.length === 11) {
        return '0' + digits.slice(2);
    }
    if (digits.length === 10 && digits.startsWith('0')) {
        return digits;
    }
    return digits;
}

async function createSupabaseCustomer(currentUser) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const phone = normalizePhone(currentUser?.phone);
    if (!db || !phone) return null;

    try {
        const { data: inserted, error: insertError } = await db
            .from('customer')
            .insert({
                email: null,
                password_hash: null,
                account_status: 'ACTIVE',
                is_temporary: true,
                phone_main: phone,
                registered_at: new Date().toISOString(),
            })
            .select('id')
            .limit(1);

        if (insertError || !inserted?.length) {
            console.warn('[Booking] Supabase customer create failed:', insertError?.message || 'no data');
            return null;
        }

        const customerId = inserted[0].id;
        if (currentUser.name) {
            await db.from('customer_profile').insert({
                customer_id: customerId,
                full_name: resolveCurrentUserName(currentUser),
                gender: 'OTHER'
            });
        }

        return customerId;
    } catch (err) {
        console.warn('[Booking] Supabase customer create exception:', err.message);
        return null;
    }
}

async function getSupabaseCustomerId(currentUser) {
    if (!currentUser) return null;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return null;
    if (currentUser._source === 'supabase' && currentUser.id) return currentUser.id;
    if (!currentUser.phone) return null;

    try {
        const { data, error } = await db
            .from('customer')
            .select('id')
            .eq('phone_main', currentUser.phone)
            .limit(1);
        if (error) {
            console.warn('[Booking] Supabase customer lookup failed:', error.message);
            return null;
        }

        if (data?.length) {
            return data[0].id;
        }

        return await createSupabaseCustomer(currentUser);
    } catch (err) {
        console.warn('[Booking] Supabase customer lookup exception:', err.message);
        return null;
    }
}

async function getSupabasePetId(db, customerId, petId) {
    if (!db || !customerId || !petId) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petId);

    try {
        if (isUuid) {
            const { data, error } = await db.from('pet_profile')
                .select('id')
                .eq('id', petId)
                .limit(1);
            if (!error && data?.length) return data[0].id;
        }

        const { data, error } = await db.from('pet_profile')
            .select('id')
            .eq('customer_id', customerId)
            .eq('pet_code', petId)
            .limit(1);
        if (!error && data?.length) return data[0].id;
    } catch (err) {
        console.warn('[Booking] Supabase pet lookup failed:', err.message);
    }
    return null;
}

async function getSupabaseServiceId(db, serviceId) {
    if (!db || !serviceId) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId);

    try {
        if (isUuid) {
            const { data, error } = await db.from('service')
                .select('id')
                .eq('id', serviceId)
                .limit(1);
            if (!error && data?.length) return data[0].id;
        }

        const { data, error } = await db.from('service')
            .select('id')
            .eq('service_code', serviceId)
            .limit(1);
        if (!error && data?.length) return data[0].id;
    } catch (err) {
        console.warn('[Booking] Supabase service lookup failed:', err.message);
    }
    return null;
}

async function insertBookingToSupabase(bookingRecord, currentUser) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !currentUser) return null;

    const customerId = await getSupabaseCustomerId(currentUser);
    if (!customerId) {
        console.warn('[Booking] Không tìm hoặc tạo được customer Supabase cho', currentUser.phone);
        return null;
    }

    const serviceId = await getSupabaseServiceId(db, selectedService?.serviceId || selectedService?.id);
    const petId = await getSupabasePetId(db, customerId, bookingRecord.petId);
    const staffId = 'd0000000-5555-5555-5555-555555555555';
    const appointmentCode = bookingRecord.appointment_code || `APP-${Date.now()}`;
    const appointmentTime = bookingRecord.timeStart ? `${bookingRecord.timeStart}:00` : null;

    const payload = {
        appointment_code: appointmentCode,
        customer_id: customerId,
        pet_id: petId,
        service_id: serviceId,
        staff_id: staffId,
        appointment_date: bookingRecord.date,
        appointment_time: appointmentTime,
        appointment_status: 'PENDING',
        payment_status: 'PENDING',
        note: bookingRecord.note || null,
        total_price: bookingRecord.price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    try {
        const { data, error } = await db.from('appointment').insert([payload]).select();
        if (error || !data?.length) {
            console.warn('[Booking] Supabase insert failed:', error?.message || 'no data');
            return null;
        }
        return data[0];
    } catch (err) {
        console.warn('[Booking] Supabase insert exception:', err.message);
        return null;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function parseCSVDirectly(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const values = line.split('\t').map(v => {
            v = v.trim();
            if (v.startsWith('"') && v.endsWith('"')) {
                v = v.slice(1, -1);
            }
            return v;
        });
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        data.push(obj);
    }
    return data;
}

function transformServiceDataDirectly(rawData) {
    return rawData.map((item, index) => {
        const rawCategory = item['Phân loại'] || '';
        let category = 'other';
        if (rawCategory.includes('Spa và Grooming') || rawCategory.includes('Spa & Grooming')) {
            category = 'spa';
        } else if (rawCategory.includes('Pet Hotel')) {
            category = 'hotel';
        } else if (rawCategory.includes('Pet Taxi')) {
            category = 'taxi';
        }

        const priceSub5 = parseInt(item['Giá <5kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const price5to10 = parseInt(item['Giá 5-10kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const price10to20 = parseInt(item['Giá 10-20kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);
        const priceOver20 = parseInt(item['Giá >20kg (VNĐ)']?.replace(/[^\d]/g, '') || '0', 10);

        const prices = {
            '< 5kg': priceSub5,
            '5 - 10kg': price5to10,
            '10 - 20kg': price10to20,
            '> 20kg': priceOver20
        };

        const validPrices = Object.values(prices).filter(p => p > 0);
        const basePrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

        const rating = parseFloat(item['Đánh giá (Rating)'] || '4.8');
        const reviewCount = parseInt(item['Lượt đánh giá (Review Count)'] || '0', 10);

        return {
            id: index + 1,
            serviceId: item['Mã dịch vụ (Service ID)'] || `SVC-${index + 1}`,
            name: item['Tên dịch vụ'] || 'Dịch vụ',
            category: category,
            rawCategory: rawCategory,
            petType: item['Loại thú cưng'] || 'Tất cả',
            weightClass: validPrices.length > 0 ? 'Tùy chọn cân nặng' : 'Tất cả',
            price: basePrice,
            prices: prices,
            priceDisplay: category === 'hotel' ? 'đêm' : '',
            memberPrice: item['Giá ưu đãi thành viên (VNĐ)'] || '',
            duration: item['Thời gian thực hiện (Duration)'] || '',
            rating: rating,
            reviewCount: reviewCount,
            description: item['Mô tả chi tiết (Description)'] || '',
            benefits: item['Lợi ích chính (Key Benefits)'] || '',
            checklist: item['Quy trình thực hiện (Checklist)'] || '',
            amenities: item['Tiện ích / Cơ sở vật chất (Amenities)'] || '',
            groomerLevel: item['Cấp độ nhân viên thực hiện (Groomer Level)'] || '',
            image: item['Hình ảnh'] ? `/${item['Hình ảnh']}` : '/assets/images/services/spa.png',
            status: item['Trạng thái kinh doanh'] || 'Đang phục vụ'
        };
    });
}

async function loadServicesDirectly() {
    try {
        const response = await fetch('/data/dichvu.csv');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvText = await response.text();
        const rawData = parseCSVDirectly(csvText);
        return transformServiceDataDirectly(rawData);
    } catch (error) {
        console.warn('Root fetch failed, trying relative path...', error);
        const response = await fetch('../../data/dichvu.csv');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvText = await response.text();
        const rawData = parseCSVDirectly(csvText);
        return transformServiceDataDirectly(rawData);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.addon-qty-control button').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            const delta = parseInt(this.getAttribute('data-delta'), 10);
            if (target && !isNaN(delta)) {
                updateAddonQty(target, delta);
            }
        });
    });
});
