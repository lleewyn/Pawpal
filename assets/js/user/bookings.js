/* ==========================================================================
   Bookings List Page — bookings.js
   ========================================================================== */

// Mock data for development
export const mockBookings = [
    {
        id: 'BP-123456',
        petName: 'Bé Bông',
        petEmoji: '🐕',
        service: 'Spa & Grooming',
        package: 'Gói Premium',
        date: '2026-06-15',
        timeStart: '10:00',
        timeEnd: '11:30',
        staff: 'Minh An',
        price: 180000,
        status: 'confirmed',
        note: 'Bé sợ tiếng ồn, cần nhẹ nhàng'
    },
    {
        id: 'BP-234567',
        petName: 'Miu',
        petEmoji: '🐱',
        service: 'Pet Hotel',
        package: '3 đêm',
        date: '2026-06-20',
        dateEnd: '2026-06-23',
        price: 450000,
        status: 'pending',
        note: null
    },
    {
        id: 'BP-345678',
        petName: 'Lucky',
        petEmoji: '🐕',
        service: 'Khám sức khỏe',
        package: 'Khám tổng quát',
        date: '2026-06-18',
        timeStart: '14:00',
        timeEnd: '15:00',
        staff: 'Bác sĩ Thảo',
        price: 250000,
        status: 'in-progress',
        note: null
    },
    {
        id: 'BP-456789',
        petName: 'Milo',
        petEmoji: '🐕',
        service: 'Grooming',
        package: 'Cắt tỉa lông',
        date: '2026-05-10',
        timeStart: '09:00',
        timeEnd: '10:30',
        staff: 'An Nhiên',
        price: 150000,
        status: 'completed',
        note: null
    }
];

// Status labels
export const statusLabels = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'in-progress': 'Đang thực hiện',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy'
};

// Initialize page
function init() {
    if (!document.getElementById('bookingsList')) return;
    initFilterTabs();
    loadBookings('all');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Initialize filter tabs
function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Remove active class from all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });

            // Add active class to clicked tab
            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');

            // Load bookings for selected status
            const status = this.dataset.status;
            loadBookings(status);
        });
    });
}

// Load bookings based on status filter
function loadBookings(status) {
    const bookingsList = document.getElementById('bookingsList');
    const emptyState = document.getElementById('emptyState');

    // Filter and sort bookings
    let filteredBookings = [...mockBookings];
    if (status !== 'all') {
        filteredBookings = filteredBookings.filter(booking => booking.status === status);
    } else {
        // Sort by status for 'all' tab
        const statusOrder = { 'pending': 1, 'confirmed': 2, 'in-progress': 3, 'completed': 4, 'cancelled': 5 };
        filteredBookings.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    // Clear current cards only, preserve emptyState
    const currentCards = bookingsList.querySelectorAll('.booking-card');
    currentCards.forEach(card => card.remove());

    // Show empty state if no bookings
    if (filteredBookings.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    // Hide empty state
    emptyState.style.display = 'none';

    // Render booking cards
    filteredBookings.forEach(booking => {
        const card = createBookingCard(booking);
        bookingsList.appendChild(card);
    });
}


// Create booking card element
function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = `booking-card status-${booking.status}`;
    card.onclick = () => window.location.href = `booking-detail.html?id=${booking.id}`;

    // Format date and time
    let dateTimeText = formatDate(booking.date);
    if (booking.timeStart) {
        dateTimeText += ` • ${booking.timeStart} - ${booking.timeEnd}`;
    } else if (booking.dateEnd) {
        const nights = calculateNights(booking.date, booking.dateEnd);
        dateTimeText += ` - ${formatDate(booking.dateEnd)} (${nights} đêm)`;
    }

    // Card HTML
    card.innerHTML = `
        <div class="booking-card-header">
            <div>
                <div class="booking-card-pet-service">
                    ${booking.petEmoji} ${booking.petName} • ${booking.service}
                </div>
                <div class="booking-card-datetime">
                    📅 ${dateTimeText}
                </div>
                ${booking.staff ? `<div class="booking-card-staff">👤 Nhân viên: ${booking.staff}</div>` : ''}
            </div>
            <span class="badge-status badge-${booking.status}">${statusLabels[booking.status]}</span>
        </div>
        <div class="booking-card-footer">
            <div class="booking-card-price">💰 ${formatPrice(booking.price)}</div>
        </div>
    `;

    return card;
}

// Format date (DD/MM/YYYY)
export function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Calculate nights between two dates
function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Format price (Vietnamese currency)
export function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price).replace('₫', 'đ');
}

// Export for use in booking-detail.js
window.BookingsData = {
    mockBookings,
    statusLabels,
    formatDate,
    formatPrice
};
