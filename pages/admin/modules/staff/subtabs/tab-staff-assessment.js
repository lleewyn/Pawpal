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
        const tbody = document.getElementById('assessmentTableBody');
        if (!tbody) return;
        const assessments = PawpalStaff.state?.mockAssessments || [];

        let filtered = assessments.filter(item => {
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
                    <td colspan="8" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
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
                    <td style="font-weight: 600;">${item.id}</td>
                    <td>${item.date}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${item.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.position}</div>
                    </td>
                    <td>${item.type}</td>
                    <td style="font-weight: 600;">${item.score}/100</td>
                    <td style="text-align: center;">${resultBadge}</td>
                    <td>${item.evaluator || 'Hội đồng chuyên môn'}</td>
                    <td style="max-width: 200px; font-size: 12px; color: var(--text-muted);">${item.note || '—'}</td>
                </tr>
            `;
        }).join('');

        renderAssessmentPagination(totalPages);
        updateAssessmentKPIs();
    }

    function updateAssessmentKPIs() {
        const assessments = PawpalStaff.state?.mockAssessments || [];
        const total = assessments.length;
        const pass = assessments.filter(a => a.result === 'PASS').length;
        const retrain = assessments.filter(a => a.result === 'RETRAIN').length;
        const fail = assessments.filter(a => a.result === 'FAIL').length;

        const statTotal = document.getElementById('statAssessmentTotal');
        const statPass = document.getElementById('statAssessmentPass');
        const statRetrain = document.getElementById('statAssessmentRetrain');
        const statFail = document.getElementById('statAssessmentFail');

        if (statTotal) statTotal.textContent = total;
        if (statPass) statPass.textContent = pass;
        if (statRetrain) statRetrain.textContent = retrain;
        if (statFail) statFail.textContent = fail;
    }

    function openAssessmentModal(targetStaffId = null) {
        const modal = document.getElementById('modalAssessmentForm');
        if (!modal) return;

        const staffSelect = document.getElementById('assessmentStaffSelect');
        const staffList = PawpalStaff.state?.mockStaff || [];

        if (staffSelect) {
            staffSelect.innerHTML = staffList.map(s => `
                <option value="${s.id}" ${s.id === targetStaffId ? 'selected' : ''}>${s.name} (${s.position})</option>
            `).join('');
        }

        modal.classList.add('active');
    }

    function initAssessmentSubtab() {
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

        renderAssessmentList();
    }

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
