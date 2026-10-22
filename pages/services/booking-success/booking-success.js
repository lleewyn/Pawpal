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

        if (!targetPhone) {
            const token = urlParams.get('token');
            if (token) {
                const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
                const tokenData = tokens.find(t => t.token === token);
                if (tokenData && tokenData.phone) {
                    targetPhone = tokenData.phone;
                }
            }
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

        const setupLink = document.getElementById('btnGuestActivateBooking') || document.querySelector('#passwordSetupCard a.btn-cta');
        if (setupLink) {
            setupLink.href = targetPhone
                ? `/login?action=guest-activate&phone=${encodeURIComponent(targetPhone)}`
                : `/login?action=guest-activate`;
        }

        const lookupLink = document.getElementById('btnGuestLookupBooking');
        if (lookupLink) {
            lookupLink.href = targetPhone
                ? `/return-guest?phone=${encodeURIComponent(targetPhone)}`
                : `/return-guest`;
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

    const myBookingsLink = document.querySelector('a[href*="#bookings"], a[href*="bookings.html"]');
    if (myBookingsLink) {
        myBookingsLink.setAttribute('href', '/pages/user/#bookings');
        myBookingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/user/#bookings';
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
                id, appointment_code, customer_id, scheduled_start_at,
                appointment_status, note,
                customer ( customer_phone ( phone_number, is_primary ) ),
                appointment_item ( name_snapshot, unit_price, is_primary )
            `)
            .eq('appointment_code', bookingCode)
            .limit(1);

        if (error || !data?.length) return null;
        const apt = data[0];
        const d = apt.scheduled_start_at ? new Date(apt.scheduled_start_at) : null;
        const phoneObj = (apt.customer?.customer_phone || []).find(p => p.is_primary) || apt.customer?.customer_phone?.[0];
        const primaryItem = (apt.appointment_item || []).find(i => i.is_primary) || apt.appointment_item?.[0];
        return {
            ...apt,
            appointment_date: d ? d.toLocaleDateString('vi-VN') : '',
            appointment_time: d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
            service_name: primaryItem?.name_snapshot || 'Dịch vụ PawPal',
            customer: { phone_main: phoneObj?.phone_number || '' }
        };
    } catch (err) {
        console.warn('[booking-success] resolveBookingByCode error:', err?.message || err);
        return null;
    }
}
