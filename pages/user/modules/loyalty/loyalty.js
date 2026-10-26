import { withDeadline } from '/scripts/shared/request-deadline.mjs';
import { createLoyaltySync } from '/scripts/shared/loyalty-sync.mjs';
const currentOwner=()=>{try{return JSON.parse(localStorage.getItem('pawpal_current_user')||'null')?.id || null;}catch{return null;}};
const db=()=>window.getSupabaseClient?.() || window.SupabaseClient;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>new Intl.NumberFormat('vi-VN').format(Number(v)||0);
const day=v=>v?new Date(v).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'}):'Không giới hạn';
const discount=v=>num(v.discount_value)+(v.type==='percentage'?'%':'đ');
const scope=v=>({all:'Sản phẩm và dịch vụ',shop:'Sản phẩm',services:'Dịch vụ',service:'Dịch vụ',product:'Sản phẩm'}[v.applicable_for] || v.applicable_for);
const walletEnd=w=>day(new Date(Math.min(new Date(w.voucher.end_date+'T23:59:59+07:00').getTime(),w.expired_at?new Date(w.expired_at).getTime()-1:Infinity)));
let cleanup=()=>{};
export function dispose(){cleanup();cleanup=()=>{};}
async function rpc(name,args){
 const owner=currentOwner();
 const auth=await db()?.auth?.getUser();if(auth?.error || !auth?.data?.user)throw Error('Vui lòng đăng nhập lại.');
 if(!owner || currentOwner()!==owner)throw Error('Phiên tài khoản đã thay đổi. Vui lòng tải lại.');
 const r=await withDeadline(()=>db().rpc(name,args),20000,'Kết nối chậm. Vui lòng kiểm tra kết quả trước khi gửi lại.');
 if(r.error){const error=Error(r.error.code==='PT409'?'Ưu đãi hoặc yêu cầu đã thay đổi. Vui lòng tải lại để đối soát.':r.error.message || 'Không thể xử lý yêu cầu.');error.code=r.error.code;throw error;}return r.data;
}
function dialog(title,html){
 document.querySelector('#loyalty-dialog [data-close-modal]')?.click();
 const overlay=document.createElement('div');overlay.id='loyalty-dialog';overlay.className='modal loyalty-modal-wrapper show';overlay.style.display='flex';
 overlay.innerHTML=`<div class="modal-dialog modal-dialog-centered loyalty-modal-dialog"><div class="modal-content loyalty-modal-content" role="dialog" aria-modal="true" aria-labelledby="loyaltyDialogTitle"><div class="modal-header loyalty-modal-header"><h5 id="loyaltyDialogTitle" class="modal-title loyalty-modal-title">${esc(title)}</h5><button type="button" class="btn-modal-close" data-close-modal="loyalty-dialog">Đóng</button></div><div class="modal-body loyalty-modal-body">${html}</div><div class="modal-footer loyalty-modal-footer"><button type="button" class="btn-modal-cancel" data-close-modal="loyalty-dialog">Để sau</button></div></div></div>`;
 const previous=document.activeElement;document.body.append(overlay);document.body.classList.add('modal-open');
 const close=()=>{overlay.remove();if(!document.getElementById('loyalty-dialog'))document.body.classList.remove('modal-open');document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};
 const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);
 overlay.onclick=e=>{if(e.target===overlay || e.target.closest('[data-close-modal]'))close();};overlay.querySelector('button').focus();return {overlay,close};
}
function detail(v){dialog('Chi tiết ưu đãi',`<h4>${esc(v.voucher_name)}</h4><p>${esc(v.voucher_code)}</p><table class="voucher-detail-spec-table"><tbody><tr><td>Mức giảm</td><td>${esc(discount(v))}</td></tr><tr><td>Đơn tối thiểu</td><td>${num(v.minimum_order_amount)}đ</td></tr><tr><td>Phạm vi</td><td>${esc(scope(v))}</td></tr><tr><td>Hiệu lực</td><td>${day(v.start_date)} – ${day(v.end_date)}</td></tr><tr><td>Điểm quy đổi</td><td>${num(v.required_points)}</td></tr></tbody></table><p>${esc(v.description || '')}</p><p>Mã chỉ áp dụng khi đơn đáp ứng điều kiện. Đổi voucher không tự thanh toán đơn hoặc đặt lịch.</p>`);}
function spendingProgress(snapshot){
 const spend=Number(snapshot.eligible_spend);
 if(!Number.isFinite(spend))return '<p>Chưa tải được tiến trình chi tiêu xét hạng.</p>';
 const tiers=(snapshot.tiers||[]).filter(t=>Number.isFinite(Number(t.minimum_expenditure))).sort((a,b)=>Number(a.minimum_expenditure)-Number(b.minimum_expenditure));
 const floor=Number(snapshot.tier?.minimum_expenditure)||0;
 const next=tiers.find(t=>Number(t.minimum_expenditure)>Math.max(floor,spend));
 const target=next?Number(next.minimum_expenditure):Number(tiers.at(-1)?.minimum_expenditure)||0;
 const percent=target>0?Math.max(0,Math.min(100,spend/target*100)):100;
 return `<div class="loyalty-spend-progress"><div class="loyalty-spend-heading"><span>Chi tiêu xét hạng</span><strong>${num(spend)}đ</strong></div><div class="loyalty-spend-track" role="progressbar" aria-label="Tiến trình chi tiêu xét hạng" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}"><span style="width:${percent}%"></span></div><div class="loyalty-spend-milestone">${next?`<span>Hạng ${esc(next.name)}</span><strong>${num(target)}đ</strong>`:'<span>Đã đạt mốc chi tiêu cao nhất hiện tại</span>'}</div>${next?`<p>Còn ${num(target-spend)}đ chi tiêu đủ điều kiện để đạt mốc hạng ${esc(next.name)}.</p>`:''}<small>Tính theo khoản thanh toán đủ điều kiện, sau khi trừ hoàn tiền.</small></div>`;
}

