import {API} from '/scripts/api/api.js';
import {watchCustomerTables} from '/scripts/shared/customer-realtime.mjs';
import {getStatusLabel} from '/scripts/shared/order-status.mjs';
import './return-handler.js';
import './review-handler.js';

let currentOrder=null,stopRealtime,loadVersion=0,actionDialog=null,actionPending=false;
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Number(value)||0);
const date=value=>value?new Date(value).toLocaleString('vi-VN'):'—';
const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
const client=()=>window.getSupabaseClient?.()||window.SupabaseClient;
function orderId(){const query=window.location.hash.split('?')[1]||window.location.search;const p=new URLSearchParams(query);return p.get('orderId')||p.get('id');}
function notify(message){if(window.showToast)window.showToast(message,'info');else text('order-action-message',message);}

async function loadOrderDetail(){
    const version=++loadVersion,user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');
    if(!user?.id||user.is_temporary){showError('Vui lòng đăng nhập để xem đơn hàng.');return;}
    try{
        const orders=await API.getUserOrders(user),id=orderId();
        if(version!==loadVersion)return;
        currentOrder=orders.find(o=>[o.id,o._supabaseId].includes(id));
        if(!currentOrder){showError('Không tìm thấy đơn hàng thuộc tài khoản của bạn.');return;}
        render();
    }catch(error){if(version===loadVersion)showError('Không thể tải đơn hàng. Vui lòng tải lại trang.');}
}
function render(){
    const o=currentOrder;
    text('order-id',o.id);text('order-created-date','Đặt ngày '+date(o.createdAt));
    text('order-status-badge',getStatusLabel(o.status));
    text('receiver-name',o.shipping?.name||'—');text('receiver-phone',o.shipping?.phone||'—');text('receiver-address',o.shipping?.address||'—');
    text('payment-method',o.paymentMethodName||'Chưa xác định');
    const paymentLabels={paid:'Đã thanh toán',partial:'Đã thanh toán một phần',cancelled:'Đơn đã hủy',pending_payment:'Chưa thanh toán'};
    text('payment-status',paymentLabels[o.paymentStatus]||'Chưa thanh toán');
    const products=document.getElementById('products-list');
    if(products)products.innerHTML=(o.products||[]).map(p=>`<div class="product-item"><div class="product-item-info"><h4 class="product-item-name">${escapeHtml(p.name)}</h4><p class="product-item-variant">${escapeHtml(p.sku||'')}</p><p class="product-item-meta">Số lượng ${Number(p.quantity)}</p></div><div class="product-item-price">${money(p.total)}</div></div>`).join('')||'<p>Đơn hàng chưa có dòng sản phẩm.</p>';
    text('subtotal',money(o.pricing.subtotal));text('shipping-fee',money(o.pricing.shippingFee));text('discount',money(o.pricing.discount));text('total',money(o.pricing.grandTotal));
    const timeline=[{title:'Đã tạo đơn',at:o.createdAt}];
    if(o.shippedAt)timeline.push({title:'Đã bàn giao vận chuyển',at:o.shippedAt});
    if(o.deliveredAt)timeline.push({title:'Đã xác nhận nhận hàng',at:o.deliveredAt});
    if(!['pending','shipping','completed'].includes(o.status))timeline.push({title:getStatusLabel(o.status),at:o.updatedAt});
    const timelineElement=document.getElementById('order-timeline');
    if(timelineElement)timelineElement.innerHTML=timeline.map(t=>`<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><h4 class="timeline-title">${escapeHtml(t.title)}</h4><p class="timeline-time">${date(t.at)}</p></div></div>`).join('');
    const actions=document.getElementById('order-actions');
    if(actions){
        actions.innerHTML='<p id="order-action-message" role="status"></p>';
        const add=(id,label,handler)=>{const button=document.createElement('button');button.type='button';button.id=id;button.className='btn-green-outline';button.textContent=label;button.onclick=handler;actions.append(button);};
        if(['draft','pending','confirmed','packing'].includes(o.orderStatus))add('detail-cancel-order','Hủy đơn hàng',()=>openOrderAction('cancel'));
        if(['shipped','shipping'].includes(o.orderStatus))add('detail-receive-order','Đã nhận hàng',()=>openOrderAction('receive'));
        add('detail-reorder','Mua lại',reorder);
        if(['completed','delivered','returned'].includes(o.orderStatus))add('detail-request-return','Yêu cầu đổi trả',()=>window.openRMADrawer(o.id));
        if(o.paymentStatus!=='paid'){
            const note=document.createElement('p');note.textContent='Khoản thu chỉ được ghi nhận sau khi nhân viên xác nhận đã nhận tiền.';actions.append(note);
        }
        if(o.note){const note=document.createElement('p');note.id='order-note';note.style.whiteSpace='pre-wrap';note.textContent='Ghi chú đơn hàng: '+o.note;actions.append(note);}
    }
    const support=document.getElementById('btnOrderReturnSupport');if(support){support.hidden=!['completed','delivered','returned'].includes(o.orderStatus);support.onclick=()=>window.openRMADrawer(o.id);}
    document.getElementById('guest-notice')?.classList.add('d-none');
    document.getElementById('pending-payment-banner')?.classList.add('d-none');
    window.setUserSubBreadcrumb?.('#'+o.id,'order-detail');
    if(['completed','delivered'].includes(o.orderStatus))window.ReviewHandler?.init(o._supabaseId,o.products).then(()=>{
        if(new URLSearchParams(window.location.hash.split('?')[1]||'').get('section')==='reviews')document.getElementById('order-review-container')?.scrollIntoView({block:'start'});
    });
}

