// The client must carry the customer's Auth JWT. No service-role writes or inferred costs.
function calculateVoucherPoints(voucher={}) {
 const value=Number(voucher.required_points);return Number.isSafeInteger(value)&&value>0?value:null;
}
function createCustomerLoyaltyService(client){
 async function snapshot(customerId){
  const r=await client.rpc('own_loyalty_snapshot');
  if(r.error || r.data?.customer_id!==customerId)throw Error('Không thể tải dữ liệu Paw Points của phiên hiện tại.');return r.data;
 }
 const view=w=>({id:w.id,voucherId:w.voucher.id,code:w.voucher.voucher_code,name:w.voucher.voucher_name,
  pointsCost:w.voucher.required_points,createdAt:w.acquired_at,expiresAt:w.expired_at,status:w.status});
 return {
  async wallet(customerId){return (await snapshot(customerId)).wallet.map(view);},
  async redeem(customerId,input={}){
   if(!input.requestId || !input.version || !input.voucherId)throw Error('Vui lòng tải lại trang trước khi đổi ưu đãi.');
   await snapshot(customerId);
   const r=await client.rpc('redeem_own_loyalty_voucher',{p_id:input.requestId,p_voucher:input.voucherId,p_expected:input.version});
   if(r.error)throw Error(r.error.message);
   const state=await snapshot(customerId),owned=state.wallet.find(w=>w.id===r.data);
   return {points:state.points,transactionType:'REDEEM',voucher:owned?view(owned):null};
  }
 };
}
module.exports={calculateVoucherPoints,createCustomerLoyaltyService};
