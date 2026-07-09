/**
 * login.js — UI logic riêng của trang login/register PawPal.
 * Phụ thuộc vào: /scripts/shared/auth.js (phải load trước)
 *
 * Chứa:
 *  - supabaseLogin()        — đăng nhập qua Supabase
 *  - supabaseCheckPhone()   — kiểm tra phone tồn tại trên Supabase
 *  - supabaseRegister()     — đăng ký tài khoản mới qua Supabase
 *  - handleLoginRouting()   — điều hướng section theo URL param
 *  - initAuthForms()        — toàn bộ form login, register, OTP, forgot password, setup password
 *  - initLoginPage()        — entry point, chỉ chạy trên trang login.html
 */

// ============================================================
// SUPABASE AUTH — logic nội bộ (thay thế supabase-auth.js)
// ============================================================

/**
 * Đăng nhập bằng phone + password qua Supabase.
 * Trả về { success, user, error, offline }
 */
async function supabaseLogin(phone, password) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return { success: false, offline: true };

    try {
        const { data: customers, error } = await db
            .from('customer')
            .select(`
                id,
                email,
                phone_main,
                account_status,
                password_hash,
                customer_profile (
                    full_name,
                    gender,
                    date_of_birth
                ),
                customer_membership (
                    total_paw_points,
                    membership_tier (
                        tier_name,
                        discount_percent
                    )
                )
            `)
            .eq('phone_main', phone)
            .eq('password_hash', password)
            .limit(1);

        if (error) {
            console.error('[Login] supabaseLogin query error:', error.message);
            return { success: false, error: error.message };
        }

        if (!customers || customers.length === 0) {
            return { success: false, error: 'wrong_password' };
        }

        const c = customers[0];

        if (c.account_status !== 'ACTIVE') {
            return { success: false, error: 'account_inactive' };
        }

        const profile    = Array.isArray(c.customer_profile) ? (c.customer_profile[0] || {}) : (c.customer_profile || {});
        const membership = Array.isArray(c.customer_membership) ? (c.customer_membership[0] || {}) : (c.customer_membership || {});
        const tier       = membership.membership_tier || {};

        const user = {
            id:           c.id,
            name:         String(profile.full_name || '').trim() || c.phone_main,
            phone:        c.phone_main,
            email:        c.email || '',
            password:     password,
            role:         'customer',
            is_temporary: false,
            points:       membership.total_paw_points || 0,
            tier:         tier.tier_name || 'Đồng',
            gender:       profile.gender || '',
            dob:          profile.date_of_birth || '',
            _source:      'supabase',
        };

            console.log('[Login] ✅ Login từ SUPABASE DATABASE — user:', user.name, '| phone:', user.phone, '| points:', user.points);
        return { success: true, user };

    } catch (err) {
        console.error('[Login] supabaseLogin exception:', err);
        return { success: false, error: err.message };
    }
}

async function supabaseResolveUserByPhone(phone) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !phone) return null;

    try {
        const { data: customers, error } = await db
            .from('customer')
            .select(`
                id,
                email,
                phone_main,
                account_status,
                password_hash,
                customer_profile (
                    full_name,
                    gender,
                    date_of_birth
                ),
                customer_membership (
                    total_paw_points,
                    membership_tier (
                        tier_name,
                        discount_percent
                    )
                )
            `)
            .eq('phone_main', phone)
            .limit(1);

        if (error || !customers || customers.length === 0) return null;

        const c = customers[0];
        const profile    = Array.isArray(c.customer_profile) ? (c.customer_profile[0] || {}) : (c.customer_profile || {});
        const membership = Array.isArray(c.customer_membership) ? (c.customer_membership[0] || {}) : (c.customer_membership || {});
        const tier       = membership.membership_tier || {};

        return {
            id:           c.id,
            name:         String(profile.full_name || '').trim() || c.phone_main,
            phone:        c.phone_main,
            email:        c.email || '',
            password:     c.password_hash || '',
            role:         'customer',
            is_temporary: c.account_status === 'INACTIVE',
            points:       membership.total_paw_points || 0,
            tier:         tier.tier_name || 'Đồng',
            gender:       profile.gender || '',
            dob:          profile.date_of_birth || '',
            _source:      'supabase',
        };
    } catch (err) {
        console.warn('[Login] supabaseResolveUserByPhone exception:', err);
        return null;
    }
}

function normalizePetSpecies(species) {
    const value = String(species || '').trim().toLowerCase();
    if (!value) return 'other';
    if (['dog', 'chó', 'cho', 'canine'].includes(value)) return 'dog';
    if (['cat', 'mèo', 'meo', 'feline'].includes(value)) return 'cat';
    return value;
}

function buildGuestPetFromUser(user, fallbackPhone = null) {
    const pet = user?.pet;
    if (!pet || typeof pet !== 'object') return null;

    const petName = String(pet.name || pet.pet_name || '').trim();
    if (!petName) return null;

    return {
        id: pet.id || `guest-pet-${String(fallbackPhone || user?.phone || Date.now())}`,
        userId: user?.id || fallbackPhone || user?.phone || null,
        name: petName,
        species: normalizePetSpecies(pet.species),
        otherSpecies: pet.otherSpecies || '',
        breed: pet.breed || '',
        gender: pet.gender || '',
        dateOfBirth: pet.dateOfBirth || pet.dob || pet.date_of_birth || '',
        color: pet.color || '',
        weight: pet.weight || '',
        avatar: pet.avatar || pet.avatar_url || '',
        allergies: pet.allergies || '',
        notes: pet.notes || '',
        isArchived: false,
        createdAt: pet.createdAt || new Date().toISOString(),
    };
}

function buildPetFromBooking(booking, fallbackPhone = null) {
    if (!booking) return null;

    const petName = String(booking.petName || booking.pet_name || booking.pet || '').trim();
    if (!petName) return null;

    const species = normalizePetSpecies(booking.petType || booking.petSpecies || booking.species || booking.pet_type);
    const breed = String(booking.petBreed || booking.pet_breed || '').trim();
    const weight = booking.petWeight || booking.pet_weight || '';
    const phone = String(fallbackPhone || booking.ownerPhone || booking.userPhone || booking.phone || '').trim();

    return {
        id: booking.petId || booking.pet_id || `guest-booking-pet-${phone || Date.now()}`,
        userId: booking.userId || phone || null,
        name: petName,
        species,
        otherSpecies: booking.petTypeOther || '',
        breed,
        gender: booking.petGender || '',
        dateOfBirth: booking.petDob || booking.petDateOfBirth || '',
        color: booking.petColor || '',
        weight,
        avatar: booking.petAvatar || '',
        allergies: booking.petNote || booking.petAllergies || '',
        notes: booking.petNote || '',
        isArchived: false,
        createdAt: booking.createdAt || booking.created_at || new Date().toISOString(),
    };
}

