// tab-settings-banners.js - Subtab Banner và Khuyến mãi (Banner, Voucher, PawPoints, Thông báo Website)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    let bannerPage = 1;
    const SETTINGS_PAGE_SIZE = 10;
    let editingBannerId = null;

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

    function isBannerExpiring(banner) {
        if (!banner || banner.status !== 'active' || !banner.endDateRaw) return false;
        const now = new Date();
        const end = new Date(`${banner.endDateRaw}T23:59:59`);
        if (Number.isNaN(end.getTime())) return false;
        const diffHours = (end - now) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
    }

    function isVoucherZeroMiss(voucher) {
        if (!voucher) return false;
        if (voucher.used >= voucher.limit) return true;
        if (voucher.status === 'active' && (voucher.limit - voucher.used <= 10)) return true;
        return false;
    }

    function renderZeroMissAlerts() {
        const bannersList = PawpalSettings.state?.bannersList || [];
        const vouchersList = PawpalSettings.state?.vouchersList || [];

        const expiringBanners = bannersList.filter(isBannerExpiring);
        const exhaustedVouchers = vouchersList.filter(v => v.used >= v.limit);
        const lowStockVouchers = vouchersList.filter(v => v.status === 'active' && v.limit - v.used <= 10 && v.used < v.limit);

        const strip = document.getElementById('zeroMissAlertStrip');
        const tagContainer = document.getElementById('zeroMissAlertTags');
        const totalCountEl = document.getElementById('zeroMissTotalCount');

        const totalIssues = expiringBanners.length + exhaustedVouchers.length + lowStockVouchers.length;
        if (totalCountEl) totalCountEl.textContent = totalIssues;

        if (totalIssues === 0) {
            if (strip) strip.style.display = 'none';
            return;
        }

        if (strip) strip.style.display = 'flex';
        if (!tagContainer) return;

        tagContainer.innerHTML = '';

        expiringBanners.forEach(b => {
            const tag = document.createElement('span');
            tag.className = 'alert-item-tag';
            tag.innerHTML = `<strong>Banner:</strong> ${b.title} (Hết hạn trong 24h)`;
            tagContainer.appendChild(tag);
        });

        exhaustedVouchers.forEach(v => {
            const tag = document.createElement('span');
            tag.className = 'alert-item-tag';
            tag.innerHTML = `<strong>Voucher:</strong> ${v.code} (Hết sạch lượt ${v.used}/${v.limit})`;
            tagContainer.appendChild(tag);
        });

        lowStockVouchers.forEach(v => {
            const tag = document.createElement('span');
            tag.className = 'alert-item-tag';
            tag.innerHTML = `<strong>Voucher:</strong> ${v.code} (Sắp hết: còn ${v.limit - v.used} lượt)`;
            tagContainer.appendChild(tag);
        });
    }

    function renderSettingsPager(containerId, page, totalPages, onChange) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (totalPages < 1) { el.innerHTML = ''; return; }
        el.innerHTML = `<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-p="prev">&lt;</button>${Array.from({length: totalPages}, (_, i) => `<button class="pagination-btn ${i + 1 === page ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('')}<button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} data-p="next">&gt;</button>`;
        el.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => {
            const p = btn.dataset.p;
            onChange(p === 'prev' ? page - 1 : p === 'next' ? page + 1 : Number(p));
        }));
    }

    function renderBanners() {
        const container = document.getElementById('bannerCardsContainer');
        if (!container) return;

        const bannersList = PawpalSettings.state?.bannersList || [];
        container.innerHTML = '';
        const totalPages = Math.max(1, Math.ceil(bannersList.length / SETTINGS_PAGE_SIZE));
        bannerPage = Math.min(bannerPage, totalPages);
        const pageItems = bannersList.slice((bannerPage - 1) * SETTINGS_PAGE_SIZE, bannerPage * SETTINGS_PAGE_SIZE);

        pageItems.forEach(b => {
            const isExpiring = isBannerExpiring(b);
            const card = document.createElement('div');
            card.className = 'banner-item-card';

            const alertTagHtml = isExpiring
                ? `<div style="margin-top: 4px;"><span class="banner-alert-tag">Hết hạn trong 24h</span></div>`
                : '';

            const extendBtnHtml = b.status === 'active'
                ? `<button type="button" class="banner-action-btn btn-extend-banner" data-id="${b.id}">Gia hạn 30 ngày</button>`
                : '';

            card.innerHTML = `
                <div class="banner-preview-img">${b.imageText}</div>
                <div class="banner-card-info">
                    <span class="banner-card-title">${b.title}</span>
                    <span class="banner-card-meta">CTA: <strong>${b.cta}</strong> | Link: ${b.url}</span>
                    <span class="banner-card-meta">Hiệu lực: ${b.startDate} đến ${b.endDate}</span>
                    ${alertTagHtml}
                </div>
                <div class="banner-card-actions">
                    <span class="admin-badge ${b.status === 'active' ? 'badge-active' : 'badge-neutral'}">${b.status === 'active' ? 'Đang bật' : 'Tạm tắt'}</span>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="banner-action-btn btn-edit-banner" data-id="${b.id}">Sửa</button>
                        <button type="button" class="banner-action-btn btn-delete-banner" data-id="${b.id}">Xóa</button>
                        ${extendBtnHtml}
                        <button type="button" class="banner-action-btn btn-toggle-banner ${b.status === 'active' ? 'is-pause' : 'is-enable'}" data-id="${b.id}">${b.status === 'active' ? 'Tắt' : 'Bật'}</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        renderSettingsPager('bannerPaginationControls', bannerPage, totalPages, p => {
            bannerPage = p;
            renderBanners();
        });

        // Bật/tắt banner
        container.querySelectorAll('.btn-toggle-banner').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const banner = bannersList.find(i => i.id === id);
                if (!banner) return;

                const newStatusStr = banner.status === 'active' ? 'tam_an' : 'dang_hien_thi';
                try {
                    const client = getSupabaseClient();
                    if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                    const { data: updated, error } = await client.from('banner').update({ status: newStatusStr, updated_at: new Date().toISOString() }).eq('id', id).select('id');
                    if (error) throw error;
                    if (!updated || !updated.length) throw new Error('Không tìm thấy Banner để cập nhật.');
                    await logSystemAudit('UPDATE', 'banner', `Đổi trạng thái banner "${banner.title}" thành ${newStatusStr}`);
                    await PawpalSettings.loadSettingsModuleData?.();
                    renderBanners();
                    renderZeroMissAlerts();
                    showToast(`Banner "${banner.title}" hiện đã ${newStatusStr === 'dang_hien_thi' ? 'BẬT' : 'TẮT'}.`, 'info');
                } catch (e) {
                    console.error('[Settings] Lỗi cập nhật banner:', e);
                    showToast('Không thể cập nhật trạng thái Banner.', 'danger');
                }
            });
        });

        // Sửa banner
        container.querySelectorAll('.btn-edit-banner').forEach(btn => btn.addEventListener('click', () => {
            const banner = bannersList.find(i => String(i.id) === String(btn.dataset.id));
            if (banner) openBannerModal(banner);
        }));

        // Xóa banner
        container.querySelectorAll('.btn-delete-banner').forEach(btn => btn.addEventListener('click', async () => {
            const banner = bannersList.find(i => String(i.id) === String(btn.dataset.id));
            if (!banner) return;
            PawpalSettings.showSettingsConfirmModal?.({
                title: 'Xóa Banner',
                message: `Bạn có chắc chắn muốn xóa Banner "${banner.title}" khỏi hệ thống?`,
                confirmText: 'Xóa Banner',
                isDanger: true,
                onConfirm: async () => {
                    try {
                        const client = getSupabaseClient();
                        if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                        const { data, error } = await client.from('banner').delete().eq('id', banner.id).select('id');
                        if (error) throw error;
                        if (!data?.length) throw new Error('Không tìm thấy Banner để xóa.');
                        await logSystemAudit('DELETE', 'banner', `Xóa Banner: "${banner.title}"`);
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderBanners();
                        renderZeroMissAlerts();
                        showToast('Đã xóa Banner thành công.', 'success');
                    } catch (e) {
                        console.error('[Settings] Lỗi xóa banner:', e);
                        showToast('Không thể xóa Banner: ' + (e.message || ''), 'danger');
                    }
                }
            });
        }));

        // Gia hạn banner 30 ngày
        container.querySelectorAll('.btn-extend-banner').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const banner = bannersList.find(i => i.id === id);
                if (!banner) return;

                const currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);
                const originalEndDate = new Date(`${banner.endDateRaw || ''}T00:00:00`);
                const baseDate = Number.isNaN(originalEndDate.getTime()) || originalEndDate < currentDate
                    ? new Date(currentDate)
                    : new Date(originalEndDate);
                baseDate.setDate(baseDate.getDate() + 30);
                const newEndDate = baseDate.toISOString().slice(0, 10);
                if (!Number.isNaN(originalEndDate.getTime()) && newEndDate <= banner.endDateRaw) {
                    showToast('Ngày gia hạn phải lớn hơn hạn hiện tại.', 'warning');
                    return;
                }
                try {
                    const client = getSupabaseClient();
                    if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                    const { data: updated, error } = await client.from('banner').update({ end_date: newEndDate, status: 'dang_hien_thi', updated_at: new Date().toISOString() }).eq('id', id).select('id');
                    if (error) throw error;
                    if (!updated || !updated.length) throw new Error('Không tìm thấy Banner để gia hạn.');
                    await logSystemAudit('UPDATE', 'banner', `Gia hạn banner "${banner.title}" đến ngày ${newEndDate}`);
                    await PawpalSettings.loadSettingsModuleData?.();
                    renderBanners();
                    renderZeroMissAlerts();
                    showToast(`Đã gia hạn Banner "${banner.title}" thêm 30 ngày thành công! Hiệu lực mới đến ngày ${newEndDate}.`, 'success');
                } catch (e) {
                    console.error('[Settings] Lỗi gia hạn banner:', e);
                    showToast('Không thể gia hạn Banner.', 'danger');
                }
            });
        });
    }

    function renderVouchers() {
        const tbody = document.getElementById('vouchersTableBody');
        if (!tbody) return;

        const vouchersList = PawpalSettings.state?.vouchersList || [];
        const keyword = (document.getElementById('searchVoucherInput')?.value || '').toLowerCase().trim();
        const targetFilter = document.getElementById('filterVoucherTarget')?.value || 'all';
        const statusFilter = document.getElementById('filterVoucherStatus')?.value || 'all';

        const filtered = vouchersList.filter(v => {
            if (targetFilter !== 'all' && v.target !== targetFilter) return false;
            
            if (statusFilter === 'zero-miss') {
                if (!isVoucherZeroMiss(v)) return false;
            } else if (statusFilter !== 'all' && v.status !== statusFilter) {
                return false;
            }

            if (keyword) {
                return v.code.toLowerCase().includes(keyword) || v.name.toLowerCase().includes(keyword);
            }
            return true;
        });

        const voucherPageSize = 10;
        const totalVoucherPages = Math.max(1, Math.ceil(filtered.length / voucherPageSize));
        const requestedPage = Number(window._settingsVoucherPage) || 1;
        window._settingsVoucherPage = Math.max(1, Math.min(requestedPage, totalVoucherPages));
        const voucherPage = window._settingsVoucherPage;
        const pageItems = filtered.slice((voucherPage - 1) * voucherPageSize, voucherPage * voucherPageSize);

        const pageBar = document.querySelector('#subtab-tab-banner-promos .admin-pagination-bar');
        if (pageBar) {
            const prevBtn = pageBar.querySelector('.voucher-page-prev');
            const nextBtn = pageBar.querySelector('.voucher-page-next');
            prevBtn?.classList.toggle('disabled', voucherPage <= 1);
            nextBtn?.classList.toggle('disabled', voucherPage >= totalVoucherPages);
            const nums = pageBar.querySelector('.voucher-page-numbers');
            if (nums) nums.innerHTML = Array.from({ length: totalVoucherPages }, (_, i) => `<button type="button" class="pagination-btn ${i + 1 === voucherPage ? 'active' : ''}" data-voucher-page="${i + 1}">${i + 1}</button>`).join('');
            nums?.querySelectorAll('[data-voucher-page]').forEach(btn => btn.addEventListener('click', () => {
                window._settingsVoucherPage = Number(btn.dataset.voucherPage);
                renderVouchers();
            }));
            prevBtn?.addEventListener('click', () => {
                if (window._settingsVoucherPage > 1) {
                    window._settingsVoucherPage -= 1;
                    renderVouchers();
                }
            });
            nextBtn?.addEventListener('click', () => {
                if (window._settingsVoucherPage < totalVoucherPages) {
                    window._settingsVoucherPage += 1;
                    renderVouchers();
                }
            });
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy voucher phù hợp.</td></tr>`;
            return;
        }

        pageItems.forEach(v => {
            let statusBadge = '';
            if (v.status === 'active') statusBadge = '<span class="admin-badge badge-active">Hoạt động</span>';
            else if (v.status === 'paused') statusBadge = '<span class="admin-badge badge-warning">Tạm dừng</span>';
            else statusBadge = '<span class="admin-badge badge-neutral">Hết hạn</span>';

            const discountDisp = v.type === 'percent' ? `${v.value}%` : `${v.value.toLocaleString('vi-VN')} VNĐ`;

            let rowAlertClass = '';
            let quotaDisplay = `${v.used}/${v.limit}`;

            if (v.used >= v.limit) {
                rowAlertClass = 'row-alert-danger';
                quotaDisplay = `<strong>${v.used}/${v.limit}</strong><span style="display:block; font-size:11.5px; color:#DC2626; font-weight:600;">Hết sạch lượt</span>`;
            } else if (v.status === 'active' && (v.limit - v.used <= 10)) {
                rowAlertClass = 'row-alert-warning';
                quotaDisplay = `<strong>${v.used}/${v.limit}</strong><span style="display:block; font-size:11.5px; color:#D97706; font-weight:600;">Còn ${v.limit - v.used} lượt</span>`;
            }

            const tr = document.createElement('tr');
            if (rowAlertClass) tr.className = rowAlertClass;

            tr.innerHTML = `
                <td><strong style="color: #236B48;">${v.code}</strong></td>
                <td>${v.name}</td>
                <td>${v.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}</td>
                <td><span class="admin-badge badge-neutral">${v.target}</span></td>
                <td><strong>${discountDisp}</strong></td>
                <td>${v.minOrder > 0 ? v.minOrder.toLocaleString('vi-VN') + ' đ' : 'Không'}</td>
                <td>${quotaDisplay}</td>
                <td>${v.validDate}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-dots-action btn-voucher-dots" data-code="${v.code}" title="Tác vụ">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Gắn sự kiện nút 3 chấm mở Dropdown
        tbody.querySelectorAll('.btn-voucher-dots').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                openVoucherActionMenu(code, btn);
            });
        });
    }

    function openVoucherActionMenu(code, triggerBtn) {
        PawpalSettings.state.currentActiveVoucherCode = code;
        const dropdown = document.getElementById('voucherActionDropdown');
        if (!dropdown) return;

        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.left = `${rect.right + window.scrollX - 160}px`;
        dropdown.style.display = 'block';
    }

    function closeVoucherActionMenu() {
        const dropdown = document.getElementById('voucherActionDropdown');
        if (dropdown) dropdown.style.display = 'none';
        PawpalSettings.state.currentActiveVoucherCode = null;
    }

    function renderNotifications() {
        const container = document.getElementById('notificationListContainer');
        if (!container) return;

        const notificationsList = PawpalSettings.state?.notificationsList || [];
        container.innerHTML = '';
        if (notificationsList.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: var(--text-muted); text-align: center;">Chưa có thông báo nào được thiết lập.</div>';
            return;
        }

        notificationsList.forEach(n => {
            const item = document.createElement('div');
            item.className = 'notice-record-item';

            const typeBadge = n.type === 'POPUP'
                ? '<span class="admin-badge badge-neutral">Popup giữa màn hình</span>'
                : '<span class="admin-badge badge-neutral">Thanh thông báo Top-bar</span>';

            const statusBadge = n.isActive
                ? '<span class="admin-badge badge-active">Đang bật</span>'
                : '<span class="admin-badge badge-neutral">Tạm tắt</span>';

            item.innerHTML = `
                <div class="notice-meta-line">
                    ${typeBadge}
                    <span class="notice-date">${n.date}</span>
                </div>
                <div class="notice-body-text">${n.content}</div>
                <div class="notice-status-row">
                    ${statusBadge}
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-notice-action btn-toggle-notice" data-id="${n.id}">${n.isActive ? 'Tắt' : 'Bật'}</button>
                        <button type="button" class="btn-notice-action btn-delete-notice" data-id="${n.id}">Xóa</button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });

        // Bật/tắt thông báo
        container.querySelectorAll('.btn-toggle-notice').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const notice = notificationsList.find(i => i.id === id);
                if (!notice) return;

                const newActive = !notice.isActive;
                try {
                    const client = getSupabaseClient();
                    if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                    const { error } = await client.from('notification').update({ is_read: !newActive }).eq('id', id);
                    if (error) throw error;
                    await logSystemAudit('UPDATE', 'notification', `Đổi trạng thái thông báo ${id} thành ${newActive ? 'Bật' : 'Tắt'}`);
                    await PawpalSettings.loadSettingsModuleData?.();
                    renderNotifications();
                    showToast(`Đã ${newActive ? 'BẬT' : 'TẮT'} thông báo website!`, 'info');
                } catch (e) {
                    console.error('[Settings] Lỗi cập nhật thông báo:', e);
                    showToast('Không thể cập nhật thông báo: ' + (e.message || ''), 'danger');
                }
            });
        });

        // Xóa thông báo
        container.querySelectorAll('.btn-delete-notice').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                PawpalSettings.showSettingsConfirmModal?.({
                    title: 'Xóa Thông báo Website',
                    message: 'Bạn có chắc chắn muốn xóa thông báo này?',
                    confirmText: 'Xóa',
                    isDanger: true,
                    onConfirm: async () => {
                        try {
                            const client = getSupabaseClient();
                            if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                            const { error } = await client.from('notification').delete().eq('id', id);
                            if (error) throw error;
                            await logSystemAudit('DELETE', 'notification', `Xóa thông báo website id: ${id}`);
                            await PawpalSettings.loadSettingsModuleData?.();
                            renderNotifications();
                            showToast('Đã xóa thông báo website thành công!', 'success');
                        } catch (e) {
                            console.error('[Settings] Lỗi xóa thông báo:', e);
                            showToast('Không thể xóa thông báo: ' + (e.message || ''), 'danger');
                        }
                    }
                });
            });
        });
    }

    // Modal Banner (Thêm / Sửa)
    function openBannerModal(banner) {
        const bannerModal = document.getElementById('bannerModalOverlay');
        editingBannerId = banner?.id || null;
        const titleEl = document.getElementById('bannerModalTitle');
        const saveBtn = document.getElementById('btnSaveBanner');

        if (titleEl) titleEl.textContent = editingBannerId ? 'Sửa Banner' : 'Thêm Banner Quảng cáo';
        if (saveBtn) saveBtn.textContent = editingBannerId ? 'Lưu thay đổi' : 'Lưu Banner';

        const values = {
            inputBannerTitle: banner?.title || '',
            inputBannerImage: banner?.imageUrl || '',
            inputBannerCta: banner?.cta || '',
            inputBannerUrl: banner?.url || '',
            inputBannerStartDate: banner?.startDate || '',
            inputBannerEndDate: banner?.endDateRaw || banner?.endDate || ''
        };
        Object.entries(values).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });

        if (bannerModal) bannerModal.style.display = 'flex';
    }

    function resetBannerModal() {
        editingBannerId = null;
        const titleEl = document.getElementById('bannerModalTitle');
        const saveBtn = document.getElementById('btnSaveBanner');
        if (titleEl) titleEl.textContent = 'Thêm Banner Quảng cáo';
        if (saveBtn) saveBtn.textContent = 'Lưu Banner';
        ['inputBannerTitle','inputBannerImage','inputBannerCta','inputBannerUrl','inputBannerStartDate','inputBannerEndDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    function updateVoucherLivePreview() {
        const code = document.getElementById('inputVoucherCode')?.value.trim().toUpperCase() || 'PAWPAL30K';
        const name = document.getElementById('inputVoucherName')?.value.trim() || 'Tên chương trình ưu đãi';
        const type = document.getElementById('inputVoucherType')?.value || 'fixed';
        const val = parseFloat(document.getElementById('inputVoucherValue')?.value) || 0;
        const minOrder = parseFloat(document.getElementById('inputVoucherMinOrder')?.value) || 0;
        const target = document.getElementById('inputVoucherTarget')?.value || 'System';

        const prevCodeEl = document.getElementById('prevCode');
        const prevNameEl = document.getElementById('prevName');
        const prevDiscountEl = document.getElementById('prevDiscount');
        const prevTargetEl = document.getElementById('prevTarget');
        const prevCondEl = document.getElementById('prevCondition');

        if (prevCodeEl) prevCodeEl.textContent = code;
        if (prevNameEl) prevNameEl.textContent = name;
        if (prevDiscountEl) {
            if (type === 'percent') {
                prevDiscountEl.textContent = val > 0 ? `Giảm ${val}%` : 'Giảm 0%';
            } else {
                prevDiscountEl.textContent = val > 0 ? `Giảm ${val.toLocaleString('vi-VN')} VNĐ` : 'Giảm 0 VNĐ';
            }
        }
        if (prevTargetEl) {
            const targetMap = {
                'System': 'Toàn hệ thống',
                'Spa': 'Dịch vụ Spa',
                'Hotel': 'Pet Hotel',
                'Shop': 'Sản phẩm'
            };
            prevTargetEl.textContent = targetMap[target] || target;
        }
        if (prevCondEl) {
            prevCondEl.textContent = `Đơn tối thiểu: ${minOrder.toLocaleString('vi-VN')} VNĐ`;
        }
    }

    function initBannersSubtab() {
        // Chuyển Tab con trong Sub-tab 1
        document.querySelectorAll('.settings-subtabs-bar .settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-settingstab');
                if (!targetTabId) return;

                document.querySelectorAll('.settings-subtabs-bar .settings-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('#subtab-tab-banner-promos .settings-tab-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = document.getElementById(targetTabId);
                if (targetPanel) targetPanel.classList.add('active');

                if (targetTabId === 'mkt-vouchers') renderVouchers();
                else if (targetTabId === 'mkt-banners') renderBanners();
                else if (targetTabId === 'mkt-notices') renderNotifications();
            });
        });

        // Lọc Voucher
        document.getElementById('searchVoucherInput')?.addEventListener('input', () => { window._settingsVoucherPage = 1; renderVouchers(); });
        document.getElementById('filterVoucherTarget')?.addEventListener('change', () => { window._settingsVoucherPage = 1; renderVouchers(); });
        document.getElementById('filterVoucherStatus')?.addEventListener('change', () => { window._settingsVoucherPage = 1; renderVouchers(); });

        // Nút lọc nhanh Zero-miss
        document.getElementById('btnFilterZeroMiss')?.addEventListener('click', () => {
            const statusFilter = document.getElementById('filterVoucherStatus');
            if (statusFilter) {
                if (statusFilter.value === 'zero-miss') {
                    statusFilter.value = 'all';
                } else {
                    statusFilter.value = 'zero-miss';
                }
                renderVouchers();
                const tableCard = document.querySelector('.settings-master-card');
                if (tableCard) {
                    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Modal Banner events
        const bannerModal = document.getElementById('bannerModalOverlay');
        document.getElementById('btnOpenBannerModal')?.addEventListener('click', () => { resetBannerModal(); openBannerModal(); });
        document.getElementById('btnCancelBannerModal')?.addEventListener('click', () => { if (bannerModal) bannerModal.style.display = 'none'; });
        document.getElementById('btnDismissBannerModal')?.addEventListener('click', () => { if (bannerModal) bannerModal.style.display = 'none'; });
        document.getElementById('btnSaveBanner')?.addEventListener('click', async () => {
            const title = document.getElementById('inputBannerTitle')?.value.trim();
            const imageUrl = document.getElementById('inputBannerImage')?.value.trim();
            const cta = document.getElementById('inputBannerCta')?.value.trim() || 'Xem ngay';
            const url = document.getElementById('inputBannerUrl')?.value.trim() || '/pages/public/';
            const startDate = document.getElementById('inputBannerStartDate')?.value;
            const endDate = document.getElementById('inputBannerEndDate')?.value;
            if (!title || !imageUrl || !startDate || !endDate) { showToast('Vui lòng nhập đủ tiêu đề, ảnh và thời gian Banner.', 'warning'); return; }
            const isValidImageUrl = /^(https?:\/\/|\/)[^\s]+$/i.test(imageUrl);
            if (!isValidImageUrl) { showToast('URL ảnh Banner không hợp lệ. Hãy dùng đường dẫn bắt đầu bằng http://, https:// hoặc /.', 'warning'); return; }
            if (endDate < startDate) { showToast('Ngày kết thúc phải sau ngày bắt đầu.', 'warning'); return; }
            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                const bannersList = PawpalSettings.state?.bannersList || [];
                const payload = { title, image_url: imageUrl, link: url, button_text: cta, start_date: startDate, end_date: endDate, updated_at: new Date().toISOString() };
                const wasEditing = Boolean(editingBannerId);
                if (wasEditing) {
                    const { data, error } = await client.from('banner').update(payload).eq('id', editingBannerId).select('id');
                    if (error) throw error;
                    if (!data?.length) throw new Error('Không tìm thấy Banner để cập nhật.');
                    await logSystemAudit('UPDATE', 'banner', `Cập nhật Banner: "${title}"`);
                } else {
                    const { error } = await client.from('banner').insert([{ ...payload, display_order: bannersList.length + 1, status: 'dang_hien_thi' }]);
                    if (error) throw error;
                    await logSystemAudit('INSERT', 'banner', `Thêm Banner mới: "${title}"`);
                }
                if (bannerModal) bannerModal.style.display = 'none';
                await PawpalSettings.loadSettingsModuleData?.();
                renderBanners();
                renderZeroMissAlerts();
                showToast(wasEditing ? 'Đã cập nhật Banner thành công.' : 'Đã thêm Banner mới thành công.', 'success');
                editingBannerId = null;
            } catch (e) {
                console.error('[Settings] Lỗi lưu banner:', e);
                showToast('Không thể lưu Banner: ' + (e.message || ''), 'danger');
            }
        });

        // Modal Voucher events
        const voucherModal = document.getElementById('voucherModalOverlay');
        const openVoucherHandler = () => {
            if (voucherModal) {
                voucherModal.style.display = 'flex';
                updateVoucherLivePreview();
            }
        };
        document.getElementById('btnOpenVoucherModal')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnOpenVoucherModalHeader')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnCancelVoucherModal')?.addEventListener('click', () => { if (voucherModal) voucherModal.style.display = 'none'; });
        document.getElementById('btnDismissVoucherModal')?.addEventListener('click', () => { if (voucherModal) voucherModal.style.display = 'none'; });

        // Tự động sinh mã voucher
        document.getElementById('btnAutoGenerateVoucherCode')?.addEventListener('click', () => {
            const target = document.getElementById('inputVoucherTarget')?.value || 'System';
            const prefixMap = { 'System': 'PAW', 'Spa': 'SPA', 'Hotel': 'HOTEL', 'Shop': 'SHOP' };
            const prefix = prefixMap[target] || 'PAW';
            const randNum = Math.floor(100 + Math.random() * 900);
            const year = '2026';
            const generatedCode = `${prefix}-${year}-${randNum}`;
            const codeInput = document.getElementById('inputVoucherCode');
            if (codeInput) {
                codeInput.value = generatedCode;
                updateVoucherLivePreview();
            }
        });

        ['inputVoucherCode', 'inputVoucherName', 'inputVoucherType', 'inputVoucherValue', 'inputVoucherMinOrder', 'inputVoucherTarget'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateVoucherLivePreview);
                el.addEventListener('change', updateVoucherLivePreview);
            }
        });

        document.getElementById('btnSaveVoucher')?.addEventListener('click', async () => {
            const code = document.getElementById('inputVoucherCode')?.value.trim().toUpperCase();
            const name = document.getElementById('inputVoucherName')?.value.trim();
            const val = parseFloat(document.getElementById('inputVoucherValue')?.value) || 0;
            const type = document.getElementById('inputVoucherType')?.value || 'fixed';
            const target = document.getElementById('inputVoucherTarget')?.value || 'System';
            const minOrder = parseFloat(document.getElementById('inputVoucherMinOrder')?.value) || 0;
            const limit = parseInt(document.getElementById('inputVoucherLimit')?.value, 10) || 100;
            const startDate = document.getElementById('inputVoucherStart')?.value || '';
            const endDate = document.getElementById('inputVoucherEnd')?.value || '';

            if (!code || !name || val <= 0) {
                showToast('Vui lòng nhập đầy đủ mã, tên và giá trị giảm của Voucher!', 'warning');
                return;
            }
            if (!startDate || !endDate) {
                showToast('Vui lòng nhập ngày bắt đầu và ngày kết thúc của Voucher.', 'warning');
                return;
            }
            const startObj = new Date(`${startDate}T00:00:00`);
            const endObj = new Date(`${endDate}T23:59:59`);
            if (Number.isNaN(startObj.getTime()) || Number.isNaN(endObj.getTime()) || endDate < startDate) {
                showToast('Khoảng thời gian Voucher không hợp lệ.', 'warning');
                return;
            }

            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                const appFor = target.toLowerCase() === 'system' ? ['all'] : [target.toLowerCase()];
                const { error } = await client.from('voucher').insert([{
                    voucher_code: code,
                    voucher_name: name,
                    description: `Voucher ${name} - Giảm ${type === 'percent' ? val + '%' : val.toLocaleString('vi-VN') + 'đ'}`,
                    discount_value: val,
                    type: type === 'percent' ? 'percentage' : 'fixed',
                    minimum_order_amount: minOrder,
                    max_usage: limit,
                    usage_count: 0,
                    required_points: 0,
                    is_active: true,
                    applicable_for: appFor,
                    start_date: `${startDate}T00:00:00+00:00`,
                    end_date: `${endDate}T23:59:59+00:00`
                }]);
                if (error) throw error;
                await logSystemAudit('INSERT', 'voucher', `Phát hành Voucher mới: ${code} (${name})`);
                if (voucherModal) voucherModal.style.display = 'none';
                await PawpalSettings.loadSettingsModuleData?.();
                renderVouchers();
                renderZeroMissAlerts();
                showToast(`Đã tạo thành công Voucher ${code} và đồng bộ sang phân hệ Bán hàng!`, 'success');
            } catch (e) {
                console.error('[Settings] Lỗi tạo voucher:', e);
                showToast('Lỗi khi tạo Voucher: ' + (e.message || ''), 'danger');
            }
        });

        // Voucher Action Menu events
        document.getElementById('btnActionExtendQuota')?.addEventListener('click', async () => {
            const currentCode = PawpalSettings.state?.currentActiveVoucherCode;
            if (!currentCode) return;
            const vouchersList = PawpalSettings.state?.vouchersList || [];
            const voucher = vouchersList.find(v => v.code === currentCode);
            if (!voucher) return;

            const newLimit = voucher.limit + 50;
            try {
                const client = getSupabaseClient();
                if (client) {
                    await client.from('voucher').update({
                        max_usage: newLimit,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    }).eq('voucher_code', currentCode);
                }
                await logSystemAudit('UPDATE', 'voucher', `Gia hạn quota Voucher ${currentCode} thêm 50 lượt (Tổng: ${newLimit})`);
                closeVoucherActionMenu();
                await PawpalSettings.loadSettingsModuleData?.();
                renderVouchers();
                renderZeroMissAlerts();
                showToast(`Đã gia hạn thêm 50 lượt phát hành cho Voucher ${voucher.code} thành công! Hạn mức mới: ${voucher.used}/${newLimit} lượt.`, 'success');
            } catch (e) {
                console.error('[Settings] Lỗi gia hạn quota voucher:', e);
                showToast('Không thể gia hạn voucher.', 'danger');
            }
        });

        document.getElementById('btnActionToggleStatus')?.addEventListener('click', async () => {
            const currentCode = PawpalSettings.state?.currentActiveVoucherCode;
            if (!currentCode) return;
            const vouchersList = PawpalSettings.state?.vouchersList || [];
            const voucher = vouchersList.find(v => v.code === currentCode);
            if (!voucher) return;

            const newActive = voucher.status !== 'active';
            try {
                const client = getSupabaseClient();
                if (client) {
                    await client.from('voucher').update({
                        is_active: newActive,
                        updated_at: new Date().toISOString()
                    }).eq('voucher_code', currentCode);
                }
                await logSystemAudit('UPDATE', 'voucher', `Đổi trạng thái Voucher ${currentCode} thành ${newActive ? 'Hoạt động' : 'Tạm dừng'}`);
                closeVoucherActionMenu();
                await PawpalSettings.loadSettingsModuleData?.();
                renderVouchers();
                renderZeroMissAlerts();
                showToast(`Voucher ${voucher.code} hiện đã chuyển sang trạng thái: ${newActive ? 'Đang hoạt động' : 'Tạm dừng'}.`, 'info');
            } catch (e) {
                console.error('[Settings] Lỗi bật/tắt voucher:', e);
                showToast('Không thể cập nhật trạng thái voucher.', 'danger');
            }
        });

        document.getElementById('btnActionDeleteVoucher')?.addEventListener('click', () => {
            const currentCode = PawpalSettings.state?.currentActiveVoucherCode;
            if (!currentCode) return;
            PawpalSettings.showSettingsConfirmModal?.({
                title: 'Xóa Voucher',
                message: `Bạn có chắc chắn muốn xóa Voucher ${currentCode} khỏi hệ thống?`,
                confirmText: 'Xóa Voucher',
                isDanger: true,
                onConfirm: async () => {
                    try {
                        const client = getSupabaseClient();
                        if (client) {
                            await client.from('voucher').delete().eq('voucher_code', currentCode);
                        }
                        await logSystemAudit('DELETE', 'voucher', `Xóa Voucher ${currentCode}`);
                        closeVoucherActionMenu();
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderVouchers();
                        renderZeroMissAlerts();
                        showToast(`Đã xóa thành công Voucher ${currentCode}.`, 'success');
                    } catch (e) {
                        console.error('[Settings] Lỗi xóa voucher:', e);
                        showToast('Không thể xóa voucher: ' + (e.message || ''), 'danger');
                    }
                }
            });
        });

        // PawPoints Modal
        const pawpointsModal = document.getElementById('pawpointsModalOverlay');
        const openPawpointsHandler = () => {
            if (pawpointsModal) pawpointsModal.style.display = 'flex';
        };
        document.getElementById('btnOpenPawpointsModal')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnEditPawpointsLink')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnEditPawpointsSubLink')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnCancelPawpointsModal')?.addEventListener('click', () => { if (pawpointsModal) pawpointsModal.style.display = 'none'; });
        document.getElementById('btnDismissPawpointsModal')?.addEventListener('click', () => { if (pawpointsModal) pawpointsModal.style.display = 'none'; });

        document.getElementById('btnSavePawpointsPolicy')?.addEventListener('click', () => {
            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng vào tab "Cấu hình Hệ thống" và bấm "Mở khóa để sửa" trước khi lưu thay đổi điểm thưởng PawPoints.', 'warning');
                return;
            }
            const pointVal = document.getElementById('inputCfgPointValue')?.value || '100';
            const regPts = document.getElementById('inputCfgRegisterPoints')?.value || '50';

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Chính sách Điểm thưởng PawPoints',
                desc: 'Thay đổi tỷ lệ quy đổi điểm và điểm thưởng thành viên.',
                affectedModules: [
                    { name: 'Phân hệ Khách hàng', note: 'Tính toán lại công thức tích lũy và cập nhật hiển thị điểm trong Hồ sơ 360°' },
                    { name: 'Phân hệ Bán hàng', note: 'Áp dụng tỷ lệ trừ tiền trực tiếp vào hóa đơn POS và Web Checkout' }
                ],
                onConfirm: async () => {
                    const parsedVal = parseInt(pointVal, 10);
                    const dispPv = document.getElementById('dispPointValue');
                    if (dispPv) dispPv.textContent = `1 điểm = ${parsedVal.toLocaleString('vi-VN')} VNĐ`;
                    const kpiEl = document.getElementById('kpiPointRate');
                    if (kpiEl) kpiEl.textContent = `1đ = ${parsedVal.toLocaleString('vi-VN')}đ`;
                    const dispReg = document.getElementById('dispRegisterPoints');
                    if (dispReg) dispReg.textContent = `+${regPts} điểm`;
                    if (pawpointsModal) pawpointsModal.style.display = 'none';

                    if (PawpalSettings.state?.systemConfig) {
                        PawpalSettings.state.systemConfig.pawpointsPolicy = {
                            pointValueVnd: parsedVal,
                            registerBonus: parseInt(regPts, 10)
                        };
                        await PawpalSettings.persistSystemConfig?.(PawpalSettings.state.systemConfig);
                    }

                    await logSystemAudit('UPDATE', 'pawpoints', `Cập nhật PawPoints: 1 điểm = ${parsedVal.toLocaleString('vi-VN')} VNĐ, Thưởng đăng ký +${regPts} điểm`);
                    await PawpalSettings.loadSettingsModuleData?.();
                    PawpalSettings.subtabs.audit?.renderAuditLogs?.();
                    showToast('Đã lưu chính sách PawPoints và đồng bộ thành công sang phân hệ Khách hàng và Bán hàng!', 'success');
                }
            });
        });

        // Notifications Modal
        const noticeModal = document.getElementById('notificationModalOverlay');
        const openNoticeHandler = () => {
            if (noticeModal) noticeModal.style.display = 'flex';
        };
        document.getElementById('btnOpenNotificationModal')?.addEventListener('click', openNoticeHandler);
        document.getElementById('btnAddNoticeLink')?.addEventListener('click', openNoticeHandler);
        document.getElementById('btnCancelNoticeModal')?.addEventListener('click', () => { if (noticeModal) noticeModal.style.display = 'none'; });
        document.getElementById('btnDismissNoticeModal')?.addEventListener('click', () => { if (noticeModal) noticeModal.style.display = 'none'; });

        document.getElementById('btnSaveNotice')?.addEventListener('click', async () => {
            const content = document.getElementById('inputNoticeContent')?.value.trim();
            if (!content) {
                showToast('Vui lòng nhập nội dung thông báo!', 'warning');
                return;
            }
            const typeValue = document.getElementById('inputNoticeType')?.value || 'topbar';
            const statusValue = document.getElementById('inputNoticeStatus')?.value || 'active';
            const nType = typeValue === 'popup' ? 'POPUP' : 'TOPBAR';

            try {
                const client = getSupabaseClient();
                if (!client) throw new Error('Chưa kết nối được cơ sở dữ liệu.');
                const { error } = await client.from('notification').insert([{
                    title: content.substring(0, 60),
                    content,
                    notification_type: nType,
                    is_read: statusValue !== 'active',
                    sent_at: new Date().toISOString()
                }]);
                if (error) throw error;
                await logSystemAudit('INSERT', 'notification', `Thêm thông báo ${typeValue === 'popup' ? 'Popup' : 'Top-bar'}: "${content.substring(0, 50)}..."`);
                if (noticeModal) noticeModal.style.display = 'none';
                await PawpalSettings.loadSettingsModuleData?.();
                renderNotifications();
                showToast('Đã lưu và đồng bộ thông báo mới sang Website!', 'success');
            } catch (e) {
                console.error('[Settings] Lỗi thêm thông báo:', e);
                showToast('Lỗi khi thêm thông báo: ' + (e.message || ''), 'danger');
            }
        });

        // Render ban đầu
        renderBanners();
        renderVouchers();
        renderNotifications();
        renderZeroMissAlerts();
    }

    PawpalSettings.subtabs.banners = {
        init: initBannersSubtab,
        renderBanners,
        renderVouchers,
        renderZeroMissAlerts,
        renderNotifications,
        openBannerModal,
        resetBannerModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBannersSubtab);
    } else {
        initBannersSubtab();
    }
})();
