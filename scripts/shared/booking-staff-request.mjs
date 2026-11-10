export function staffRequestLabel(request,fallback='Chờ xác nhận'){
 return request?.status==='awaiting_customer'?'Chờ bạn đồng ý thay đổi':request?.status==='pending'?'Chờ xác nhận nhân viên':fallback;
}
export function renderBookingStaffRequest(root,request,{onRespond}={}){
 root.replaceChildren();if(!request?.requested_staff_id)return;
 root.className='booking-staff-request';root.style.cssText='margin:16px 0;padding:0;border:none;background:transparent;color:#236B48;';
 const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 root.append(make('strong',staffRequestLabel(request,request.status==='confirmed'?'Nhân viên đã xác nhận':'Nhân viên yêu cầu')),
  make('p','Nhân viên: '+(request.requested_staff_name||'Đang cập nhật')));
 if(request.status==='pending')root.append(make('p','Cửa hàng đang sắp xếp ca làm việc. Nhân viên và giờ hẹn chưa được xác nhận; mọi thay đổi người hoặc giờ cần bạn đồng ý.'));
 if(request.status!=='awaiting_customer'||!request.proposal_revision)return;
 const date=value=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'});
 root.append(make('p','Cửa hàng đề xuất: '+request.proposal_staff_name+' · '+date(request.proposal_start_at)+' đến '+date(request.proposal_end_at)+'. Lịch hiện tại được giữ nguyên cho đến khi bạn đồng ý.'));
 if(!onRespond)return;
 const actions=make('div','');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap';
 const feedback=make('p','');feedback.setAttribute('role','status');
 for(const [label,accepted]of [['Đồng ý thay đổi',true],['Giữ yêu cầu ban đầu',false]]){
  const button=make('button',label);button.type='button';button.className='btn-green-outline';
  button.onclick=async()=>{
   actions.querySelectorAll('button').forEach(node=>node.disabled=true);feedback.textContent='Đang lưu lựa chọn…';
   try{await onRespond(accepted,request.proposal_revision);}
   catch(error){feedback.textContent=error?.message==='requested_staff_schedule_required'?'Nhân viên không còn ca phù hợp. Cửa hàng cần đề xuất lại.':'Không thể lưu lựa chọn. Vui lòng cập nhật lịch hẹn và thử lại.';actions.querySelectorAll('button').forEach(node=>node.disabled=false);}
  };actions.append(button);
 }
 root.append(actions,feedback);
}