async function migrateGuestPetsToMember(user, fallbackPhone = null) {
    if (!user) return;

    const resolvedPhone = String(fallbackPhone || user.phone || user.phone_main || '').trim();
    const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const migrated = [];
    const seen = new Set();

    const pushUnique = (pet) => {
        if (!pet) return;
        const key = String(pet.id || `${pet.name}|${pet.breed}|${pet.weight}|${pet.createdAt || ''}`).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        migrated.push({ ...pet });
    };

    pets.forEach((pet) => {
        const ownsByPhone = resolvedPhone && (String(pet.userId) === resolvedPhone || String(pet.ownerPhone) === resolvedPhone);
        const ownsByTempUser = user?.id && String(pet.userId) === String(user.id);
        if (ownsByPhone || ownsByTempUser) {
            pushUnique({
                ...pet,
                userId: user.id || pet.userId || resolvedPhone || null,
                isArchived: false,
            });
        } else {
            pushUnique(pet);
        }
    });

    const embeddedPet = buildGuestPetFromUser(user, resolvedPhone);
    if (embeddedPet) {
        const alreadyExists = migrated.some((pet) =>
            String(pet.id).toLowerCase() === String(embeddedPet.id).toLowerCase() ||
            String(pet.name || '').trim().toLowerCase() === String(embeddedPet.name || '').trim().toLowerCase()
        );
        if (!alreadyExists) {
            migrated.unshift({
                ...embeddedPet,
                userId: user.id || resolvedPhone || embeddedPet.userId || null,
            });
        }
    }

    bookings.forEach((booking) => {
        const bookingPhone = String(booking.ownerPhone || booking.userPhone || booking.phone || '').trim();
        const bookingUserId = String(booking.userId || '').trim();
        const matchesUser = (user?.id && bookingUserId && bookingUserId === String(user.id)) || (resolvedPhone && bookingPhone === resolvedPhone);
        if (!matchesUser) return;

        const bookingPet = buildPetFromBooking(booking, resolvedPhone);
        if (!bookingPet) return;

        const alreadyExists = migrated.some((pet) =>
            String(pet.id || '').toLowerCase() === String(bookingPet.id || '').toLowerCase() ||
            String(pet.name || '').trim().toLowerCase() === String(bookingPet.name || '').trim().toLowerCase()
        );
        if (!alreadyExists) {
            migrated.push({
                ...bookingPet,
                userId: user.id || resolvedPhone || bookingPet.userId || null,
            });
        }
    });

    localStorage.setItem('pawpal_pets', JSON.stringify(migrated));
    localStorage.removeItem('pawpal_pets_supabase_synced');

    if (window.API && window.API.savePets) {
        try {
            await window.API.savePets(migrated);
        } catch (error) {
            console.warn('[Login] Failed to sync migrated guest pets:', error);
        }
    }

    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (db && user.id) {
        try {
            const rows = migrated
                .filter((pet) => String(pet.userId) === String(user.id))
                .map((pet) => ({
                    customer_id: user.id,
                    pet_code: pet.id || null,
                    pet_name: pet.name || '',
                    species: pet.species || 'other',
                    breed: pet.breed || '',
                    gender: pet.gender || '',
                    date_of_birth: pet.dateOfBirth || pet.dob || pet.date_of_birth || null,
                    color: pet.color || '',
                    weight: pet.weight || null,
                    avatar_url: pet.avatar || pet.avatar_url || '',
                    notes: pet.notes || pet.allergies || '',
                    status: pet.isArchived ? 'ARCHIVED' : 'ACTIVE',
                }));

            if (rows.length) {
                await db.from('pet_profile').upsert(rows, { onConflict: 'pet_code' });
            }
        } catch (error) {
            console.warn('[Login] Failed to upsert migrated guest pets to Supabase:', error);
        }
    }
}

/**
 * Kiểm tra phone đã tồn tại trên Supabase chưa (dùng trước khi đăng ký).
 * Trả về { exists, isTemporary, offline, error }
 */
async function supabaseCheckPhone(phone) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return { exists: false, offline: true };

    try {
        const { data, error } = await db
            .from('customer')
            .select('id, account_status')
            .eq('phone_main', phone)
            .limit(1);

        if (error) return { exists: false, error: error.message };
        if (!data || data.length === 0) return { exists: false };

        return {
            exists: true,
            isTemporary: data[0].account_status === 'INACTIVE',
        };
    } catch (err) {
        return { exists: false, error: err.message };
    }
}

/**
 * Đăng ký tài khoản mới qua Supabase.
 * Insert vào customer + customer_profile + customer_membership.
 * Trả về { success, user, error, offline }
 */
async function supabaseRegister(name, phone, password) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return { success: false, offline: true };

    try {
        // 1. Kiểm tra xem SĐT đã tồn tại chưa
        const { data: existingCust, error: checkErr } = await db
            .from('customer')
            .select('id, password_hash')
            .eq('phone_main', phone)
            .limit(1);

        if (checkErr) throw checkErr;

        let customerId;

        if (existingCust && existingCust.length > 0) {
            const cust = existingCust[0];
            // Nếu đã có mật khẩu => Tài khoản thành viên đã tồn tại
            if (cust.password_hash) {
                return { success: false, error: 'Số điện thoại này đã được đăng ký tài khoản.' };
            }

            // Nếu chưa có mật khẩu => Khách vãng lai -> Thăng cấp thành Thành viên
            const { error: updateErr } = await db
                .from('customer')
                .update({
                    password_hash: password,
                    registered_at: new Date().toISOString()
                })
                .eq('id', cust.id);
                
            if (updateErr) throw updateErr;
            customerId = cust.id;

            // Cập nhật lại tên cho Khách vãng lai
            if (name) {
                await db.from('customer_profile').update({ full_name: name }).eq('customer_id', customerId);
            }
        } else {
            // Trường hợp 3: Chưa có dữ liệu gì => Tạo mới hoàn toàn
            const { data: newCustomers, error: custErr } = await db
                .from('customer')
                .insert({
                    email:          null,
                    password_hash:  password,
                    account_status: 'ACTIVE',
                    phone_main:     phone,
                    registered_at:  new Date().toISOString(),
                })
                .select('id')
                .limit(1);

            if (custErr) throw custErr;
            customerId = newCustomers[0].id;

            await db.from('customer_profile').insert({
                customer_id: customerId,
                full_name:   name,
            });
        }

        // 3. Khởi tạo hạng thành viên nếu chưa có
        const { data: existingMembership } = await db.from('customer_membership').select('id').eq('customer_id', customerId).limit(1);
        if (!existingMembership || existingMembership.length === 0) {
            const { data: tiers } = await db
                .from('membership_tier')
                .select('id')
                .eq('tier_name', 'Đồng')
                .limit(1);

            const tierId = tiers?.[0]?.id;
            if (tierId) {
                await db.from('customer_membership').insert({
                    customer_id:        customerId,
                    membership_tier_id: tierId,
                    total_paw_points:   50,
                });
            }
        }

        const user = {
            id:           customerId,
            name:         String(name || '').trim() || phone,
            phone:        phone,
            email:        '',
            password:     password,
            role:         'customer',
            is_temporary: false,
            points:       50,
            tier:         'Đồng',
            _source:      'supabase',
        };

        return { success: true, user };

    } catch (err) {
        console.error('[Login] supabaseRegister exception:', err);
        return { success: false, error: err.message };
    }
}

