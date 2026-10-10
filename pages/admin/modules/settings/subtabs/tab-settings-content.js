// tab-settings-content.js - Subtab Quản lý Bài viết (Blog & Cẩm nang chăm sóc thú cưng)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    let currentArticlePage = 1;
    const ARTICLE_PAGE_SIZE = 10;

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
        const articlesList = PawpalSettings.state?.articlesList || [];
        const total = articlesList.length;
        const pub = articlesList.filter(a => a.status === 'published').length;
        const draft = articlesList.filter(a => a.status === 'draft').length;
        const hidden = articlesList.filter(a => a.status === 'hidden').length;

        const tEl = document.getElementById('statTotalArticles');
        const pEl = document.getElementById('statPublishedArticles');
        const dEl = document.getElementById('statDraftArticles');
        const hEl = document.getElementById('statHiddenArticles');

        if (tEl) tEl.textContent = total;
        if (pEl) pEl.textContent = pub;
        if (dEl) dEl.textContent = draft;
        if (hEl) hEl.textContent = hidden;
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

    function renderArticles() {
        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;

        const articlesList = PawpalSettings.state?.articlesList || [];
        const keyword = (document.getElementById('searchArticleInput')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('filterArticleCategory')?.value || 'all';
        const statusFilter = document.getElementById('filterArticleStatus')?.value || 'all';

        const filtered = articlesList.filter(a => {
            if (catFilter !== 'all' && a.category !== catFilter) return false;
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (keyword) return a.title.toLowerCase().includes(keyword);
            return true;
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLE_PAGE_SIZE));
        currentArticlePage = Math.min(currentArticlePage, totalPages);
        const pageItems = filtered.slice((currentArticlePage - 1) * ARTICLE_PAGE_SIZE, currentArticlePage * ARTICLE_PAGE_SIZE);
        const pageBar = document.querySelector('#subtab-tab-content-management .admin-pagination-bar');
        if (pageBar) {
            pageBar.querySelector('.article-page-prev')?.classList.toggle('disabled', currentArticlePage === 1);
            pageBar.querySelector('.article-page-next')?.classList.toggle('disabled', currentArticlePage === totalPages);
            const nums = pageBar.querySelector('.article-page-numbers');
            if (nums) nums.innerHTML = Array.from({ length: totalPages }, (_, i) => `<button type="button" class="pagination-btn ${i + 1 === currentArticlePage ? 'active' : ''}" data-article-page="${i + 1}">${i + 1}</button>`).join('');
            nums?.querySelectorAll('[data-article-page]').forEach(btn => btn.addEventListener('click', () => {
                currentArticlePage = Number(btn.dataset.articlePage);
                renderArticles();
            }));
            pageBar.querySelector('.article-page-prev')?.addEventListener('click', () => {
                if (currentArticlePage > 1) {
                    currentArticlePage--;
                    renderArticles();
                }
            });
            pageBar.querySelector('.article-page-next')?.addEventListener('click', () => {
                if (currentArticlePage < totalPages) {
                    currentArticlePage++;
                    renderArticles();
                }
            });
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

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="article-thumb-img">Ảnh bìa</div></td>
                <td><strong style="color: var(--text-main); font-size: 13.5px;">${a.title}</strong></td>
                <td>${a.author}</td>
                <td><span class="admin-badge badge-neutral">${a.category}</span></td>
                <td>${a.views.toLocaleString('vi-VN')}</td>
                <td>${ragBadge}</td>
                <td>${statusBadge}</td>
                <td>${a.updatedAt}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger btn-article-more" data-id="${a.id}" title="Tác vụ bài viết">•••</button>
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

    function initContentSubtab() {
        // Lọc Bài viết
        document.getElementById('searchArticleInput')?.addEventListener('input', renderArticles);
        document.getElementById('filterArticleCategory')?.addEventListener('change', () => { currentArticlePage = 1; renderArticles(); });
        document.getElementById('filterArticleStatus')?.addEventListener('change', () => { currentArticlePage = 1; renderArticles(); });

        // Modal Tạo Bài Viết Mới
        const articleModal = document.getElementById('articleModalOverlay');
        document.getElementById('btnOpenCreateArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'flex';
        });
        document.getElementById('btnCancelArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'none';
        });
        document.getElementById('btnDismissArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'none';
        });

        document.getElementById('btnSaveArticle')?.addEventListener('click', async () => {
            const title = document.getElementById('inputArticleTitle')?.value.trim();
            const summary = document.getElementById('inputArticleSummary')?.value.trim() || '';
            const content = document.getElementById('inputArticleContent')?.value.trim() || '';
            const category = document.getElementById('inputArticleCategory')?.value || 'Mẹo chăm sóc';
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

            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Không kết nối được Supabase.');
                let categoryId = null;
                const { data: categoryRow } = await client.from('blog_category').select('id').eq('category_name', category).maybeSingle();
                categoryId = categoryRow?.id || null;
                const { error } = await client.from('blog_post').insert([{
                    title: title,
                    slug: slug,
                    summary: summary,
                    content: content || `<p>${summary}</p>`,
                    category_id: categoryId,
                    thumbnail_url: '/assets/images/publics/dogcute6.jpg',
                    status: status.toUpperCase(),
                    view_count: 0,
                    publish_at: new Date().toISOString()
                }]);
                if (error) throw error;
                await logSystemAudit('INSERT', 'blog_post', `Tạo bài viết mới: "${title}"`);
                if (articleModal) articleModal.style.display = 'none';
                await PawpalSettings.loadSettingsModuleData?.();
                renderArticles();
                showToast('Đã lưu bài viết và đồng bộ dữ liệu sang tri thức RAG của Chatbot!', 'success');
            } catch (e) {
                console.error('[Settings] Lỗi lưu bài viết:', e);
                showToast('Lỗi khi lưu bài viết: ' + (e.message || ''), 'danger');
            }
        });

        // Modal RAG
        const ragModal = document.getElementById('articleRagModalOverlay');
        const closeRagModalHandler = () => {
            if (ragModal) ragModal.style.display = 'none';
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
            if (ragModal) ragModal.style.display = 'flex';
        });

        // Nạp và đồng bộ vào Chatbot
        document.getElementById('btnActionSyncRag')?.addEventListener('click', () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (article) {
                article.ragSynced = true;
                renderArticles();
                closeArticleActionMenu();
                showToast(`Đã nạp thành công bài viết "${article.title}" vào cơ sở tri thức RAG của Chatbot PawPal!`, 'success');
            }
        });

        document.getElementById('btnSyncRagArticle')?.addEventListener('click', () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (article) {
                article.ragSynced = true;
                const statusEl = document.getElementById('ragArticleStatus');
                if (statusEl) {
                    statusEl.className = 'admin-badge badge-active';
                    statusEl.textContent = 'Đã nạp RAG';
                }
                renderArticles();
                showToast(`Đã nạp và đồng bộ bài viết "${article.title}" vào Chatbot thành công!`, 'success');
            }
        });

        // Đổi trạng thái bài viết (Công khai / Tạm ẩn)
        document.getElementById('btnActionToggleArticleStatus')?.addEventListener('click', async () => {
            const currentId = PawpalSettings.state?.currentActiveArticleId;
            if (!currentId) return;
            const articlesList = PawpalSettings.state?.articlesList || [];
            const article = articlesList.find(a => a.id === currentId);
            if (!article) return;

            const newStatus = article.status === 'published' ? 'HIDDEN' : 'PUBLISHED';
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
                await logSystemAudit('UPDATE', 'blog_post', `Chuyển trạng thái bài viết "${article.title}" thành ${newStatus}`);
                closeArticleActionMenu();
                await PawpalSettings.loadSettingsModuleData?.();
                renderArticles();
                showToast(`Bài viết "${article.title}" hiện đã chuyển sang trạng thái: ${newStatus === 'PUBLISHED' ? 'Công khai' : 'Tạm ẩn'}.`, 'info');
            } catch (e) {
                console.error('[Settings] Lỗi đổi trạng thái bài viết:', e);
                showToast('Không thể cập nhật bài viết.', 'danger');
            }
        });

        // Xóa bài viết
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
                        if (client) {
                            await client.from('blog_post').delete().eq('id', currentId);
                        }
                        await logSystemAudit('DELETE', 'blog_post', `Xóa bài viết "${title}"`);
                        closeArticleActionMenu();
                        await PawpalSettings.loadSettingsModuleData?.();
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
        updateArticleKpis
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContentSubtab);
    } else {
        initContentSubtab();
    }
})();
