// ==========================================================================
// PawPal â€” Booking Page Script (Section 3.1.4)
// ==========================================================================

let allServices = [];
let initDiagnostics = "Not initialized yet.";
// Member discount config (change these to adjust member discount globally)
const MEMBER_DISCOUNT_PERCENT = 0.05; // 5%
const MEMBER_DISCOUNT_TEXT = 'ThÃ nh viÃªn Ä‘Æ°á»£c giáº£m thÃªm';
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
        document.getElementById('memberFlow').classList.remove('d-none');
        document.getElementById('guestFlow').classList.add('d-none');
        document.getElementById('guestInfoNote').classList.add('d-none');
        loadMemberPets(currentUser);
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
                validateGuestInput(id);
                validateStep1();
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id);
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
                <p style="margin: 0; color: var(--text-light);">Báº¡n chÆ°a cÃ³ há»“ sÆ¡ bÃ© cÆ°ng nÃ o.</p>
                <a href="../user/pet-profile.html" class="btn-green-outline btn-sm" style="margin-top: 10px; display: inline-block; padding: 6px 14px; font-size: 0.85rem; text-decoration: none;">+ ThÃªm há»“ sÆ¡ bÃ© cÆ°ng</a>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = activePets.map(pet => `
        <div class="pet-select-card" data-pet-id="${pet.id}" data-name="${pet.name}" data-type="${pet.species}" data-breed="${pet.breed}" data-weight="${pet.weight}" tabindex="0" role="button">
            <div class="pet-avatar-placeholder" style="font-size: 1.5rem; width: 44px; height: 44px;">
                ${pet.species === 'MÃ¨o' ? '' : (pet.species === 'ChÃ³' ? '' : (pet.species === 'Thá»' ? '' : (pet.species === 'Chuá»™t Hamster' ? '' : '')))}
            </div>
            <div class="pet-select-details">
                <span class="pet-select-name">${pet.name}</span>
                <span class="pet-select-meta">${pet.species} â€¢ ${pet.breed || 'ChÆ°a rÃµ'} â€¢ ${pet.weight}kg</span>
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
                validateGuestInput(id);
                validateStep1();
            });
            el.addEventListener('blur', () => {
                validateGuestInput(id);
                validateStep1();
            });
        }
    });

    const petTypeEl = document.getElementById('petType');
    const petTypeOtherGroup = document.getElementById('petTypeOtherGroup');
    if (petTypeEl) {
        petTypeEl.addEventListener('change', () => {
            // Toggle visibility of specific species input when 'KhÃ¡c' selected
            if (petTypeEl.value === 'KhÃ¡c') {
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
        if (petTypeEl.value === 'KhÃ¡c') petTypeOtherGroup && petTypeOtherGroup.classList.remove('d-none');
    }
}

function validateGuestInput(id) {
    const el = document.getElementById(id);
    const errEl = document.getElementById(`${id}Err`);
    if (!el || !errEl) return;

    let isValid = true;
    let errMsg = '';

    const val = el.value.trim();

    if ((id === 'ownerName' || id === 'memberOwnerName') && !val) {
        isValid = false;
        errMsg = 'Vui lÃ²ng nháº­p há» vÃ  tÃªn';
    } else if (id === 'ownerPhone' || id === 'memberOwnerPhone') {
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        if (!val) {
            isValid = false;
            errMsg = 'Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i';
        } else if (!phoneRegex.test(val)) {
            isValid = false;
            errMsg = 'SÄT khÃ´ng há»£p lá»‡ (10 chá»¯ sá»‘ báº¯t Ä‘áº§u báº±ng 0)';
        }
    } else if (id === 'petName' && !val) {
        isValid = false;
        errMsg = 'Vui lÃ²ng nháº­p tÃªn bÃ©';
    } else if (id === 'petTypeOther') {
        const petTypeSelect = document.getElementById('petType');
        const warnEl = document.getElementById('petTypeOtherWarn');
        // If user selected 'KhÃ¡c', require this field; otherwise ignore
        if (petTypeSelect && petTypeSelect.value === 'KhÃ¡c') {
            if (!val) {
                isValid = false;
                errMsg = 'Vui lÃ²ng nháº­p loÃ i cá»¥ thá»ƒ';
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
        errMsg = 'Vui lÃ²ng chá»n loáº¡i thÃº cÆ°ng';
    } else if (id === 'petWeight') {
        const weightVal = parseFloat(val);
        if (!val) {
            isValid = false;
            errMsg = 'Vui lÃ²ng nháº­p cÃ¢n náº·ng';
        } else if (isNaN(weightVal) || weightVal <= 0) {
            isValid = false;
            errMsg = 'CÃ¢n náº·ng pháº£i lá»›n hÆ¡n 0';
        }
    }

    if (!isValid) {
        el.classList.add('is-invalid');
        errEl.textContent = errMsg;
        errEl.classList.remove('d-none');
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
        // If 'KhÃ¡c' selected, require petTypeOtherVal
        if (isValid && petType === 'KhÃ¡c') {
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
                KhÃ´ng tÃ¬m tháº¥y dá»‹ch vá»¥ nÃ o phÃ¹ há»£p vá»›i tÃ¬m kiáº¿m cá»§a báº¡n.
            </p>
        `;
        return;
    }

    listContainer.innerHTML = filtered.map(service => {
        const calculatedPrice = calculateDynamicPrice(service, bookingState.petWeight);
        const formattedPrice = calculatedPrice.toLocaleString('vi-VN');
        const priceUnit = service.priceDisplay.includes('Ä‘Ãªm') ? ' / Ä‘Ãªm' : '';

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
                    <div class="svc-price-main">${formattedPrice}Ä‘${priceUnit}</div>
                    <div class="svc-price-duration" style="color: var(--color-primary); font-size: 0.8rem; font-weight: 600;">${formattedMemberPrice}Ä‘ (${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}% giáº£m cho thÃ nh viÃªn)</div>
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
    const normalizedWeight = Number(weight);
    const priceTable = service && service.prices ? service.prices : null;

    if (priceTable && Number.isFinite(normalizedWeight)) {
        if (normalizedWeight < 5 && Number.isFinite(priceTable['< 5kg']) && priceTable['< 5kg'] > 0) return priceTable['< 5kg'];
        if (normalizedWeight < 10 && Number.isFinite(priceTable['5 - 10kg']) && priceTable['5 - 10kg'] > 0) return priceTable['5 - 10kg'];
        if (normalizedWeight < 20 && Number.isFinite(priceTable['10 - 20kg']) && priceTable['10 - 20kg'] > 0) return priceTable['10 - 20kg'];
        if (Number.isFinite(priceTable['> 20kg']) && priceTable['> 20kg'] > 0) return priceTable['> 20kg'];
    }

    return Number.isFinite(service?.price) && service.price > 0 ? service.price : 0;
}

// Step 3: Date vÃ  Staff selection
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
                    document.getElementById('hotelNightsText').textContent = `${nights} Ä‘Ãªm`;

                    const calculatedPrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
                    const totalPrice = calculatedPrice * nights;
                    document.getElementById('hotelTotalPrice').textContent = `Táº¡m tÃ­nh: ${totalPrice.toLocaleString('vi-VN')}Ä‘`;

                    validateStep3();
                    updateSummary();
                } else {
                    alert('NgÃ y check-out pháº£i sau ngÃ y check-in.');
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
        bookingState.addons.push({ name: 'ChÄƒm sÃ³c dinh dÆ°á»¡ng', price: 30000, perNight: true });
    }

    if (document.getElementById('addonWalk')?.checked) {
        const qty = parseInt(document.getElementById('addonWalkQty')?.value || '1');
        bookingState.addons.push({ name: `Dáº¯t Ä‘i dáº¡o x${qty} lÆ°á»£t`, price: 40000 * qty, perNight: false });
    }

    if (document.getElementById('addonPlay')?.checked) {
        const qty = parseInt(document.getElementById('addonPlayQty')?.value || '1');
        bookingState.addons.push({ name: `ChÆ¡i tÆ°Æ¡ng tÃ¡c x${qty} lÆ°á»£t`, price: 20000 * qty, perNight: false });
    }

    if (document.getElementById('addonBath')?.checked) {
        // Addon Bath reduction - 20% off base Spa standard price
        // Mock Spa base price as 120,000 VNÄ
        const bathPrice = Math.round(120000 * 0.8);
        bookingState.addons.push({ name: 'Táº¯m vá»‡ sinh lÆ°u trÃº', price: bathPrice, perNight: false });
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
        holdBanner.innerHTML = `ï¸ <strong>Äang giá»¯ chá»— táº¡m thá»i:</strong> Khung giá» <strong>${slot}</strong> Ä‘Ã£ Ä‘Æ°á»£c khÃ³a riÃªng cho báº¡n. Vui lÃ²ng xÃ¡c nháº­n trong <strong>${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</strong>.`;
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
            holdBanner.innerHTML = ` <strong>Háº¿t thá»i gian giá»¯ chá»—!</strong> Khung giá» <strong>${slot}</strong> Ä‘Ã£ tá»± Ä‘á»™ng giáº£i phÃ³ng. Vui lÃ²ng chá»n láº¡i.`;
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
            { name: 'PhÃ¢n bá»• ngáº«u nhiÃªn', desc: 'PawPal tá»± Ä‘á»™ng chá»n báº£o máº«u trá»‘ng lá»‹ch', id: 'random' },
            { name: 'Nguyá»…n Minh An', desc: 'ChuyÃªn viÃªn Spa â€¢ 3 nÄƒm kinh nghiá»‡m', id: 'staff1' },
            { name: 'Tráº§n An NhiÃªn', desc: 'Báº£o máº«u Hotel â€¢ Cá»±c ká»³ nháº¹ nhÃ ng', id: 'staff2' },
            { name: 'LÃª HoÃ ng Tiáº¿n', desc: 'ChuyÃªn viÃªn cáº¯t tá»‰a Grooming', id: 'staff3' }
        ];

    listContainer.innerHTML = staffs.map(staff => {
        const isSelected = bookingState.staff === staff.name ? 'selected' : '';
        const initials = staff.name === 'PhÃ¢n bá»• ngáº«u nhiÃªn' ? '' : staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
            bookingState.petType = petTypeVal === 'KhÃ¡c' && petTypeOtherVal ? petTypeOtherVal : petTypeVal;
            bookingState.petBreed = document.getElementById('petBreed').value.trim() || 'ChÆ°a rÃµ';
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
        document.getElementById('sumOwnerVal').textContent = `${bookingState.ownerName} â€¢ ${bookingState.ownerPhone}`;
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
            dateText += ` $\\rightarrow$ ${formatDate(bookingState.checkOutDate)} (${bookingState.nights} Ä‘Ãªm)`;
        } else if (bookingState.timeSlot) {
            dateText += ` lÃºc ${bookingState.timeSlot}`;
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
    document.getElementById('sumPriceVal').textContent = `${finalPrice.toLocaleString('vi-VN')}Ä‘`;

    const sumMemberNote = document.getElementById('sumMemberNote');
    // Show member discount note with actual discount amount and percent
    const memberDiscount = isMember ? Math.round(totalPrice * MEMBER_DISCOUNT_PERCENT) : 0;
    if (isMember) {
        sumMemberNote.classList.remove('d-none');
        sumMemberNote.innerHTML = `${MEMBER_DISCOUNT_TEXT} ${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}% (-${memberDiscount.toLocaleString('vi-VN')}Ä‘)`;
    } else {
        sumMemberNote.classList.add('d-none');
        sumMemberNote.innerHTML = '';
    }
}

// Render Step 4 bill details
function renderStep4Confirm() {
    const basePrice = calculateDynamicPrice(selectedService, bookingState.petWeight);
    let subtotal = basePrice;

    let billLines = `
        <div class="summary-row">
            <span class="sum-label">${selectedService.name} (GiÃ¡ gá»‘c)</span>
            <span class="sum-value">${selectedService.price.toLocaleString('vi-VN')}Ä‘</span>
        </div>
    `;

    if (selectedService.category === 'spa' && bookingState.petWeight > 5) {
        const factor = bookingState.petWeight > 10 ? 0.5 : 0.2;
        const increase = Math.round(selectedService.price * factor);
        billLines += `
            <div class="summary-row" style="color: #c0392b;">
                <span class="sum-label"> $\\rightarrow$ Há»‡ sá»‘ cÃ¢n náº·ng (${bookingState.petWeight}kg: +${factor * 100}%)</span>
                <span class="sum-value">+${increase.toLocaleString('vi-VN')}Ä‘</span>
            </div>
        `;
    }

    if (selectedService.category === 'hotel') {
        const nights = bookingState.nights || 1;
        subtotal = basePrice * nights;
        billLines = `
            <div class="summary-row">
                <span class="sum-label">${selectedService.name} (${basePrice.toLocaleString('vi-VN')}Ä‘ Ã— ${nights} Ä‘Ãªm)</span>
                <span class="sum-value">${subtotal.toLocaleString('vi-VN')}Ä‘</span>
            </div>
        `;

        bookingState.addons.forEach(addon => {
            const cost = addon.perNight ? addon.price * nights : addon.price;
            billLines += `
                <div class="summary-row">
                    <span class="sum-label">${addon.name}</span>
                    <span class="sum-value">+${cost.toLocaleString('vi-VN')}Ä‘</span>
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
                <span class="sum-label">Kháº¥u trá»« thÃ nh viÃªn (Báº¡c -${Math.round(MEMBER_DISCOUNT_PERCENT * 100)}%)</span>
                <span class="sum-value">-${discount.toLocaleString('vi-VN')}Ä‘</span>
            </div>
        `;
    }

    const container = document.getElementById('confirmSummary');
    container.innerHTML = `
        <div class="confirm-bill-card" style="background: rgba(0,0,0,0.02); border: 1px solid var(--color-border); border-radius: var(--card-border-radius); padding: 20px; margin-bottom: 20px;">
            <h4 style="font-family: var(--font-heading); color: var(--color-primary-dark); margin-top:0; margin-bottom: 15px;">Chi tiáº¿t hÃ³a Ä‘Æ¡n</h4>
            
            ${billLines}
            
            <div class="summary-divider" style="margin: 15px 0; border-top: 1px solid var(--color-border);"></div>
            
            <div class="summary-row price-row" style="font-size: 1.2rem; font-weight: bold; color: var(--color-primary-dark);">
                <span class="sum-label">Tá»•ng tiá»n hÃ³a Ä‘Æ¡n:</span>
                <span class="sum-value" style="color: var(--color-primary);">${finalTotal.toLocaleString('vi-VN')} VNÄ</span>
            </div>

            <div class="summary-row price-row" style="font-size: 1.1rem; font-weight: bold; margin-top: 8px;">
                <span class="sum-label">Chi phÃ­ Ä‘áº·t cá»c:</span>
                <span class="sum-value" style="color: #27ae60; font-size: 1.3rem;">0 VNÄ</span>
            </div>

            <div class="alert-bill-note" style="margin-top: 15px; padding: 12px; border: 1px dashed #e67e22; background: rgba(230,126,34,0.08); border-radius: 8px; font-size: 0.85rem; color: #d35400; line-height: 1.5;">
                ï¸ <strong>Cáº£nh bÃ¡o:</strong> Má»©c giÃ¡ hiá»‡n táº¡i chá»‰ lÃ  dá»± kiáº¿n dá»±a trÃªn sá»‘ cÃ¢n náº·ng tá»± khai bÃ¡o (${bookingState.petWeight}kg). NhÃ¢n viÃªn sáº½ tiáº¿n hÃ nh cÃ¢n láº¡i thá»±c táº¿ táº¡i quáº§y Ä‘á»ƒ Ã¡p giÃ¡ chuáº©n nháº¥t theo quy Ä‘á»‹nh.
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
    confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span>Äang xá»­ lÃ½ Ä‘áº·t lá»‹ch...`;

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
        userId: currentUser ? currentUser.id : null, // gÃ¡n sau náº¿u lÃ  guest má»›i táº¡o
        ownerName: bookingState.ownerName,
        ownerPhone: bookingState.ownerPhone,
        petId: bookingState.petId || null,
        petName: bookingState.petName,
        petEmoji: bookingState.petType === 'MÃ¨o' ? '' : (bookingState.petType === 'ChÃ³' ? '' : (bookingState.petType === 'Thá»' ? '' : (bookingState.petType === 'Chuá»™t Hamster' ? '' : ''))),
        petWeight: bookingState.petWeight,
        service: selectedService.category === 'hotel' ? 'Pet Hotel' : 'Spa vÃ  Grooming',
        serviceName: selectedService.name,
        package: selectedService.name,
        date: bookingState.date,
        dateEnd: selectedService.category === 'hotel' ? bookingState.checkOutDate : null,
        time: selectedService.category === 'spa' ? bookingState.timeSlot : null,
        timeStart: selectedService.category === 'spa' ? bookingState.timeSlot : null,
        timeEnd: selectedService.category === 'spa' ? calculateEndTime(bookingState.timeSlot, selectedService.duration) : null,
        staff: selectedService.category === 'spa' ? bookingState.staff : 'Báº£o máº«u khÃ¡ch sáº¡n',
        branch: 'PawPal Chi nhÃ¡nh Quáº­n 1',
        price: finalPrice,
        status: 'upcoming',
        note: bookingState.petNote || null,
        changeCount: 0,
        cancelCount: 0,
        createdAt: new Date().toISOString()
    };

    bookings.push(bookingRecord);
    localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));

    // Handle vÃ£ng lai registration
    let generatedToken = null;
    if (!currentUser) {
        // Ngáº§m khá»Ÿi táº¡o "TÃ i khoáº£n táº¡m"
        const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
        const existing = users.find(u => u.phone === bookingState.ownerPhone);

        if (!existing) {
            const tempUser = {
                name: bookingState.ownerName,
                phone: bookingState.ownerPhone,
                role: 'customer',
                is_temporary: true,
                points: 0 // Sáº½ nháº­n 50 Ä‘iá»ƒm sau khi kÃ­ch hoáº¡t tÃ i khoáº£n
            };
            // Ensure user has an id
            try {
                ensureUserId(tempUser);
            } catch (e) {
                if (!tempUser.id) tempUser.id = 'USER-TMP-' + Date.now();
            }
            users.push(tempUser);
            localStorage.setItem('pawpal_users_db', JSON.stringify(users));

            // Patch userId vÃ o booking vá»«a táº¡o
            const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const bIdx = allBookings.findIndex(b => b.id === newBookingId);
            if (bIdx !== -1) {
                allBookings[bIdx].userId = tempUser.id;
                localStorage.setItem('pawpal_bookings', JSON.stringify(allBookings));
            }

            // Táº¡o pet profile liÃªn káº¿t vá»›i tÃ i khoáº£n táº¡m
            try {
                const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
                const petName = bookingState.petName || 'BÃ© cÆ°ng';
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

            // Táº¡o token kÃ­ch hoáº¡t tÃ i khoáº£n cÃ³ hiá»‡u lá»±c 48 giá»
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
            // Guest Ä‘Ã£ tá»“n táº¡i â€” patch userId vÃ o booking Ä‘á»ƒ dashboard/bookings.html tÃ¬m tháº¥y
            const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const bIdx = allBookings.findIndex(b => b.id === newBookingId);
            if (bIdx !== -1 && !allBookings[bIdx].userId) {
                allBookings[bIdx].userId = existing.id;
                localStorage.setItem('pawpal_bookings', JSON.stringify(allBookings));
            }
        }
    }

    // Trigger clear hold timer
    if (holdTimerInterval) {
        clearInterval(holdTimerInterval);
    }

    // Simulate API request delay
    setTimeout(() => {
        confirmBtn.innerHTML = ` Äáº·t lá»‹ch thÃ nh cÃ´ng!`;
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
                <strong>[SMS Gateway] Gá»­i Ä‘áº¿n ${phone}:</strong>
            </div>
            <div style="font-size: 0.85rem; line-height: 1.4; color: rgba(255,255,255,0.95);">
                ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i PawPal! TÃ i khoáº£n táº¡m cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi táº¡o. Äáº·t máº­t kháº©u ngay trong 48h Ä‘á»ƒ nháº­n 50 Ä‘iá»ƒm thÆ°á»Ÿng vÃ  quáº£n lÃ½ lá»‹ch háº¹n trá»±c tuyáº¿n: 
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

    if (durationStr.includes('phÃºt')) {
        durationMinutes = parseInt(durationStr.replace(/[^\d]/g, ''));
    } else if (durationStr.includes('giá»') || durationStr.includes('tiáº¿ng')) {
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
        const rawCategory = item['PhÃ¢n loáº¡i'] || '';
        let category = 'other';
        if (rawCategory.includes('Spa vÃ  Grooming') || rawCategory.includes('Spa & Grooming')) {
            category = 'spa';
        } else if (rawCategory.includes('Pet Hotel')) {
            category = 'hotel';
        } else if (rawCategory.includes('Pet Taxi')) {
            category = 'taxi';
        }

        const price = parseInt(item['GiÃ¡ niÃªm yáº¿t (VNÄ)']?.replace(/[^\d]/g, '') || '0', 10);
        const rating = parseFloat(item['ÄÃ¡nh giÃ¡ (Rating)'] || '4.8');
        const reviewCount = parseInt(item['LÆ°á»£t Ä‘Ã¡nh giÃ¡ (Review Count)'] || '0', 10);

        return {
            id: index + 1,
            serviceId: item['MÃ£ dá»‹ch vá»¥ (Service ID)'] || `SVC-${index + 1}`,
            name: item['TÃªn dá»‹ch vá»¥'] || 'Dá»‹ch vá»¥',
            category: category,
            rawCategory: rawCategory,
            petType: item['Loáº¡i thÃº cÆ°ng'] || 'Táº¥t cáº£',
            weightClass: 'TÃ¹y chá»n cáºn náº·ng',
            price: price,
            priceDisplay: item['GiÃ¡ <5kg (VNÄ)'] || item['GiÃ¡ niÃªm yáº¿t (VNÄ)'] || 'LiÃªn há»‡',
            prices: prices,
            memberPrice: item['GiÃ¡ Æ°u Ä‘Ã£i thÃ nh viÃªn (VNÄ)'] || '',
            duration: item['Thá»i gian thá»±c hiá»‡n (Duration)'] || '',
            rating: rating,
            reviewCount: reviewCount,
            description: item['MÃ´ táº£ chi tiáº¿t (Description)'] || '',
            benefits: item['Lá»£i Ã­ch chÃ­nh (Key Benefits)'] || '',
            checklist: item['Quy trÃ¬nh thá»±c hiá»‡n (Checklist)'] || '',
            amenities: item['Tiá»‡n Ã­ch / CÆ¡ sá»Ÿ váº­t cháº¥t (Amenities)'] || '',
            groomerLevel: item['Cáº¥p Ä‘á»™ nhÃ¢n viÃªn thá»±c hiá»‡n (Groomer Level)'] || '',
            image: item['HÃ¬nh áº£nh'] ? `/${item['HÃ¬nh áº£nh']}` : '/assets/images/services/spa.png',
            status: item['Tráº¡ng thÃ¡i kinh doanh'] || 'Äang phá»¥c vá»¥'
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

