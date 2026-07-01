// ==========================================================================
// PawPal — Booking Page Script (Section 3.1.4)
// ==========================================================================

let allServices = [];
let initDiagnostics = "Not initialized yet.";
// Member discount config (change these to adjust member discount globally)
const MEMBER_DISCOUNT_PERCENT = 0.05; // 5%
const MEMBER_DISCOUNT_TEXT = 'Thành viên được giảm thêm';
let selectedService = null;
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
    timeSlot: '',
    staff: '',
    addons: []
};

let holdTimerInterval = null;
let holdExpirationTime = null;
let heldSlot = '';

function loadBookingConfig() {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/data/booking-config.json', false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300) {
            const config = JSON.parse(xhr.responseText);
            window.PawPalBookingConfig = config;
            return config;
        }
    } catch (error) {
        console.warn('[booking] Cannot load booking-config.json:', error);
    }
    return null;
}

loadBookingConfig();

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== BOOKING MODULE INITIALIZING ===');

    // Load services from CSV using DataLoader (with direct fallback)
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
    }

    // Determine current user state
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    if (currentUser && !currentUser.is_temporary) {
        // Logged in member
        const allPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const activePets = allPets.filter(p => !p.isArchived && String(p.userId) === String(currentUser.id));
        
        if (activePets.length === 0) {
            // Logged in member but has no pets -> show guest flow for quick creation
            document.getElementById('memberFlow').classList.add('d-none');
            document.getElementById('guestFlow').classList.remove('d-none');
            document.getElementById('guestInfoNote').classList.add('d-none'); // Hide note as they already have an account
            
            bookingState.isMemberWithNoPets = true;
            bookingState.isGuest = true; // Use guest validation logic
            
            // Prefill guest form with member info
            const ownerNameInput = document.getElementById('ownerName');
            const ownerPhoneInput = document.getElementById('ownerPhone');
            if (ownerNameInput) ownerNameInput.value = currentUser.name || '';
            if (ownerPhoneInput) ownerPhoneInput.value = currentUser.phone || '';
            
            bookingState.ownerName = currentUser.name || '';
            bookingState.ownerPhone = currentUser.phone || '';
            
            setupGuestValidation();
        } else {
            // Normal member flow
            document.getElementById('memberFlow').classList.remove('d-none');
            document.getElementById('guestFlow').classList.add('d-none');
            document.getElementById('guestInfoNote').classList.add('d-none');
            loadMemberPets(currentUser);
        }
    } else {
        // Guest flow
        document.getElementById('memberFlow').classList.add('d-none');
        document.getElementById('guestFlow').classList.remove('d-none');
        document.getElementById('guestInfoNote').classList.remove('d-none');
        setupGuestValidation();
    }

    setupStepActions();
    setupServiceSelection();
    setupScheduleSelection();
    setupConfirmation();
    validateStep1();

    // Parse URL parameter ?service=SPA01 (from details/services page)
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedServiceId = urlParams.get('service');
    if (preselectedServiceId && allServices.length > 0) {
        const found = allServices.find(s => s.serviceId === preselectedServiceId);
        if (found) {
            selectedService = found;
            bookingState.serviceId = preselectedServiceId;

            // Set the active category tab
            const tabs = document.querySelectorAll('.svc-type-tab');
            tabs.forEach(tab => {
                if (tab.dataset.type === found.category) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            // Enable Step 2's next button
            const step2Next = document.getElementById('step2Next');
            if (step2Next) step2Next.disabled = false;

            // Pre-render services list with this category and selection
            renderServices(found.category);
            updateSummary();
        }
    }
});

