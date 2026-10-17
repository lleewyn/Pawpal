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
        if (PawpalStaff.state.loadError) {
            const target=document.getElementById('assessmentTableBody');
            if(target)target.innerHTML='<tr><td colspan="9" style="padding:28px;text-align:center;">Không thể tải dữ liệu nhân sự. Vui lòng tải lại trang.</td></tr>';
            return;
        }
        if (!PawpalStaff.state.isLoaded) return;
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

            const esc = (s) => PawpalStaff.escapeHtml ? PawpalStaff.escapeHtml(s) : String(s || '');
            const safeDate = esc(item.date);
            const safeStaffId = esc(item.staff_id || item.id);
            const safeName = esc(item.name);
            const safePosition = esc(item.position);
            const safeType = esc(item.type);
            const safeEvaluator = esc(item.evaluator || 'Hội đồng chuyên môn');
            const safeNote = esc(item.note || '—');

            return `
                <tr>
                    <td style="font-weight: 600;">${safeDate}</td>
                    <td style="font-weight: 600;">${safeStaffId}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${safeName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${safePosition}</div>
                    </td>
                    <td>${safeType}</td>
                    <td style="font-weight: 600; text-align: center;">${item.score}/100</td>
                    <td style="text-align: center;">${resultBadge}</td>
                    <td>${safeEvaluator}</td>
                    <td style="max-width: 200px; font-size: 12px; color: var(--text-muted);">${safeNote}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-reassess-trigger" data-staff-id="${safeStaffId}" style="border: none; background: none; color: #236B48; cursor: pointer; font-size: 12.5px; font-weight: 600;">Đánh giá</button>
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
        if (!PawpalStaff.state.isLoaded) return;
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
            scoreInput.value = '';
            scoreInput.placeholder = '0 - 100';
            scoreInput.oninput = () => {
                const val = Number(scoreInput.value);
                if (resultSelect && !isNaN(val) && scoreInput.value !== '') {
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

        async function handleSaveAssessment(isNotify = false) {
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

            const scoreNum = Number(scoreVal);
            if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
                PawpalStaff.showToast('Điểm đánh giá phải là số từ 0 đến 100!', 'warning');
                return;
            }

            // Đồng bộ kết quả đánh giá theo chính sách điểm chuẩn
            let finalResult = resultVal;
            if (scoreNum >= 80) finalResult = 'PASS';
            else if (scoreNum >= 60) finalResult = 'RETRAIN';
            else finalResult = 'FAIL';

            const staffList = PawpalStaff.state?.mockStaff || [];
            const staffObj = staffList.find(s => s.id === staffId || s.rawId === staffId);
            if (!staffObj) {
                PawpalStaff.showToast('Không tìm thấy nhân sự được chọn!', 'danger');
                return;
            }

            // Lưu trực tiếp điểm tay nghề vào Supabase và kiểm tra lỗi fail-closed
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client && staffObj.rawId) {
                try {
                    const { error: upErr } = await client.from('staff').update({
                        skill_score: scoreNum,
                        service_locked: finalResult !== 'PASS'
                    }).eq('id', staffObj.rawId);

                    if (upErr) throw upErr;

                    try {
                        await client.from('staff_assessment').insert({
                            staff_id: staffObj.rawId,
                            assessment_type: typeVal,
                            score: scoreNum,
                            result: finalResult,
                            notes: noteVal,
                            assessment_date: dateVal
                        });
                    } catch (_ignoreInsert) {
                        // Bảng assessment riêng có thể chưa cấu hình
                    }

                    // Gửi thông báo thực tế vào hàng đợi thông báo nếu người dùng chọn Lưu và gửi
                    if (isNotify) {
                        try {
                            await client.from('notification').insert({
                                recipient_id: staffObj.rawId,
                                recipient_type: 'staff',
                                title: 'Thông báo kết quả sát hạch tay nghề',
                                content: `Kết quả đánh giá chuyên môn định kỳ: Điểm ${scoreNum}/100 - Xếp loại: ${finalResult === 'PASS' ? 'Đạt' : (finalResult === 'RETRAIN' ? 'Cần đào tạo lại' : 'Không đạt')}. ${noteVal ? 'Ghi chú: ' + noteVal : ''}`,
                                status: 'UNREAD',
                                created_at: new Date().toISOString()
                            });
                        } catch (notifErr) {
                            console.warn('[PawpalStaff] Lỗi ghi thông báo vào outbox:', notifErr);
                        }
                    }
                } catch (e) {
                    console.error('[PawpalStaff] Lỗi lưu skill_score vào staff:', e);
                    PawpalStaff.showToast(`Không thể lưu kết quả đánh giá: ${e.message || 'Lỗi CSDL'}`, 'danger');
                    return;
                }
            }

            // CSDL cập nhật thành công mới thay đổi state
            staffObj.skillScore = scoreNum;
            staffObj.skillResult = finalResult;
            staffObj.skillExam = finalResult === 'PASS' ? `Đạt (${scoreNum}đ)` : `Cần đào tạo (${scoreNum}đ)`;
            staffObj.serviceLocked = finalResult !== 'PASS';

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
                result: finalResult,
                evaluator: 'Quản trị viên',
                note: noteVal || (finalResult === 'PASS' ? 'Thao tác chuẩn xác' : 'Cần đào tạo lại chuyên sâu')
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
