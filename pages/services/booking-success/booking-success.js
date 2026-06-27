document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const bookingCode = urlParams.get('code');
            document.getElementById('displayBookingCode').textContent = bookingCode || 'PP-000000';

            // Find if there's a temporary guest user account waiting for password setup
            const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
            const isLoggedMember = Boolean(currentUser && !currentUser.is_temporary);

            // Check if this booking belongs to a temporary user
            const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const currentBooking = bookings.find(b => b.id === bookingCode);

            const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
            let targetUser = null;

            if (isLoggedMember) {
                targetUser = null;
            } else if (currentBooking && currentBooking.userId) {
                targetUser = users.find(u => String(u.id) === String(currentBooking.userId) && u.is_temporary) || null;
            } else if (currentBooking) {
                targetUser = users.find(u => u.phone === currentBooking.ownerPhone && u.is_temporary) || null;
            } else if (currentUser && currentUser.is_temporary) {
                targetUser = currentUser;
            }

            if (targetUser) {
                // Show password setup card for guest
                document.getElementById('passwordSetupCard').style.display = 'block';
                document.getElementById('memberActions').style.display = 'none';

                // Update the setup link to start guest activation (OTP) flow on the login page
                const setupLink = document.querySelector('#passwordSetupCard a.btn-cta');
                if (setupLink) {
                    setupLink.href = `/pages/public/login/login.html?action=guest-activate&phone=${encodeURIComponent(targetUser.phone)}`;
                }

                // Display logic is enough, logic for OTP and password setup handled in login.js
            } else {
                // Already a member
                document.getElementById('passwordSetupCard').style.display = 'none';
                document.getElementById('memberActions').style.display = 'block';
            }
        });