function loadMemberPets(user) {
    const mNameInput = document.getElementById('memberOwnerName');
    const mPhoneInput = document.getElementById('memberOwnerPhone');
    
    if (mNameInput) mNameInput.value = user.name;
    if (mPhoneInput) mPhoneInput.value = user.phone;

    bookingState.ownerName = user.name;
    bookingState.ownerPhone = user.phone;

    // Attach validation listeners
    ['memberOwnerName', 'memberOwnerPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                validateGuestInput(id, false);
                validateStep1();
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id, true);
                validateStep1();
            });
        }
    });

    // Get pets from local storage
    const allPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
    const activePets = allPets.filter(p => !p.isArchived && String(p.userId) === String(user.id));

    const listContainer = document.getElementById('memberPetList');
    if (activePets.length === 0) {
        listContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 20px; background: rgba(0,0,0,0.03); border-radius: 8px;">
                <p style="margin: 0; color: var(--text-light);">Bạn chưa có hồ sơ bé cưng nào.</p>
                <a href="../../user/pet-profile/pet-profile.html" class="btn-green-outline btn-sm" style="margin-top: 10px; display: inline-block; padding: 6px 14px; font-size: 0.85rem; text-decoration: none;">+ Thêm hồ sơ bé cưng</a>
            </div>
        `;
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
        switch(pet.species) {
            case 'dog': speciesName = 'Chó'; break;
            case 'cat': speciesName = 'Mèo'; break;
            case 'rabbit': speciesName = 'Thỏ'; break;
            case 'other': speciesName = pet.otherSpecies || 'Khác'; break;
            default: speciesName = pet.species || 'Thú cưng';
        }
        if (pet.breed && pet.breed.trim() !== '') {
            return `${speciesName} ${pet.breed.trim()}`;
        }
        return speciesName;
    }

    listContainer.innerHTML = activePets.map(pet => `
        <div class="pet-select-card" data-pet-id="${pet.id}" data-name="${pet.name}" data-type="${pet.species}" data-breed="${pet.breed}" data-weight="${pet.weight}" tabindex="0" role="button">
            <div class="pet-avatar-placeholder" style="font-size: 1.5rem; width: 44px; height: 44px; overflow: hidden; border-radius: 50%;">
                <img src="${getPetAvatar(pet)}" alt="${pet.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="pet-select-details">
                <span class="pet-select-name">${pet.name}</span>
                <span class="pet-select-meta">${getSpeciesAndBreed(pet)} • ${pet.weight}kg</span>
            </div>
        </div>
    `).join('');

    // Attach click events
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
        });
    });
}

function setupGuestValidation() {
    const inputs = ['ownerName', 'ownerPhone', 'petName', 'petType', 'petTypeOther', 'petWeight'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                validateGuestInput(id, false);
                validateStep1();
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id, true);
                validateStep1();
            });
        }
    });

    const petTypeEl = document.getElementById('petType');
    const petTypeOtherGroup = document.getElementById('petTypeOtherGroup');
    if (petTypeEl) {
        petTypeEl.addEventListener('change', () => {
            // Toggle visibility of specific species input when 'Khác' selected
            if (petTypeEl.value === 'Khác') {
                petTypeOtherGroup && petTypeOtherGroup.classList.remove('d-none');
            } else {
                petTypeOtherGroup && petTypeOtherGroup.classList.add('d-none');
                // clear any previous warnings/errors
                const otherErr = document.getElementById('petTypeOtherErr');
                const otherWarn = document.getElementById('petTypeOtherWarn');
                if (otherErr) { otherErr.textContent = ''; otherErr.classList.add('d-none'); }
                if (otherWarn) { otherWarn.classList.add('d-none'); }
            }
            validateStep1();
        });
        // initialize visibility on load
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
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
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
        // If user selected 'Khác', require this field; otherwise ignore
        if (petTypeSelect && petTypeSelect.value === 'Khác') {
            if (!val) {
                isValid = false;
                errMsg = 'Vui lòng nhập loài cụ thể';
            } else {
                // check for weird characters (letters, spaces, hyphen, apostrophe allowed)
                const safeRe = /^[\p{L}\s\-']+$/u;
                if (!safeRe.test(val)) {
                    // show warning but do not block submission
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
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    let isValid = false;

    if (currentUser && !currentUser.is_temporary) {
        const mName = document.getElementById('memberOwnerName')?.value.trim() || '';
        const mPhone = document.getElementById('memberOwnerPhone')?.value.trim() || '';
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        
        isValid = bookingState.petId !== null && mName && mPhone && phoneRegex.test(mPhone);
    } else {
        const ownerName = document.getElementById('ownerName').value.trim();
        const ownerPhone = document.getElementById('ownerPhone').value.trim();
        const petName = document.getElementById('petName').value.trim();
        const petType = document.getElementById('petType').value;
        const petTypeOtherVal = document.getElementById('petTypeOther')?.value.trim() || '';
        const petWeight = parseFloat(document.getElementById('petWeight').value);

        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        isValid = ownerName && ownerPhone && phoneRegex.test(ownerPhone) && petName && petType && !isNaN(petWeight) && petWeight > 0;
        // If 'Khác' selected, require petTypeOtherVal
        if (isValid && petType === 'Khác') {
            isValid = petTypeOtherVal.length > 0;
        }
    }

    document.getElementById('step1Next').disabled = !isValid;
}

// Setup service rendering in step 2
function setupServiceSelection() {
    const listContainer = document.getElementById('svcSelectList');
    const tabs = document.querySelectorAll('.svc-type-tab');
    const searchInput = document.getElementById('svcSearchInput');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (searchInput) searchInput.value = ''; // Reset search
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

function renderServices(type, searchQuery = '') {
    const listContainer = document.getElementById('svcSelectList');
    if (!listContainer) return;

    // Filter services by category type (spa vs hotel)
    let filtered = allServices.filter(s => s.category === type);

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
                    <div class="svc-price-duration" style="color: var(--color-primary); font-size: 0.8rem; font-weight: 600;">${formattedMemberPrice}đ (${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}% giảm cho thành viên)</div>
                </div>
            </div>
        `;
    }).join('');

    // Attach click events
    listContainer.querySelectorAll('.svc-select-card').forEach(card => {
        card.addEventListener('click', () => {
            listContainer.querySelectorAll('.svc-select-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            bookingState.serviceId = card.dataset.id;
            selectedService = allServices.find(s => s.serviceId === bookingState.serviceId);

            document.getElementById('step2Next').disabled = false;
            updateSummary();
        });
    });
}

