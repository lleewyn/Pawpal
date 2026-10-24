// tab-order-detail.js - Subtab Hồ sơ đơn hàng 360° của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';
    const escapeText=value=>window.PawpalOrdersModule.escapeHtml(value??'');

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders Detail] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const { formatVND, formatDateTime, formatTime, showToast, persistOrdersData } = helpers;

    // Render chi tiết đơn hàng 360°
    function renderOrderDetail(orderId) {
        const loading = document.getElementById('orderDetailLoading');
        const content = document.getElementById('orderDetailData');
        if (!state.ordersLoaded || state.ordersError) {
            if (content) content.style.display = 'none';
            if (loading) { loading.style.display = ''; if (state.ordersError) loading.textContent = 'Không thể tải hồ sơ đơn hàng. Vui lòng tải lại trang.'; }
            return;
        }
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = '';

        const ordersList = state.orders || [];
        const order = orderId ? ordersList.find(o => o.id === orderId || o.rawId === orderId) : (state.selectedOrderId ? ordersList.find(o => o.id === state.selectedOrderId) : null);

        if (!order) {
            const codeEl = document.getElementById('detailOrderCode');
            const metaEl = document.getElementById('detailOrderMeta');
            const actionBtnsEl = document.getElementById('detailOrderActionButtons');
            const itemsTbody = document.getElementById('detailOrderItemsBody');
            if (codeEl) codeEl.textContent = 'Không tìm thấy đơn hàng';
            if (metaEl) metaEl.textContent = orderId ? `Đơn hàng "${orderId}" không tồn tại hoặc đã bị xóa.` : 'Vui lòng chọn một đơn hàng từ danh sách để xem hồ sơ chi tiết.';
            if (actionBtnsEl) actionBtnsEl.innerHTML = '';
            if (itemsTbody) {
                itemsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">Không có dữ liệu chi tiết cho đơn hàng này.</td></tr>';
            }
            const subtotalEl = document.getElementById('detailSummarySubtotal');
            if (subtotalEl) subtotalEl.textContent = '0 đ';
            const shipEl = document.getElementById('detailSummaryShipping');
            if (shipEl) shipEl.textContent = '0 đ';
            const voucherEl = document.getElementById('detailSummaryVoucher');
            if (voucherEl) voucherEl.textContent = '0 đ';
            const pointsEl = document.getElementById('detailSummaryPoints');
            if (pointsEl) pointsEl.textContent = '0 đ';
            const totalEl = document.getElementById('detailSummaryTotal');
            if (totalEl) totalEl.textContent = '0 đ';
            return;
        }

        state.selectedOrderId = order.id;
        sessionStorage.setItem('pawpal_admin_order_selected_id', order.id);

        // Header bar
        const codeEl = document.getElementById('detailOrderCode');
        const metaEl = document.getElementById('detailOrderMeta');
        const actionBtnsEl = document.getElementById('detailOrderActionButtons');

        if (codeEl) codeEl.textContent = order.id;
        if (metaEl) {
            const dateObj = new Date(order.createdAt);
            metaEl.textContent = `Đặt lúc: ${formatDateTime(dateObj)} | Kênh đặt: Website PawPal`;
        }

        // Nút thao tác một chạm theo trạng thái
        if (actionBtnsEl) {
            let btnsHtml = `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Thu và hoàn tiền</button>`;
            if (order.status === 'pending') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openCancelModal('${order.id}')" style="color: #DC2626;">Hủy đơn</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.confirmOrder('${order.id}')">Xác nhận đơn</button>
                `;
            } else if (order.status === 'confirmed') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printPackingSlip('${order.id}')">In phiếu đóng gói</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Bàn giao vận chuyển</button>
                `;
            } else if (order.status === 'shipping') {
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Cập nhật vận đơn</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeDelivery('${order.id}')">Đã giao hàng thành công</button>
                `;
            } else if (order.status === 'delivered') {
                if (order.paymentMethod !== 'cod' && order.paymentStatus === 'unpaid' && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu tiền</button>
                    `;
                } else if (order.paymentMethod === 'cod' && (order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid') && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu cục</button>
                    `;
                }
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                    <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeOrder('${order.id}')">Hoàn tất đơn hàng</button>
                `;
            } else if (order.status === 'completed') {
                if (order.paymentMethod === 'cod' && (order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid') && order.paymentStatus !== 'paid') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu cục</button>
                    `;
                }
                btnsHtml += `
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printInvoice('${order.id}')">In hóa đơn</button>
                    <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                `;
            }
            actionBtnsEl.innerHTML = btnsHtml;
        }

        // Khối hồ sơ Đổi trả và Bồi hoàn RMA (nếu có)
        PawpalOrders.renderSalesReturns?.(order);

        const itemsTbody = document.getElementById('detailOrderItemsBody');
        if (itemsTbody) {
            itemsTbody.innerHTML = (order.products || []).map(p => `
                <tr>
                    <td>
                        <div class="prod-item-row">
                            <img src="${escapeText(p.image)}" alt="${escapeText(p.name)}" class="prod-thumb" loading="lazy" decoding="async" onerror="this.style.display='none'">
                            <div class="prod-info-cell">
                                <span class="prod-title">${escapeText(p.name)}</span>
                                <span class="prod-sku-tag">Quy cách: ${escapeText(p.spec || '—')}</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-family: monospace; color: var(--text-muted);">${escapeText(p.sku)}</td>
                    <td>${formatVND(p.price)}</td>
                    <td style="text-align: center; font-weight: 600;">${p.quantity}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-heading);">${formatVND(p.total || (p.price * p.quantity))}</td>
                </tr>
            `).join('');
        }

        // Bảng kê thanh toán
        const subtotalEl = document.getElementById('detailSummarySubtotal');
        const shipEl = document.getElementById('detailSummaryShipping');
        const voucherEl = document.getElementById('detailSummaryVoucher');
        const pointsEl = document.getElementById('detailSummaryPoints');
        const totalEl = document.getElementById('detailSummaryTotal');

        if (subtotalEl) subtotalEl.textContent = formatVND(order.subtotal);
        if (shipEl) shipEl.textContent = formatVND(order.shippingFee);
        if (voucherEl) voucherEl.textContent = '- ' + formatVND(order.discount || 0);
        if (pointsEl) pointsEl.textContent = '- ' + formatVND((order.pawPointsUsed || 0) * 100);
        if (totalEl) totalEl.textContent = formatVND(order.total);

        // Ghi chú
        const custNoteEl = document.getElementById('detailCustomerNote');
        const intNoteEl = document.getElementById('detailInternalNote');
        if (custNoteEl) custNoteEl.textContent = order.customerNote ? `"${order.customerNote}"` : '(Không có ghi chú)';
        if (intNoteEl) intNoteEl.textContent = order.internalNote || 'Chưa có ghi chú nội bộ.';

        // Giao nhận
        const recNameEl = document.getElementById('detailReceiverName');
        const recPhoneEl = document.getElementById('detailReceiverPhone');
        const recAddrEl = document.getElementById('detailReceiverAddress');
        const payMethodEl = document.getElementById('detailPaymentMethod');
        const payBadgeEl = document.getElementById('detailPaymentBadge');
        const carrierEl = document.getElementById('detailShippingCarrier');
        const trackingEl = document.getElementById('detailTrackingNumber');

        if (recNameEl) {
            recNameEl.textContent = order.customerName;
            recNameEl.onclick = () => {
                PawpalOrdersModule.openCustomerProfile(order.userId, order.customerName);
            };
        }
        if (recPhoneEl) recPhoneEl.textContent = order.phone;
        if (recAddrEl) recAddrEl.textContent = order.address;
        if (payMethodEl) {
            let txt = 'Thanh toán tiền mặt khi nhận hàng (COD)';
            if (order.paymentMethod === 'vnpay') txt = 'Cổng thanh toán VNPay QR';
            else if (order.paymentMethod === 'momo') txt = 'Ví điện tử MoMo';
            else if (order.paymentMethod === 'bank_transfer') txt = 'Chuyển khoản trực tiếp ngân hàng Vietcombank';
            payMethodEl.textContent = order.paymentMethodName;
        }
        if (payBadgeEl) {
            if (order.total===0) {
                payBadgeEl.className = 'admin-badge badge-neutral';
                payBadgeEl.textContent = 'Không phải thu';
            } else if (order.paymentStatus==='partial') {
                payBadgeEl.className = 'admin-badge badge-warning';
                payBadgeEl.textContent = 'Đã thu một phần';
            } else if (order.paymentStatus === 'paid') {
                payBadgeEl.className = 'admin-badge badge-paid';
                payBadgeEl.textContent = 'Đã thanh toán';
            } else if (order.paymentStatus === 'refund_pending' || order.paymentStatus === 'pending_refund') {
                payBadgeEl.className = 'admin-badge badge-warning';
                payBadgeEl.textContent = 'Chờ hoàn tiền';
            } else if (order.paymentStatus === 'refunded') {
                payBadgeEl.className = 'admin-badge badge-cancelled';
                payBadgeEl.textContent = 'Đã hoàn tiền';
            } else if (order.paymentStatus === 'cancelled') {
                payBadgeEl.className = 'admin-badge badge-cancelled';
                payBadgeEl.textContent = 'Đã hủy thanh toán';
            } else if (order.paymentStatus === 'cod_pending') {
                payBadgeEl.className = 'admin-badge badge-warning';
                payBadgeEl.textContent = 'Chờ đối soát COD';
            } else {
                payBadgeEl.className = 'admin-badge badge-unpaid';
                payBadgeEl.textContent = 'Chưa thanh toán';
            }
        }
        if (carrierEl) carrierEl.textContent = order.carrier || 'Chưa phân công';
        if (trackingEl) trackingEl.textContent = order.trackingNumber || '--';

        // Timeline lịch trình
        const timelineListEl = document.getElementById('detailOrderTimeline');
        if (timelineListEl) {
            timelineListEl.innerHTML = (order.timeline || []).map(t => `
                <div class="timeline-step-item ${t.done ? '' : 'future'}">
                    <span class="timeline-step-title">${escapeText(t.title)}</span>
                    <span class="timeline-step-time">${escapeText(t.time)}</span>
                    <span class="timeline-step-desc">${escapeText(t.desc)}</span>
                </div>
            `).join('');
        }
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.detail = {
        renderOrderDetail
    };

    // Khởi tạo các sự kiện giao diện cho Subtab Detail
    let isDetailEventsInitialized = false;
    function initDetailEvents() {
        if (isDetailEventsInitialized) return;
        isDetailEventsInitialized = true;
        // Toggle hiển thị trường hoàn tiền trong modal RMA
        document.getElementById('formReturnRefund')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('rmaSolutionType')?.addEventListener('change', (e) => {
            const isRefund = e.target.value === 'refund';
            const refundRow = document.getElementById('rmaRefundFieldsRow');
            if (refundRow) refundRow.style.display = isRefund ? 'grid' : 'none';
        });

        // Xác nhận tạo phiếu RMA
        document.getElementById('btnSubmitRmaTicket')?.addEventListener('click', async event => {
            const order=state.rmaOrderSnapshot;if(!order)return;
            const lines=[...document.querySelectorAll('.rma-item-select-checkbox:checked')].map(cb=>({line_id:cb.dataset.lineId,quantity:Number(cb.closest('tr').querySelector('.rma-item-qty-input').value)}));
            const received=document.getElementById('rmaReceivedConfirmed').checked;
            const saleable=document.querySelector('[name="rmaRestockAction"]:checked')?.value==='restock';
            if(received&&document.querySelector('[name="rmaRestockAction"]:checked')?.value==='pending'){showToast('Vui lòng chọn kết quả kiểm định hàng đã nhận.','warning');return;}
            if(saleable&&!received){showToast('X\u00e1c nh\u1eadn \u0111\u00e3 nh\u1eadn v\u00e0 ki\u1ec3m \u0111\u1ecbnh h\u00e0ng tr\u01b0\u1edbc khi nh\u1eadp kho.','warning');return;}
            const reason=document.getElementById('rmaReasonSelect').selectedOptions[0].textContent;
            event.currentTarget.disabled=true;
            try {
                const {error}=await window.getSupabaseClient().rpc('save_admin_sales_return',{p_request_id:state.rmaRequestId,p_return_id:state.rmaReturnId,p_order_id:order.rawId,p_expected_updated_at:order.updatedAt,p_action:'create',p_details:{lines,reason,type:document.getElementById('rmaSolutionType').value,note:document.getElementById('rmaInternalNote').value.trim(),received,inspected:received,saleable}});
                if(error)throw error;
                document.getElementById('modalReturnRefund').classList.remove('active');
                await PawpalOrders.fetchOrdersData({force:true});await PawpalOrders.fetchProductsData({force:true});
                showToast('\u0110\u00e3 l\u01b0u y\u00eau c\u1ea7u \u0111\u1ed5i tr\u1ea3. Ho\u00e0n ti\u1ec1n \u0111\u01b0\u1ee3c ghi ri\u00eang t\u1ea1i thu ng\u00e2n.');
            }catch(error){showToast(error.message,'danger');}
            finally{document.getElementById('btnSubmitRmaTicket').disabled=false;}
        });
    }

    // Xuất ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.renderOrderDetail = renderOrderDetail;

    // Khởi tạo sự kiện
    initDetailEvents();
})();

;

(function(){
 'use strict';
 const m=window.PawpalOrders,el=id=>document.getElementById(id);
 const modal=document.createElement('div');modal.id='modalSalesReturnReceipt';modal.className='admin-modal-overlay';
 modal.innerHTML='<div class="admin-modal-card" style="width:600px;max-width:94vw;padding:26px 30px"><div class="modal-header-clean"><div class="modal-title-clean">Xử lý hàng trả</div><button type="button" data-close-modal="modalSalesReturnReceipt" class="modal-btn-close-text">Đóng</button></div><form id="formSalesReturnReceipt" onsubmit="return false;" class="modal-body-clean"><p id="salesReturnReceiptMeta" style="margin:0;color:#4F7A65;overflow-wrap:anywhere"></p><label class="form-label-clean" for="salesReturnReceiptAction">Thao tác</label><select id="salesReturnReceiptAction" class="admin-select"><option value="receive">Xác nhận nhận hàng</option><option value="reject">Từ chối yêu cầu</option></select><div id="salesReturnReceiptInspection"><label class="form-label-clean" for="salesReturnSaleable">Kết quả kiểm định <span style="color:#DC2626">*</span></label><select id="salesReturnSaleable" class="admin-select"><option value="">Chọn kết quả</option><option value="true">Đủ điều kiện bán, nhập lại kho</option><option value="false">Không đủ điều kiện bán</option></select><label style="display:flex;gap:8px;margin-top:16px"><input type="checkbox" id="salesReturnReceived">Tôi đã nhận đủ số lượng và kiểm định hàng của yêu cầu này</label></div><label class="form-label-clean" for="salesReturnReceiptReason">Lý do hoặc ghi chú <span style="color:#DC2626">*</span></label><textarea id="salesReturnReceiptReason" class="admin-input" rows="2" maxlength="2000" style="height:auto"></textarea><p id="salesReturnReceiptError" role="alert" style="color:#DC2626;background:transparent;border:none;margin:0"></p><div class="modal-footer-clean"><button type="button" class="admin-btn admin-btn-secondary" data-close-modal="modalSalesReturnReceipt">Hủy</button><button type="button" class="admin-btn admin-btn-primary" id="btnSaveSalesReturnReceipt">Lưu xử lý</button></div></form></div>';
 document.getElementById('modalReturnRefund').parentElement.append(modal);
 let selected=null,request=null,busy=false;
 const status={pending:'Chờ xử lý',approved:'Đã duyệt, chờ nhận hàng',received:'Đã nhận và kiểm định',rejected:'Đã từ chối',cancelled:'Đã hủy'};
 m.renderSalesReturns=order=>{
  const root=el('detailOrderRmaBannerContainer');root.replaceChildren();
  for(const r of order.returnRequests||[]){
   const section=document.createElement('div');section.style.cssText='padding:10px 0;overflow-wrap:anywhere';
   const title=document.createElement('strong');title.textContent='Yêu cầu đổi trả · '+(status[r.request_status]||'Cần đối soát');
   const reason=document.createElement('p');reason.style.cssText='color:#4F7A65;margin:4px 0';reason.textContent=r.reason;
   const outcome=document.createElement('p');outcome.style.cssText='color:#4F7A65;margin:4px 0';outcome.textContent=({received_saleable:'Đã nhập lại kho sau kiểm định',received_unsaleable:'Đã nhận hàng, không nhập vào tồn có thể bán'})[r.resolution_type]||r.resolution_type||'';
   const lines=document.createElement('div');lines.style.cssText='color:#4F7A65;font-size:12px';lines.textContent=r.lines.map(d=>(d.line?.product_name_snapshot||d.line?.sku_snapshot||'Dòng bán')+' × '+d.quantity).join('; ');
   section.append(title,reason,lines,outcome);
   if(['pending','approved'].includes(r.request_status)){
    const button=document.createElement('button');button.type='button';button.className='admin-btn admin-btn-secondary';button.textContent='Xử lý hàng trả';button.onclick=()=>m.openSalesReturnReceipt(order.rawId,r.id);section.append(button);
   }
   root.append(section);
  }
 };
 m.openSalesReturnReceipt=(orderId,returnId)=>{
  if(busy)return;
  const order=m.state.orders.find(o=>o.rawId===orderId),r=order?.returnRequests.find(r=>r.id===returnId);if(!r)return;
  selected={orderId,r:structuredClone(r)};request=crypto.randomUUID();el('formSalesReturnReceipt').reset();
  el('salesReturnReceiptMeta').textContent=order.id+' · '+r.reason;el('salesReturnReceiptError').textContent='';el('salesReturnReceiptInspection').style.display='block';
  modal.classList.add('active');
 };
 el('formSalesReturnReceipt').addEventListener('submit',e=>e.preventDefault());
 el('salesReturnReceiptAction').onchange=()=>{el('salesReturnReceiptInspection').style.display=el('salesReturnReceiptAction').value==='receive'?'block':'none';};
 el('btnSaveSalesReturnReceipt').onclick=async()=>{
  if(busy||!selected)return;
  const action=el('salesReturnReceiptAction').value,reason=el('salesReturnReceiptReason').value.trim(),received=el('salesReturnReceived').checked;
  if(reason.length<2||(action==='receive'&&(!received||!el('salesReturnSaleable').value))){el('salesReturnReceiptError').textContent='Nhập lý do; khi nhận hàng cần chọn kết quả kiểm định và xác nhận đã nhận đủ.';return;}
  busy=true;el('btnSaveSalesReturnReceipt').disabled=true;
  try{
   const {error}=await window.getSupabaseClient().rpc('save_admin_sales_return',{p_request_id:request,p_return_id:selected.r.id,p_order_id:selected.orderId,p_expected_updated_at:selected.r.updated_at,p_action:action,p_details:{reason,received:action==='receive',inspected:action==='receive',saleable:el('salesReturnSaleable').value==='true'}});
   if(error)throw error;
   modal.classList.remove('active');await m.fetchOrdersData({force:true});await m.fetchProductsData({force:true});m.helpers.showToast('Đã lưu xử lý hàng trả.');
  }catch(error){el('salesReturnReceiptError').textContent=error.code==='PT409'?'Yêu cầu đã thay đổi. Đóng và mở lại để đối chiếu.':'Không thể lưu xử lý. Kiểm tra trạng thái và quyền thao tác.';}
  finally{busy=false;el('btnSaveSalesReturnReceipt').disabled=false;}
 };
})();
