// tab-settings-content.js - Subtab Quản lý Bài viết (Blog & Cẩm nang chăm sóc thú cưng)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};
    PawpalSettings.state = PawpalSettings.state || {};

    let currentArticlePage = 1;
    const ARTICLE_PAGE_SIZE = 10;
    let isContentInitialized = false;

    function getSupabaseClient() {
        return PawpalSettings.getSupabaseClient?.() || (window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient);
    }

    function showToast(msg, type) {
        if (PawpalSettings.showToast) PawpalSettings.showToast(msg, type);
    }

    function logSystemAudit(action, entityName, description) {
        if (PawpalSettings.logSystemAudit) return PawpalSettings.logSystemAudit(action, entityName, description);
        return Promise.resolve();
    }

    function updateArticleKpis() {
        if (!PawpalSettings.state.isLoaded) return;
        const articlesList = PawpalSettings.state?.articlesList || [];
        const total = articlesList.length;
        const pub = articlesList.filter(a => a.status === 'published').length;
        const draft = articlesList.filter(a => a.status === 'draft').length;
        const hidden = articlesList.filter(a => a.status === 'hidden').length;
        const totalViews = articlesList.reduce((sum, a) => sum + (Number(a.views) || 0), 0);

        const tEl = document.getElementById('statTotalArticles');
        const pEl = document.getElementById('statPublishedArticles');
        const dEl = document.getElementById('statDraftArticles');
        const hEl = document.getElementById('statHiddenArticles');
        const vEl = document.getElementById('statTotalViews');

        if (tEl) tEl.textContent = total;
        if (pEl) pEl.textContent = pub;
        if (dEl) dEl.textContent = draft;
        if (hEl) hEl.textContent = hidden;
        if (vEl) vEl.textContent = totalViews.toLocaleString('vi-VN');
    }

    function openArticleActionMenu(triggerBtn, articleId) {
        PawpalSettings.state.currentActiveArticleId = articleId;
        const dropdown = document.getElementById('articleActionDropdown');
        if (!dropdown) return;

        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${Math.max(10, rect.right - 210)}px`;
        dropdown.style.display = 'flex';
    }

    function closeArticleActionMenu() {
        const dropdown = document.getElementById('articleActionDropdown');
        if (dropdown) dropdown.style.display = 'none';
        PawpalSettings.state.currentActiveArticleId = null;
    }

    function getFilteredArticles() {
        const articlesList = PawpalSettings.state?.articlesList || [];
        const keyword = (document.getElementById('searchArticleInput')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('filterArticleCategory')?.value || 'all';
        const statusFilter = document.getElementById('filterArticleStatus')?.value || 'all';

        return articlesList.filter(a => {
            if (catFilter !== 'all' && a.category !== catFilter) return false;
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (keyword && !a.title.toLowerCase().includes(keyword)) return false;
            return true;
        });
    }

    function renderArticles() {
        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;
        if (PawpalSettings.state.loadError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = `<tr><td colspan="${tbody.closest('table').querySelectorAll('thead th').length}" style="padding:28px;text-align:center;">Không thể tải dữ liệu cấu hình. Vui lòng tải lại trang.</td></tr>`;
            return;
        }
        if (!PawpalSettings.state.isLoaded) return;
        delete tbody.dataset.loadingSkeleton;

        const filtered = getFilteredArticles();
        const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLE_PAGE_SIZE));
        if (currentArticlePage > totalPages) currentArticlePage = totalPages;
        if (currentArticlePage < 1) currentArticlePage = 1;

        const pageItems = filtered.slice((currentArticlePage - 1) * ARTICLE_PAGE_SIZE, currentArticlePage * ARTICLE_PAGE_SIZE);
        const pageBar = document.querySelector('#subtab-tab-content-management .admin-pagination-bar');
        if (pageBar) {
            pageBar.querySelector('.article-page-prev')?.classList.toggle('disabled', currentArticlePage === 1);
            pageBar.querySelector('.article-page-next')?.classList.toggle('disabled', currentArticlePage === totalPages);
            const nums = pageBar.querySelector('.article-page-numbers');
            if (nums) {
                nums.innerHTML = Array.from({ length: totalPages }, (_, i) => `<button type="button" class="pagination-btn ${i + 1 === currentArticlePage ? 'active' : ''}" data-article-page="${i + 1}">${i + 1}</button>`).join('');
                nums.querySelectorAll('[data-article-page]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        currentArticlePage = Number(btn.dataset.articlePage);
                        renderArticles();
                    });
                });
            }
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy bài viết nào phù hợp.</td></tr>`;
            updateArticleKpis();
            return;
        }

        pageItems.forEach(a => {
            let statusBadge = '';
            if (a.status === 'published') statusBadge = '<span class="admin-badge badge-active">Công khai</span>';
            else if (a.status === 'draft') statusBadge = '<span class="admin-badge badge-neutral">Bản nháp</span>';
            else statusBadge = '<span class="admin-badge badge-warning">Tạm ẩn</span>';

            const ragBadge = a.ragSynced
                ? '<span class="admin-badge badge-active">Đã nạp RAG</span>'
                : '<span class="admin-badge badge-warning">Chưa nạp RAG</span>';

            const esc = PawpalSettings.escapeHtml || (s => s);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="article-thumb-img">Ảnh bìa</div></td>
                <td><strong style="color: var(--text-main); font-size: 13.5px;">${esc(a.title)}</strong></td>
                <td>${esc(a.author)}</td>
                <td><span class="admin-badge badge-neutral">${esc(a.category)}</span></td>
                <td>${(Number(a.views) || 0).toLocaleString('vi-VN')}</td>
                <td>${ragBadge}</td>
                <td>${statusBadge}</td>
                <td>${esc(a.updatedAt)}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger btn-article-more" data-id="${esc(a.id)}" title="Tác vụ bài viết">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Click nút 3 chấm mở dropdown bài viết
        tbody.querySelectorAll('.btn-article-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                openArticleActionMenu(e.currentTarget, id);
            });
        });

        updateArticleKpis();
    }

    // Nạp danh mục bài viết động từ CSDL Supabase
    function populateBlogCategories() {
        const catFilterEl = document.getElementById('filterArticleCategory');
        const catInputEl = document.getElementById('inputArticleCategory');

        const dbCategories = PawpalSettings.state?.blogCategoriesList || [];
        const validCategories = [];
        dbCategories.forEach(c => {
            const id = c.id;
            const name = (c.description || c.category_name || '').trim();
            if (name && name !== 'Chưa rõ' && name !== 'unknown' && name !== 'null' && Number.isNaN(Number(name))) {
                if (!validCategories.some(vc => vc.name.toLowerCase() === name.toLowerCase())) {
                    validCategories.push({ id: id, name: name });
                }
            }
        });

        if (validCategories.length === 0) {
            validCategories.push(
                { id: 'f2e684f1-aba2-43b6-98af-dadac0c16ee3', name: 'Mẹo chăm sóc' },
                { id: '3a715f52-a0b6-433a-88c1-0383b8e0486b', name: 'Tin tức' },
                { id: '13820759-5b1e-4662-bc82-dabb8928ee41', name: 'Khuyến mãi' }
            );
        }

        if (catFilterEl) {
            const currentVal = catFilterEl.value;
            catFilterEl.innerHTML = '<option value="all">Tất cả danh mục</option>' +
                validCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            if (currentVal && (currentVal === 'all' || validCategories.some(c => c.name === currentVal))) {
                catFilterEl.value = currentVal;
            } else {
                catFilterEl.value = 'all';
            }
        }

        if (catInputEl) {
            const currentVal = catInputEl.value;
            catInputEl.innerHTML = validCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            if (currentVal && validCategories.some(c => c.id === currentVal)) {
                catInputEl.value = currentVal;
            }
        }
    }

    function initContentSubtab() {
        if (isContentInitialized) {
            populateBlogCategories();
            renderArticles();
            updateArticleKpis();
            return;
        }
        isContentInitialized = true;

        // Lọc Bài viết
        document.getElementById('searchArticleInput')?.addEventListener('input', () => {
            currentArticlePage = 1;
            renderArticles();
        });
        document.getElementById('filterArticleCategory')?.addEventListener('change', () => {
            currentArticlePage = 1;
            renderArticles();
        });
        document.getElementById('filterArticleStatus')?.addEventListener('change', () => {
            currentArticlePage = 1;
            renderArticles();
        });

        // Nạp danh mục động
        populateBlogCategories();

        // Điều khiển phân trang (gắn listener 1 lần)
        const pageBar = document.querySelector('#subtab-tab-content-management .admin-pagination-bar');
        pageBar?.querySelector('.article-page-prev')?.addEventListener('click', () => {
            if (currentArticlePage > 1) {
                currentArticlePage--;
                renderArticles();
            }
        });
        pageBar?.querySelector('.article-page-next')?.addEventListener('click', () => {
            const filtered = getFilteredArticles();
            const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLE_PAGE_SIZE));
            if (currentArticlePage < totalPages) {
                currentArticlePage++;
                renderArticles();
            }
        });

        // Modal Tạo Bài Viết Mới
        document.getElementById('btnOpenCreateArticleModal')?.addEventListener('click', () => {
            populateBlogCategories();
            const titleInput = document.getElementById('inputArticleTitle');
            if (titleInput) titleInput.value = '';
            const summaryInput = document.getElementById('inputArticleSummary');
            if (summaryInput) summaryInput.value = '';
            const contentInput = document.getElementById('inputArticleContent');
            if (contentInput) contentInput.value = '';
            PawpalSettings.openModal?.('articleModalOverlay');
        });
        document.getElementById('btnCancelArticleModal')?.addEventListener('click', () => {
            PawpalSettings.closeModal?.('articleModalOverlay');
        });
        document.getElementById('btnDismissArticleModal')?.addEventListener('click', () => {
            PawpalSettings.closeModal?.('articleModalOverlay');
        });

        document.getElementById('btnSaveArticle')?.addEventListener('click', async () => {
            const title = document.getElementById('inputArticleTitle')?.value.trim();
            const summary = document.getElementById('inputArticleSummary')?.value.trim() || '';
            const content = document.getElementById('inputArticleContent')?.value.trim() || '';
            let categoryId = document.getElementById('inputArticleCategory')?.value || null;
            const status = document.getElementById('inputArticleStatus')?.value || 'published';

            const articleValidationErrors = [];
            if (!title) articleValidationErrors.push('Tiêu đề là bắt buộc.');
            if (!summary) articleValidationErrors.push('Tóm tắt là bắt buộc.');
            if (!content) articleValidationErrors.push('Nội dung là bắt buộc.');
            if (articleValidationErrors.length) {
                showToast(articleValidationErrors.join(' '), 'warning');
                return;
            }

            const slug = title.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '') + '-' + Date.now();

            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn đang bật. Vui lòng mở khóa trước khi xuất bản hoặc lưu bài viết.', 'warning');
                return;
            }

            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Không kết nối được Supabase.');

                // CFG-13: Xác thực author_id từ phiên đăng nhập thực tế, cấm fallback staff ngẫu nhiên hoặc dummy UUID
                let authorId = null;
                try {
                    const { data: authData } = await client.auth.getUser();
                    if (authData?.user?.id) {
                        const { data: staffMatch } = await client.from('staff').select('id').eq('user_id', authData.user.id).maybeSingle();
                        authorId = staffMatch?.id || authData.user.id;
                    }
                } catch (e) {}

                if (!authorId) {
                    try {
                        const adminUser = JSON.parse(localStorage.getItem('pawpal_admin_user') || sessionStorage.getItem('pawpal_admin_user') || '{}');
                        if (adminUser?.id) authorId = adminUser.id;
                    } catch (e) {}
                }

                if (!authorId) {
                    showToast('Không xác định được danh tính người viết bài. Vui lòng đăng nhập lại.', 'danger');
                    return;
                }

                // CFG-14: Xác thực category_id (bắt buộc chọn danh mục hợp lệ, không tự gán mục bất kỳ)
                if (!categoryId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
                    showToast('Vui lòng chọn danh mục bài viết hợp lệ.', 'warning');
                    return;
                }

                let dbStatus = 'PUBLISHED';
                if (status === 'draft') dbStatus = 'DRAFT';
                else if (status === 'hidden') dbStatus = 'ARCHIVED';

                const { data: insertedRows, error } = await client.from('blog_post').insert([{
                    title: title,
                    slug: slug,
                    summary: summary,
                    content: content || `<p>${summary}</p>`,
                    category_id: categoryId,
                    author_id: authorId,
                    thumbnail_url: '/assets/images/publics/dogcute6.jpg',
                    status: dbStatus,
                    view_count: 0,
                    publish_at: new Date().toISOString()
                }]).select('id, title');

                if (error) throw error;

                // CFG-15: Bài viết mới tạo không tự động đánh dấu đã đồng bộ RAG khi pipeline chưa chạy
                await logSystemAudit('INSERT', 'blog_post', `Tạo bài viết mới: "${title}"`);
                PawpalSettings.closeModal?.('articleModalOverlay');
                await PawpalSettings.loadSettingsModuleData?.();
                populateBlogCategories();
                renderArticles();
                showToast('Đã lưu bài viết thành công!', 'success');
            } catch (e) {
                console.error('[Settings] Lỗi lưu bài viết:', e);
                showToast('Lỗi khi lưu bài viết: ' + (e.message || ''), 'danger');
            }
        });

        // Modal RAG
        const closeRagModalHandler = () => {
            PawpalSettings.closeModal?.('articleRagModalOverlay');
        };
        document.getElementById('btnCancelRagModal')?.addEventListener('click', closeRagModalHandler);
        document.getElementById('btnDismissRagModal')?.addEventListener('click', closeRagModalHandler);

        // Xem tóm tắt RAG
        document.getElementById('btnActionViewRag')?.addEventListener('click', () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (!article) return;

            const titleEl = document.getElementById('ragArticleTitle');
            const catEl = document.getElementById('ragArticleCategory');
            const statusEl = document.getElementById('ragArticleStatus');
            const kwsBox = document.getElementById('ragKeywordsBox');
            const contentBox = document.getElementById('ragContentBox');

            if (titleEl) titleEl.textContent = article.title;
            if (catEl) catEl.textContent = article.category;
            if (statusEl) {
                statusEl.className = article.ragSynced ? 'admin-badge badge-active' : 'admin-badge badge-warning';
                statusEl.textContent = article.ragSynced ? 'Đã nạp RAG' : 'Chưa nạp RAG';
            }

            if (kwsBox) {
                kwsBox.innerHTML = '';
                const kws = article.ragSynced ? (article.ragKeywords || []) : [];
                kws.forEach(kw => {
                    const pill = document.createElement('span');
                    pill.className = 'rag-keyword-pill';
                    pill.textContent = kw;
                    kwsBox.appendChild(pill);
                });
            }

            if (contentBox) {
                contentBox.textContent = article.ragSynced && article.ragSummary
                    ? article.ragSummary
                    : 'Chưa có dữ liệu trích xuất RAG cho bài viết này.';
            }

            closeArticleActionMenu();
            PawpalSettings.openModal?.('articleRagModalOverlay');
        });

        // Nạp và đồng bộ vào Chatbot (CFG-16: Chỉ cho phép nạp bài công khai và thông báo trạng thái hàng đợi trung thực)
        document.getElementById('btnActionSyncRag')?.addEventListener('click', async () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (!article) return;

            if (article.status !== 'published') {
                showToast('Chỉ bài viết ở trạng thái "Công khai" mới có thể lập chỉ mục tri thức AI.', 'warning');
                return;
            }

            article.ragSynced = true;
            const sysConfig = PawpalSettings.state?.systemConfig || {};
            sysConfig.ragSyncedArticleIds = Array.isArray(sysConfig.ragSyncedArticleIds) ? sysConfig.ragSyncedArticleIds : [];
            if (!sysConfig.ragSyncedArticleIds.includes(currentId)) {
                sysConfig.ragSyncedArticleIds.push(currentId);
                await PawpalSettings.persistSystemConfig?.(sysConfig);
            }
            renderArticles();
            closeArticleActionMenu();
            showToast(`Đã gửi yêu cầu lập chỉ mục bài viết "${article.title}" vào hàng đợi tri thức AI của Chatbot!`, 'success');
        });

        document.getElementById('btnSyncRagArticle')?.addEventListener('click', async () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (!article) return;

            if (article.status !== 'published') {
                showToast('Chỉ bài viết ở trạng thái "Công khai" mới có thể lập chỉ mục tri thức AI.', 'warning');
                return;
            }

            article.ragSynced = true;
            const sysConfig = PawpalSettings.state?.systemConfig || {};
            sysConfig.ragSyncedArticleIds = Array.isArray(sysConfig.ragSyncedArticleIds) ? sysConfig.ragSyncedArticleIds : [];
            if (!sysConfig.ragSyncedArticleIds.includes(currentId)) {
                sysConfig.ragSyncedArticleIds.push(currentId);
                await PawpalSettings.persistSystemConfig?.(sysConfig);
            }
            const statusEl = document.getElementById('ragArticleStatus');
            if (statusEl) {
                statusEl.className = 'admin-badge badge-active';
                statusEl.textContent = 'Đã nạp RAG';
            }
            renderArticles();
            showToast(`Đã gửi yêu cầu lập chỉ mục bài viết "${article.title}" vào hàng đợi tri thức AI của Chatbot!`, 'success');
        });

        // Đổi trạng thái bài viết (Công khai / Tạm ẩn) (CFG-17: Gỡ khỏi RAG nếu bài chuyển sang ẩn)
        document.getElementById('btnActionToggleArticleStatus')?.addEventListener('click', async () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (!article) return;

            const newStatus = article.status === 'published' ? 'ARCHIVED' : 'PUBLISHED';
            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Không kết nối được Supabase.');
                const { data: updatedRows, error: updateError } = await client
                    .from('blog_post')
                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                    .eq('id', currentId)
                    .select('id, status');
                if (updateError) throw updateError;
                if (!updatedRows || updatedRows.length === 0) throw new Error('Không tìm thấy bài viết để cập nhật.');

                // CFG-17: Nếu bài viết chuyển sang ẩn, gỡ bài viết khỏi danh sách RAG của Chatbot
                if (newStatus === 'ARCHIVED') {
                    const sysConfig = PawpalSettings.state?.systemConfig || {};
                    if (Array.isArray(sysConfig.ragSyncedArticleIds) && sysConfig.ragSyncedArticleIds.includes(currentId)) {
                        sysConfig.ragSyncedArticleIds = sysConfig.ragSyncedArticleIds.filter(id => id !== currentId);
                        await PawpalSettings.persistSystemConfig?.(sysConfig);
                    }
                }

                await logSystemAudit('UPDATE', 'blog_post', `Chuyển trạng thái bài viết "${article.title}" thành ${newStatus}`);
                closeArticleActionMenu();
                await PawpalSettings.loadSettingsModuleData?.();
                populateBlogCategories();
                renderArticles();
                showToast(`Bài viết "${article.title}" hiện đã chuyển sang trạng thái: ${newStatus === 'PUBLISHED' ? 'Công khai' : 'Tạm ẩn'}.`, 'info');
            } catch (e) {
                console.error('[Settings] Lỗi đổi trạng thái bài viết:', e);
                showToast('Không thể cập nhật bài viết.', 'danger');
            }
        });

        // Xóa bài viết (CFG-17: Gỡ khỏi RAG khi xóa bài viết)
        document.getElementById('btnActionDeleteArticle')?.addEventListener('click', () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            const title = article ? article.title : 'bài viết';

            PawpalSettings.showSettingsConfirmModal?.({
                title: 'Xóa bài viết',
                message: `Bạn có chắc chắn muốn xóa bài viết "${title}" khỏi hệ thống?`,
                confirmText: 'Xóa bài viết',
                isDanger: true,
                onConfirm: async () => {
                    try {
                        const client = getSupabaseClient();
                        if (!client) throw new Error('Không kết nối được Supabase.');
                        const { error } = await client.from('blog_post').delete().eq('id', currentId);
                        if (error) throw error;

                        // CFG-17: Khi bài viết bị xóa, gỡ bài viết khỏi danh sách RAG của Chatbot
                        const sysConfig = PawpalSettings.state?.systemConfig || {};
                        if (Array.isArray(sysConfig.ragSyncedArticleIds) && sysConfig.ragSyncedArticleIds.includes(currentId)) {
                            sysConfig.ragSyncedArticleIds = sysConfig.ragSyncedArticleIds.filter(id => id !== currentId);
                            await PawpalSettings.persistSystemConfig?.(sysConfig);
                        }

                        await logSystemAudit('DELETE', 'blog_post', `Xóa bài viết "${title}"`);
                        closeArticleActionMenu();
                        await PawpalSettings.loadSettingsModuleData?.();
                        populateBlogCategories();
                        renderArticles();
                        showToast(`Đã xóa thành công bài viết "${title}".`, 'success');
                    } catch (e) {
                        console.error('[Settings] Lỗi xóa bài viết:', e);
                        showToast('Không thể xóa bài viết: ' + (e.message || ''), 'danger');
                    }
                }
            });
        });

        // Đóng dropdown khi click ra ngoài
        window.addEventListener('click', (e) => {
            const articleDropdown = document.getElementById('articleActionDropdown');
            if (articleDropdown && !articleDropdown.contains(e.target)) {
                closeArticleActionMenu();
            }
        });

        // Render ban đầu
        renderArticles();
    }

    PawpalSettings.subtabs.content = {
        init: initContentSubtab,
        renderArticles,
        updateArticleKpis,
        populateBlogCategories
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContentSubtab);
    } else {
        initContentSubtab();
    }
})();