// Calculate dynamic price based on weight
function calculateDynamicPrice(service, weight) {
    if (!service.prices) return service.price;
    
    let targetPrice = service.price;
    if (weight < 5 && service.prices['< 5kg']) targetPrice = service.prices['< 5kg'];
    else if (weight >= 5 && weight < 10 && service.prices['5 - 10kg']) targetPrice = service.prices['5 - 10kg'];
    else if (weight >= 10 && weight < 20 && service.prices['10 - 20kg']) targetPrice = service.prices['10 - 20kg'];
    else if (weight >= 20 && service.prices['> 20kg']) targetPrice = service.prices['> 20kg'];
    
    return targetPrice;
}

// Step 3: Date và Staff selection
function setupScheduleSelection() {
    // Check-in and check-out dates for Hotel
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    const bookingDateInput = document.getElementById('bookingDate');

    // Set minimum date to today
    const todayStr = new Date().toISOString().split('T')[0];
    if (checkInInput) checkInInput.min = todayStr;
    if (checkOutInput) checkOutInput.min = todayStr;
    if (bookingDateInput) bookingDateInput.min = todayStr;

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

                    validateStep3();
                    updateSummary();
                } else {
                    alert('Ngày check-out phải sau ngày check-in.');
                    checkOutInput.value = '';
                    document.getElementById('hotelNightsDisplay').classList.add('d-none');
                    validateStep3();
                }
            }
        };

        checkInInput.addEventListener('change', onDateChange);
        checkOutInput.addEventListener('change', onDateChange);
    }

    if (bookingDateInput) {
        // Disable timeslot + staff section until date is picked
        const timeslotGrid = document.getElementById('timeslotGrid');
        const staffList    = document.getElementById('staffList');

        function setScheduleLocked(locked) {
            [timeslotGrid, staffList].forEach(el => {
                if (!el) return;
                el.style.opacity        = locked ? '0.4' : '';
                el.style.pointerEvents  = locked ? 'none' : '';
            });
        }

        // Lock on initial load
        setScheduleLocked(true);

        bookingDateInput.addEventListener('change', () => {
            bookingState.date = bookingDateInput.value;
            // Unlock only when a valid date is chosen
            setScheduleLocked(!bookingDateInput.value);
            renderTimeslots();
            validateStep3();
        });
    }

    // Addons checkbox changes
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
        // Addon Bath reduction - 20% off base Spa standard price
        // Mock Spa base price as 120,000 VNĐ
        const bathPrice = Math.round(120000 * 0.8);
        bookingState.addons.push({ name: 'Tắm vệ sinh lưu trú', price: bathPrice, perNight: false });
    }
}

