document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingCode = urlParams.get('code');
    const displayBookingCode = document.getElementById('displayBookingCode');
    if (displayBookingCode) displayBookingCode.textContent = bookingCode || 'PP-000000';

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    const isLoggedMember = Boolean(currentUser && !currentUser.is_temporary);

    const currentBooking = await resolveBookingByCode(bookingCode);
    let targetPhone = '';

    if (!isLoggedMember) {
        if (currentBooking && currentBooking.customer && currentBooking.customer.phone_main) {
            targetPhone = currentBooking.customer.phone_main;
        } else if (currentUser && currentUser.phone) {
            targetPhone = currentUser.phone;
        }
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
                appointment_status, payment_status, note,
                customer ( phone_main )
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
