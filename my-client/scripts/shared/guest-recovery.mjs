export function showGuestRecoveryCode(root,code){
 if(typeof code!=='string'||!code.startsWith('r1.'))return;
 const section=document.createElement('div'),label=document.createElement('label'),input=document.createElement('textarea'),copy=document.createElement('button'),note=document.createElement('p');
 label.textContent='Mã tra cứu riêng';input.value=code;input.readOnly=true;input.rows=3;input.className='form-control';input.setAttribute('aria-label','Mã tra cứu riêng');copy.type='button';copy.className='btn-green-outline';copy.textContent='Sao chép mã tra cứu';
 note.textContent='Lưu mã này để xem đúng đơn hoặc lịch hẹn khi đổi thiết bị hay mất phiên, trong 90 ngày. Chỉ chia sẻ với người bạn cho phép xem thông tin.';
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(code);copy.textContent='Đã sao chép';}catch{input.focus();input.select();copy.textContent='Hãy sao chép mã đã chọn';}};
 section.append(label,input,copy,note);root.append(section);
}
export function mountGuestRecoveryLookup(form){
 if(!form.isConnected||document.getElementById('guest-recovery-form'))return;
 const panel=document.createElement('section');panel.className='rg-session-booking';panel.innerHTML='<h2>Tra cứu bằng mã riêng</h2><form id="guest-recovery-form"><label for="guest-recovery-code">Mã tra cứu riêng</label><textarea id="guest-recovery-code" rows="3" maxlength="180" required autocomplete="off" aria-describedby="guest-recovery-feedback"></textarea><button type="button" id="guest-recovery-submit" class="btn-green-outline">Tra cứu</button></form><p id="guest-recovery-feedback" role="status" aria-live="polite">Dùng mã đã lưu sau khi đặt đơn hoặc lịch hẹn. Số điện thoại không cấp quyền xem lịch sử.</p><dl id="guest-recovery-result" class="rg-session-booking-details"></dl>';
 form.before(panel);form.hidden=true;const get=id=>panel.querySelector('#'+id),input=get('guest-recovery-code'),button=get('guest-recovery-submit'),feedback=get('guest-recovery-feedback'),result=get('guest-recovery-result');let busy=false,generation=0;
 panel.querySelector('form').onsubmit=event=>{event.preventDefault();button.click();};input.oninput=()=>{generation++;result.replaceChildren();input.setAttribute('aria-invalid','false');};
 button.onclick=async()=>{
  if(busy)return;const code=input.value.trim();result.replaceChildren();if(!/^r1\.(booking|order)\.[a-f0-9-]{36}\.\d{10}\.[A-Za-z0-9_-]{43}$/.test(code)){input.setAttribute('aria-invalid','true');feedback.textContent='Vui lòng nhập đầy đủ mã tra cứu riêng đã lưu.';input.focus();return;}
  const expected=++generation;busy=true;button.disabled=true;feedback.textContent='Đang tra cứu…';
  try{const response=await fetch('/api/customer/guest/recover',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const data=await response.json();if(!panel.isConnected||expected!==generation)return;if(!response.ok||data.success!==true)throw Error(data.message||'Chưa tra cứu được thông tin.');
   const receipt=data.receipt,parts=code.split('.');if(!receipt||data.kind!==parts[1]||String(receipt.id).toLowerCase()!==parts[2].toLowerCase()||typeof receipt.code!=='string'||receipt.total==null||!Number.isFinite(Number(receipt.total))||Number(receipt.total)<0)throw Error('Chưa xác nhận được kết quả.');
   const states={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',packing:'Đang chuẩn bị',shipping:'Đang giao',shipped:'Đang giao',delivered:'Đã giao',completed:'Hoàn tất',in_progress:'Đang thực hiện',cancelled:'Đã hủy',returned:'Đã trả hàng',no_show:'Vắng mặt'};
   const entries=[['Loại giao dịch',data.kind==='booking'?'Lịch hẹn':'Đơn hàng'],['Mã',receipt.code],['Trạng thái',states[receipt.status]||'Đang xử lý'],['Tổng tiền',Number(receipt.total).toLocaleString('vi-VN')+' đ']];
   if(data.kind==='booking'&&Number.isFinite(Date.parse(receipt.start_at)))entries.push(['Thời gian hẹn',new Date(receipt.start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})]);
   if(data.kind==='booking'&&Number.isFinite(Date.parse(receipt.end_at)))entries.push(['Kết thúc dự kiến',new Date(receipt.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})]);
   if(data.kind==='order'){
    entries.push(['Thanh toán',({pending:'Chờ thanh toán',partial:'Đã thanh toán một phần',paid:'Đã thanh toán',refunded:'Đã hoàn tiền',not_required:'Không cần thanh toán'})[receipt.paymentStatus]||'Chờ đối soát']);
    const receiver=receipt.receiver;if(receiver&&typeof receiver==='object')for(const [key,label]of [['name','Người nhận'],['phone','Liên hệ người nhận'],['address','Địa chỉ nhận'],['province','Tỉnh hoặc thành phố']])if(typeof receiver[key]==='string'&&receiver[key])entries.push([label,receiver[key]]);
    for(const line of receipt.lines||[])if(typeof line.name==='string'&&Number.isFinite(Number(line.quantity))&&Number(line.quantity)>0)entries.push(['Sản phẩm',line.name+' × '+line.quantity]);
   }
   for(const [name,value]of entries){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);result.append(row);}feedback.textContent='';
  }catch(error){if(panel.isConnected&&expected===generation)feedback.textContent=error.message||'Kết nối bị gián đoạn. Vui lòng thử lại.';}
  finally{busy=false;if(panel.isConnected)button.disabled=false;}
 };
 const clear=()=>{generation++;input.value='';result.replaceChildren();feedback.textContent='Tài khoản đã thay đổi. Nhập lại mã riêng nếu bạn muốn tiếp tục tra cứu.';};document.addEventListener('auth_state_changed',clear);window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)clear();});
}
