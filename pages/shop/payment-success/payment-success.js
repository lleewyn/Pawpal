import { API } from '/scripts/api/api.js';
import { paymentResult } from '/scripts/shared/payment-result.mjs';
const el=id=>document.getElementById(id);
async function loadResult(){
 const params=new URLSearchParams(location.search),id=params.get('orderId')||params.get('vnp_TxnRef');
 el('resultRetry').hidden=true;el('resultDetails').hidden=true;
 el('resultTitle').textContent='Đang kiểm tra đơn hàng';
 try{
  if(!id || id==='undefined')throw Error('Chưa có mã đơn hàng để kiểm tra.');
  const auth=await window.getSupabaseClient?.()?.auth.getUser();
  if(auth?.error || !auth?.data?.user)throw Error('Vui lòng đăng nhập để kiểm tra đơn hàng và kết quả thanh toán.');
  const identity=await window.getSupabaseClient().from('customer').select('id').eq('auth_user_id',auth.data.user.id).maybeSingle();
  if(identity.error || !identity.data?.id)throw Error('Không thể xác định hồ sơ khách hàng của phiên đăng nhập.');
  const orders=await API.getUserOrders(identity.data.id);
  const order=orders.find(o=>o.id===id || o._supabaseId===id);
  if(!order)throw Error('Chưa tìm thấy đơn hàng trong tài khoản của bạn. Vui lòng thử kiểm tra lại.');
  const result=paymentResult(order);
  el('resultTitle').textContent=result.title;el('resultMessage').textContent=result.message;
  el('resultMark').textContent=result.mark;el('resultMark').dataset.state=result.state;
  el('resultOrderCode').textContent=order.id;
  el('resultAmount').textContent=Number(order.pricing.grandTotal).toLocaleString('vi-VN')+'đ';
  el('resultPaymentStatus').textContent=result.paymentLabel;el('resultOrderStatus').textContent=result.orderLabel;
  el('resultDetails').hidden=false;
  el('resultViewOrder').href='/user#order-detail?id='+encodeURIComponent(order.id);
 }catch(error){
  el('resultTitle').textContent='Chưa xác minh được kết quả';
  el('resultMessage').textContent=error.message||'Kết nối chậm. Vui lòng kiểm tra lại trước khi đặt hoặc thanh toán thêm.';
  el('resultMark').textContent='…';el('resultMark').dataset.state='pending';el('resultRetry').hidden=false;
 }finally{el('paymentResult').setAttribute('aria-busy','false');}
}
el('resultRetry').onclick=()=>{el('paymentResult').setAttribute('aria-busy','true');loadResult();};
loadResult();
