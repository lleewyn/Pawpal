(function(){
 'use strict';
 const message=error=>({
  sales_order_forbidden:'Bạn chưa có quyền xử lý đơn và tồn kho.',
  sales_order_not_found:'Không tìm thấy đơn hàng. Tải lại danh sách để kiểm tra.',
  sales_order_changed:'Đơn đã thay đổi. Đóng cửa sổ và mở lại để kiểm tra dữ liệu mới.',
  invalid_sales_transition:'Trạng thái hiện tại không cho phép thao tác này.',
  sales_shipping_details_required:'Chọn đơn vị vận chuyển, nhập mã vận đơn và kiểm tra đủ địa chỉ nhận hàng.',
  sales_cancel_reason_required:'Nhập lý do hủy đơn.',
  sales_refund_required:'Hoàn đủ số tiền đã thu tại thu ngân trước khi hủy đơn.',
  sales_order_empty:'Đơn chưa có sản phẩm để xử lý.',
  sales_issued_order_requires_return:'Hàng đã xuất kho cần được xử lý qua yêu cầu trả hàng.',
  sales_checkout_forbidden:'Bạn chưa có quyền lập đơn bán hàng.',
  invalid_sales_checkout:'Chọn khách đang hoạt động và kiểm tra thông tin đơn.',
  sales_delivery_required:'Điền đủ người nhận, số điện thoại, địa chỉ, tỉnh thành và hình thức giao.',
  invalid_sales_line:'Số lượng mỗi biến thể phải là số nguyên dương.',
  sales_variant_not_sellable:'Biến thể đã ngừng bán hoặc giá bán cần được đối soát.',
  sales_available_stock_insufficient:'Số lượng vượt tồn còn có thể bán sau khi giữ hàng.',
  sales_quote_changed:'Giá, ưu đãi hoặc tồn đã thay đổi. Kiểm tra bản tính mới rồi tạo đơn lại.',
  sales_request_conflict:'Yêu cầu này đã được ghi với nội dung khác. Tải lại để đối chiếu.',
  sales_points_insufficient:'Khách không đủ điểm để quy đổi.',
  sales_points_exceed_total:'Số điểm quy đổi vượt giá trị hàng hóa.',
  invalid_sales_points:'Nhập số điểm nguyên không âm.',
  sales_points_not_configured:'Chưa cấu hình quy đổi điểm, đơn chưa áp dụng điểm.',
  sales_tier_not_configured:'Khách chưa có hạng đang áp dụng, đơn chưa giảm theo hạng.',
  sales_voucher_not_applicable:'Mã không có hiệu lực hoặc không đủ điều kiện áp dụng cho đơn này.',
  sales_voucher_exhausted:'Mã khuyến mãi đã hết lượt sử dụng.',
  sales_owned_voucher_required:'Mã này cần được đổi hoặc phát hành cho đúng khách trước khi sử dụng.'
 })[error?.message]||'Không thể tính hoặc lưu đơn. Kiểm tra dữ liệu và thử lại.';
 const db=()=>window.getSupabaseClient();
 async function config(){
  const [delivery,methods,points]=await Promise.all([
   window.PawpalOrderV1.rows(()=>db().from('delivery_option_config').select('id,name,fee,estimated_days').eq('available',true).order('id')),
   window.PawpalOrderV1.rows(()=>db().from('payment_method_config').select('id,name').eq('available',true).eq('fee',0).in('name',['Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR']).order('id')),
   db().from('pawpal_setting').select('setting_value').eq('setting_key','sales_point_redemption_value').maybeSingle()
  ]);
  if(points.error)throw points.error;
  return {delivery,methods,pointValue:/^[1-9][0-9]{0,8}$/.test(points.data?.setting_value||'')?Number(points.data.setting_value):null};
 }
 async function quote(request){const {data,error}=await db().rpc('quote_admin_sales_order',{p_customer_id:request.customerId,p_details:request.details,p_lines:request.lines});if(error)throw error;return data;}
 async function create(id,request,version){const {data,error}=await db().rpc('create_admin_sales_order',{p_order_id:id,p_customer_id:request.customerId,p_expected_quote:version,p_details:request.details,p_lines:request.lines});if(error)throw error;return data;}
 window.PawpalSalesCheckout={config,quote,create,message};
})();

;

(function(){
 'use strict';
 const el=id=>document.getElementById(id),value=id=>el(id)?.value.trim()||'';
 window.PawpalSalesPos={create({getCustomer,getCart,onPrices}){
  let quote=null,signature='',quotedSignature='',generation=0,timer=null,errorText='',reviewText='',ready=false,saving=false;
  let methods=[];
  const request=()=>{
   const customer=getCustomer(),delivery=!!el('radioAddrDelivery')?.checked,mode=value('createOrderDiscountMode');
   return {customerId:customer?.id||null,details:{delivery,delivery_option_id:delivery?value('createOrderDeliveryOption')||null:null,
    receiver_name:delivery?value('createOrderReceiverName'):customer?.rawName||null,receiver_phone:delivery?value('createOrderReceiverPhone'):customer?.phone||null,
    province:delivery?value('createOrderProvince'):'',street_address:delivery?value('createOrderCustomAddress'):'',note:value('createOrderNote'),discount_mode:mode,
    voucher_code:mode==='voucher'?value('createOrderVoucherCode'):'',points:mode==='points'?Number(value('createOrderPointsInput')||0):0},
    lines:getCart().map(v=>({variant_id:v.variantId,quantity:Number(v.qty)}))};
  };
  function paint(){
   const format=window.PawpalOrders.helpers.formatVND,q=quote;
   const amounts={posLiveSubtotal:q?.subtotal,posLiveTierDiscount:q?.details.discount_mode==='tier'?q.line_discount:0,posLiveVoucherDiscount:q?.voucher_discount,
    posLivePointsDiscount:q?.details.discount_mode==='points'?q.line_discount:0,posLiveShippingFee:q?.shipping_fee,posLiveTotal:q?.total};
   for(const [id,amount] of Object.entries(amounts))if(el(id))el(id).textContent=amount===undefined?'—':format(amount);
   for(const [id,amount] of [['posRowTierDiscount',amounts.posLiveTierDiscount],['posRowVoucherDiscount',amounts.posLiveVoucherDiscount],['posRowPointsDiscount',amounts.posLivePointsDiscount],['posRowShippingFee',amounts.posLiveShippingFee]])if(el(id))el(id).style.display=Number(amount)>0?'':'none';
   for(const id of ['btnSubmitCreateOrder','btnFinalizePosOrder','btnCashExact'])if(el(id))el(id).disabled=!q||saving;
   if(el('posCartItemCount'))el('posCartItemCount').textContent=getCart().reduce((n,i)=>n+Number(i.qty||0),0);
   el('btnPosQuickCustomer').style.display=getCustomer()?'none':'';
   el('createOrderNameRequiredStar').style.display=getCustomer()?'none':'';el('createOrderName').setAttribute('aria-required',String(!getCustomer()));el('createOrderPhone').setAttribute('aria-required','true');
   const mode=value('createOrderDiscountMode');el('createOrderVoucherCode').closest('.form-group-item').style.display=mode==='voucher'?'':'none';el('createOrderPointsInput').closest('.form-group-item').style.display=mode==='points'?'':'none';
   el('deliveryDetailFields').style.display=el('radioAddrDelivery').checked?'block':'none';
   el('posCashCalcSection').style.display=methods.find(m=>m.id===value('createOrderPaymentMethod'))?.name==='Tiền mặt'?'block':'none';
   const cash=Number(value('createOrderCashTendered')||0);el('posLiveCashChange').textContent=q?format(Math.max(0,cash-q.total)):'—';
   const notice=el('posPricingNotice');notice.classList.toggle('is-error',Boolean(errorText));
   notice.textContent=errorText||reviewText||(q?.warning?window.PawpalSalesCheckout.message({message:q.warning}):q?'Đơn giữ hàng chưa ghi nhận thu tiền.':ready?'Chọn khách và thêm sản phẩm để tính giá.':'Đang tải cấu hình bán hàng…');
   return {subtotal:q?.subtotal||0,tierDiscount:amounts.posLiveTierDiscount||0,voucherDiscount:q?.voucher_discount||0,pointsDiscount:amounts.posLivePointsDiscount||0,
    shippingFee:q?.shipping_fee||0,grandTotal:q?.total||0,pointsUsed:q?.points_used||0,cashTendered:cash,cashChange:q?Math.max(0,cash-q.total):0};
  }
  function update(force=false){
   const current=request(),next=JSON.stringify(current);
   if(force||next!==signature){
    signature=next;quote=null;quotedSignature='';errorText='';clearTimeout(timer);const id=++generation;
    if(ready&&current.customerId&&current.lines.length){
     timer=setTimeout(async()=>{
      try{const result=await window.PawpalSalesCheckout.quote(current);if(id!==generation)return;quote=result;quotedSignature=next;onPrices(result.lines);paint();}
      catch(error){if(id!==generation)return;errorText=window.PawpalSalesCheckout.message(error);quote=null;paint();}
     },250);
    }
   }
   return paint();
  }
  async function reset(){
   clearTimeout(timer);generation++;quote=null;signature='';quotedSignature='';errorText='';reviewText='';ready=false;saving=false;methods=[];paint();
   try{
    const config=await window.PawpalSalesCheckout.config();methods=config.methods;
    if(el('createOrderPointsRate'))el('createOrderPointsRate').textContent=config.pointValue?'Giá trị quy đổi: '+window.PawpalOrders.helpers.formatVND(config.pointValue)+' / điểm.':'Cửa hàng chưa cấu hình giá trị quy đổi điểm.';
    el('createOrderDeliveryOption').replaceChildren(new Option('Chọn hình thức giao',''),...config.delivery.map(v=>new Option(v.name+' · '+window.PawpalOrders.helpers.formatVND(v.fee),v.id)));
    el('createOrderPaymentMethod').replaceChildren(new Option('Chọn phương thức dự kiến',''),...methods.map(v=>new Option(v.name,v.id)));el('createOrderPaymentMethod').value=methods.find(v=>v.name==='Tiền mặt')?.id||'';
    window.PawpalOrders.enhanceEntitySelects?.();ready=true;update(true);
   }catch(error){errorText='Không tải được cấu hình bán hàng. Đóng và mở lại để thử lại.';paint();}
  }
  async function save(id){
   if(saving||!quote||quotedSignature!==JSON.stringify(request()))throw Error('sales_quote_changed');
   saving=true;paint();
   try{return await window.PawpalSalesCheckout.create(id,request(),quote.version);}
   catch(error){if(error.code==='PT409'){reviewText='Bản tính đã cập nhật. Kiểm tra giá và ưu đãi rồi bấm tạo đơn lại.';update(true);}throw error;}
   finally{saving=false;paint();}
  }
  for(const id of ['createOrderDiscountMode','createOrderVoucherCode','createOrderPointsInput','createOrderDeliveryOption','createOrderReceiverName','createOrderReceiverPhone','createOrderProvince','createOrderCustomAddress','createOrderNote','createOrderPaymentMethod','radioAddrInStore','radioAddrDelivery']){
   el(id)?.addEventListener('input',()=>update());el(id)?.addEventListener('change',()=>update());
  }
  const voucher=el('createOrderVoucherCode'),popover=el('createOrderVoucherDropdown');
  const renderVouchers=()=>{popover.replaceChildren();for(const v of window.PawpalOrders.state.vouchers||[]){if(!['all','shop'].includes(v.target)||v.status!=='active'||!window.PawpalOrders.helpers.matchSearch(v.code+' '+v.name,voucher.value))continue;
   const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';button.textContent=v.dbCode+' · '+v.name+' · '+v.discount;button.onmousedown=e=>e.preventDefault();button.onclick=()=>{voucher.value=v.dbCode;popover.style.display='none';update();};popover.append(button);
  }popover.style.display=popover.childElementCount?'block':'none';};
  voucher.addEventListener('input',renderVouchers);voucher.addEventListener('focus',renderVouchers);voucher.addEventListener('blur',()=>setTimeout(()=>popover.style.display='none',100));
  return {update,reset,save};
 }};
})();

