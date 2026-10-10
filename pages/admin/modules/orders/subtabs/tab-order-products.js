// tab-order-products.js - Subtab Quản lý Sản phẩm và Kho của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders Products] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const { formatVND, showToast, matchSearch, addStockLog, persistProductsData, syncOrdersAndProductsFromSupabase } = helpers;

    const PRODUCTS_PER_PAGE = 10;
    let productsCurrentPage = parseInt(sessionStorage.getItem('pawpal_admin_products_page') || '1', 10);
    if (isNaN(productsCurrentPage) || productsCurrentPage < 1) productsCurrentPage = 1;

    let globalDbCategories = [];

    // Cập nhật bộ lọc danh mục sản phẩm từ CSDL Supabase
    function updateCategoryFilterDropdown(dbCategories = []) {
        if (Array.isArray(dbCategories) && dbCategories.length > 0) {
            globalDbCategories = dbCategories;
        }
        const select = document.getElementById('productFilterCategory');
        if (!select) return;

        const currentVal = select.value || 'ALL';
        const distinctCats = [...new Set(globalDbCategories.map(c => c.category_name).filter(Boolean))];

        select.innerHTML = '<option value="ALL">Tất cả danh mục</option>' + distinctCats.map(name => `
            <option value="${name}">${name}</option>
        `).join('');

        if (distinctCats.includes(currentVal)) {
            select.value = currentVal;
        } else {
            select.value = 'ALL';
        }
    }

    // Render bảng sản phẩm
    function renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('productSearchInput')?.value || '').trim();
        const catVal = document.getElementById('productFilterCategory')?.value || 'ALL';
        const stockStatusVal = document.getElementById('productFilterStockStatus')?.value || 'ALL';

        const productsList = state.products || [];

        const filtered = productsList.filter(p => {
            if (catVal !== 'ALL' && p.category !== catVal) return false;
            if (stockStatusVal !== 'ALL') {
                if (stockStatusVal === 'in_stock' && (p.stock <= p.minStock || p.status === 'Tạm ngưng')) return false;
                if (stockStatusVal === 'low_stock' && (p.stock > p.minStock || p.stock === 0 || p.status === 'Tạm ngưng')) return false;
                if (stockStatusVal === 'out_of_stock' && (p.stock !== 0 || p.status === 'Tạm ngưng')) return false;
                if (stockStatusVal === 'suspended' && p.status !== 'Tạm ngưng') return false;
            }
            if (searchVal) {
                const matchSku = matchSearch(p.sku, searchVal);
                const matchName = matchSearch(p.name, searchVal);
                if (!matchSku && !matchName) return false;
            }
            return true;
        });

        // Tính toán phân trang
        const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE) || 1;
        if (productsCurrentPage > totalPages) productsCurrentPage = totalPages;
        if (productsCurrentPage < 1) productsCurrentPage = 1;
        sessionStorage.setItem('pawpal_admin_products_page', productsCurrentPage);

        const startIdx = (productsCurrentPage - 1) * PRODUCTS_PER_PAGE;
        const pagedProducts = filtered.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

        if (pagedProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy sản phẩm nào trong kho phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            renderProductsPagination(0);
            return;
        }

        tbody.innerHTML = pagedProducts.map(p => {
            let stockBadge = '';
            let rowAlertClass = '';
            if (p.status === 'Tạm ngưng') {
                stockBadge = '<span class="admin-badge badge-neutral">Tạm ngưng</span>';
                rowAlertClass = 'row-locked';
            } else if (p.stock === 0) {
                stockBadge = '<span class="admin-badge badge-cancelled">Hết hàng</span>';
                rowAlertClass = 'row-alert-danger';
            } else if (p.stock <= p.minStock) {
                stockBadge = '<span class="admin-badge badge-warning">Sắp hết hàng</span>';
                rowAlertClass = 'row-alert-warning';
            } else {
                stockBadge = '<span class="admin-badge badge-paid">Còn hàng</span>';
            }

            const alertDot = (p.stock <= p.minStock && p.status !== 'Tạm ngưng')
                ? `<span class="alert-indicator text-${p.stock === 0 ? 'danger' : 'warning'}">• ${p.stock === 0 ? 'Hết hàng' : 'Cần nhập hàng'}</span>`
                : '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';

            const imgSrc = p.image || (Array.isArray(p.images) ? p.images[0] : (typeof p.images === 'string' ? p.images.split(',')[0].trim() : '/assets/images/shop/products/tp-hat-01.png'));

            return `
                <tr class="${rowAlertClass}">
                    <td style="font-family: monospace; font-weight: 600; color: #236B48;">${p.sku}</td>
                    <td>
                        <div class="prod-item-row">
                            <img src="${imgSrc}" alt="${p.name}" class="prod-thumb" onerror="this.src='/assets/images/shop/products/tp-hat-01.png'">
                            <div class="prod-info-cell">
                                <a href="javascript:void(0)" class="prod-title" onclick="PawpalOrdersModule.openEditProductModal('${p.sku}')">${p.name}</a>
                                <span class="prod-sku-tag">Quy cách: ${p.spec || 'Tiêu chuẩn'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${p.category}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${formatVND(p.price)}</div>
                        <div class="sub-meta-text">Vốn: ${formatVND(p.costPrice || 0)}</div>
                    </td>
                    <td>
                        <div style="font-weight: 700; font-size: 13.5px;">${p.stock} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">${p.unit || 'món'}</span></div>
                        <div class="sub-meta-text">Ngưỡng: ${p.minStock}</div>
                    </td>
                    <td>
                        <div>${stockBadge}</div>
                        <div style="margin-top: 3px;">${alertDot}</div>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openStockActionMenu(event, '${p.sku}')">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderProductsPagination(totalPages);
    }

    // Phân trang sản phẩm
    function renderProductsPagination(totalPages) {
        const pagContainer = document.getElementById('productsPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.style.display = 'none';
            return;
        }
        pagContainer.style.display = 'flex';

        let html = '';
        const prevDisabled = productsCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === productsCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = productsCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (productsCurrentPage > 1) {
                        productsCurrentPage--;
                        sessionStorage.setItem('pawpal_admin_products_page', productsCurrentPage);
                        renderProductsTable();
                    }
                } else if (pageAction === 'next') {
                    if (productsCurrentPage < totalPages) {
                        productsCurrentPage++;
                        sessionStorage.setItem('pawpal_admin_products_page', productsCurrentPage);
                        renderProductsTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== productsCurrentPage) {
                        productsCurrentPage = targetP;
                        sessionStorage.setItem('pawpal_admin_products_page', productsCurrentPage);
                        renderProductsTable();
                    }
                }
            });
        });
    }

    // Bảng kê mặt hàng trong phiếu nhập GRN
    function renderGrnItemsTable() {
        const tbody = document.getElementById('grnItemsTableBody');
        const totalQtyEl = document.getElementById('grnTotalQtyDisp');
        const totalAmtEl = document.getElementById('grnTotalAmountDisp');
        if (!tbody) return;

        const items = state.activeGrnItems || [];
        const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
        const totalAmt = items.reduce((sum, i) => sum + i.total, 0);

        if (totalQtyEl) totalQtyEl.textContent = `${totalQty} món`;
        if (totalAmtEl) totalAmtEl.textContent = formatVND(totalAmt);

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px 12px;">
                        Chưa có mặt hàng nào. Vui lòng chọn sản phẩm ở trên và bấm "Thêm dòng".
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map((item, idx) => `
            <tr>
                <td style="font-family: monospace; font-weight: 600; color: #236B48; white-space: nowrap;">${item.sku}</td>
                <td style="font-weight: 500;">${item.name}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <input type="number" class="admin-input" value="${item.qty}" min="1" style="width: 75px; height: 28px; text-align: center; padding: 2px;" onchange="PawpalOrdersModule.updateGrnItemQty(${idx}, this.value)">
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <input type="number" class="admin-input" value="${item.price}" min="0" step="5000" style="width: 110px; height: 28px; text-align: right; padding: 2px 6px;" onchange="PawpalOrdersModule.updateGrnItemPrice(${idx}, this.value)">
                </td>
                <td style="text-align: right; font-weight: 600; color: #236B48; white-space: nowrap;">${formatVND(item.total)}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removeGrnItem(${idx})">Xóa</button>
                </td>
            </tr>
        `).join('');
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.products = {
        renderProductsTable,
        renderProductsPagination,
        updateCategoryFilterDropdown,
        renderGrnItemsTable
    };

    // Quản lý biến thể sản phẩm (Variant Tags & Matrix)
    let attr1TagValues = [];
    let attr2TagValues = [];

    function renderAttributeTags(group) {
        const container = document.getElementById(group === 1 ? 'attr1TagsContainer' : 'attr2TagsContainer');
        const input = document.getElementById(group === 1 ? 'attr1NewTagInput' : 'attr2NewTagInput');
        const hiddenInput = document.getElementById(group === 1 ? 'attr1Values' : 'attr2Values');
        if (!container || !input) return;

        const tags = group === 1 ? attr1TagValues : attr2TagValues;
        if (hiddenInput) hiddenInput.value = tags.join(', ');

        const existingTags = container.querySelectorAll('.variant-tag-chip');
        existingTags.forEach(el => el.remove());

        tags.forEach((tag, idx) => {
            const chip = document.createElement('span');
            chip.className = 'variant-tag-chip';
            chip.innerHTML = `${tag} <button type="button" class="btn-remove-tag" onclick="PawpalOrdersModule.removeTagValue(${group}, ${idx})">&times;</button>`;
            container.insertBefore(chip, input);
        });
    }

    function addTagValue(group, val) {
        if (!val || !val.trim()) return;
        const clean = val.trim();
        const arr = group === 1 ? attr1TagValues : attr2TagValues;
        if (!arr.includes(clean)) {
            arr.push(clean);
            renderAttributeTags(group);
            generateVariantMatrix();
        }
    }

    function removeTagValue(group, idx) {
        const arr = group === 1 ? attr1TagValues : attr2TagValues;
        if (idx >= 0 && idx < arr.length) {
            arr.splice(idx, 1);
            renderAttributeTags(group);
            generateVariantMatrix();
        }
    }

    function handleTagInputKey(e, group) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const input = e.target;
            const val = input.value.replace(',', '').trim();
            if (val) {
                addTagValue(group, val);
                input.value = '';
            }
        } else if (e.key === 'Backspace' && e.target.value === '') {
            const arr = group === 1 ? attr1TagValues : attr2TagValues;
            if (arr.length > 0) {
                removeTagValue(group, arr.length - 1);
            }
        }
    }

    function toggleVariantMode(isMultiple) {
        const radioSingle = document.querySelector('input[name="prodVariantType"][value="single"]');
        const radioMulti = document.querySelector('input[name="prodVariantType"][value="multiple"]');
        if (isMultiple && radioMulti) radioMulti.checked = true;
        if (!isMultiple && radioSingle) radioSingle.checked = true;

        const singleBox = document.getElementById('singleProductPriceBox');
        const multiBox = document.getElementById('multipleProductVariantsBox');
        if (singleBox) singleBox.style.display = isMultiple ? 'none' : 'block';
        if (multiBox) multiBox.style.display = isMultiple ? 'block' : 'none';

        if (isMultiple) {
            renderAttributeTags(1);
            renderAttributeTags(2);
            generateVariantMatrix();
        }
    }

    function generateVariantMatrix(prefillVariants = null) {
        const tbody = document.getElementById('productVariantsTableBody');
        if (!tbody) return;

        const attr1Name = document.getElementById('attr1Name')?.value.trim() || 'Hương vị';
        const attr1Vals = attr1TagValues || [];
        const attr2Name = document.getElementById('attr2Name')?.value.trim() || 'Quy cách';
        const attr2Vals = attr2TagValues || [];

        const th1 = document.getElementById('thAttr1');
        const th2 = document.getElementById('thAttr2');
        if (th1) th1.textContent = attr1Name;
        if (th2) {
            if (attr2Vals.length > 0) {
                th2.style.display = '';
                th2.textContent = attr2Name;
            } else {
                th2.style.display = 'none';
            }
        }

        const existingDataMap = {};
        if (prefillVariants && Array.isArray(prefillVariants) && prefillVariants.length > 0) {
            prefillVariants.forEach(v => {
                const key = v.attr2 ? `${v.attr1 || ''}|${v.attr2}` : (v.attr1 || v.name || '');
                existingDataMap[key] = {
                    sku: v.sku,
                    costPrice: v.costPrice,
                    price: v.price,
                    originalPrice: v.originalPrice,
                    stock: v.stock,
                    image: v.image
                };
            });
        } else {
            const curRows = tbody.querySelectorAll('tr.variant-row-item');
            curRows.forEach(r => {
                const v1 = r.getAttribute('data-attr-1') || '';
                const v2 = r.getAttribute('data-attr-2') || '';
                const key = v2 ? `${v1}|${v2}` : v1;
                existingDataMap[key] = {
                    sku: r.querySelector('.variant-sku-input')?.value.trim() || '',
                    costPrice: r.querySelector('.variant-cost-input')?.value || '',
                    price: r.querySelector('.variant-price-input')?.value || '',
                    originalPrice: r.querySelector('.variant-orig-input')?.value || '',
                    stock: r.querySelector('.variant-stock-input')?.value || '',
                    image: r.querySelector('.variant-img-input')?.value || ''
                };
            });
        }

        const baseSku = document.getElementById('newProdSku')?.value.trim() || 'SKU';
        const combinations = [];

        if (attr1Vals.length === 0 && attr2Vals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        Vui lòng thêm ít nhất một giá trị cho thuộc tính 1 ở trên để tạo bảng biến thể.
                    </td>
                </tr>
            `;
            return;
        }

        if (attr1Vals.length > 0 && attr2Vals.length === 0) {
            attr1Vals.forEach(v1 => combinations.push({ v1, v2: '' }));
        } else if (attr1Vals.length === 0 && attr2Vals.length > 0) {
            attr2Vals.forEach(v2 => combinations.push({ v1: '', v2 }));
        } else {
            attr1Vals.forEach(v1 => {
                attr2Vals.forEach(v2 => {
                    combinations.push({ v1, v2 });
                });
            });
        }

        tbody.innerHTML = combinations.map((c, idx) => {
            const key = c.v2 ? `${c.v1}|${c.v2}` : c.v1;
            const saved = existingDataMap[key] || {};
            const autoSku = saved.sku || `${baseSku}-${String(idx + 1).padStart(2, '0')}`;
            const autoCost = saved.costPrice !== undefined ? saved.costPrice : '';
            const autoPrice = saved.price !== undefined ? saved.price : '';
            const autoOrig = saved.originalPrice !== undefined ? saved.originalPrice : '';
            const autoStock = saved.stock !== undefined ? saved.stock : 10;
            const autoImg = saved.image || 'assets/images/shop/products/tp-hat-01.png';

            return `
                <tr class="variant-row-item" data-attr-1="${c.v1}" data-attr-2="${c.v2}">
                    <td style="font-weight: 600; color: #236B48;">${c.v1 || '--'}</td>
                    ${attr2Vals.length > 0 ? `<td style="font-weight: 500;">${c.v2}</td>` : ''}
                    <td>
                        <input type="text" class="admin-input variant-sku-input" value="${autoSku}" placeholder="SKU biến thể" style="height: 28px; font-size: 11.5px; padding: 0 6px; font-family: monospace;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-cost-input" value="${autoCost}" placeholder="Vốn (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-price-input" value="${autoPrice}" placeholder="Bán (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-orig-input" value="${autoOrig}" placeholder="Gốc (đ)" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-stock-input" value="${autoStock}" placeholder="Tồn" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="text" class="admin-input variant-img-input" value="${autoImg}" placeholder="Đường dẫn ảnh" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateProductImagePreview() {
        const input = document.getElementById('newProdImages');
        const container = document.getElementById('newProdImagePreviewContainer');
        if (!input || !container) return;

        const val = input.value.trim();
        const urls = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (urls.length === 0) {
            container.innerHTML = `
                <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px; width: 100%; border: 1px dashed var(--border-neutral); border-radius: var(--admin-radius);">
                    Chưa có ảnh nào được tải lên. Nhập đường dẫn ảnh ở trên để xem trước.
                </div>
            `;
            return;
        }

        container.innerHTML = urls.map((url, idx) => `
            <div style="position: relative; width: 68px; height: 68px; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral); overflow: hidden; background: #FFF;">
                <img src="${url.startsWith('/') ? url : '/' + url}" alt="Preview ${idx + 1}" onerror="this.src='/assets/images/shop/products/tp-hat-01.png'" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" onclick="PawpalOrdersModule.removeProductImageAtIndex(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.55); color: #FFF; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">&times;</button>
                ${idx === 0 ? '<span style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(35, 107, 72, 0.85); color: #FFF; font-size: 9px; text-align: center; padding: 1px 0;">Đại diện</span>' : ''}
            </div>
        `).join('');
    }

    // Khởi tạo các sự kiện giao diện cho Subtab Products
    function initProductsEvents() {
        document.getElementById('productSearchInput')?.addEventListener('input', () => {
            productsCurrentPage = 1;
            renderProductsTable();
        });
        document.getElementById('productFilterCategory')?.addEventListener('change', () => {
            productsCurrentPage = 1;
            renderProductsTable();
        });
        document.getElementById('productFilterStockStatus')?.addEventListener('change', () => {
            productsCurrentPage = 1;
            renderProductsTable();
        });

        // Xuất file tồn kho Excel
        document.getElementById('btnExportProductStock')?.addEventListener('click', () => {
            const productsList = state.products || [];
            if (productsList.length === 0) {
                showToast('Không có dữ liệu tồn kho để xuất file.', 'warning');
                return;
            }
            if (window.XLSX) {
                const sheetData = productsList.map((p, idx) => ({
                    'STT': idx + 1,
                    'Mã SKU': p.sku,
                    'Tên sản phẩm': p.name,
                    'Danh mục': p.category,
                    'Giá nhập vốn': p.costPrice || 0,
                    'Giá niêm yết': p.price,
                    'Tồn kho': p.stock,
                    'Ngưỡng cảnh báo': p.minStock,
                    'Trạng thái': p.status
                }));
                const ws = XLSX.utils.json_to_sheet(sheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Ton_Kho');
                XLSX.writeFile(wb, `Bao_Cao_Ton_Kho_PawPal_${new Date().toISOString().slice(0, 10)}.xlsx`);
                showToast('Đã xuất báo cáo tồn kho Excel thành công!', 'success');
            } else {
                showToast('Đang tải thư viện xuất file, vui lòng thử lại sau giây lát...', 'info');
            }
        });

        // Mở modal thêm sản phẩm mới
        document.getElementById('btnOpenAddProductModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openAddProductModal();
        });

        // Xác nhận thêm / cập nhật sản phẩm mới
        document.getElementById('btnSubmitAddProduct')?.addEventListener('click', async () => {
            const editSku = document.getElementById('editProductOriginalSku')?.value.trim();
            const sku = document.getElementById('newProdSku')?.value.trim();
            const name = document.getElementById('newProdName')?.value.trim();
            const cat = document.getElementById('newProdCategory')?.value || 'Thức ăn khô';
            const brand = document.getElementById('newProdBrand')?.value.trim() || 'PawPal';
            const petType = document.getElementById('newProdPetType')?.value || 'Chó và Mèo';
            const origin = document.getElementById('newProdOrigin')?.value.trim() || 'Việt Nam';
            const status = document.getElementById('newProdStatus')?.value || 'Còn hàng';
            const badge = document.getElementById('newProdBadge')?.value || '';
            const features = document.getElementById('newProdFeatures')?.value.trim() || '';
            const description = document.getElementById('newProdDescription')?.value.trim() || '';
            const ingredients = document.getElementById('newProdIngredients')?.value.trim() || '';
            const benefits = document.getElementById('newProdBenefits')?.value.trim() || '';
            const usage = document.getElementById('newProdUsage')?.value.trim() || '';
            const feedingGuide = document.getElementById('newProdFeedingGuide')?.value.trim() || '';
            const expiry = document.getElementById('newProdExpiry')?.value.trim() || '';
            const storage = document.getElementById('newProdStorage')?.value.trim() || '';

            if (!sku || !name) {
                showToast('Vui lòng nhập đầy đủ mã SKU và tên sản phẩm.', 'warning');
                return;
            }

            const isMultiple = document.querySelector('input[name="prodVariantType"]:checked')?.value === 'multiple';
            let unit = 'Túi';
            let spec = '';
            let costPrice = 0;
            let price = 0;
            let originalPrice = 0;
            let memberPrice = 0;
            let stock = 0;
            let minStock = 5;
            let images = 'assets/images/shop/products/tp-hat-01.png';
            const variants = [];

            if (isMultiple) {
                const variantRows = document.querySelectorAll('#productVariantsTableBody tr.variant-row-item');
                if (variantRows.length === 0) {
                    showToast('Vui lòng tạo ít nhất 1 phân loại biến thể cho sản phẩm.', 'warning');
                    return;
                }

                let hasInvalidVariant = false;
                variantRows.forEach((row, idx) => {
                    const v1 = row.getAttribute('data-attr-1') || '';
                    const v2 = row.getAttribute('data-attr-2') || '';
                    const vName = v2 ? `${v1} - ${v2}` : (v1 || `Phân loại ${idx + 1}`);
                    const vSku = row.querySelector('.variant-sku-input')?.value.trim() || `${sku}-${String(idx + 1).padStart(2, '0')}`;
                    const vCost = parseInt(row.querySelector('.variant-cost-input')?.value || '0', 10);
                    const vPrice = parseInt(row.querySelector('.variant-price-input')?.value || '0', 10);
                    const vOrig = parseInt(row.querySelector('.variant-orig-input')?.value || '0', 10);
                    const vMemberPrice = Math.round(vPrice * 0.925 / 1000) * 1000;
                    const vStock = parseInt(row.querySelector('.variant-stock-input')?.value || '0', 10);
                    const vImg = row.querySelector('.variant-img-input')?.value.trim() || 'assets/images/shop/products/tp-hat-01.png';

                    if (vPrice <= 0) hasInvalidVariant = true;

                    variants.push({
                        attr1: v1,
                        attr2: v2,
                        name: vName,
                        sku: vSku,
                        costPrice: vCost,
                        price: vPrice,
                        originalPrice: vOrig,
                        memberPrice: vMemberPrice,
                        stock: vStock,
                        image: vImg
                    });
                });

                if (hasInvalidVariant) {
                    showToast('Vui lòng điền giá bán hợp lệ (> 0) cho tất cả các biến thể trong bảng.', 'warning');
                    return;
                }

                unit = document.getElementById('newProdUnit')?.value || 'Món';
                spec = variants.map(v => v.name).join(', ');
                const validCosts = variants.map(v => v.costPrice).filter(cp => cp > 0);
                costPrice = validCosts.length > 0 ? Math.min(...validCosts) : 0;
                price = Math.min(...variants.map(v => v.price));
                originalPrice = Math.max(...variants.map(v => v.originalPrice)) || 0;
                memberPrice = Math.min(...variants.map(v => v.memberPrice));
                stock = variants.reduce((sum, v) => sum + v.stock, 0);
                minStock = 5;
                const vImgs = variants.map(v => v.image).filter(Boolean);
                images = vImgs.length > 0 ? vImgs.join(', ') : 'assets/images/shop/products/tp-hat-01.png';
            } else {
                unit = document.getElementById('newProdUnit')?.value || 'Túi';
                spec = document.getElementById('newProdSpec')?.value.trim() || '';
                costPrice = parseInt(document.getElementById('newProdCostPrice')?.value || '0', 10);
                price = parseInt(document.getElementById('newProdPrice')?.value || '0', 10);
                originalPrice = parseInt(document.getElementById('newProdOriginalPrice')?.value || '0', 10);
                memberPrice = Math.round(price * 0.925 / 1000) * 1000;
                stock = parseInt(document.getElementById('newProdInitialStock')?.value || '0', 10);
                minStock = parseInt(document.getElementById('newProdMinStock')?.value || '5', 10);
                images = document.getElementById('newProdImages')?.value.trim() || 'assets/images/shop/products/tp-hat-01.png';

                if (price <= 0) {
                    showToast('Vui lòng nhập giá bán thực tế hợp lệ (lớn hơn 0).', 'warning');
                    return;
                }
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            const productsList = state.products || [];

            if (editSku) {
                const prodIndex = productsList.findIndex(p => p.sku.toLowerCase() === editSku.toLowerCase());
                if (prodIndex === -1) {
                    showToast('Không tìm thấy sản phẩm cần cập nhật.', 'error');
                    return;
                }

                if (sku.toLowerCase() !== editSku.toLowerCase() && productsList.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
                    showToast(`Mã SKU "${sku}" đã tồn tại cho một sản phẩm khác. Vui lòng chọn mã khác.`, 'warning');
                    return;
                }

                const existingProd = productsList[prodIndex];
                const oldStock = existingProd.stock || 0;

                productsList[prodIndex] = {
                    ...existingProd,
                    sku: sku,
                    name: name,
                    category: cat,
                    brand: brand,
                    petType: petType,
                    origin: origin,
                    status: status,
                    unit: unit,
                    spec: spec,
                    badge: badge,
                    features: features,
                    costPrice: costPrice,
                    price: price,
                    originalPrice: originalPrice,
                    memberPrice: memberPrice,
                    stock: stock,
                    minStock: minStock,
                    images: images,
                    image: images.split(',')[0].trim(),
                    description: description,
                    ingredients: ingredients,
                    benefits: benefits,
                    usage: usage,
                    feedingGuide: feedingGuide,
                    expiry: expiry,
                    storage: storage,
                    rating: existingProd.rating || 5.0,
                    reviewCount: existingProd.reviewCount || 0,
                    hasVariants: isMultiple,
                    variants: isMultiple ? variants : []
                };

                if (stock !== oldStock) {
                    const diff = stock - oldStock;
                    addStockLog({
                        sku: sku,
                        name: name,
                        type: diff > 0 ? 'IN' : 'OUT',
                        typeLabel: diff > 0 ? 'Điều chỉnh tăng tồn kho trực tiếp' : 'Điều chỉnh giảm tồn kho trực tiếp',
                        change: diff > 0 ? `+${diff}` : `${diff}`,
                        beforeStock: oldStock,
                        afterStock: stock,
                        refCode: 'ADJ-' + sku,
                        staff: 'Quản trị viên'
                    });
                }

                if (client && existingProd.id) {
                    try {
                        await client.from('product').update({
                            sku: sku,
                            product_name: name,
                            unit: unit,
                            cost_price: costPrice,
                            sale_price: price,
                            image_urls: images.split(',').map(s => s.trim()).filter(Boolean),
                            status: status === 'Còn hàng' || status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                            origin: origin,
                            ingredients: ingredients,
                            benefits: benefits,
                            usage_instructions: usage,
                            specs: spec,
                            badge: badge || null
                        }).eq('id', existingProd.id);

                        if (stock !== oldStock) {
                            await client.from('inventory').update({
                                quantity_in_stock: stock,
                                minimum_stock: minStock
                            }).eq('product_id', existingProd.id);
                        }
                    } catch (errUpProd) {
                        console.warn('Lỗi khi cập nhật sản phẩm lên Supabase:', errUpProd);
                    }
                }

                persistProductsData();
                document.getElementById('modalAddProduct')?.classList.remove('active');
                renderProductsTable();
                showToast(`Đã cập nhật thành công thông tin sản phẩm "${name}" (SKU: ${sku})!`, 'success');
            } else {
                if (productsList.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
                    showToast(`Mã SKU "${sku}" đã tồn tại trong kho. Vui lòng nhập mã khác.`, 'warning');
                    return;
                }

                let createdProdDbId = null;
                if (client) {
                    try {
                        const { data: cats } = await client.from('product_category').select('id, category_name').ilike('category_name', `%${cat}%`).limit(1);
                        const categoryId = cats && cats[0] ? cats[0].id : null;

                        const { data: newP, error: pErr } = await client.from('product').insert({
                            sku: sku,
                            product_name: name,
                            category_id: categoryId,
                            unit: unit,
                            cost_price: costPrice,
                            sale_price: price,
                            image_urls: images.split(',').map(s => s.trim()).filter(Boolean),
                            status: status === 'Còn hàng' || status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                            origin: origin,
                            ingredients: ingredients,
                            benefits: benefits,
                            usage_instructions: usage,
                            specs: spec,
                            badge: badge || 'new',
                            rating: 5.0,
                            review_count: 0
                        }).select().single();

                        if (pErr) throw pErr;
                        if (newP && newP.id) {
                            createdProdDbId = newP.id;
                            await client.from('inventory').insert({
                                product_id: newP.id,
                                quantity_in_stock: stock,
                                minimum_stock: minStock
                            });
                        }
                    } catch (errAddProdDb) {
                        console.error('Lỗi khi thêm sản phẩm mới vào Supabase:', errAddProdDb);
                        showToast('Không thể tạo sản phẩm: ' + (errAddProdDb.message || ''), 'danger');
                        return;
                    }
                }

                const newProdObj = {
                    id: createdProdDbId,
                    sku: sku,
                    name: name,
                    category: cat,
                    brand: brand,
                    petType: petType,
                    origin: origin,
                    status: status,
                    unit: unit,
                    spec: spec,
                    badge: badge,
                    features: features,
                    costPrice: costPrice,
                    price: price,
                    originalPrice: originalPrice,
                    memberPrice: memberPrice,
                    stock: stock,
                    minStock: minStock,
                    images: images,
                    image: images.split(',')[0].trim(),
                    description: description,
                    ingredients: ingredients,
                    benefits: benefits,
                    usage: usage,
                    feedingGuide: feedingGuide,
                    expiry: expiry,
                    storage: storage,
                    rating: 5.0,
                    reviewCount: 0,
                    hasVariants: isMultiple,
                    variants: isMultiple ? variants : []
                };

                productsList.unshift(newProdObj);
                persistProductsData();

                if (stock > 0) {
                    addStockLog({
                        sku: sku,
                        name: name,
                        type: 'IN',
                        typeLabel: 'Nhập kho ban đầu khi tạo sản phẩm',
                        change: `+${stock}`,
                        beforeStock: 0,
                        afterStock: stock,
                        refCode: 'INIT-' + sku,
                        staff: 'Quản trị viên'
                    });
                }

                await syncOrdersAndProductsFromSupabase();
                document.getElementById('modalAddProduct')?.classList.remove('active');
                renderProductsTable();
                showToast(`Đã thêm thành công sản phẩm mới "${name}" (SKU: ${sku}) đầy đủ thông số!`, 'success');
            }
        });

        // Xác nhận lưu điều chỉnh tồn kho
        document.getElementById('btnSubmitAdjustStock')?.addEventListener('click', async () => {
            const sku = state.activeAdjustProductSku;
            const prod = (state.products || []).find(p => p.sku === sku);
            if (!prod) return;

            const opType = document.getElementById('adjustOperationType')?.value || 'ADD';
            const qty = parseInt(document.getElementById('adjustQuantityInput')?.value || '0', 10);
            const newPrice = document.getElementById('adjustPriceInput')?.value;
            const newStatus = document.getElementById('adjustStatusSelect')?.value || 'Đang bán';
            const reason = document.getElementById('adjustReasonSelect')?.value;

            const beforeStock = prod.stock;
            if (opType === 'ADD') {
                prod.stock += qty;
            } else if (opType === 'SUB') {
                prod.stock = Math.max(0, prod.stock - qty);
            } else if (opType === 'SET') {
                prod.stock = Math.max(0, qty);
            }
            const afterStock = prod.stock;

            if (newPrice && parseInt(newPrice, 10) > 0) {
                prod.price = parseInt(newPrice, 10);
            }

            prod.status = newStatus;
            persistProductsData();

            const changeStr = (opType === 'ADD' ? `+${qty}` : opType === 'SUB' ? `-${qty}` : `=${qty}`);
            addStockLog({
                sku: prod.sku,
                name: prod.name,
                type: 'ADJUST',
                typeLabel: reason,
                change: changeStr,
                beforeStock: beforeStock,
                afterStock: afterStock,
                refCode: 'ADJ-' + Date.now().toString().slice(-4),
                staff: 'Quản trị viên'
            });

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client && prod.id) {
                try {
                    await client.from('inventory').update({
                        quantity_in_stock: afterStock,
                        last_updated_at: new Date().toISOString()
                    }).eq('product_id', prod.id);

                    const updateProdPayload = {};
                    if (newPrice && parseInt(newPrice, 10) > 0) updateProdPayload.sale_price = parseInt(newPrice, 10);
                    if (newStatus) updateProdPayload.status = (newStatus === 'Còn hàng' || newStatus === 'Đang bán') ? 'ACTIVE' : 'INACTIVE';
                    if (Object.keys(updateProdPayload).length > 0) {
                        await client.from('product').update(updateProdPayload).eq('id', prod.id);
                    }
                } catch (errAdjDb) {
                    console.warn('Lỗi khi cập nhật điều chỉnh tồn kho lên Supabase:', errAdjDb);
                }
            }

            document.getElementById('modalAdjustStock')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã cập nhật tồn kho cho sản phẩm ${sku}! Số lượng tồn mới: ${prod.stock} (Lý do: ${reason}).`, 'success');
        });

        // Nút mở modal nhập hàng NCC
        document.getElementById('btnOpenGoodsReceiptModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openGoodsReceiptModal();
        });

        // Nút thêm dòng sản phẩm vào phiếu nhập
        document.getElementById('btnGrnAddItem')?.addEventListener('click', () => {
            const picker = document.getElementById('grnProductPicker');
            if (!picker || !picker.value) return;
            const sku = picker.value;
            const prod = (state.products || []).find(p => p.sku === sku);
            if (!prod) return;

            state.activeGrnItems = state.activeGrnItems || [];
            const existing = state.activeGrnItems.find(i => i.sku === sku);
            if (existing) {
                existing.qty += 10;
                existing.total = existing.qty * existing.price;
            } else {
                const costPrice = Math.round((prod.price || 50000) * 0.65);
                state.activeGrnItems.push({
                    sku: prod.sku,
                    name: prod.name,
                    qty: 10,
                    price: costPrice,
                    total: 10 * costPrice
                });
            }
            renderGrnItemsTable();
        });

        // Xác nhận nhập kho và cộng dồn tồn
        document.getElementById('btnSubmitGoodsReceipt')?.addEventListener('click', async () => {
            const items = state.activeGrnItems || [];
            if (items.length === 0) {
                showToast('Vui lòng thêm ít nhất một mặt hàng vào phiếu nhập kho.', 'warning');
                return;
            }

            const receiptCode = document.getElementById('grnReceiptCode')?.value || ('GRN-' + Date.now().toString().slice(-4));
            const supplier = document.getElementById('grnSupplierSelect')?.value || 'Nhà cung cấp';
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

            for (const item of items) {
                const prod = (state.products || []).find(p => p.sku === item.sku);
                if (prod) {
                    const before = prod.stock;
                    prod.stock += item.qty;
                    if (prod.status === 'Tạm ngưng' && prod.stock > 0) {
                        prod.status = 'Còn hàng';
                    }
                    addStockLog({
                        sku: prod.sku,
                        name: prod.name,
                        type: 'IN',
                        typeLabel: `Nhập kho từ ${supplier}`,
                        change: `+${item.qty}`,
                        beforeStock: before,
                        afterStock: prod.stock,
                        refCode: receiptCode,
                        staff: 'Quản trị viên'
                    });

                    if (client && prod.id) {
                        try {
                            await client.from('inventory').update({
                                quantity_in_stock: prod.stock,
                                last_updated_at: new Date().toISOString()
                            }).eq('product_id', prod.id);
                        } catch (errGrnDb) {
                            console.warn('Lỗi khi cập nhật nhập kho lên Supabase:', errGrnDb);
                        }
                    }
                }
            }

            persistProductsData();
            document.getElementById('modalGoodsReceipt')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã hoàn tất nhập kho phiếu ${receiptCode} (${items.length} mặt hàng) từ ${supplier}!`, 'success');
            state.activeGrnItems = [];
        });

        // Nút mở modal kiểm kê kho
        document.getElementById('btnOpenStocktakeModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openStocktakeModal();
        });

        // Xác nhận cân đối kiểm kê
        document.getElementById('btnSubmitStocktake')?.addEventListener('click', async () => {
            const auditCode = document.getElementById('stkAuditCode')?.value || ('STK-' + Date.now().toString().slice(-4));
            const reason = document.getElementById('stkReasonSelect')?.value || 'Kiểm kê định kỳ';
            const rows = document.querySelectorAll('.stk-row-item');
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

            let updatedCount = 0;
            for (const row of rows) {
                const sku = row.getAttribute('data-sku');
                const countInput = row.querySelector('.stk-count-input');
                const diffReasonSelect = row.querySelector('.stk-row-reason-select');
                if (!sku || !countInput) continue;

                const actualCount = parseInt(countInput.value || '0', 10);
                const prod = (state.products || []).find(p => p.sku === sku);
                if (prod && prod.stock !== actualCount) {
                    const before = prod.stock;
                    const diff = actualCount - before;
                    prod.stock = actualCount;
                    updatedCount++;

                    addStockLog({
                        sku: prod.sku,
                        name: prod.name,
                        type: 'STK',
                        typeLabel: `${reason} (${diffReasonSelect?.value || 'Cân đối kiểm kê'})`,
                        change: diff > 0 ? `+${diff}` : `${diff}`,
                        beforeStock: before,
                        afterStock: prod.stock,
                        refCode: auditCode,
                        staff: 'Quản trị viên'
                    });

                    if (client && prod.id) {
                        try {
                            await client.from('inventory').update({
                                quantity_in_stock: prod.stock,
                                last_updated_at: new Date().toISOString()
                            }).eq('product_id', prod.id);
                        } catch (errStkDb) {
                            console.warn('Lỗi khi cân đối kiểm kê lên Supabase:', errStkDb);
                        }
                    }
                }
            }

            persistProductsData();
            document.getElementById('modalStocktake')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã hoàn tất phiên kiểm kê ${auditCode}! Đã cân đối tồn cho ${updatedCount} mặt hàng.`, 'success');
        });

        // Xác nhận đổi trạng thái kinh doanh trong modal
        document.getElementById('btnConfirmToggleProductStatus')?.addEventListener('click', async () => {
            if (!state.activeStockActionSku) return;
            const prod = (state.products || []).find(p => p.sku === state.activeStockActionSku);
            if (prod) {
                const isCurrentlySuspended = prod.status === 'Tạm ngưng';
                prod.status = isCurrentlySuspended ? 'Còn hàng' : 'Tạm ngưng';
                persistProductsData();

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client && prod.id) {
                    try {
                        await client.from('product').update({
                            status: isCurrentlySuspended ? 'ACTIVE' : 'INACTIVE'
                        }).eq('id', prod.id);
                    } catch (errTogDb) {
                        console.warn('Lỗi khi đổi trạng thái kinh doanh sản phẩm trên Supabase:', errTogDb);
                    }
                }

                renderProductsTable();
                document.getElementById('modalConfirmToggleProductStatus')?.classList.remove('active');
                showToast(`Đã chuyển trạng thái sản phẩm ${prod.sku} sang "${prod.status}".`, 'success');
            }
        });
    }

    // Xuất ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};

    window.PawpalOrdersModule.openStockActionMenu = function(e, sku) {
        e.stopPropagation();
        state.activeStockActionSku = sku;
        const popover = document.getElementById('stockActionDropdown');
        if (!popover) return;
        const rect = e.target.getBoundingClientRect();
        popover.style.top = `${rect.bottom + 4}px`;
        popover.style.left = `${rect.left - 130}px`;
        popover.classList.add('active');
    };

    window.PawpalOrdersModule.handleStockAction = function(action) {
        const sku = state.activeStockActionSku;
        document.getElementById('stockActionDropdown')?.classList.remove('active');
        if (!sku) return;
        if (action === 'edit') {
            this.openEditProductModal(sku);
        } else if (action === 'reviews') {
            this.openProductReviewsModal(sku);
        } else if (action === 'logs') {
            this.openStockLogsModal(sku);
        } else if (action === 'adjust') {
            this.openAdjustStockModal(sku);
        } else if (action === 'grn') {
            this.openGoodsReceiptModal(sku);
        } else if (action === 'toggle') {
            this.openConfirmToggleStatusModal(sku);
        }
    };

    window.PawpalOrdersModule.openAddProductModal = function() {
        const titleEl = document.getElementById('productModalTitle');
        const submitBtn = document.getElementById('btnSubmitAddProduct');
        const editSkuInput = document.getElementById('editProductOriginalSku');

        if (titleEl) titleEl.textContent = 'Thêm sản phẩm mới';
        if (submitBtn) submitBtn.textContent = 'Lưu sản phẩm';
        if (editSkuInput) editSkuInput.value = '';

        const sttInput = document.getElementById('newProdStt');
        if (sttInput) sttInput.value = (state.products || []).length + 1;

        const inputs = [
            'newProdSku', 'newProdName', 'newProdBrand', 'newProdSpec', 'newProdBadge',
            'newProdFeatures', 'newProdCostPrice', 'newProdPrice', 'newProdOriginalPrice',
            'newProdDescription', 'newProdIngredients', 'newProdBenefits', 'newProdUsage',
            'newProdFeedingGuide', 'newProdExpiry', 'newProdStorage'
        ];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const stockIn = document.getElementById('newProdInitialStock');
        if (stockIn) stockIn.value = 10;
        const minStockIn = document.getElementById('newProdMinStock');
        if (minStockIn) minStockIn.value = 5;
        const imgIn = document.getElementById('newProdImages');
        if (imgIn) imgIn.value = 'assets/images/shop/products/tp-hat-01.png';

        attr1TagValues = [];
        attr2TagValues = [];
        toggleVariantMode(false);
        updateProductImagePreview();

        document.getElementById('modalAddProduct')?.classList.add('active');
    };

    window.PawpalOrdersModule.openEditProductModal = function(sku) {
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const titleEl = document.getElementById('productModalTitle');
        const submitBtn = document.getElementById('btnSubmitAddProduct');
        const editSkuInput = document.getElementById('editProductOriginalSku');

        if (titleEl) titleEl.textContent = `Sửa sản phẩm: ${prod.name}`;
        if (submitBtn) submitBtn.textContent = 'Lưu thay đổi';
        if (editSkuInput) editSkuInput.value = prod.sku;

        const prodIndex = (state.products || []).findIndex(p => p.sku === sku);
        const sttInput = document.getElementById('newProdStt');
        if (sttInput) sttInput.value = prodIndex >= 0 ? prodIndex + 1 : 1;

        document.getElementById('newProdSku').value = prod.sku || '';
        document.getElementById('newProdName').value = prod.name || '';
        document.getElementById('newProdCategory').value = prod.category || 'Thức ăn khô';
        document.getElementById('newProdBrand').value = prod.brand || 'PawPal';
        document.getElementById('newProdPetType').value = prod.petType || 'Chó và Mèo';
        document.getElementById('newProdOrigin').value = prod.origin || 'Việt Nam';
        document.getElementById('newProdStatus').value = prod.status || 'Còn hàng';
        document.getElementById('newProdUnit').value = prod.unit || 'Túi';
        document.getElementById('newProdSpec').value = prod.spec || '';
        document.getElementById('newProdBadge').value = prod.badge || '';
        document.getElementById('newProdFeatures').value = prod.features || '';
        document.getElementById('newProdCostPrice').value = prod.costPrice || '';
        document.getElementById('newProdPrice').value = prod.price || '';
        document.getElementById('newProdOriginalPrice').value = prod.originalPrice || '';
        document.getElementById('newProdInitialStock').value = prod.stock || 0;
        document.getElementById('newProdMinStock').value = prod.minStock || 5;
        document.getElementById('newProdImages').value = prod.images ? (Array.isArray(prod.images) ? prod.images.join(', ') : prod.images) : (prod.image || 'assets/images/shop/products/tp-hat-01.png');
        document.getElementById('newProdDescription').value = prod.description || '';
        document.getElementById('newProdIngredients').value = prod.ingredients || '';
        document.getElementById('newProdBenefits').value = prod.benefits || '';
        document.getElementById('newProdUsage').value = prod.usage || '';
        document.getElementById('newProdFeedingGuide').value = prod.feedingGuide || '';
        document.getElementById('newProdExpiry').value = prod.expiry || '';
        document.getElementById('newProdStorage').value = prod.storage || '';

        const hasVariants = !!(prod.hasVariants && Array.isArray(prod.variants) && prod.variants.length > 0);
        if (hasVariants) {
            attr1TagValues = [...new Set(prod.variants.map(v => v.attr1 || v.name).filter(Boolean))];
            attr2TagValues = [...new Set(prod.variants.map(v => v.attr2).filter(Boolean))];

            const attr1N = document.getElementById('attr1Name');
            const attr2N = document.getElementById('attr2Name');
            if (attr1N) attr1N.value = prod.attr1Name || 'Hương vị';
            if (attr2N) attr2N.value = prod.attr2Name || 'Quy cách';

            toggleVariantMode(true);
            generateVariantMatrix(prod.variants);
        } else {
            toggleVariantMode(false);
        }

        updateProductImagePreview();
        document.getElementById('modalAddProduct')?.classList.add('active');
    };

    window.PawpalOrdersModule.openConfirmToggleStatusModal = function(sku) {
        state.activeStockActionSku = sku;
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const isCurrentlySuspended = prod.status === 'Tạm ngưng';
        const subEl = document.getElementById('toggleStatusProdSubtitle');
        const nameEl = document.getElementById('toggleStatusProdName');
        const currEl = document.getElementById('toggleStatusCurrentBadge');
        const newEl = document.getElementById('toggleStatusNewBadge');
        const descEl = document.getElementById('toggleStatusDescText');

        if (subEl) subEl.textContent = `Mã SKU: ${prod.sku}`;
        if (nameEl) nameEl.textContent = prod.name;
        if (currEl) {
            currEl.innerHTML = isCurrentlySuspended 
                ? '<span class="admin-badge badge-cancelled">Tạm ngưng</span>'
                : '<span class="admin-badge badge-paid">Đang bán</span>';
        }
        if (newEl) {
            newEl.innerHTML = isCurrentlySuspended 
                ? '<span class="admin-badge badge-paid">Còn hàng (Mở bán lại)</span>'
                : '<span class="admin-badge badge-cancelled">Tạm ngưng kinh doanh</span>';
        }
        if (descEl) {
            descEl.innerHTML = isCurrentlySuspended
                ? 'Khi mở bán lại, sản phẩm sẽ hiển thị công khai trên Shop và khách hàng có thể tiếp tục đặt mua bình thường.'
                : 'Khi chuyển sang <strong>Tạm ngưng</strong>, sản phẩm sẽ tạm thời bị ẩn khỏi gian hàng và khách hàng không thể đặt mua trực tuyến.';
        }

        document.getElementById('modalConfirmToggleProductStatus')?.classList.add('active');
    };

    window.PawpalOrdersModule.openStockLogsModal = function(sku) {
        state.activeStockActionSku = sku;
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const subEl = document.getElementById('stockLogsSubtitle');
        const totalEl = document.getElementById('stockLogsCurrentTotal');
        const minEl = document.getElementById('stockLogsMinStock');
        const statusEl = document.getElementById('stockLogsStatusText');
        const tbody = document.getElementById('stockLogsTableBody');

        if (subEl) subEl.textContent = `Mã SKU: ${prod.sku} • ${prod.name}`;
        if (totalEl) totalEl.textContent = `${prod.stock} món`;
        if (minEl) minEl.textContent = `${prod.minStock} món`;
        if (statusEl) {
            if (prod.stock === 0) {
                statusEl.textContent = 'Đã hết hàng';
                statusEl.className = 'info-value text-danger';
            } else if (prod.stock <= prod.minStock) {
                statusEl.textContent = 'Sắp hết hàng';
                statusEl.className = 'info-value text-warning';
            } else {
                statusEl.textContent = 'An toàn';
                statusEl.className = 'info-value text-success';
            }
        }

        const logs = (state.stockLogs || []).filter(l => l.sku === sku);
        if (tbody) {
            if (logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Chưa có lịch sử biến động nào cho sản phẩm này.</td></tr>';
            } else {
                tbody.innerHTML = logs.map(l => {
                    let badgeType = 'badge-paid';
                    if (l.type === 'OUT') badgeType = 'badge-cancelled';
                    else if (l.type === 'ADJUST') badgeType = 'badge-warning';
                    return `
                        <tr>
                            <td>${l.date || '--'}</td>
                            <td style="font-family: monospace;">${l.refCode || '--'}</td>
                            <td><span class="admin-badge ${badgeType}">${l.typeLabel || l.type}</span></td>
                            <td style="font-weight: 700; color: ${l.change?.startsWith('+') ? '#236B48' : '#DC2626'};">${l.change}</td>
                            <td>${l.beforeStock}</td>
                            <td style="font-weight: 600;">${l.afterStock}</td>
                            <td>${l.staff || 'Hệ thống'}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        document.getElementById('modalStockLogs')?.classList.add('active');
    };

    window.PawpalOrdersModule.openAdjustStockModal = function(sku) {
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        state.activeAdjustProductSku = sku;
        const skuEl = document.getElementById('adjustSkuCode');
        const nameEl = document.getElementById('adjustProdName');
        const stockEl = document.getElementById('adjustCurrentStock');
        const priceInput = document.getElementById('adjustPriceInput');
        const statusSelect = document.getElementById('adjustStatusSelect');

        if (skuEl) skuEl.textContent = prod.sku;
        if (nameEl) nameEl.textContent = prod.name;
        if (stockEl) stockEl.textContent = `${prod.stock} món`;
        if (priceInput) priceInput.value = prod.price || '';
        if (statusSelect) statusSelect.value = prod.status || 'Đang bán';

        document.getElementById('modalAdjustStock')?.classList.add('active');
    };

    window.PawpalOrdersModule.openGoodsReceiptModal = function(prefillSku) {
        const codeInput = document.getElementById('grnReceiptCode');
        if (codeInput) codeInput.value = 'GRN-2026-' + (Math.floor(100 + Math.random() * 900));

        const picker = document.getElementById('grnProductPicker');
        if (picker) {
            picker.innerHTML = (state.products || []).map(p => `
                <option value="${p.sku}" ${p.sku === prefillSku ? 'selected' : ''}>${p.sku} - ${p.name} (Tồn hiện tại: ${p.stock})</option>
            `).join('');
        }

        state.activeGrnItems = [];
        if (prefillSku) {
            const prod = (state.products || []).find(p => p.sku === prefillSku);
            if (prod) {
                const costPrice = Math.round((prod.price || 50000) * 0.65);
                state.activeGrnItems.push({
                    sku: prod.sku,
                    name: prod.name,
                    qty: 10,
                    price: costPrice,
                    total: 10 * costPrice
                });
            }
        }

        renderGrnItemsTable();
        document.getElementById('modalGoodsReceipt')?.classList.add('active');
    };

    window.PawpalOrdersModule.updateGrnItemQty = function(idx, val) {
        const items = state.activeGrnItems || [];
        if (items[idx]) {
            items[idx].qty = Math.max(1, parseInt(val || '1', 10));
            items[idx].total = items[idx].qty * items[idx].price;
            renderGrnItemsTable();
        }
    };

    window.PawpalOrdersModule.updateGrnItemPrice = function(idx, val) {
        const items = state.activeGrnItems || [];
        if (items[idx]) {
            items[idx].price = Math.max(0, parseInt(val || '0', 10));
            items[idx].total = items[idx].qty * items[idx].price;
            renderGrnItemsTable();
        }
    };

    window.PawpalOrdersModule.removeGrnItem = function(idx) {
        const items = state.activeGrnItems || [];
        if (idx >= 0 && idx < items.length) {
            items.splice(idx, 1);
            renderGrnItemsTable();
        }
    };

    window.PawpalOrdersModule.openStocktakeModal = function() {
        const auditEl = document.getElementById('stkAuditCode');
        if (auditEl) auditEl.value = 'STK-2026-' + (Math.floor(100 + Math.random() * 900));

        const tbody = document.getElementById('stkItemsTableBody');
        const diffSummary = document.getElementById('stkTotalDiff');
        const productsList = state.products || [];

        if (tbody) {
            tbody.innerHTML = productsList.map(p => `
                <tr class="stk-row-item" data-sku="${p.sku}">
                    <td style="font-family: monospace; font-weight: 600; color: #236B48;">${p.sku}</td>
                    <td>
                        <div style="font-weight: 500;">${p.name}</div>
                        <div class="sub-meta-text">Quy cách: ${p.spec || 'Tiêu chuẩn'}</div>
                    </td>
                    <td style="text-align: center; font-weight: 600;" class="stk-system-val">${p.stock}</td>
                    <td style="text-align: center;">
                        <input type="number" class="admin-input stk-count-input" value="${p.stock}" min="0" style="width: 70px; height: 28px; text-align: center; font-weight: 700; padding: 2px;" oninput="PawpalOrdersModule.calcStocktakeDiff(this, ${p.stock})">
                    </td>
                    <td style="text-align: center; font-weight: 700;" class="stk-diff-disp text-success">Khớp (0)</td>
                    <td>
                        <select class="admin-select stk-row-reason-select" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                            <option value="Khớp số liệu">Khớp số liệu</option>
                            <option value="Hao hụt tự nhiên">Hao hụt tự nhiên</option>
                            <option value="Xuất nhầm mẫu mã">Xuất nhầm mẫu mã</option>
                            <option value="Hàng vỡ hỏng bao bì">Hàng vỡ hỏng bao bì</option>
                            <option value="Chưa nhập phiếu bổ sung">Chưa nhập phiếu bổ sung</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        }

        if (diffSummary) {
            diffSummary.textContent = '0 mặt hàng lệch';
            diffSummary.className = 'text-success';
        }

        document.getElementById('modalStocktake')?.classList.add('active');
    };

    window.PawpalOrdersModule.calcStocktakeDiff = function(inputEl, systemStock) {
        const val = parseInt(inputEl.value || '0', 10);
        const diff = val - systemStock;
        const row = inputEl.closest('.stk-row-item');
        if (!row) return;

        const diffEl = row.querySelector('.stk-diff-disp');
        const reasonSelect = row.querySelector('.stk-row-reason-select');

        if (diffEl) {
            if (diff === 0) {
                diffEl.textContent = 'Khớp (0)';
                diffEl.className = 'stk-diff-disp text-success';
                if (reasonSelect) reasonSelect.value = 'Khớp số liệu';
            } else if (diff > 0) {
                diffEl.textContent = `Thừa (+${diff})`;
                diffEl.className = 'stk-diff-disp text-warning';
                if (reasonSelect && reasonSelect.value === 'Khớp số liệu') reasonSelect.value = 'Chưa nhập phiếu bổ sung';
            } else {
                diffEl.textContent = `Thiếu (${diff})`;
                diffEl.className = 'stk-diff-disp text-danger';
                if (reasonSelect && reasonSelect.value === 'Khớp số liệu') reasonSelect.value = 'Hao hụt tự nhiên';
            }
        }

        const allRows = document.querySelectorAll('.stk-row-item');
        let diffCount = 0;
        allRows.forEach(r => {
            const count = parseInt(r.querySelector('.stk-count-input')?.value || '0', 10);
            const sys = parseInt(r.querySelector('.stk-system-val')?.textContent || '0', 10);
            if (count !== sys) diffCount++;
        });

        const diffSummary = document.getElementById('stkTotalDiff');
        if (diffSummary) {
            if (diffCount === 0) {
                diffSummary.textContent = '0 mặt hàng lệch';
                diffSummary.className = 'text-success';
            } else {
                diffSummary.textContent = `${diffCount} mặt hàng lệch`;
                diffSummary.className = 'text-warning';
            }
        }
    };

    // Quản lý đánh giá sản phẩm (Reviews)
    let activeReviewsSku = null;
    let activeReviewsFilter = 'ALL';

    window.PawpalOrdersModule.openProductReviewsModal = function(sku) {
        activeReviewsSku = sku;
        activeReviewsFilter = 'ALL';
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const titleEl = document.getElementById('productReviewsModalTitle');
        if (titleEl) titleEl.textContent = `Đánh giá sản phẩm: ${prod.name}`;

        const bigScoreEl = document.getElementById('prodReviewsScoreBig');
        const descEl = document.getElementById('prodReviewsScoreDesc');
        const totalCountEl = document.getElementById('prodReviewsCountTotal');

        const score = prod.rating ? Number(prod.rating).toFixed(1) : '5.0';
        const count = prod.reviewCount || 0;

        if (bigScoreEl) bigScoreEl.textContent = `${score} ★`;
        if (descEl) {
            const numScore = parseFloat(score);
            descEl.textContent = numScore >= 4.8 ? 'Cực kỳ hài lòng' : numScore >= 4.0 ? 'Rất hài lòng' : numScore >= 3.0 ? 'Hài lòng' : 'Cần cải thiện';
        }
        if (totalCountEl) totalCountEl.textContent = `(${count > 0 ? count : 0} nhận xét)`;

        PawpalOrdersModule.renderProductReviewsModalContent(sku);
        document.getElementById('modalProductReviews')?.classList.add('active');
    };

    window.PawpalOrdersModule.renderProductReviewsModalContent = function(sku) {
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const prodImgPath = prod.image ? (prod.image.startsWith('/') ? prod.image : '/' + prod.image) : '/assets/images/shop/products/tp-hat-01.png';
        const storageKey = `pawpal_prod_reviews_${sku}`;
        let reviews = [];
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (saved) reviews = JSON.parse(saved);
        } catch (e) {}

        if (reviews.length === 0) {
            reviews = [
                {
                    id: 'REV-01',
                    customerName: 'Trần Thị Mai Phương',
                    avatar: 'M',
                    date: '24/06/2026',
                    rating: 5,
                    variant: prod.hasVariants && prod.variants && prod.variants.length > 0 ? prod.variants[0].name : 'Tiêu chuẩn',
                    comment: `Sản phẩm ${prod.name} dùng cực kỳ ưng ý! Bé cún nhà mình ăn ngon miệng, tiêu hóa rất êm và không bị dị ứng. Đóng gói cẩn thận, giao nhanh chỉ 1 tiếng.`,
                    images: [prodImgPath],
                    reply: 'PawPal cảm ơn chị Mai Phương đã tin dùng sản phẩm! Chúc bé cưng luôn khỏe mạnh và mau lớn ạ.'
                },
                {
                    id: 'REV-02',
                    customerName: 'Nguyễn Hoàng Long',
                    avatar: 'L',
                    date: '20/06/2026',
                    rating: 5,
                    variant: prod.hasVariants && prod.variants && prod.variants.length > 1 ? prod.variants[1].name : 'Tiêu chuẩn',
                    comment: 'Hàng chính hãng chuẩn xịn, hạn sử dụng còn rất xa. Shop tư vấn nhiệt tình, sẽ ủng hộ dài lâu.',
                    images: [],
                    reply: ''
                },
                {
                    id: 'REV-03',
                    customerName: 'Phạm Thu Thảo',
                    avatar: 'T',
                    date: '15/06/2026',
                    rating: 4,
                    variant: prod.hasVariants && prod.variants && prod.variants.length > 0 ? prod.variants[0].name : 'Tiêu chuẩn',
                    comment: 'Chất lượng tốt, mùi thơm hấp dẫn. Chỉ tiếc là bên vận chuyển giao hơi trễ 1 chút so với hẹn, nhưng bù lại đóng gói bọc xốp kỹ càng.',
                    images: [prodImgPath],
                    reply: 'PawPal chân thành xin lỗi chị Thảo về trải nghiệm giao hàng. Shop đã làm việc lại với đơn vị vận chuyển để tối ưu tốc độ giao nhanh hơn ạ!'
                }
            ];
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(reviews));
            } catch (e) {}
        }

        const filterRow = document.getElementById('prodReviewsStarFilterRow');
        if (filterRow) {
            const count5 = reviews.filter(r => r.rating === 5).length;
            const count4 = reviews.filter(r => r.rating === 4).length;
            const countMedia = reviews.filter(r => r.images && r.images.length > 0).length;

            const getChipStyle = (isActive) => isActive 
                ? 'background-color: #DCEEE2; color: #165335; font-weight: 600; border-radius: var(--admin-radius); border: none; height: 26px; padding: 0 10px; font-size: 12px; cursor: pointer;'
                : 'background-color: #EEF5F1; color: #4F7A65; font-weight: 500; border-radius: var(--admin-radius); border: none; height: 26px; padding: 0 10px; font-size: 12px; cursor: pointer;';

            filterRow.innerHTML = `
                <button type="button" style="${getChipStyle(activeReviewsFilter === 'ALL')}" onclick="PawpalOrdersModule.setProductReviewsFilter('ALL')">Tất cả (${reviews.length})</button>
                <button type="button" style="${getChipStyle(activeReviewsFilter === '5')}" onclick="PawpalOrdersModule.setProductReviewsFilter('5')">5 ★ (${count5})</button>
                <button type="button" style="${getChipStyle(activeReviewsFilter === '4')}" onclick="PawpalOrdersModule.setProductReviewsFilter('4')">4 ★ (${count4})</button>
                <button type="button" style="${getChipStyle(activeReviewsFilter === 'MEDIA')}" onclick="PawpalOrdersModule.setProductReviewsFilter('MEDIA')">Có ảnh (${countMedia})</button>
            `;
        }

        let displayReviews = reviews;
        if (activeReviewsFilter === '5') displayReviews = reviews.filter(r => r.rating === 5);
        else if (activeReviewsFilter === '4') displayReviews = reviews.filter(r => r.rating === 4);
        else if (activeReviewsFilter === 'MEDIA') displayReviews = reviews.filter(r => r.images && r.images.length > 0);

        const container = document.getElementById('productReviewsListContainer');
        if (!container) return;

        if (displayReviews.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 32px 20px; color: var(--text-muted); font-size: 13px;">Không có nhận xét nào phù hợp với bộ lọc đã chọn.</div>';
            return;
        }

        container.innerHTML = displayReviews.map((r, idx) => {
            const isLast = idx === displayReviews.length - 1;
            const starsHtml = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const imagesHtml = (r.images && r.images.length > 0) ? `
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    ${r.images.map(img => {
                        const src = img.startsWith('/') ? img : '/' + img;
                        return `<img src="${src}" alt="Ảnh feedback" onerror="this.src='/assets/images/shop/products/tp-hat-01.png'" style="width: 54px; height: 54px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral); cursor: pointer;" onclick="window.open('${src}', '_blank')">`;
                    }).join('')}
                </div>
            ` : '';

            const replyHtml = r.reply ? `
                <div style="margin-top: 8px; font-size: 12.5px; line-height: 1.5; color: var(--text-main);">
                    <span style="font-weight: 600; color: #236B48;">Phản hồi từ PawPal:</span> ${r.reply}
                </div>
            ` : `
                <div style="margin-top: 8px;" id="replyBoxWrapper_${r.id}">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" class="admin-input" id="replyInput_${r.id}" placeholder="Nhập nội dung phản hồi cho khách hàng..." style="height: 30px; font-size: 12px;">
                        <button type="button" class="admin-btn admin-btn-primary" style="height: 30px; font-size: 12px; padding: 0 12px; white-space: nowrap;" onclick="PawpalOrdersModule.submitProductReviewReply('${sku}', '${r.id}')">Gửi phản hồi</button>
                    </div>
                </div>
            `;

            return `
                <div style="padding: 14px 0; ${isLast ? '' : 'border-bottom: 1px solid var(--border-neutral);'} background: transparent;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #EEF5F1; color: #236B48; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 12.5px; flex-shrink: 0;">
                                ${r.avatar || r.customerName.charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-main);">${r.customerName}</div>
                                <div style="font-size: 11.5px; color: var(--text-muted);">${r.date} • Phân loại: <span style="font-weight: 500; color: var(--text-main);">${r.variant}</span></div>
                            </div>
                        </div>
                        <div style="font-weight: 700; color: #B45309; font-size: 12.5px;">${starsHtml}</div>
                    </div>
                    <div style="font-size: 13px; color: var(--text-main); line-height: 1.55; margin-top: 6px;">${r.comment}</div>
                    ${imagesHtml}
                    ${replyHtml}
                </div>
            `;
        }).join('');
    };

    window.PawpalOrdersModule.setProductReviewsFilter = function(filter) {
        activeReviewsFilter = filter;
        if (activeReviewsSku) {
            PawpalOrdersModule.renderProductReviewsModalContent(activeReviewsSku);
        }
    };

    window.PawpalOrdersModule.submitProductReviewReply = async function(sku, reviewId) {
        const inputEl = document.getElementById(`replyInput_${reviewId}`);
        const replyText = inputEl?.value.trim();
        if (!replyText) {
            showToast('Vui lòng nhập nội dung phản hồi cho khách hàng.', 'warning');
            return;
        }

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client && reviewId && reviewId.length > 20) {
            try {
                await client.from('review').update({ shop_reply: replyText }).eq('id', reviewId);
            } catch (errRev) {
                console.warn('Lỗi khi lưu phản hồi đánh giá lên Supabase:', errRev);
            }
        }

        const storageKey = `pawpal_prod_reviews_${sku}`;
        try {
            let reviews = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
            const target = reviews.find(r => r.id === reviewId);
            if (target) {
                target.reply = replyText;
                sessionStorage.setItem(storageKey, JSON.stringify(reviews));
                showToast('Đã đăng phản hồi của cửa hàng thành công!', 'success');
                PawpalOrdersModule.renderProductReviewsModalContent(sku);
            }
        } catch (e) {
            console.error(e);
        }
    };

    window.PawpalOrdersModule.viewProductOnStorefront = function() {
        const sku = activeReviewsSku;
        if (!sku) return;
        const prod = (state.products || []).find(p => p.sku === sku);
        const prodId = prod ? (prod.id || prod.sku) : sku;
        window.open(`/pages/shop/product-detail/product-detail.html?id=${encodeURIComponent(prodId)}#tab-reviews`, '_blank');
    };

    window.PawpalOrdersModule.addTagValue = addTagValue;
    window.PawpalOrdersModule.removeTagValue = removeTagValue;
    window.PawpalOrdersModule.handleTagInputKey = handleTagInputKey;
    window.PawpalOrdersModule.toggleVariantMode = toggleVariantMode;
    window.PawpalOrdersModule.removeProductImageAtIndex = function(idx) {
        const input = document.getElementById('newProdImages');
        if (!input) return;
        const urls = input.value.split(',').map(s => s.trim()).filter(Boolean);
        if (idx >= 0 && idx < urls.length) {
            urls.splice(idx, 1);
            input.value = urls.join(', ');
            updateProductImagePreview();
        }
    };

    // Khởi tạo sự kiện
    initProductsEvents();
})();
