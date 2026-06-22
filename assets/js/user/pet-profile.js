/* ==========================================================================
   pet-profile.js — Core utilities
   ========================================================================== */

const STORAGE_KEY = 'pawpal_pets';
const TRACKER_LOGS_KEY = 'pawpal_pet_tracker_logs';

export function generatePetId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `PP-${num}`;
}

export function calcAge(birthday) {
    if (!birthday) return 'Chưa biết';
    const birth = new Date(birthday);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 0) return 'Chưa biết';
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return remainMonths > 0 ? `${years} tuổi ${remainMonths} tháng` : `${years} tuổi`;
}

export function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function seedDefaultPets() {
    const demoPets = [
        {
            id: 'PP-1001',
            name: 'Bông',
            species: 'Chó',
            breed: 'Poodle',
            weight: 4.2,
            dob: '2022-03-10',
            allergies: 'Dị ứng lúa mì, tránh thức ăn có gluten',
            notes: 'Thích được vuốt ve, sợ tiếng ồn lớn.',
            photo: '',
            deleted: false,
            createdAt: '2025-01-15T08:00:00.000Z',
            updatedAt: '2025-01-15T08:00:00.000Z'
        },
        {
            id: 'PP-1002',
            name: 'Miu',
            species: 'Mèo',
            breed: 'Mèo Anh lông ngắn',
            weight: 3.8,
            dob: '2021-07-22',
            allergies: '',
            notes: 'Tính cách độc lập, không thích bị bế lâu.',
            photo: '',
            deleted: false,
            createdAt: '2025-02-01T09:00:00.000Z',
            updatedAt: '2025-02-01T09:00:00.000Z'
        }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoPets));
}

export function getPets() {
    try {
        let raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            seedDefaultPets();
            raw = localStorage.getItem(STORAGE_KEY);
        }
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('getPets error:', e);
        return [];
    }
}

export function savePets(pets) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
        console.log(' Đã lưu', pets.length, 'bé cưng');
        return true;
    } catch (e) {
        console.error('savePets error:', e);
        showToast('Không thể lưu dữ liệu. Vui lòng thử lại.', 'error');
        return false;
    }
}

// ── Tracker Logs (QUAN TRỌNG) ─────────────────────────────────────────────
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
        console.error('saveTrackerLogs error:', e);
    }
}