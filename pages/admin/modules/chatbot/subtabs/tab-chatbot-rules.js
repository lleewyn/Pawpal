// tab-chatbot-rules.js - Subtab Kho tri thức và Quy định Chatbot Pawpal-er
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};
    PawpalChatbot.subtabs.rules = PawpalChatbot.subtabs.rules || {};

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
    const ruleRequests = new Map();
    const editorSnapshots = new Map();
    async function writeRule(table,id,values,remove=false) {
        const data={chatbot_knowledge_faq:rulesFaqData,chatbot_profanity_filter:rulesProfanityData,chatbot_canned_response:rulesCannedData}[table];
        const modal={chatbot_knowledge_faq:'modalFaqEditorOverlay',chatbot_profanity_filter:'modalProfanityEditorOverlay',chatbot_canned_response:'modalCannedEditorOverlay'}[table];
        const snapshot=editorSnapshots.get(table);
        const original=id ? (snapshot?.id===id&&document.getElementById(modal)?.classList.contains('active')?snapshot.record:data.find(row=>row.id===id)) : null;
        if(id&&!original)return {error:new Error('Dữ liệu đã thay đổi. Hãy tải lại.')};
        const key=JSON.stringify([table,id,values,remove]);
        if(!ruleRequests.has(key))ruleRequests.set(key,crypto.randomUUID());
        const result=await supabase.rpc('save_admin_chat_rule',{p_table:table,p_id:id||ruleRequests.get(key),p_expected:original||null,p_values:values,p_delete:remove});
        if(!result.error){ruleRequests.delete(key);if(table==='chatbot_canned_response')window.PawpalDataStore?.invalidate('chatbot:canned-live*');await loadAllRulesDataFromSupabase({ tables: [table], force: true });}
        return result;
    }
    const ruleDb={from:table=>({
        select:(...args)=>supabase.from(table).select(...args),
        update:values=>({eq:(_key,id)=>writeRule(table,id,values)}),
        insert:rows=>writeRule(table,null,rows[0]),
        delete:()=>({eq:(_key,id)=>writeRule(table,id,{},true)})
    })};
    let rulesHubInitialized = false;
    const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const pendingRuleTables = new Set();
    const allRuleTables = ['chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix'];
    const ruleCounts = {};
    const tablesForView = () => ({faq:[allRuleTables[0]],profanity:[allRuleTables[1]],canned:[allRuleTables[2]],
        policy:[allRuleTables[currentPolicySubView==='comp'?3:4]],matrix:[allRuleTables[5]],guidelines:[]})[currentRulesView] || [];
    async function loadRuleCounts(forceTables,skipTables=new Set()) {
        const store=window.PawpalDataStore;
        await Promise.all(allRuleTables.filter(table=>!skipTables.has(table)).map(async table=>{
            const read=async()=>{
                const result=await supabase.from(table).select('id',{count:'exact',head:true});
                if(result.error)throw result.error;
                return result.count || 0;
            };
            try { ruleCounts[table]=store ? await store.fetch('chatbot:rule-count:'+table+':'+store.buildKey(table),read,
                {force:forceTables.has(table),ttlMs:60000,backgroundRevalidate:false}) : await read(); }
            catch { delete ruleCounts[table]; }
        }));
    }
    const ruleLoads = {};
    const ruleTableIds = ['faqTableBody','profanityTableBody','cannedTableBody','compPolicyTableBody','handoverRuleTableBody','matrixTableBody'];
    const pageMeta = {}, ruleCategories = {}, pageRevision = {};
    function rulePageRequest(table) {
        const value=(id,fallback='all')=>document.getElementById(id)?.value || fallback;
        const query=id=>value(id,'').toLowerCase().trim();
        const configs={
            chatbot_knowledge_faq:{page:faqPage,filters:{query:query('inputFaqSearch'),category:value('selectFaqCategoryFilter'),status:value('selectFaqStatusFilter')}},
            chatbot_profanity_filter:{page:profanityPage,filters:{query:query('inputProfanitySearch'),severity:value('selectProfanitySeverityFilter'),action:value('selectProfanityActionFilter'),status:value('selectProfanityStatusFilter')}},
            chatbot_canned_response:{page:cannedPage,filters:{query:query('inputCannedSearch'),category:value('selectCannedCategoryFilter'),status:value('selectCannedStatusFilter')}},
            chatbot_compensation_policy:{page:policyPage,filters:{query:query('inputPolicySearch')}},
            chatbot_handover_rule:{page:policyPage,filters:{query:query('inputPolicySearch')}},
            chatbot_scenario_matrix:{page:matrixPage,filters:{query:query('inputMatrixSearch'),status:value('selectMatrixStatusFilter')}}
        };
        return configs[table];
    }
    function applyRulePage(table,response) {
        pageMeta[table]=response;ruleCounts[table]=response.count;ruleCategories[table]=response.categories || [];
        switch(table){
            case 'chatbot_knowledge_faq':rulesFaqData=response.rows;faqPage=response.page;break;
            case 'chatbot_profanity_filter':rulesProfanityData=response.rows;profanityPage=response.page;break;
            case 'chatbot_canned_response':rulesCannedData=response.rows;cannedPage=response.page;break;
            case 'chatbot_compensation_policy':rulesCompPolicyData=response.rows;policyPage=response.page;break;
            case 'chatbot_handover_rule':rulesHandoverRuleData=response.rows;policyPage=response.page;break;
            case 'chatbot_scenario_matrix':rulesMatrixData=response.rows;matrixPage=response.page;break;
        }
    }
    async function canRenderRule(tbody) {
        const module=sessionStorage.getItem('pawpal_admin_active_module');
        if(document.hidden || (module && module!=='Chatbot') || !document.getElementById('subtab-tab-chatbot-rules')?.classList.contains('active'))return false;
        const table=allRuleTables[ruleTableIds.indexOf(tbody.id)],request=rulePageRequest(table);
        const signature=JSON.stringify(request),revision=(pageRevision[table]||0)+1;
        pageRevision[table]=revision;
        const columns=tbody.closest('table')?.querySelectorAll('thead th').length || 1;
        const force=pendingRuleTables.has(table);pendingRuleTables.delete(table);
        tbody.setAttribute('aria-busy','true');
        const loadingCell=document.createElement('td');loadingCell.colSpan=columns;
        loadingCell.textContent='Đang tải quy tắc…';loadingCell.style.textAlign='center';loadingCell.style.padding='28px';
        const loadingRow=document.createElement('tr');loadingRow.append(loadingCell);tbody.replaceChildren(loadingRow);
        try {
            const read=async()=>{
                const {data,error}=await supabase.rpc('admin_chat_rule_page',{p_table:table,p_filters:request.filters,p_page:request.page});
                if(error)throw error;
                return data;
            };
            const store=window.PawpalDataStore;
            const result=store ? await store.fetch('chatbot:rules:'+table+':'+store.buildKey(table,{page:request.page,...request.filters}),read,{force,ttlMs:60000,backgroundRevalidate:false}) : await read();
            if(revision!==pageRevision[table] || signature!==JSON.stringify(rulePageRequest(table)))return false;
            applyRulePage(table,result);ruleLoads[tbody.id]='ready';delete tbody.dataset.loadingSkeleton;
            updateRulesBadges();populateRulesCategories();
            return true;
        } catch(error) {
            if(revision!==pageRevision[table])return false;
            ruleLoads[tbody.id]='error';delete tbody.dataset.loadingSkeleton;
            const cell=document.createElement('td');cell.colSpan=columns;cell.textContent='Không tải được quy định. Vui lòng làm mới.';
            const row=document.createElement('tr');row.append(cell);tbody.replaceChildren(row);
            return false;
        } finally {
            if(revision===pageRevision[table])tbody.removeAttribute('aria-busy');
        }
    }
    async function loadAllRulesDataFromSupabase({tables=tablesForView(),force=false}={}) {
        const module=sessionStorage.getItem('pawpal_admin_active_module');
        if(document.hidden || (module && module!=='Chatbot') || !document.getElementById('subtab-tab-chatbot-rules')?.classList.contains('active')) {
            if(force)tables.forEach(table=>pendingRuleTables.add(table));
            return;
        }
        if(force)tables.forEach(table=>{
            pendingRuleTables.add(table);
            window.PawpalDataStore?.invalidate('chatbot:rules:'+table+'*');
        });
        const renderers=[renderFaqTable,renderProfanityTable,renderCannedTable,renderPolicyTable,renderPolicyTable,renderMatrixTable];
        await Promise.all([
            loadRuleCounts(force?new Set(tables):new Set(),new Set(tables)),
            Promise.all([...new Set(tables.map(table=>renderers[allRuleTables.indexOf(table)]))].map(render=>render()))
        ]);
        updateRulesBadges();
    }

    function updateRulesBadges() {
        const bFaq = document.getElementById('badgeFaqCount');
        const bProf = document.getElementById('badgeProfanityCount');
        const bCanned = document.getElementById('badgeCannedCount');
        const bPol = document.getElementById('badgePolicyCount');
        const bMat = document.getElementById('badgeMatrixCount');

        if (bFaq) bFaq.textContent = ruleCounts[allRuleTables[0]] ?? rulesFaqData.length;
        if (bProf) bProf.textContent = ruleCounts[allRuleTables[1]] ?? rulesProfanityData.length;
        if (bCanned) bCanned.textContent = ruleCounts[allRuleTables[2]] ?? rulesCannedData.length;
        if (bPol) bPol.textContent = (ruleCounts[allRuleTables[3]] ?? rulesCompPolicyData.length) + (ruleCounts[allRuleTables[4]] ?? rulesHandoverRuleData.length);
        if (bMat) bMat.textContent = ruleCounts[allRuleTables[5]] ?? rulesMatrixData.length;
    }

    function populateRulesCategories() {
        const faqCatSelect = document.getElementById('selectFaqCategoryFilter');
        if (faqCatSelect) {
            const currentVal = faqCatSelect.value;
            const cats = ruleCategories.chatbot_knowledge_faq || [];
            faqCatSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
                cats.map(c => `<option value="${escapeHtml(c)}" ${c === currentVal ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
        }

        const cannedCatSelect = document.getElementById('selectCannedCategoryFilter');
        if (cannedCatSelect) {
            const currentVal = cannedCatSelect.value;
            const cats = ruleCategories.chatbot_canned_response || [];
            cannedCatSelect.innerHTML = '<option value="all">Tất cả chủ đề</option>' +
                cats.map(c => `<option value="${escapeHtml(c)}" ${c === currentVal ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
        }
    }

    function renderActiveRulesView() {
        if (currentRulesView === 'faq') return renderFaqTable();
        else if (currentRulesView === 'profanity') return renderProfanityTable();
        else if (currentRulesView === 'canned') return renderCannedTable();
        else if (currentRulesView === 'policy') return renderPolicyTable();
        else if (currentRulesView === 'matrix') return renderMatrixTable();
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
    async function renderFaqTable() {
        const tbody = document.getElementById('faqTableBody');
        if (!tbody) return;
        if (!await canRenderRule(tbody)) return;

        const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_knowledge_faq.total / RULES_PAGE_SIZE));
        const pageItems = rulesFaqData;

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy câu hỏi FAQ phù hợp</td></tr>`;
            renderPaginationControls('faqPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const kwHtml = Array.isArray(item.keywords) && item.keywords.length > 0
                ? `<div class="rules-keywords-wrap">${item.keywords.slice(0, 3).map(k => `<span class="rules-keyword-pill">${escapeHtml(k)}</span>`).join('')}${item.keywords.length > 3 ? `<span class="rules-keyword-pill">+${item.keywords.length - 3}</span>` : ''}</div>`
                : '<span style="color: var(--text-muted); opacity: 0.4;">—</span>';

            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><span style="font-weight: 600; color: #236B48;">${escapeHtml(item.category || 'Chung')}</span></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${escapeHtml(item.question)}</div></td>
                    <td><div style="max-width: 380px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.answer || '').replace(/"/g, '&quot;')}">${escapeHtml(item.answer || '')}</div></td>
                    <td>${kwHtml}</td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">#${item.priority || 1}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-faq-id="${escapeHtml(item.id)}" title="Thao tác">•••</button>
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
                    const { error } = await ruleDb.from('chatbot_knowledge_faq')
                        .update({ is_active: !item.is_active })
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
                        message: `Bạn có chắc chắn muốn xóa câu hỏi "${escapeHtml(item.question)}" khỏi kho tri thức không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await ruleDb.from('chatbot_knowledge_faq').delete().eq('id', item.id);
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
        editorSnapshots.set('chatbot_knowledge_faq',{id:item?.id,record:item?structuredClone(item):null});
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

        if (PawpalChatbot.openModal) {
            PawpalChatbot.openModal('modalFaqEditorOverlay');
        } else if (overlay) {
            overlay.classList.add('active');
            overlay.style.display = 'flex';
        }
    }

    // 2. TOXIC SHIELD PROFANITY FILTER TABLE
    async function renderProfanityTable() {
        const tbody = document.getElementById('profanityTableBody');
        if (!tbody) return;
        if (!await canRenderRule(tbody)) return;

        const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_profanity_filter.total / RULES_PAGE_SIZE));
        const pageItems = rulesProfanityData;

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
                    <td><span style="font-weight: 700; color: #DC2626;">${escapeHtml(item.keyword)}</span></td>
                    <td style="text-align: center;">${sevBadges[item.severity] || sevBadges.medium}</td>
                    <td><span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${actLabels[item.action] || item.action}</span></td>
                    <td><code style="background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 600;">${escapeHtml(item.replacement_text || '***')}</code></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-prof-id="${escapeHtml(item.id)}" title="Thao tác">•••</button>
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
                    const { error } = await ruleDb.from('chatbot_profanity_filter')
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
                        message: `Bạn có chắc chắn muốn xóa từ "${escapeHtml(item.keyword)}" khỏi danh sách lọc không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await ruleDb.from('chatbot_profanity_filter').delete().eq('id', item.id);
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
        editorSnapshots.set('chatbot_profanity_filter',{id:item?.id,record:item?structuredClone(item):null});
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

        if (PawpalChatbot.openModal) {
            PawpalChatbot.openModal('modalProfanityEditorOverlay');
        } else if (overlay) {
            overlay.classList.add('active');
            overlay.style.display = 'flex';
        }
    }

    // 3. CANNED RESPONSES TABLE
    async function renderCannedTable() {
        const tbody = document.getElementById('cannedTableBody');
        if (!tbody) return;
        if (!await canRenderRule(tbody)) return;

        const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_canned_response.total / RULES_PAGE_SIZE));
        const pageItems = rulesCannedData;

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
                    <td><code style="background: #EEF5F1; padding: 3px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 700;">${escapeHtml(item.shortcut || '—')}</code></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${escapeHtml(item.title)}</div></td>
                    <td><div style="max-width: 400px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.content || '').replace(/"/g, '&quot;')}">${escapeHtml(item.content || '')}</div></td>
                    <td><span class="admin-badge badge-neutral">${escapeHtml(item.category || 'Chung')}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 600; color: var(--text-main);">${item.usage_count || 0}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-canned-id="${escapeHtml(item.id)}" title="Thao tác">•••</button>
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
                    const { error } = await ruleDb.from('chatbot_canned_response')
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
                        message: `Bạn có chắc chắn muốn xóa mẫu câu "${escapeHtml(item.title)}" không?`,
                        confirmText: 'Xóa',
                        isDanger: true,
                        onConfirm: async () => {
                            if (!supabase) return;
                            const { error } = await ruleDb.from('chatbot_canned_response').delete().eq('id', item.id);
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
        editorSnapshots.set('chatbot_canned_response',{id:item?.id,record:item?structuredClone(item):null});
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

        if (PawpalChatbot.openModal) {
            PawpalChatbot.openModal('modalCannedEditorOverlay');
        } else if (overlay) {
            overlay.classList.add('active');
            overlay.style.display = 'flex';
        }
    }

    // 4. POLICY TABLE
    async function renderPolicyTable() {
        const compWrapper = document.getElementById('compPolicyTableWrapper');
        const handWrapper = document.getElementById('handoverRuleTableWrapper');
        const searchVal = (document.getElementById('inputPolicySearch')?.value || '').toLowerCase().trim();

        if (currentPolicySubView === 'comp') {
            if (compWrapper) compWrapper.style.display = 'block';
            if (handWrapper) handWrapper.style.display = 'none';

            const tbody = document.getElementById('compPolicyTableBody');
            if (!tbody) return;
        if (!await canRenderRule(tbody)) return;

            const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_compensation_policy.total / RULES_PAGE_SIZE));
            const pageItems = rulesCompPolicyData;

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy hạn mức bồi hoàn phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${escapeHtml(item.issue_type)}</div></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius);">${item.max_points ? item.max_points + ' điểm' : '—'}</span></td>
                    <td style="text-align: right;"><span style="font-weight: 600; color: var(--text-main);">${item.max_discount_vnd ? item.max_discount_vnd.toLocaleString('vi-VN') + ' đ' : '—'}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.approval_required ? 'badge-warning' : 'badge-neutral'}">${item.approval_required ? 'Cần Quản lý duyệt' : 'Nhân viên tự duyệt'}</span>
                    </td>
                    <td><div style="max-width: 420px; font-size: 12px; color: var(--text-muted); line-height: 1.4; white-space: pre-line;">${escapeHtml(item.description || '')}</div></td>
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
        if (!await canRenderRule(tbody)) return;

            const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_handover_rule.total / RULES_PAGE_SIZE));
            const pageItems = rulesHandoverRuleData;

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy quy tắc chuyển ca phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${escapeHtml(item.condition_name)}</div></td>
                    <td><span class="admin-badge badge-neutral">${escapeHtml(item.trigger_type || 'Tự động')}</span></td>
                    <td><div style="max-width: 380px; font-size: 12px; color: var(--text-muted); line-height: 1.4;">${escapeHtml(item.threshold_value || '')}</div></td>
                    <td><span style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.auto_assign_role || 'Nhân viên CSKH')}</span></td>
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
    async function renderMatrixTable() {
        const tbody = document.getElementById('matrixTableBody');
        if (!tbody) return;
        if (!await canRenderRule(tbody)) return;

        const totalPages = Math.max(1, Math.ceil(pageMeta.chatbot_scenario_matrix.total / RULES_PAGE_SIZE));
        const pageItems = rulesMatrixData;

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
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${escapeHtml(item.scenario_name)}</div></td>
                    <td><div style="font-size: 12.5px; color: var(--text-main); line-height: 1.4;">${escapeHtml(sampleSnippet)}</div></td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${sentimentLabels[item.expected_sentiment] || `Cấp ${escapeHtml(item.expected_sentiment)}`}</span></td>
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

    async function runBenchmarkFromUI(){
        const button=document.getElementById('btnRunBenchmarkUI');if(button.disabled)return;button.disabled=true;
        try{
            const session=(await supabase.auth.getSession()).data.session;if(!session)throw Error('Phiên đăng nhập đã hết hạn.');
            const response=await fetch('/api/admin-chat',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'benchmark'})});
            const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Không chạy được kiểm tra.');
            await loadAllRulesDataFromSupabase({tables:['chatbot_scenario_matrix'],force:true});const s=data.summary;
            PawpalChatbot.showToast?.('Quy tắc: '+s.passed+' đạt, '+s.failed+' chưa đạt, '+s.pending+' chưa đo công cụ.','info');
        }catch(error){PawpalChatbot.showToast?.(error.message,'error');}finally{button.disabled=false;}
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
            let timer;let channel=supabase?.channel('admin-chat-rules-v1');
            for(const table of ['chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix'])channel=channel?.on('postgres_changes',{event:'*',schema:'public',table},()=>{clearTimeout(timer);pendingRuleTables.add(table);window.PawpalDataStore?.invalidate('chatbot:rules:'+table+'*');window.PawpalDataStore?.invalidate('chatbot:rule-count:'+table+'*');if(table==='chatbot_canned_response')window.PawpalDataStore?.invalidate('chatbot:canned-live*');timer=setTimeout(()=>loadAllRulesDataFromSupabase(),350);});
            channel?.subscribe();window.addEventListener('beforeunload',()=>{clearTimeout(timer);if(channel)supabase.removeChannel(channel);},{once:true});
            document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadAllRulesDataFromSupabase();});
        }
        const savedView=sessionStorage.getItem('pawpal_chat_rules_view');
        if(['faq','profanity','canned','policy','matrix','guidelines'].includes(savedView))document.querySelectorAll('.rules-hub-tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.rulesView===savedView));
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

    const ruleSearchTimers = new Map();
    function deferRuleSearch(render) {
        clearTimeout(ruleSearchTimers.get(render));
        allRuleTables.forEach(table=>pageRevision[table]=(pageRevision[table]||0)+1);
        ruleSearchTimers.set(render,setTimeout(()=>render(),250));
    }

    function setupRulesHubEventListeners() {
        document.querySelectorAll('.rules-hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-rules-view');
                if (!view) return;

                document.querySelectorAll('.rules-hub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentRulesView = view;
                sessionStorage.setItem('pawpal_chat_rules_view',view);
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
                loadAllRulesDataFromSupabase();
            });
        });

        // FAQ Filters & Add
        document.getElementById('inputFaqSearch')?.addEventListener('input', () => {
            faqPage = 1;
            deferRuleSearch(renderFaqTable);
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
            deferRuleSearch(renderProfanityTable);
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
            deferRuleSearch(renderCannedTable);
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
            deferRuleSearch(renderPolicyTable);
        });

        // Matrix Filters & Run Benchmark
        document.getElementById('inputMatrixSearch')?.addEventListener('input', () => {
            matrixPage = 1;
            deferRuleSearch(renderMatrixTable);
        });
        document.getElementById('selectMatrixStatusFilter')?.addEventListener('change', () => {
            matrixPage = 1;
            renderMatrixTable();
        });
        document.getElementById('btnRunBenchmarkUI')?.addEventListener('click', runBenchmarkFromUI);

        // Modal 8: Save FAQ
        const faqModal = document.getElementById('modalFaqEditorOverlay');
        document.getElementById('btnCloseFaqEditorModal')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalFaqEditorOverlay'));
        document.getElementById('btnCancelFaqEditor')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalFaqEditorOverlay'));
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
                    const { error } = await ruleDb.from('chatbot_knowledge_faq')
                        .update({
                            category,
                            question,
                            answer,
                            keywords,
                            priority,
                            is_active
                        })
                        .eq('id', id);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã cập nhật câu hỏi FAQ thành công!', 'success');
                } else {
                    const { error } = await ruleDb.from('chatbot_knowledge_faq')
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

                if (faqModal) PawpalChatbot.closeModal?.('modalFaqEditorOverlay');
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                PawpalChatbot.showToast?.('Lỗi lưu câu hỏi FAQ: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 9: Save Profanity
        const profModal = document.getElementById('modalProfanityEditorOverlay');
        document.getElementById('btnCloseProfanityEditorModal')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalProfanityEditorOverlay'));
        document.getElementById('btnCancelProfanityEditor')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalProfanityEditorOverlay'));
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
                    const { error } = await ruleDb.from('chatbot_profanity_filter')
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
                    const { error } = await ruleDb.from('chatbot_profanity_filter')
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

                if (profModal) PawpalChatbot.closeModal?.('modalProfanityEditorOverlay');
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                PawpalChatbot.showToast?.('Lỗi lưu từ cấm: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 10: Save Canned
        const canModal = document.getElementById('modalCannedEditorOverlay');
        document.getElementById('btnCloseCannedEditorModal')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalCannedEditorOverlay'));
        document.getElementById('btnCancelCannedEditor')?.addEventListener('click', () => PawpalChatbot.closeModal?.('modalCannedEditorOverlay'));
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
                    const { error } = await ruleDb.from('chatbot_canned_response')
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
                    const { error } = await ruleDb.from('chatbot_canned_response')
                        .insert([{
                            shortcut,
                            title,
                            category,
                            content,
                            is_active,

                        }]);
                    if (error) throw error;
                    PawpalChatbot.showToast?.('Đã thêm mẫu câu phản hồi mới!', 'success');
                }

                if (canModal) PawpalChatbot.closeModal?.('modalCannedEditorOverlay');
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
