document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('code');
    const displayBookingCode = document.getElementById('displayBookingCode');
    if (displayBookingCode) displayBookingCode.textContent = bookingCode || 'PP-000000';

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isLoggedMember = Boolean(currentUser && !currentUser.is_temporary);

    const booking = await resolveBookingByCode(bookingCode);
    const localBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const currentBooking = booking || localBookings.find(b => String(b.id) === String(bookingCode));

    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    let targetUser = null;
    let targetPhone = '';

    if (!isLoggedMember) {
        if (currentBooking && currentBooking.customer && currentBooking.customer.phone_main) {
            targetPhone = currentBooking.customer.phone_main;
        } else if (currentBooking && currentBooking.ownerPhone) {
            targetPhone = currentBooking.ownerPhone;
        }
        
        if (currentBooking && currentBooking.customer_id) {
            targetUser = users.find(u => String(u.id) === String(currentBooking.customer_id) && u.is_temporary) || null;
        } else if (currentBooking && currentBooking.userId) {
            targetUser = users.find(u => String(u.id) === String(currentBooking.userId) && u.is_temporary) || null;
        } else if (currentUser && currentUser.is_temporary) {
            targetUser = currentUser;
        } else if (currentBooking) {
            targetUser = users.find(u => u.phone === currentBooking.ownerPhone && u.is_temporary) || null;
        }
        
        if (!targetPhone && targetUser) targetPhone = targetUser.phone;
    }

    if (!isLoggedMember) {
        const passwordSetupCard = document.getElementById('passwordSetupCard');
        const memberActions = document.getElementById('memberActions');
        if (passwordSetupCard) {
            passwordSetupCard.style.display = 'block';
            passwordSetupCard.classList.remove('d-none');
        }
        if (memberActions) {
            memberActions.style.display = 'none';
            memberActions.classList.add('d-none');
        }

        const setupLink = document.querySelector('#passwordSetupCard a.btn-cta');
        if (setupLink) {
            setupLink.href = targetPhone
                ? `/pages/public/login/login.html?action=guest-activate&phone=${encodeURIComponent(targetPhone)}`
                : `/pages/public/login/login.html?action=guest-activate`;
        }
    } else {
        const passwordSetupCard = document.getElementById('passwordSetupCard');
        const memberActions = document.getElementById('memberActions');
        if (passwordSetupCard) {
            passwordSetupCard.style.display = 'none';
            passwordSetupCard.classList.add('d-none');
        }
        if (memberActions) {
            memberActions.style.display = 'flex';
            memberActions.classList.remove('d-none');
        }
    }

    const myBookingsLink = document.querySelector('a[href*="/pages/user/bookings/bookings.html"]');
    if (myBookingsLink) {
        myBookingsLink.setAttribute('href', '/pages/user/bookings/bookings.html');
        myBookingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/user/bookings/bookings.html';
        });
    }
});

async function resolveBookingByCode(bookingCode) {
    if (!bookingCode) return null;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return null;

    try {
        const { data, error } = await db
            .from('appointment')
            .select(`
                id, appointment_code, customer_id, appointment_date, appointment_time,
                appointment_status, payment_status, note
            `)
            .eq('appointment_code', bookingCode)
            .limit(1);

        if (error || !data?.length) return null;
        return data[0];
    } catch (err) {
        console.warn('[booking-success] resolveBookingByCode error:', err?.message || err);
        return null;
    }
}