;

// tab-order-list.js - Subtab Quản lý Danh sách Đơn hàng & POS của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders List] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const {
        formatVND, formatDateTime, formatDate, formatTime,
        showToast, showOrderConfirmModal,
        generatePackingSlipHtml, generateManifestHtml, getOrderSlaInfo,
        matchSearch, persistOrdersData, persistProductsData, syncOrdersAndProductsFromSupabase
    } = helpers;

    const ORDERS_PER_PAGE = 10;
    let ordersCurrentPage = parseInt(sessionStorage.getItem('pawpal_admin_orders_page') || '1', 10);
    if (isNaN(ordersCurrentPage) || ordersCurrentPage < 1) ordersCurrentPage = 1;

    let currentFilterStatus = 'ALL';
    let currentFilterPayment = 'ALL';
    let currentFilterPayStatus = 'ALL';
    let filterComplaintOnly = false;
    let filterUrgentOnly = false;
    let filterSlaOverdueOnly = false;

    // Render phân trang đơn hàng
    function renderOrdersPagination(totalPages) {
        const pagContainer = document.getElementById('ordersPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.style.display = 'none';
            return;
        }
        pagContainer.style.display = 'flex';

        let html = '';
        const prevDisabled = ordersCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" ${prevDisabled} data-page="prev" title="Trang trước">&lt;</button>`;

        const firstPage = Math.max(1, Math.min(ordersCurrentPage - 2, totalPages - 4));
        const lastPage = Math.min(totalPages, firstPage + 4);
        for (let p = firstPage; p <= lastPage; p++) {
            const activeClass = p === ordersCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = ordersCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" ${nextDisabled} data-page="next" title="Trang sau">&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (ordersCurrentPage > 1) {
                        ordersCurrentPage--;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                } else if (pageAction === 'next') {
                    if (ordersCurrentPage < totalPages) {
                        ordersCurrentPage++;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== ordersCurrentPage) {
                        ordersCurrentPage = targetP;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                }
            });
        });
    }

    // Xóa tất cả bộ lọc đơn hàng
    function clearAllOrderFilters() {
        const searchInput = document.getElementById('orderSearchInput');
        const filterStatus = document.getElementById('orderFilterStatus');
        const filterPayment = document.getElementById('orderFilterPayment');
        const filterPayStatus = document.getElementById('orderFilterPayStatus');
        const btnClearOrderSearch = document.getElementById('btnClearOrderSearch');
        const btnOrderClearFilters = document.getElementById('btnOrderClearFilters');

        if (searchInput) searchInput.value = '';
        if (btnClearOrderSearch) btnClearOrderSearch.style.display = 'none';
        if (btnOrderClearFilters) btnOrderClearFilters.style.display = 'none';
        if (filterStatus) filterStatus.value = 'ALL';
        if (filterPayment) filterPayment.value = 'ALL';
        if (filterPayStatus) filterPayStatus.value = 'ALL';

        currentFilterStatus = 'ALL';
        currentFilterPayment = 'ALL';
        currentFilterPayStatus = 'ALL';
        filterComplaintOnly = false;
        filterUrgentOnly = false;
        filterSlaOverdueOnly = false;
        ordersCurrentPage = 1;

        const btnComplaint = document.getElementById('btnFilterComplaintOrders');
        if (btnComplaint) btnComplaint.classList.remove('active');
        const btnUrgent = document.getElementById('btnFilterUrgentOrders');
        if (btnUrgent) btnUrgent.classList.remove('active');
        const btnSla = document.getElementById('btnFilterSlaOverdue');
        if (btnSla) btnSla.classList.remove('active');

        document.querySelectorAll('.order-kpi-card, .kpi-card-clickable').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.order-quick-filter-btn').forEach(b => b.classList.remove('active'));

        renderOrdersTable();
    }

    // Render bảng danh sách đơn hàng
    async function renderOrdersTable({skipFetch=false}={}) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;
        const pendingStatus = sessionStorage.getItem('pawpal_admin_order_filter_status');
        if(pendingStatus){sessionStorage.removeItem('pawpal_admin_order_filter_status');currentFilterStatus=pendingStatus;ordersCurrentPage=1;const select=document.getElementById('orderFilterStatus');if(select)select.value=pendingStatus;}
        if(state.serverPagination&&!skipFetch){
            tbody.inert=true;tbody.setAttribute('aria-busy','true');
            const filters={query:(document.getElementById('orderSearchInput')?.value||'').trim(),status:currentFilterStatus,payment:currentFilterPayment,payStatus:currentFilterPayStatus,complaint:filterComplaintOnly,urgent:filterUrgentOnly,overdue:filterSlaOverdueOnly};
            const success=await PawpalOrders.fetchOrdersData({filters,page:ordersCurrentPage,render:false});
            if(success===false&&!state.ordersError)return;
            tbody.inert=false;tbody.removeAttribute('aria-busy');
            if(success)ordersCurrentPage=state.orderPageMeta.page;
        }
        if(skipFetch){tbody.inert=false;tbody.removeAttribute('aria-busy');}
        if (state.ordersError) {
            renderOrdersPagination(0);
            for (const id of ['batchActionToolbar', 'codReconcileSummaryStrip']) {
                const element = document.getElementById(id);
                if (element) element.style.display = 'none';
            }
            const selectAll = document.getElementById('checkSelectAllOrders');
            if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải dữ liệu. Vui lòng tải lại trang.</td></tr>';
            return;
        }


        const ordersList = state.serverPagination ? (state.pageOrders||[]) : (state.orders || []);
        if (!state.ordersLoaded) return;

        // Tự động nhận diện bộ lọc trạng thái chuyển tiếp từ Dashboard
        const pendingStatusFromSession = sessionStorage.getItem('pawpal_admin_order_filter_status');
        if (pendingStatusFromSession) {
            sessionStorage.removeItem('pawpal_admin_order_filter_status');
            currentFilterStatus = pendingStatusFromSession;
            const filterStatusSelect = document.getElementById('orderFilterStatus');
            if (filterStatusSelect) filterStatusSelect.value = pendingStatusFromSession;
            ordersCurrentPage = 1;
        }

        // Cập nhật 6 thẻ KPI nhanh
        const statTotalOrdersEl = document.getElementById('statTotalOrders');
        const statPendingOrdersEl = document.getElementById('statPendingOrders');
        const statPreparingOrdersEl = document.getElementById('statPreparingOrders');
        const statShippingOrdersEl = document.getElementById('statShippingOrders');
        const statCompletedOrdersEl = document.getElementById('statCompletedOrders');
        const statCancelledOrdersEl = document.getElementById('statCancelledOrders');

        if (statTotalOrdersEl) statTotalOrdersEl.textContent = ordersList.filter(order => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(order.createdAt)) === new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).length;
        if (statPendingOrdersEl) statPendingOrdersEl.textContent = ordersList.filter(o => ['pending', 'cho_xac_nhan'].includes(o.status)).length;
        if (statPreparingOrdersEl) statPreparingOrdersEl.textContent = ordersList.filter(o => ['confirmed', 'packing', 'dang_dong_goi', 'da_xac_nhan'].includes(o.status)).length;
        if (statShippingOrdersEl) statShippingOrdersEl.textContent = ordersList.filter(o => ['shipping', 'dang_giao_hang'].includes(o.status)).length;
        if (statCompletedOrdersEl) statCompletedOrdersEl.textContent = ordersList.filter(o => ['completed', 'delivered', 'da_giao_hang', 'da_giao'].includes(o.status)).length;
        if (statCancelledOrdersEl) statCancelledOrdersEl.textContent = ordersList.filter(o => ['cancelled', 'returned', 'da_huy', 'da_tra_hang'].includes(o.status)).length;

        if(state.serverPagination)Object.entries(state.orderPageMeta?.counts||{}).forEach(([id,value])=>{const element=document.getElementById(id);if(element)element.textContent=String(value);});

        const searchVal = (document.getElementById('orderSearchInput')?.value || '').trim();
        const btnOrderClearFilters = document.getElementById('btnOrderClearFilters');

        const isAnyFilterActive = Boolean(
            searchVal ||
            currentFilterStatus !== 'ALL' ||
            currentFilterPayment !== 'ALL' ||
            currentFilterPayStatus !== 'ALL' ||
            filterComplaintOnly ||
            filterUrgentOnly ||
            filterSlaOverdueOnly
        );
        if (btnOrderClearFilters) {
            btnOrderClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
        }

        const filtered = state.serverPagination ? ordersList : ordersList.filter(o => {
            const sla = getOrderSlaInfo(o);

            if (currentFilterStatus !== 'ALL' && o.status !== currentFilterStatus) return false;
            if (currentFilterPayment !== 'ALL' && o.paymentMethod !== currentFilterPayment) return false;
            if (currentFilterPayStatus !== 'ALL') {
                if (currentFilterPayStatus === 'refund_pending') {
                    if (o.paymentStatus !== 'refund_pending' && o.paymentStatus !== 'pending_refund') return false;
                } else if (o.paymentStatus !== currentFilterPayStatus) {
                    return false;
                }
            }
            // alertType danger cũng dùng cho SLA quá hạn; bộ lọc khiếu nại chỉ
            // nhận đơn đổi trả hoặc có hồ sơ RMA thực tế.
            if (filterComplaintOnly && o.status !== 'returned' && !o.rmaInfo) return false;
            if (filterUrgentOnly && sla.level !== 'danger' && sla.level !== 'warning') return false;
            if (filterSlaOverdueOnly && !sla.isSlaOverdue) return false;

            if (searchVal) {
                const matchId = matchSearch(o.id, searchVal);
                const matchName = matchSearch(o.customerName, searchVal);
                const matchPhone = matchSearch(o.phone, searchVal);
                const matchTrack = matchSearch(o.trackingNumber, searchVal);
                const matchItems = (o.products && o.products.some(it => matchSearch(it.name, searchVal) || matchSearch(it.sku, searchVal)));
                if (!matchId && !matchName && !matchPhone && !matchTrack && !matchItems) return false;
            }
            return true;
        });

        // Dải tổng hợp đối soát dòng tiền COD
        const codStrip = document.getElementById('codReconcileSummaryStrip');
        const codPendingOrders = ordersList.filter(o => o.paymentStatus === 'cod_pending');
        const totalCodAmount = codPendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        if (codStrip) {
            if (currentFilterPayStatus === 'cod_pending' || codPendingOrders.length > 0) {
                codStrip.style.display = 'flex';
                const countEl = document.getElementById('dispCodPendingCount');
                const amtEl = document.getElementById('dispCodPendingAmount');
                if (countEl) countEl.textContent = `${codPendingOrders.length} đơn hàng`;
                if (amtEl) amtEl.textContent = formatVND(totalCodAmount);
            } else {
                codStrip.style.display = 'none';
            }
        }

        // Dải thao tác hàng loạt
        const batchToolbar = document.getElementById('batchActionToolbar');
        const batchCountEl = document.getElementById('batchSelectedCount');
        const selectedBatchOrderIds = state.selectedBatchOrderIds || [];
        if (batchToolbar) {
            if (selectedBatchOrderIds.length > 0) {
                batchToolbar.style.display = 'flex';
                if (batchCountEl) batchCountEl.textContent = selectedBatchOrderIds.length;
            } else {
                batchToolbar.style.display = 'none';
            }
        }

        const checkAllEl = document.getElementById('checkSelectAllOrders');
        if (checkAllEl) {
            checkAllEl.checked = filtered.length > 0 && filtered.every(o => selectedBatchOrderIds.includes(o.id));
        }

        // Tính toán phân trang
        const totalOrdersPages = Math.ceil((state.serverPagination ? state.orderPageMeta.total : filtered.length) / ORDERS_PER_PAGE) || 1;
        if (ordersCurrentPage > totalOrdersPages) ordersCurrentPage = totalOrdersPages;
        if (ordersCurrentPage < 1) ordersCurrentPage = 1;
        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);

        const startIdx = (ordersCurrentPage - 1) * ORDERS_PER_PAGE;
        const pagedOrders = state.serverPagination ? filtered : filtered.slice(startIdx, startIdx + ORDERS_PER_PAGE);
        if (checkAllEl) {
            const selectedOnPage = pagedOrders.filter(o => selectedBatchOrderIds.includes(o.id)).length;
            checkAllEl.checked = pagedOrders.length > 0 && selectedOnPage === pagedOrders.length;
            checkAllEl.indeterminate = selectedOnPage > 0 && selectedOnPage < pagedOrders.length;
        }

        if (pagedOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
                        <div>Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại. 
                        <button type="button" id="btnResetOrderFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetOrderFilters')?.addEventListener('click', clearAllOrderFilters);
            renderOrdersPagination(0);
            return;
        }

        tbody.innerHTML = pagedOrders.map(o => {
            const sla = getOrderSlaInfo(o);

            let statusBadge = '';
            if (['pending', 'cho_xac_nhan'].includes(o.status)) statusBadge = '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
            else if (['confirmed', 'packing', 'dang_dong_goi', 'da_xac_nhan'].includes(o.status)) statusBadge = '<span class="admin-badge badge-neutral">Đang chuẩn bị</span>';
            else if (['shipping', 'dang_giao_hang'].includes(o.status)) statusBadge = '<span class="admin-badge badge-info">Đang giao</span>';
            else if (['delivered', 'completed', 'da_giao_hang'].includes(o.status)) statusBadge = '<span class="admin-badge badge-success">Hoàn tất</span>';
            else if (['cancelled', 'da_huy'].includes(o.status)) statusBadge = '<span class="admin-badge badge-danger">Đã hủy</span>';
            else if (['returned', 'da_tra_hang'].includes(o.status)) statusBadge = '<span class="admin-badge badge-danger">Đổi trả</span>';
            else statusBadge = `<span class="admin-badge badge-neutral">${o.status}</span>`;

            let payBadge = '';
            if (o.total===0) {
                payBadge = '<span class="admin-badge badge-neutral">Không phải thu</span>';
            } else if (o.paymentStatus==='partial') {
                payBadge = '<span class="admin-badge badge-warning">Đã thu một phần</span>';
            } else if (['paid', 'da_thanh_toan'].includes(o.paymentStatus)) {
                payBadge = '<span class="admin-badge badge-success">Đã thanh toán</span>';
            } else if (['refund_pending', 'pending_refund', 'cho_hoan_tien'].includes(o.paymentStatus)) {
                payBadge = '<span class="admin-badge badge-warning">Chờ hoàn tiền</span>';
            } else if (['refunded', 'da_hoan_tien'].includes(o.paymentStatus)) {
                payBadge = '<span class="admin-badge badge-danger">Đã hoàn tiền</span>';
            } else if (['cancelled', 'da_huy'].includes(o.paymentStatus)) {
                payBadge = '<span class="admin-badge badge-danger">Đã hủy</span>';
            } else if (['cod_pending'].includes(o.paymentStatus)) {
                payBadge = '<span class="admin-badge badge-warning">Chờ đối soát COD</span>';
            } else {
                payBadge = '<span class="admin-badge badge-neutral">Chưa thanh toán</span>';
            }

            let rowAlertClass = '';
            let alertLabel = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            if (o.status === 'cancelled') {
                rowAlertClass += ' row-locked';
            } else if (sla.level === 'danger') {
                rowAlertClass = 'row-alert-danger';
                alertLabel = `<span class="alert-indicator text-danger">• ${sla.label}</span>`;
            } else if (sla.level === 'warning') {
                rowAlertClass = 'row-alert-warning';
                alertLabel = `<span class="alert-indicator text-warning">• ${sla.label}</span>`;
            }

            const firstProd = (o.products && o.products[0]) ? o.products[0] : null;
            const moreCount = (o.products ? o.products.length : 0) - 1;
            const prodSummary = firstProd ? (firstProd.name + (moreCount > 0 ? ` (+${moreCount} món)` : '')) : '--';

            const payMethodLabel = o.paymentMethodName;

            const esc = (text) => window.PawpalOrdersModule?.escapeHtml ? window.PawpalOrdersModule.escapeHtml(text) : String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
            const isChecked = selectedBatchOrderIds.includes(o.id);
            const safeId = esc(o.id);
            const safeName = esc(o.customerName);
            const safePhone = esc(o.phone);
            const safeUserId = esc(o.userId);
            const safeProdSummary = esc(prodSummary);
            const safeCarrier = esc(o.carrier || '--');
            const safeTracking = esc(o.trackingNumber || '--');

            return `
                <tr class="${rowAlertClass}">
                    <td style="text-align: center; width: 42px;">
                        <input type="checkbox" class="admin-checkbox order-row-checkbox" data-id="${safeId}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="order-code-link btn-open-order-detail" data-id="${safeId}">${safeId}</a>
                    </td>
                    <td>
                        <div>
                            <span class="user-name-link btn-open-customer-profile" data-user-id="${safeUserId}" data-user-name="${safeName}">${safeName}</span>
                            <div class="sub-meta-text">${safePhone}</div>
                        </div>
                    </td>
                    <td style="max-width: 240px;">
                        <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeProdSummary}">${safeProdSummary}</div>
                        <div class="sub-meta-text">Tổng: ${(o.products || []).reduce((acc, p) => acc + (p.quantity || 1), 0)} sản phẩm</div>
                    </td>
                    <td>
                        <div class="price-text-main">${formatVND(o.total)}</div>
                    </td>
                    <td>
                        <div>${esc(payMethodLabel)}</div>
                        <div style="margin-top: 2px;">${payBadge}</div>
                    </td>
                    <td>
                        <div>${safeCarrier}</div>
                        <div class="sub-meta-text" style="font-family: monospace;">${safeTracking}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${alertLabel}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-order-action-trigger" data-id="${safeId}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.order-row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = cb.getAttribute('data-id');
                PawpalOrdersModule.toggleSelectOrder?.(e, id);
            });
        });
        tbody.querySelectorAll('.btn-open-order-detail').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                PawpalOrdersModule.openOrderDetail?.(id);
            });
        });
        tbody.querySelectorAll('.btn-open-customer-profile').forEach(el => {
            el.addEventListener('click', () => {
                const uid = el.getAttribute('data-user-id');
                const uname = el.getAttribute('data-user-name');
                PawpalOrdersModule.openCustomerProfile?.(uid, uname);
            });
        });
        tbody.querySelectorAll('.btn-order-action-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                PawpalOrdersModule.openActionDropdown?.(e, id);
            });
        });

        renderOrdersPagination(totalOrdersPages);
    }

    // ====================================================================
    // POS: GIỎ HÀNG TẠO ĐƠN TẠI QUẦY
    // ====================================================================
    let activePosCustomer = null;
    const posPricing=window.PawpalSalesPos.create({getCustomer:()=>activePosCustomer,getCart:()=>posCartItems,onPrices:lines=>{
        for(const line of lines){const item=posCartItems.find(i=>i.variantId===line.variant_id);if(item){item.price=line.unit_price;item.name=line.name;}}
        renderPosCartTable();
    }});
    let posCartItems = [];
    let posCustomerDirectory = [];
    function setPosFieldError(inputId,errorId,message=''){
        const input=document.getElementById(inputId),error=document.getElementById(errorId);
        input?.setAttribute('aria-invalid',String(Boolean(message)));
        if(error){error.textContent=message;error.style.display=message?'':'none';}
    }
    const posDeliveryErrors={createOrderReceiverName:['createOrderReceiverNameError','Nhập tên người nhận.'],createOrderReceiverPhone:['createOrderReceiverPhoneError','Kiểm tra số điện thoại người nhận.'],createOrderCustomAddress:['createOrderAddressError','Nhập địa chỉ giao hàng.'],createOrderProvince:['createOrderProvinceError','Nhập tỉnh hoặc thành phố.'],createOrderDeliveryOption:['createOrderDeliveryOptionError','Chọn hình thức giao hàng.']};
    function validatePosDeliveryField(id){
        const input=document.getElementById(id),value=input.value.trim(),[errorId,message]=posDeliveryErrors[id];
        const invalid=document.getElementById('radioAddrDelivery').checked&&(!value||(id==='createOrderReceiverPhone'&&!/^\+?[0-9][0-9 .()-]{7,19}$/.test(value)));
        setPosFieldError(id,errorId,invalid?message:'');
    }
    let posDisabledSnapshot=null,posPreviousFocus=null;
    function setPosPending(pending){
        const modal=document.getElementById('modalCreateOrder'),form=document.getElementById('formCreateOrder');
        modal.dataset.saving=String(pending);form.setAttribute('aria-busy',String(pending));form.inert=pending;
        if(pending){
            posPreviousFocus=document.activeElement;
            posDisabledSnapshot=new Map([...modal.querySelectorAll('input,select,textarea,button')].map(input=>[input,input.disabled]));
            posDisabledSnapshot.forEach((disabled,input)=>input.disabled=true);
            modal.querySelector('.admin-modal-card').focus();
        }else{
            const quoteDisabled=new Map(['btnSubmitCreateOrder','btnFinalizePosOrder','btnCashExact'].map(id=>document.getElementById(id)).filter(Boolean).map(button=>[button,button.disabled]));
            posDisabledSnapshot?.forEach((disabled,input)=>input.disabled=disabled);posDisabledSnapshot=null;quoteDisabled.forEach((disabled,button)=>button.disabled=disabled);
            if(modal.classList.contains('active'))(posPreviousFocus?.getClientRects().length&&!posPreviousFocus.disabled?posPreviousFocus:modal.querySelector('.admin-modal-card')).focus();
            posPreviousFocus=null;
        }
    }

    let customerSearchTimer,productSearchTimer,customerSearchVersion=0,productSearchVersion=0;
    let posProductChoices=[];
    async function loadPosCustomerDirectory({query=''}={}) {
        posCustomerDirectory=await window.PawpalOrderV1.searchCustomers(query.trim().slice(0,200));
        return posCustomerDirectory;
    }
    function renderCreateOrderCustomerDropdown(query='') {
        clearTimeout(customerSearchTimer);const version=++customerSearchVersion;
        const root=document.getElementById('createOrderCustomerDropdown');root.replaceChildren();root.style.display='block';root.textContent='Đang tìm khách hàng...';
        customerSearchTimer=setTimeout(async()=>{
            try{
                const rows=await window.PawpalOrderV1.searchCustomers(query.trim().slice(0,200));
                if(version!==customerSearchVersion||document.activeElement!==document.getElementById('createOrderPhone'))return;
                posCustomerDirectory=rows;root.replaceChildren();
                for(const customer of rows){
                    const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';
                    const name=document.createElement('strong');name.textContent=customer.name||'Chưa có tên khách';
                    const info=document.createElement('div');info.className='sub-meta-text';info.textContent=[customer.phone,customer.phoneUnverified?'Chưa xác minh':'',customer.customerType==='guest'?'Khách vãng lai':'',customer.rank].filter(Boolean).join(' · ');
                    button.append(name,info);button.onmousedown=e=>e.preventDefault();button.onclick=()=>selectPosCustomer(customer);root.append(button);
                }
                if(!rows.length&&!query.trim()){root.style.display='none';return;}
                if(!rows.length)root.textContent='Chưa tìm thấy khách phù hợp.';
            }catch(error){if(version===customerSearchVersion)root.textContent='Không thể tìm khách. Vui lòng thử lại.';}
        },300);
    }

    async function selectPosCustomer(customer){
        clearTimeout(customerSearchTimer);const version=++customerSearchVersion;
        document.getElementById('createOrderCustomerDropdown').style.display='none';
        try{
            const details=await window.PawpalOrderV1.customers({id:customer.id});
            if(version!==customerSearchVersion)return;
            customer=details[0];if(!customer)throw Error('sales_customer_not_found');
        }catch(error){if(version===customerSearchVersion)document.getElementById('posPricingNotice').textContent='Không thể tải hồ sơ khách. Vui lòng chọn lại.';return;}

        setPosFieldError('createOrderPhone','createOrderPhoneError');setPosFieldError('createOrderName','createOrderNameError');
        activePosCustomer=customer;document.getElementById('createOrderName').value=customer.rawName||'';document.getElementById('createOrderName').readOnly=true;document.getElementById('createOrderPhone').value=customer.phone;
        document.getElementById('createOrderCustomerDropdown').style.display='none';
        for(const [id,text] of [['posCustCardName',customer.name],['posCustCardPhone',customer.phone+(customer.phoneUnverified?' · Chưa xác minh':'')],['posCustCardRank',customer.rank],['posCustCardPoints',customer.points+' \u0111i\u1ec3m']])document.getElementById(id).textContent=text;
        document.getElementById('posCustomerSelectedCard').style.display='flex';document.getElementById('createOrderMemberBanner').style.display='none';
        const address=customer.defaultAddress;
        document.getElementById('createOrderCustomAddress').value=address?.street_address||'';document.getElementById('createOrderProvince').value=address?.province||'';
        document.getElementById('createOrderReceiverName').value=address?.receiver_name||customer.rawName||'';document.getElementById('createOrderReceiverPhone').value=address?.receiver_phone||customer.phone;
        document.getElementById('btnClearSelectedCustomer').onclick=()=>{
            ++customerSearchVersion;activePosCustomer=null;document.getElementById('createOrderName').readOnly=false;
            for(const id of ['createOrderName','createOrderPhone','createOrderCustomAddress','createOrderProvince','createOrderReceiverName','createOrderReceiverPhone'])document.getElementById(id).value='';
            document.getElementById('posCustomerSelectedCard').style.display='none';updatePosLiveCalculation();
        };
        updatePosLiveCalculation();
    }

    function renderPosCartTable(){
        const tbody=document.getElementById('posCartItemsList');if(!tbody)return;tbody.replaceChildren();
        if(!posCartItems.length){const row=tbody.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m trong gi\u1ecf.';}
        state.posCartPage=Math.min(state.posCartPage||1,Math.max(1,Math.ceil(posCartItems.length/10)));
        for(const item of posCartItems.slice((state.posCartPage-1)*10,state.posCartPage*10)){
            const index=posCartItems.indexOf(item),row=tbody.insertRow(),name=row.insertCell();const title=document.createElement('strong');title.textContent=item.name;const sku=document.createElement('div');sku.className='sub-meta-text';sku.textContent=item.sku;name.append(title,sku);
            row.insertCell().textContent=formatVND(item.price);const count=document.createElement('input');count.type='number';count.min=1;count.step=1;count.className='admin-input orders-pos__cart-quantity';count.setAttribute('aria-label','S\u1ed1 l\u01b0\u1ee3ng '+item.name);count.value=item.qty;count.onchange=()=>updatePosCartQty(index,Number(count.value));row.insertCell().append(count);
            row.insertCell().textContent=formatVND(item.price*item.qty);const remove=document.createElement('button');remove.type='button';remove.className='admin-btn';remove.textContent='X\u00f3a';remove.onclick=()=>removePosCartItem(index);row.insertCell().append(remove);
        }
        let pager=document.getElementById('salesPosCartPager');if(!pager){pager=document.createElement('div');pager.id='salesPosCartPager';pager.className='admin-pagination-container';tbody.closest('.pos-cart-table-wrapper').after(pager);}pager.replaceChildren();
        if(posCartItems.length>10)for(const [label,page] of [['<',state.posCartPage-1],[String(state.posCartPage),state.posCartPage],['>',state.posCartPage+1]]){const button=document.createElement('button');button.type='button';button.className='btn-pagination'+(page===state.posCartPage?' active':'');button.textContent=label;button.disabled=page<1||page>Math.ceil(posCartItems.length/10);button.onclick=()=>{state.posCartPage=page;renderPosCartTable();};pager.append(button);}
        updatePosLiveCalculation();
    }

    function getAvailableProducts() {return posProductChoices;}

    function addToPosCart(sku,qty=1){
        const product=getAvailableProducts().find(p=>p.sku===sku);if(!product)return;
        const previous=posCartItems.find(p=>p.variantId===product.variantId);
        if(previous)previous.qty+=qty;else posCartItems.push({sku:product.sku,variantId:product.variantId,name:product.name,price:product.price,qty});
        renderPosCartTable();
    }
    function updatePosCartQty(index,quantity){if(!posCartItems[index])return;if(quantity===0)posCartItems.splice(index,1);else posCartItems[index].qty=quantity;renderPosCartTable();}

    function removePosCartItem(index) {
        posCartItems.splice(index, 1);
        renderPosCartTable();
    }

    function renderCreateOrderProductDropdown(query=''){
        clearTimeout(productSearchTimer);const version=++productSearchVersion;
        const root=document.getElementById('createOrderProductDropdown');root.replaceChildren();root.style.display='block';root.textContent='Đang tìm sản phẩm...';
        productSearchTimer=setTimeout(async()=>{
            try{
                const rows=await window.PawpalOrderV1.searchVariants(query.trim().slice(0,200));
                if(version!==productSearchVersion||document.activeElement!==document.getElementById('createOrderProductSearchInput'))return;
                posProductChoices=rows.map(v=>({...v,price:Number(v.price)}));root.replaceChildren();
                for(const product of posProductChoices){
                    const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';const name=document.createElement('strong');name.textContent=product.name;
                    const info=document.createElement('div');info.className='sub-meta-text';info.textContent=product.sku+' · '+formatVND(product.price);button.append(name,info);button.onmousedown=e=>e.preventDefault();button.onclick=()=>selectPosProduct(product.sku);root.append(button);
                }
                if(!rows.length&&!query.trim()){root.style.display='none';return;}
                if(!rows.length)root.textContent='Chưa tìm thấy sản phẩm phù hợp.';
            }catch(error){if(version===productSearchVersion)root.textContent='Không thể tìm sản phẩm. Vui lòng thử lại.';}
        },300);
    }

    function selectPosProduct(sku) {
        ++productSearchVersion;clearTimeout(productSearchTimer);
        const prod = getAvailableProducts().find(p => p.sku === sku);
        if (!prod) return;
        const searchInput = document.getElementById('createOrderProductSearchInput');
        const hiddenSku = document.getElementById('createOrderSelectedProductSku');
        const dropdown = document.getElementById('createOrderProductDropdown');

        if (searchInput) searchInput.value = prod.name;
        if (hiddenSku) hiddenSku.value = prod.sku;
        if (dropdown) dropdown.style.display = 'none';
    }

    function updatePosLiveCalculation(){return posPricing.update();}

    function addCashTendered(amount) {
        const input = document.getElementById('createOrderCashTendered');
        if (!input) return;
        const current = parseInt(input.value || '0', 10);
        input.value = current + amount;
        updatePosLiveCalculation();
    }

    function setCashTenderedExact() {
        const calc = updatePosLiveCalculation();
        const input = document.getElementById('createOrderCashTendered');
        if (input) {
            input.value = calc.grandTotal;
            updatePosLiveCalculation();
        }
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.list = {
        renderOrdersTable,
        renderOrdersPagination,
        clearAllOrderFilters,
        loadPosCustomerDirectory
    };

    // Khởi tạo các sự kiện giao diện cho Subtab List
    let isListEventsInitialized = false;
    function initListEvents() {
        if (isListEventsInitialized) return;
        isListEventsInitialized = true;
        let orderSearchTimer = null;
        document.getElementById('orderSearchInput')?.addEventListener('input', () => {
            clearTimeout(orderSearchTimer);
            orderSearchTimer = setTimeout(() => {
                ordersCurrentPage = 1;
                renderOrdersTable();
            }, 300);
        });
        document.getElementById('orderFilterStatus')?.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayment')?.addEventListener('change', (e) => {
            currentFilterPayment = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayStatus')?.addEventListener('change', (e) => {
            currentFilterPayStatus = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterComplaintOrders')?.addEventListener('click', function() {
            filterComplaintOnly = !filterComplaintOnly;
            this.classList.toggle('active', filterComplaintOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterUrgentOrders')?.addEventListener('click', function() {
            filterUrgentOnly = !filterUrgentOnly;
            this.classList.toggle('active', filterUrgentOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterSlaOverdue')?.addEventListener('click', function() {
            filterSlaOverdueOnly = !filterSlaOverdueOnly;
            this.classList.toggle('active', filterSlaOverdueOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnOrderClearFilters')?.addEventListener('click', clearAllOrderFilters);

        // Checkbox chọn tất cả
        document.getElementById('checkSelectAllOrders')?.addEventListener('change', function(e) {
            const pageIds = [...document.querySelectorAll('#ordersTableBody .order-row-checkbox')].map(input => input.dataset.id);
            const selected = new Set(state.selectedBatchOrderIds || []);
            for (const id of pageIds) {
                if (e.target.checked) selected.add(id);
                else selected.delete(id);
            }
            state.selectedBatchOrderIds = [...selected].slice(0,100);
            renderOrdersTable();
        });

        document.getElementById('btnBatchDeselectAll')?.addEventListener('click', () => {
            state.selectedBatchOrderIds = [];
            renderOrdersTable();
        });

        document.getElementById('btnBatchPrintPack')?.addEventListener('click', () => {
            PawpalOrdersModule.printBatchPackingSlips();
        });

        document.getElementById('btnBatchDispatch')?.addEventListener('click', () => {
            PawpalOrdersModule.openBatchDispatchModal();
        });

        document.getElementById('btnBatchExportManifest')?.addEventListener('click', () => {
            PawpalOrdersModule.exportDispatchManifest();
        });

        // Xuất file báo cáo đơn hàng Excel
        document.getElementById('btnExportOrderReport')?.addEventListener('click', async event => {
            const button=event.currentTarget;if(button.disabled)return;
            if(!window.XLSX){showToast('Th\u01b0 vi\u1ec7n xu\u1ea5t file ch\u01b0a s\u1eb5n s\u00e0ng. Vui l\u00f2ng th\u1eed l\u1ea1i.','info');return;}
            button.disabled=true;
            try {
            let ordersList;
            try {ordersList=state.serverPagination?await window.PawpalOrderV1.orders():state.orders||[];}catch(error){showToast('Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u xu\u1ea5t file.','warning');return;}
            if (ordersList.length === 0) {
                showToast('Không có dữ liệu đơn hàng để xuất file.', 'warning');
                return;
            }
            if (window.XLSX) {
                const sheetData = ordersList.map((o, idx) => ({
                    'STT': idx + 1,
                    'Mã đơn': o.id,
                    'Khách hàng': o.customerName,
                    'SĐT': o.phone,
                    'Tổng tiền': o.total,
                    'Hình thức TT': o.paymentMethod,
                    'Trạng thái TT': o.paymentStatus,
                    'Vận chuyển': o.carrier,
                    'Mã vận đơn': o.trackingNumber,
                    'Trạng thái đơn': o.status,
                    'Thời gian đặt': formatDateTime(o.createdAt)
                }));
                const ws = XLSX.utils.json_to_sheet(sheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Don_Hang');
                XLSX.writeFile(wb, `Bao_Cao_Don_Hang_PawPal_${new Date().toISOString().slice(0, 10)}.xlsx`);
                showToast('Đã xuất báo cáo đơn hàng Excel thành công!', 'success');
            } else {
                showToast('Đang nạp thư viện xuất file, vui lòng thử lại sau giây lát...', 'info');
            }
            } finally {button.disabled=false;}
        });

        document.getElementById('btnQuickReconcileAllCod')?.addEventListener('click',()=>{
            const pending=state.orders.find(o=>o.total>o.collected&&o.rawStatus!=='cancelled');
            if(!pending){showToast('Không có đơn cần thu tiền.','info');return;}
            window.PawpalOrdersModule.confirmPayment(pending.id);
        });

        // POS Listeners
        document.getElementById('btnOpenCreateOrderModal')?.addEventListener('click',async()=>{
            document.getElementById('formCreateOrder').reset();for(const [id,[errorId]] of Object.entries(posDeliveryErrors))setPosFieldError(id,errorId);setPosFieldError('createOrderPhone','createOrderPhoneError');setPosFieldError('createOrderName','createOrderNameError');posCartItems=[];activePosCustomer=null;state.posOrderId=crypto.randomUUID();state.posCartPage=1;document.getElementById('createOrderName').readOnly=false;
            document.getElementById('posCustomerSelectedCard').style.display='none';document.getElementById('createOrderMemberBanner').style.display='none';document.getElementById('modalCreateOrder').classList.add('active');
            const search=document.getElementById('createOrderProductSearchInput');
            search.disabled=true;
            try {
                ++customerSearchVersion;++productSearchVersion;posProductChoices=[];
                renderPosCartTable();
                await Promise.all([window.PawpalOrders.fetchVouchersData(),posPricing.reset()]);
                if(state.vouchersError) document.getElementById('posPricingNotice').textContent='Không thể tải đủ dữ liệu bán hàng. Đóng và mở lại để thử lại.';
            } catch(error) {
                document.getElementById('posPricingNotice').textContent='Không thể tải dữ liệu bán hàng. Đóng và mở lại để thử lại.';
            } finally { search.disabled=false; }
        });
        document.getElementById('btnPosQuickCustomer')?.addEventListener('click',async event=>{
            const button=event.currentTarget;
            const name=document.getElementById('createOrderName').value.trim().replace(/\s+/g,' '),phone=document.getElementById('createOrderPhone').value.trim();
            const nameError=name.length<2||name.length>200?'Họ và tên cần từ 2 đến 200 ký tự.':'',phoneError=!/^0[0-9]{9}$/.test(phone)?'Nhập số điện thoại 10 chữ số, bắt đầu bằng 0.':'';
            setPosFieldError('createOrderName','createOrderNameError',nameError);setPosFieldError('createOrderPhone','createOrderPhoneError',phoneError);
            if(nameError||phoneError){document.getElementById(nameError?'createOrderName':'createOrderPhone').focus();return;}
            if(button.disabled||document.getElementById('modalCreateOrder').dataset.saving==='true')return;
            setPosPending(true);button.disabled=true;const text=button.textContent;button.textContent='Đang thêm…';
            try{const {data,error}=await window.getSupabaseClient().rpc('create_customer_quick',{p_full_name:document.getElementById('createOrderName').value.trim(),p_phone:document.getElementById('createOrderPhone').value.trim()});if(error)throw error;
                await selectPosCustomer({id:data});if(!activePosCustomer||activePosCustomer.id!==data)throw Error('customer_reload_required');showToast('\u0110\u00e3 th\u00eam v\u00e0 ch\u1ecdn kh\u00e1ch h\u00e0ng.');
            }catch(error){document.getElementById('posPricingNotice').textContent='Kh\u00f4ng th\u1ec3 th\u00eam nhanh. Ki\u1ec3m tra t\u00ean v\u00e0 s\u1ed1 \u0111i\u1ec7n tho\u1ea1i; n\u1ebfu \u0111\u00e3 t\u1ed3n t\u1ea1i h\u00e3y ch\u1ecdn t\u1eeb danh s\u00e1ch.';}
            finally{button.disabled=false;button.textContent=text;setPosPending(false);}
        });

        const handleAddProductToPos = () => {
            const prodList = getAvailableProducts();
            let sku = document.getElementById('createOrderSelectedProductSku')?.value;
            if(!sku){showToast('Ch\u1ecdn \u0111\u00fang bi\u1ebfn th\u1ec3 t\u1eeb danh s\u00e1ch.','warning');return;}
            const qtyInput = document.getElementById('createOrderQty');
            const qty = Number(qtyInput?.value || '1');
            if (!Number.isSafeInteger(qty) || qty <= 0) {
                showToast('Số lượng sản phẩm phải là số nguyên dương lớn hơn 0', 'warning');
                return;
            }
            addToPosCart(sku, qty);

            const searchInput = document.getElementById('createOrderProductSearchInput');
            const hiddenSku = document.getElementById('createOrderSelectedProductSku');
            if (searchInput) searchInput.value = '';
            if (hiddenSku) hiddenSku.value = '';
        };

        document.getElementById('btnPosAddToCart')?.addEventListener('click', handleAddProductToPos);
        document.getElementById('createOrderBtnAddProduct')?.addEventListener('click', handleAddProductToPos);

        document.getElementById('createOrderProductSearchInput')?.addEventListener('input', (e) => {
            document.getElementById('createOrderSelectedProductSku').value='';
            renderCreateOrderProductDropdown(e.target.value);
        });

        document.getElementById('createOrderProductSearchInput')?.addEventListener('focus', (e) => {
            renderCreateOrderProductDropdown(e.target.value);
        });

        for(const [id,[errorId]] of Object.entries(posDeliveryErrors)){
            const input=document.getElementById(id);
            input.addEventListener('blur',()=>validatePosDeliveryField(id));
            input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')validatePosDeliveryField(id);});
            input.addEventListener('change',()=>{if(input.getAttribute('aria-invalid')==='true')validatePosDeliveryField(id);});
            document.getElementById('radioAddrInStore').addEventListener('change',()=>setPosFieldError(id,errorId));
        }
        document.getElementById('createOrderName')?.addEventListener('input',()=>setPosFieldError('createOrderName','createOrderNameError'));
        document.getElementById('createOrderPhone')?.addEventListener('input', (e) => {
            setPosFieldError('createOrderPhone','createOrderPhoneError');
            if(activePosCustomer&&e.target.value!==activePosCustomer.phone){activePosCustomer=null;document.getElementById('createOrderName').readOnly=false;document.getElementById('createOrderName').value='';document.getElementById('posCustomerSelectedCard').style.display='none';updatePosLiveCalculation();}
            renderCreateOrderCustomerDropdown(e.target.value);
        });

        document.getElementById('createOrderPhone')?.addEventListener('focus', (e) => {
            renderCreateOrderCustomerDropdown(e.target.value);
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('createOrderCustomerDropdown');
            const phoneInput = document.getElementById('createOrderPhone');
            if (dropdown && dropdown.style.display === 'block') {
                if (!dropdown.contains(e.target) && e.target !== phoneInput) {
                    dropdown.style.display = 'none';
                }
            }

            const prodDropdown = document.getElementById('createOrderProductDropdown');
            const prodInput = document.getElementById('createOrderProductSearchInput');
            if (prodDropdown && prodDropdown.style.display === 'block') {
                if (!prodDropdown.contains(e.target) && e.target !== prodInput) {
                    prodDropdown.style.display = 'none';
                }
            }
        });

        document.getElementById('btnCashExact')?.addEventListener('click', setCashTenderedExact);

        document.getElementById('createOrderCashTendered')?.addEventListener('input', () => {
            updatePosLiveCalculation();
        });

        ['createOrderVoucherCode', 'createOrderPointsInput'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updatePosLiveCalculation);
            document.getElementById(id)?.addEventListener('change', updatePosLiveCalculation);
        });
        ['radioAddrInStore', 'radioAddrDelivery', 'createOrderPaymentMethod'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updatePosLiveCalculation);
        });

        document.getElementById('formCreateOrder')?.addEventListener('submit', (e) => e.preventDefault());

        let isPosFinalizing=false;
        const handleFinalizePosOrder=async()=>{
            if(isPosFinalizing||document.getElementById('modalCreateOrder').dataset.saving==='true')return;isPosFinalizing=true;setPosPending(true);const submit=document.getElementById('btnSubmitCreateOrder'),text=submit.textContent;submit.textContent='Đang tạo đơn…';
            try{
                const id=await posPricing.save(state.posOrderId);document.getElementById('modalCreateOrder').classList.remove('active');
                await syncOrdersAndProductsFromSupabase({force:true});const order=await PawpalOrders.ensureOrder(id,{force:true});
                if(order){state.selectedOrderId=order.id;PawpalOrders.switchSubtab('tab-order-detail');PawpalOrders.renderOrderDetail(order.id);}
                showToast('\u0110\u00e3 t\u1ea1o \u0111\u01a1n v\u00e0 gi\u1eef t\u1ed3n. Ch\u01b0a ghi nh\u1eadn thu ti\u1ec1n.');
            }catch(error){const message=window.PawpalSalesCheckout.message(error),notice=document.getElementById('posPricingNotice');notice.textContent=message;notice.classList.add('is-error');showToast(message,'warning');}
            finally{isPosFinalizing=false;setPosPending(false);submit.textContent=text;}
        };

        document.getElementById('btnSubmitCreateOrder')?.addEventListener('click', handleFinalizePosOrder);
        document.getElementById('btnFinalizePosOrder')?.addEventListener('click', handleFinalizePosOrder);

        // Bàn giao vận chuyển modal submit
        document.getElementById('formShipOrder')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('formCancelOrder')?.addEventListener('submit', (e) => e.preventDefault());
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('orderActionDropdown');
            if (popover && popover.classList.contains('active')) {
                if (!e.target.closest('.btn-action-trigger') && !e.target.closest('#orderActionDropdown')) {
                    popover.classList.remove('active');
                }
            }
        });

        // Gắn action cho popover menu
        document.getElementById('menuActionViewDetail')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openOrderDetail(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionPrintPack')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.printPackingSlip(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionShipOrder')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openShipModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionConfirmPayment')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.confirmPayment(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionReconcileCod')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.reconcileCod(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionReturnRefund')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openReturnRefundModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionCancelOrder')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openCancelModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });

        // In phiếu đóng gói
        document.getElementById('btnPrintSlipConfirm')?.addEventListener('click', () => {
            showToast('Đang gửi lệnh in phiếu đóng gói tới máy in...', 'info');
            setTimeout(() => { window.print(); }, 300);
        });

        // Bàn giao vận chuyển hàng loạt
        document.getElementById('formBatchDispatch')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('btnPrintManifestConfirm')?.addEventListener('click', () => {
            showToast('Đang gửi lệnh in bảng kê bàn giao bưu cục tới máy in...', 'info');
            setTimeout(() => { window.print(); }, 300);
        });

        // Hỗ trợ kiểm thử tự động cho modal8
        if (window.location.search.includes('v=modal8')) {
            setTimeout(() => {
                PawpalOrdersModule.openReturnRefundModal();
            }, 600);
        }
    }

    // Xuất ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};

    window.PawpalOrdersModule.toggleSelectOrder = function(e, orderId) {
        e.stopPropagation();
        state.selectedBatchOrderIds = state.selectedBatchOrderIds || [];
        if (state.selectedBatchOrderIds.includes(orderId)) {
            state.selectedBatchOrderIds = state.selectedBatchOrderIds.filter(id => id !== orderId);
        } else if (state.selectedBatchOrderIds.length < 100) {
            state.selectedBatchOrderIds.push(orderId);
        }
        renderOrdersTable();
    };

    window.PawpalOrdersModule.openActionDropdown = function(e, orderId) {
        e.stopPropagation();
        state.activeActionOrderId = orderId;
        const popover = document.getElementById('orderActionDropdown');
        if (!popover) return;

        const order = (state.orders || []).find(o => o.id === orderId);
        if (order) {
            const btnPay = document.getElementById('menuActionConfirmPayment');
            if (btnPay) {
                const canPay = order.status !== 'cancelled' || order.collected>0;
                btnPay.textContent='Thu và hoàn tiền';
                btnPay.style.display = canPay ? 'block' : 'none';
            }
            const btnReconcile = document.getElementById('menuActionReconcileCod');
            if (btnReconcile) {
                const isCod = order.paymentMethod === 'cod';
                const isDeliveredOrCompleted = order.status === 'delivered' || order.status === 'completed';
                const isAwaitingReconcile = order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid';
                const notPaid = order.paymentStatus !== 'paid';
                const notCancelled = order.status !== 'cancelled';
                btnReconcile.style.display = (isCod && isDeliveredOrCompleted && isAwaitingReconcile && notPaid && notCancelled) ? 'block' : 'none';
            }
            const btnShip = document.getElementById('menuActionShipOrder');
            if (btnShip) {
                const canShip = order.rawStatus==='confirmed' || order.rawStatus==='packing';
                btnShip.style.display = canShip ? 'block' : 'none';
            }
            const btnCancel = document.getElementById('menuActionCancelOrder');
            if (btnCancel) {
                btnCancel.style.display = (order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'delivered') ? 'block' : 'none';
            }
            const btnRma = document.getElementById('menuActionReturnRefund');
            if (btnRma) {
                btnRma.style.display = (order.status === 'delivered' || order.status === 'completed') ? 'block' : 'none';
            }
        }

        const rect = e.target.getBoundingClientRect();
        popover.style.top = `${rect.bottom + 4}px`;
        popover.style.left = `${rect.left - 130}px`;
        popover.classList.add('active');
    };

    window.PawpalOrdersModule.openOrderDetail = function(orderId) {
        state.selectedOrderId = orderId;
        sessionStorage.setItem('pawpal_admin_order_selected_id', orderId);
        if (typeof PawpalOrders.switchSubtab === 'function') {
            PawpalOrders.switchSubtab('tab-order-detail');
        }
        if (typeof PawpalOrders.renderOrderDetail === 'function') {
            PawpalOrders.renderOrderDetail(orderId);
        }
    };

    window.PawpalOrdersModule.openCustomerProfile = function(userId, customerName) {
        const custIdMap = {
            'USER-001': 'CUST-001', 'USER-002': 'CUST-002', 'USER-003': 'CUST-003',
            'USER-004': 'CUST-004', 'USER-005': 'CUST-005', 'USER-ADMIN': 'CUST-001'
        };
        // Đơn mới dùng trực tiếp UUID customer_id. Chỉ giữ map cho dữ liệu cũ,
        // không được rơi về CUST-001 vì sẽ mở nhầm hồ sơ khách hàng.
        const targetCustId = custIdMap[userId] || (userId && userId !== 'GUEST' ? userId : '');
        if (!targetCustId) {
            PawpalOrders.showToast('Đơn vãng lai không có hồ sơ khách hàng để mở.');
            return;
        }
        sessionStorage.setItem('pawpal_admin_customer_id', targetCustId);
        if (customerName) sessionStorage.setItem('pawpal_admin_customer_name', customerName);
        sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
        sessionStorage.removeItem('pawpal_admin_order_selected_id');
        sessionStorage.removeItem('pawpal_admin_order_id');
        const custBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khách hàng');
        if (custBtn) {
            // Sidebar là điểm chuyển module duy nhất: nó đồng bộ module, hash và DOM.
            custBtn.click();
        } else {
            sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');
            window.location.hash = '#tab-profile';
        }
    };

    window.PawpalOrdersModule.printPackingSlip = function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        const container = document.getElementById('packingSlipContainer');
        if (container) container.innerHTML = PawpalOrders.helpers.generatePackingSlipHtml(order);
        document.getElementById('modalPackingSlip')?.classList.add('active');
    };

    window.PawpalOrdersModule.printBatchPackingSlips = async function() {
        const selected = state.selectedBatchOrderIds || [];
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất một đơn hàng để in phiếu đóng gói.', 'warning');
            return;
        }
        const container = document.getElementById('packingSlipContainer');
        let selectedOrders;
        try {selectedOrders=state.serverPagination?await PawpalOrders.refreshSelectedOrders(selected):(state.orders||[]).filter(o=>selected.includes(o.id));}catch(error){showToast('Kh\u00f4ng th\u1ec3 t\u1ea3i c\u00e1c \u0111\u01a1n \u0111\u00e3 ch\u1ecdn.','warning');return;}
        if (container) {
            container.innerHTML = selectedOrders.map(o => PawpalOrders.helpers.generatePackingSlipHtml(o)).join('');
        }
        document.getElementById('modalPackingSlip')?.classList.add('active');
    };

    window.PawpalOrdersModule.exportDispatchManifest = async function() {
        const selected = state.selectedBatchOrderIds || [];
        let source=state.orders||[];
        if(selected.length&&state.serverPagination){try{source=await PawpalOrders.refreshSelectedOrders(selected);}catch(error){showToast('Kh\u00f4ng th\u1ec3 t\u1ea3i c\u00e1c \u0111\u01a1n \u0111\u00e3 ch\u1ecdn.','warning');return;}}
        if(!selected.length&&state.serverPagination){try{source=await window.PawpalOrderV1.orders();}catch(error){showToast('Kh\u00f4ng th\u1ec3 t\u1ea3i b\u1ea3ng k\u00ea.','warning');return;}}
        const targetOrders=source.filter(o=>selected.length?selected.includes(o.id):o.status==='shipping'||o.status==='confirmed');

        if (targetOrders.length === 0) {
            showToast('Không có đơn hàng nào để xuất bảng kê bàn giao vận chuyển.', 'warning');
            return;
        }

        const carrier = targetOrders[0]?.carrier || 'Bưu cục đối tác';
        const container = document.getElementById('manifestContentContainer');
        if (container) container.innerHTML = PawpalOrders.helpers.generateManifestHtml(targetOrders, carrier);
        document.getElementById('modalDispatchManifest')?.classList.add('active');
    };

    window.PawpalOrdersModule.openReturnRefundModal = function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId || o.rawId === orderId);
        if (!order) {
            showToast('Không tìm thấy đơn hàng cần tạo đổi trả (RMA)!', 'warning');
            return;
        }

        document.getElementById('formReturnRefund').reset();
        state.rmaOrderSnapshot=structuredClone(order);state.rmaRequestId=crypto.randomUUID();state.rmaReturnId=crypto.randomUUID();
        document.querySelector('#modalReturnRefund .rma-order-summary-box').style.cssText='background:transparent;border:none;padding:0;margin-bottom:16px;';
        state.selectedOrderId = order.id;
        const codeEl = document.getElementById('rmaOrderTargetCode');
        const custEl = document.getElementById('rmaCustomerName');
        const totalEl = document.getElementById('rmaOrderTotal');
        const tbody = document.getElementById('rmaItemsTableBody');

        if (codeEl) codeEl.textContent = order.id;
        if (custEl) custEl.textContent = `${order.customerName} (${order.phone})`;
        if (totalEl) totalEl.textContent = formatVND(order.total);

        if(tbody){
            tbody.replaceChildren();
            for(const p of order.products){
                const row=document.createElement('tr');
                const choose=document.createElement('td'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='rma-item-select-checkbox';checkbox.dataset.lineId=p.id;checkbox.dataset.sku=p.sku;choose.append(checkbox);
                const name=document.createElement('td');name.textContent=p.name+' - '+p.sku;
                const quantity=document.createElement('td');quantity.textContent=p.quantity;
                const count=document.createElement('td'),input=document.createElement('input');input.type='number';input.className='admin-input rma-item-qty-input';input.value=p.quantity;input.min=1;input.max=p.quantity;input.step=1;count.append(input);
                const price=document.createElement('td');price.textContent=formatVND(p.price);
                row.append(choose,name,quantity,count,price);tbody.append(row);
            }
        }

        document.getElementById('modalReturnRefund')?.classList.add('active');
    };

    window.PawpalOrdersModule.openRmaTicket = function(orderId) {
        PawpalOrdersModule.openReturnRefundModal(orderId);
    };

    window.PawpalOrdersModule.openComplaintModule = function(rmaId) {
        sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');
        sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-orders');
        window.location.hash = '#tab-complaint-orders';
        if (rmaId) {
            sessionStorage.setItem('pawpal_admin_complaint_selected_id', rmaId);
            sessionStorage.setItem('pawpal_admin_complaint_search', rmaId);
        }
        const compBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khiếu nại');
        if (compBtn) {
            compBtn.click();
        } else if (window.PawpalAdmin?.loadModule) {
            window.PawpalAdmin.loadModule('Khiếu nại');
        }
    };

    window.PawpalOrdersModule.closeModal = function(modalId) {
        const modal=document.getElementById(modalId);if(modal?.dataset.saving==='true')return;modal?.classList.remove('active');
    };

    window.PawpalOrdersModule.selectPosCustomer = function(custId) {
        const cust = posCustomerDirectory.find(c => c.id === custId);
        if (cust) selectPosCustomer(cust);
    };

    window.PawpalOrdersModule.updatePosCartQty = updatePosCartQty;
    window.PawpalOrdersModule.removePosCartItem = removePosCartItem;


    window.PawpalOrdersModule.addCashTendered = addCashTendered;
    window.PawpalOrdersModule.setCashTenderedExact = setCashTenderedExact;
    window.PawpalOrdersModule.selectPosProduct = selectPosProduct;

    // Khởi tạo sự kiện
    initListEvents();
})();

;

(function(){
    'use strict';
    const m=window.PawpalOrders,el=id=>document.getElementById(id),esc=window.PawpalOrdersModule.escapeHtml;
    m.formatCurrency=m.helpers.formatVND;m.showToast=m.helpers.showToast;
    m.errorMessage=e=>({
        sales_cashier_forbidden:'Bạn chưa có quyền thu và hoàn tiền bán hàng.',
        sales_cashier_changed:'Số dư hoặc đơn hàng đã thay đổi. Đóng và mở lại để đối chiếu.',
        sales_money_exceeds_balance:'Số tiền vượt số còn được thu hoặc hoàn.',
        sales_money_reference_required:'Nhập mã giao dịch ngân hàng đã đối soát.',
        sales_money_reference_duplicate:'Mã giao dịch ngân hàng đã được ghi nhận.',
        refund_reward_points_insufficient:'Khách không đủ điểm để thu hồi. Cần đối soát trước khi hoàn tiền.',
        refund_loyalty_history_conflict:'Lịch sử hoàn tiền và điểm chưa khớp. Cần đối soát.',
        refund_loyalty_confirmation_required:'Kiểm tra và xác nhận số điểm cần thu hồi trước khi hoàn.',
        refund_loyalty_exceeds_balance:'Số tiền vượt số còn được hoàn.',
        sales_replacement_refund_review_required:'Đơn đang có hàng đổi hoặc gửi bù. Cần đối soát trước khi hoàn thêm tiền.',
        sales_refund_ledger_review_required:'Khoản thu đã liên quan đến điểm hoặc xét hạng, cần đối soát sổ điểm trước khi hoàn.',
        sales_money_booking_closed:'Đơn đã hủy hoặc trả hàng không thể thu thêm.',
        sales_refund_source_invalid:'Khoản thu gốc không hợp lệ hoặc không thuộc đơn này.',
        invalid_service_money:'Điền đủ số tiền, lý do và xác nhận giao dịch thực tế.',
        sales_request_conflict:'Yêu cầu này đã được ghi với nội dung khác. Tải lại để đối chiếu.'
    })[e?.message]||(e?.code==='42501'?'Bạn chưa có quyền thực hiện thao tác này.':'Không thể ghi giao dịch. Vui lòng tải lại và kiểm tra số tiền.');
    m.enhanceEntitySelects = function() {
        for(const id of ['salesCashierMethod','salesCashierPayment','grnSupplierSelect','grnProductPicker','createOrderDeliveryOption','createOrderPaymentMethod','shipCarrierSelect','batchCarrierSelect']) {
            const select=document.getElementById(id);if(!select)continue;
            if(select._entityInput){select._entityInput.disabled=select.disabled;if(document.activeElement!==select._entityInput)select._entityInput.value=select.value?select.selectedOptions[0]?.textContent||'':'';continue;}
            const standard=Boolean(select.closest('.admin-modal-standard')),wrapper=document.createElement('div');wrapper.className='admin-autocomplete';if(!standard)wrapper.style.cssText='position:relative;width:100%;';
            const input=document.createElement('input');input.type='text';input.className='admin-input';input.autocomplete='off';input.id=id+'Search';input.placeholder='Tìm và chọn từ danh sách';input.setAttribute('aria-label',select.closest('.form-group-item')?.querySelector('label')?.textContent||'Chọn thông tin');
            const popover=document.createElement('div');popover.className='customer-autocomplete-popover';if(standard)popover.style.display='none';else popover.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:240px;overflow-y:auto;overscroll-behavior:contain;z-index:2500;border:1px solid #ECF2EE;border-radius:9px;background:#FFF;box-shadow:0 10px 28px rgba(35,107,72,.14);';
            select.before(wrapper);wrapper.append(select,input,popover);select.hidden=true;select.style.display='none';input.disabled=select.disabled;select._entityInput=input;input.value=select.value?select.selectedOptions[0]?.textContent||'':'';
            const render=()=>{
                popover.replaceChildren();const q=input.value.trim().toLocaleLowerCase('vi');
                const options=[...select.options].filter(o=>o.value&&!o.disabled&&o.textContent.trim().toLocaleLowerCase('vi').includes(q));
                for(const option of options){const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';if(!standard)button.style.cssText='display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:transparent;color:#203A2C;font-weight:600;';button.textContent=option.textContent;
                    button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{select.value=option.value;input.value=option.textContent;popover.style.display='none';select.dispatchEvent(new Event('change',{bubbles:true}));});popover.append(button);}
                if(!options.length){const text=document.createElement('div');text.className='admin-autocomplete__empty';if(!standard)text.style.padding='10px 12px';text.textContent='Không có lựa chọn phù hợp.';popover.append(text);}
                popover.style.display='block';
            };
            input.addEventListener('focus',render);input.addEventListener('input',()=>{select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));render();});input.addEventListener('keydown',e=>{if(e.key==='Escape')popover.style.display='none';if(e.key==='Enter'){e.preventDefault();popover.querySelector('button')?.click();}});
            document.addEventListener('click',e=>{if(!wrapper.contains(e.target))popover.style.display='none';});
        }
    };
    const requests=new Map();
    m.saveSalesMoney=async(order,context,action,details)=>{
        const signature=JSON.stringify({id:order.rawId,version:context.version,action,details});
        if(!requests.has(signature))requests.set(signature,crypto.randomUUID());
        const {error}=await window.getSupabaseClient().rpc('post_admin_sales_money',{p_request_id:requests.get(signature),p_order_id:order.rawId,p_expected_state:context.version,p_action:action,p_details:details});
        if(error)throw error;
        await m.fetchOrdersData({force:true});
    };
    window.PawpalOrdersModule.confirmPayment=id=>m.openCashier(m.state.orders.find(o=>o.id===id));
    window.PawpalOrdersModule.reconcileCod=window.PawpalOrdersModule.confirmPayment;
    let context=null,booking=null,session=0,busy=false;
    let refundPreview;
    function previewRefund(){
        let row=el('salesCashierLoyaltyPreview');
        if(!row){row=document.createElement('p');row.id='salesCashierLoyaltyPreview';row.style.cssText='color:#4F7A65;margin:8px 0;';row.setAttribute('aria-live','polite');el('salesCashierConfirmationText').parentElement.before(row);}
        const refund=el('salesCashierAction').value==='refund';
        row.hidden=!refund;
        const payment=context?.payments.find(p=>p.id===el('salesCashierPayment').value);
        const plan=refund&&payment?refundPreview?.(payment,el('salesCashierAmount').value):null;
        row.textContent=refund?(plan?.error||(plan?'Thu hồi '+plan.points+' điểm thưởng. Chi tiêu xét hạng giảm '+m.formatCurrency(plan.eligible)+'. Điểm còn lại '+plan.balance+'.':'Chọn khoản thu gốc để đối soát điểm.')):'';
        row.style.color=plan?.error?'#DC2626':'#4F7A65';
        el('btnSaveSalesMoney').disabled=busy||!context||(refund&&(!plan||!!plan.error));
        return plan;
    }

    const refundable=p=>Number(p.amount)-(p.refunds||[]).filter(r=>r.refund_status==='succeeded').reduce((sum,r)=>sum+Number(r.refunded_amount),0);
    function syncFields(){
        const refund=el('salesCashierAction').value==='refund';
        el('salesCashierPaymentField').style.display=refund?'block':'none';
        const method=context?.methods.find(v=>v.id===el('salesCashierMethod').value);
        el('salesCashierReferenceField').style.display=method?.requires_reference?'block':'none';
        el('salesCashierReference').required=!!method?.requires_reference;
        el('salesCashierConfirmationText').textContent=refund?'Đã hoàn trả đúng số tiền cho khách và đồng ý thu hồi điểm theo đối soát ở trên':'Đã nhận từ khách đúng số tiền ghi ở trên';
        el('salesCashierConfirmed').checked=false;
        const payment=context?.payments.find(p=>p.id===el('salesCashierPayment').value);
        const maximum=refund?(payment?refundable(payment):0):Number(context?.remaining||0);
        el('salesCashierAmount').value=maximum>0?String(maximum):'';el('salesCashierAmount').max=String(maximum);
        m.enhanceEntitySelects();
        previewRefund();
    }
    async function load(current){
        ({refundLoyaltyPreview:refundPreview}=await import('/scripts/shared/refund-loyalty.mjs'));
        const {data,error}=await window.getSupabaseClient().rpc('get_admin_sales_cashier',{p_order_id:booking.rawId});
        if(error)throw error;if(current!==session)return;
        context=data;
        el('salesCashierTotal').textContent=m.formatCurrency(data.total);el('salesCashierCollected').textContent=m.formatCurrency(data.collected);el('salesCashierRemaining').textContent=m.formatCurrency(data.remaining);
        el('salesCashierMethod').replaceChildren(new Option('Chọn phương thức',''),...data.methods.map(v=>new Option(v.name,v.id)));
        el('salesCashierMethod').value=data.methods.find(v=>v.name==='Tiền mặt')?.id||'';
        el('salesCashierPayment').replaceChildren(new Option('Chọn khoản thu gốc',''),...data.payments.filter(p=>p.transaction_status==='succeeded'&&refundable(p)>0).map(p=>new Option(p.payment_code+' · Còn được hoàn '+m.formatCurrency(refundable(p)),p.id)));
        const statuses={succeeded:'Thành công',pending:'Chờ xử lý',failed:'Thất bại',cancelled:'Đã hủy'};
        const at=value=>value?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Bangkok',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Chưa ghi nhận';
        el('salesCashierHistory').innerHTML=data.payments.length?data.payments.map(p=>'<div style="padding:6px 0;overflow-wrap:anywhere;"><strong>'+esc(p.payment_code)+'</strong> · '+esc(m.formatCurrency(p.amount))+' · '+esc(statuses[p.transaction_status]||'Cần đối soát')+'<div style="color:#4F7A65;font-size:12px;">'+esc(p.method_name||'Chưa ghi nhận')+' · '+esc(at(p.succeeded_at))+(p.gateway_transaction_id?' · '+esc(p.gateway_transaction_id.replace(/^manual-bank:/,'')):'')+'</div>'+(p.refunds||[]).map(r=>'<div style="color:#4F7A65;font-size:12px;">Hoàn '+esc(m.formatCurrency(r.refunded_amount))+' · '+esc(statuses[r.refund_status]||'Cần đối soát')+' · '+esc(r.refund_method)+' · '+esc(at(r.completed_at))+' · '+esc(r.note||'')+'</div>').join('')+'</div>').join(''):'Chưa có giao dịch thu tiền.';
        syncFields();
    }
    m.openCashier=async selected=>{
        if(!selected){m.showToast('Không tìm thấy đơn hàng. Vui lòng tải lại.','warning');return;}
        if(busy){m.showToast('Đang ghi giao dịch, vui lòng chờ.','warning');return;}
        booking=selected;const current=++session;context=null;el('formSalesCashier').reset();
        el('salesCashierMeta').textContent=selected.id+' · '+(selected.customerName||selected.customer||'Chưa có tên khách');
        el('salesCashierError').textContent='';el('salesCashierHistory').textContent='Đang tải giao dịch…';
        for(const id of ['salesCashierTotal','salesCashierCollected','salesCashierRemaining'])el(id).textContent='—';
        el('btnSaveSalesMoney').disabled=true;
        el('modalSalesCashier').style.removeProperty('display');el('modalSalesCashier').classList.add('active');
        try{await load(current);}catch(error){if(current===session)el('salesCashierError').textContent=m.errorMessage(error);}
        finally{if(current===session)previewRefund();}
    };
    el('formSalesCashier').addEventListener('submit',event=>event.preventDefault());
    for(const id of ['salesCashierAction','salesCashierMethod','salesCashierPayment'])el(id).addEventListener('change',()=>{el('salesCashierError').textContent='';syncFields();});
    el('salesCashierAmount').addEventListener('input',()=>{el('salesCashierConfirmed').checked=false;previewRefund();});
    el('btnSaveSalesMoney').onclick=async()=>{
        if(busy||!context)return;el('salesCashierError').textContent='';
        const amount=Number(el('salesCashierAmount').value),reason=el('salesCashierReason').value.trim(),method=context.methods.find(v=>v.id===el('salesCashierMethod').value),action=el('salesCashierAction').value;
        if(!Number.isSafeInteger(amount)||amount<=0||reason.length<2||!method||!el('salesCashierConfirmed').checked){el('salesCashierError').textContent='Điền số tiền nguyên dương, phương thức, lý do và xác nhận giao dịch thực tế.';return;}
        const reference=el('salesCashierReference').value.trim();if(method.requires_reference&&!reference){el('salesCashierError').textContent='Nhập mã giao dịch ngân hàng đã đối soát.';el('salesCashierReference').focus();return;}
        const details={amount,reason,method_id:method.id,reference:method.requires_reference?reference:'',confirmed:true};
        if(action==='refund'){details.payment_id=el('salesCashierPayment').value;if(!details.payment_id){el('salesCashierError').textContent='Chọn khoản thu gốc cần hoàn.';return;}}
        if(action==='refund'){const plan=previewRefund();if(!plan||plan.error){el('salesCashierError').textContent=plan?.error||'Chọn khoản thu để đối soát.';return;}details.loyalty_confirmed=true;}
        busy=true;el('btnSaveSalesMoney').disabled=true;const current=session;
        try{
            await m.saveSalesMoney(booking,context,action,details);
            m.showToast(action==='refund'?'Đã ghi nhận hoàn tiền thực tế.':'Đã ghi nhận tiền thực nhận.','success');
            booking=m.state.orders.find(b=>b.rawId===booking.rawId)||booking;
            await load(current);el('salesCashierReason').value='';el('salesCashierReference').value='';
        }catch(error){el('salesCashierError').textContent=m.errorMessage(error);}
        finally{busy=false;previewRefund();}
    };
})();

;

(function(){
 'use strict';
 const m=window.PawpalOrders,api=window.PawpalOrdersModule,el=id=>document.getElementById(id),requests=new Map();
 let shipping=null,cancelling=null,batch=null,batchPage=1,busy=false;
 const order=id=>m.state.orders.find(o=>o.id===id),message=e=>window.PawpalSalesCheckout.message(e);
 async function refresh(){await Promise.all([m.fetchOrdersData({force:true}),m.fetchProductsData({force:true})]);}
 async function perform(snapshot,action,details){
  if(!snapshot)throw Error('sales_order_not_found');
  const key=JSON.stringify({id:snapshot.rawId,version:snapshot.updatedAt,action,details});if(!requests.has(key))requests.set(key,crypto.randomUUID());
  const {error}=await window.getSupabaseClient().rpc('update_admin_sales_order',{p_request_id:requests.get(key),p_order_id:snapshot.rawId,p_expected_updated_at:snapshot.updatedAt,p_action:action,p_details:details});if(error)throw error;
  await refresh();m.helpers.showToast('Đã cập nhật đơn hàng.');
 }
 for(const [name,action] of [['confirmOrder','confirm'],['completeOrder','complete'],['completeDelivery','complete']])api[name]=async id=>{try{await perform(structuredClone(order(id)),action,{});}catch(error){m.helpers.showToast(message(error),'warning');}};
 async function providers(id){
  const select=el(id);select.replaceChildren(new Option('Chọn đơn vị vận chuyển',''));
  const rows=await window.PawpalOrderV1.rows(()=>window.getSupabaseClient().from('shipping_provider').select('id,provider_name').eq('status','active').order('id'));
  select.replaceChildren(new Option('Chọn đơn vị vận chuyển',''),...rows.map(p=>new Option(p.provider_name,p.id)));m.enhanceEntitySelects?.();
 }
 api.openShipModal=async id=>{
  const current=order(id);if(!current)return;shipping=structuredClone(current);el('formShipOrder').reset();el('shipOrderTargetCode').textContent=current.id;el('shipTrackingInput').value=current.trackingNumber==='—'?'':current.trackingNumber;
  el('shipTrackingError').textContent='';el('shipTrackingError').style.display='none';el('modalShipOrder').classList.add('active');el('btnSubmitShipOrder').disabled=true;
  try{await providers('shipCarrierSelect');}catch(error){el('shipTrackingError').textContent='Không tải được đơn vị vận chuyển. Đóng và mở lại để thử lại.';el('shipTrackingError').style.display='block';}
  finally{el('btnSubmitShipOrder').disabled=false;}
 };
 el('formShipOrder').addEventListener('submit',e=>e.preventDefault());
 el('btnSubmitShipOrder').onclick=async()=>{
  if(busy||!shipping)return;busy=true;el('btnSubmitShipOrder').disabled=true;
  try{await perform(shipping,'ship',{provider_id:el('shipCarrierSelect').value,tracking_code:el('shipTrackingInput').value.trim(),note:el('shipCarrierNote').value.trim()});el('modalShipOrder').classList.remove('active');}
  catch(error){el('shipTrackingError').textContent=message(error);el('shipTrackingError').style.display='block';}
  finally{busy=false;el('btnSubmitShipOrder').disabled=false;}
 };
 api.openCancelModal=id=>{
  const current=order(id);if(!current)return;cancelling=structuredClone(current);el('formCancelOrder').reset();el('cancelOrderTargetCode').textContent=id;el('salesCancelError').textContent='';
  el('cancelOrderPaymentImpact').textContent=current.collected>0?'Cần hoàn '+m.helpers.formatVND(current.collected)+' tại thu ngân trước khi hủy.':'Giải phóng phần hàng đang giữ, không ghi thêm nhập hoặc xuất kho.';
  el('btnCancelOpenCashier').style.display=current.collected>0?'':'none';el('btnSubmitCancelOrder').disabled=current.collected>0;el('modalCancelOrder').classList.add('active');
 };
 el('formCancelOrder').addEventListener('submit',e=>e.preventDefault());
 el('btnCancelOpenCashier').onclick=()=>{el('modalCancelOrder').classList.remove('active');api.confirmPayment(cancelling.id);};
 el('btnSubmitCancelOrder').onclick=async()=>{
  if(busy||!cancelling)return;busy=true;el('btnSubmitCancelOrder').disabled=true;
  try{await perform(cancelling,'cancel',{reason:el('cancelOrderReasonSelect').value+(el('cancelOrderReasonDetail').value.trim()?' · '+el('cancelOrderReasonDetail').value.trim():'')});el('modalCancelOrder').classList.remove('active');}
  catch(error){el('salesCancelError').textContent=message(error);}
  finally{busy=false;el('btnSubmitCancelOrder').disabled=false;}
 };
 function renderBatch(){
  const root=el('salesBatchDispatchBody');root.replaceChildren();
  for(const o of batch.orders.slice((batchPage-1)*10,batchPage*10)){
   const row=root.insertRow();row.insertCell().textContent=o.id;row.insertCell().textContent=o.customerName;const tracking=document.createElement('input');tracking.className='admin-input';tracking.maxLength=200;tracking.value=batch.tracking.get(o.rawId)||'';tracking.setAttribute('aria-label','Mã vận đơn '+o.id);tracking.oninput=()=>batch.tracking.set(o.rawId,tracking.value.trim());row.insertCell().append(tracking);
  }
  const pager=el('salesBatchDispatchPager');pager.replaceChildren();for(const [label,page] of [['<',batchPage-1],[String(batchPage),batchPage],['>',batchPage+1]]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.style.cssText='background:transparent;border:none';button.textContent=label;button.disabled=page<1||page>Math.max(1,Math.ceil(batch.orders.length/10));button.onclick=()=>{batchPage=page;renderBatch();};pager.append(button);}
 }
 api.openBatchDispatchModal=async()=>{
  const selected=m.state.selectedBatchOrderIds||[];if(!selected.length||selected.length>100){m.helpers.showToast('Chọn từ 1 đến 100 đơn để bàn giao.','warning');return;}
  try{await m.refreshSelectedOrders(selected);}catch(error){m.helpers.showToast(message(error),'warning');return;}
  const orders=selected.map(order);if(orders.some(o=>!o||!['confirmed','packing'].includes(o.rawStatus))){m.helpers.showToast('Chỉ chọn các đơn đã xác nhận và đang chuẩn bị hàng.','warning');return;}
  batch={id:crypto.randomUUID(),orders:structuredClone(orders),tracking:new Map(orders.map(o=>[o.rawId,o.trackingNumber==='—'?'':o.trackingNumber]))};batchPage=1;el('formBatchDispatch').reset();el('batchDispatchCount').textContent=orders.length+' đơn';el('batchDispatchWarningBox').textContent='';el('batchDispatchWarningBox').style.display='none';renderBatch();el('modalBatchDispatch').classList.add('active');el('btnSubmitBatchDispatch').disabled=true;
  try{await providers('batchCarrierSelect');}catch(error){el('batchDispatchWarningBox').textContent='Không tải được đơn vị vận chuyển.';el('batchDispatchWarningBox').style.display='block';}
  finally{el('btnSubmitBatchDispatch').disabled=false;}
 };
 el('formBatchDispatch').addEventListener('submit',e=>e.preventDefault());
 el('btnSubmitBatchDispatch').onclick=async()=>{
  if(busy||!batch)return;busy=true;el('btnSubmitBatchDispatch').disabled=true;
  try{const {error}=await window.getSupabaseClient().rpc('dispatch_admin_sales_batch',{p_request_id:batch.id,p_provider_id:el('batchCarrierSelect').value||null,p_note:el('batchCarrierNote').value.trim(),p_orders:batch.orders.map(o=>({order_id:o.rawId,expected_updated_at:o.updatedAt,tracking_code:batch.tracking.get(o.rawId)||''}))});if(error)throw error;
   m.state.selectedBatchOrderIds=[];el('modalBatchDispatch').classList.remove('active');await refresh();m.helpers.showToast('Đã bàn giao toàn bộ các đơn đã chọn.');
  }catch(error){el('batchDispatchWarningBox').textContent=message(error);el('batchDispatchWarningBox').style.display='block';}
  finally{busy=false;el('btnSubmitBatchDispatch').disabled=false;}
 };
})();

;

(function(){
 'use strict';
 const m=window.PawpalOrders,api=window.PawpalOrdersModule,fmt=m.helpers.formatVND;
 const esc=value=>String(value??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cells=values=>'<tr>'+values.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
 const table=(headers,rows)=>'<table class="slip-items-table"><thead><tr>'+headers.map(v=>'<th scope="col">'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>';
 function packing(o){return '<section class="packing-slip-sheet"><h2>Phiếu đóng gói</h2><p>Pawpal · '+esc(o.id)+'</p><p>Người nhận '+esc(o.receiverName||o.customerName)+' · '+esc(o.receiverPhone||o.phone)+'</p><p>'+esc(o.address)+'</p><p>Đơn vị vận chuyển '+esc(o.carrier)+' · Mã vận đơn '+esc(o.trackingNumber)+'</p>'+table(['SKU','Sản phẩm','Số lượng'],o.products.map(p=>cells([p.sku,p.name,p.quantity])).join(''))+'<p>Ghi chú '+esc(o.customerNote||'—')+'</p><p>Người đóng gói ____________________ Người nhận bàn giao ____________________</p></section>';}
 function manifest(orders){return '<section class="manifest-sheet"><h2>Bảng kê vận chuyển</h2><p>Thời gian in '+esc(new Date().toLocaleString('vi-VN'))+'</p>'+table(['Mã đơn','Đơn vị vận chuyển','Mã vận đơn','Người nhận','Địa chỉ','Số sản phẩm'],orders.map(o=>cells([o.id,o.carrier,o.trackingNumber,(o.receiverName||o.customerName)+' · '+(o.receiverPhone||o.phone),o.address,o.products.reduce((n,p)=>n+p.quantity,0)])).join(''))+'<p>Tổng số đơn '+orders.length+'</p><p>Người bàn giao ____________________ Người tiếp nhận ____________________</p></section>';}
 // Replace the legacy generators before the list module captures helper references.
 m.helpers.generatePackingSlipHtml=packing;m.helpers.generateManifestHtml=manifest;
 api.printInvoice=id=>{const o=m.state.orders.find(v=>v.id===id);if(!o)return;api.openPosReceipt(o);};
 api.openPosReceipt=o=>{
  if(!o)return;
  const root=document.getElementById('posReceiptPrintArea');
  if(!root)return;
  root.innerHTML='<p>Pawpal · '+esc(o.id)+'</p><p>Ngày lập '+esc(m.helpers.formatDateTime(o.createdAt))+'</p><p>Khách '+esc(o.customerName)+' · '+esc(o.phone)+'</p>'+'<div class="orders-receipt__table" tabindex="0" role="region" aria-labelledby="posReceiptTitle">'+table(['Sản phẩm','SKU','Số lượng','Đơn giá','Thành tiền'],o.products.map(p=>cells([p.name,p.sku,p.quantity,fmt(p.price),fmt(p.total)])).join(''))+'</div><p class="orders-receipt__amount"><span>Tiền hàng</span><span>'+esc(fmt(o.subtotal))+'</span></p><p class="orders-receipt__amount"><span>Giảm giá</span><span>'+esc(fmt(o.discount))+'</span></p><p class="orders-receipt__amount"><span>Phí giao</span><span>'+esc(fmt(o.shippingFee))+'</span></p><p><strong>Tổng đơn '+esc(fmt(o.total))+'</strong></p><p class="orders-receipt__amount"><span>Đã thu sau hoàn</span><span>'+esc(fmt(o.collected))+'</span></p><p class="orders-receipt__amount"><span>Đã hoàn</span><span>'+esc(fmt(o.refunded))+'</span></p><p class="orders-receipt__amount"><span>Còn phải thu</span><span>'+esc(fmt(o.remaining))+'</span></p><p>Phương thức đã ghi nhận '+esc(o.paymentMethodName)+'</p><p>Phiếu bán hàng dùng để đối chiếu đơn và thu tiền.</p>';
  document.getElementById('modalPosReceipt').classList.add('active');
 };
 api.printReceiptDirectly=()=>{
  const source=document.getElementById('posReceiptPrintArea');if(!source)return;
  const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.append(frame);
  const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu bán hàng</title><style>body{font:14px Arial;color:#203A2C;padding:24px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px;overflow-wrap:anywhere}th{color:#236B48}h2{color:#236B48}</style></head><body><h2>'+document.getElementById('posReceiptTitle').textContent+'</h2>'+source.innerHTML+'</body></html>');doc.close();
  frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);
 };
})();
