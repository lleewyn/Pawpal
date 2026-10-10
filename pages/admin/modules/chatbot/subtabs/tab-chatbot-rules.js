// tab-chatbot-rules.js - Subtab Kho tri thức và Quy định Chatbot Pawpal-er
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};

    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

    let rulesFaqData = [];
    let rulesProfanityData = [];
    let rulesCannedData = [];
    let rulesCompPolicyData = [];
    let rulesHandoverRuleData = [];
    let rulesMatrixData = [];

    let currentRulesView = 'faq';
    let currentPolicySubView = 'comp';

    let faqPage = 1;
    let profanityPage = 1;
    let cannedPage = 1;
    let policyPage = 1;
    let matrixPage = 1;
    const RULES_PAGE_SIZE = 10;
    let rulesHubInitialized = false;

    async function loadAllRulesDataFromSupabase() {
        if (!supabase) return;
        try {
            const [faqRes, profRes, cannedRes, compRes, handRes, matRes] = await Promise.all([
                supabase.from('chatbot_knowledge_faq').select('*').order('priority', { ascending: true }).order('created_at', { ascending: false }),
                supabase.from('chatbot_profanity_filter').select('*').order('created_at', { ascending: false }),
                supabase.from('chatbot_canned_response').select('*').order('usage_count', { ascending: false }).order('created_at', { ascending: false }),
                supabase.from('chatbot_compensation_policy').select('*').order('max_points', { ascending: false }),
                supabase.from('chatbot_handover_rule').select('*').order('sla_seconds', { ascending: true }),
                supabase.from('chatbot_scenario_matrix').select('*').order('created_at', { ascending: true })
            ]);

            if (faqRes && faqRes.data) rulesFaqData = faqRes.data;
            if (profRes && profRes.data) rulesProfanityData = profRes.data;
            if (cannedRes && cannedRes.data) rulesCannedData = cannedRes.data;
            if (compRes && compRes.data) rulesCompPolicyData = compRes.data;
            if (handRes && handRes.data) rulesHandoverRuleData = handRes.data;
            if (matRes && matRes.data) rulesMatrixData = matRes.data;

            updateRulesBadges();
            populateRulesCategories();
            renderActiveRulesView();
        } catch (err) {
            console.error('[Chatbot Rules Hub] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    }

    function updateRulesBadges() {
        const bFaq = document.getElementById('badgeFaqCount');
        const bProf = document.getElementById('badgeProfanityCount');
        const bCanned = document.getElementById('badgeCannedCount');
        const bPol = document.getElementById('badgePolicyCount');
        const bMat = document.getElementById('badgeMatrixCount');

        if (bFaq) bFaq.textContent = rulesFaqData.length;
        if (bProf) bProf.textContent = rulesProfanityData.length;
        if (bCanned) bCanned.textContent = rulesCannedData.length;
        if (bPol) bPol.textContent = rulesCompPolicyData.length + rulesHandoverRuleData.length;
        if (bMat) bMat.textContent = rulesMatrixData.length;
    }

    function populateRulesCategories() {
        const faqCatSelect = document.getElementById('selectFaqCategoryFilter');
        if (faqCatSelect) {
            const currentVal = faqCatSelect.value;
            const cats = Array.from(new Set(rulesFaqData.map(f => f.category))).filter(Boolean);
            faqCatSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
                cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        }

        const cannedCatSelect = document.getElementById('selectCannedCategoryFilter');
        if (cannedCatSelect) {
            const currentVal = cannedCatSelect.value;
            const cats = Array.from(new Set(rulesCannedData.map(c => c.category))).filter(Boolean);
            cannedCatSelect.innerHTML = '<option value="all">Tất cả chủ đề</option>' +
                cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        }
    }

    function renderActiveRulesView() {
        if (currentRulesView === 'faq') renderFaqTable();
        else if (currentRulesView === 'profanity') renderProfanityTable();
        else if (currentRulesView === 'canned') renderCannedTable();
        else if (currentRulesView === 'policy') renderPolicyTable();
        else if (currentRulesView === 'matrix') renderMatrixTable();
    }

    function renderPaginationControls(containerId, currentPage, totalPages, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (totalPages === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button type="button" class="rules-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                html += `<button type="button" class="rules-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            } else if (p === currentPage - 3 || p === currentPage + 3) {
                html += `<span style="color: var(--text-muted); font-size: 12px; padding: 0 4px;">...</span>`;
            }
        }

        html += `<button type="button" class="rules-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&gt;</button>`;
        container.innerHTML = html;

        container.querySelectorAll('.rules-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = parseInt(btn.getAttribute('data-page'), 10);
                if (targetPage && targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
                    onPageChange(targetPage);
                }
            });
        });
    }

    // 1. FAQ TABLE
    function renderFaqTable() {
        const tbody = document.getElementById('faqTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputFaqSearch')?.value || '').toLowerCase().trim();
        const catVal = document.getElementById('selectFaqCategoryFilter')?.value || 'all';
        const statusVal = document.getElementById('selectFaqStatusFilter')?.value || 'all';

        const filtered = rulesFaqData.filter(item => {
            const matchSearch = !searchVal ||
                (item.question && item.question.toLowerCase().includes(searchVal)) ||
                (item.answer && item.answer.toLowerCase().includes(searchVal)) ||
                (Array.isArray(item.keywords) && item.keywords.some(k => k.toLowerCase().includes(searchVal)));
            const matchCat = catVal === 'all' || item.category === catVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchCat && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (faqPage > totalPages) faqPage = totalPages;
        const start = (faqPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy câu hỏi FAQ phù hợp</td></tr>`;
            renderPaginationControls('faqPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const kwHtml = Array.isArray(item.keywords) && item.keywords.length > 0
                ? `<div class="rules-keywords-wrap">${item.keywords.slice(0, 3).map(k => `<span class="rules-keyword-pill">${k}</span>`).join('')}${item.keywords.length > 3 ? `<span class="rules-keyword-pill">+${item.keywords.length - 3}</span>` : ''}</div>`
                : '<span style="color: var(--text-muted); opacity: 0.4;">—</span>';

            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><span style="font-weight: 600; color: #236B48;">${item.category || 'Chung'}</span></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.question}</div></td>
                    <td><div style="max-width: 380px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.answer || '').replace(/"/g, '&quot;')}">${item.answer || ''}</div></td>
                    <td>${kwHtml}</td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">#${item.priority || 1}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-faq-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('faqPaginationWrap', faqPage, totalPages, (newPage) => {
            faqPage = newPage;
            renderFaqTable();
        });

        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-faq-id');
                const item = rulesFaqData.find(f => f.id === id);
                if (!item) return;
                openFaqActionMenu(item, e.currentTarget);
            });
        });
    }

    function openFaqActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa câu hỏi',
                action: () => openFaqEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt kích hoạt' : 'Kích hoạt câu hỏi',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
                        .eq('id', item.id);
                    if (error) {
                        PawpalChatbot.showToast?.('Lỗi cập nhật trạng thái FAQ: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderFaqTable();
                        PawpalChatbot.showToast?.(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} câu hỏi!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa câu hỏi',
                danger: true,
                action: () => {
                    PawpalChatbot.showChatbotConfirmModal?.({
                        title: 'Xóa câu hỏi tri thức FAQ',
                        message: `Bạn có chắc chắn muốn xóa câu hỏi "${item.question}" khỏi kho tri thức không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await supabase.from('chatbot_knowledge_faq').delete().eq('id', item.id);
                            if (error) {
                                PawpalChatbot.showToast?.('Lỗi xóa câu hỏi: ' + error.message, 'danger');
                            } else {
                                rulesFaqData = rulesFaqData.filter(f => f.id !== item.id);
                                updateRulesBadges();
                                renderFaqTable();
                                PawpalChatbot.showToast?.('Đã xóa câu hỏi FAQ thành công!', 'success');
                            }
                        }
                    });
                }
            }
        ]);
    }

    function openFaqEditorModal(item = null) {
        const overlay = document.getElementById('modalFaqEditorOverlay');
        const titleEl = document.getElementById('modalFaqEditorTitle');
        const editId = document.getElementById('inputFaqEditId');
        const catInput = document.getElementById('inputFaqCategory');
        const qInput = document.getElementById('inputFaqQuestionText');
        const aInput = document.getElementById('textareaFaqAnswerText');
        const kwInput = document.getElementById('inputFaqKeywordsList');
        const prioInput = document.getElementById('inputFaqPriorityNum');
        const activeCheck = document.getElementById('checkboxFaqIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa câu hỏi tri thức FAQ';
            if (editId) editId.value = item.id;
            if (catInput) catInput.value = item.category || '';
            if (qInput) qInput.value = item.question || '';
            if (aInput) aInput.value = item.answer || '';
            if (kwInput) kwInput.value = Array.isArray(item.keywords) ? item.keywords.join(', ') : '';
            if (prioInput) prioInput.value = item.priority || 1;
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm câu hỏi tri thức FAQ';
            if (editId) editId.value = '';
            if (catInput) catInput.value = 'Thông tin dịch vụ';
            if (qInput) qInput.value = '';
            if (aInput) aInput.value = '';
            if (kwInput) kwInput.value = '';
            if (prioInput) prioInput.value = 1;
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // 2. TOXIC SHIELD PROFANITY FILTER TABLE
    function renderProfanityTable() {
        const tbody = document.getElementById('profanityTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputProfanitySearch')?.value || '').toLowerCase().trim();
        const sevVal = document.getElementById('selectProfanitySeverityFilter')?.value || 'all';
        const actVal = document.getElementById('selectProfanityActionFilter')?.value || 'all';
        const statusVal = document.getElementById('selectProfanityStatusFilter')?.value || 'all';

        const filtered = rulesProfanityData.filter(item => {
            const matchSearch = !searchVal || (item.keyword && item.keyword.toLowerCase().includes(searchVal));
            const matchSev = sevVal === 'all' || item.severity === sevVal;
            const matchAct = actVal === 'all' || item.action === actVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchSev && matchAct && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (profanityPage > totalPages) profanityPage = totalPages;
        const start = (profanityPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy từ ngữ vi phạm phù hợp</td></tr>`;
            renderPaginationControls('profanityPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const sevBadges = {
                critical: `<span class="admin-badge" style="background:#F7DCDC; color:#8F2424;">Khẩn cấp</span>`,
                high: `<span class="admin-badge" style="background:#F5E8D3; color:#734718;">Mức độ cao</span>`,
                medium: `<span class="admin-badge" style="background:#E2ECE5; color:#2D483B;">Trung bình</span>`,
                low: `<span class="admin-badge" style="background:#DCEAF2; color:#20495E;">Mức độ thấp</span>`
            };

            const actLabels = {
                mask: `Che mờ ký tự`,
                warn: `Cảnh báo nhắc nhở`,
                block: `Chặn tạm thời 15 phút`
            };

            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><span style="font-weight: 700; color: #DC2626;">${item.keyword}</span></td>
                    <td style="text-align: center;">${sevBadges[item.severity] || sevBadges.medium}</td>
                    <td><span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${actLabels[item.action] || item.action}</span></td>
                    <td><code style="background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 600;">${item.replacement_text || '***'}</code></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-prof-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('profanityPaginationWrap', profanityPage, totalPages, (newPage) => {
            profanityPage = newPage;
            renderProfanityTable();
        });

        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-prof-id');
                const item = rulesProfanityData.find(p => p.id === id);
                if (!item) return;
                openProfanityActionMenu(item, e.currentTarget);
            });
        });
    }

    function openProfanityActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa từ cấm',
                action: () => openProfanityEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt màng lọc' : 'Kích hoạt màng lọc',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .update({ is_active: !item.is_active })
                        .eq('id', item.id);
                    if (error) {
                        PawpalChatbot.showToast?.('Lỗi cập nhật: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderProfanityTable();
                        PawpalChatbot.showToast?.(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} từ cấm!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa từ cấm',
                danger: true,
                action: () => {
                    PawpalChatbot.showChatbotConfirmModal?.({
                        title: 'Xóa từ ngữ Toxic Shield',
                        message: `Bạn có chắc chắn muốn xóa từ "${item.keyword}" khỏi danh sách lọc không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await supabase.from('chatbot_profanity_filter').delete().eq('id', item.id);
                            if (error) {
                                PawpalChatbot.showToast?.('Lỗi xóa từ cấm: ' + error.message, 'danger');
                            } else {
                                rulesProfanityData = rulesProfanityData.filter(p => p.id !== item.id);
                                updateRulesBadges();
                                renderProfanityTable();
                                PawpalChatbot.showToast?.('Đã xóa từ cấm thành công!', 'success');
                            }
                        }
                    });
                }
            }
        ]);
    }

    function openProfanityEditorModal(item = null) {
        const overlay = document.getElementById('modalProfanityEditorOverlay');
        const titleEl = document.getElementById('modalProfanityEditorTitle');
        const editId = document.getElementById('inputProfanityEditId');
        const kwInput = document.getElementById('inputProfanityKeywordText');
        const sevSelect = document.getElementById('selectProfanitySeverityVal');
        const actSelect = document.getElementById('selectProfanityActionVal');
        const repInput = document.getElementById('inputProfanityReplacementVal');
        const activeCheck = document.getElementById('checkboxProfanityIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa từ khóa Toxic Shield';
            if (editId) editId.value = item.id;
            if (kwInput) kwInput.value = item.keyword || '';
            if (sevSelect) sevSelect.value = item.severity || 'medium';
            if (actSelect) actSelect.value = item.action || 'mask';
            if (repInput) repInput.value = item.replacement_text || '***';
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm từ khóa Toxic Shield';
            if (editId) editId.value = '';
            if (kwInput) kwInput.value = '';
            if (sevSelect) sevSelect.value = 'medium';
            if (actSelect) actSelect.value = 'mask';
            if (repInput) repInput.value = '***';
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // 3. CANNED RESPONSES TABLE
    function renderCannedTable() {
        const tbody = document.getElementById('cannedTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputCannedSearch')?.value || '').toLowerCase().trim();
        const catVal = document.getElementById('selectCannedCategoryFilter')?.value || 'all';
        const statusVal = document.getElementById('selectCannedStatusFilter')?.value || 'all';

        const filtered = rulesCannedData.filter(item => {
            const matchSearch = !searchVal ||
                (item.title && item.title.toLowerCase().includes(searchVal)) ||
                (item.shortcut && item.shortcut.toLowerCase().includes(searchVal)) ||
                (item.content && item.content.toLowerCase().includes(searchVal));
            const matchCat = catVal === 'all' || item.category === catVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchCat && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (cannedPage > totalPages) cannedPage = totalPages;
        const start = (cannedPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy mẫu câu phù hợp</td></tr>`;
            renderPaginationControls('cannedPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><code style="background: #EEF5F1; padding: 3px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 700;">${item.shortcut || '—'}</code></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.title}</div></td>
                    <td><div style="max-width: 400px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.content || '').replace(/"/g, '&quot;')}">${item.content || ''}</div></td>
                    <td><span class="admin-badge badge-neutral">${item.category || 'Chung'}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 600; color: var(--text-main);">${item.usage_count || 0}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-canned-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('cannedPaginationWrap', cannedPage, totalPages, (newPage) => {
            cannedPage = newPage;
            renderCannedTable();
        });

        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-canned-id');
                const item = rulesCannedData.find(c => c.id === id);
                if (!item) return;
                openCannedActionMenu(item, e.currentTarget);
            });
        });
    }

    function openCannedActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa câu mẫu',
                action: () => openCannedEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt mẫu câu' : 'Kích hoạt mẫu câu',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .update({ is_active: !item.is_active })
                        .eq('id', item.id);
                    if (error) {
                        PawpalChatbot.showToast?.('Lỗi cập nhật: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderCannedTable();
                        PawpalChatbot.showToast?.(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} mẫu câu!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa mẫu câu',
                danger: true,
                action: () => {
                    PawpalChatbot.showChatbotConfirmModal?.({
                        title: 'Xóa mẫu câu phản hồi',
                        message: `Bạn có chắc chắn muốn xóa mẫu câu "${item.title}" không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await supabase.from('chatbot_canned_response').delete().eq('id', item.id);
                            if (error) {
                                PawpalChatbot.showToast?.('Lỗi xóa mẫu câu: ' + error.message, 'danger');
                            } else {
                                rulesCannedData = rulesCannedData.filter(c => c.id !== item.id);
                                updateRulesBadges();
                                renderCannedTable();
                                PawpalChatbot.showToast?.('Đã xóa mẫu câu thành công!', 'success');
                            }
                        }
                    });
                }
            }
        ]);
    }

    function openCannedEditorModal(item = null) {
        const overlay = document.getElementById('modalCannedEditorOverlay');
        const titleEl = document.getElementById('modalCannedEditorTitle');
        const editId = document.getElementById('inputCannedEditId');
        const scInput = document.getElementById('inputCannedShortcutText');
        const titInput = document.getElementById('inputCannedTitleText');
        const catInput = document.getElementById('inputCannedCategoryText');
        const cntInput = document.getElementById('textareaCannedContentText');
        const activeCheck = document.getElementById('checkboxCannedIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa mẫu câu phản hồi nhanh';
            if (editId) editId.value = item.id;
            if (scInput) scInput.value = item.shortcut || '';
            if (titInput) titInput.value = item.title || '';
            if (catInput) catInput.value = item.category || '';
            if (cntInput) cntInput.value = item.content || '';
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm mẫu câu phản hồi nhanh';
            if (editId) editId.value = '';
            if (scInput) scInput.value = '/';
            if (titInput) titInput.value = '';
            if (catInput) catInput.value = 'Tiếp nhận hội thoại';
            if (cntInput) cntInput.value = '';
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // 4. POLICY TABLE
    function renderPolicyTable() {
        const compWrapper = document.getElementById('compPolicyTableWrapper');
        const handWrapper = document.getElementById('handoverRuleTableWrapper');
        const searchVal = (document.getElementById('inputPolicySearch')?.value || '').toLowerCase().trim();

        if (currentPolicySubView === 'comp') {
            if (compWrapper) compWrapper.style.display = 'block';
            if (handWrapper) handWrapper.style.display = 'none';

            const tbody = document.getElementById('compPolicyTableBody');
            if (!tbody) return;

            const filtered = rulesCompPolicyData.filter(item => {
                return !searchVal ||
                    (item.issue_type && item.issue_type.toLowerCase().includes(searchVal)) ||
                    (item.description && item.description.toLowerCase().includes(searchVal));
            });

            const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
            if (policyPage > totalPages) policyPage = totalPages;
            const start = (policyPage - 1) * RULES_PAGE_SIZE;
            const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy hạn mức bồi hoàn phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.issue_type}</div></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius);">${item.max_points ? item.max_points + ' điểm' : '—'}</span></td>
                    <td style="text-align: right;"><span style="font-weight: 600; color: var(--text-main);">${item.max_discount_vnd ? item.max_discount_vnd.toLocaleString('vi-VN') + ' đ' : '—'}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.approval_required ? 'badge-warning' : 'badge-neutral'}">${item.approval_required ? 'Cần Quản lý duyệt' : 'Nhân viên tự duyệt'}</span>
                    </td>
                    <td><div style="max-width: 420px; font-size: 12px; color: var(--text-muted); line-height: 1.4; white-space: pre-line;">${item.description || ''}</div></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.is_active ? 'badge-active' : 'badge-neutral'}">${item.is_active ? 'Hiệu lực' : 'Tắt'}</span>
                    </td>
                </tr>
            `).join('');

            renderPaginationControls('policyPaginationWrap', policyPage, totalPages, (newPage) => {
                policyPage = newPage;
                renderPolicyTable();
            });
        } else {
            if (compWrapper) compWrapper.style.display = 'none';
            if (handWrapper) handWrapper.style.display = 'block';

            const tbody = document.getElementById('handoverRuleTableBody');
            if (!tbody) return;

            const filtered = rulesHandoverRuleData.filter(item => {
                return !searchVal ||
                    (item.condition_name && item.condition_name.toLowerCase().includes(searchVal)) ||
                    (item.threshold_value && item.threshold_value.toLowerCase().includes(searchVal)) ||
                    (item.auto_assign_role && item.auto_assign_role.toLowerCase().includes(searchVal));
            });

            const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
            if (policyPage > totalPages) policyPage = totalPages;
            const start = (policyPage - 1) * RULES_PAGE_SIZE;
            const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy quy tắc chuyển ca phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${item.condition_name}</div></td>
                    <td><span class="admin-badge badge-neutral">${item.trigger_type || 'Tự động'}</span></td>
                    <td><div style="max-width: 380px; font-size: 12px; color: var(--text-muted); line-height: 1.4;">${item.threshold_value || ''}</div></td>
                    <td><span style="font-weight: 600; color: var(--text-main);">${item.auto_assign_role || 'Nhân viên CSKH'}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: #DC2626;">${item.sla_seconds ? item.sla_seconds + ' giây' : '—'}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.is_active ? 'badge-active' : 'badge-neutral'}">${item.is_active ? 'Hiệu lực' : 'Tắt'}</span>
                    </td>
                </tr>
            `).join('');

            renderPaginationControls('policyPaginationWrap', policyPage, totalPages, (newPage) => {
                policyPage = newPage;
                renderPolicyTable();
            });
        }
    }

    // 5. MATRIX TABLE
    function renderMatrixTable() {
        const tbody = document.getElementById('matrixTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputMatrixSearch')?.value || '').toLowerCase().trim();
        const statusVal = document.getElementById('selectMatrixStatusFilter')?.value || 'all';

        const filtered = rulesMatrixData.filter(item => {
            const matchSearch = !searchVal || 
                (item.scenario_name && item.scenario_name.toLowerCase().includes(searchVal)) ||
                (item.sample_user_input && item.sample_user_input.toLowerCase().includes(searchVal));
            const matchStatus = statusVal === 'all' || item.benchmark_status === statusVal;
            return matchSearch && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (matrixPage > totalPages) matrixPage = totalPages;
        const start = (matrixPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy kịch bản kiểm thử phù hợp</td></tr>`;
            renderPaginationControls('matrixPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const statusBadge = item.benchmark_status === 'passed'
                ? `<span class="admin-badge badge-active">Đạt chuẩn</span>`
                : `<span class="admin-badge badge-danger">Chưa đạt</span>`;

            const sentimentLabels = {
                1: 'Cấp 1: Hài lòng',
                2: 'Cấp 2: Trung tính',
                3: 'Cấp 3: Thất vọng',
                4: 'Cấp 4: Tức giận',
                5: 'Cấp 5: Mất kiểm soát',
                6: 'Cấp 6: Y tế khẩn cấp'
            };

            const sampleSnippet = (item.sample_user_input || '').length > 120 
                ? (item.sample_user_input.substring(0, 115) + '...') 
                : (item.sample_user_input || '—');

            return `
                <tr>
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${item.scenario_name}</div></td>
                    <td><div style="font-size: 12.5px; color: var(--text-main); line-height: 1.4;">${sampleSnippet}</div></td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${sentimentLabels[item.expected_sentiment] || `Cấp ${item.expected_sentiment}`}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.expected_handover ? 'badge-neutral' : ''}">${item.expected_handover ? 'Bàn giao' : 'Tự động'}</span>
                    </td>
                    <td style="text-align: center;">${statusBadge}</td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('matrixPaginationWrap', matrixPage, totalPages, (newPage) => {
            matrixPage = newPage;
            renderMatrixTable();
        });
    }

    async function runBenchmarkFromUI() {
        PawpalChatbot.showToast?.('Đang tiến hành chạy kiểm thử Benchmark trên Supabase...', 'info');
        try {
            if (!supabase) return;
            const [filtersRes, triggersRes] = await Promise.all([
                supabase.from('chatbot_profanity_filter').select('*').eq('is_active', true),
                supabase.from('chatbot_sentiment_trigger').select('*').eq('is_active', true)
            ]);
            const filters = filtersRes.data || [];
            const triggers = triggersRes.data || [];

            let passed = 0;
            for (const sc of rulesMatrixData) {
                const text = sc.sample_user_input || sc.scenario_name;
                const lower = text.toLowerCase();
                let detLevel = 2;
                triggers.forEach(tr => {
                    const patterns = (tr.trigger_pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
                    for (const p of patterns) {
                        if (lower.includes(p)) {
                            if (tr.tier_level === 6 || tr.tier_level > detLevel) detLevel = tr.tier_level;
                        }
                    }
                });
                filters.forEach(f => {
                    const kw = (f.keyword || '').toLowerCase().trim();
                    if (kw && lower.includes(kw) && detLevel < 4) detLevel = 4;
                });

                const isMatch = (detLevel === sc.expected_sentiment) ||
                                (sc.expected_sentiment >= 4 && detLevel >= 4) ||
                                (sc.expected_sentiment === 2 && [1, 2, 3].includes(detLevel));

                const nextStatus = isMatch ? 'passed' : 'failed';
                if (isMatch) passed++;
                sc.benchmark_status = nextStatus;

                await supabase.from('chatbot_scenario_matrix').update({ benchmark_status: nextStatus }).eq('id', sc.id);
            }

            renderMatrixTable();
            const rate = rulesMatrixData.length > 0 ? ((passed / rulesMatrixData.length) * 100).toFixed(0) : 100;
            PawpalChatbot.showToast?.(`Kiểm thử hoàn tất! Đạt ${passed}/${rulesMatrixData.length} kịch bản (${rate}%).`, 'success');
        } catch (e) {
            console.error('Lỗi khi chạy benchmark từ UI:', e);
            PawpalChatbot.showToast?.('Lỗi khi chạy kiểm thử Benchmark: ' + e.message, 'danger');
        }
    }

    function openGenericRulesActionMenu(targetBtn, items) {
        document.querySelectorAll('.rules-popover-dropdown').forEach(p => p.remove());

        const popover = document.createElement('div');
        popover.className = 'rules-popover-dropdown';
        popover.style.cssText = `
            position: absolute;
            background: var(--surface-white);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border-neutral);
            border-radius: var(--admin-radius);
            box-shadow: 0 4px 16px rgba(35, 107, 72, 0.12);
            z-index: 9999;
            min-width: 170px;
            display: flex;
            flex-direction: column;
            padding: 4px 0;
        `;

        items.forEach(it => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = it.label;
            btn.style.cssText = `
                border: none;
                background: transparent;
                padding: 8px 14px;
                text-align: left;
                font-size: 13px;
                color: ${it.danger ? '#DC2626' : 'var(--text-main)'};
                font-weight: ${it.danger ? '600' : '500'};
                cursor: pointer;
                transition: background 0.15s;
                font-family: inherit;
            `;
            btn.addEventListener('mouseenter', () => btn.style.background = '#EEF5F1');
            btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
            btn.addEventListener('click', () => {
                popover.remove();
                it.action();
            });
            popover.appendChild(btn);
        });

        document.body.appendChild(popover);

        const rect = targetBtn.getBoundingClientRect();
        popover.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        popover.style.left = (rect.right + window.scrollX - popover.offsetWidth) + 'px';

        const closeHandler = (e) => {
            if (!popover.contains(e.target) && e.target !== targetBtn) {
                popover.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }

    function initRulesHubSubtab() {
        if (!rulesHubInitialized) {
            setupRulesHubEventListeners();
            rulesHubInitialized = true;
        }
        const activeRulesBtn = document.querySelector('.rules-hub-tab-btn.active');
        if (activeRulesBtn) {
            currentRulesView = activeRulesBtn.getAttribute('data-rules-view') || currentRulesView;
            document.querySelectorAll('.rules-view-panel').forEach(panel => {
                const isTarget = panel.id === `rulesView${currentRulesView.charAt(0).toUpperCase()}${currentRulesView.slice(1)}`;
                panel.style.display = isTarget ? 'flex' : 'none';
                panel.classList.toggle('active', isTarget);
            });
        }
        loadAllRulesDataFromSupabase();
    }

    function setupRulesHubEventListeners() {
        document.querySelectorAll('.rules-hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-rules-view');
                if (!view) return;

                document.querySelectorAll('.rules-hub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentRulesView = view;
                document.querySelectorAll('.rules-view-panel').forEach(p => {
                    p.style.display = 'none';
                    p.classList.remove('active');
                });

                const viewIdMap = {
                    faq: 'rulesViewFaq',
                    profanity: 'rulesViewProfanity',
                    canned: 'rulesViewCanned',
                    policy: 'rulesViewPolicy',
                    matrix: 'rulesViewMatrix',
                    guidelines: 'rulesViewGuidelines'
                };

                const targetEl = document.getElementById(viewIdMap[view]);
                if (targetEl) {
                    targetEl.style.display = 'flex';
                    targetEl.classList.add('active');
                }

                renderActiveRulesView();
            });
        });

        // FAQ Filters & Add
        document.getElementById('inputFaqSearch')?.addEventListener('input', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('selectFaqCategoryFilter')?.addEventListener('change', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('selectFaqStatusFilter')?.addEventListener('change', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('btnOpenAddFaqModal')?.addEventListener('click', () => {
            openFaqEditorModal(null);
        });

        // Profanity Filters & Add
        document.getElementById('inputProfanitySearch')?.addEventListener('input', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanitySeverityFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanityActionFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanityStatusFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('btnOpenAddProfanityModal')?.addEventListener('click', () => {
            openProfanityEditorModal(null);
        });

        // Canned Filters & Add
        document.getElementById('inputCannedSearch')?.addEventListener('input', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('selectCannedCategoryFilter')?.addEventListener('change', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('selectCannedStatusFilter')?.addEventListener('change', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('btnOpenAddCannedModal')?.addEventListener('click', () => {
            openCannedEditorModal(null);
        });

        // Policy Sub-Toggles & Search
        const btnComp = document.getElementById('btnToggleCompPolicy');
        const btnHand = document.getElementById('btnToggleHandoverRule');
        btnComp?.addEventListener('click', () => {
            btnComp.classList.add('active');
            btnHand?.classList.remove('active');
            currentPolicySubView = 'comp';
            policyPage = 1;
            renderPolicyTable();
        });
        btnHand?.addEventListener('click', () => {
            btnHand.classList.add('active');
            btnComp?.classList.remove('active');
            currentPolicySubView = 'handover';
            policyPage = 1;
            renderPolicyTable();
        });
        document.getElementById('inputPolicySearch')?.addEventListener('input', () => {
            policyPage = 1;
            renderPolicyTable();
        });

        // Matrix Filters & Run Benchmark
        document.getElementById('inputMatrixSearch')?.addEventListener('input', () => {
            matrixPage = 1;
            renderMatrixTable();
        });
        document.getElementById('selectMatrixStatusFilter')?.addEventListener('change', () => {
            matrixPage = 1;
            renderMatrixTable();
        });
        document.getElementById('btnRunBenchmarkUI')?.addEventListener('click', runBenchmarkFromUI);

        // Modal 8: Save FAQ
        const faqModal = document.getElementById('modalFaqEditorOverlay');
        document.getElementById('btnCloseFaqEditorModal')?.addEventListener('click', () => faqModal.style.display = 'none');
        document.getElementById('btnCancelFaqEditor')?.addEventListener('click', () => faqModal.style.display = 'none');
        document.getElementById('btnSaveFaqRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputFaqEditId')?.value.trim();
            const category = document.getElementById('inputFaqCategory')?.value.trim() || 'Thông tin dịch vụ';
            const question = document.getElementById('inputFaqQuestionText')?.value.trim();
            const answer = document.getElementById('textareaFaqAnswerText')?.value.trim();
            const rawKw = document.getElementById('inputFaqKeywordsList')?.value.trim();
            const priority = parseInt(document.getElementById('inputFaqPriorityNum')?.value || '1', 10);
            const is_active = document.getElementById('checkboxFaqIsActive')?.checked ?? true;

            if (!question || !answer) {
                PawpalChatbot.showToast?.('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!', 'warning');
                return;
            }

            const keywords = rawKw ? rawKw.split(',').map(s => s.trim()).filter(Boolean) : [];
            const saveBtn = document.getElementById('btnSaveFaqRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .update({
                            category,
                            question,
                            answer,
                            keywords,
                            priority,
                            is_active,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã cập nhật câu hỏi FAQ thành công!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .insert([{
                            category,
                            question,
                            answer,
                            keywords,
                            priority,
                            is_active
                        }]);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã thêm câu hỏi FAQ mới vào kho tri thức!', 'success');
                }

                if (faqModal) faqModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                PawpalChatbot.showToast?.('Lỗi lưu câu hỏi FAQ: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 9: Save Profanity
        const profModal = document.getElementById('modalProfanityEditorOverlay');
        document.getElementById('btnCloseProfanityEditorModal')?.addEventListener('click', () => profModal.style.display = 'none');
        document.getElementById('btnCancelProfanityEditor')?.addEventListener('click', () => profModal.style.display = 'none');
        document.getElementById('btnSaveProfanityRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputProfanityEditId')?.value.trim();
            const keyword = document.getElementById('inputProfanityKeywordText')?.value.trim().toLowerCase();
            const severity = document.getElementById('selectProfanitySeverityVal')?.value || 'medium';
            const action = document.getElementById('selectProfanityActionVal')?.value || 'mask';
            const replacement_text = document.getElementById('inputProfanityReplacementVal')?.value.trim() || '***';
            const is_active = document.getElementById('checkboxProfanityIsActive')?.checked ?? true;

            if (!keyword) {
                PawpalChatbot.showToast?.('Vui lòng nhập từ ngữ cần nhận diện!', 'warning');
                return;
            }

            const saveBtn = document.getElementById('btnSaveProfanityRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .update({
                            keyword,
                            severity,
                            action,
                            replacement_text,
                            is_active
                        })
                        .eq('id', id);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã cập nhật từ cấm Toxic Shield thành công!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .insert([{
                            keyword,
                            severity,
                            action,
                            replacement_text,
                            is_active
                        }]);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã thêm từ ngữ mới vào màng lọc Toxic Shield!', 'success');
                }

                if (profModal) profModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                PawpalChatbot.showToast?.('Lỗi lưu từ cấm: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 10: Save Canned
        const canModal = document.getElementById('modalCannedEditorOverlay');
        document.getElementById('btnCloseCannedEditorModal')?.addEventListener('click', () => canModal.style.display = 'none');
        document.getElementById('btnCancelCannedEditor')?.addEventListener('click', () => canModal.style.display = 'none');
        document.getElementById('btnSaveCannedRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputCannedEditId')?.value.trim();
            const shortcut = document.getElementById('inputCannedShortcutText')?.value.trim();
            const title = document.getElementById('inputCannedTitleText')?.value.trim();
            const category = document.getElementById('inputCannedCategoryText')?.value.trim() || 'Tiếp nhận hội thoại';
            const content = document.getElementById('textareaCannedContentText')?.value.trim();
            const is_active = document.getElementById('checkboxCannedIsActive')?.checked ?? true;

            if (!title || !content) {
                PawpalChatbot.showToast?.('Vui lòng nhập đầy đủ tiêu đề và nội dung câu mẫu!', 'warning');
                return;
            }

            const saveBtn = document.getElementById('btnSaveCannedRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .update({
                            shortcut,
                            title,
                            category,
                            content,
                            is_active
                        })
                        .eq('id', id);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã cập nhật mẫu câu phản hồi!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .insert([{
                            shortcut,
                            title,
                            category,
                            content,
                            is_active,
                            usage_count: 0
                        }]);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã thêm mẫu câu phản hồi mới!', 'success');
                }

                if (canModal) canModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                PawpalChatbot.showToast?.('Lỗi lưu mẫu câu: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });
    }

    PawpalChatbot.subtabs.rules = {
        init: initRulesHubSubtab,
        loadAllRulesDataFromSupabase
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRulesHubSubtab);
    } else {
        initRulesHubSubtab();
    }
})();