function openOrderAction(action){
    if(actionPending||!currentOrder)return;
    actionDialog?.close();actionDialog?.remove();
    const order=currentOrder,request=crypto.randomUUID(),cancel=action==='cancel';
    const dialog=document.createElement('dialog');actionDialog=dialog;dialog.id='order-detail-action-dialog';
    dialog.style.cssText='position:fixed;inset:0;margin:auto;width:540px;height:fit-content;max-height:92vh;overflow:auto;max-width:92vw;background:#fff;border:1px solid #ECF2EE;border-radius:9px;padding:26px 30px;color:#203A2C';
    dialog.innerHTML=`<h3 style="color:#236B48">${cancel?'Hủy đơn hàng':'Xác nhận nhận hàng'}</h3><p>${escapeHtml(order.id)}</p>
      ${cancel?'<label for="detail-cancel-reason">Lý do hủy <span style="color:#DC2626">*</span></label><textarea id="detail-cancel-reason" class="form-control" maxlength="2000"></textarea>':'<p>Bạn đã nhận đủ sản phẩm của đơn hàng này?</p>'}
      <p id="detail-action-error" role="alert" style="color:#DC2626"></p><div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px"><button type="button" id="detail-action-close" class="btn-green-outline">Đóng</button><button type="button" id="detail-action-confirm" class="btn-cta">${cancel?'Xác nhận hủy':'Xác nhận đã nhận'}</button></div>`;
    document.body.append(dialog);
    const close=()=>{if(actionPending)return;dialog.close();dialog.remove();actionDialog=null;};
    dialog.querySelector('#detail-action-close').onclick=close;
    dialog.oncancel=e=>{e.preventDefault();close();};
    dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}};
    dialog.querySelector('#detail-action-confirm').onclick=async()=>{
        if(actionPending)return;
        const errorElement=dialog.querySelector('#detail-action-error'),button=dialog.querySelector('#detail-action-confirm');
        const reason=dialog.querySelector('#detail-cancel-reason')?.value.trim();
        if(cancel&&(!reason||reason.length<2)){errorElement.textContent='Vui lòng nhập lý do hủy đơn.';return;}
        actionPending=true;button.disabled=true;errorElement.textContent='';
        try{
            const args={p_request:request,p_order:order._supabaseId,p_expected:order.updatedAt};if(cancel)args.p_reason=reason;
            const result=await client().rpc(cancel?'cancel_own_sales_order':'receive_own_sales_order',args);
            if(result.error)throw result.error;
            actionPending=false;close();await loadOrderDetail();
        }catch(error){errorElement.textContent=error.code==='PT409'?'Đơn đã thay đổi. Vui lòng đóng và tải lại thông tin.':error.message==='sales_refund_required'?'Đơn đã thu tiền. Vui lòng liên hệ cửa hàng để hoàn tiền trước khi hủy.':'Không thể thực hiện. Vui lòng tải lại thông tin hoặc liên hệ cửa hàng.';}
        finally{actionPending=false;button.disabled=false;}
    };
    dialog.showModal();
}
async function reorder(){
    if(!currentOrder)return;
    try{
        const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');
        const existing=await API.getUserCart(user.id);
        const additions=currentOrder.products.map(p=>({id:p.variantId,variantId:p.variantId,name:p.name,quantity:p.quantity}));
        await API.saveUserCart(user.id,[...existing,...additions]);window.location.href='/cart';
    }catch(error){notify(error.message||'Không thể thêm sản phẩm vào giỏ hàng.');}
}
function showError(message){const element=document.querySelector('.order-detail-module-container');if(element){element.innerHTML='<p role="alert"></p><a href="#orders">Quay lại danh sách đơn hàng</a>';element.querySelector('p').textContent=message;}}
export function dispose(){++loadVersion;stopRealtime?.();stopRealtime=null;if(!actionPending){actionDialog?.close();actionDialog?.remove();actionDialog=null;}}
export async function initOrderDetail(){
    dispose();
    const container=document.querySelector('.order-detail-module-container');
    await loadOrderDetail();
    container?.classList.remove('user-order-loading');container?.setAttribute('aria-busy','false');container?.querySelector('.user-order-skeleton')?.remove();
    const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');
    stopRealtime=watchCustomerTables(client(),user?.id,['sales_order','sales_order_detail','payment','review'],loadOrderDetail);
}
export const init=initOrderDetail;
window.initOrderDetail=initOrderDetail;
window.cancelOrder=()=>openOrderAction('cancel');window.confirmReceived=()=>openOrderAction('receive');window.reorder=reorder;
window.payNow=window.confirmOrderPayment=window.openChangePaymentMethodModal=()=>notify('Vui lòng liên hệ cửa hàng. Thanh toán cần nhân viên xác nhận thực nhận.');
window.closeOrderQRModal=()=>{document.getElementById('order-payment-qr-modal')?.classList.remove('is-open');};
