// tab-staff-assessment.js - Subtab Đánh giá năng lực và Sát hạch tay nghề Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentAssessmentPage = 1;
    const ASSESSMENT_PAGE_SIZE = 10;
    let assessmentFilterType = 'ALL';
    let assessmentFilterResult = 'ALL';

    function renderAssessmentPagination(totalPages) {
        const pagContainer = document.getElementById('assessmentPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.innerHTML = '';
            pagContainer.style.display = 'none';
            return;
        }
        pagContainer.style.display = 'flex';

        const actualPages = Math.max(1, totalPages);
        let html = '';
        const prevDisabled = currentAssessmentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>`;

        for (let p = 1; p <= actualPages; p++) {
            const activeClass = p === currentAssessmentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = currentAssessmentPage === actualPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (currentAssessmentPage > 1) {
                        currentAssessmentPage--;
                        renderAssessmentList();
                    }
                } else if (pageAction === 'next') {
                    if (currentAssessmentPage < actualPages) {
                        currentAssessmentPage++;
                        renderAssessmentList();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== currentAssessmentPage) {
                        currentAssessmentPage = targetP;
                        renderAssessmentList();
                    }
                }
            });
        });
    }

    function renderAssessmentList() {
        const tbody = document.getElementById('assessmentListTableBody') || document.getElementById('assessmentTableBody');
        updateAssessmentKPIs();
        if (!tbody) return;
        const assessments = PawpalStaff.state?.mockAssessments || [];
        const searchInput = document.getElementById('assessmentSearchInput');
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const toUnaccent = PawpalStaff.toUnaccent || (str => str);

        let filtered = assessments.filter(item => {
            if (query) {
                const qUnaccent = toUnaccent(query);
                const matchName = toUnaccent(item.name || '').includes(qUnaccent) || (item.name || '').toLowerCase().includes(query);
                const matchId = (item.staff_id || '').toLowerCase().includes(query) || (item.id || '').toLowerCase().includes(query);
                if (!matchName && !matchId) return false;
            }
            if (assessmentFilterType !== 'ALL' && item.type !== assessmentFilterType) return false;
            if (assessmentFilterResult !== 'ALL' && item.result !== assessmentFilterResult) return false;
            return true;
        });

        const totalPages = Math.ceil(filtered.length / ASSESSMENT_PAGE_SIZE);
        if (currentAssessmentPage > totalPages && totalPages > 0) currentAssessmentPage = totalPages;
        if (currentAssessmentPage < 1) currentAssessmentPage = 1;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không có kết quả sát hạch nào phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            renderAssessmentPagination(0);
            return;
        }

        const startIndex = (currentAssessmentPage - 1) * ASSESSMENT_PAGE_SIZE;
        const pageList = filtered.slice(startIndex, startIndex + ASSESSMENT_PAGE_SIZE);

        tbody.innerHTML = pageList.map(item => {
            let resultBadge = '';
            if (item.result === 'PASS') {
                resultBadge = '<span class="admin-badge badge-success">Đạt chuẩn</span>';
            } else if (item.result === 'RETRAIN') {
                resultBadge = '<span class="admin-badge badge-warning">Cần đào tạo</span>';
            } else {
                resultBadge = '<span class="admin-badge badge-danger">Chưa đạt</span>';
            }

            return `
                <tr>
                    <td style="font-weight: 600;">${item.date}</td>
                    <td style="font-weight: 600;">${item.staff_id || item.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${item.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.position}</div>
                    </td>
                    <td>${item.type}</td>
                    <td style="font-weight: 600; text-align: center;">${item.score}/100</td>
                    <td style="text-align: center;">${resultBadge}</td>
                    <td>${item.evaluator || 'Hội đồng chuyên môn'}</td>
                    <td style="max-width: 200px; font-size: 12px; color: var(--text-muted);">${item.note || '—'}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-reassess-trigger" data-staff-id="${item.staff_id || ''}" style="border: none; background: none; color: #236B48; cursor: pointer; font-size: 12.5px; font-weight: 600;">Đánh giá</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-reassess-trigger').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-staff-id');
                openAssessmentModal(sId);
            });
        });

        renderAssessmentPagination(totalPages);
    }

    function updateAssessmentKPIs() {
        const assessments = PawpalStaff.state?.mockAssessments || [];
        const staffList = PawpalStaff.state?.mockStaff || [];
        const totalStaff = staffList.length;
        const total = assessments.length;
        const pass = assessments.filter(a => a.result === 'PASS').length;
        const retrain = assessments.filter(a => a.result === 'RETRAIN').length;
        const fail = assessments.filter(a => a.result === 'FAIL').length;
        const notAssessed = Math.max(0, totalStaff - total);

        const statTotal = document.getElementById('statAssessed') || document.getElementById('statAssessmentTotal');
        const statPassEl = document.getElementById('statPass') || document.getElementById('statAssessmentPass');
        const statRetrainEl = document.getElementById('statRetrain') || document.getElementById('statAssessmentRetrain');
        const statNotAssessedEl = document.getElementById('statNotAssessed') || document.getElementById('statAssessmentFail');

        if (statTotal) statTotal.textContent = total;
        if (statPassEl) statPassEl.textContent = pass;
        if (statRetrainEl) statRetrainEl.textContent = retrain;
        if (statNotAssessedEl) statNotAssessedEl.textContent = notAssessed;
    }

    function openAssessmentModal(targetStaffId = null) {
        const modal = document.getElementById('assessmentModalOverlay');
        if (!modal) return;

        const staffSelect = document.getElementById('assessInputStaff');
        const dateInput = document.getElementById('assessInputDate');
        const typeSelect = document.getElementById('assessInputType');
        const scoreInput = document.getElementById('assessInputScore');
        const resultSelect = document.getElementById('assessInputResult');
        const noteInput = document.getElementById('assessInputNote');

        const staffList = PawpalStaff.state?.mockStaff || [];

        if (staffSelect) {
            staffSelect.innerHTML = staffList.map(s => `
                <option value="${s.id}" ${s.id === targetStaffId ? 'selected' : ''}>${s.name} (${s.position})</option>
            `).join('');
        }

        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        if (scoreInput) {
            scoreInput.value = 85;
            scoreInput.oninput = () => {
                const val = Number(scoreInput.value);
                if (resultSelect) {
                    if (val >= 80) resultSelect.value = 'PASS';
                    else if (val >= 60) resultSelect.value = 'RETRAIN';
                    else resultSelect.value = 'FAIL';
                }
            };
        }

        if (resultSelect) resultSelect.value = 'PASS';
        if (noteInput) noteInput.value = '';

        modal.classList.add('active');
    }

    function initAssessmentSubtab() {
        const searchInput = document.getElementById('assessmentSearchInput');
        const clearBtn = document.getElementById('btnClearAssessmentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (clearBtn) clearBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
                currentAssessmentPage = 1;
                renderAssessmentList();
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearBtn.style.display = 'none';
                currentAssessmentPage = 1;
                renderAssessmentList();
            });
        }

        const typeFilter = document.getElementById('assessmentFilterType');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                assessmentFilterType = typeFilter.value;
                currentAssessmentPage = 1;
                renderAssessmentList();
            });
        }

        const resultFilter = document.getElementById('assessmentFilterResult');
        if (resultFilter) {
            resultFilter.addEventListener('change', () => {
                assessmentFilterResult = resultFilter.value;
                currentAssessmentPage = 1;
                renderAssessmentList();
            });
        }

        const btnOpenAdd = document.getElementById('btnOpenAddAssessmentModal');
        if (btnOpenAdd) {
            btnOpenAdd.addEventListener('click', () => openAssessmentModal());
        }

        function handleSaveAssessment(isNotify = false) {
            const modal = document.getElementById('assessmentModalOverlay');
            const staffId = document.getElementById('assessInputStaff')?.value;
            const dateVal = document.getElementById('assessInputDate')?.value;
            const typeVal = document.getElementById('assessInputType')?.value;
            const scoreVal = document.getElementById('assessInputScore')?.value;
            const resultVal = document.getElementById('assessInputResult')?.value;
            const noteVal = document.getElementById('assessInputNote')?.value.trim();

            if (!staffId || !dateVal || scoreVal === '') {
                PawpalStaff.showToast('Vui lòng nhập đầy đủ thông tin đánh giá!', 'warning');
                return;
            }

            const staffList = PawpalStaff.state?.mockStaff || [];
            const staffObj = staffList.find(s => s.id === staffId);
            const scoreNum = Number(scoreVal);

            // Cập nhật điểm tay nghề nhân sự
            if (staffObj) {
                staffObj.skillScore = scoreNum;
                staffObj.skillResult = resultVal;
                staffObj.skillExam = resultVal === 'PASS' ? `Đạt (${scoreNum}đ)` : `Cần đào tạo (${scoreNum}đ)`;
                staffObj.serviceLocked = resultVal !== 'PASS';
            }

            // Thêm bản ghi đánh giá mới
            PawpalStaff.state.mockAssessments = PawpalStaff.state.mockAssessments || [];
            const newId = `ASM-${String(PawpalStaff.state.mockAssessments.length + 1).padStart(3, '0')}`;
            PawpalStaff.state.mockAssessments.unshift({
                id: newId,
                date: PawpalStaff.formatDateVN(dateVal),
                staff_id: staffId,
                name: staffObj ? staffObj.name : 'Nhân sự',
                position: staffObj ? staffObj.position : 'Kỹ thuật viên',
                type: typeVal === 'Grooming' ? 'Grooming' : (typeVal === 'Spa' ? 'Spa' : 'Chăm sóc'),
                score: scoreNum,
                result: resultVal,
                evaluator: 'Lê Lệ Quyên',
                note: noteVal || (resultVal === 'PASS' ? 'Thao tác chuẩn xác' : 'Cần đào tạo lại chuyên sâu')
            });

            currentAssessmentPage = 1;
            renderAssessmentList();
            updateAssessmentKPIs();
            if (PawpalStaff.subtabs.list?.renderStaffList) PawpalStaff.subtabs.list.renderStaffList();
            if (PawpalStaff.subtabs.list?.renderStaffAlertBar) PawpalStaff.subtabs.list.renderStaffAlertBar();

            PawpalStaff.showToast(isNotify ? 'Đã lưu kết quả và gửi thông báo đến nhân sự!' : 'Đã ghi nhận kết quả đánh giá tay nghề!', 'success');
            if (modal) modal.classList.remove('active');
        }

        const btnSaveAssess = document.getElementById('btnSaveAssessment');
        if (btnSaveAssess) {
            btnSaveAssess.addEventListener('click', () => handleSaveAssessment(false));
        }

        const btnSendNotify = document.getElementById('btnSendAssessNotify');
        if (btnSendNotify) {
            btnSendNotify.addEventListener('click', () => handleSaveAssessment(true));
        }

        // Đóng modal qua data-close-modal, backdrop click, Escape key
        document.querySelectorAll('[data-close-modal="assessmentModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('assessmentModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        const assessmentModalOverlay = document.getElementById('assessmentModalOverlay');
        if (assessmentModalOverlay) {
            assessmentModalOverlay.addEventListener('click', (e) => {
                if (e.target === assessmentModalOverlay) {
                    assessmentModalOverlay.classList.remove('active');
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('assessmentModalOverlay');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            }
        });

        // URL Auto-open v=modal3
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal3' || urlParams.get('modal') === '3' || urlParams.get('modal') === 'assessment') {
            setTimeout(() => {
                openAssessmentModal();
            }, 300);
        }

        renderAssessmentList();
    }

    window.addEventListener('pawpal:staff-data-loaded', () => {
        renderAssessmentList();
        updateAssessmentKPIs();
    });

    PawpalStaff.subtabs.assessment = {
        init: initAssessmentSubtab,
        renderAssessmentList,
        updateAssessmentKPIs,
        openAssessmentModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAssessmentSubtab);
    } else {
        initAssessmentSubtab();
    }
})();
