/* ==========================================================================
   care-history.js - Lich su cham soc (US 7-3)
   Data source: pawpal_pets + pawpal_pet_tracker_logs in localStorage
   ========================================================================== */

import { getTrackerLogs, calcAge, fmtDate, showToast } from '../pet-profile/pet-profile.js';
import { getPets } from '/assets/js/api/petService.js';
import { API } from '/assets/js/api/api.js';

let currentPetId = null;

export async function initCareHistory() {
    await API.initData();
    await populatePetSelector();

    const selector = document.getElementById('petSelector');
    if (selector) selector.addEventListener('change', handlePetChange);

    const urlParams = new URLSearchParams(window.location.search);
    const petIdFromUrl = urlParams.get('id');
    if (petIdFromUrl && selector) {
        selector.value = petIdFromUrl;
        handlePetChange({ target: selector });
    }
}

async function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;

    const pets = await getSelectablePets();
    while (selector.options.length > 1) selector.remove(1);

    pets.forEach((pet) => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = [pet.name, getSpeciesDisplay(pet), pet.breed ? `(${pet.breed})` : ''].filter(Boolean).join(' ');
        selector.appendChild(option);
    });
}

async function getSelectablePets() {
    const pets = await getPets();
    if (Array.isArray(pets) && pets.length > 0) {
        return pets.filter((pet) => !pet.isArchived);
    }

    try {
        const fallback = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        return Array.isArray(fallback) ? fallback.filter((pet) => !pet.isArchived) : [];
    } catch {
        return [];
    }
}

function getSpeciesDisplay(pet) {
    if (!pet) return 'Thú cưng';
    if (pet.species === 'other' && pet.otherSpecies && pet.otherSpecies.trim() !== '') {
        return pet.otherSpecies.trim();
    }

    const map = { dog: 'Chó', cat: 'Mèo', rabbit: 'Thỏ' };
    return map[pet.species] || 'Thú cưng';
}

