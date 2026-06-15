/* ==========================================================================
   care-history.js — Lịch sử chăm sóc (US 7-3)
   Data source: pawpal_pets + pawpal_tracker_logs in localStorage
   ========================================================================== */

import { getPets, getTrackerLogs, calcAge, fmtDate, showToast } from './pet-profile.js';

let currentPetId = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initCareHistory() {
    populatePetSelector();

    const selector = document.getElementById('petSelector');
    if (selector) {
        selector.addEventListener('change', handlePetChange);
    }

    // Handle ?id= URL param (e.g. navigating from pet profile)
    const urlParams = new URLSearchParams(window.location.search);
    const petIdFromUrl = urlParams.get('id');
    if (petIdFromUrl && selector) {
        selector.value = petIdFromUrl;
        handlePetChange({ target: selector });
    }
}

// ── Pet Selector ──────────────────────────────────────────────────────────────

function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;

    const pets = getPets().filter(p => !p.archived);
    while (selector.options.length > 1) selector.remove(1);

    pets.forEach(pet => {
        const opt = document.createElement('option');
        opt.value = pet.id;
        opt.textContent = [pet.name, pet.species, pet.breed ? `(${pet.breed})` : '']
            .filter(Boolean).join(' ');
        selector.appendChild(opt);
    });
}

function handlePetChange(e) {
    const petId = e.target.value;
    const emptyState = document.getElementById('emptyState');
    const historyContent = document.getElementById('historyContent');

    if (!petId) {
        if (emptyState) emptyState.style.display = 'block';
        if (historyContent) historyContent.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (historyContent) historyContent.style.display = 'block';

    currentPetId = petId;
    loadCareHistory(petId);
}

// ── Load History ──────────────────────────────────────────────────────────────

function loadCareHistory(petId) {
    const pets = getPets();
    const pet = pets.find(p => p.id === petId);
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

    // Collect completed sessions
    const sessions = [];

    if (petLogs.history && petLogs.history.length > 0) {
        sessions.push(...petLogs.history);
    }

    // Include currentSession if it has been completed
    if (petLogs.currentSession && petLogs.currentSession.status === 'Hoàn thành') {
        sessions.push(petLogs.currentSession);
    }

    // Sort newest first
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderSessionList(sessions, pet);
}

// ── Render: Pet Info Card ─────────────────────────────────────────────────────

function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.birthday);

    const avatarHtml = pet.photo
        ? `<img src="${pet.photo}" alt="${escapeHtml(pet.name)}" class="pet-info-avatar">`
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
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    ${escapeHtml(pet.id)}
                </span>
                ${pet.species ? `<span>${escapeHtml(pet.species)}</span>` : ''}
                ${pet.breed ? `<span>${escapeHtml(pet.breed)}</span>` : ''}
                ${pet.weight ? `<span>${escapeHtml(String(pet.weight))} kg</span>` : ''}
                ${age ? `<span>${escapeHtml(age)}</span>` : ''}
            </div>
        </div>
    `;
}

// ── Render: Session List ──────────────────────────────────────────────────────

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
            <p>Chưa có lịch sử dịch vụ nào. Các phiên chăm sóc sau khi hoàn thành sẽ xuất hiện tại đây.</p>
        </div>
    `;
}

function renderSessionList(sessions, pet) {
    const list = document.getElementById('sessionList');
    if (!list) return;

    if (sessions.length === 0) {
        renderEmptySessionList();
        return;
    }

    list.innerHTML = sessions.map((session, idx) => buildSessionCardHtml(session, idx)).join('');

    // Bind accordion expand/collapse
    list.querySelectorAll('.session-card-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.session-card');
            const body = card.querySelector('.session-card-body');
            const isOpen = card.classList.contains('open');

            // Collapse all open cards
            list.querySelectorAll('.session-card.open').forEach(c => {
                c.classList.remove('open');
                const b = c.querySelector('.session-card-body');
                b.style.maxHeight = '0';
            });

            if (!isOpen) {
                card.classList.add('open');
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    });
}

function buildSessionCardHtml(session, idx) {
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
                <div class="session-timeline-label">Dòng thời gian</div>
                <div class="timeline-wrapper session-timeline-wrapper">
                    ${buildReadOnlyTimeline(session.timeline)}
                </div>
            </div>
        </div>
    `;
}

function extractLeadStaff(timeline) {
    if (!timeline || timeline.length === 0) return 'PawPal Team';
    // Get staff from the completion entry or the first entry
    const completed = timeline.find(t => t.type === 'completed');
    if (completed) return completed.staff;
    const sorted = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return sorted[0].staff || 'PawPal Team';
}

// ── Read-Only Timeline ────────────────────────────────────────────────────────

function buildReadOnlyTimeline(timeline) {
    if (!timeline || timeline.length === 0) {
        return '<p class="timeline-no-data">Không có dữ liệu dòng thời gian</p>';
    }

    // Sort newest-to-oldest
    const sorted = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return sorted.map(item => {
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

// ── Invoice Block ─────────────────────────────────────────────────────────────

function buildInvoiceBlockHtml(invoice) {
    return `
        <div class="timeline-invoice-block">
            <div class="invoice-header">
                <h4 class="invoice-title">Hóa đơn dịch vụ</h4>
                <span class="invoice-code">${escapeHtml(invoice.code)}</span>
            </div>
            <div class="invoice-items">
                ${invoice.items.map(item => `
                    <div class="invoice-item">
                        <span class="invoice-item-name">${escapeHtml(item.name)}</span>
                        <span class="invoice-item-price">${formatCurrency(item.price)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="invoice-total">
                <span class="invoice-total-label">Tổng thanh toán:</span>
                <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
            </div>
            <div class="invoice-status-badge ${invoice.paid ? 'invoice-paid' : 'invoice-unpaid'}">
                ${invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </div>
        </div>
    `;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatTimestamp(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} — ${date}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}