// --- ĐIỀU HƯỚNG SECTION THEO URL (US 2-1, US 1-1, US 1-2) ---
function handleLoginRouting() {
    const params = new URLSearchParams(window.location.search);
    const hash   = window.location.hash;

    let action = params.get('action');
    let token  = params.get('token');

    // Dự phòng từ hash nếu server chuyển hướng làm mất query params
    if (!action && hash) {
        const hashClean = hash.substring(1);
        if (hashClean === 'register' || hashClean === 'login') {
            action = hashClean;
        } else if (hashClean.startsWith('setup-password')) {
            action = 'setup-password';
            const tokenMatch = hashClean.match(/token=([^&]+)/);
            if (tokenMatch) token = tokenMatch[1];
        }
    }

    const loginForm            = document.getElementById('loginForm');
    const registerForm         = document.getElementById('registerForm');
    const otpSection           = document.getElementById('otpSection');
    const congratsSection      = document.getElementById('congratsSection');
    const setupPasswordSection = document.getElementById('setupPasswordSection');
    const setupExpiredSection  = document.getElementById('setupExpiredSection');
    const authTabs             = document.getElementById('authTabs');

    if (!loginForm) return; // Không ở trang login.html

    // Reset về trạng thái mặc định
    loginForm.classList.remove('active-form');
    registerForm.classList.remove('active-form');
    otpSection.classList.add('d-none');
    congratsSection.classList.add('d-none');
    setupPasswordSection.classList.add('d-none');
    setupExpiredSection.classList.add('d-none');
    authTabs.style.display = 'flex';

    if (action === 'register') {
        registerForm.classList.add('active-form');
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');

        // Tự động điền số điện thoại từ query param (vd: từ footer đăng ký)
        const phoneParamForRegister = params.get('phone') || null;
        if (phoneParamForRegister) {
            const regPhoneInput = document.getElementById('registerPhone');
            if (regPhoneInput) {
                regPhoneInput.value = phoneParamForRegister;
                regPhoneInput.dispatchEvent(new Event('input'));
            }
        }
        setTimeout(() => {
            const regNameInput = document.getElementById('registerName');
            const regPassInput = document.getElementById('registerPassword');
            try {
                if (regNameInput && !regNameInput.value.trim()) regNameInput.focus();
                else if (regPassInput) regPassInput.focus();
            } catch (e) { /* ignore focus errors */ }
        }, 60);

    } else if (action === 'setup-password' && token) {
        authTabs.style.display = 'none';
        const tokens    = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        const tokenData = tokens.find(t => t.token === token);

        if (tokenData) {
            const timeElapsed = Date.now() - tokenData.createdAt;
            const limit = 48 * 60 * 60 * 1000; // 48 giờ
            if (timeElapsed <= limit) {
                setupPasswordSection.classList.remove('d-none');
                setupPasswordSection.dataset.phone = tokenData.phone;
                setupPasswordSection.dataset.token = token;
            } else {
                setupExpiredSection.classList.remove('d-none');
            }
        } else {
            setupExpiredSection.classList.remove('d-none');
        }

    } else {
        // Mặc định: login
        loginForm.classList.add('active-form');
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
    }

    // Điểm truy cập cho Khách vãng lai kích hoạt tài khoản / nhập OTP
    if (action === 'guest-activate' || action === 'guest-verify-otp') {
        const phoneParam = params.get('phone') || null;
        if (phoneParam && loginForm) {
            authTabs.style.display = 'none';
            const forgotOtpSection   = document.getElementById('forgotOtpSection');
            const forgotPhoneSection = document.getElementById('forgotPhoneSection');
            const loginStepPhone     = document.getElementById('loginStepPhone');
            const loginStepPassword  = document.getElementById('loginStepPassword');
            if (loginStepPhone)    loginStepPhone.style.display    = 'none';
            if (loginStepPassword) loginStepPassword.style.display = 'none';
            if (forgotPhoneSection) forgotPhoneSection.classList.add('d-none');

            if (forgotOtpSection) {
                forgotOtpSection.classList.remove('d-none');
                forgotOtpSection.style.opacity = '1';
                window.isGuestActivationFlow = true;
                window.guestActivationPhone  = phoneParam;

                const forgotPhoneInput = document.getElementById('forgotPhone');
                if (forgotPhoneInput) forgotPhoneInput.value = phoneParam;

                let titleText    = 'Xác thực kích hoạt tài khoản';
                let subtitleText = 'Mã xác thực 6 số đã được gửi đến SĐT của bạn để kích hoạt tài khoản tạm.';
                if (action === 'guest-verify-otp') {
                    titleText    = 'Xác thực để đổi/hủy lịch';
                    subtitleText = 'Mã xác thực 6 số đã được gửi đến SĐT của bạn để xác nhận danh tính.';
                }
                forgotOtpSection.querySelector('.form-title').textContent    = titleText;
                forgotOtpSection.querySelector('.form-subtitle').textContent = subtitleText;

                showToast('info', 'Mã OTP xác thực đã gửi về SMS: 555666', 6000);
                if (typeof window.startForgotOtpTimerFn === 'function') window.startForgotOtpTimerFn();

                const forgotOtpInputs = document.querySelectorAll('.forgot-otp-input');
                if (forgotOtpInputs && forgotOtpInputs.length) {
                    forgotOtpInputs.forEach((input, idx) => {
                        input.value    = '';
                        input.disabled = idx > 0;
                    });
                    forgotOtpInputs[0].focus();
                }
            }
        }
    }
}