function handlePetChange(event) {
    const petId = event.target.value;
    const emptyState = document.getElementById('emptyState');
    const historyContent = document.getElementById('historyContent');

    if (!petId) {
        if (emptyState) emptyState.classList.remove('d-none');
        if (historyContent) historyContent.classList.add('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (historyContent) historyContent.classList.remove('d-none');

    currentPetId = petId;
    loadCareHistory(petId);
}

async function loadCareHistory(petId) {
    const pets = await getSelectablePets();
    const pet = pets.find((item) => item.id === petId);
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }

    renderPetInfoCard(pet);

    const allLogs = getTrackerLogs();
    const petLogs = allLogs[petId];

    if (!petLogs) {
        renderEmptySessionList();
        return;
    }

    const sessions = [];
    if (petLogs.history && petLogs.history.length > 0) sessions.push(...petLogs.history);
    if (petLogs.currentSession && petLogs.currentSession.status === 'Hoan thanh') sessions.push(petLogs.currentSession);

    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderSessionList(sessions);
}

function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.dob);
    const avatarUrl = pet.avatar || pet.photo || '';
    const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="${escapeHtml(pet.name)}" class="pet-info-avatar">`
        : `<div class="pet-info-avatar-placeholder">
               <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <circle cx="12" cy="8" r="4"/>
                   <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
               </svg>
           </div>`;

    container.innerHTML = `
        ${avatarHtml}
        <div class="pet-info-details">
            <h4>${escapeHtml(pet.name)}</h4>
            <div class="pet-info-meta">
                <span>${escapeHtml(pet.id)}</span>
                ${pet.species ? `<span>${escapeHtml(getSpeciesDisplay(pet))}</span>` : ''}
                ${pet.breed ? `<span>${escapeHtml(pet.breed)}</span>` : ''}
                ${pet.weight ? `<span>${escapeHtml(String(pet.weight))} kg</span>` : ''}
                ${age ? `<span>${escapeHtml(age)}</span>` : ''}
            </div>
        </div>
    `;
}

function renderEmptySessionList() {
    const list = document.getElementById('sessionList');
    if (!list) return;

    list.innerHTML = `
        <div class="session-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 3v5h5"></path>
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
                <path d="M12 7v5l4 2"></path>
            </svg>
            <p>Chua co lich su dich vu nao. Cac phien cham soc sau khi hoan thanh se xuat hien tai day.</p>
        </div>
    `;
}

function renderSessionList(sessions) {
    const list = document.getElementById('sessionList');
    if (!list) return;

    if (sessions.length === 0) {
        renderEmptySessionList();
        return;
    }

    list.innerHTML = sessions.map((session) => buildSessionCardHtml(session)).join('');

    list.querySelectorAll('.session-card-header').forEach((header) => {
        header.addEventListener('click', () => {
            const card = header.closest('.session-card');
            const body = card.querySelector('.session-card-body');
            const isOpen = card.classList.contains('open');

            list.querySelectorAll('.session-card.open').forEach((openCard) => {
                openCard.classList.remove('open');
                openCard.querySelector('.session-card-body').style.maxHeight = '0';
            });

            if (!isOpen) {
                card.classList.add('open');
                body.style.maxHeight = `${body.scrollHeight}px`;
            }
        });
    });
}

function buildSessionCardHtml(session) {
    const staff = extractLeadStaff(session.timeline);
    const dateStr = fmtDate(session.date);

    return `
        <div class="session-card" data-session-id="${escapeHtml(session.id)}">
            <div class="session-card-header">
                <div class="session-card-info">
                    <div class="session-card-top">
                        <span class="session-date">${dateStr}</span>
                        <span class="session-code">${escapeHtml(session.id)}</span>
                    </div>
                    <h4 class="session-service-name">${escapeHtml(session.service)}</h4>
                    <div class="session-card-bottom">
                        <div class="session-staff-name">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                            </svg>
                            <span>${escapeHtml(staff)}</span>
                        </div>
                        <span class="session-status-badge status-done">${escapeHtml(session.status)}</span>
                    </div>
                </div>
                <div class="session-expand-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
            <div class="session-card-body">
                <div class="session-timeline-label">Dong thoi gian</div>
                <div class="timeline-wrapper session-timeline-wrapper">
                    ${buildReadOnlyTimeline(session.timeline)}
                </div>
            </div>
        </div>
    `;
}

function extractLeadStaff(timeline) {
    if (!timeline || timeline.length === 0) return 'PawPal Team';
    const completed = timeline.find((item) => item.type === 'completed');
    if (completed) return completed.staff;
    const sorted = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return sorted[0].staff || 'PawPal Team';
}

function buildReadOnlyTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
        return '<p class="timeline-no-data">Khong co du lieu dong thoi gian</p>';
    }

    const sorted = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return sorted.map((item) => {
        const isCompleted = item.type === 'completed';
        const timeStr = formatTimestamp(item.timestamp);

        return `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-time">${timeStr}</div>
                    <h4 class="timeline-status">${escapeHtml(item.status)}</h4>
                    <p class="timeline-description">${escapeHtml(item.description)}</p>
                    <div class="timeline-staff">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                        <span>${escapeHtml(item.staff)}</span>
                    </div>
                    ${isCompleted && item.invoice ? buildInvoiceBlockHtml(item.invoice) : ''}
                </div>
            </div>
        `;
    }).join('');
}

function buildInvoiceBlockHtml(invoice) {
    return `
        <div class="timeline-invoice-block">
            <div class="invoice-header">
                <h4 class="invoice-title">Hoa don dich vu</h4>
                <span class="invoice-code">${escapeHtml(invoice.code)}</span>
            </div>
            <div class="invoice-items">
                ${invoice.items.map((item) => `
                    <div class="invoice-item">
                        <span class="invoice-item-name">${escapeHtml(item.name)}</span>
                        <span class="invoice-item-price">${formatCurrency(item.price)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="invoice-total">
                <span class="invoice-total-label">Tong thanh toan:</span>
                <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
            </div>
            <div class="invoice-status-badge ${invoice.paid ? 'invoice-paid' : 'invoice-unpaid'}">
                ${invoice.paid ? 'Da thanh toan' : 'Chua thanh toan'}
            </div>
        </div>
    `;
}

function formatTimestamp(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateLabel = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} - ${dateLabel}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}
