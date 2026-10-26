// tab-order-products.js - Subtab Quản lý Sản phẩm và Kho của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders Products] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const { formatVND, formatDateTime, showToast, matchSearch, persistProductsData, syncOrdersAndProductsFromSupabase } = helpers;

    const PRODUCTS_PER_PAGE = 10;
    let productsCurrentPage = parseInt(sessionStorage.getItem('pawpal_admin_products_page') || '1', 10);
    if (isNaN(productsCurrentPage) || productsCurrentPage < 1) productsCurrentPage = 1;

    let globalDbCategories = [];
    let attr1TagValues = [];
    let attr2TagValues = [];

    // Nhận diện thương hiệu từ tên sản phẩm hoặc thông tin cấu hình
    function updateCategoryFilterDropdown(dbCategories = []) {
        if (Array.isArray(dbCategories)) {
            globalDbCategories = dbCategories;
        }
        const select = document.getElementById('productFilterCategory');
        if (!select) return;

        const currentVal = select.value || 'ALL';
        const distinctCats = [...new Set(globalDbCategories.map(c => c.category_name).filter(Boolean))];
        const categoryInput = document.getElementById('newProdCategory');
        if (categoryInput && !categoryInput.dataset.v1Autocomplete) {
            categoryInput.dataset.v1Autocomplete = 'true';
            const parent = categoryInput.parentElement;
            parent.style.position = 'relative';
            const dropdown = document.createElement('div');
            dropdown.className = 'customer-autocomplete-popover';
            dropdown.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid #ECF2EE;border-radius:9px;max-height:240px;overflow:auto;overscroll-behavior:contain;z-index:2500';
            const render = () => {
                dropdown.replaceChildren();
                for (const c of globalDbCategories.filter(c => matchSearch(c.category_name, categoryInput.value))) {
                    const button = document.createElement('button');
                    button.type = 'button'; button.className = 'admin-btn';
                    button.style.cssText = 'display:block;background:transparent;width:100%;text-align:left';
                    button.textContent = c.category_name;
                    button.onclick = () => { categoryInput.value = c.category_name; dropdown.style.display = 'none'; };
                    dropdown.append(button);
                }
                dropdown.style.display = 'block';
            };
            parent.append(dropdown);
            categoryInput.addEventListener('input', render);
            categoryInput.addEventListener('focus', render);
            categoryInput.addEventListener('keydown', e => { if (e.key === 'Escape') dropdown.style.display = 'none'; });
            categoryInput.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 150));
        }

        const defaultOption = new Option('Tất cả danh mục', 'ALL');
        select.replaceChildren(defaultOption, ...distinctCats.map(name => new Option(name, name)));

        if (distinctCats.includes(currentVal)) {
            select.value = currentVal;
        } else {
            select.value = 'ALL';
        }
    }

    // Render bảng sản phẩm
    async function renderProductsTable({skipFetch=false}={}) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        if(state.serverProductPagination&&!skipFetch){
            tbody.inert=true;tbody.setAttribute('aria-busy','true');
            const filters={query:(document.getElementById('productSearchInput')?.value||'').trim(),category:document.getElementById('productFilterCategory')?.value||'ALL',stock:document.getElementById('productFilterStockStatus')?.value||'ALL'};
            const success=await PawpalOrders.fetchProductsData({filters,page:productsCurrentPage,render:false});
            if(success===null)return;
            tbody.inert=false;tbody.removeAttribute('aria-busy');
            if(success)productsCurrentPage=state.productPageMeta.page;
        }
        if(skipFetch){tbody.inert=false;tbody.removeAttribute('aria-busy');}
        if (state.productsError) {
            renderProductsPagination(0);
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải dữ liệu. Vui lòng tải lại trang.</td></tr>';
            return;
        }


        const searchVal = (document.getElementById('productSearchInput')?.value || '').trim();
        const catVal = document.getElementById('productFilterCategory')?.value || 'ALL';
        const stockStatusVal = document.getElementById('productFilterStockStatus')?.value || 'ALL';

        const productsList = state.products || [];
        if (!state.productsLoaded) return;
        const metrics = {statTotalProducts:productsList.length,statInStockProducts:productsList.filter(p=>p.stock>0).length,statLowStockProducts:productsList.filter(p=>p.stock>0 && p.stock<=p.minStock).length,statOutStockProducts:productsList.filter(p=>p.stock===0).length,statTotalStockValue:productsList.some(p=>p.variants.some(v=>v.stock===null))?'Chưa đủ dữ liệu':formatVND(productsList.reduce((sum,p)=>sum+p.variants.reduce((n,v)=>n+v.stock*v.costPrice,0),0))};
        Object.entries(metrics).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});
        if(state.serverProductPagination)Object.entries(state.productPageMeta?.counts||{}).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=id==='statTotalStockValue'?(value===null?'Ch\u01b0a \u0111\u1ee7 d\u1eef li\u1ec7u':formatVND(value)):String(value);});
        delete tbody.dataset.loadingSkeleton;


        const filtered = state.serverProductPagination ? productsList : productsList.filter(p => {
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
                const matchBrand = matchSearch(p.brand || '', searchVal);
                if (!matchSku && !matchName && !matchBrand) return false;
            }
            return true;
        });

        // Tính toán phân trang
        const totalPages = Math.ceil((state.serverProductPagination?state.productPageMeta.total:filtered.length) / PRODUCTS_PER_PAGE) || 1;
        if (productsCurrentPage > totalPages) productsCurrentPage = totalPages;
        if (productsCurrentPage < 1) productsCurrentPage = 1;
        sessionStorage.setItem('pawpal_admin_products_page', productsCurrentPage);

        const startIdx = (productsCurrentPage - 1) * PRODUCTS_PER_PAGE;
        const pagedProducts = state.serverProductPagination ? filtered : filtered.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

        if (pagedProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy sản phẩm nào trong kho phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            renderProductsPagination(0);
            return;
        }

        // Bảng tra cứu số lượng tạm giữ theo SKU và theo Tên từ các đơn hàng đang xử lý
        tbody.innerHTML = pagedProducts.map(p => {
            let stockBadge = '';
            let rowAlertClass = '';
            if (p.status === 'Tạm ngưng') {
                stockBadge = '<span class="admin-badge badge-neutral">Tạm ngưng</span>';
                rowAlertClass = 'row-locked';
            } else if (p.stock === null) {
                stockBadge = '<span class="admin-badge badge-warning">Chưa đủ dữ liệu tồn</span>';
            } else if (p.stock === 0) {
                stockBadge = '<span class="admin-badge badge-cancelled">Hết hàng</span>';
                rowAlertClass = 'row-alert-danger';
            } else if (p.stock <= p.minStock) {
                stockBadge = '<span class="admin-badge badge-warning">Sắp hết hàng</span>';
                rowAlertClass = 'row-alert-warning';
            } else {
                stockBadge = '<span class="admin-badge badge-paid">Còn hàng</span>';
            }

            const alertDot = (p.stock!==null && p.stock <= p.minStock && p.status !== 'Tạm ngưng')
                ? `<span class="alert-indicator text-${p.stock === 0 ? 'danger' : 'warning'}">• ${p.stock === 0 ? 'Hết hàng' : 'Cần nhập hàng'}</span>`
                : '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';

            const esc = window.PawpalOrdersModule?.escapeHtml || (s => String(s || ''));
            const imgSrc = p.image || (Array.isArray(p.images) ? p.images[0] : (typeof p.images === 'string' ? p.images.split(',')[0].trim() : '/assets/images/shop/products/tp-hat-01.png'));

            const itemBrand = (p.brand && p.brand !== 'Chưa rõ' && p.brand !== '—') ? p.brand : '\u2014';
            const totalStock = p.stock;
            const reserved = p.reserved;
            const available = totalStock===null?'—':Math.max(0,totalStock-reserved);

            return `
                <tr class="${rowAlertClass}">
                    <td style="font-family: monospace; font-weight: 600; color: #236B48;">${esc(p.sku)}</td>
                    <td>
                        <div class="prod-item-row">
                            ${imgSrc?`<img src="${esc(imgSrc)}" alt="${esc(p.name)}" class="prod-thumb" loading="lazy" decoding="async" onerror="this.style.display='none'">`:""}
                            <div class="prod-info-cell">
                                <a href="javascript:void(0)" class="prod-title btn-open-edit-prod" data-sku="${esc(p.sku)}">${esc(p.name)}</a>
                                <span class="prod-sku-tag">Quy cách: ${esc(p.spec || '—')}</span>
                            </div>
                        </div>
                    </td>
                    <td>${esc(p.category)}</td>
                    <td><span style="font-weight: 500; color: #203A2C;">${esc(itemBrand)}</span></td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${formatVND(p.price)}</div>
                        <div class="sub-meta-text">Vốn: ${formatVND(p.costPrice || 0)}</div>
                    </td>
                    <td style="text-align: center;">${Number(p.reviewCount)>0 ? Number(p.rating).toFixed(1) : "—"}</td>
                    <td style="text-align: center;">
                        <div style="font-weight: 700; font-size: 13.5px;">${p.stock===null?"—":p.stock} <span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">${esc(p.unit || 'món')}</span></div>
                        <div class="sub-meta-text">Ngưỡng: ${p.minStock===null?"—":p.minStock}</div>
                    </td>
                    <td style="text-align: center;"><span style="font-weight: 600; color: ${reserved > 0 ? '#C05621' : 'var(--text-muted)'};">${reserved}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: ${available > 0 ? '#236B48' : '#8F2424'};">${available}</span></td>
                    <td>${alertDot}</td>
                    <td>${stockBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-stock-action-trigger" data-sku="${esc(p.sku)}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-open-edit-prod').forEach(el => {
            el.addEventListener('click', () => {
                const s = el.getAttribute('data-sku');
                if (window.PawpalOrdersModule?.openEditProductModal) {
                    window.PawpalOrdersModule.openEditProductModal(s);
                }
            });
        });
        tbody.querySelectorAll('.btn-stock-action-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
                const s = el.getAttribute('data-sku');
                if (window.PawpalOrdersModule?.openStockActionMenu) {
                    window.PawpalOrdersModule.openStockActionMenu(e, s);
                }
            });
        });

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
        html += `<button type="button" class="btn-pagination ${prevDisabled}" ${prevDisabled} data-page="prev" title="Trang trước">&lt;</button>`;

        const firstPage = Math.max(1, Math.min(productsCurrentPage - 2, totalPages - 4));
        const lastPage = Math.min(totalPages, firstPage + 4);
        for (let p = firstPage; p <= lastPage; p++) {
            const activeClass = p === productsCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = productsCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" ${nextDisabled} data-page="next" title="Trang sau">&gt;</button>`;

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
    function renderGrnItemsTable(){
        const tbody=document.getElementById('grnItemsTableBody'),items=state.activeGrnItems||[];tbody.replaceChildren();
        document.getElementById('grnTotalQtyDisp').textContent=items.reduce((n,i)=>n+Number(i.qty||0),0);
        document.getElementById('grnTotalAmountDisp').textContent=formatVND(items.reduce((n,i)=>n+Number(i.qty||0)*Number(i.price||0),0));
        state.grnPage=Math.min(state.grnPage||1,Math.max(1,Math.ceil(items.length/10)));
        if(!items.length){const row=tbody.insertRow(),cell=row.insertCell();cell.colSpan=6;cell.textContent='Ch\u01b0a c\u00f3 m\u1eb7t h\u00e0ng. Ch\u1ecdn bi\u1ebfn th\u1ec3 v\u00e0 b\u1ea5m Th\u00eam d\u00f2ng.';}
        for(const item of items.slice((state.grnPage-1)*10,state.grnPage*10)){
            const row=tbody.insertRow();row.insertCell().textContent=item.sku;row.insertCell().textContent=item.name;
            const quantity=document.createElement('input');quantity.type='number';quantity.className='admin-input';quantity.min=1;quantity.step=1;quantity.value=item.qty;
            const price=document.createElement('input');price.type='number';price.className='admin-input';price.min=0;price.step='any';price.value=item.price;
            const total=document.createElement('td');total.textContent=formatVND(Number(item.qty||0)*Number(item.price||0));
            const sync=()=>{item.qty=quantity.value===''?null:Number(quantity.value);item.price=price.value===''?null:Number(price.value);item.total=Number(item.qty||0)*Number(item.price||0);total.textContent=formatVND(item.total);document.getElementById('grnTotalQtyDisp').textContent=items.reduce((n,i)=>n+Number(i.qty||0),0);document.getElementById('grnTotalAmountDisp').textContent=formatVND(items.reduce((n,i)=>n+Number(i.qty||0)*Number(i.price||0),0));};
            quantity.oninput=sync;price.oninput=sync;row.insertCell().append(quantity);row.insertCell().append(price);row.append(total);
            const remove=document.createElement('button');remove.type='button';remove.className='admin-btn';remove.textContent='X\u00f3a';remove.onclick=()=>{state.activeGrnItems=items.filter(i=>i!==item);renderGrnItemsTable();};row.insertCell().append(remove);
        }
        let pager=document.getElementById('salesReceiptPager');if(!pager){pager=document.createElement('div');pager.id='salesReceiptPager';pager.style.cssText='display:flex;justify-content:center;gap:12px;margin-top:6px';tbody.closest('.table-responsive-wrapper').after(pager);}pager.replaceChildren();
        for(const [label,page] of [['<',state.grnPage-1],[String(state.grnPage),state.grnPage],['>',state.grnPage+1]]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.textContent=label;button.style.cssText='background:transparent;border:none;padding:2px 8px;color:#236B48';if(label!=='<'&&label!=='>')button.style.cssText='background:#236B48;border:none;padding:2px 8px;color:#fff';button.disabled=page<1||page>Math.max(1,Math.ceil(items.length/10));button.onclick=()=>{state.grnPage=page;renderGrnItemsTable();};pager.append(button);}
    }

    function renderAttributeTags(group) {
        const listContainer = document.getElementById(group === 1 ? 'attr1TagsList' : 'attr2TagsList');
        const input = document.getElementById(group === 1 ? 'attr1TagInput' : 'attr2TagInput');
        if (!listContainer) return;

        const tags = group === 1 ? attr1TagValues : attr2TagValues;
        listContainer.innerHTML = '';

        if (input) {
            input.placeholder = tags.length > 0 ? 'Thêm giá trị...' : 'Nhập giá trị rồi nhấn Enter hoặc phẩy (,)...';
        }

        tags.forEach((tag, idx) => {
            const chip = document.createElement('span');
            chip.className = 'tag-item-chip';
            chip.innerHTML = `${tag} <span class="tag-item-remove" title="Xóa" onclick="event.stopPropagation(); PawpalOrdersModule.removeTagValue(${group}, ${idx})">&times;</span>`;
            listContainer.appendChild(chip);
        });
    }

    function addTagValue(group, val) {
        if (!val) return;
        const parts = String(val).split(',').map(s => s.trim()).filter(Boolean);
        const arr = group === 1 ? attr1TagValues : attr2TagValues;
        let changed = false;
        parts.forEach(p => {
            if (!arr.includes(p)) {
                arr.push(p);
                changed = true;
            }
        });
        if (changed) {
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
            const val = input.value.trim();
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

    function applyBulkVariantValues() {
        const cost = document.getElementById('bulkCostPrice')?.value;
        const price = document.getElementById('bulkPrice')?.value;
        const orig = document.getElementById('bulkOriginalPrice')?.value;
        const stock = document.getElementById('bulkStock')?.value;
        const img = document.getElementById('bulkImage')?.value?.trim();

        const rows = document.querySelectorAll('#productVariantsTableBody tr.variant-row-item');
        if (rows.length === 0) return;

        rows.forEach(r => {
            if (cost !== '' && cost !== undefined) {
                const el = r.querySelector('.variant-cost-input');
                if (el) el.value = cost;
            }
            if (price !== '' && price !== undefined) {
                const el = r.querySelector('.variant-price-input');
                if (el) el.value = price;
            }
            if (orig !== '' && orig !== undefined) {
                const el = r.querySelector('.variant-orig-input');
                if (el) el.value = orig;
            }
            if (stock !== '' && stock !== undefined) {
                const el = r.querySelector('.variant-stock-input');
                if (el) el.value = stock;
            }
            if (img) {
                const el = r.querySelector('.variant-img-input');
                if (el) el.value = img;
            }
        });
        showToast('Đã áp dụng thông số hàng loạt cho tất cả biến thể!', 'success');
    }

    function toggleVariantMode(isMultiple) {
        const chk = document.getElementById('chkEnableVariants');
        if (chk) chk.checked = !!isMultiple;

        const singleBox = document.getElementById('singleProductPriceBox');
        const multiBox = document.getElementById('multipleProductVariantsBox');
        if (singleBox) singleBox.style.display = isMultiple ? 'none' : 'block';
        if (multiBox) multiBox.style.display = isMultiple ? 'block' : 'none';

        if (isMultiple) {
            renderAttributeTags(1);
            renderAttributeTags(2);
            generateVariantMatrix();
        } else {
            attr1TagValues = [];
            attr2TagValues = [];
            renderAttributeTags(1);
            renderAttributeTags(2);
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
                    image: v.images?.join(', ') || v.image,
                    colorHex: v.raw?.color?.hex_code || ''
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
                    image: r.querySelector('.variant-img-input')?.value || '',
                    colorHex: r.querySelector('.variant-color-hex')?.value || ''
                };
            });
        }

        const baseSku = document.getElementById('newProdSku')?.value.trim() || 'SKU';
        const combinations = [];

        if (attr1Vals.length === 0 && attr2Vals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        Vui lòng thêm ít nhất một giá trị cho nhóm phân loại 1 ở trên để tạo bảng biến thể.
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

        const fallbackCost = document.getElementById('newProdCostPrice')?.value || '';
        const fallbackPrice = document.getElementById('newProdPrice')?.value || '';
        const fallbackOrig = document.getElementById('newProdOriginalPrice')?.value || '';
        const fallbackStock = '';
        const fallbackImg = document.getElementById('newProdImages')?.value?.split(',')[0]?.trim() || '';

        // Opening an existing product must retain its actual tuples rather than
        // silently create the missing Cartesian combinations.
        const visibleCombinations = prefillVariants?.length
            ? prefillVariants.map(v=>({v1:v.attr1||'',v2:v.attr2||''})) : combinations;
        const escapeValue=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        tbody.innerHTML = visibleCombinations.map((c, idx) => {
            const key = c.v2 ? `${escapeValue(c.v1)}|${escapeValue(c.v2)}` : c.v1;
            const saved = existingDataMap[key] || {};
            const autoSku = saved.sku || `${baseSku}-${String(idx + 1).padStart(2, '0')}`;
            const autoCost = saved.costPrice !== undefined ? saved.costPrice : fallbackCost;
            const autoPrice = saved.price !== undefined ? saved.price : fallbackPrice;
            const autoOrig = saved.originalPrice !== undefined ? saved.originalPrice : fallbackOrig;
            const autoStock = saved.stock !== undefined ? saved.stock : fallbackStock;
            const autoImg = saved.image || fallbackImg;

            return `
                <tr class="variant-row-item" data-attr-1="${escapeValue(c.v1)}" data-attr-2="${escapeValue(c.v2)}">
                    <td style="font-weight: 600; color: #236B48;"><div class="variant-label-cell"><span>${escapeValue(c.v1 || '--')}</span>${(attr1Name==='M\u00e0u s\u1eafc'||(attr2Vals.length>0&&attr2Name==='M\u00e0u s\u1eafc'))?'<input class="admin-input variant-color-hex" aria-label="Mã màu" placeholder="#RRGGBB" value="'+escapeValue(saved.colorHex||'')+'">':''}</div></td>
                    ${attr2Vals.length > 0 ? `<td style="font-weight: 500;">${escapeValue(c.v2)}</td>` : ''}
                    <td>
                        <input type="text" class="admin-input variant-sku-input" value="${escapeValue(autoSku)}" placeholder="Mã SKU *" style="height: 28px; font-size: 11.5px; padding: 0 6px; font-family: monospace;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-cost-input" value="${escapeValue(autoCost)}" placeholder="Vốn (đ) *" min="0" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-price-input" value="${escapeValue(autoPrice)}" placeholder="Bán (đ) *" min="1" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-orig-input" value="${escapeValue(autoOrig)}" placeholder="Gốc (đ)" min="0" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="number" class="admin-input variant-stock-input" value="${escapeValue(autoStock)}" placeholder="Tồn *" min="0" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td>
                        <input type="text" class="admin-input variant-img-input" value="${escapeValue(autoImg)}" placeholder="Đường dẫn ảnh" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="tag-item-remove" style="color: #DC2626; cursor: pointer; font-size: 14px; background: none; border: none;" title="Xóa dòng" onclick="this.closest('tr').remove()">&times;</button>
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

        container.replaceChildren();
        urls.forEach((url, idx) => {
            const figure = document.createElement('div');
            figure.style.cssText='width:90px;display:flex;flex-direction:column;gap:4px';
            const image = document.createElement('img');
            image.alt='\u1ea2nh '+(idx+1);image.style.cssText='width:68px;height:68px;object-fit:cover;border-radius:9px';
            if (/^(https?:\/\/|\/?assets\/)/i.test(url)) image.src=url.startsWith('assets/')?'/'+url:url;
            image.onerror=()=>{image.removeAttribute('src');image.alt='Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c \u1ea3nh';};
            const remove=document.createElement('button');remove.type='button';remove.className='admin-btn';remove.textContent='X\u00f3a';remove.onclick=()=>window.PawpalOrdersModule.removeProductImageAtIndex(idx);
            figure.append(image,remove);container.append(figure);
        });
    }

    // Khởi tạo các sự kiện giao diện cho Subtab Products
    let isProductsEventsInitialized = false;
    function initProductsEvents() {
        if (isProductsEventsInitialized) return;
        isProductsEventsInitialized = true;
        document.getElementById('formAddProduct')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('formGoodsReceipt')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('formStocktake')?.addEventListener('submit', (e) => e.preventDefault());

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
        document.getElementById('btnExportProductStock')?.addEventListener('click', async event => {
            if(!window.XLSX)return;
            const button=event.currentTarget;button.disabled=true;
            let productsList;try{productsList=state.serverProductPagination?(await window.PawpalOrderV1.products()).products:state.products||[];}catch(error){showToast('Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u xu\u1ea5t kho.','warning');return;}finally{button.disabled=false;}
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
        document.getElementById('btnSubmitAddProduct')?.addEventListener('click', async event => {
            const value = id => document.getElementById(id)?.value.trim() ?? '';
            const numeric = id => value(id)==='' ? null : Number(value(id));
            const previous = state.productEditSnapshot;
            const variants = [];
            const attrKey = label => ({'Ph\u00e2n lo\u1ea1i':'variant_name','H\u01b0\u01a1ng v\u1ecb':'flavor_name','K\u00edch th\u01b0\u1edbc':'size_name','M\u00e0u s\u1eafc':'color_name'})[label];
            if (document.getElementById('chkEnableVariants').checked) {
                const key1=attrKey(value('attr1Name')),key2=attrKey(value('attr2Name'));
                if (!key1 || (attr2TagValues.length && (!key2 || key1===key2))) { showToast('Ch\u1ecdn nh\u00f3m thu\u1ed9c t\u00ednh: H\u01b0\u01a1ng v\u1ecb, K\u00edch th\u01b0\u1edbc ho\u1eb7c M\u00e0u s\u1eafc.', 'warning'); return; }
                for (const row of document.querySelectorAll('#productVariantsTableBody .variant-row-item')) {
                    const read = cls => row.querySelector(cls)?.value.trim() ?? '';
                    const sku=read('.variant-sku-input');
                    const old=previous?.variants.find(v => v.sku===sku || (v.attr1===row.getAttribute('data-attr-1') && v.attr2===row.getAttribute('data-attr-2')));
                    const v={id:old?.id||crypto.randomUUID(),sku,cost_price:read('.variant-cost-input')===''?null:Number(read('.variant-cost-input')),sale_price:read('.variant-price-input')===''?null:Number(read('.variant-price-input')),compare_at_price:read('.variant-orig-input')||null,stock:read('.variant-stock-input')===''?null:Number(read('.variant-stock-input')),minimum_stock:numeric('newProdMinStock'),status:old?.status||'active',color_id:old?.raw.color_id||null,size_id:old?.raw.size_id||null,flavor_id:old?.raw.flavor_id||null};
                    v.color_hex=read('.variant-color-hex');
                    v.images=old?.images?.length&&read('.variant-img-input')===old.image?[...old.images]:read('.variant-img-input').split(',').map(v=>v.trim()).filter(Boolean);
                    v[key1]=row.getAttribute('data-attr-1');
                    if (attr2TagValues.length) v[key2]=row.getAttribute('data-attr-2');
                    variants.push(v);
                }
            } else {
                const old=previous?.variants[0];
                variants.push({id:old?.id||state.singleVariantId,sku:value('newProdSku'),variant_name:old?.raw?.variant_name||'M\u1eb7c \u0111\u1ecbnh',cost_price:numeric('newProdCostPrice'),sale_price:numeric('newProdPrice'),compare_at_price:value('newProdOriginalPrice')||null,stock:numeric('newProdInitialStock'),minimum_stock:numeric('newProdMinStock'),status:old?.status||'active',color_id:old?.raw.color_id||null,size_id:old?.raw.size_id||null,flavor_id:old?.raw.flavor_id||null});
            }
            const category=globalDbCategories.find(c=>c.category_name===value('newProdCategory'));
            const specs={...(previous?.raw.specs && typeof previous.raw.specs==='object'?previous.raw.specs:{})};
            for (const [key,id] of [['quy_cach','newProdSpec'],['features','newProdFeatures'],['feeding_guide','newProdFeedingGuide'],['expiry','newProdExpiry'],['storage','newProdStorage']]) {
                if (value(id)) specs[key]=value(id); else delete specs[key];
            }
            const details={category_id:category?.id||null,product_name:value('newProdName'),unit:value('newProdUnit'),slug:previous?.raw.slug||('product-'+state.productSaveId),brand_name:value('newProdBrand'),target_pet:value('newProdPetType'),origin:value('newProdOrigin'),status:value('newProdStatus')==='T\u1ea1m ng\u01b0ng'?'inactive':'active',description:value('newProdDescription'),ingredients:value('newProdIngredients'),benefits:value('newProdBenefits'),usage_instructions:value('newProdUsage'),badge:value('newProdBadge'),specs,images:value('newProdImages').split(',').map(v=>v.trim()).filter(Boolean)};
            event.currentTarget.disabled=true;
            try {
                const {error}=await window.getSupabaseClient().rpc('save_admin_sales_product',{p_request_id:state.productSaveRequest,p_product_id:state.productSaveId,p_expected_updated_at:previous?.updatedAt||null,p_details:details,p_variants:variants});
                if (error) throw error;
                document.getElementById('modalAddProduct').classList.remove('active');
                await window.PawpalOrders.fetchProductsData({force:true});
                showToast('\u0110\u00e3 l\u01b0u s\u1ea3n ph\u1ea9m.');
            } catch(err) { showToast(err.message,'danger'); }
            finally { document.getElementById('btnSubmitAddProduct').disabled=false; }
        });

        // Xác nhận lưu điều chỉnh tồn kho
        document.getElementById('formAdjustStock')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('btnSubmitAdjustStock')?.addEventListener('click', async (event) => {
            const product = state.products.find(p => p.sku === state.activeAdjustProductSku);
            const variant = product?.variants.find(v => v.id === state.adjustVariantId);
            if (!variant) { showToast('Vui lòng chọn biến thể cần điều chỉnh.', 'warning'); return; }
            if (document.getElementById('adjustQuantityInput').value === '') { showToast('Vui lòng nhập số lượng.', 'warning'); return; }
            const button = event.currentTarget;
            button.disabled = true;
            try {
                const result = await window.getSupabaseClient().rpc('adjust_admin_sales_stock', {
                    p_request_id: state.adjustRequestId,
                    p_variant_id: variant.id,
                    p_details: {
                        operation: document.getElementById('adjustOperationType').value,
                        quantity: Number(document.getElementById('adjustQuantityInput').value),
                        expected_stock: variant.stock,
                        expected_updated_at: product.updatedAt,
                        expected_variant_updated_at: variant.raw.updated_at,
                        price: document.getElementById('adjustPriceInput').value || null,
                        status: document.getElementById('adjustStatusSelect').value,
                        reason: document.getElementById('adjustReasonSelect').value
                    }
                });
                if (result.error) throw result.error;
                document.getElementById('modalAdjustStock').classList.remove('active');
                await window.PawpalOrders.fetchProductsData({force:true});
                showToast('Đã ghi sổ kho.');
            } catch (err) { showToast(err.message, 'danger'); }
            finally { button.disabled = false; }
        });

        // Nút mở modal nhập hàng NCC
        document.getElementById('btnOpenGoodsReceiptModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openGoodsReceiptModal();
        });

        // Nút thêm dòng sản phẩm vào phiếu nhập
        document.getElementById('btnGrnAddItem')?.addEventListener('click',()=>{
            const id=document.getElementById('grnProductPicker').value,v=inventoryVariants().find(v=>v.id===id);if(!v)return;
            const old=state.activeGrnItems.find(i=>i.variantId===id);
            if(old){old.qty+=1;old.total=old.qty*old.price;}
            else state.activeGrnItems.push({...v,variantId:v.id,qty:1,price:v.costPrice,total:v.costPrice});
            renderGrnItemsTable();
        });

        // Xác nhận nhập kho và cộng dồn tồn
        document.getElementById('btnSubmitGoodsReceipt')?.addEventListener('click',async event=>{
            const items=state.activeGrnItems||[];
            const supplier=document.getElementById('grnSupplierSelect').value;
            if(!supplier||!items.length||!document.getElementById('grnReceivedConfirmed').checked){showToast('Ch\u1ecdn nh\u00e0 cung c\u1ea5p, m\u1eb7t h\u00e0ng v\u00e0 x\u00e1c nh\u1eadn \u0111\u00e3 nh\u1eadn h\u00e0ng.','warning');return;}
            event.currentTarget.disabled=true;
            try{
                const {error}=await window.getSupabaseClient().rpc('post_admin_sales_inventory_batch',{p_request_id:state.grnRequestId,p_mode:'receipt',p_details:{supplier_id:supplier,invoice:document.getElementById('grnInvoiceNo').value.trim(),reason:document.getElementById('grnNoteInput').value.trim(),confirmed:true},p_lines:items.map(i=>({variant_id:i.variantId,quantity:i.qty,price:i.price}))});if(error)throw error;
                document.getElementById('modalGoodsReceipt').classList.remove('active');await PawpalOrders.fetchProductsData({force:true});showToast('\u0110\u00e3 ghi phi\u1ebfu nh\u1eadp v\u00e0 s\u1ed5 kho.');
            }catch(error){showToast(error.code==='PT409'?'Y\u00eau c\u1ea7u ho\u1eb7c h\u00f3a \u0111\u01a1n nh\u00e0 cung c\u1ea5p \u0111\u00e3 \u0111\u01b0\u1ee3c ghi.':'Ki\u1ec3m tra nh\u00e0 cung c\u1ea5p, s\u1ed1 l\u01b0\u1ee3ng, gi\u00e1 nh\u1eadp v\u00e0 l\u00fd do.','warning');}
            finally{document.getElementById('btnSubmitGoodsReceipt').disabled=false;}
        });

        document.getElementById('btnSubmitStocktake')?.addEventListener('click',async event=>{
            const lines=[...state.stocktakeCounts.entries()].map(([id,count])=>{const v=state.stocktakeSnapshot.find(v=>v.id===id);return {variant_id:id,quantity:Number(count.quantity),expected_stock:v.stock,expected_last_updated_at:v.lastUpdatedAt,reason:count.reason};});
            if(!lines.length||!document.getElementById('stkConfirmed').checked){showToast('Nh\u1eadp s\u1ed1 \u0111\u1ebfm th\u1ef1c t\u1ebf v\u00e0 x\u00e1c nh\u1eadn \u0111\u00e3 ki\u1ec3m k\u00ea.','warning');return;}
            event.currentTarget.disabled=true;
            try{const {error}=await window.getSupabaseClient().rpc('post_admin_sales_inventory_batch',{p_request_id:state.stocktakeRequestId,p_mode:'stocktake',p_details:{reason:document.getElementById('stkReasonSelect').value,confirmed:true},p_lines:lines});if(error)throw error;
                document.getElementById('modalStocktake').classList.remove('active');await PawpalOrders.fetchProductsData({force:true});showToast('\u0110\u00e3 ghi k\u1ebft qu\u1ea3 ki\u1ec3m k\u00ea.');
            }catch(error){showToast(error.code==='PT409'?'T\u1ed3n kho \u0111\u00e3 bi\u1ebfn \u0111\u1ed9ng. M\u1edf l\u1ea1i \u0111\u1ec3 ki\u1ec3m k\u00ea v\u00e0 \u0111\u1ed1i chi\u1ebfu.':'Kh\u00f4ng th\u1ec3 ghi ki\u1ec3m k\u00ea; ki\u1ec3m tra s\u1ed1 \u0111\u1ebfm v\u00e0 ph\u1ea7n t\u1ed3n \u0111\u00e3 gi\u1eef.','warning');}
            finally{document.getElementById('btnSubmitStocktake').disabled=false;}
        });

        document.getElementById('btnConfirmToggleProductStatus')?.addEventListener('click',async event=>{
            const p=state.toggleProductSnapshot,v=p?.variants[0];if(!v)return;
            event.currentTarget.disabled=true;
            try{const {error}=await window.getSupabaseClient().rpc('adjust_admin_sales_stock',{p_request_id:state.toggleProductRequest,p_variant_id:v.id,p_details:{operation:'SET',quantity:v.stock,expected_stock:v.stock,expected_updated_at:p.updatedAt,expected_variant_updated_at:v.raw.updated_at,price:null,status:p.raw.status==='active'?'inactive':'active',reason:'\u0110\u1ed5i tr\u1ea1ng th\u00e1i kinh doanh s\u1ea3n ph\u1ea9m'}});if(error)throw error;
                document.getElementById('modalConfirmToggleProductStatus').classList.remove('active');await PawpalOrders.fetchProductsData({force:true});showToast('\u0110\u00e3 l\u01b0u tr\u1ea1ng th\u00e1i kinh doanh.');
            }catch(error){showToast(error.code==='PT409'?'S\u1ea3n ph\u1ea9m ho\u1eb7c s\u1ed5 kho \u0111\u00e3 thay \u0111\u1ed5i. M\u1edf l\u1ea1i \u0111\u1ec3 \u0111\u1ed1i chi\u1ebfu.':'Kh\u00f4ng th\u1ec3 \u0111\u1ed5i tr\u1ea1ng th\u00e1i s\u1ea3n ph\u1ea9m.','warning');}
            finally{document.getElementById('btnConfirmToggleProductStatus').disabled=false;}
        });

        // Hỗ trợ kiểm thử tự động cho modal9, modal10 & modal13
        if (window.location.search.includes('v=modal9')) {
            setTimeout(() => {
                const prod = (state.products || [])[0];
                if (prod) PawpalOrdersModule.openAdjustStockModal(prod.sku);
            }, 600);
        }
        if (window.location.search.includes('v=modal10')) {
            setTimeout(() => {
                PawpalOrdersModule.openAddProductModal();
            }, 600);
        }
        if (window.location.search.includes('v=modal13')) {
            setTimeout(() => {
                const prod = (state.products || [])[0];
                if (prod) PawpalOrdersModule.openStockLogsModal(prod.sku);
            }, 600);
        }
        if (window.location.search.includes('v=modal14')) {
            setTimeout(() => {
                PawpalOrdersModule.openGoodsReceiptModal();
            }, 600);
        }
        if (window.location.search.includes('v=modal15')) {
            setTimeout(() => {
                PawpalOrdersModule.openStocktakeModal();
            }, 600);
        }
        if (window.location.search.includes('v=modal16')) {
            setTimeout(() => {
                const prod = (state.products || [])[0];
                if (prod) PawpalOrdersModule.openConfirmToggleStatusModal(prod.sku);
            }, 600);
        }
        if (window.location.search.includes('v=modal18')) {
            setTimeout(() => {
                const prod = (state.products || [])[0];
                if (prod) PawpalOrdersModule.openProductReviewsModal(prod.sku);
            }, 600);
        }
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
        document.querySelector('#modalAddProduct .admin-modal-card').scrollTop=0;
        state.productEditSnapshot=null;state.productSaveId=crypto.randomUUID();state.productSaveRequest=crypto.randomUUID();state.singleVariantId=crypto.randomUUID();
        const titleEl = document.getElementById('productModalTitle');
        const submitBtn = document.getElementById('btnSubmitAddProduct');
        const editSkuInput = document.getElementById('editProductOriginalSku');

        if (titleEl) titleEl.textContent = 'Thêm sản phẩm mới';
        if (submitBtn) submitBtn.textContent = 'Lưu sản phẩm';
        if (editSkuInput) editSkuInput.value = '';

        const sttInput = document.getElementById('newProdStt');
        if (sttInput) sttInput.value = (state.productPageMeta?.counts?.statTotalProducts ?? (state.products||[]).length) + 1;

        const inputs = [
            'newProdSku', 'newProdName', 'newProdBrand', 'newProdSpec', 'newProdBadge',
            'newProdFeatures', 'newProdCostPrice', 'newProdPrice', 'newProdOriginalPrice',
            'newProdDescription', 'newProdIngredients', 'newProdBenefits', 'newProdUsage',
            'newProdFeedingGuide', 'newProdExpiry', 'newProdStorage',
            'newProdCategory','newProdUnit','newProdPetType','newProdOrigin'
        ];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('newProdStatus').selectedIndex=0;

        const stockIn = document.getElementById('newProdInitialStock');
        if (stockIn) stockIn.value = '';
        const minStockIn = document.getElementById('newProdMinStock');
        if (minStockIn) minStockIn.value = 0;
        const imgIn = document.getElementById('newProdImages');
        if (imgIn) imgIn.value = '';

        attr1TagValues = [];
        attr2TagValues = [];
        const attr1N = document.getElementById('attr1Name');
        const attr2N = document.getElementById('attr2Name');
        if (attr1N) attr1N.value = 'Hương vị';
        if (attr2N) attr2N.value = 'Kích thước';
        renderAttributeTags(1);
        renderAttributeTags(2);
        const tbody = document.getElementById('productVariantsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
                        Vui lòng thêm ít nhất một giá trị cho nhóm phân loại 1 ở trên để tạo bảng biến thể.
                    </td>
                </tr>
            `;
        }
        toggleVariantMode(false);
        updateProductImagePreview();

        document.getElementById('modalAddProduct')?.classList.add('active');
    };

    window.PawpalOrdersModule.openEditProductModal = async function(sku) {
        let prod;
        try{prod=await PawpalOrders.ensureProduct(sku);}catch(error){showToast('Không thể tải chi tiết sản phẩm. Vui lòng thử lại.','warning');return;}
        if (!prod) return;
        state.productEditSnapshot=structuredClone(prod);state.productSaveId=prod.id;state.productSaveRequest=crypto.randomUUID();state.singleVariantId=prod.variants[0]?.id||crypto.randomUUID();

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
        document.getElementById('newProdBrand').value = prod.brand || '';
        document.getElementById('newProdPetType').value = prod.petType || 'Chó và Mèo';
        document.getElementById('newProdOrigin').value = prod.origin || '';
        document.getElementById('newProdStatus').value = prod.status || 'Còn hàng';
        document.getElementById('newProdUnit').value = prod.unit || '';
        document.getElementById('newProdSpec').value = prod.spec || '';
        document.getElementById('newProdBadge').value = prod.badge || '';
        document.getElementById('newProdFeatures').value = prod.features || '';
        document.getElementById('newProdCostPrice').value = prod.costPrice ?? '';
        document.getElementById('newProdPrice').value = prod.price ?? '';
        document.getElementById('newProdOriginalPrice').value = prod.originalPrice || '';
        document.getElementById('newProdInitialStock').value = prod.stock || 0;
        document.getElementById('newProdMinStock').value = prod.minStock ?? 0;
        document.getElementById('newProdImages').value = prod.images ? (Array.isArray(prod.images) ? prod.images.join(', ') : prod.images) : (prod.image || '');
        document.getElementById('newProdDescription').value = prod.description || '';
        document.getElementById('newProdIngredients').value = prod.ingredients || '';
        document.getElementById('newProdBenefits').value = prod.benefits || '';
        document.getElementById('newProdUsage').value = prod.usage || '';
        document.getElementById('newProdFeedingGuide').value = prod.feedingGuide || '';
        document.getElementById('newProdExpiry').value = prod.expiry || '';
        document.getElementById('newProdStorage').value = prod.storage || '';

        const hasVariants = !!(prod.hasVariants && Array.isArray(prod.variants) && prod.variants.length > 0);
        if (hasVariants) {
            // Đảm bảo từng biến thể luôn có thuộc tính phân loại
            prod.variants.forEach((v, idx) => {
                if (!v.attr1) {
                    v.attr1 = v.variant_flavor?.flavor_name || (v.name ? v.name.split('-')[0].trim() : `Phân loại ${idx + 1}`);
                }
                if (!v.attr2 && v.variant_size?.size_name) {
                    v.attr2 = v.variant_size.size_name;
                }
            });

            attr1TagValues = [...new Set(prod.variants.map(v => v.attr1 || v.name).filter(Boolean))];
            attr2TagValues = [...new Set(prod.variants.map(v => v.attr2).filter(Boolean))];

            const attr1N = document.getElementById('attr1Name');
            const attr2N = document.getElementById('attr2Name');
            if (attr1N) attr1N.value = prod.attr1Name || 'Hương vị';
            if (attr2N) attr2N.value = prod.attr2Name || (attr2TagValues.length > 0 ? 'Kích thước' : 'Quy cách');

            toggleVariantMode(true);
            renderAttributeTags(1);
            renderAttributeTags(2);
            generateVariantMatrix(prod.variants);
        } else {
            attr1TagValues = [];
            attr2TagValues = [];
            const cat = prod.category || '';
            const isFood = cat.toLowerCase().includes('thức ăn') || cat.toLowerCase().includes('pate') || cat.toLowerCase().includes('bánh') || cat.toLowerCase().includes('hạt');
            const attr1N = document.getElementById('attr1Name');
            const attr2N = document.getElementById('attr2Name');
            if (attr1N) attr1N.value = isFood ? 'Hương vị' : 'Màu sắc';
            if (attr2N) attr2N.value = 'Kích thước';
            renderAttributeTags(1);
            renderAttributeTags(2);
            const tbody = document.getElementById('productVariantsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">
                            Vui lòng thêm ít nhất một giá trị cho nhóm phân loại 1 ở trên để tạo bảng biến thể.
                        </td>
                    </tr>
                `;
            }
            toggleVariantMode(false);
        }

        updateProductImagePreview();
        document.getElementById('modalAddProduct')?.classList.add('active');
    };

    window.PawpalOrdersModule.openConfirmToggleStatusModal = function(sku) {
        state.activeStockActionSku = sku;
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;
        state.toggleProductSnapshot=structuredClone(prod);state.toggleProductRequest=crypto.randomUUID();document.querySelector('#modalConfirmToggleProductStatus .rma-order-summary-box').style.cssText='background:transparent;border:none;padding:0;margin-bottom:16px;';

        const isCurrentlySuspended = prod.status === 'Tạm ngưng';
        const subEl = document.getElementById('toggleStatusProdSubtitle');
        const nameEl = document.getElementById('toggleStatusProdName');
        const currEl = document.getElementById('toggleStatusCurrentBadge');
        const newEl = document.getElementById('toggleStatusNewBadge');
        const descEl = document.getElementById('toggleStatusDescText');

        if (subEl) subEl.textContent = `Mã SKU ${prod.sku}`;
        if (nameEl) nameEl.textContent = prod.name;
        if (currEl) {
            currEl.innerHTML = isCurrentlySuspended 
                ? '<span class="admin-badge badge-cancelled">Tạm ngưng</span>'
                : '<span class="admin-badge badge-paid">Đang bán</span>';
        }
        if (newEl) {
            newEl.innerHTML = isCurrentlySuspended 
                ? '<span class="admin-badge badge-paid">Mở bán lại</span>'
                : '<span class="admin-badge badge-cancelled">Tạm ngưng kinh doanh</span>';
        }
        if (descEl) {
            descEl.innerHTML = isCurrentlySuspended
                ? 'Khi mở bán lại, sản phẩm sẽ hiển thị công khai trên Shop và khách hàng có thể tiếp tục đặt mua bình thường.'
                : 'Khi chuyển sang <strong>Tạm ngưng</strong>, sản phẩm sẽ tạm thời bị ẩn khỏi gian hàng và khách hàng không thể đặt mua trực tuyến.';
        }

        document.getElementById('modalConfirmToggleProductStatus')?.classList.add('active');
    };

    window.PawpalOrdersModule.openAdjustStockModal = function(sku) {
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        state.adjustRequestId = crypto.randomUUID();
        state.adjustVariantId = null;
        document.querySelector('#modalAdjustStock .rma-order-summary-box').style.cssText = 'background:transparent;border:none;padding:0;margin-bottom:16px;';
        let wrapper = document.getElementById('adjustVariantWrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'adjustVariantWrapper';
            wrapper.className = 'customer-autocomplete-wrapper';
            wrapper.style.cssText = 'position:relative;width:100%;margin-bottom:16px;';
            wrapper.innerHTML = '<label class="form-label-clean" for="adjustVariantSearch">Biến thể <span style="color:#DC2626">*</span></label><input class="admin-input" id="adjustVariantSearch" autocomplete="off"><div class="customer-autocomplete-popover" id="adjustVariantOptions" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:240px;overflow:auto;overscroll-behavior:contain;z-index:2500;border-radius:9px;background:#fff;border:1px solid #ECF2EE;box-shadow:0 10px 28px rgba(35,107,72,.14)"></div>';
            document.querySelector('#modalAdjustStock .form-row-2col').before(wrapper);
        }
        const input = document.getElementById('adjustVariantSearch');
        const options = document.getElementById('adjustVariantOptions');
        const selectVariant = v => {
            state.adjustVariantId = v.id;
            input.value = v.name + ' · ' + v.sku;
            options.style.display = 'none';
            document.getElementById('adjustSkuCode').textContent = v.sku;
            document.getElementById('adjustCurrentStock').textContent = v.stock === null ? 'Chưa có sổ kho' : String(v.stock);
            document.getElementById('adjustPriceInput').value = '';
        };
        const renderOptions = () => {
            state.adjustVariantId = null;
            options.replaceChildren();
            for (const v of prod.variants.filter(v => matchSearch(v.name + ' ' + v.sku, input.value))) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'admin-btn';
                button.style.cssText = 'display:block;width:100%;text-align:left;background:transparent;color:#203A2C';
                button.textContent = v.name + ' · ' + v.sku;
                button.onclick = () => selectVariant(v);
                options.append(button);
            }
            options.style.display = 'block';
        };
        input.value = '';
        input.oninput = renderOptions;
        input.onfocus = () => { input.value = ''; renderOptions(); };
        input.onkeydown = event => { if (event.key === 'Escape') options.style.display = 'none'; };

        state.activeAdjustProductSku = sku;
        const skuEl = document.getElementById('adjustSkuCode');
        const nameEl = document.getElementById('adjustProdName');
        const stockEl = document.getElementById('adjustCurrentStock');
        const priceInput = document.getElementById('adjustPriceInput');
        const statusSelect = document.getElementById('adjustStatusSelect');

        if (skuEl) skuEl.textContent = prod.sku;
        if (nameEl) nameEl.textContent = prod.name;
        if (stockEl) stockEl.textContent = `${prod.stock} món`;
        if (priceInput) priceInput.value = '';
        if (statusSelect) statusSelect.value = prod.raw.status === 'active' ? 'active' : 'inactive';
        document.getElementById('adjustQuantityInput').value = '';
        document.getElementById('adjustOperationType').value = 'ADD';
        if (prod.variants.length === 1) selectVariant(prod.variants[0]);

        document.getElementById('modalAdjustStock')?.classList.add('active');
    };

    function inventoryVariants(){return state.inventoryChoices||[];}
    async function loadInventoryChoices(){
        try{state.inventoryChoices=await window.PawpalOrderV1.inventoryChoices();return true;}
        catch(error){showToast('Không thể tải danh sách biến thể kho. Vui lòng thử lại.','warning');return false;}
    }
    window.PawpalOrdersModule.openGoodsReceiptModal = async function(prefillSku){
        if(!await loadInventoryChoices())return;
        state.grnRequestId=crypto.randomUUID();state.activeGrnItems=[];document.getElementById('formGoodsReceipt').reset();
        document.getElementById('grnReceiptCode').value='PO-'+state.grnRequestId;
        const supplier=document.getElementById('grnSupplierSelect'),picker=document.getElementById('grnProductPicker');
        supplier.replaceChildren(new Option('Ch\u1ecdn nh\u00e0 cung c\u1ea5p',''));
        picker.replaceChildren(new Option('Ch\u1ecdn bi\u1ebfn th\u1ec3',''),...inventoryVariants().map(v=>new Option(v.sku+' - '+v.name,v.id)));
        const target=inventoryVariants().find(v=>v.sku===prefillSku);if(target)picker.value=target.id;
        renderGrnItemsTable();document.getElementById('modalGoodsReceipt').classList.add('active');
        try{const suppliers=await window.PawpalOrderV1.rows(()=>window.getSupabaseClient().from('supplier').select('id,supplier_name').eq('status','active').order('id'));
            supplier.replaceChildren(new Option('Ch\u1ecdn nh\u00e0 cung c\u1ea5p',''),...suppliers.map(v=>new Option(v.supplier_name,v.id)));
        }catch(error){showToast('Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c nh\u00e0 cung c\u1ea5p.','warning');}
        PawpalOrders.enhanceEntitySelects?.();
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

    function renderStocktakePage(){
        const tbody=document.getElementById('stocktakeTableBody');tbody.replaceChildren();
        const filtered=state.stocktakeSnapshot.filter(v=>matchSearch(v.sku+' '+v.name,state.stocktakeFilter||''));
        const list=filtered.slice((state.stocktakePage-1)*10,state.stocktakePage*10);
        for(const v of list){
            const row=document.createElement('tr');row.className='stk-row-item';row.dataset.variantId=v.id;
            const sku=document.createElement('td');sku.textContent=v.sku;
            const name=document.createElement('td');name.textContent=v.name;
            const expected=document.createElement('td');expected.textContent=v.stock===null?'\u2014':v.stock;
            const countCell=document.createElement('td'),input=document.createElement('input');input.type='number';input.min=0;input.step=1;input.className='admin-input stk-count-input';input.style.width='80px';input.value=state.stocktakeCounts.get(v.id)?.quantity??'';
            const diff=document.createElement('td');diff.className='stk-diff-disp';
            const reasonCell=document.createElement('td'),reason=document.createElement('input');reason.className='admin-input stk-row-reason-select';reason.placeholder='L\u00fd do ch\u00eanh l\u1ec7ch';reason.value=state.stocktakeCounts.get(v.id)?.reason||'';
            const sync=()=>{if(input.value==='')state.stocktakeCounts.delete(v.id);else state.stocktakeCounts.set(v.id,{quantity:input.value,reason:reason.value.trim()});diff.textContent=input.value===''?'\u2014':String(Number(input.value)-Number(v.stock));document.getElementById('stkTotalDiff').textContent=state.stocktakeCounts.size+' bi\u1ebfn th\u1ec3 \u0111\u00e3 \u0111\u1ebfm';};
            input.oninput=sync;reason.oninput=sync;countCell.append(input);reasonCell.append(reason);row.append(sku,name,expected,countCell,diff,reasonCell);tbody.append(row);
            diff.textContent=input.value===''?'\u2014':String(Number(input.value)-Number(v.stock));
        }
        let pager=document.getElementById('salesStocktakePager');if(!pager){pager=document.createElement('div');pager.id='salesStocktakePager';pager.style.cssText='display:flex;justify-content:center;gap:12px;margin-top:6px';tbody.closest('.table-responsive-wrapper').after(pager);}pager.replaceChildren();
        for(const [label,page] of [['<',state.stocktakePage-1],[String(state.stocktakePage),state.stocktakePage],['>',state.stocktakePage+1]]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.textContent=label;button.style.cssText='background:transparent;border:none;padding:2px 8px;color:#236B48';if(label!=='<'&&label!=='>')button.style.cssText='background:#236B48;border:none;padding:2px 8px;color:#fff';button.disabled=page<1||page>Math.max(1,Math.ceil(filtered.length/10));button.onclick=()=>{state.stocktakePage=page;renderStocktakePage();};pager.append(button);}
    }
    window.PawpalOrdersModule.openStocktakeModal = async function(){
        if(!await loadInventoryChoices())return;
        document.getElementById('formStocktake').reset();state.stocktakeRequestId=crypto.randomUUID();state.stocktakeCounts=new Map();state.stocktakeSnapshot=structuredClone(inventoryVariants());state.stocktakePage=1;
        state.stocktakeFilter='';
        let search=document.getElementById('salesStocktakeSearch');
        if(!search){search=document.createElement('input');search.id='salesStocktakeSearch';search.className='admin-input';search.placeholder='Tìm SKU hoặc tên sản phẩm';search.setAttribute('aria-label','Tìm SKU hoặc tên sản phẩm');document.getElementById('stocktakeTableBody').closest('.table-responsive-wrapper').before(search);search.oninput=()=>{state.stocktakeFilter=search.value;state.stocktakePage=1;renderStocktakePage();};}
        search.value='';
        document.getElementById('stkAuditCode').value='STK-'+state.stocktakeRequestId;document.getElementById('stkTotalDiff').textContent='0 bi\u1ebfn th\u1ec3 \u0111\u00e3 \u0111\u1ebfm';renderStocktakePage();document.getElementById('modalStocktake').classList.add('active');
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
    window.PawpalOrdersModule.viewProductOnStorefront = function() {
        const sku = state.activeReviewsSku;
        if (!sku) return;
        const prod = (state.products || []).find(p => p.sku === sku);
        const prodId = prod ? (prod.id || prod.sku) : sku;
        window.open(`/pages/shop/product-detail/product-detail.html?id=${encodeURIComponent(prodId)}#tab-reviews`, '_blank');
    };

    window.PawpalOrdersModule.addTagValue = addTagValue;
    window.PawpalOrdersModule.removeTagValue = removeTagValue;
    window.PawpalOrdersModule.handleTagInputKey = handleTagInputKey;
    window.PawpalOrdersModule.handleTagInputKeyDown = handleTagInputKey;
    window.PawpalOrdersModule.renderAttributeTags = renderAttributeTags;
    window.PawpalOrdersModule.generateVariantMatrix = generateVariantMatrix;
    window.PawpalOrdersModule.applyBulkVariantValues = applyBulkVariantValues;
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

    PawpalOrders.controllers.products = {renderProductsTable,renderProductsPagination,updateCategoryFilterDropdown,renderGrnItemsTable};
    updateCategoryFilterDropdown(state.categories||[]);
    // Khởi tạo sự kiện
    initProductsEvents();
})();

;

(function(){
 'use strict';
 const m=window.PawpalOrders,api=window.PawpalOrdersModule,el=id=>document.getElementById(id);
 let loaded=[],filter='ALL',page=1,session=0,total=0;
 const latest=r=>[...(r.responses||[])].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||a.id.localeCompare(b.id))[0];
 function render(){
  const filters=el('prodReviewsStarFilterRow');filters.replaceChildren();
  for(const [key,label] of [['ALL','Tất cả'],['5','5 điểm'],['4','4 điểm'],['MEDIA','Có ảnh']]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.textContent=label;button.style.cssText=filter===key?'background:#DCEEE2;color:#165335;border:none':'background:transparent;color:#4F7A65;border:none';button.onclick=()=>{filter=key;page=1;api.renderProductReviewsModalContent(m.state.activeReviewsSku);};filters.append(button);}
  const list=loaded;
  const root=el('productReviewsListContainer');root.replaceChildren();
  if(!list.length)root.textContent='Chưa có đánh giá phù hợp.';
  for(const r of list){
   const block=document.createElement('div');block.style.cssText='padding:12px 0;display:flex;flex-direction:column;gap:8px';
   const name=window.PawpalOrderV1.one(r.line?.order?.customer?.customer_profile)?.full_name||'Chưa có tên khách';
   const title=document.createElement('strong');title.textContent=name+' · '+r.rating+'/5';
   const meta=document.createElement('div');meta.style.cssText='color:#4F7A65;font-size:12px';meta.textContent=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Bangkok',dateStyle:'short'}).format(new Date(r.created_at))+' · '+r.line.sku_snapshot;
   const content=document.createElement('p');content.style.margin=0;content.textContent=r.review_content||'';block.append(title,meta,content);
   for(const media of r.media){if(!/^(https?:\/\/|\/?assets\/)/i.test(media.image_url))continue;const image=document.createElement('img');image.src=media.image_url.startsWith('assets/')?'/'+media.image_url:media.image_url;image.loading='lazy';image.decoding='async';image.alt='Ảnh đánh giá';image.style.cssText='width:80px;height:80px;object-fit:cover;border-radius:9px';block.append(image);}
   const response=latest(r);if(response){const author=document.createElement('div');author.style.cssText='font-size:12px;color:#4F7A65';author.textContent='Phản hồi · '+(response.staff?.full_name||'Chưa ghi nhận người phản hồi');block.append(author);}
   const input=document.createElement('textarea');input.className='admin-input';input.rows=2;input.maxLength=5000;input.style.height='auto';input.value=response?.response_content||'';input.setAttribute('aria-label','Phản hồi đánh giá');
   const save=document.createElement('button');save.type='button';save.className='admin-btn admin-btn-primary';save.textContent='Lưu phản hồi';save.style.alignSelf='flex-start';
   const error=document.createElement('p');error.style.cssText='color:#DC2626;background:transparent;border:none;margin:0';error.setAttribute('role','alert');
   save.onclick=async()=>{if(!input.value.trim()){error.textContent='Nhập nội dung phản hồi.';return;}save.disabled=true;try{const {error:failure}=await window.getSupabaseClient().rpc('reply_admin_sales_review',{p_review_id:r.id,p_response_id:response?.id||null,p_expected_updated_at:response?.updated_at||null,p_text:input.value.trim()});if(failure)throw failure;window.PawpalDataStore?.invalidate('orders:reviews*');await api.renderProductReviewsModalContent(m.state.activeReviewsSku);m.helpers.showToast('Đã lưu phản hồi đánh giá.');}catch(failure){if(failure.code==='PT409')window.PawpalDataStore?.invalidate('orders:reviews*');error.textContent=failure.code==='PT409'?'Phản hồi đã thay đổi. Mở lại đánh giá để đối chiếu.':'Không thể lưu phản hồi. Kiểm tra quyền và nội dung.';}finally{save.disabled=false;}};
   block.append(input,save,error);root.append(block);
  }
  if(total>10){const pager=document.createElement('div');pager.className='admin-pagination-container';for(const [label,next] of [['<',page-1],[String(page),page],['>',page+1]]){const button=document.createElement('button');button.type='button';button.className='btn-pagination'+(next===page?' active':'');button.textContent=label;button.disabled=next===page||next<1||next>Math.ceil(total/10);button.onclick=()=>{page=next;api.renderProductReviewsModalContent(m.state.activeReviewsSku);};pager.append(button);}root.append(pager);}
 }
 api.renderProductReviewsModalContent=async sku=>{
  const product=m.state.products.find(p=>p.sku===sku);if(!product)return;
  const requestedFilter=filter,requestedPage=page;
  const current=++session;el('productReviewsListContainer').textContent='Đang tải đánh giá…';
  try{
   const result=await window.PawpalOrderV1.cached('reviews:'+product.id+':'+requestedFilter+':'+requestedPage,async()=>{
    const db=window.getSupabaseClient();
    const {data:meta,error}=await db.rpc('get_admin_sales_review_page',{p_product_id:product.id,p_filter:requestedFilter,p_page:requestedPage});
    if(error)throw error;
    if(!meta||!Array.isArray(meta.ids)||meta.ids.length>10)throw Error('invalid_review_page');
    const rows=meta.ids.length?await window.PawpalOrderV1.rows(()=>db.from('review').select('id,rating,review_content,review_status,created_at,line:sales_order_detail_id!inner(sku_snapshot,product_variant:product_variant_id!inner(product_id),order:order_id(customer:customer_id(customer_profile(full_name)))),responses:review_response(id,response_content,updated_at,staff:staff_id(full_name)),media:review_media(image_url)').in('id',meta.ids).eq('line.product_variant.product_id',product.id).order('created_at',{ascending:false}).order('id')):[];
    return {meta,rows};
   });
   if(current!==session||!el('modalProductReviews').classList.contains('active'))return;
   loaded=result.rows;page=result.meta.page;total=result.meta.total;render();
   el('prodReviewsScoreBig').textContent=result.meta.count?Number(result.meta.average).toFixed(1)+'/5':'—';el('prodReviewsScoreDesc').textContent=result.meta.count?'Điểm đánh giá':'Chưa có đánh giá';el('prodReviewsCountTotal').textContent=result.meta.count+' nhận xét';
  }catch(error){if(current===session)el('productReviewsListContainer').textContent='Không thể tải đánh giá. Đóng và mở lại để thử lại.';}
 };
 api.openProductReviewsModal=async sku=>{const p=m.state.products.find(p=>p.sku===sku);if(!p)return;m.state.activeReviewsSku=sku;filter='ALL';page=1;el('productReviewsModalTitle').textContent='Đánh giá sản phẩm · '+p.name;el('prodReviewsScoreBig').textContent='—';el('prodReviewsCountTotal').textContent='';el('modalProductReviews').classList.add('active');await api.renderProductReviewsModalContent(sku);};
})();

;

(function(){
 'use strict';
 const m=window.PawpalOrders,el=id=>document.getElementById(id);
 let stockHistorySession=0;
 window.PawpalOrdersModule.openStockLogsModal=async sku=>{
  const product=m.state.products.find(p=>p.sku===sku);if(!product)return;
  const session=++stockHistorySession;let request=0,logs=[],page=1,total=0;
  el('stockLogsSubtitle').textContent=product.name;
  el('stockLogsCurrentTotal').textContent=String(product.stock);
  el('stockLogsMinStock').textContent=String(product.minStock);
  el('stockLogsStatusText').textContent=product.stock===0?'Hết hàng':product.stock<=product.minStock?'Sắp hết hàng':'—';
  const tbody=el('stockLogsTableBody'),modal=el('modalStockLogs');
  const headers=tbody.closest('table').querySelector('thead tr');headers.replaceChildren();
  for(const text of ['Thời gian','SKU và nguồn','Biến động','Số lượng','Trước','Sau','Người ghi và lý do']){const th=document.createElement('th');th.textContent=text;headers.append(th);}
  let pager=el('salesStockHistoryPager');if(!pager){pager=document.createElement('div');pager.id='salesStockHistoryPager';pager.className='admin-pagination-container';tbody.closest('.table-responsive-wrapper').after(pager);}
  function message(text){tbody.replaceChildren();const cell=tbody.insertRow().insertCell();cell.colSpan=7;cell.textContent=text;return cell;}
  function render(){tbody.replaceChildren();pager.replaceChildren();
   if(!logs.length){message('Chưa có lịch sử biến động.');return;}
   for(const log of logs){
    const row=tbody.insertRow();
    const label=({opening:'Tồn đầu',migration_opening:'Chuyển hệ thống',sales_issue:'Xuất bán',purchase_receipt:'Nhập hàng',stocktake:'Kiểm kê',return_receipt:'Nhận hàng trả',adjustment:'Điều chỉnh'})[log.typeLabel]||'Biến động khác';
    for(const value of [m.helpers.formatDateTime(log.date),log.sku+' · '+(log.refCode||'—'),label,log.change,log.beforeStock,log.afterStock,log.staff+' · '+(log.reason||'—')]){const cell=row.insertCell();cell.textContent=String(value);cell.style.overflowWrap='anywhere';}
   }
   const pages=Math.ceil(total/10),first=Math.max(1,Math.min(page-2,pages-4)),last=Math.min(pages,first+4);
   const numbers=Array.from({length:last-first+1},(_,i)=>[String(first+i),first+i]);
   for(const [text,target] of [['<',page-1],...numbers,['>',page+1]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.className='btn-pagination'+(target===page&&text!=='<'&&text!=='>'?' active':'');button.disabled=target<1||target>pages;button.onclick=()=>loadPage(target);pager.append(button);}
  }
  async function loadPage(target){
   const version=++request;pager.replaceChildren();message('Đang tải lịch sử kho...');tbody.setAttribute('aria-busy','true');
   try{
    const result=await window.PawpalOrderV1.stockLogPage(product.id,target);
    if(session!==stockHistorySession||version!==request||!modal.classList.contains('active'))return;
    logs=result.rows;page=result.page;total=result.total;render();
   }catch(error){
    if(session!==stockHistorySession||version!==request||!modal.classList.contains('active'))return;
    pager.replaceChildren();const cell=message('Không thể tải lịch sử kho. ');
    const retry=document.createElement('button');retry.type='button';retry.className='admin-btn';retry.textContent='Thử lại';retry.onclick=()=>loadPage(target);cell.append(retry);
   }finally{if(session===stockHistorySession&&version===request)tbody.removeAttribute('aria-busy');}
  }
  modal.classList.add('active');await loadPage(1);
 };
})();