// --- KHỞI TẠO TOÀN BỘ FORM LOGIN / REGISTER ---
function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Khai báo sớm — dùng chung toàn hàm
    const registerForm = document.getElementById('registerForm');
    const authTabs     = document.getElementById('authTabs');
    const tabLogin     = document.getElementById('tabLogin');
    const tabRegister  = document.getElementById('tabRegister');

    // Tab switching
    tabLogin.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=login');
        handleLoginRouting();
    });
    tabRegister.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=register');
        handleLoginRouting();
    });

    // --- AN/HIỆN MẬT KHẨU ---
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
        });
    });

    // --- ĐĂNG NHẬP MULTI-STEP (US 2-1) ---
    const btnLoginContinue  = document.getElementById('btnLoginContinue');
    const loginStepPhone    = document.getElementById('loginStepPhone');
    const loginStepPassword = document.getElementById('loginStepPassword');
    const loginPhone        = document.getElementById('loginPhone');
    const loginPhoneDisplay = document.getElementById('loginPhoneDisplay');
    const btnChangePhone    = document.getElementById('btnChangePhone');
    const loginPassword     = document.getElementById('loginPassword');

    if (btnLoginContinue) {
        btnLoginContinue.addEventListener('click', (e) => {
            e.preventDefault();
            const phoneVal = loginPhone.value.trim();
            const feedback = document.getElementById('loginPhoneFeedback');

            if (!/^0[0-9]{9}$/.test(phoneVal)) {
                loginPhone.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0';
                return;
            }
            loginPhone.classList.remove('is-invalid');

            const users = getUsers();
            const user  = users.find(u => u.phone === phoneVal);

            if (!user) {
                showErrorBanner(
                    'Số điện thoại chưa được đăng ký. Vui lòng <a href="?action=register" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">Đăng ký ngay</a>',
                    loginForm
                );
            } else if (user.is_temporary) {
                // Tài khoản tạm → hỏi gửi OTP kích hoạt
                loginStepPhone.classList.add('d-none');
                const loginStepSendOTP    = document.getElementById('loginStepSendOTP');
                const loginOtpPhoneDisplay = document.getElementById('loginOtpPhoneDisplay');
                if (loginOtpPhoneDisplay) loginOtpPhoneDisplay.textContent = phoneVal;
                if (loginStepSendOTP) loginStepSendOTP.classList.remove('d-none');

                const btnChangePhoneOtp = document.getElementById('btnChangePhoneOtp');
                if (btnChangePhoneOtp) {
                    btnChangePhoneOtp.onclick = () => {
                        loginStepSendOTP.classList.add('d-none');
                        loginStepPhone.classList.remove('d-none');
                        loginForm.classList.add('active-form');
                        loginForm.style.opacity = '1';
                        loginPhone.focus();
                    };
                }

                const btnSendOTPGuest = document.getElementById('btnSendOTPGuest');
                if (btnSendOTPGuest) {
                    btnSendOTPGuest.onclick = () => {
                        loginForm.style.opacity = '0';
                        setTimeout(() => {
                            loginForm.classList.remove('active-form');
                            if (authTabs) authTabs.style.display = 'none';

                            const forgotOtpSection = document.getElementById('forgotOtpSection');
                            forgotOtpSection.classList.remove('d-none');
                            forgotOtpSection.style.opacity = '1';
                            forgotOtpSection.querySelector('.form-title').textContent    = 'Xác thực kích hoạt tài khoản';
                            forgotOtpSection.querySelector('.form-subtitle').textContent = 'Mã OTP đã được gửi đến SĐT của bạn.';

                            window.isGuestActivationFlow = true;
                            window.guestActivationPhone  = user.phone;

                            showToast('info', 'Mã OTP xác thực: 555666', 15000);

                            const forgotOtpInputs = document.querySelectorAll('.forgot-otp-input');
                            forgotOtpInputs.forEach((input, idx) => {
                                input.value    = '';
                                input.disabled = idx > 0;
                            });
                            forgotOtpInputs[0].focus();

                            if (typeof window.startForgotOtpTimerFn === 'function') window.startForgotOtpTimerFn();
                        }, 300);
                    };
                }

                const btnSkipGuestSetup = document.getElementById('btnSkipGuestSetup');
                if (btnSkipGuestSetup) {
                    btnSkipGuestSetup.onclick = () => {
                        window.location.href = '/pages/public/landing/landing.html';
                    };
                }
            } else {
                // Thành viên chính thức → nhập mật khẩu
                loginStepPhone.classList.add('d-none');
                loginStepPassword.classList.remove('d-none');
                if (loginPhoneDisplay) loginPhoneDisplay.textContent = phoneVal;
                loginPassword.focus();
            }
        });
    }

    if (btnChangePhone) {
        btnChangePhone.addEventListener('click', () => {
            loginStepPassword.classList.add('d-none');
            loginStepPhone.classList.remove('d-none');
            loginPassword.value = '';
            const existingBanner = loginForm.querySelector('.auth-error-banner');
            if (existingBanner) existingBanner.remove();
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('input', () => {
            const b = loginForm.querySelector('.auth-error-banner');
            if (b) b.remove();
        });
    }
    if (loginPhone) {
        loginPhone.addEventListener('input', () => {
            const b = loginForm.querySelector('.auth-error-banner');
            if (b) b.remove();
            loginPhone.classList.remove('is-invalid');
        });
    }

    // --- SUBMIT LOGIN (US 2-1) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Nếu đang ở bước phone, delegate sang Continue
        if (loginStepPassword && loginStepPassword.classList.contains('d-none')) {
            if (btnLoginContinue) btnLoginContinue.click();
            return;
        }

        const phone    = loginPhone.value.trim();
        const password = loginPassword.value;

        if (!/^0[0-9]{9}$/.test(phone)) {
            loginPhone.classList.add('is-invalid');
            const feedback = document.getElementById('loginPhoneFeedback');
            if (feedback) feedback.textContent = 'Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0';
            return;
        }

        // --- Thử đăng nhập qua Supabase trước, fallback về localStorage ---
        if (window.SupabaseClient) {
            const result = await supabaseLogin(phone, password);

            if (!result.offline) {
                if (result.success) {
                    setCurrentUser(result.user);
                    showToast('success', 'Đăng nhập thành công!', 2000);
                    setTimeout(() => {
                        window.location.href = result.user.role === 'admin'
                            ? '/pages/admin/index/index.html'
                            : '/pages/user/dashboard/dashboard.html';
                    }, 2000);
                    return;
                }
                if (result.error === 'wrong_password') {
                    showErrorBanner(
                        'Mật khẩu không đúng. Vui lòng thử lại hoặc <a href="#" id="inlineForgotLink" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">quên mật khẩu?</a>',
                        loginForm
                    );
                    return;
                }
                if (result.error === 'account_inactive') {
                    showErrorBanner('Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.', loginForm);
                    return;
                }
                // Lỗi kết nối → fallback localStorage bên dưới
            }
        }

        // --- Fallback: localStorage (offline / chưa cấu hình Supabase) ---
        console.warn('[Login] ⚠️ Dùng LOCAL STORAGE — Supabase không khả dụng hoặc chưa cấu hình');
        const users       = getUsers();
        const userByPhone = users.find(u => u.phone === phone);

        if (!userByPhone) {
            // Kiểm tra Supabase xem phone có tồn tại không
            if (window.SupabaseClient) {
                const check = await supabaseCheckPhone(phone);
                if (!check.offline && !check.exists) {
                    showErrorBanner(
                        'Số điện thoại chưa được đăng ký. Vui lòng <a href="?action=register" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">Đăng ký ngay</a>',
                        loginForm
                    );
                    return;
                }
            }
            showErrorBanner(
                'Số điện thoại chưa được đăng ký. Vui lòng <a href="?action=register" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">Đăng ký ngay</a>',
                loginForm
            );
            return;
        }

        if (userByPhone.is_temporary) {
            if (btnLoginContinue) btnLoginContinue.click();
            return;
        }

        const user = users.find(u => u.phone === phone && u.password === password);
        if (user) {
            ensureUserId(user);
            setCurrentUser(user);
            saveUsers(getUsers().map(u => u.phone === user.phone ? user : u));
            showToast('success', 'Đăng nhập thành công!', 2000);
            setTimeout(() => {
                window.location.href = user.role === 'admin'
                    ? '/pages/admin/index/index.html'
                    : '/pages/user/dashboard/dashboard.html';
            }, 2000);
        } else {
            showErrorBanner(
                'Mật khẩu không đúng. Vui lòng thử lại hoặc <a href="#" id="inlineForgotLink" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">quên mật khẩu?</a>',
                loginForm
            );
            setTimeout(() => {
                const inlineForgotLink = document.getElementById('inlineForgotLink');
                if (inlineForgotLink) {
                    inlineForgotLink.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        const triggerForgot = document.getElementById('triggerForgot');
                        if (triggerForgot) triggerForgot.click();
                    });
                }
            }, 100);
        }
    });

    // --- ĐĂNG KÝ — Validation (US 1-1 / AC1.1.1) ---
    const regName            = document.getElementById('registerName');
    const regPhone           = document.getElementById('registerPhone');
    const regPassword        = document.getElementById('registerPassword');
    const regConfirmPassword = document.getElementById('registerConfirmPassword');
    const btnRegisterSubmit  = document.getElementById('btnRegisterSubmit');

    if (regPhone) {
        regPhone.addEventListener('blur', () => {
            const v = regPhone.value.trim();
            const fb = document.getElementById('registerPhoneFeedback');
            if (v.length > 0 && !/^0[0-9]{9}$/.test(v)) {
                regPhone.classList.add('is-invalid');
                if (fb) {
                    fb.textContent = 'Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0';
                    fb.style.display = 'block';
                }
            } else {
                regPhone.classList.remove('is-invalid');
                if (fb) fb.style.display = 'none';
            }
        });
        regPhone.addEventListener('input', () => {
            const v = regPhone.value.trim();
            const fb = document.getElementById('registerPhoneFeedback');
            if (/^0[0-9]{9}$/.test(v) || v.length === 0) {
                regPhone.classList.remove('is-invalid');
                if (fb) fb.style.display = 'none';
            }
        });
    }

    // Password strength meter
    const pwdStrengthFill = document.getElementById('registerPasswordStrengthFill');
    const pwdStrengthText = document.getElementById('registerPasswordStrengthText');
    const pwdStrengthWrap = document.getElementById('registerPasswordStrength');

    function assessPasswordStrength(pwd) {
        let score = 0;
        if (!pwd) return score;
        if (pwd.length >= 8) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
        return score;
    }

    function updatePasswordStrength(pwd) {
        if (!pwdStrengthFill || !pwdStrengthText || !pwdStrengthWrap) return;
        const score = assessPasswordStrength(pwd);
        pwdStrengthWrap.classList.remove('d-none');
        let pct = Math.min(100, (score / 4) * 100);
        let color = '#f87171', text = 'Yếu';
        if (score >= 3) { color = '#f59e0b'; text = 'Trung bình'; }
        if (score >= 4) { color = '#10b981'; text = 'Mạnh'; }
        if (score === 0) { pct = 0; text = 'Rỗng'; color = '#e5e7eb'; }
        pwdStrengthFill.style.width      = pct + '%';
        pwdStrengthFill.style.background = color;
        pwdStrengthText.textContent      = text;
    }

    if (regPassword) {
        regPassword.addEventListener('input', (e) => updatePasswordStrength(e.target.value));
    }

    function validateRegisterForm() {
        const isNameValid = regName.value.trim().length > 0;
        const isPhoneValid = /^0[0-9]{9}$/.test(regPhone.value.trim());
        const passwordPolicy = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        const isPasswordValid = passwordPolicy.test(regPassword.value);
        const isConfirmValid  = regConfirmPassword.value === regPassword.value && regConfirmPassword.value !== '';

        const phoneFb = document.getElementById('registerPhoneFeedback');
        if (regPhone.value.trim().length > 0 && !isPhoneValid) {
            regPhone.classList.add('is-invalid');
            if (phoneFb) phoneFb.style.display = 'block';
        } else {
            regPhone.classList.remove('is-invalid');
            if (phoneFb) phoneFb.style.display = 'none';
        }

        if (regPassword.value.length > 0 && !isPasswordValid) {
            regPassword.classList.add('is-invalid');
        } else {
            regPassword.classList.remove('is-invalid');
        }

        if (regConfirmPassword.value.length > 0 && !isConfirmValid) {
            regConfirmPassword.classList.add('is-invalid');
        } else {
            regConfirmPassword.classList.remove('is-invalid');
        }

        btnRegisterSubmit.disabled = !(isNameValid && isPhoneValid && isPasswordValid && isConfirmValid);
    }

    [regName, regPhone, regPassword, regConfirmPassword].forEach(input => {
        input.addEventListener('input', validateRegisterForm);
        input.addEventListener('blur',  validateRegisterForm);
    });

    // --- OTP ĐĂNG KÝ (US 1-1 / AC1.1.2) ---
    const otpSection  = document.getElementById('otpSection');
    const otpTimer    = document.getElementById('otpTimer');
    const btnResendOtp = document.getElementById('btnResendOtp');
    const otpInputs   = document.querySelectorAll('#otpSection .otp-input');
    let otpCountdownInterval = null;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Kiểm tra phone đã tồn tại chưa (Supabase trước, localStorage fallback)
        let phoneAlreadyExists = false;

        if (window.SupabaseClient) {
            const check = await supabaseCheckPhone(regPhone.value.trim());
            if (!check.offline) {
                phoneAlreadyExists = check.exists && !check.isTemporary;
            }
        }

        if (!phoneAlreadyExists) {
            const users    = getUsers();
            const existing = users.find(u => u.phone === regPhone.value.trim());
            if (existing && !existing.is_temporary) phoneAlreadyExists = true;
        }

        if (phoneAlreadyExists) {
            showToast('error', 'Số điện thoại này đã được đăng ký tài khoản chính thức!');
            return;
        }

        registerForm.style.opacity = '0';
        registerForm.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            registerForm.classList.remove('active-form');
            authTabs.style.display = 'none';
            otpSection.classList.remove('d-none');
            otpSection.style.opacity = '1';
            otpInputs.forEach((input, idx) => { input.value = ''; input.disabled = idx > 0; });
            otpInputs[0].focus();
            showToast('info', 'Mã OTP xác thực đã gửi về SMS: 555666', 15000);
            startOtpTimer();
        }, 300);
    });

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (!/^[0-9]$/.test(e.target.value)) { e.target.value = ''; return; }
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].disabled = false;
                otpInputs[index + 1].focus();
            } else {
                checkOtpSubmission();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    if (index > 0) { otpInputs[index - 1].focus(); otpInputs[index].disabled = true; }
                } else { input.value = ''; }
            }
        });
    });

    function startOtpTimer() {
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
        let duration = 10; // Changed to 10s for easier testing
        btnResendOtp.disabled = true;
        otpCountdownInterval = setInterval(() => {
            const m = Math.floor(duration / 60), s = duration % 60;
            otpTimer.textContent = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
            if (duration <= 0) { clearInterval(otpCountdownInterval); btnResendOtp.disabled = false; }
            duration--;
        }, 1000);
    }

    btnResendOtp.addEventListener('click', () => {
        showToast('info', 'Mã OTP xác thực mới đã gửi lại: 555666', 15000);
        startOtpTimer();
        otpInputs.forEach((input, idx) => { input.value = ''; input.disabled = idx > 0; });
        otpInputs[0].focus();
    });

    function checkOtpSubmission() {
        let code = '';
        otpInputs.forEach(i => code += i.value);
        if (code === '555666') {
            clearInterval(otpCountdownInterval);
            showRegisterSuccess();
        } else {
            showToast('error', 'Mã OTP chưa chính xác. Vui lòng nhập 555666 để test');
            otpInputs.forEach((input, idx) => { input.value = ''; if (idx > 0) input.disabled = true; });
            otpInputs[0].focus();
        }
    }

    async function showRegisterSuccess() {
        otpSection.classList.add('d-none');
        const congratsSection = document.getElementById('congratsSection');
        congratsSection.classList.remove('d-none');

        // Thử register lên Supabase trước
        let newUser = null;

        if (window.SupabaseClient) {
            const result = await supabaseRegister(
                regName.value.trim(),
                regPhone.value.trim(),
                regPassword.value
            );
            if (result.success) {
                newUser = result.user;
            }
        }

        // Fallback: lưu localStorage
        if (!newUser) {
            const users   = getUsers();
            let userIdx   = users.findIndex(u => u.phone === regPhone.value.trim());
            newUser = ensureUserId({
                name: regName.value.trim(), phone: regPhone.value.trim(),
                password: regPassword.value, role: 'customer', is_temporary: false, points: 50
            });
            if (userIdx !== -1) users[userIdx] = newUser; else users.push(newUser);
            saveUsers(users);
        }

        setCurrentUser(newUser);

        const counterEl = document.getElementById('pointsCounter');
        let current = 0;
        const stepTime = Math.abs(Math.floor(1500 / 50));
        const timer = setInterval(() => {
            current++;
            counterEl.textContent = current;
            if (current >= 50) {
                clearInterval(timer);
                setTimeout(() => { window.location.href = '/pages/user/dashboard/dashboard.html'; }, 2000);
            }
        }, stepTime);
    }

    // --- THIẾT LẬP MẬT KHẨU TỪ LINK SMS (US 1-2 / AC1.2.2) ---
    const setupPasswordForm  = document.getElementById('setupPasswordForm');
    const setupPass          = document.getElementById('setupPassword');
    const setupConfirm       = document.getElementById('setupConfirmPassword');
    const setupTermsCheckbox = document.getElementById('setupTermsCheckbox');
    const btnSetupSubmit     = document.getElementById('btnSetupSubmit');

    function validateSetupForm() {
        const passwordPolicy = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        const isPassValid    = passwordPolicy.test(setupPass.value);
        const isConfirmValid = setupConfirm.value === setupPass.value;
        const isTermsChecked = setupTermsCheckbox && setupTermsCheckbox.checked;

        if (setupPass.value.length > 0 && !isPassValid)        setupPass.classList.add('is-invalid');
        else                                                     setupPass.classList.remove('is-invalid');
        if (setupConfirm.value.length > 0 && !isConfirmValid)  setupConfirm.classList.add('is-invalid');
        else                                                     setupConfirm.classList.remove('is-invalid');

        btnSetupSubmit.disabled = !(isPassValid && isConfirmValid && isTermsChecked);
    }

    if (setupPasswordForm) {
        setupPass.addEventListener('input',    validateSetupForm);
        setupConfirm.addEventListener('input', validateSetupForm);
        if (setupTermsCheckbox) setupTermsCheckbox.addEventListener('change', validateSetupForm);

        setupPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('setupPasswordSection').dataset.phone;
            const token = document.getElementById('setupPasswordSection').dataset.token;
            const users = getUsers();
            
            // Prioritize finding the temporary account for this phone
            let idx = users.findIndex(u => u.phone === phone && u.is_temporary);
            if (idx === -1) {
                idx = users.findIndex(u => u.phone === phone);
            }
            
            if (idx !== -1) {
                const localUser = { ...users[idx] };
                const supabaseUser = await supabaseResolveUserByPhone(phone);
                const activatedUser = ensureUserId({
                    ...(supabaseUser || localUser),
                    ...localUser,
                    password: setupPass.value,
                    is_temporary: false,
                    points: ((supabaseUser?.points ?? localUser.points) || 0) + 50,
                    _source: supabaseUser ? 'supabase' : (localUser._source || 'local'),
                });

                users[idx] = activatedUser;
                saveUsers(users);
                setCurrentUser(activatedUser);
                await migrateGuestPetsToMember(activatedUser, phone);

                const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
                localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens.filter(t => t.token !== token)));

                showToast('success', 'Kích hoạt tài khoản thành viên thành công! Bạn nhận thêm 50 điểm thưởng chào mừng.');
                setTimeout(() => { window.location.href = '/pages/user/dashboard/dashboard.html'; }, 2000);
            }
        });
    }

    // Gửi lại link kích hoạt khi hết hạn
    const btnRequestNewLink = document.getElementById('btnRequestNewLink');
    if (btnRequestNewLink) {
        btnRequestNewLink.addEventListener('click', () => {
            const phone = document.getElementById('expiredPhone').value;
            if (!/^0[0-9]{9}$/.test(phone)) {
                showToast('error', 'Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0).');
                return;
            }
            const token  = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
            const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
            tokens.push({ token, phone, createdAt: Date.now() });
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
            showToast('success', 'Đã gửi link mới qua SMS. Vui lòng kiểm tra điện thoại.', 6000);
            console.log(`[SMS Simulation] ${window.location.origin}/pages/public/login/login.html?action=setup-password&token=${token}`);
        });
    }

    // --- QUÊN MẬT KHẨU — 3 BƯỚC (US 2-2) ---
    const triggerForgot           = document.getElementById('triggerForgot');
    const forgotPhoneSection      = document.getElementById('forgotPhoneSection');
    const btnForgotBackToLogin    = document.getElementById('btnForgotBackToLogin');
    const forgotPhoneForm         = document.getElementById('forgotPhoneForm');
    const forgotPhone             = document.getElementById('forgotPhone');
    const forgotOtpSection        = document.getElementById('forgotOtpSection');
    const btnForgotOtpBack        = document.getElementById('btnForgotOtpBack');
    const forgotOtpTimer          = document.getElementById('forgotOtpTimer');
    const btnForgotResendOtp      = document.getElementById('btnForgotResendOtp');
    const forgotOtpInputs         = document.querySelectorAll('.forgot-otp-input');
    const forgotNewPasswordSection = document.getElementById('forgotNewPasswordSection');
    const forgotNewPasswordForm   = document.getElementById('forgotNewPasswordForm');
    const forgotNewPassword       = document.getElementById('forgotNewPassword');
    const forgotConfirmNewPassword = document.getElementById('forgotConfirmNewPassword');
    const btnForgotNewPasswordSubmit = document.getElementById('btnForgotNewPasswordSubmit');
    let forgotOtpInterval = null;

    if (triggerForgot && forgotPhoneSection) {
        // Mở màn quên mật khẩu
        triggerForgot.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.opacity = '0';
            loginForm.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                loginForm.classList.remove('active-form');
                authTabs.style.display = 'none';
                forgotPhoneSection.classList.remove('d-none');
                forgotPhoneSection.style.opacity = '0';
                forgotPhoneSection.style.transition = 'opacity 0.3s ease';
                setTimeout(() => { forgotPhoneSection.style.opacity = '1'; forgotPhone.focus(); }, 50);
            }, 300);
        });

        // Quay lại login
        btnForgotBackToLogin.addEventListener('click', () => {
            forgotPhoneSection.style.opacity = '0';
            setTimeout(() => {
                forgotPhoneSection.classList.add('d-none');
                authTabs.style.display = 'flex';
                loginForm.classList.add('active-form');
                loginForm.style.opacity = '0';
                setTimeout(() => { loginForm.style.opacity = '1'; }, 50);
            }, 300);
        });

        // Validate SĐT quên mật khẩu
        forgotPhone.addEventListener('blur', () => {
            const v = forgotPhone.value.trim();
            if (v.length > 0 && !/^0[0-9]{9}$/.test(v)) forgotPhone.classList.add('is-invalid');
            else forgotPhone.classList.remove('is-invalid');
        });
        forgotPhone.addEventListener('input', () => forgotPhone.classList.remove('is-invalid'));

        // B1: Gửi OTP
        forgotPhoneForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = forgotPhone.value.trim();
            if (!/^0[0-9]{9}$/.test(phone)) { forgotPhone.classList.add('is-invalid'); return; }

            const users = getUsers();
            if (!users.find(u => u.phone === phone)) {
                showErrorBanner(
                    'Số điện thoại chưa đăng ký. Vui lòng <a href="?action=register" class="text-decoration-underline fw-bold" style="color:var(--color-danger);">Đăng ký tài khoản mới</a>.',
                    forgotPhoneForm
                );
                return;
            }

            forgotPhoneSection.classList.add('d-none');
            forgotOtpSection.classList.remove('d-none');
            forgotOtpSection.querySelector('.form-title').textContent    = 'Nhập mã xác thực';
            forgotOtpSection.querySelector('.form-subtitle').textContent = 'Mã OTP 6 số đã được gửi đến SĐT của bạn.';
            window.isGuestActivationFlow = false;

            forgotOtpInputs.forEach((input, idx) => { input.value = ''; input.disabled = idx > 0; });
            forgotOtpInputs[0].focus();
            showToast('info', 'Mã OTP xác thực đã được gửi về SMS: 555666', 15000);
            if (typeof window.startForgotOtpTimerFn === 'function') window.startForgotOtpTimerFn();
        });

        // Quay lại nhập SĐT
        btnForgotOtpBack.addEventListener('click', () => {
            forgotOtpSection.classList.add('d-none');
            forgotPhoneSection.classList.remove('d-none');
            if (forgotOtpInterval) clearInterval(forgotOtpInterval);
        });

        // B2: OTP input handling
        forgotOtpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (!/^[0-9]$/.test(e.target.value)) { e.target.value = ''; return; }
                if (index < forgotOtpInputs.length - 1) {
                    forgotOtpInputs[index + 1].disabled = false;
                    forgotOtpInputs[index + 1].focus();
                } else {
                    checkForgotOtpSubmission();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (input.value === '') {
                        if (index > 0) { forgotOtpInputs[index - 1].focus(); forgotOtpInputs[index].disabled = true; }
                    } else { input.value = ''; }
                }
            });
        });

        function startForgotOtpTimer() {
            if (forgotOtpInterval) clearInterval(forgotOtpInterval);
            let duration = 10; // Changed to 10s for easier testing
            btnForgotResendOtp.disabled = true;
            forgotOtpInterval = setInterval(() => {
                const m = Math.floor(duration / 60), s = duration % 60;
                forgotOtpTimer.textContent = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
                if (duration <= 0) { clearInterval(forgotOtpInterval); btnForgotResendOtp.disabled = false; }
                duration--;
            }, 1000);
        }
        window.startForgotOtpTimerFn = startForgotOtpTimer;

        if (btnForgotResendOtp) {
            btnForgotResendOtp.addEventListener('click', () => {
                showToast('info', 'Mã OTP xác thực mới đã gửi lại: 555666', 15000);
                startForgotOtpTimer();
                forgotOtpInputs.forEach((input, idx) => { input.value = ''; input.disabled = idx > 0; });
                forgotOtpInputs[0].focus();
            });
        }

        function checkForgotOtpSubmission() {
            let code = '';
            forgotOtpInputs.forEach(i => code += i.value);
            if (code === '555666') {
                clearInterval(forgotOtpInterval);
                forgotOtpSection.classList.add('d-none');
                if (window.isGuestActivationFlow) {
                    showToast('success', 'Xác thực OTP thành công! Vui lòng thiết lập mật khẩu.');
                    if (forgotPhone) forgotPhone.value = window.guestActivationPhone;
                }
                forgotNewPasswordSection.classList.remove('d-none');
                if (forgotNewPassword) forgotNewPassword.focus();
            } else {
                showToast('error', 'Mã OTP chưa chính xác. Vui lòng nhập 555666 để test');
                forgotOtpInputs.forEach((input, idx) => { input.value = ''; if (idx > 0) input.disabled = true; });
                forgotOtpInputs[0].focus();
            }
        }

        // B3: Mật khẩu mới
        function validateForgotNewPasswordForm() {
            const passwordPolicy  = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
            const isPassValid     = passwordPolicy.test(forgotNewPassword.value);
            const isConfirmValid  = forgotConfirmNewPassword.value === forgotNewPassword.value;

            if (forgotNewPassword.value.length > 0 && !isPassValid) forgotNewPassword.classList.add('is-invalid');
            else forgotNewPassword.classList.remove('is-invalid');

            if (forgotConfirmNewPassword.value.length > 0 && !isConfirmValid) forgotConfirmNewPassword.classList.add('is-invalid');
            else forgotConfirmNewPassword.classList.remove('is-invalid');

            btnForgotNewPasswordSubmit.disabled = !(isPassValid && isConfirmValid);
        }
        forgotNewPassword.addEventListener('input',        validateForgotNewPasswordForm);
        forgotConfirmNewPassword.addEventListener('input', validateForgotNewPasswordForm);

        forgotNewPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone   = forgotPhone.value.trim();
            const users   = getUsers();
            const isGuest = window.isGuestActivationFlow === true;
            
            // If it's a guest activation flow, prioritize finding the temporary account
            let userIdx = -1;
            if (isGuest) {
                userIdx = users.findIndex(u => u.phone === phone && u.is_temporary);
            }
            if (userIdx === -1) {
                userIdx = users.findIndex(u => u.phone === phone);
            }
            
            if (userIdx === -1) return;

            const localUser = { ...users[userIdx] };
            const supabaseUser = await supabaseResolveUserByPhone(phone);
            const updatedUser = ensureUserId({
                ...(supabaseUser || localUser),
                ...localUser,
                password: forgotNewPassword.value,
                is_temporary: isGuest ? false : Boolean(localUser.is_temporary),
                points: isGuest ? ((supabaseUser?.points ?? localUser.points) || 0) + 50 : (localUser.points || 0),
                _source: supabaseUser ? 'supabase' : (localUser._source || 'local'),
            });

            users[userIdx] = updatedUser;

            // Đồng bộ lên Supabase nếu có
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                try {
                    const updateData = { password_hash: forgotNewPassword.value };
                    if (isGuest) updateData.account_status = 'ACTIVE';
                    
                    const { error: dbErr } = await db
                        .from('customer')
                        .update(updateData)
                        .eq('phone_main', phone);
                        
                    if (dbErr) console.warn('[Login] Failed to update password on Supabase:', dbErr.message);
                    else console.log(`[Login] Supabase updated successfully for ${phone}`);
                } catch (err) {
                    console.error('[Login] Supabase update exception:', err);
                }
            }

            saveUsers(users);

            if (isGuest) {
                setCurrentUser(updatedUser);
                await migrateGuestPetsToMember(updatedUser, phone);
                sessionStorage.setItem('guestVerifiedPhone', phone);
                window.isGuestActivationFlow = false;
                showToast('success', 'Kích hoạt thành công! Bạn nhận 50 Paw Points chào mừng 🎉', 3000);
                setTimeout(() => { window.location.href = '/pages/user/dashboard/dashboard.html'; }, 2500);
                return;
            }

            showToast('success', 'Đặt lại mật khẩu thành công! Đang chuyển hướng...', 2000);
            setCurrentUser(updatedUser);
            setTimeout(() => {
                window.location.href = updatedUser.role === 'admin'
                    ? '/pages/admin/index/index.html'
                    : '/pages/user/dashboard/dashboard.html';
            }, 2000);
        });
    } // end if (triggerForgot)
} // end initAuthForms()

// --- ENTRY POINT — Chỉ chạy trên trang login.html ---
function initLoginPage() {
    // initMockDatabase đã chạy trong auth.js (initAuthShared)
    handleLoginRouting();
    initAuthForms();

    // Intercept click link login.html khi đang ở chính trang login.html
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        if (href.includes('login.html') && window.location.pathname.includes('login.html')) {
            e.preventDefault();
            window.history.pushState({}, '', href);
            handleLoginRouting();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
window.addEventListener('popstate', handleLoginRouting);

