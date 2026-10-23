// tab-customer-pawpoint.js - Subtab Quản lý Pawpoint (Khách hàng Pawpal-er)
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    const esc=value=>PawpalCustomers.escapeHtml(value);
    let pawpointCurrentPage = 1;
    const PAWPOINT_PAGE_SIZE = 10;
    let selectedAdjustCustomer = null;

    function renderPawpointHistory() {
        if(!document.getElementById('subtab-tab-pawpoint')?.classList.contains('active'))return;
        const policyBody = document.getElementById('membershipTierPolicyTbody');
        if (policyBody) {
            const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
            policyBody.innerHTML = (PawpalCustomers.state.membershipTiers || []).map(t => `<tr><td>${esc(t.tier_name)}</td><td>${Number(t.minimum_expenditure).toLocaleString('vi-VN')} đ</td><td>${Number(t.discount_percent)}%</td><td>${esc(t.description || '—')}</td></tr>`).join('') || '<tr><td colspan="4">Chưa có chính sách hạng thẻ.</td></tr>';
        }
        const tbody = document.getElementById('pawpointHistoryTbody');
        if (!tbody) return;
        const query=(document.getElementById('pawpointSearchInput')?.value||'').trim();
        const filterType=document.getElementById('pawpointFilterType')?.value||'ALL';
        const request={query,kind:filterType,page:pawpointCurrentPage,size:PAWPOINT_PAGE_SIZE};
        const key=PawpalCustomers.ledgerPageKey(request),status=PawpalCustomers.state.pawpointLoadStatus;
        if(key!==PawpalCustomers.state.ledgerRequestKey||!['loaded','error','loading'].includes(status)){
            PawpalCustomers.fetchPawpointLedger(request).then(renderPawpointHistory);
        }
        if(PawpalCustomers.state.pawpointLoadStatus==='loading'){
            tbody.innerHTML='<tr><td colspan="5" class="customer-data-state">Đang tải lịch sử Pawpoint…</td></tr>';
            document.getElementById('pawpointResultCount').textContent='Đang tải…';document.getElementById('pawpointPaginationControls')?.replaceChildren();return;
        }
        if(PawpalCustomers.state.pawpointLoadStatus==='error'){
            tbody.innerHTML='<tr><td colspan="5" class="customer-data-state"><strong>Không thể tải lịch sử Pawpoint</strong><p>Dữ liệu chưa được xác nhận.</p><button type="button" id="pawpointRetryLoad">Thử lại</button></td></tr>';
            document.getElementById('pawpointResultCount').textContent='Chưa tải được dữ liệu';document.getElementById('pawpointPaginationControls')?.replaceChildren();
            document.getElementById('pawpointRetryLoad').onclick=async event=>{event.target.disabled=true;await PawpalCustomers.fetchPawpointLedger({...request,force:true});renderPawpointHistory();};return;
        }
        const filtered=PawpalCustomers.state.pawpointHistory||[],total=Number(PawpalCustomers.state.ledgerPage?.total||0);
        pawpointCurrentPage=Number(PawpalCustomers.state.ledgerPage?.page||pawpointCurrentPage);
        const totalPages = Math.max(1, Math.ceil(total / PAWPOINT_PAGE_SIZE));
        const resultCount=document.getElementById('pawpointResultCount');if(resultCount)resultCount.textContent=`${total.toLocaleString('vi-VN')} giao dịch`;
        pawpointCurrentPage = Math.min(pawpointCurrentPage, totalPages);
        const pageItems = filtered;
        const pager = document.getElementById('pawpointPaginationControls');
        if (pager) {
            pager.innerHTML = filtered.length > 0 ? `<button type="button" class="pagination-btn" ${pawpointCurrentPage === 1 ? 'disabled' : ''} data-pawpoint-page="prev">&lt;</button>${Array.from({length: Math.min(totalPages,pawpointCurrentPage+2)-Math.max(1,pawpointCurrentPage-2)+1}, (_, index) => { const i=Math.max(1,pawpointCurrentPage-2)+index-1;return `<button type="button" class="pagination-btn ${i + 1 === pawpointCurrentPage ? 'active' : ''}" data-pawpoint-page="${i + 1}">${i + 1}</button>`;}).join('')}<button type="button" class="pagination-btn" ${pawpointCurrentPage === totalPages ? 'disabled' : ''} data-pawpoint-page="next">&gt;</button>` : '';
            pager.querySelectorAll('[data-pawpoint-page]').forEach(btn => btn.addEventListener('click', () => {
                const action = btn.dataset.pawpointPage;
                if (action === 'prev') pawpointCurrentPage = Math.max(1, pawpointCurrentPage - 1);
                else if (action === 'next') pawpointCurrentPage = Math.min(totalPages, pawpointCurrentPage + 1);
                else pawpointCurrentPage = Number(action);
                renderPawpointHistory();
            }));
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Không tìm thấy lịch sử biến động điểm phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
            const sign = item.type === 'ADD' ? '+' : '-';
            const colorClass = item.type === 'ADD' ? 'text-success' : 'text-danger';
            return `
                <tr>
                    <td>${esc(item.time)}</td>
                    <td><strong class="pawpoint-customer-name">${esc(item.custName)}</strong><span class="pawpoint-customer-phone">${esc(item.phone || 'Chưa cập nhật số điện thoại')}</span></td>
                    <td><strong class="${colorClass}">${sign}${item.points} điểm</strong></td>
                    <td>${Number(item.balance).toLocaleString('vi-VN')} điểm</td>
                    <td>${esc(item.reason)}</td>
                </tr>
            `;
        }).join('');
    }

    async function exportPawpointHistoryToCSV() {
        const button=document.getElementById('btnExportPawpointHistory');if(button.disabled)return;
        const query=(document.getElementById('pawpointSearchInput')?.value||'').trim(),kind=document.getElementById('pawpointFilterType')?.value||'ALL';
        button.disabled=true;let filteredHistory=[];
        try{
            const first=await PawpalCustomers.readPawpointPage({query,kind,page:1,size:100,force:true});
            if(first.total>1000){PawpalCustomers.showToast('Có hơn 1.000 giao dịch. Hãy thu hẹp bộ lọc trước khi xuất.','warning');return;}
            filteredHistory=first.rows;
            for(let page=2;page<=Math.ceil(first.total/100);page++){
                const next=await PawpalCustomers.readPawpointPage({query,kind,page,size:100,force:true});
                if(next.total!==first.total)throw Error('ledger_changed');filteredHistory.push(...next.rows);
            }
            if(new Set(filteredHistory.map(row=>row.rawId)).size!==first.total)throw Error('ledger_changed');
        }catch{PawpalCustomers.showToast('Chưa thể xuất lịch sử. Dữ liệu có thể đã thay đổi, vui lòng thử lại.','warning');return;}
        finally{button.disabled=false;}
        if (filteredHistory.length === 0) {
            PawpalCustomers.showToast('Không có lịch sử điểm để xuất!', 'warning');
            return;
        }

        const headers = [
            'Mã giao dịch',
            'Thời gian',
            'Mã khách hàng',
            'Tên khách hàng',
            'Số điện thoại',
            'Loại giao dịch',
            'Số điểm',
            'Số dư sau giao dịch',
            'Lý do điều chỉnh'
        ];

        const rows = filteredHistory.map(item => [
            item.id || '',
            item.time || '',
            item.custId || '',
            item.custName || '',
            item.phone || '',
            item.type === 'ADD' ? 'Cộng điểm' : 'Trừ điểm',
            (item.type === 'ADD' ? '+' : '-') + item.points + ' điểm',
            Number(item.balance).toLocaleString('vi-VN') + ' điểm',
            item.reason || ''
        ]);

        const sanitizeCsvCell = (val) => {
            let s = String(val === null || val === undefined ? '' : val);
            if (/^[=+\-@\t\r]/.test(s)) {
                s = "'" + s;
            }
            return `"${s.replace(/"/g, '""')}"`;
        };

        const csvRows = [
            headers.map(sanitizeCsvCell).join(','),
            ...rows.map(row => row.map(sanitizeCsvCell).join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `Pawpal_Lich_Su_Pawpoint_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        PawpalCustomers.showToast(`Đã xuất lịch sử ${filteredHistory.length} giao dịch Pawpoint theo bộ lọc hiện tại ra file CSV!`);
    }

    // Helpers truy xuất DOM động (tránh lỗi cache phần tử rỗng khi script tải trước HTML)
    const getAdjustModal = () => document.getElementById('modalAdjustPoints');
    const getAdjustPhoneInput = () => document.getElementById('adjustPhone');
    const getAdjustCustomerDropdown = () => document.getElementById('adjustCustomerDropdown');
    const getAdjustPhoneCustomerHint = () => document.getElementById('adjustPhoneCustomerHint');
    const getAdjustReasonInput = () => document.getElementById('adjustReason');

    let adjustLookupVersion=0,adjustLookupTimer;
    async function renderAdjustCustomerDropdown(filterText = '') {
        const dropdown = getAdjustCustomerDropdown();
        if (!dropdown) return;
        const q = (filterText || '').toLowerCase().trim();
        const version=++adjustLookupVersion;
        let allCustomers;
        try{allCustomers=PawpalCustomers.lookupCustomers?await PawpalCustomers.lookupCustomers(filterText):Object.values(PawpalCustomers.state.customerDatabase||{});}
        catch{dropdown.textContent='Không thể tìm khách hàng. Vui lòng thử lại.';dropdown.style.display='block';return;}
        if(version!==adjustLookupVersion||!getAdjustModal()||getComputedStyle(getAdjustModal()).display==='none')return;

        const matches = PawpalCustomers.lookupCustomers?allCustomers:allCustomers.filter(c => {
            if (!q) return true;
            const name = (c.name || '').toLowerCase();
            const phone = (c.phone || '').replace(/[^0-9]/g, '');
            const cleanQ = q.replace(/[^0-9]/g, '');
            const matchPhone = cleanQ && phone.includes(cleanQ);
            const matchName = name.includes(q);
            const matchPets = (c.pets || []).some(p => (p.name || '').toLowerCase().includes(q));
            return matchName || matchPhone || matchPets;
        }).slice(0, 15);

        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="customer-autocomplete-empty">Không tìm thấy khách hàng phù hợp</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = '';
        matches.forEach(c => {
            const item = document.createElement('div');
            item.className = 'customer-autocomplete-item';
            const pts = (c.points || 0).toLocaleString('vi-VN');
            const petNames = (c.pets && c.pets.length > 0) ? ` • Bé: ${c.pets.map(p => p.name).join(', ')}` : '';

            item.innerHTML = `
                <div class="customer-autocomplete-info">
                    <div class="customer-autocomplete-meta">
                        <div class="customer-autocomplete-name" style="font-weight: 600; color: #203A2C;">${esc(c.name)}</div>
                        <div class="customer-autocomplete-phone" style="color: #4F7A65; font-size: 11.5px;">${esc(c.phone || 'Chưa có SĐT')}${esc(petNames)}</div>
                    </div>
                </div>
                <div class="customer-autocomplete-badge">${esc(c.tierName)} • ${pts} điểm</div>
            `;

            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectAdjustCustomer(c);
            });

            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    function clearAdjustCustomerSelection() {
        selectedAdjustCustomer = null;
        const phoneInput = getAdjustPhoneInput();
        if (phoneInput) { phoneInput.value = ''; phoneInput.style.display = ''; }
        const hint = getAdjustPhoneCustomerHint();
        if (hint) {
            hint.innerHTML = '';
            hint.style.display = 'none';
        }
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    function selectAdjustCustomer(cust) {
        selectedAdjustCustomer = cust;
        const phoneInput = getAdjustPhoneInput();
        if (phoneInput) {
            phoneInput.value = `${cust.name} - ${cust.phone}`;
            phoneInput.style.display = 'none';
        }
        const hint = getAdjustPhoneCustomerHint();
        if (hint) {
            hint.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <span>Khách hàng: <strong>${esc(cust.name)}</strong> (${esc(cust.tierName)})</span>
                        <span style="margin-left: 12px;">Số dư hiện tại: <strong>${(cust.points || 0).toLocaleString('vi-VN')} điểm</strong></span>
                    </div>
                    <button type="button" class="btn-clear-selected-customer" style="background: none; border: none; color: #236B48; font-size: 12px; font-weight: 600; cursor: pointer; padding: 2px 6px;">✕ Bỏ chọn</button>
                </div>
            `;
            hint.style.display = 'flex';
            hint.querySelector('.btn-clear-selected-customer')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAdjustCustomerSelection();
                getAdjustPhoneInput()?.focus();
            });
        }
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    function openAdjustPointsModal(presetPhone = '') {
        const modal = getAdjustModal();
        if (modal) {
            modal.style.display = 'flex';
            const dropdown = getAdjustCustomerDropdown();
            if (dropdown) dropdown.style.display = 'none';

            if (presetPhone) {
                const clean = presetPhone.replace(/[^0-9]/g, '').trim();
                const found = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => 
                    (c.phone && c.phone.replace(/[^0-9]/g, '').trim() === clean) ||
                    c.id === presetPhone
                );
                if (found) {
                    selectAdjustCustomer(found);
                } else {
                    const phoneInput = getAdjustPhoneInput();
                    if (phoneInput) {
                        selectedAdjustCustomer = null;
                        phoneInput.value = presetPhone;
                        const hint = getAdjustPhoneCustomerHint();
                        if (hint) hint.style.display = 'none';
                    }
                }
            } else {
                clearAdjustCustomerSelection();
                const ptsInput = document.getElementById('adjustPointsVal');
                if (ptsInput) ptsInput.value = '';
                const reasonInput = getAdjustReasonInput();
                if (reasonInput) reasonInput.value = '';
            }
        }
    }

    function closeAdjustModal() {
        const modal = getAdjustModal();
        if (modal) modal.style.display = 'none';
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    let adjustmentSaving=false;
    function adjustError(id,message){
        const input=document.getElementById(id);let error=document.getElementById(id+'Error');
        if(!error){error=document.createElement('div');error.id=id+'Error';error.style.cssText='color:#DC2626;font-size:12px;margin-top:4px';input.parentElement.appendChild(error);}
        error.textContent=message;input.setAttribute('aria-invalid',String(Boolean(message)));input.setAttribute('aria-describedby',error.id);
    }
    async function handleAdjustPointsSubmit(){
        if(adjustmentSaving)return;
        const customer=selectedAdjustCustomer;
        const points=Number(document.getElementById('adjustPointsVal').value);
        const reason=getAdjustReasonInput().value.trim();
        const type=document.getElementById('adjustType').value;
        adjustError('adjustPhone',customer?.dbId?'':'Chọn khách hàng từ danh sách gợi ý.');
        adjustError('adjustPointsVal',Number.isSafeInteger(points)&&points>0&&points<=10000000?'':'Nhập số điểm nguyên từ 1 đến 10.000.000.');
        adjustError('adjustReason',reason.length>=2&&reason.length<=2000?'':'Nhập lý do từ 2 đến 2.000 ký tự.');
        if(!customer?.dbId || !Number.isSafeInteger(points) || points<=0 || points>10000000 || reason.length<2 || reason.length>2000)return;
        const signed=type==='SUB'?-points:points;
        const signature=JSON.stringify([customer.dbId,signed,reason]);
        let pending;
        try{pending=JSON.parse(sessionStorage.getItem('pawpal_customer_point_request') || 'null');}catch{}
        if(pending?.signature!==signature)pending={signature,id:crypto.randomUUID()};
        sessionStorage.setItem('pawpal_customer_point_request',JSON.stringify(pending));
        const button=document.getElementById('btnSubmitAdjustPoints');adjustmentSaving=true;button.disabled=true;button.textContent='Đang lưu';
        try{
            const {data,error}=await window.getSupabaseClient().rpc('adjust_customer_points',{p_customer_id:customer.dbId,p_points:signed,p_reason:reason,p_request_id:pending.id});
            if(error){
                if(error.message?.includes('insufficient_points')){adjustError('adjustPointsVal','Số điểm trừ vượt quá số dư thực tế hiện tại.');return;}
                throw error;
            }
            sessionStorage.removeItem('pawpal_customer_point_request');
            closeAdjustModal();document.getElementById('formAdjustPoints').reset();clearAdjustCustomerSelection();
            await PawpalCustomers.loadCustomersModuleData({force:true});
            await PawpalCustomers.fetchPawpointLedger({force:true});renderPawpointHistory();
            PawpalCustomers.showToast(`Đã lưu điều chỉnh. Số dư sau giao dịch: ${Number(data.balance).toLocaleString('vi-VN')} điểm.`,'success');
        }catch(error){PawpalCustomers.showToast('Chưa xác nhận được điều chỉnh. Bạn có thể bấm lưu lại cùng nội dung để kiểm tra, hệ thống không ghi trùng.','warning');}
        finally{adjustmentSaving=false;button.disabled=false;button.textContent='Xác nhận điều chỉnh';}
    }

    let _hasAttachedPawpointDelegates = false;
    function initPawpointTab() {
        renderPawpointHistory();
        if (_hasAttachedPawpointDelegates) return;
        _hasAttachedPawpointDelegates = true;

        document.getElementById('formAdjustPoints')?.addEventListener('submit',event=>{event.preventDefault();handleAdjustPointsSubmit();});
        ['adjustPhone','adjustPointsVal','adjustReason'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>adjustError(id,'')));

        // Xử lý autocomplete khách hàng
        document.addEventListener('focusin', (e) => {
            if (e.target && e.target.id === 'adjustPhone') {
                renderAdjustCustomerDropdown(e.target.value);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'adjustPhone') {
                selectedAdjustCustomer = null;
                clearTimeout(adjustLookupTimer);const query=e.target.value;adjustLookupTimer=setTimeout(()=>renderAdjustCustomerDropdown(query),350);
            }
        });

        document.addEventListener('click', (e) => {
            // Đóng autocomplete popover khi click ngoài
            if (!e.target.closest('.customer-autocomplete-wrapper')) {
                const dd = getAdjustCustomerDropdown();
                if (dd) dd.style.display = 'none';
            }

            // Chọn nhanh lý do từ quick chips
            const chip = e.target.closest('#adjustReasonQuickTags .reason-quick-chip');
            if (chip) {
                e.preventDefault();
                const reasonInput = getAdjustReasonInput();
                if (reasonInput) {
                    reasonInput.value = chip.textContent.trim();
                    reasonInput.focus();
                }
            }

            // Nút mở modal điều chỉnh
            if (e.target.closest('#btnOpenAdjustPointsModal')) {
                e.preventDefault();
                openAdjustPointsModal();
            }

            // Nút đóng modal
            if (e.target.closest('#btnCloseAdjustPoints') || e.target.closest('#btnCancelAdjustPoints')) {
                e.preventDefault();
                closeAdjustModal();
            }

            // Nút xác nhận điều chỉnh
            if (e.target.closest('#btnSubmitAdjustPoints')) {
                e.preventDefault();
                handleAdjustPointsSubmit();
            }

            // Nút xuất CSV
            if (e.target.closest('#btnExportPawpointHistory')) {
                e.preventDefault();
                exportPawpointHistoryToCSV();
            }
        });

        // Tìm kiếm và lọc bảng lịch sử Pawpoint
        let ledgerSearchTimer;
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'pawpointSearchInput') {
                clearTimeout(ledgerSearchTimer);ledgerSearchTimer=setTimeout(()=>{pawpointCurrentPage=1;renderPawpointHistory();},350);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'pawpointFilterType') {
                clearTimeout(ledgerSearchTimer);pawpointCurrentPage=1;renderPawpointHistory();
            }
        });
    }

    // Đăng ký subtab vào namespace
    PawpalCustomers.subtabs.pawpoint = {
        init: initPawpointTab,
        renderPawpointHistory,
        openAdjustPointsModal,
        exportPawpointHistoryToCSV
    };

    // Khởi tạo nếu DOM đã sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPawpointTab);
    } else {
        initPawpointTab();
    }
})();