// Global scope updateAddonQty for quantities
window.updateAddonQty = function (id, delta) {
    const input = document.getElementById(id);
    if (!input) return;

    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;

    updateAddons();
    updateSummary();
};

function renderTimeslots() {
    const grid = document.getElementById('timeslotGrid');
    if (!grid) return;

    const slots = (window.PawPalBookingConfig && Array.isArray(window.PawPalBookingConfig.slots))
        ? window.PawPalBookingConfig.slots
        : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    // Check if slots are too close to current time (under 2 hours)
    const now = new Date();
    const isToday = bookingState.date === now.toISOString().split('T')[0];

    // Determine busy slots from existing bookings instead of randomizing
    const existingBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');

    grid.innerHTML = slots.map(slot => {
        let isTooSoon = false;

        if (isToday) {
            const [hours, minutes] = slot.split(':');
            const slotTime = new Date();
            slotTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const diffMinutes = (slotTime - now) / (1000 * 60);
            if (diffMinutes < 120) { // under 2 hours
                isTooSoon = true;
            }
        }

        // Occupancy: check existing bookings matching date and start time (simple overlap)
        const isBusy = existingBookings.some(b => b.date === bookingState.date && b.timeStart === slot);

        let statusClass = 'open';
        if (isTooSoon) statusClass = 'soon';
        else if (isBusy) statusClass = 'busy';

        const disabled = isTooSoon || isBusy ? 'disabled' : '';
        const tooSoonClass = isTooSoon ? 'too-soon' : '';

        return `<button class="timeslot-btn slot-${statusClass} ${tooSoonClass}" ${disabled} data-slot="${slot}">${slot}</button>`;
    }).join('');

    // Re-apply selected / held classes if bookingState has a selected slot or a held slot
    grid.querySelectorAll('.timeslot-btn').forEach(btn => {
        const slot = btn.dataset.slot;
        // mark selected if it matches bookingState
        if (bookingState.timeSlot && bookingState.timeSlot === slot) {
            btn.classList.add('selected');
        }
        // mark held if it matches heldSlot
        if (heldSlot && heldSlot === slot) {
            btn.classList.add('held');
        }

        // Attach click events only for enabled buttons
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.disabled) return;

            // Deselect others and remove previous selected marker
            grid.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));

            // Mark clicked as selected and visually held
            btn.classList.add('selected');
            btn.classList.add('held');

            // Update booking state
            bookingState.timeSlot = btn.dataset.slot;

            // Start Hold Timer (clears previous holds inside)
            startHoldTimer(bookingState.timeSlot);

            renderStaff();
            validateStep3();
            updateSummary();
        });
    });
}

function startHoldTimer(slot) {
    if (holdTimerInterval) {
        clearInterval(holdTimerInterval);
    }
    // Remove held class from previous held slot button if any
    if (heldSlot) {
        const prevBtn = document.querySelector(`.timeslot-btn[data-slot="${heldSlot}"]`);
        if (prevBtn) {
            prevBtn.classList.remove('held');
        }
        heldSlot = '';
    }

    const holdBanner = document.getElementById('bookingHoldBanner');
    holdBanner.classList.remove('d-none');

    // Set 15 minutes hold time
    const duration = 15 * 60;
    let timeRemaining = duration;

    const updateTimerDisplay = () => {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        holdBanner.innerHTML = `️ <strong>Đang giữ chỗ tạm thời:</strong> Khung giờ <strong>${slot}</strong> đã được khóa riêng cho bạn. Vui lòng xác nhận trong <strong>${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</strong>.`;
    };

    updateTimerDisplay();
    // Track current held slot so we can clear class later
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

            // Deselect slot and remove held marker
            bookingState.timeSlot = '';
            document.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
            const heldBtn = document.querySelector(`.timeslot-btn[data-slot="${slot}"]`);
            if (heldBtn) heldBtn.classList.remove('held');
            heldSlot = '';
            document.getElementById('step3Next').disabled = true;
            updateSummary();
        } else {
            updateTimerDisplay();
        }
    }, 1000);
}