export async function initLoyalty(){
 dispose();const root=document.getElementById('loyalty-card-wrapper');if(!root)return;
 let active=true,snapshot,channel,historyPage=0,walletPage=0,catalogPage=0;
 const voucherPageSize=6;
 const serverPaging=window.PAWPAL_LOYALTY_PAGING_ENABLED!==false;
 function paginate(regionId,total,current,onPage){
  const pages=Math.max(1,Math.ceil(total/voucherPageSize));
  let nav=document.getElementById(regionId+'-pages');
  if(!nav){nav=document.createElement('nav');nav.id=regionId+'-pages';nav.className='loyalty-voucher-pages';nav.setAttribute('aria-label',regionId==='vouchers-grid'?'Trang ?u ??i ??i ?i?m':'Trang voucher c?a t?i');document.getElementById(regionId).after(nav);}
  nav.hidden=pages<=1;nav.innerHTML=pages<=1?'':`<button type="button" data-prev ${current===0?'disabled':''} aria-label="Trang tr??c">&lt;</button><span>${current+1} / ${pages}</span><button type="button" data-next ${current===pages-1?'disabled':''} aria-label="Trang sau">&gt;</button>`;
  nav.querySelector('[data-prev]')?.addEventListener('click',()=>{onPage(current-1);if(serverPaging)sync.schedule();else render();document.getElementById(regionId).scrollIntoView({block:'start'});});
  nav.querySelector('[data-next]')?.addEventListener('click',()=>{onPage(current+1);if(serverPaging)sync.schedule();else render();document.getElementById(regionId).scrollIntoView({block:'start'});});
 }
 const sync=createLoyaltySync({owner:currentOwner,hidden:()=>document.visibilityState==='hidden',load:()=>rpc('own_loyalty_snapshot',serverPaging?{p_history_page:historyPage+1,p_wallet_page:walletPage+1,p_catalog_page:catalogPage+1}:undefined),apply:data=>{if(!root.isConnected)return;snapshot=data;if(serverPaging){historyPage=(data.history_page||1)-1;walletPage=(data.wallet_page||1)-1;catalogPage=(data.catalog_page||1)-1;}render();},fail:showError});
 function showError(error){if(!active || !root.isConnected)return;snapshot=null;document.getElementById('loyalty-history')?.remove();document.querySelector('#loyalty-dialog [data-close-modal]')?.click();for(const id of ['loyalty-card-wrapper','my-vouchers-list','vouchers-grid']){const region=document.getElementById(id);region.innerHTML=`<p role="alert">${esc(error.message)}</p>`;region.setAttribute('aria-busy','false');}document.getElementById('myVouchersCountLabel').textContent='Không thể tải';}
 const visible=()=>sync.visible();
 const authChanged=()=>{cleanup();snapshot=null;if(root.isConnected){root.innerHTML='<p role="alert">Phiên tài khoản đã thay đổi. Vui lòng mở lại trang điểm và ưu đãi.</p>';document.getElementById('my-vouchers-list')?.replaceChildren();document.getElementById('vouchers-grid')?.replaceChildren();document.getElementById('loyalty-history')?.remove();const count=document.getElementById('myVouchersCountLabel');if(count)count.textContent='';}};
 const storageChanged=event=>{if(event.key==='pawpal_current_user')authChanged();};
 document.addEventListener('visibilitychange',visible);document.addEventListener('auth_state_changed',authChanged);window.addEventListener('storage',storageChanged);
 cleanup=()=>{active=false;sync.dispose();if(channel)db()?.removeChannel(channel);document.removeEventListener('visibilitychange',visible);document.removeEventListener('auth_state_changed',authChanged);window.removeEventListener('storage',storageChanged);document.querySelector('#loyalty-dialog [data-close-modal]')?.click();};
 const refresh=()=>sync.refresh();
 function render(){
  const tier=snapshot.tier;
  root.innerHTML=`<div class="loyalty-top-flex"><div class="pawpass-card-wrapper"><div id="pawpassVirtualCard" class="pawpass-virtual-card tier-silver"><div class="card-header-brand"><span class="brand-name">PawPal PawPass</span></div><div class="card-body-info"><span id="virtualCardTier" class="card-tier-label">${esc(tier?.name || 'Chưa có hạng')}</span><div class="pet-owner-info"><span id="virtualCardOwner" class="owner-name">${esc(snapshot.name)}</span></div></div><div class="card-footer-metrics"><span>${tier?'Mức giảm theo hạng '+num(tier.discount_percent)+'%':'Chưa có chính sách hạng được gán'}</span></div></div></div><div class="loyalty-card-details-panel"><span>Điểm tích lũy hiện tại</span><strong id="current-points-display">${num(snapshot.points)} <span class="points-unit">Paw Points</span></strong><p>${esc(tier?.description || 'Hạng thành viên do cửa hàng quản lý. Không tự xét hạng hoặc cộng điểm từ trang này.')}</p></div></div>`;
  root.querySelector('.loyalty-card-details-panel').insertAdjacentHTML('beforeend',spendingProgress(snapshot));
  const wallet=snapshot.wallet || [],now=Date.now();
  document.getElementById('myVouchersCountLabel').textContent=(snapshot.wallet_total??wallet.length)+' voucher';

  document.getElementById('my-vouchers-list').innerHTML=wallet.length?(serverPaging?wallet:wallet.slice(walletPage*6,(walletPage+1)*6)).map(w=>{
   const usable=w.status==='available' && w.voucher.is_active && new Date(w.voucher.start_date+'T00:00:00+07:00')<=now && (!w.expired_at || new Date(w.expired_at)>now) && new Date(w.voucher.end_date+'T23:59:59+07:00')>=now;
   return `<div class="my-voucher-ticket-card" data-wallet="${w.id}"><div class="my-ticket-stub"><span>${esc(discount(w.voucher))}</span></div><div class="my-ticket-body"><strong>${esc(w.voucher.voucher_name)}</strong><p>${esc(w.voucher.voucher_code)}</p><p>${usable?'Khả dụng':w.status==='used'?'Đã sử dụng':'Không khả dụng'} · Hạn ${walletEnd(w)}</p><button type="button" class="btn-modal-cancel" data-wallet-detail="${w.id}">Chi tiết</button></div><div class="my-ticket-action"><button type="button" class="btn-ticket-copy" data-copy="${esc(w.voucher.voucher_code)}" ${usable?'':'disabled'}>Sao chép mã</button></div></div>`;
  }).join(''):'<p>Bạn chưa có voucher nào.</p>';
  const catalog=snapshot.catalog || [];

  document.getElementById('vouchers-grid').innerHTML=catalog.length?(serverPaging?catalog:catalog.slice(catalogPage*6,(catalogPage+1)*6)).map(v=>`<div class="voucher-ticket-card" data-id="${v.id}"><div class="ticket-stub"><strong>${esc(discount(v))}</strong></div><div class="ticket-body"><h4>${esc(v.voucher_name)}</h4><p>${num(v.required_points)} điểm · Đơn từ ${num(v.minimum_order_amount)}đ</p><p>${esc(scope(v))} · Đến ${day(v.end_date)}</p><button type="button" class="btn-modal-cancel" data-detail="${v.id}">Chi tiết</button><button type="button" class="redeem-btn" data-redeem="${v.id}" ${snapshot.points<v.required_points?'disabled':''}>${snapshot.points<v.required_points?'Chưa đủ điểm':'Đổi '+num(v.required_points)+' điểm'}</button></div></div>`).join(''):'<p>Chưa có ưu đãi đổi điểm đang hiệu lực.</p>';
  paginate('my-vouchers-list',Number(snapshot.wallet_total??wallet.length),walletPage,value=>walletPage=value);
  paginate('vouchers-grid',Number(snapshot.catalog_total??catalog.length),catalogPage,value=>catalogPage=value);
  for(const id of ['loyalty-card-wrapper','my-vouchers-list','vouchers-grid']){document.getElementById(id).setAttribute('aria-busy','false');document.getElementById(id).classList.add('loyalty-loaded');}
  document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(catalog.find(v=>v.id===b.dataset.detail)));
  document.querySelectorAll('[data-wallet-detail]').forEach(b=>b.onclick=()=>detail(wallet.find(w=>w.id===b.dataset.walletDetail).voucher));
  document.querySelectorAll('[data-redeem]').forEach(b=>b.onclick=()=>confirmRedeem(catalog.find(v=>v.id===b.dataset.redeem)));
  document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Đã sao chép';}catch{b.textContent='Không thể sao chép';}});
  let history=document.getElementById('loyalty-history');if(!history){history=document.createElement('section');history.id='loyalty-history';document.querySelector('.loyalty-module-container').append(history);}
  const rows=snapshot.history || [],pages=Math.max(1,Math.ceil(Number(snapshot.history_total??rows.length)/10));historyPage=Math.min(historyPage,pages-1);
  history.innerHTML=`<h3>Lịch sử điểm</h3><table class="voucher-detail-spec-table"><thead><tr><th>Thời điểm</th><th>Biến động</th><th>Nội dung</th></tr></thead><tbody>${(serverPaging?rows:rows.slice(historyPage*10,(historyPage+1)*10)).map(r=>`<tr><td>${day(r.created_at)}</td><td>${r.points>0?'+':''}${num(r.points)}</td><td>${esc(r.description || '—')}</td></tr>`).join('') || '<tr><td colspan="3">Chưa có giao dịch điểm.</td></tr>'}</tbody></table><div style="display:flex;justify-content:center;gap:12px"><button type="button" id="pointsPrev" ${historyPage===0?'disabled':''}>&lt;</button><span>${historyPage+1} / ${pages}</span><button type="button" id="pointsNext" ${historyPage===pages-1?'disabled':''}>&gt;</button></div>`;
  history.querySelector('#pointsPrev').onclick=()=>{historyPage--;if(serverPaging)sync.schedule();else render();};history.querySelector('#pointsNext').onclick=()=>{historyPage++;if(serverPaging)sync.schedule();else render();};
  const historyNavigation=history.querySelector('#pointsPrev').parentElement;
  historyNavigation.hidden=pages<=1;
  historyNavigation.style.display=pages<=1?'none':'flex';
 }
 function confirmRedeem(v){
  if(!snapshot)return;
  const owner=snapshot.customer_id,key='pawpal_loyalty_request:'+owner+':'+v.id;
  const {overlay,close}=dialog('Xác nhận đổi ưu đãi',`<p>Đổi <strong>${num(v.required_points)} điểm</strong> lấy <strong>${esc(v.voucher_name)}</strong>?</p><p>Mã sẽ được lưu vào ví. Chưa áp dụng giảm giá hoặc thanh toán đơn hàng.</p><p id="loyaltyRedeemError" role="alert" style="color:#DC2626"></p>`);
  const button=document.createElement('button');button.type='button';button.id='confirmLoyaltyRedeem';button.className='btn-modal-confirm';button.textContent='Xác nhận đổi';overlay.querySelector('.modal-footer').append(button);
  button.onclick=async()=>{
   if(button.disabled)return;button.disabled=true;button.textContent='Đang đổi...';
   const error=overlay.querySelector('#loyaltyRedeemError');error.textContent='';
   try{
    if(!sync.valid())throw Error('Phiên tài khoản đã thay đổi. Vui lòng tải lại.');
    let request;try{request=JSON.parse(sessionStorage.getItem(key));}catch{}
    if(!request){request={id:crypto.randomUUID(),version:v.version};sessionStorage.setItem(key,JSON.stringify(request));}
    const saved=await rpc('redeem_own_loyalty_voucher',{p_id:request.id,p_voucher:v.id,p_expected:request.version});
    if(!sync.valid())return;
    if(saved!==request.id)throw Error('Chưa xác nhận được kết quả. Vui lòng thử lại cùng yêu cầu.');
    sessionStorage.removeItem(key);close();if(!active)return;
    const banner=document.getElementById('loyalty-warning-banner');banner.textContent='Đã đổi ưu đãi và ghi nhận điểm trên hệ thống.';banner.classList.remove('d-none');banner.setAttribute('role','status');await refresh();
   }catch(e){if(e.code==='PT409')sessionStorage.removeItem(key);if(overlay.isConnected)error.textContent=e.message;}
   finally{button.disabled=false;button.textContent='Xác nhận đổi';}
  };
 }
 await refresh();if(!active || !sync.valid())return;
 channel=db().channel('loyalty-'+crypto.randomUUID());for(const table of ['paw_point_transaction','customer_voucher','customer_membership'])channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'customer_id=eq.'+sync.owner},sync.schedule);let subscribed=false;channel.subscribe(status=>{if(status==='SUBSCRIBED'){if(subscribed)sync.schedule();subscribed=true;}});
}
export const init=initLoyalty;window.initLoyalty=initLoyalty;
