/* ==========================================================================
   pet-profile.js — Client logic for Pet ID Profile Pages
   localStorage key: pawpal_pets, pawpal_bookings, pawpal_tracker_logs
   ========================================================================== */

const STORAGE_KEY = 'pawpal_pets';
const BOOKING_KEY = 'pawpal_bookings';
const TRACKER_LOGS_KEY = 'pawpal_tracker_logs';
const MAX_PHOTO_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── ID generator ──────────────────────────────────────────────────────────────
export function generatePetId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `PP-${num}`;
}

// ── Age calculator ────────────────────────────────────────────────────────────
export function calcAge(birthday) {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12
                 + (now.getMonth() - birth.getMonth());
    if (months < 0) return null;
    if (months < 12) return `${months} tháng tuổi`;
    const years = Math.floor(months / 12);
    return `${years} tuổi`;
}

// ── Date Formatter ────────────────────────────────────────────────────────────
export function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Toast Notification ────────────────────────────────────────────────────────
export function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Read and Write Pets ────────────────────────────────────────────────────────
export function getPets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const pets = raw ? JSON.parse(raw) : [];
        console.log('✅ getPets() returned:', pets.length, 'pets');
        return pets;
    } catch (e) {
        console.error('❌ getPets() error:', e);
        // Return mock data for testing if localStorage fails
        return [];
    }
}

export function savePets(allPets) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allPets));
        console.log('✅ savePets() saved', allPets.length, 'pets');
        return true;
    } catch (e) {
        console.error('❌ savePets() error:', e);
        showToast('Không thể lưu hồ sơ. Vui lòng thử xóa bớt ảnh hoặc hồ sơ cũ.', 'error');
        return false;
    }
}

// ── Read and Write Bookings ─────────────────────────────────────────────────────
export function getBookings() {
    try {
        const raw = localStorage.getItem(BOOKING_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

// ── Read and Write Tracker Logs ─────────────────────────────────────────────────
export function getTrackerLogs() {
    try {
        const raw = localStorage.getItem(TRACKER_LOGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveTrackerLogs(logs) {
    try {
        localStorage.setItem(TRACKER_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error('pet-profile.js saveTrackerLogs error:', e);
    }
}