function renderStaff() {
    const listContainer = document.getElementById('staffList');
    if (!listContainer) return;

    const staffs = (window.PawPalBookingConfig && Array.isArray(window.PawPalBookingConfig.staffs))
        ? window.PawPalBookingConfig.staffs
        : [
            { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn bảo mẫu trống lịch', id: 'random' },
            { name: 'Nguyễn Minh An', desc: 'Chuyên viên Spa • 3 năm kinh nghiệm', id: 'staff1' },
            { name: 'Trần An Nhiên', desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng', id: 'staff2' },
            { name: 'Lê Hoàng Tiến', desc: 'Chuyên viên cắt tỉa Grooming', id: 'staff3' }
        ];

    listContainer.innerHTML = staffs.map(staff => {
        const isSelected = bookingState.staff === staff.name ? 'selected' : '';
        const initials = staff.name === 'Phân bổ ngẫu nhiên' ? '' : staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="staff-card ${isSelected}" data-name="${staff.name}" tabindex="0" role="button">
                <div class="staff-card-avatar" style="font-size: 1.1rem;">${initials}</div>
                <div class="staff-card-info">
                    <span class="staff-select-name" style="font-weight:700; display:block; color:var(--color-primary-dark); font-size:0.9rem; margin-bottom: 2px;">${staff.name}</span>
                    <span class="staff-card-status" style="font-size:0.75rem; color: var(--color-text-light); line-height: 1.2; display: block;">${staff.desc}</span>
                </div>
            </div>
        `;
    }).join('');

    // Attach click events
    listContainer.querySelectorAll('.staff-card').forEach(card => {
        card.addEventListener('click', () => {
            listContainer.querySelectorAll('.staff-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            bookingState.staff = card.dataset.name;
            validateStep3();
            updateSummary();
        });
    });
}

function validateStep3() {
    let isValid = false;
    if (selectedService.category === 'hotel') {
        isValid = bookingState.date !== '' && bookingState.checkOutDate !== '';
    } else {
        isValid = bookingState.date !== '' && bookingState.timeSlot !== '' && bookingState.staff !== '';
    }
    document.getElementById('step3Next').disabled = !isValid;
}

// Step actions (next / back)
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

    const stepsIndicator = document.getElementById('bookingStepper').querySelectorAll('.step');

    const goToStep = (targetStep) => {
        // Hide all panels
        Object.values(panels).forEach(p => p.classList.remove('active'));
        // Show target panel
        panels[targetStep].classList.add('active');

        // Update stepper indicator class
        stepsIndicator.forEach((indicator, index) => {
            if (index + 1 < targetStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index + 1 === targetStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });

        bookingState.step = targetStep;

        if (targetStep === 2) {
            const categoryToRender = selectedService ? selectedService.category : 'spa';
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
            if (selectedService.category === 'hotel') {
                document.getElementById('hotelDateRange').classList.remove('d-none');
                document.getElementById('hotelAddonsSection').classList.remove('d-none');
                document.getElementById('spaSchedule').classList.add('d-none');
            } else {
                document.getElementById('hotelDateRange').classList.add('d-none');
                document.getElementById('hotelAddonsSection').classList.add('d-none');
                document.getElementById('spaSchedule').classList.remove('d-none');
                renderTimeslots();
                renderStaff();
            }
        } else if (targetStep === 4) {
            renderStep4Confirm();
        }

        updateSummary();
    };

    // Next click
    nextButtons[1].addEventListener('click', () => {
        // Collect step 1 data if guest
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
        if (!currentUser || currentUser.is_temporary) {
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

    // Back click
    backButtons[2].addEventListener('click', () => goToStep(1));
    backButtons[3].addEventListener('click', () => goToStep(2));
    backButtons[4].addEventListener('click', () => goToStep(3));
}

// Update sidebar summary details
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

    // Set details
    const sumService = document.getElementById('sumService');
    const sumPet = document.getElementById('sumPet');
    const sumOwner = document.getElementById('sumOwner');
    const sumStaff = document.getElementById('sumStaff');
    const sumDate = document.getElementById('sumDate');

    // Service
    sumService.classList.remove('d-none');
    document.getElementById('sumServiceVal').textContent = selectedService.name;

    // Pet
    if (bookingState.petName) {
        sumPet.classList.remove('d-none');
        document.getElementById('sumPetVal').textContent = `${bookingState.petName} (${bookingState.petWeight}kg)`;
    } else {
        sumPet.classList.add('d-none');
    }

    // Owner
    if (bookingState.ownerName) {
        sumOwner.classList.remove('d-none');
        document.getElementById('sumOwnerVal').textContent = `${bookingState.ownerName} • ${bookingState.ownerPhone}`;
    } else {
        sumOwner.classList.add('d-none');
    }

    // Staff
    if (selectedService.category === 'spa' && bookingState.staff) {
        sumStaff.classList.remove('d-none');
        document.getElementById('sumStaffVal').textContent = bookingState.staff;
    } else {
        sumStaff.classList.add('d-none');
    }

    // Date
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

    // Price
    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let totalPrice = basePrice;

    if (selectedService.category === 'hotel') {
        totalPrice = basePrice * (bookingState.nights || 1);
        // Addons
        bookingState.addons.forEach(addon => {
            if (addon.perNight) {
                totalPrice += addon.price * (bookingState.nights || 1);
            } else {
                totalPrice += addon.price;
            }
        });
    }

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = currentUser && !currentUser.is_temporary;

    const finalPrice = isMember ? Math.round(totalPrice * (1 - MEMBER_DISCOUNT_PERCENT)) : totalPrice;
    const prefix = (!bookingState.petWeight && selectedService.prices) ? 'Từ ' : '';

    const sumSubtotalRow = document.getElementById('sumSubtotalRow');
    const sumDiscountRow = document.getElementById('sumDiscountRow');

    if (isMember) {
        sumSubtotalRow.classList.remove('d-none');
        document.getElementById('sumSubtotalVal').textContent = `${prefix}${totalPrice.toLocaleString('vi-VN')}đ`;

        const memberDiscount = Math.round(totalPrice * MEMBER_DISCOUNT_PERCENT);
        sumDiscountRow.classList.remove('d-none');
        document.getElementById('sumDiscountLabel').textContent = `${MEMBER_DISCOUNT_TEXT} (-${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}%)`;
        document.getElementById('sumDiscountVal').textContent = `-${memberDiscount.toLocaleString('vi-VN')}đ`;
    } else {
        sumSubtotalRow.classList.add('d-none');
        sumDiscountRow.classList.add('d-none');
    }

    document.getElementById('sumPriceVal').textContent = `${prefix}${finalPrice.toLocaleString('vi-VN')}đ`;
}

// Render Step 4 bill details
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

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = currentUser && !currentUser.is_temporary;

    const discount = isMember ? Math.round(subtotal * MEMBER_DISCOUNT_PERCENT) : 0;
    const finalTotal = subtotal - discount;

    if (isMember) {
        billLines += `
            <div class="summary-row" style="color: #27ae60;">
                <span class="sum-label">Khấu trừ thành viên (Bạc -${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}%)</span>
                <span class="sum-value">-${discount.toLocaleString('vi-VN')}đ</span>
            </div>
        `;
    }

    const container = document.getElementById('confirmSummary');
    container.innerHTML = `
        <div class="confirm-bill-card" style="background: rgba(0,0,0,0.02); border: 1px solid var(--color-border); border-radius: var(--card-border-radius); padding: 20px; margin-bottom: 20px;">
            <h4 style="font-family: var(--font-heading); color: var(--color-primary-dark); margin-top:0; margin-bottom: 15px;">Chi tiết hóa đơn</h4>
            
            ${billLines}
            
            <div class="summary-divider" style="margin: 15px 0; border-top: 1px solid var(--color-border);"></div>
            
            <div class="summary-row price-row" style="font-size: 1.2rem; font-weight: bold; color: var(--color-primary-dark);">
                <span class="sum-label">Tổng tiền hóa đơn:</span>
                <span class="sum-value" style="color: var(--color-primary);">${finalTotal.toLocaleString('vi-VN')} VNĐ</span>
            </div>

            <div class="summary-row price-row" style="font-size: 1.1rem; font-weight: bold; margin-top: 8px;">
                <span class="sum-label">Chi phí đặt cọc:</span>
                <span class="sum-value" style="color: #27ae60; font-size: 1.3rem;">0 VNĐ</span>
            </div>

            <div class="alert-bill-note" style="margin-top: 15px; padding: 12px; border: 1px dashed #e67e22; background: rgba(230,126,34,0.08); border-radius: 8px; font-size: 0.85rem; color: #d35400; line-height: 1.5;">
                ️ <strong>Cảnh báo:</strong> Mức giá hiện tại chỉ là dự kiến dựa trên số cân nặng tự khai báo (${bookingState.petWeight}kg). Nhân viên sẽ tiến hành cân lại thực tế tại quầy để áp giá chuẩn nhất theo quy định.
            </div>
        </div>
    `;
}

// Step 4 policy validation check
function setupConfirmation() {
    const policyChk = document.getElementById('policyCheck');
    const confirmBtn = document.getElementById('confirmBookingBtn');

    if (policyChk && confirmBtn) {
        policyChk.addEventListener('change', () => {
            confirmBtn.disabled = !policyChk.checked;
        });

        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            processBookingSubmit();
        });
    }
}

// Final Submit
function processBookingSubmit() {
    const confirmBtn = document.getElementById('confirmBookingBtn');

    // Disable button and show spinner
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span>Đang xử lý đặt lịch...`;

    // Save booking database representation
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const newBookingId = 'BP-' + Math.floor(100000 + Math.random() * 900000);

    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let totalPrice = basePrice;
    if (selectedService.category === 'hotel') {
        totalPrice = basePrice * (bookingState.nights || 1);
        bookingState.addons.forEach(addon => {
            totalPrice += addon.perNight ? addon.price * (bookingState.nights || 1) : addon.price;
        });
    }

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isMember = currentUser && !currentUser.is_temporary;
    const finalPrice = isMember ? Math.round(totalPrice * (1 - MEMBER_DISCOUNT_PERCENT)) : totalPrice;

    const bookingRecord = {
        id: newBookingId,
        userId: currentUser ? currentUser.id : null, // gán sau nếu là guest mới tạo
        ownerName: bookingState.ownerName,
        ownerPhone: bookingState.ownerPhone,
        petId: bookingState.petId || null,
        petName: bookingState.petName,
        petEmoji: bookingState.petType === 'Mèo' ? '' : (bookingState.petType === 'Chó' ? '' : (bookingState.petType === 'Thỏ' ? '' : (bookingState.petType === 'Chuột Hamster' ? '' : ''))),
        petWeight: bookingState.petWeight,
        service: selectedService.category === 'hotel' ? 'Pet Hotel' : 'Spa và Grooming',
        serviceName: selectedService.name,
        package: selectedService.name,
        date: bookingState.date,
        dateEnd: selectedService.category === 'hotel' ? bookingState.checkOutDate : null,
        time: selectedService.category === 'spa' ? bookingState.timeSlot : null,
        timeStart: selectedService.category === 'spa' ? bookingState.timeSlot : null,
        timeEnd: selectedService.category === 'spa' ? calculateEndTime(bookingState.timeSlot, selectedService.duration) : null,
        staff: selectedService.category === 'spa' ? bookingState.staff : 'Bảo mẫu khách sạn',
        branch: 'PawPal Chi nhánh Quận 1',
        price: finalPrice,
        status: 'upcoming',
        note: bookingState.petNote || null,
        changeCount: 0,
        cancelCount: 0,
        createdAt: new Date().toISOString()
    };

    bookings.push(bookingRecord);
    localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));

    // Handle vãng lai registration
    let generatedToken = null;
    if (!currentUser) {
        // Ngầm khởi tạo "Tài khoản tạm"
        const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
        const existing = users.find(u => u.phone === bookingState.ownerPhone);

        if (!existing) {
            const tempUser = {
                name: bookingState.ownerName,
                phone: bookingState.ownerPhone,
                role: 'customer',
                is_temporary: true,
                points: 0 // Sẽ nhận 50 điểm sau khi kích hoạt tài khoản
            };
            // Ensure user has an id
            try {
                ensureUserId(tempUser);
            } catch (e) {
                if (!tempUser.id) tempUser.id = 'USER-TMP-' + Date.now();
            }
            users.push(tempUser);
            localStorage.setItem('pawpal_users_db', JSON.stringify(users));

            // Patch userId vào booking vừa tạo
            const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const bIdx = allBookings.findIndex(b => b.id === newBookingId);
            if (bIdx !== -1) {
                allBookings[bIdx].userId = tempUser.id;
                localStorage.setItem('pawpal_bookings', JSON.stringify(allBookings));
            }

            // Tạo pet profile liên kết với tài khoản tạm
            try {
                const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
                const petName = bookingState.petName || 'Bé cưng';
                const petExists = pets.some(p => String(p.userId) === String(tempUser.id) && p.name === petName);
                if (!petExists) {
                    const newPet = {
                        id: 'PET-' + Date.now(),
                        name: petName,
                        species: bookingState.petType || 'other',
                        breed: bookingState.petBreed || '',
                        weight: bookingState.petWeight || '',
                        userId: tempUser.id,
                        isArchived: false,
                        createdAt: new Date().toISOString()
                    };
                    pets.unshift(newPet);
                    localStorage.setItem('pawpal_pets', JSON.stringify(pets));
                }
            } catch (e) {
                console.warn('Could not persist pet for temp user', e);
            }

            // Tạo token kích hoạt tài khoản có hiệu lực 48 giờ
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
        } else {
            // Guest đã tồn tại — patch userId vào booking để dashboard/bookings.html tìm thấy
            const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const bIdx = allBookings.findIndex(b => b.id === newBookingId);
            if (bIdx !== -1 && !allBookings[bIdx].userId) {
                allBookings[bIdx].userId = existing.id;
                localStorage.setItem('pawpal_bookings', JSON.stringify(allBookings));
            }
        }
    } else if (currentUser && bookingState.isMemberWithNoPets) {
        // Create pet profile for member
        try {
            const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
            const petName = bookingState.petName || 'Bé cưng';
            const newPet = {
                id: 'PET-' + Date.now(),
                name: petName,
                species: bookingState.petType || 'other',
                breed: bookingState.petBreed || '',
                weight: bookingState.petWeight || '',
                userId: currentUser.id,
                isArchived: false,
                createdAt: new Date().toISOString()
            };
            pets.unshift(newPet);
            localStorage.setItem('pawpal_pets', JSON.stringify(pets));
        } catch (e) {
            console.warn('Could not persist pet for member', e);
        }
    }

    // Trigger clear hold timer
    if (holdTimerInterval) {
        clearInterval(holdTimerInterval);
    }

    // Simulate API request delay
    setTimeout(() => {
        confirmBtn.innerHTML = ` Đặt lịch thành công!`;
        window.location.href = `../booking-success/booking-success.html?code=${newBookingId}`;
    }, 1200);
}

// Show toast SMS simulation for guest account setup
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

    // For guest activation flow, point to login with guest-activate action so user receives OTP first
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

// Helper time calculation
function calculateEndTime(startTime, durationStr) {
    if (!startTime) return null;
    const [h, m] = startTime.split(':').map(Number);
    let durationMinutes = 60; // default 1h

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

// Format date (DD/MM/YYYY)
function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// === DIRECT CSV LOAD FALLBACKS ===
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
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            const delta = parseInt(this.getAttribute('data-delta'), 10);
            if (target && !isNaN(delta)) {
                updateAddonQty(target, delta);
            }
        });
    });
});
